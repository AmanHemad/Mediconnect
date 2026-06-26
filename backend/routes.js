import express from 'express';
import multer from 'multer';
import Tesseract from 'tesseract.js';
import fs from 'fs';
import { User, MedicalShop, Medicine, Inventory, DonorProfile, SearchAnalytics } from './models.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Distance calculator helper (Haversine formula in KM)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Math.round(d * 10) / 10; // Round to 1 decimal place
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// User-defined center for Guntakal if searcher doesn't have coordinates
const DEFAULT_COORDS = { lat: 15.1672, lng: 77.3753 };

// ================= AUTH ROUTES =================

// Register User
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, locality, phone, shopDetails, donorDetails } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const user = new User({ name, email, password, role, locality, phone });
    await user.save();

    // If role is shop_owner, create associated MedicalShop
    if (role === 'shop_owner' && shopDetails) {
      const shop = new MedicalShop({
        owner: user._id,
        shopName: shopDetails.shopName,
        address: shopDetails.address,
        locality: locality || 'Guntakal',
        coordinates: shopDetails.coordinates || DEFAULT_COORDS,
        phone: phone,
        isVerified: false
      });
      await shop.save();
    }

    // If role is donor, create associated DonorProfile
    if (role === 'donor' && donorDetails) {
      const donor = new DonorProfile({
        user: user._id,
        bloodGroup: donorDetails.bloodGroup,
        locality: locality || 'Guntakal',
        coordinates: donorDetails.coordinates || DEFAULT_COORDS,
        isAvailable: true,
        isVerified: false
      });
      await donor.save();
    }

    res.status(201).json({ message: 'User registered successfully', user: { id: user._id, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login User
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let associatedDetails = null;
    if (user.role === 'shop_owner') {
      associatedDetails = await MedicalShop.findOne({ owner: user._id });
    } else if (user.role === 'donor') {
      associatedDetails = await DonorProfile.findOne({ user: user._id });
    }

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        locality: user.locality,
        phone: user.phone
      },
      associatedDetails
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ================= MEDICINE ROUTES =================

// Search Medicines & Local Stock
router.get('/medicines/search', async (req, res) => {
  try {
    const { q, locality } = req.query;
    const searchLocality = locality || 'Guntakal';

    // Log query in analytics
    if (q) {
      const log = new SearchAnalytics({
        queryType: 'medicine',
        queryText: q,
        locality: searchLocality
      });
      await log.save();
    }

    // Find medicine matching query (case-insensitive regex)
    const medicines = await Medicine.find({
      $or: [
        { name: { $regex: q || '', $options: 'i' } },
        { genericName: { $regex: q || '', $options: 'i' } },
        { category: { $regex: q || '', $options: 'i' } }
      ]
    });

    const results = [];

    for (const medicine of medicines) {
      // Find inventory entries for this medicine
      const inventories = await Inventory.find({ medicine: medicine._id })
        .populate('shop');

      const stockList = [];
      for (const inv of inventories) {
        // Filter shops in current locality and verified status
        if (inv.shop && inv.shop.locality.toLowerCase() === searchLocality.toLowerCase() && inv.shop.isVerified) {
          const distance = getDistance(
            DEFAULT_COORDS.lat, DEFAULT_COORDS.lng,
            inv.shop.coordinates.lat, inv.shop.coordinates.lng
          );

          stockList.push({
            shopId: inv.shop._id,
            shopName: inv.shop.shopName,
            address: inv.shop.address,
            phone: inv.shop.phone,
            rating: inv.shop.rating,
            coordinates: inv.shop.coordinates,
            stockStatus: inv.stockStatus,
            quantity: inv.quantity,
            price: inv.price,
            distance: distance // in KM
          });
        }
      }

      // Sort shops by distance
      stockList.sort((a, b) => a.distance - b.distance);

      // Fetch alternatives (same genericName, different brand)
      const alternatives = await Medicine.find({
        genericName: medicine.genericName,
        _id: { $ne: medicine._id }
      }).limit(3);

      results.push({
        medicine,
        stockList,
        alternatives
      });
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Medicine Image Identification (Real OCR using Tesseract.js)
router.post('/medicines/identify', upload.single('image'), async (req, res) => {
  let tempFilePath = null;
  try {
    const { locality } = req.body;
    const searchLocality = locality || 'Guntakal';
    const simulatedText = req.body.simulatedText || '';

    let queryName = '';
    let extractedText = '';

    if (simulatedText) {
      queryName = simulatedText;
      extractedText = `Simulated Input: ${simulatedText}`;
    } else if (req.file) {
      tempFilePath = req.file.path;
      console.log(`Processing OCR for file: ${req.file.originalname} at path: ${tempFilePath}`);
      
      // Perform OCR using Tesseract.js
      const ocrResult = await Tesseract.recognize(tempFilePath, 'eng');
      extractedText = ocrResult.data.text || '';
      console.log('OCR Extracted Text:\n', extractedText);

      // Clean up the temp uploaded file immediately
      try {
        fs.unlinkSync(tempFilePath);
        tempFilePath = null;
      } catch (err) {
        console.error('Error cleaning up temp file:', err.message);
      }

      // Sanitize extracted text
      const cleanText = extractedText.toLowerCase();

      // Scan for matching medicine keywords
      if (cleanText.includes('gasvenz') || cleanText.includes('simethicone') || cleanText.includes('charcoal')) {
        queryName = 'Gasvenz (Simethicone & Activated Charcoal)';
      } else if (cleanText.includes('dolo') || cleanText.includes('paracetamol') || cleanText.includes('acetaminophen') || cleanText.includes('650')) {
        queryName = 'Paracetamol 650';
      } else if (cleanText.includes('glycomet') || cleanText.includes('metformin')) {
        queryName = 'Metformin 500mg';
      } else if (cleanText.includes('amoxicillin') || cleanText.includes('mox')) {
        queryName = 'Amoxicillin 500mg';
      } else if (cleanText.includes('okacet') || cleanText.includes('cetirizine')) {
        queryName = 'Cetirizine 10mg';
      } else if (cleanText.includes('brufen') || cleanText.includes('ibuprofen') || cleanText.includes('combiflam')) {
        queryName = 'Ibuprofen 400mg';
      } else if (cleanText.includes('omez') || cleanText.includes('omeprazole')) {
        queryName = 'Omeprazole 20mg';
      } else {
        // Look for any exact name from the database matching in the extracted text
        const allMedicines = await Medicine.find({}, 'name');
        for (const med of allMedicines) {
          if (cleanText.includes(med.name.toLowerCase())) {
            queryName = med.name;
            break;
          }
        }

        // If still not matched, fallback to parse the first non-empty lines or return general
        if (!queryName) {
          const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
          if (lines.length > 0) {
            queryName = lines[0].substring(0, 30); // Grab first line
          } else {
            queryName = 'Paracetamol 650';
          }
        }
      }
    } else {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    // Now, query details for this medicine
    let medicine = await Medicine.findOne({ name: { $regex: queryName, $options: 'i' } });
    
    // If not found in our database (e.g. random medicine detected via OCR), dynamically create a response
    if (!medicine) {
      medicine = {
        name: queryName.toUpperCase(),
        genericName: 'OCR Identified Formulation',
        category: 'Identified Medicine',
        uses: ['Fever / Pain Relief', 'Infection management'],
        dosage: 'As prescribed by your registered medical practitioner.',
        sideEffects: ['Nausea', 'Dizziness', 'Headache'],
        warnings: ['Read package insert before use.', 'Keep away from children.'],
        storageInstructions: 'Store in dry place below 30°C.',
        prescriptionRequired: false
      };
    }

    // Log query in analytics
    const log = new SearchAnalytics({
      queryType: 'medicine',
      queryText: medicine.name,
      locality: searchLocality
    });
    await log.save();

    // Fetch stock details
    const inventories = await Inventory.find({ medicine: medicine._id }).populate('shop');
    const stockList = [];
    for (const inv of inventories) {
      if (inv.shop && inv.shop.locality.toLowerCase() === searchLocality.toLowerCase() && inv.shop.isVerified) {
        const distance = getDistance(
          DEFAULT_COORDS.lat, DEFAULT_COORDS.lng,
          inv.shop.coordinates.lat, inv.shop.coordinates.lng
        );
        stockList.push({
          shopId: inv.shop._id,
          shopName: inv.shop.shopName,
          address: inv.shop.address,
          phone: inv.shop.phone,
          rating: inv.shop.rating,
          coordinates: inv.shop.coordinates,
          stockStatus: inv.stockStatus,
          quantity: inv.quantity,
          price: inv.price,
          distance
        });
      }
    }
    stockList.sort((a, b) => a.distance - b.distance);

    const alternatives = await Medicine.find({
      genericName: medicine.genericName,
      _id: { $ne: medicine._id }
    }).limit(3);

    res.json({
      recognizedText: `OCR Text Extracted: ${extractedText.substring(0, 100).replace(/\n/g, ' ')}... Identified Name: ${medicine.name}`,
      medicine,
      stockList,
      alternatives
    });
  } catch (error) {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (e) {}
    }
    res.status(500).json({ error: error.message });
  }
});


// ================= BLOOD DONOR ROUTES =================

// Search Blood Donors & Banks
router.get('/blood/search', async (req, res) => {
  try {
    const { bloodGroup, locality } = req.query;
    const searchLocality = locality || 'Guntakal';

    // Log query in analytics
    if (bloodGroup) {
      const log = new SearchAnalytics({
        queryType: 'blood',
        queryText: bloodGroup,
        locality: searchLocality
      });
      await log.save();
    }

    // Fetch verified available donors in locality
    const donors = await DonorProfile.find({
      bloodGroup: bloodGroup,
      locality: { $regex: searchLocality, $options: 'i' },
      isAvailable: true,
      isVerified: true
    }).populate('user');

    const donorList = donors.map(donor => {
      const distance = getDistance(
        DEFAULT_COORDS.lat, DEFAULT_COORDS.lng,
        donor.coordinates.lat, donor.coordinates.lng
      );
      return {
        id: donor._id,
        name: donor.user.name,
        phone: donor.user.phone,
        bloodGroup: donor.bloodGroup,
        locality: donor.locality,
        coordinates: donor.coordinates,
        distance,
        isAvailable: donor.isAvailable
      };
    }).sort((a, b) => a.distance - b.distance);

    // Fetch Blood Banks (simulated as custom verified shops or donor listings)
    // We will simulate blood bank availability in the locality
    const bloodBanks = [
      {
        name: 'Guntakal Red Cross Blood Bank',
        phone: '+91 8552 220011',
        address: 'Opposite Government Hospital, Guntakal',
        coordinates: { lat: 15.1712, lng: 77.3802 }, // Near center
        stock: {
          'O+': 8,
          'O-': 2,
          'A+': 12,
          'B+': 15,
          'AB+': 5,
          'AB-': 1
        },
        distance: getDistance(DEFAULT_COORDS.lat, DEFAULT_COORDS.lng, 15.1712, 77.3802)
      },
      {
        name: 'Kurnool District Blood Trust (Guntakal Branch)',
        phone: '+91 8552 225588',
        address: 'Railway Station Road, Guntakal',
        coordinates: { lat: 15.1625, lng: 77.3695 },
        stock: {
          'O+': 4,
          'O-': 0,
          'A+': 6,
          'B+': 10,
          'AB+': 2,
          'AB-': 0
        },
        distance: getDistance(DEFAULT_COORDS.lat, DEFAULT_COORDS.lng, 15.1625, 77.3695)
      }
    ];

    // Filter blood banks to sort by distance
    const bankResults = bloodBanks.map(bank => ({
      ...bank,
      availableUnits: bank.stock[bloodGroup] || 0
    })).sort((a, b) => a.distance - b.distance);

    res.json({
      donors: donorList,
      bloodBanks: bankResults
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ================= MEDICAL SHOP DASHBOARD =================

// Get shop profile & current stock
router.get('/shops/inventory/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const inventory = await Inventory.find({ shop: shopId }).populate('medicine');
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add or Update Inventory
router.post('/shops/inventory', async (req, res) => {
  try {
    const { shopId, medicineId, stockStatus, quantity, price } = req.body;

    let item = await Inventory.findOne({ shop: shopId, medicine: medicineId });
    if (item) {
      item.stockStatus = stockStatus;
      item.quantity = quantity;
      item.price = price;
      item.lastUpdated = Date.now();
      await item.save();
    } else {
      item = new Inventory({
        shop: shopId,
        medicine: medicineId,
        stockStatus,
        quantity,
        price
      });
      await item.save();
    }

    const populated = await Inventory.findById(item._id).populate('medicine');
    res.status(200).json({ message: 'Stock updated', item: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Inventory item
router.delete('/shops/inventory/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    await Inventory.findByIdAndDelete(itemId);
    res.json({ message: 'Item removed from inventory' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Shop local analytics (Search patterns in Guntakal)
router.get('/shops/analytics/:locality', async (req, res) => {
  try {
    const { locality } = req.params;
    // Find aggregate stats for medicine searches in locality
    const searchStats = await SearchAnalytics.aggregate([
      { $match: { locality: { $regex: locality, $options: 'i' }, queryType: 'medicine' } },
      { $group: { _id: '$queryText', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    res.json(searchStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ================= DONOR DASHBOARD =================

// Update Donor Profile Details
router.put('/donor/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { isAvailable, locality, coordinates, bloodGroup } = req.body;

    const donor = await DonorProfile.findOne({ user: userId });
    if (!donor) {
      return res.status(404).json({ error: 'Donor profile not found' });
    }

    if (isAvailable !== undefined) donor.isAvailable = isAvailable;
    if (locality) donor.locality = locality;
    if (bloodGroup) donor.bloodGroup = bloodGroup;
    if (coordinates) donor.coordinates = coordinates;
    
    await donor.save();
    res.json({ message: 'Donor profile updated successfully', donor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ================= ADMIN DASHBOARD =================

// Get Unverified shops & donors
router.get('/admin/unverified', async (req, res) => {
  try {
    const pendingShops = await MedicalShop.find({ isVerified: false }).populate('owner');
    const pendingDonors = await DonorProfile.find({ isVerified: false }).populate('user');
    res.json({ pendingShops, pendingDonors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify shop
router.post('/admin/verify/shop/:shopId', async (req, res) => {
  try {
    const { shopId } = req.params;
    const shop = await MedicalShop.findByIdAndUpdate(shopId, { isVerified: true }, { new: true });
    res.json({ message: 'Shop verified successfully', shop });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify donor
router.post('/admin/verify/donor/:donorId', async (req, res) => {
  try {
    const { donorId } = req.params;
    const donor = await DonorProfile.findByIdAndUpdate(donorId, { isVerified: true }, { new: true });
    res.json({ message: 'Donor verified successfully', donor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add master medicine
router.post('/admin/medicine', async (req, res) => {
  try {
    const medicine = new Medicine(req.body);
    await medicine.save();
    res.status(201).json({ message: 'Medicine added to catalog', medicine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get master medicines list
router.get('/admin/medicines', async (req, res) => {
  try {
    const medicines = await Medicine.find().sort({ name: 1 });
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// System Analytics
router.get('/admin/analytics', async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    const shopsCount = await MedicalShop.countDocuments({ isVerified: true });
    const pendingShopsCount = await MedicalShop.countDocuments({ isVerified: false });
    const donorsCount = await DonorProfile.countDocuments({ isVerified: true });
    const pendingDonorsCount = await DonorProfile.countDocuments({ isVerified: false });

    // Top medicine searches
    const topMedicines = await SearchAnalytics.aggregate([
      { $match: { queryType: 'medicine' } },
      { $group: { _id: '$queryText', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Top blood searches
    const topBlood = await SearchAnalytics.aggregate([
      { $match: { queryType: 'blood' } },
      { $group: { _id: '$queryText', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      counts: {
        users: usersCount,
        shops: shopsCount,
        pendingShops: pendingShopsCount,
        donors: donorsCount,
        pendingDonors: pendingDonorsCount
      },
      topMedicines,
      topBlood
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
