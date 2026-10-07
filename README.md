# Mediconnect

### AI-Powered Local Healthcare & Emergency Blood Assistance Platform

MediConnect is a full-stack healthcare web application designed to make **medicine discovery, pharmacy availability, and emergency blood donor searching** easier, especially in tier-2 and tier-3 towns.

The platform combines **MERN stack technologies, OCR, geospatial search, pharmacy inventory management, and role-based access control** into a single healthcare solution.

---

## 🚀 Key Features

### 💊 AI Medicine Scanner

- Upload a photo of a medicine strip, box, or syrup bottle.
- Uses **Tesseract.js OCR** to extract medicine names from images.
- Cleans and matches OCR text against the medicine database.
- Uses fallback matching techniques for OCR errors.
- Finds pharmacies that have the identified medicine.

### 🏪 Pharmacy & Inventory Search

- Search for medicines available in nearby pharmacies.
- Pharmacy owners can manage:
  - Medicine stock
  - Prices
  - Stock status
- Stock status can be:
  - Available
  - Low Stock
  - Out of Stock

### 🧬 Generic Medicine Alternatives

If a particular medicine brand is unavailable, the system can search for other medicines having the same generic name.

For example:

```text
Dolo 650
    ↓
Paracetamol
    ↓
Other available Paracetamol brands
```

### 🩸 Emergency Blood Donor Search

- Search for compatible blood donors.
- Filter donors based on:
  - Blood group
  - Availability
  - Location
- Verified donors can control their availability through an availability toggle.

### 🗺️ Interactive Map

- Uses **Leaflet.js** and **OpenStreetMap**.
- Displays nearby pharmacies, donors, and blood banks.
- Uses geographical coordinates for location-based searching.
- Uses the **Haversine formula** for geographical distance calculation.

> Note: Haversine provides geographical/straight-line distance rather than actual road-route distance.

### 👨‍💼 Admin Verification

New pharmacies and donors are not immediately shown publicly.

```text
Registration
     ↓
Pending Verification
     ↓
Admin Review
     ↓
Approved
     ↓
Publicly Visible
```

This helps reduce fake pharmacy and donor listings.

---

## 🏗️ System Architecture

```text
                    ┌───────────────────┐
                    │       User        │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   React Frontend  │
                    │  + Leaflet.js     │
                    └─────────┬─────────┘
                              │
                         REST API
                              │
                              ▼
                    ┌───────────────────┐
                    │ Node.js + Express │
                    │      Backend      │
                    └───────┬─────┬─────┘
                            │     │
              ┌─────────────┘     └──────────────┐
              ▼                                  ▼
      ┌─────────────────┐               ┌─────────────────┐
      │    MongoDB      │               │   Tesseract.js  │
      │    + Mongoose   │               │      OCR        │
      └─────────────────┘               └─────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

- React.js
- Leaflet.js
- OpenStreetMap
- CSS
- Lucide React

### Backend

- Node.js
- Express.js
- REST APIs
- Multer

### Database

- MongoDB
- Mongoose

### AI / OCR

- Tesseract.js
- Optical Character Recognition
- Text matching and fallback matching

### Location

- GPS coordinates
- Haversine formula
- MongoDB geospatial indexing

---

## 🧩 Database Collections

The application uses multiple MongoDB collections.

### User

Stores user authentication and role information.

Roles include:

```text
general
shop_owner
donor
admin
```

### MedicalShop

Stores:

- Shop name
- Address
- Phone number
- Latitude
- Longitude
- Verification status

### Medicine

Stores:

- Brand name
- Generic name
- Uses
- Dosage
- Side effects
- Prescription requirement

### Inventory

Connects medicines with pharmacies and stores:

- Quantity
- Price
- Stock status

### DonorProfile

Stores:

- Blood group
- Location
- Verification status
- Availability

### SearchAnalytics

Records medicine and blood-group searches for demand analytics.

---

## 🔄 Medicine Identification Flow

```text
User uploads medicine image
            ↓
React Frontend
            ↓
POST /api/medicines/identify
            ↓
Multer receives image
            ↓
Temporary file storage
            ↓
Tesseract.js OCR
            ↓
Extracted text
            ↓
Text cleaning
            ↓
Medicine keyword matching
            ↓
MongoDB medicine matching
            ↓
Regex fallback matching
            ↓
Medicine identified
            ↓
Search inventory
            ↓
Find verified pharmacies
            ↓
Calculate geographical distance
            ↓
Return JSON response
            ↓
React + Leaflet Map
```

---

## 🔍 OCR Approach

MediConnect uses **Tesseract.js** on the Node.js backend.

The OCR process follows a fallback strategy:

```text
OCR Text
   ↓
Clean / Normalize
   ↓
Known Medicine Keyword Matching
   ↓
MongoDB Partial Matching
   ↓
Regex Fallback
   ↓
