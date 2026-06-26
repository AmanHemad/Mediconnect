import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['general', 'shop_owner', 'donor', 'admin'], default: 'general' },
  locality: { type: String, default: 'Guntakal' },
  phone: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Medical Shop Schema
const medicalShopSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shopName: { type: String, required: true },
  address: { type: String, required: true },
  locality: { type: String, required: true, default: 'Guntakal' },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  phone: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  rating: { type: Number, default: 4.5 }
});

// Medicine Schema (Master list)
const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  genericName: { type: String, required: true },
  manufacturer: { type: String, default: 'Generic' },
  category: { type: String, default: 'General' },
  uses: [{ type: String }],
  diseases: [{ type: String }],
  dosage: { type: String, default: 'As directed by physician' },
  sideEffects: [{ type: String }],
  warnings: [{ type: String }],
  storageInstructions: { type: String, default: 'Store in cool and dry place.' },
  prescriptionRequired: { type: Boolean, default: false }
});

// Inventory Schema (Links Shop and Medicine)
const inventorySchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalShop', required: true },
  medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  stockStatus: { type: String, enum: ['Available', 'Low Stock', 'Out of Stock'], default: 'Available' },
  quantity: { type: Number, default: 10 },
  price: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

// Blood Donor Profile Schema
const donorProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  bloodGroup: { type: String, required: true },
  locality: { type: String, required: true, default: 'Guntakal' },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  isAvailable: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  lastDonated: { type: Date, default: null }
});

// Search Analytics Schema
const searchAnalyticsSchema = new mongoose.Schema({
  queryType: { type: String, enum: ['medicine', 'blood'], required: true },
  queryText: { type: String, required: true },
  locality: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
export const MedicalShop = mongoose.model('MedicalShop', medicalShopSchema);
export const Medicine = mongoose.model('Medicine', medicineSchema);
export const Inventory = mongoose.model('Inventory', inventorySchema);
export const DonorProfile = mongoose.model('DonorProfile', donorProfileSchema);
export const SearchAnalytics = mongoose.model('SearchAnalytics', searchAnalyticsSchema);
