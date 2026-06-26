import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Pill, Droplet, User as UserIcon, Shield, MapPin, 
  Phone, Plus, Trash2, Check, RefreshCw, LogOut, ArrowLeft,
  Activity, Star, Upload, FileText, Settings, BarChart2
} from 'lucide-react';
import L from 'leaflet';

// Leaflet icon path bug workaround
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png'
});

const API_BASE = 'http://localhost:5000/api';
// Default coords for Guntakal
const DEFAULT_COORDS = { lat: 15.1672, lng: 77.3753 };

export default function App() {
  // Screens: 'home', 'medicine_details', 'blood_search', 'shop_dashboard', 'donor_dashboard', 'admin_dashboard', 'login', 'register'
  const [currentScreen, setCurrentScreen] = useState('home');
  const [selectedLocality, setSelectedLocality] = useState('Guntakal');
  const [searchTab, setSearchTab] = useState('medicine'); // 'medicine' or 'blood'
  
  // Auth States
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mediconnect_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [shopDetails, setShopDetails] = useState(() => {
    const saved = localStorage.getItem('mediconnect_shop');
    return saved ? JSON.parse(saved) : null;
  });
  const [donorDetails, setDonorDetails] = useState(() => {
    const saved = localStorage.getItem('mediconnect_donor');
    return saved ? JSON.parse(saved) : null;
  });

  // Search Results
  const [searchQuery, setSearchQuery] = useState('');
  const [medicineResults, setMedicineResults] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  
  // Blood Search
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('O+');
  const [bloodResults, setBloodResults] = useState({ donors: [], bloodBanks: [] });

  // Map Ref for Leaflet
  const mapRef = useRef(null);
  const activeMapInstance = useRef(null);

  // Stats for counter
  const [systemStats, setSystemStats] = useState({ medicinesCount: 6, shopsCount: 2, donorsCount: 2 });

  // OCR state
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrFilename, setOcrFilename] = useState('');
  const [ocrResultText, setOcrResultText] = useState('');

  // Fetch initial stats or details
  useEffect(() => {
    // Retrieve system counts
    fetch(`${API_BASE}/admin/analytics`)
      .then(res => res.json())
      .then(data => {
        if (data && data.counts) {
          setSystemStats({
            medicinesCount: data.counts.users + 4, // simulation adjustment
            shopsCount: data.counts.shops,
            donorsCount: data.counts.donors
          });
        }
      })
      .catch(() => {});
  }, [currentScreen]);

  // Handle Logout
  const handleLogout = () => {
    setUser(null);
    setShopDetails(null);
    setDonorDetails(null);
    localStorage.removeItem('mediconnect_user');
    localStorage.removeItem('mediconnect_shop');
    localStorage.removeItem('mediconnect_donor');
    setCurrentScreen('home');
  };

  // Medicine Search Action
  const handleMedicineSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/medicines/search?q=${encodeURIComponent(searchQuery)}&locality=${selectedLocality}`);
      const data = await res.json();
      setMedicineResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger OCR Simulation Upload
  const handleOcrFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setOcrFilename(file.name);
    setIsOcrProcessing(true);
    setOcrProgress(0);

    // Simulate progress bar animation
    const interval = setInterval(() => {
      setOcrProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          processOcrBackend(file);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const handleOcrSimulationSelect = (e) => {
    const simulatedText = e.target.value;
    if (!simulatedText) return;
    
    setIsOcrProcessing(true);
    setOcrProgress(0);
    setOcrFilename(`${simulatedText.replace(/\s+/g, '_').toLowerCase()}.jpg`);

    const interval = setInterval(() => {
      setOcrProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          processOcrBackendWithText(simulatedText);
          return 100;
        }
        return prev + 15;
      });
    }, 120);
  };

  const processOcrBackendWithText = async (simulatedText) => {
    try {
      const formData = new FormData();
      formData.append('simulatedText', simulatedText);
      formData.append('locality', selectedLocality);
      
      // Upload a blank fake file to satisfy multer
      const blob = new Blob(['fake image data'], { type: 'image/jpeg' });
      formData.append('image', blob, 'simulated_photo.jpg');

      const res = await fetch(`${API_BASE}/medicines/identify`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setIsOcrProcessing(false);
      setOcrResultText(data.recognizedText || 'OCR Completed');
      
      if (data.medicine) {
        setSelectedMedicine({
          medicine: data.medicine,
          stockList: data.stockList || [],
          alternatives: data.alternatives || []
        });
        setCurrentScreen('medicine_details');
      }
    } catch (err) {
      console.error(err);
      setIsOcrProcessing(false);
    }
  };

  const processOcrBackend = async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('locality', selectedLocality);

      const res = await fetch(`${API_BASE}/medicines/identify`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setIsOcrProcessing(false);
      setOcrResultText(data.recognizedText || 'OCR Completed');

      if (data.medicine) {
        setSelectedMedicine({
          medicine: data.medicine,
          stockList: data.stockList || [],
          alternatives: data.alternatives || []
        });
        setCurrentScreen('medicine_details');
      }
    } catch (err) {
      console.error(err);
      setIsOcrProcessing(false);
    }
  };

  // Blood Search Action
  const handleBloodSearch = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/blood/search?bloodGroup=${encodeURIComponent(selectedBloodGroup)}&locality=${selectedLocality}`);
      const data = await res.json();
      setBloodResults(data);
      setCurrentScreen('blood_search');
    } catch (err) {
      console.error(err);
    }
  };

  // Setup Leaflet map for shop coordinates
  const renderLeafletMap = (mapContainerId, points, centerPoint) => {
    // Timeout to make sure DOM container is ready
    setTimeout(() => {
      const container = document.getElementById(mapContainerId);
      if (!container) return;

      // Clean up previous instance
      if (activeMapInstance.current) {
        activeMapInstance.current.remove();
        activeMapInstance.current = null;
      }

      const map = L.map(mapContainerId).setView([centerPoint.lat, centerPoint.lng], 14);
      activeMapInstance.current = map;

      // Dark map tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Draw center marker (User Location)
      const userIcon = L.divIcon({
        className: 'user-marker',
        html: '<div style="background-color: #8b5cf6; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px #8b5cf6;"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      L.marker([centerPoint.lat, centerPoint.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup('<div class="map-popup-title">Your Locality Center</div><div class="map-popup-text">Searching around Guntakal</div>')
        .openPopup();

      // Add pins for shops/donors
      points.forEach(pt => {
        if (!pt.coordinates || !pt.coordinates.lat) return;

        const pinColor = pt.type === 'blood_bank' ? '#ef4444' : (pt.type === 'donor' ? '#f43f5e' : '#10b981');
        const customIcon = L.divIcon({
          className: 'point-marker',
          html: `<div style="background-color: ${pinColor}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${pinColor};"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const marker = L.marker([pt.coordinates.lat, pt.coordinates.lng], { icon: customIcon }).addTo(map);

        let popupHtml = `<div class="map-popup-title">${pt.name}</div>`;
        if (pt.type === 'shop') {
          popupHtml += `<div class="map-popup-text">Stock: <b>${pt.stockStatus}</b><br>Price: ₹${pt.price}<br>Distance: ${pt.distance} km</div>`;
        } else if (pt.type === 'donor') {
          popupHtml += `<div class="map-popup-text">Blood Group: <b>${pt.bloodGroup}</b><br>Status: Available<br>Distance: ${pt.distance} km</div>`;
        } else if (pt.type === 'blood_bank') {
          popupHtml += `<div class="map-popup-text">Available Units: <b>${pt.units} Units</b><br>Contact: ${pt.phone}<br>Distance: ${pt.distance} km</div>`;
        }

        marker.bindPopup(popupHtml);
      });
    }, 100);
  };

  // Trigger map render when entering Medicine Details
  useEffect(() => {
    if (currentScreen === 'medicine_details' && selectedMedicine && selectedMedicine.stockList.length > 0) {
      const points = selectedMedicine.stockList.map(shop => ({
        name: shop.shopName,
        coordinates: shop.coordinates,
        stockStatus: shop.stockStatus,
        price: shop.price,
        distance: shop.distance,
        type: 'shop'
      }));
      renderLeafletMap('medicine-map', points, DEFAULT_COORDS);
    }
  }, [currentScreen, selectedMedicine]);

  // Trigger map render when entering Blood Search
  useEffect(() => {
    if (currentScreen === 'blood_search' && (bloodResults.donors.length > 0 || bloodResults.bloodBanks.length > 0)) {
      const points = [];
      bloodResults.donors.forEach(donor => {
        points.push({
          name: donor.name,
          coordinates: donor.coordinates,
          bloodGroup: donor.bloodGroup,
          distance: donor.distance,
          type: 'donor'
        });
      });
      bloodResults.bloodBanks.forEach(bank => {
        points.push({
          name: bank.name,
          coordinates: bank.coordinates,
          units: bank.availableUnits,
          phone: bank.phone,
          distance: bank.distance,
          type: 'blood_bank'
        });
      });
      renderLeafletMap('blood-map', points, DEFAULT_COORDS);
    }
  }, [currentScreen, bloodResults]);

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar">
        <a href="#" className="nav-brand" onClick={(e) => { e.preventDefault(); setCurrentScreen('home'); }}>
          <Activity size={24} color="#8b5cf6" />
          MediConnect
        </a>

        <div className="nav-controls">
          <div className="locality-selector">
            <MapPin size={16} color="#94a3b8" />
            <select value={selectedLocality} onChange={(e) => setSelectedLocality(e.target.value)}>
              <option value="Guntakal">Guntakal (Focal)</option>
              <option value="Anantapur">Anantapur</option>
              <option value="Kurnool">Kurnool</option>
              <option value="Hyderabad">Hyderabad</option>
            </select>
          </div>

          <div className="nav-links">
            <a href="#" className={`nav-link ${currentScreen === 'home' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentScreen('home'); }}>Search</a>
            
            {user && user.role === 'shop_owner' && (
              <a href="#" className={`nav-link ${currentScreen === 'shop_dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentScreen('shop_dashboard'); }}>Shop Portal</a>
            )}
            {user && user.role === 'donor' && (
              <a href="#" className={`nav-link ${currentScreen === 'donor_dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentScreen('donor_dashboard'); }}>Donor Portal</a>
            )}
            {user && user.role === 'admin' && (
              <a href="#" className={`nav-link ${currentScreen === 'admin_dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentScreen('admin_dashboard'); }}>Admin Panel</a>
            )}
          </div>

          <div className="user-status">
            {user ? (
              <>
                <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                  Hi, <b>{user.name}</b> ({user.role === 'shop_owner' ? 'Shop' : user.role === 'donor' ? 'Donor' : user.role})
                </span>
                <button className="btn-logout" onClick={handleLogout}>
                  <LogOut size={16} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <button className="btn-login" onClick={() => setCurrentScreen('login')}>Sign In</button>
                <button className="btn-logout" onClick={() => setCurrentScreen('register')}>Register</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        {currentScreen === 'home' && (
          <div>
            {/* Hero Section */}
            <div className="hero-section">
              <h1 className="hero-title">Local Medicine & Blood Finder</h1>
              <p className="hero-subtitle">
                AI-powered medicine scanner, localized stock checker, and emergency blood donor matching for Guntakal and surrounding localities.
              </p>
            </div>

            {/* Service Selection Tabs */}
            <div className="module-tabs">
              <button 
                className={`tab-btn medicine ${searchTab === 'medicine' ? 'active' : ''}`}
                onClick={() => setSearchTab('medicine')}
              >
                <Pill size={18} />
                Find Medicines
              </button>
              <button 
                className={`tab-btn blood ${searchTab === 'blood' ? 'active' : ''}`}
                onClick={() => setSearchTab('blood')}
              >
                <Droplet size={18} />
                Emergency Blood Donors
              </button>
            </div>

            {/* Medicine Search view */}
            {searchTab === 'medicine' && (
              <div className="search-card">
                <form className="search-form" onSubmit={handleMedicineSearch}>
                  <div className="search-input-wrapper">
                    <Search size={20} />
                    <input 
                      type="text" 
                      className="search-input" 
                      placeholder="Search medicine brand or generic name... e.g. Paracetamol"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn-search">Search Store Stock</button>
                </form>

                {/* AI Medicine Identification (Image Upload Container) */}
                <div style={{ marginTop: '2rem' }}>
                  <h4 style={{ marginBottom: '0.8rem', color: '#94a3b8', fontSize: '0.95rem' }}>AI Medicine Identifier (OCR Scanner)</h4>
                  
                  <div className="ocr-container">
                    <input 
                      type="file" 
                      id="ocr-file-input" 
                      style={{ display: 'none' }} 
                      accept="image/*"
                      onChange={handleOcrFileChange}
                    />
                    
                    {!isOcrProcessing ? (
                      <label htmlFor="ocr-file-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Upload size={36} />
                        <span style={{ fontWeight: '600', marginTop: '0.5rem' }}>Upload Medicine Package Photo</span>
                        <span className="ocr-subtext">Click to browse tablet strips, syrup bottles, or boxes</span>
                      </label>
                    ) : (
                      <div style={{ width: '100%', maxWidth: '300px' }}>
                        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 1rem', display: 'block', color: '#8b5cf6' }} />
                        <span style={{ fontWeight: '500' }}>AI Identifying Medicine in {ocrFilename}...</span>
                        <div className="progress-bar-container">
                          <div className="progress-bar-fill" style={{ width: `${ocrProgress}%` }}></div>
                        </div>
                        <span className="ocr-subtext">{ocrProgress}% Analyzed</span>
                      </div>
                    )}

                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', width: '100%' }}>
                      <span className="ocr-subtext" style={{ marginRight: '1rem' }}>Or quickly simulate OCR scan of:</span>
                      <select className="ocr-simulation-select" onChange={handleOcrSimulationSelect} defaultValue="">
                        <option value="" disabled>-- Select Medicine --</option>
                        <option value="Paracetamol 650">Dolo 650 (Paracetamol)</option>
                        <option value="Metformin 500mg">Glycomet (Metformin)</option>
                        <option value="Amoxicillin 500mg">Mox (Amoxicillin)</option>
                        <option value="Cetirizine 10mg">Okacet (Cetirizine)</option>
                        <option value="Ibuprofen 400mg">Brufen (Ibuprofen)</option>
                        <option value="Omeprazole 20mg">Omez (Omeprazole)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Blood Search view */}
            {searchTab === 'blood' && (
              <div className="search-card">
                <form className="search-form" onSubmit={handleBloodSearch}>
                  <div className="search-input-wrapper" style={{ flex: 'none', width: '220px' }}>
                    <Droplet size={20} color="#f43f5e" style={{ left: '1rem' }} />
                    <select 
                      className="search-input" 
                      style={{ paddingLeft: '3rem' }}
                      value={selectedBloodGroup}
                      onChange={(e) => setSelectedBloodGroup(e.target.value)}
                    >
                      <option value="O+">O Positive (O+)</option>
                      <option value="O-">O Negative (O-)</option>
                      <option value="A+">A Positive (A+)</option>
                      <option value="A-">A Negative (A-)</option>
                      <option value="B+">B Positive (B+)</option>
                      <option value="B-">B Negative (B-)</option>
                      <option value="AB+">AB Positive (AB+)</option>
                      <option value="AB-">AB Negative (AB-)</option>
                    </select>
                  </div>
                  <div className="search-input-wrapper">
                    <MapPin size={20} />
                    <input 
                      type="text" 
                      className="search-input" 
                      placeholder="Enter searching locality..." 
                      value={selectedLocality}
                      disabled
                    />
                  </div>
                  <button type="submit" className="btn-search blood-search">Find Compatible Donors</button>
                </form>
              </div>
            )}

            {/* Medicine Results Grid */}
            {searchTab === 'medicine' && medicineResults.length > 0 && (
              <div>
                <h3 className="results-heading">
                  <FileText size={20} color="#8b5cf6" />
                  Medicines Found ({medicineResults.length})
                </h3>
                {medicineResults.map((res, index) => (
                  <div 
                    key={index} 
                    className="medicine-result-card"
                    onClick={() => {
                      setSelectedMedicine(res);
                      setCurrentScreen('medicine_details');
                    }}
                  >
                    <div className="medicine-result-info">
                      <span className="medicine-badge">{res.medicine.category}</span>
                      <h3>{res.medicine.name}</h3>
                      <div className="generic-name">{res.medicine.genericName}</div>
                      <div className="medicine-result-meta">
                        <span>Manufacturer: <b>{res.medicine.manufacturer}</b></span>
                        <span>Prescription: <b>{res.medicine.prescriptionRequired ? 'Required' : 'Not Required'}</b></span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        {res.stockList.length > 0 ? (
                          <span className="stock-pill available">Available in {res.stockList.length} shops</span>
                        ) : (
                          <span className="stock-pill out">Out of Stock Locally</span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.9rem', color: '#8b5cf6', fontWeight: '600' }}>View Details & Map &rarr;</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Locality Statistics counters */}
            <div className="stats-grid" style={{ marginTop: '3rem' }}>
              <div className="stats-card">
                <div className="stats-icon-wrapper medicine">
                  <Pill size={24} />
                </div>
                <div>
                  <div className="stats-value">{systemStats.medicinesCount}</div>
                  <div className="stats-label">Master Medicines Catalog</div>
                </div>
              </div>
              <div className="stats-card">
                <div className="stats-icon-wrapper stores">
                  <Shield size={24} />
                </div>
                <div>
                  <div className="stats-value">{systemStats.shopsCount}</div>
                  <div className="stats-label">Verified Pharmacies (Guntakal)</div>
                </div>
              </div>
              <div className="stats-card">
                <div className="stats-icon-wrapper blood">
                  <Droplet size={24} />
                </div>
                <div>
                  <div className="stats-value">{systemStats.donorsCount}</div>
                  <div className="stats-label">Active Blood Donors</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Medicine Details Screen */}
        {currentScreen === 'medicine_details' && selectedMedicine && (
          <div>
            <button className="btn-back" onClick={() => setCurrentScreen('home')}>
              <ArrowLeft size={16} />
              Back to Search
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '2.2rem' }}>{selectedMedicine.medicine.name}</h2>
              {selectedMedicine.medicine.prescriptionRequired && (
                <span className="stock-pill out" style={{ fontSize: '0.8rem' }}>Rx - Prescription Required</span>
              )}
            </div>

            <div className="detail-layout">
              {/* Left Column: Info card */}
              <div className="info-panel">
                <div className="info-section">
                  <h4>Generic Formulation</h4>
                  <p className="generic-name" style={{ fontSize: '1.2rem', color: '#c084fc' }}>{selectedMedicine.medicine.genericName}</p>
                </div>

                <div className="info-section">
                  <h4>Key Uses / Indications</h4>
                  <ul className="bullet-list">
                    {selectedMedicine.medicine.uses && selectedMedicine.medicine.uses.map((use, i) => (
                      <li key={i}>{use}</li>
                    ))}
                  </ul>
                </div>

                <div className="info-section">
                  <h4>Recommended Dosage</h4>
                  <p>{selectedMedicine.medicine.dosage}</p>
                </div>

                <div className="info-section">
                  <h4>Common Side Effects</h4>
                  <ul className="bullet-list">
                    {selectedMedicine.medicine.sideEffects && selectedMedicine.medicine.sideEffects.map((se, i) => (
                      <li key={i}>{se}</li>
                    ))}
                  </ul>
                </div>

                <div className="info-section">
                  <h4>Precautions & Warnings</h4>
                  <ul className="bullet-list">
                    {selectedMedicine.medicine.warnings && selectedMedicine.medicine.warnings.map((warn, i) => (
                      <li key={i} style={{ color: '#f87171' }}>{warn}</li>
                    ))}
                  </ul>
                </div>

                <div className="info-section">
                  <h4>Storage Specifications</h4>
                  <p>{selectedMedicine.medicine.storageInstructions || 'Store in cool and dry place.'}</p>
                </div>
              </div>

              {/* Right Column: Local Stock and Map */}
              <div className="stock-sidebar">
                <div className="shops-list-card">
                  <h3 style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Nearby Pharmacy Stock</span>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Locality: {selectedLocality}</span>
                  </h3>
                  
                  {selectedMedicine.stockList.length > 0 ? (
                    selectedMedicine.stockList.map((shop, i) => (
                      <div key={i} className="shop-row">
                        <div className="shop-row-left">
                          <h4>{shop.shopName}</h4>
                          <p>{shop.address}</p>
                          <p style={{ marginTop: '0.2rem' }}>
                            <MapPin size={12} /> {shop.distance} km away
                            <Star size={12} fill="#eab308" color="#eab308" style={{ marginLeft: '10px' }} /> {shop.rating}
                          </p>
                        </div>
                        <div className="shop-row-right">
                          <span className={`stock-pill ${shop.stockStatus === 'Available' ? 'available' : shop.stockStatus === 'Low Stock' ? 'low' : 'out'}`}>
                            {shop.stockStatus}
                          </span>
                          <span className="shop-price">₹{shop.price}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b' }}>
                      <Shield size={32} style={{ marginBottom: '0.5rem', color: '#ef4444' }} />
                      <p>No verified pharmacies in <b>{selectedLocality}</b> currently stock this medicine.</p>
                    </div>
                  )}
                </div>

                {/* Leaflet Map Box */}
                <div className="map-card">
                  <div id="medicine-map" className="map-wrapper"></div>
                </div>
              </div>
            </div>

            {/* Alternatives section */}
            {selectedMedicine.alternatives && selectedMedicine.alternatives.length > 0 && (
              <div className="alternatives-container">
                <h3 style={{ fontSize: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
                  Alternative Brand Medicines (Same generic formula)
                </h3>
                <div className="alternatives-grid">
                  {selectedMedicine.alternatives.map((alt, i) => (
                    <div 
                      key={i} 
                      className="alt-card"
                      onClick={async () => {
                        // Load alt details
                        try {
                          const res = await fetch(`${API_BASE}/medicines/search?q=${encodeURIComponent(alt.name)}&locality=${selectedLocality}`);
                          const data = await res.json();
                          if (data.length > 0) {
                            setSelectedMedicine(data[0]);
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                    >
                      <span className="medicine-badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399' }}>Alternative</span>
                      <h4>{alt.name}</h4>
                      <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Manufacturer: {alt.manufacturer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Blood Search Result Screen */}
        {currentScreen === 'blood_search' && (
          <div>
            <button className="btn-back" onClick={() => setCurrentScreen('home')}>
              <ArrowLeft size={16} />
              Back to Search
            </button>

            <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>
              Compatible Donors for Blood Group: <span style={{ color: '#f43f5e' }}>{selectedBloodGroup}</span> in <b>{selectedLocality}</b>
            </h2>

            <div className="blood-grid">
              {/* Left Side: Donor List */}
              <div>
                <h3 style={{ marginBottom: '1rem' }}>Active Volunteers</h3>
                
                {bloodResults.donors.length > 0 ? (
                  bloodResults.donors.map((donor, i) => (
                    <div key={i} className="donor-card">
                      <div className="donor-info-row">
                        <div className="donor-avatar">{selectedBloodGroup}</div>
                        <div className="donor-details">
                          <h4>
                            {donor.name} 
                            <span className="donor-status-indicator available">Verified</span>
                          </h4>
                          <p>
                            <MapPin size={12} /> {donor.distance} km away ({donor.locality})
                          </p>
                        </div>
                      </div>
                      <div>
                        <a href={`tel:${donor.phone}`} className="btn-contact">
                          <Phone size={14} />
                          Call: {donor.phone}
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="donor-card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    <p>No volunteer donors found for <b>{selectedBloodGroup}</b> in <b>{selectedLocality}</b>. Try checking Blood Bank inventories on the map.</p>
                  </div>
                )}

                {/* Blood Bank stocks summary */}
                <h3 style={{ marginTop: '2.5rem', marginBottom: '1rem' }}>Verified Blood Bank Stock</h3>
                {bloodResults.bloodBanks.map((bank, i) => (
                  <div key={i} className="donor-card" style={{ borderLeft: '3px solid #ef4444' }}>
                    <div>
                      <h4 style={{ color: '#ef4444' }}>{bank.name}</h4>
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.2rem' }}>{bank.address}</p>
                      <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Distance: {bank.distance} km</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f43f5e' }}>{bank.availableUnits} Units</div>
                      <a href={`tel:${bank.phone}`} className="btn-contact" style={{ display: 'inline-flex', marginTop: '0.3rem' }}>
                        <Phone size={12} /> Call: {bank.phone}
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Side: Leaflet Map */}
              <div>
                <h3 style={{ marginBottom: '1rem' }}>Map Locations</h3>
                <div className="map-card" style={{ height: '480px' }}>
                  <div id="blood-map" className="map-wrapper"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shop Owner Dashboard Screen */}
        {currentScreen === 'shop_dashboard' && user && shopDetails && (
          <ShopOwnerDashboard shopDetails={shopDetails} user={user} />
        )}

        {/* Blood Donor Dashboard Screen */}
        {currentScreen === 'donor_dashboard' && user && donorDetails && (
          <BloodDonorDashboard donorDetails={donorDetails} user={user} setDonorDetails={setDonorDetails} />
        )}

        {/* Admin Dashboard Screen */}
        {currentScreen === 'admin_dashboard' && user && user.role === 'admin' && (
          <AdminDashboard user={user} />
        )}

        {/* Authentication: Sign In Screen */}
        {currentScreen === 'login' && (
          <LoginForm 
            setUser={setUser} 
            setShopDetails={setShopDetails} 
            setDonorDetails={setDonorDetails} 
            setCurrentScreen={setCurrentScreen} 
          />
        )}

        {/* Authentication: Register Screen */}
        {currentScreen === 'register' && (
          <RegisterForm 
            setCurrentScreen={setCurrentScreen} 
          />
        )}
      </main>
    </div>
  );
}

// ================= SUB-COMPONENTS =================

// 1. LOGIN FORM
function LoginForm({ setUser, setShopDetails, setDonorDetails, setCurrentScreen }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed');
        return;
      }

      // Save session
      setUser(data.user);
      localStorage.setItem('mediconnect_user', JSON.stringify(data.user));

      if (data.associatedDetails) {
        if (data.user.role === 'shop_owner') {
          setShopDetails(data.associatedDetails);
          localStorage.setItem('mediconnect_shop', JSON.stringify(data.associatedDetails));
          setCurrentScreen('shop_dashboard');
        } else if (data.user.role === 'donor') {
          setDonorDetails(data.associatedDetails);
          localStorage.setItem('mediconnect_donor', JSON.stringify(data.associatedDetails));
          setCurrentScreen('donor_dashboard');
        }
      } else if (data.user.role === 'admin') {
        setCurrentScreen('admin_dashboard');
      } else {
        setCurrentScreen('home');
      }
    } catch (err) {
      setError('Connection refused by server');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h2>Welcome Back</h2>
        <p>Login to your MediConnect account</p>
      </div>

      {error && <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '0.9rem' }}>{error}</div>}

      <form onSubmit={handleLoginSubmit}>
        <div className="form-group">
          <label>Email Address</label>
          <input 
            type="email" 
            className="form-control" 
            placeholder="name@example.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input 
            type="password" 
            className="form-control" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
        </div>
        <button type="submit" className="btn-submit">Sign In</button>
      </form>

      <div className="form-footer">
        Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setCurrentScreen('register'); }}>Create one</a>
      </div>
      
      <div style={{ marginTop: '1.5rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>Demo accounts for testing:</p>
        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.4rem' }}>
          <span>🔑 Admin: <b>admin@mediconnect.com</b> (adminpassword)</span>
          <span>🔑 Shop: <b>anil@abcmedical.com</b> (shopowner123)</span>
          <span>🔑 Donor: <b>rahul@gmail.com</b> (donorpassword)</span>
        </div>
      </div>
    </div>
  );
}

// 2. REGISTER FORM
function RegisterForm({ setCurrentScreen }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('general'); // 'general', 'shop_owner', 'donor'
  const [locality, setLocality] = useState('Guntakal');

  // Associated Profiles
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Predefine coordinates near Guntakal center with minor random offset
    const randomOffsetLat = (Math.random() - 0.5) * 0.03;
    const randomOffsetLng = (Math.random() - 0.5) * 0.03;
    const coordinates = {
      lat: DEFAULT_COORDS.lat + randomOffsetLat,
      lng: DEFAULT_COORDS.lng + randomOffsetLng
    };

    const payload = {
      name,
      email,
      password,
      role,
      locality,
      phone,
      shopDetails: role === 'shop_owner' ? { shopName, address: shopAddress, coordinates } : null,
      donorDetails: role === 'donor' ? { bloodGroup, coordinates } : null
    };

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      setSuccess('Account created! Please sign in.');
      setTimeout(() => {
        setCurrentScreen('login');
      }, 1500);
    } catch (err) {
      setError('Connection refused by server');
    }
  };

  return (
    <div className="auth-container" style={{ maxWidth: '520px' }}>
      <div className="auth-header">
        <h2>Create Account</h2>
        <p>Join the local healthcare support directory</p>
      </div>

      {error && <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '0.9rem' }}>{error}</div>}
      {success && <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '0.9rem' }}>{success}</div>}

      <form onSubmit={handleRegisterSubmit}>
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" className="form-control" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" className="form-control" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" className="form-control" placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Password</label>
            <input type="password" className="form-control" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Locality</label>
            <select className="form-control" value={locality} onChange={(e) => setLocality(e.target.value)}>
              <option value="Guntakal">Guntakal</option>
              <option value="Anantapur">Anantapur</option>
              <option value="Kurnool">Kurnool</option>
              <option value="Hyderabad">Hyderabad</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Account Role</label>
          <select className="form-control" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="general">General User (Search only)</option>
            <option value="shop_owner">Medical Shop Owner</option>
            <option value="donor">Emergency Blood Donor (Volunteer)</option>
          </select>
        </div>

        {/* Role Specific Configurations */}
        {role === 'shop_owner' && (
          <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', margin: '1rem 0' }}>
            <h4 style={{ marginBottom: '0.8rem', color: '#c084fc', fontSize: '0.95rem' }}>Medical Shop Details</h4>
            <div className="form-group">
              <label>Shop Name</label>
              <input type="text" className="form-control" placeholder="ABC Medical Store" value={shopName} onChange={(e) => setShopName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Shop Address</label>
              <input type="text" className="form-control" placeholder="Railway Station Road, Guntakal" value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} required />
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Note: Your shop coordinates will be set automatically around Guntakal center. Admin will need to verify your shop before listing stock.</span>
          </div>
        )}

        {role === 'donor' && (
          <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', margin: '1rem 0' }}>
            <h4 style={{ marginBottom: '0.8rem', color: '#f472b6', fontSize: '0.95rem' }}>Blood Donation Profile</h4>
            <div className="form-group">
              <label>Blood Group</label>
              <select className="form-control" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>
        )}

        <button type="submit" className="btn-submit">Sign Up</button>
      </form>

      <div className="form-footer">
        Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setCurrentScreen('login'); }}>Sign in</a>
      </div>
    </div>
  );
}

// 3. SHOP OWNER DASHBOARD VIEW
function ShopOwnerDashboard({ shopDetails, user }) {
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventory, setInventory] = useState([]);
  const [masterMedicines, setMasterMedicines] = useState([]);
  
  // Local Analytics
  const [popularSearches, setPopularSearches] = useState([]);

  // Stock update modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [stockStatus, setStockStatus] = useState('Available');
  const [quantity, setQuantity] = useState(100);
  const [price, setPrice] = useState(50);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const fetchInventory = async () => {
    try {
      const res = await fetch(`${API_BASE}/shops/inventory/${shopDetails._id}`);
      const data = await res.json();
      setInventory(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMasterMedicines = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/medicines`);
      const data = await res.json();
      setMasterMedicines(data);
      if (data.length > 0) setSelectedMedId(data[0]._id);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchShopAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/shops/analytics/${shopDetails.locality}`);
      const data = await res.json();
      setPopularSearches(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchMasterMedicines();
    fetchShopAnalytics();
  }, [shopDetails]);

  // Handle stock addition submit
  const handleStockSubmit = async (e) => {
    e.preventDefault();
    setFeedbackMsg('');
    try {
      const res = await fetch(`${API_BASE}/shops/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: shopDetails._id,
          medicineId: selectedMedId,
          stockStatus,
          quantity: parseInt(quantity),
          price: parseFloat(price)
        })
      });
      if (res.ok) {
        setFeedbackMsg('Inventory successfully updated!');
        fetchInventory();
        setTimeout(() => {
          setShowModal(false);
          setFeedbackMsg('');
        }, 1000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle stock item deletion
  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this medicine from stock list?')) return;
    try {
      const res = await fetch(`${API_BASE}/shops/inventory/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInventory();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const lowStockCount = inventory.filter(item => item.stockStatus === 'Low Stock' || item.quantity <= 10).length;

  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>Medical Shop Portal</h2>
      <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
        Store: <b>{shopDetails.shopName}</b> ({shopDetails.isVerified ? '✅ Verified Store' : '⏳ Verification Pending'})
      </p>

      <div className="dashboard-grid">
        {/* Sidebar Nav */}
        <div className="dashboard-sidebar">
          <div className={`sidebar-tab ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
            <Pill size={16} />
            Inventory Stock
          </div>
          <div className={`sidebar-tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            <BarChart2 size={16} />
            Locality Demand Analytics
          </div>
        </div>

        {/* Dashboard Display */}
        <div className="dashboard-panel">
          {activeTab === 'inventory' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3>Stock Management ({inventory.length} items)</h3>
                <button className="btn-login" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Plus size={16} />
                  Update Stock
                </button>
              </div>

              {/* Stats highlights */}
              <div className="db-stats-row">
                <div className="db-stat-card">
                  <h5>Total Items</h5>
                  <p>{inventory.length}</p>
                </div>
                <div className="db-stat-card" style={{ borderLeft: '3px solid #fbbf24' }}>
                  <h5>Low Stock Items</h5>
                  <p style={{ color: '#fbbf24' }}>{lowStockCount}</p>
                </div>
                <div className="db-stat-card">
                  <h5>Locality</h5>
                  <p style={{ fontSize: '1.2rem', marginTop: '0.4rem', color: '#c084fc' }}>{shopDetails.locality}</p>
                </div>
              </div>

              {/* Inventory Table */}
              <div className="table-wrapper">
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Generic Formula</th>
                      <th>Stock Level</th>
                      <th>Qty</th>
                      <th>Price (Unit)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.length > 0 ? (
                      inventory.map((item, i) => (
                        <tr key={i}>
                          <td><b>{item.medicine ? item.medicine.name : 'Unknown'}</b></td>
                          <td style={{ color: '#94a3b8', fontStyle: 'italic' }}>{item.medicine ? item.medicine.genericName : 'N/A'}</td>
                          <td>
                            <span className={`stock-pill ${item.stockStatus === 'Available' ? 'available' : item.stockStatus === 'Low Stock' ? 'low' : 'out'}`}>
                              {item.stockStatus}
                            </span>
                          </td>
                          <td>{item.quantity}</td>
                          <td>₹{item.price}</td>
                          <td>
                            <button 
                              className="btn-action-sm edit" 
                              onClick={() => {
                                setSelectedMedId(item.medicine._id);
                                setStockStatus(item.stockStatus);
                                setQuantity(item.quantity);
                                setPrice(item.price);
                                setShowModal(true);
                              }}
                              style={{ marginRight: '5px' }}
                            >
                              <Settings size={14} />
                            </button>
                            <button className="btn-action-sm" onClick={() => handleDeleteItem(item._id)}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                          No stock listed. Click "Update Stock" to add products.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <h3>Locality Search Demand Statistics</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Shows which medicines are searched most by users in <b>{shopDetails.locality}</b>. Use this to maintain your inventory levels!
              </p>

              <div className="analytics-chart-mock">
                {popularSearches.length > 0 ? (
                  popularSearches.map((item, i) => {
                    const maxVal = popularSearches[0].count;
                    const percent = Math.max(15, (item.count / maxVal) * 100);
                    return (
                      <div key={i} className="chart-bar-row">
                        <div className="chart-label">{item._id}</div>
                        <div className="chart-bar-container">
                          <div className="chart-bar-fill" style={{ width: `${percent}%` }}></div>
                        </div>
                        <div className="chart-value">{item.count} searches</div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '2rem 0', textAlign: 'center', color: '#64748b' }}>
                    No search traffic data registered in this locality yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stock Update Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            <h3>Manage Stock Entry</h3>
            
            {feedbackMsg && <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.8rem', borderRadius: '8px', margin: '1rem 0' }}>{feedbackMsg}</div>}

            <form onSubmit={handleStockSubmit} style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Select Medicine</label>
                <select className="form-control" value={selectedMedId} onChange={(e) => setSelectedMedId(e.target.value)}>
                  {masterMedicines.map((med, i) => (
                    <option key={i} value={med._id}>{med.name} ({med.genericName})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Stock Status</label>
                <select className="form-control" value={stockStatus} onChange={(e) => setStockStatus(e.target.value)}>
                  <option value="Available">Available</option>
                  <option value="Low Stock">Low Stock</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input type="number" className="form-control" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Retail Price (₹)</label>
                  <input type="number" step="0.01" className="form-control" value={price} onChange={(e) => setPrice(e.target.value)} required />
                </div>
              </div>

              <button type="submit" className="btn-submit" style={{ marginTop: '1rem' }}>Save Changes</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// 4. BLOOD DONOR DASHBOARD VIEW
function BloodDonorDashboard({ donorDetails, user, setDonorDetails }) {
  const [isAvailable, setIsAvailable] = useState(donorDetails.isAvailable);
  const [bloodGroup, setBloodGroup] = useState(donorDetails.bloodGroup);
  const [locality, setLocality] = useState(donorDetails.locality);
  const [success, setSuccess] = useState('');

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/donor/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAvailable,
          bloodGroup,
          locality
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Donor settings updated successfully!');
        setDonorDetails(data.donor);
        localStorage.setItem('mediconnect_donor', JSON.stringify(data.donor));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <div className="info-panel">
        <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
          <Droplet size={24} color="#f43f5e" fill="#f43f5e" />
          Volunteer Donor Dashboard
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
          Status: <b>{donorDetails.isVerified ? '✅ Verified Donor' : '⏳ Verification Pending'}</b>
        </p>

        {success && <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '0.9rem' }}>{success}</div>}

        <form onSubmit={handleProfileUpdate}>
          {/* Availability switch toggler */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <div>
              <h4 style={{ fontSize: '1.05rem', color: '#f8fafc' }}>Donation Availability Status</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.1rem' }}>When disabled, you will be hidden from search queries during emergency lookups.</p>
            </div>
            <label className="switch">
              <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
              <span className="slider"></span>
            </label>
          </div>

          <div className="form-group">
            <label>Blood Group</label>
            <select className="form-control" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
            </select>
          </div>

          <div className="form-group">
            <label>Current Locality</label>
            <input type="text" className="form-control" value={locality} onChange={(e) => setLocality(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Contact Phone Number</label>
            <input type="text" className="form-control" value={user.phone} disabled />
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Phone details can be modified in login accounts.</span>
          </div>

          <button type="submit" className="btn-submit" style={{ background: 'var(--accent-blood)' }}>Update Settings</button>
        </form>
      </div>
    </div>
  );
}

// 5. ADMIN DASHBOARD VIEW
function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('approvals');
  const [unverifiedShops, setUnverifiedShops] = useState([]);
  const [unverifiedDonors, setUnverifiedDonors] = useState([]);
  
  // Analytics State
  const [globalStats, setGlobalStats] = useState({ counts: {}, topMedicines: [], topBlood: [] });

  // Add Medicine Form State
  const [medName, setMedName] = useState('');
  const [medGeneric, setMedGeneric] = useState('');
  const [medMfg, setMedMfg] = useState('');
  const [medCat, setMedCat] = useState('General');
  const [medUses, setMedUses] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medPrecautions, setMedPrecautions] = useState('');
  const [medRx, setMedRx] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState('');

  const fetchUnverified = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/unverified`);
      const data = await res.json();
      setUnverifiedShops(data.pendingShops || []);
      setUnverifiedDonors(data.pendingDonors || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGlobalAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/analytics`);
      const data = await res.json();
      setGlobalStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUnverified();
    fetchGlobalAnalytics();
  }, [activeTab]);

  const handleVerifyShop = async (shopId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/verify/shop/${shopId}`, { method: 'POST' });
      if (res.ok) {
        fetchUnverified();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyDonor = async (donorId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/verify/donor/${donorId}`, { method: 'POST' });
      if (res.ok) {
        fetchUnverified();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMedicineSubmit = async (e) => {
    e.preventDefault();
    setAdminSuccess('');

    const payload = {
      name: medName,
      genericName: medGeneric,
      manufacturer: medMfg,
      category: medCat,
      uses: medUses.split(',').map(s => s.trim()),
      dosage: medDosage,
      warnings: medPrecautions.split(',').map(s => s.trim()),
      prescriptionRequired: medRx
    };

    try {
      const res = await fetch(`${API_BASE}/admin/medicine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setAdminSuccess('New medicine successfully cataloged!');
        setMedName('');
        setMedGeneric('');
        setMedMfg('');
        setMedUses('');
        setMedDosage('');
        setMedPrecautions('');
        setMedRx(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>Admin Dashboard</h2>
      <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Verify credentials, view network statistics, and update medical libraries.</p>

      <div className="dashboard-grid">
        {/* Admin Navigation */}
        <div className="dashboard-sidebar">
          <div className={`sidebar-tab ${activeTab === 'approvals' ? 'active' : ''}`} onClick={() => setActiveTab('approvals')}>
            <Check size={16} />
            Pending Approvals ({unverifiedShops.length + unverifiedDonors.length})
          </div>
          <div className={`sidebar-tab ${activeTab === 'add_medicine' ? 'active' : ''}`} onClick={() => setActiveTab('add_medicine')}>
            <Plus size={16} />
            Add Master Medicine
          </div>
          <div className={`sidebar-tab ${activeTab === 'global_stats' ? 'active' : ''}`} onClick={() => setActiveTab('global_stats')}>
            <BarChart2 size={16} />
            System Traffic Stats
          </div>
        </div>

        {/* Admin Panels */}
        <div className="dashboard-panel">
          {activeTab === 'approvals' && (
            <div>
              <h3>Pending Verification Checklists</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Review pharmacy and blood donor registrations in Guntakal.</p>

              {/* Pending Shops */}
              <h4 style={{ margin: '1rem 0 0.5rem', color: '#8b5cf6' }}>Medical Shops ({unverifiedShops.length})</h4>
              <div className="table-wrapper">
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>Shop Name</th>
                      <th>Owner Name</th>
                      <th>Address</th>
                      <th>Phone</th>
                      <th>Locality</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unverifiedShops.length > 0 ? (
                      unverifiedShops.map((shop, i) => (
                        <tr key={i}>
                          <td><b>{shop.shopName}</b></td>
                          <td>{shop.owner ? shop.owner.name : 'Unknown'}</td>
                          <td>{shop.address}</td>
                          <td>{shop.phone}</td>
                          <td>{shop.locality}</td>
                          <td>
                            <button className="btn-action-sm verify" onClick={() => handleVerifyShop(shop._id)}>
                              <Check size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem' }}>
                          No pending shops.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pending Donors */}
              <h4 style={{ margin: '2rem 0 0.5rem', color: '#f43f5e' }}>Blood Donors ({unverifiedDonors.length})</h4>
              <div className="table-wrapper">
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>Volunteer Name</th>
                      <th>Blood Group</th>
                      <th>Locality</th>
                      <th>Contact Phone</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unverifiedDonors.length > 0 ? (
                      unverifiedDonors.map((donor, i) => (
                        <tr key={i}>
                          <td><b>{donor.user ? donor.user.name : 'Unknown'}</b></td>
                          <td><span className="donor-avatar" style={{ width: '30px', height: '30px', fontSize: '0.8rem', display: 'inline-flex' }}>{donor.bloodGroup}</span></td>
                          <td>{donor.locality}</td>
                          <td>{donor.user ? donor.user.phone : 'N/A'}</td>
                          <td>
                            <button className="btn-action-sm verify" onClick={() => handleVerifyDonor(donor._id)}>
                              <Check size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem' }}>
                          No pending donors.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'add_medicine' && (
            <div>
              <h3>Add Master Medicine Entry</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Add new formulations to the system master database so shops can stock them.</p>

              {adminSuccess && <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.2rem', fontSize: '0.9rem' }}>{adminSuccess}</div>}

              <form onSubmit={handleAddMedicineSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Medicine Name / Brand</label>
                    <input type="text" className="form-control" placeholder="Dolo 650" value={medName} onChange={(e) => setMedName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Generic Name</label>
                    <input type="text" className="form-control" placeholder="Paracetamol" value={medGeneric} onChange={(e) => setMedGeneric(e.target.value)} required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Manufacturer</label>
                    <input type="text" className="form-control" placeholder="Micro Labs" value={medMfg} onChange={(e) => setMedMfg(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select className="form-control" value={medCat} onChange={(e) => setMedCat(e.target.value)}>
                      <option value="General">General</option>
                      <option value="Analgesics / Antipyretics">Analgesics / Antipyretics</option>
                      <option value="Antidiabetics">Antidiabetics</option>
                      <option value="Antibiotics">Antibiotics</option>
                      <option value="Antihistamines">Antihistamines</option>
                      <option value="Proton Pump Inhibitors">Proton Pump Inhibitors</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Uses (Comma separated)</label>
                  <input type="text" className="form-control" placeholder="Fever reduction, Pain relief, Inflammation" value={medUses} onChange={(e) => setMedUses(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Dosage Instructions</label>
                  <input type="text" className="form-control" placeholder="1 tablet twice daily after meals" value={medDosage} onChange={(e) => setMedDosage(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Precautions & Warnings (Comma separated)</label>
                  <input type="text" className="form-control" placeholder="Do not take with alcohol, Avoid double dosage" value={medPrecautions} onChange={(e) => setMedPrecautions(e.target.value)} />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                  <input type="checkbox" id="admin-prescription-req" checked={medRx} onChange={(e) => setMedRx(e.target.checked)} />
                  <label htmlFor="admin-prescription-req" style={{ marginBottom: 0, cursor: 'pointer' }}>Require Prescription (Rx) for this medicine</label>
                </div>

                <button type="submit" className="btn-submit" style={{ marginTop: '1rem' }}>Register Medicine</button>
              </form>
            </div>
          )}

          {activeTab === 'global_stats' && (
            <div>
              <h3>System Traffic Analytics</h3>
              
              <div className="db-stats-row" style={{ marginTop: '1rem' }}>
                <div className="db-stat-card">
                  <h5>Total Registered Users</h5>
                  <p>{globalStats.counts ? globalStats.counts.users : 0}</p>
                </div>
                <div className="db-stat-card" style={{ borderLeft: '3px solid #10b981' }}>
                  <h5>Verified Shops</h5>
                  <p style={{ color: '#10b981' }}>{globalStats.counts ? globalStats.counts.shops : 0}</p>
                </div>
                <div className="db-stat-card" style={{ borderLeft: '3px solid #f43f5e' }}>
                  <h5>Verified Donors</h5>
                  <p style={{ color: '#f43f5e' }}>{globalStats.counts ? globalStats.counts.donors : 0}</p>
                </div>
              </div>

              <h4 style={{ margin: '1.5rem 0 0.5rem', color: '#8b5cf6' }}>Top Medicines Searched (System-wide)</h4>
              <div className="analytics-chart-mock">
                {globalStats.topMedicines && globalStats.topMedicines.length > 0 ? (
                  globalStats.topMedicines.map((item, i) => {
                    const maxVal = globalStats.topMedicines[0].count;
                    const percent = Math.max(15, (item.count / maxVal) * 100);
                    return (
                      <div key={i} className="chart-bar-row">
                        <div className="chart-label">{item._id}</div>
                        <div className="chart-bar-container">
                          <div className="chart-bar-fill" style={{ width: `${percent}%` }}></div>
                        </div>
                        <div className="chart-value">{item.count} hits</div>
                      </div>
                    );
                  })
                ) : (
                  <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No medicine search logs.</p>
                )}
              </div>

              <h4 style={{ margin: '2rem 0 0.5rem', color: '#f43f5e' }}>Top Blood Groups Requested (System-wide)</h4>
              <div className="analytics-chart-mock">
                {globalStats.topBlood && globalStats.topBlood.length > 0 ? (
                  globalStats.topBlood.map((item, i) => {
                    const maxVal = globalStats.topBlood[0].count;
                    const percent = Math.max(15, (item.count / maxVal) * 100);
                    return (
                      <div key={i} className="chart-bar-row">
                        <div className="chart-label" style={{ width: '80px' }}>Blood Group: {item._id}</div>
                        <div className="chart-bar-container">
                          <div className="chart-bar-fill blood" style={{ width: `${percent}%` }}></div>
                        </div>
                        <div className="chart-value">{item.count} queries</div>
                      </div>
                    );
                  })
                ) : (
                  <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No blood request logs.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