Medicine Identified
```

This approach helps handle OCR issues caused by:

- Glare
- Reflective medicine strips
- Curved bottles
- Imperfect image quality

---

## 📍 Location & Distance

Pharmacies and donors have geographical coordinates.

The system can compare:

```text
User Location
      ↓
Latitude + Longitude
      ↓
Pharmacy Location
      ↓
Latitude + Longitude
      ↓
Distance Calculation
```

The project uses the **Haversine formula** for geographical distance.

For geospatial database queries, MongoDB's **2dsphere indexing** can be used to efficiently perform location-based searches.

---

## 👥 User Roles

| Role | Responsibilities |
|---|---|
| General User | Search medicines and blood donors |
| Shop Owner | Manage pharmacy inventory and prices |
| Donor | Manage blood profile and availability |
| Admin | Verify pharmacies/donors and manage platform data |

---

## 🔐 Security & Access Control

MediConnect uses role-based access control to restrict functionality according to the user's role.

Example:

```text
General User
    ↓
Medicine / Blood Search

Shop Owner
    ↓
Inventory Management

Donor
    ↓
Donor Profile / Availability

Admin
    ↓
Verification / Administration
```

Protected APIs can be secured using authentication and authorization mechanisms.

---

## ⚡ Performance & Optimization

The system uses database optimization techniques for location-based searches.

A MongoDB `2dsphere` index can improve geospatial query performance.

The project evaluation reported:

```text
Before optimization: ~280 ms
After optimization:   ~14 ms
```

for radial geospatial queries.

---

## 📊 Evaluation Results

### OCR Accuracy

| Image Type | Recognition Accuracy |
|---|---:|
| Overall | 92% |
| Cardboard Boxes | 96% |
| Tablet Strips | 94% |
| Syrup Bottles | 86% |

### Search Performance

```text
OCR scan:       ~1.2 seconds
Direct search:  <0.1 seconds
```

---

## 🐛 Major Challenges & Solutions

### 1. OCR Accuracy

**Problem:**  
Glare, reflections, and curved surfaces affected OCR.

**Solution:**  
Implemented multiple fallback matching strategies including keyword matching, MongoDB matching, and regex-based matching.

### 2. Leaflet Map Lifecycle

**Problem:**

```text
Map container is already initialized
```

React re-renders could cause Leaflet to initialize the same map container multiple times.

**Solution:**  
Used React `useRef()` to maintain the map instance and remove the existing instance before creating a new one.

### 3. Fake Shops & Donors

**Problem:**  
Unverified users could potentially submit fake pharmacy or donor information.

**Solution:**  
Implemented an admin verification workflow where new shops and donors remain unverified until approved.

---

## 📈 Future Improvements

### Better OCR Accuracy

Improve image preprocessing and recognition for reflective strips and curved medicine bottles.

### Emergency SMS / WhatsApp Alerts

Automatically notify compatible nearby blood donors during emergencies.

```text
Emergency Request
       ↓
Find Compatible Donors
       ↓
Filter Nearby Donors
       ↓
SMS / WhatsApp Notification
```

### Better Scalability

Tesseract OCR is CPU-intensive. For high traffic, OCR processing can be moved to background workers.

Possible architecture:

```text
Client
  ↓
Load Balancer
  ↓
Node.js API Servers
  ↓
Redis + BullMQ
  ↓
OCR Workers
  ↓
Tesseract.js
```

This keeps the main API responsive while OCR jobs are processed asynchronously.

---

## 💻 Installation

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd MediConnect
```

### 2. Install dependencies

For the backend:

```bash
cd backend
npm install
```

For the frontend:

```bash
cd frontend
npm install
```

### 3. Configure environment variables

Create a `.env` file in the backend:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

Add any additional environment variables required by your implementation.

### 4. Start the backend

```bash
npm start
```

### 5. Start the frontend

```bash
npm run dev
```

---

## 🔮 Future Architecture

For production-scale deployment:

```text
                    Users
                      ↓
                Load Balancer
                 /    |    \
                ↓     ↓     ↓
             Node  Node   Node
              API   API    API
                \    |    /
                 MongoDB
                    |
              Redis / BullMQ
                    |
              OCR Workers
                    |
               Tesseract
```

This architecture allows the API layer and OCR processing layer to scale independently.

---

## 🎯 Project Highlights

- Full-stack MERN healthcare application
- AI-powered medicine image recognition
- Tesseract.js OCR integration
- Pharmacy inventory management
- Emergency blood donor search
- Role-based access control
- Admin verification workflow
- Leaflet + OpenStreetMap integration
- Geospatial search
- Haversine distance calculation
- MongoDB geospatial indexing
- RESTful API architecture
- OCR fallback matching
- Demand/search analytics

---

## 👨‍💻 Project Purpose

MediConnect aims to reduce the time and effort required to locate medicines and emergency blood resources by connecting users with nearby verified healthcare providers and volunteers through a single digital platform.
