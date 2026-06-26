import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, MedicalShop, Medicine, Inventory, DonorProfile, SearchAnalytics } from './models.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mediconnect';

// Medicine Master Catalog
const initialMedicines = [
  {
    name: 'Paracetamol 650',
    genericName: 'Paracetamol / Acetaminophen',
    manufacturer: 'Micro Labs Ltd (Dolo)',
    category: 'Analgesics / Antipyretics',
    uses: ['Fever reduction', 'Mild to moderate pain relief', 'Headache', 'Toothache'],
    diseases: ['Fever', 'Influenza', 'Body Pain', 'Common Cold'],
    dosage: '1 tablet 3-4 times daily as needed. Max 4g per day.',
    sideEffects: ['Nausea', 'Allergic skin reaction', 'Liver toxicity (overdose)'],
    warnings: ['Avoid drinking alcohol while taking this medicine.', 'Do not take with other paracetamol products.'],
    storageInstructions: 'Store in dry place below 30°C.',
    prescriptionRequired: false
  },
  {
    name: 'Metformin 500mg',
    genericName: 'Metformin Hydrochloride',
    manufacturer: 'USV Pvt Ltd (Glycomet)',
    category: 'Antidiabetics',
    uses: ['Type 2 Diabetes mellitus management', 'Improves insulin sensitivity'],
    diseases: ['Diabetes Mellitus', 'PCOS'],
    dosage: '1 tablet daily with meals, or as directed by doctor.',
    sideEffects: ['Nausea', 'Diarrhea', 'Abdominal pain', 'Metallic taste in mouth'],
    warnings: ['Risk of Lactic Acidosis (rare but serious).', 'Monitor kidney function regularly.'],
    storageInstructions: 'Store in a cool, dry place. Keep away from sunlight.',
    prescriptionRequired: true
  },
  {
    name: 'Amoxicillin 500mg',
    genericName: 'Amoxicillin Trihydrate',
    manufacturer: 'Alkem Laboratories (Mox)',
    category: 'Antibiotics',
    uses: ['Bacterial infections', 'Middle ear infection', 'Throat infection', 'Pneumonia', 'UTI'],
    diseases: ['Ear Infection', 'Strept Throat', 'Bronchitis', 'Urinary Tract Infection'],
    dosage: '1 capsule every 8 hours for 5-7 days.',
    sideEffects: ['Diarrhea', 'Skin rash', 'Nausea', 'Vomiting'],
    warnings: ['Complete the full course of antibiotics.', 'Do not use if allergic to penicillin.'],
    storageInstructions: 'Store capsules below 25°C.',
    prescriptionRequired: true
  },
  {
    name: 'Cetirizine 10mg',
    genericName: 'Cetirizine Dihydrochloride',
    manufacturer: 'Cipla Ltd (Okacet)',
    category: 'Antihistamines',
    uses: ['Allergic rhinitis', 'Sneezing', 'Runny nose', 'Hives', 'Watery eyes'],
    diseases: ['Allergies', 'Hay Fever', 'Urticaria'],
    dosage: '1 tablet once daily, preferably at bedtime.',
    sideEffects: ['Sleepiness / Drowsiness', 'Dry mouth', 'Fatigue', 'Headache'],
    warnings: ['May cause drowsiness; avoid driving or operating machinery.', 'Limit alcohol consumption.'],
    storageInstructions: 'Store at room temperature.',
    prescriptionRequired: false
  },
  {
    name: 'Ibuprofen 400mg',
    genericName: 'Ibuprofen',
    manufacturer: 'Abbott India (Brufen)',
    category: 'NSAIDs',
    uses: ['Pain relief', 'Anti-inflammatory', 'Rheumatoid arthritis', 'Menstrual pain'],
    diseases: ['Arthritis', 'Migraine', 'Muscle Pain', 'Inflammation'],
    dosage: '1 tablet 2-3 times daily after food.',
    sideEffects: ['Stomach upset', 'Heartburn', 'Bloating', 'Increased bleeding risk'],
    warnings: ['Take with food to avoid gastric irritation.', 'Avoid in patients with active stomach ulcers.'],
    storageInstructions: 'Store below 25°C.',
    prescriptionRequired: false
  },
  {
    name: 'Omeprazole 20mg',
    genericName: 'Omeprazole',
    manufacturer: 'Dr Reddy\'s Laboratories (Omez)',
    category: 'Proton Pump Inhibitors',
    uses: ['Gastroesophageal Reflux Disease (GERD)', 'Stomach ulcers', 'Acid reflux relief'],
    diseases: ['Acid Reflux', 'Acidity', 'Peptic Ulcers', 'Heartburn'],
    dosage: '1 capsule daily in the morning, 30 minutes before food.',
    sideEffects: ['Headache', 'Nausea', 'Flatulence', 'Mild diarrhea'],
    warnings: ['Long-term use can reduce Vitamin B12 absorption.', 'Consult doctor if symptoms persist.'],
    storageInstructions: 'Keep in moisture-resistant container.',
    prescriptionRequired: false
  },
  {
    name: 'Gasvenz (Simethicone & Activated Charcoal)',
    genericName: 'Simethicone & Activated Charcoal',
    manufacturer: 'Indchemie Health Specialties Pvt Ltd',
    category: 'Antiflatulents & Adsorbents',
    uses: ['Relief of flatulence, bloating, abdominal gas pain, and indigestion.'],
    diseases: ['Flatulence', 'Bloating', 'Indigestion'],
    dosage: '1-2 tablets after meals or as directed by the physician.',
    sideEffects: ['Dark/black stools', 'Mild constipation', 'Diarrhea'],
    warnings: ['Do not exceed recommended dose.', 'Keep out of reach of children.', 'Protect from light and moisture.'],
    storageInstructions: 'Store at a temperature not exceeding 30°C.',
    prescriptionRequired: false
  }
];

async function seedDatabase() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connection successful. Cleaning database...');

    // Clear existing data
    await User.deleteMany({});
    await MedicalShop.deleteMany({});
    await Medicine.deleteMany({});
    await Inventory.deleteMany({});
    await DonorProfile.deleteMany({});
    await SearchAnalytics.deleteMany({});

    console.log('Database cleared. Seeding Users...');

    // 1. Seed Users
    // Admin
    const admin = new User({
      name: 'System Admin',
      email: 'admin@mediconnect.com',
      password: 'adminpassword',
      role: 'admin',
      locality: 'Guntakal',
      phone: '9999999999'
    });
    await admin.save();

    // Shop Owners
    const owner1 = new User({
      name: 'Anil Kumar',
      email: 'anil@abcmedical.com',
      password: 'shopowner123',
      role: 'shop_owner',
      locality: 'Guntakal',
      phone: '9848022338'
    });
    await owner1.save();

    const owner2 = new User({
      name: 'Mohammed Rafi',
      email: 'rafi@citypharmacy.com',
      password: 'shopowner123',
      role: 'shop_owner',
      locality: 'Guntakal',
      phone: '9440283344'
    });
    await owner2.save();

    const owner3 = new User({
      name: 'Srinivasulu P',
      email: 'srini@srimedical.com',
      password: 'shopowner123',
      role: 'shop_owner',
      locality: 'Guntakal',
      phone: '9550381122'
    });
    await owner3.save();

    // Donors (users first)
    const donorUser1 = new User({
      name: 'Rahul Sharma',
      email: 'rahul@gmail.com',
      password: 'donorpassword',
      role: 'donor',
      locality: 'Guntakal',
      phone: '8919283471'
    });
    await donorUser1.save();

    const donorUser2 = new User({
      name: 'Akash Reddy',
      email: 'akash@gmail.com',
      password: 'donorpassword',
      role: 'donor',
      locality: 'Guntakal',
      phone: '7702819445'
    });
    await donorUser2.save();

    const donorUser3 = new User({
      name: 'Suresh V',
      email: 'suresh@gmail.com',
      password: 'donorpassword',
      role: 'donor',
      locality: 'Guntakal',
      phone: '9177283456'
    });
    await donorUser3.save();

    console.log('Seeding Medicines Master Catalog...');
    const insertedMedicines = await Medicine.insertMany(initialMedicines);
    const medicineMap = {};
    insertedMedicines.forEach(med => {
      medicineMap[med.name] = med._id;
    });

    console.log('Seeding Medical Shops...');
    // Guntakal center: lat: 15.1672, lng: 77.3753
    const shop1 = new MedicalShop({
      owner: owner1._id,
      shopName: 'ABC Medical & General Stores',
      address: 'Main Bazaar Road, Guntakal',
      locality: 'Guntakal',
      coordinates: { lat: 15.1685, lng: 77.3785 }, // ~400m
      phone: '9848022338',
      isVerified: true,
      rating: 4.8
    });
    await shop1.save();

    const shop2 = new MedicalShop({
      owner: owner2._id,
      shopName: 'City Pharmacy 24/7',
      address: 'Railway Station Road, Guntakal',
      locality: 'Guntakal',
      coordinates: { lat: 15.1745, lng: 77.3832 }, // ~1.2km
      phone: '9440283344',
      isVerified: true,
      rating: 4.5
    });
    await shop2.save();

    const shop3 = new MedicalShop({
      owner: owner3._id,
      shopName: 'Sri Medicals',
      address: 'RTC Bus Stand Backside, Guntakal',
      locality: 'Guntakal',
      coordinates: { lat: 15.1580, lng: 77.3620 }, // ~2.0km
      phone: '9550381122',
      isVerified: false, // Unverified initially
      rating: 3.9
    });
    await shop3.save();

    console.log('Seeding Inventories...');
    // Seed stock
    const inventories = [
      // Shop 1 (ABC Medical) stocks
      { shop: shop1._id, medicine: medicineMap['Paracetamol 650'], stockStatus: 'Available', quantity: 150, price: 30 },
      { shop: shop1._id, medicine: medicineMap['Metformin 500mg'], stockStatus: 'Available', quantity: 80, price: 12 },
      { shop: shop1._id, medicine: medicineMap['Cetirizine 10mg'], stockStatus: 'Available', quantity: 200, price: 18 },
      { shop: shop1._id, medicine: medicineMap['Ibuprofen 400mg'], stockStatus: 'Low Stock', quantity: 5, price: 25 },
      { shop: shop1._id, medicine: medicineMap['Gasvenz (Simethicone & Activated Charcoal)'], stockStatus: 'Available', quantity: 95, price: 45 },
      
      // Shop 2 (City Pharmacy) stocks
      { shop: shop2._id, medicine: medicineMap['Paracetamol 650'], stockStatus: 'Available', quantity: 300, price: 28 },
      { shop: shop2._id, medicine: medicineMap['Metformin 500mg'], stockStatus: 'Available', quantity: 120, price: 11 },
      { shop: shop2._id, medicine: medicineMap['Amoxicillin 500mg'], stockStatus: 'Available', quantity: 90, price: 85 },
      { shop: shop2._id, medicine: medicineMap['Omeprazole 20mg'], stockStatus: 'Available', quantity: 150, price: 40 },
      { shop: shop2._id, medicine: medicineMap['Gasvenz (Simethicone & Activated Charcoal)'], stockStatus: 'Available', quantity: 180, price: 42 },
      
      // Shop 3 (Sri Medical) stocks
      { shop: shop3._id, medicine: medicineMap['Paracetamol 650'], stockStatus: 'Out of Stock', quantity: 0, price: 35 },
      { shop: shop3._id, medicine: medicineMap['Ibuprofen 400mg'], stockStatus: 'Available', quantity: 45, price: 22 }
    ];
    await Inventory.insertMany(inventories);

    console.log('Seeding Blood Donor Profiles...');
    const donor1 = new DonorProfile({
      user: donorUser1._id,
      bloodGroup: 'O+',
      locality: 'Guntakal',
      coordinates: { lat: 15.1630, lng: 77.3820 }, // ~1.1km
      isAvailable: true,
      isVerified: true
    });
    await donor1.save();

    const donor2 = new DonorProfile({
      user: donorUser2._id,
      bloodGroup: 'O+',
      locality: 'Guntakal',
      coordinates: { lat: 15.1540, lng: 77.3650 }, // ~2.0km
      isAvailable: true,
      isVerified: true
    });
    await donor2.save();

    const donor3 = new DonorProfile({
      user: donorUser3._id,
      bloodGroup: 'B+',
      locality: 'Guntakal',
      coordinates: { lat: 15.1780, lng: 77.3910 }, // ~2.8km
      isAvailable: true,
      isVerified: false // Unverified initially
    });
    await donor3.save();

    console.log('Seeding Search Analytics...');
    const analytics = [
      { queryType: 'medicine', queryText: 'Paracetamol 650', locality: 'Guntakal', timestamp: new Date(Date.now() - 3600000 * 2) },
      { queryType: 'medicine', queryText: 'Paracetamol 650', locality: 'Guntakal', timestamp: new Date(Date.now() - 3600000 * 5) },
      { queryType: 'medicine', queryText: 'Paracetamol 650', locality: 'Guntakal', timestamp: new Date(Date.now() - 3600000 * 12) },
      { queryType: 'medicine', queryText: 'Metformin 500mg', locality: 'Guntakal', timestamp: new Date(Date.now() - 3600000 * 1) },
      { queryType: 'medicine', queryText: 'Metformin 500mg', locality: 'Guntakal', timestamp: new Date(Date.now() - 3600000 * 8) },
      { queryType: 'medicine', queryText: 'Amoxicillin 500mg', locality: 'Guntakal', timestamp: new Date(Date.now() - 3600000 * 3) },
      { queryType: 'medicine', queryText: 'Cetirizine 10mg', locality: 'Guntakal', timestamp: new Date(Date.now() - 3600000 * 4) },
      { queryType: 'blood', queryText: 'O+', locality: 'Guntakal', timestamp: new Date(Date.now() - 3600000 * 6) },
      { queryType: 'blood', queryText: 'O+', locality: 'Guntakal', timestamp: new Date(Date.now() - 3600000 * 14) },
      { queryType: 'blood', queryText: 'B+', locality: 'Guntakal', timestamp: new Date(Date.now() - 3600000 * 24) }
    ];
    await SearchAnalytics.insertMany(analytics);

    console.log('Database seeding successfully finished!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
