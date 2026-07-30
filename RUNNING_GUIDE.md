# 🚀 Shifa Store - Comprehensive Master Running & Operation Guide

This guide provides complete, step-by-step instructions for running, operating, testing, and managing the entire **Shifa Store** ecosystem (Backend Server, Frontend React App, Master Admin Panel, Sub-Branch Dashboards, Database Seeder, and Mobile App builds).

---

## 📚 Table of Contents
1. [Overview & How the Components Work Together](#1-overview--how-the-components-work-together)
2. [Prerequisites & Environment Files](#2-prerequisites--environment-files)
3. [First-Time Installation](#3-first-time-installation)
4. [Database Seeding (Populate Initial Products & Categories)](#4-database-seeding-populate-initial-products--categories)
5. [How to Run the Platform (2-Terminal Workflow)](#5-how-to-run-the-platform-2-terminal-workflow)
6. [Access URLs & Admin Dashboard Credentials](#6-access-urls--admin-dashboard-credentials)
7. [Testing All User Roles (Customer, Shop Owner, Delivery, Admin)](#7-testing-all-user-roles-customer-shop-owner-delivery-admin)
8. [Building & Running the Mobile App (Android APK)](#8-building--running-the-mobile-app-android-apk)
9. [Troubleshooting & Common Fixes](#9-troubleshooting--common-fixes)
10. [Quick Command Reference Cheat Sheet](#10-quick-command-reference-cheat-sheet)

---

## 1. Overview & How the Components Work Together

Shifa Store operates on a modern 2-tier client-server architecture:

```
┌───────────────────────────────────────────────────────────┐
│                    REACT VITE FRONTEND                    │
│             Runs on: http://localhost:5173                │
│   (Storefront, Checkout, Profile, Branch Dashboards)      │
└─────────────────────────────┬─────────────────────────────┘
                              │
                    REST API & Socket.io
                              │
┌─────────────────────────────▼─────────────────────────────┐
│                    FASTIFY NODE.JS BACKEND                │
│             Runs on: http://localhost:3000                │
│  (API Server, AdminJS Management, JWT Auth, WebSockets)   │
└─────────────────────────────┬─────────────────────────────┘
                              │
                       Database Drivers
                              │
┌─────────────────────────────▼─────────────────────────────┐
│                       MONGODB ATLAS                       │
│           (Users, Products, Orders, Branches)             │
└───────────────────────────────────────────────────────────┘
```

1. **Backend Server (Node.js + Fastify)**: Handles database connections, user authentication (JWT + Google OAuth), order processing, Razorpay payments, Socket.io real-time tracking, and AdminJS panel.
2. **Frontend App (React + Vite + Tailwind)**: Interactive customer web store, shop owner dashboard, delivery partner app interface, and master admin analytics portal.

---

## 2. Prerequisites & Environment Files

Ensure you have **Node.js v18+** installed. Check versions in terminal:
```bash
node -v
npm -v
```

### Environment Configuration Files

#### A. Backend Environment File (`.env` in Root Directory)
Location: `c:\PINTU\PRO\Sifa-Store\.env`

```env
MONGO_URI=mongodb://shifaenterprisesambari:fklCDggbMDJFzuHI@ac-iigaqld-shard-00-00.ks44yq4.mongodb.net:27017,ac-iigaqld-shard-00-01.ks44yq4.mongodb.net:27017,ac-iigaqld-shard-00-02.ks44yq4.mongodb.net:27017/Grocery-app?ssl=true&replicaSet=atlas-uszc6v-shard-0&authSource=admin&retryWrites=true&w=majority&appName=grocery-app
COOKIE_PASSWORD=sieL67H7GbkzJ4XCoH0IHcmO1hGBSiG5
ACCESS_TOKEN_SECRET=rsa_encrypted_secret
REFRESH_TOKEN_SECRET=rsa_encrypted_refresh_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
VAPID_PUBLIC_KEY=BFX9YVmAqf5lLyGXNBVUAs_erkYQfmhCi1qwb446nK8BL9LbK0tYitqbfia7ekbbFy_3BLB0hAT5UWXpwZf6D6Q
VAPID_PRIVATE_KEY=PCuMYP-8i1zUlZwrKX8eRd8hBUpCamrfppSbrMPNBi8
RAZORPAY_KEY_ID=rzp_live_T2OYIb7eI1JtWJ
RAZORPAY_KEY_SECRET=1MnYbD6sPTackxA7c9uQI7sB
GMAIL_USER=otp.shifastore.online@gmail.com
GMAIL_APP_PASSWORD=aoct envh zduy duwm
FAST2SMS_API_KEY=your_fast2sms_api_key
FAST2SMS_ROUTE=otp
ENABLE_SMS_NOTIFICATIONS=true
```

#### B. Frontend Environment File (`frontend/.env`)
Location: `c:\PINTU\PRO\Sifa-Store\frontend\.env`

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=1096015868047-imd9e2m46trkc0q1n1ueuqm33mbb7tga.apps.googleusercontent.com
VITE_RAZORPAY_KEY_ID=rzp_live_T2OYIb7eI1JtWJ
```

---

## 3. First-Time Installation

Run these two commands to install all required dependencies:

### Step 1: Install Backend Packages
Open terminal in project root (`c:\PINTU\PRO\Sifa-Store`):
```bash
npm install
```

### Step 2: Install Frontend Packages
Navigate to `frontend/` folder and install packages:
```bash
cd frontend
npm install
cd ..
```

---

## 4. Database Seeding (Populate Initial Products & Categories)

If you are setting up a new database or want to reset demo products (Milk, Vegetables, Fruits, Munchies, Baby Care, Pharma, etc.):

Run the seed script from project root:
```bash
node seedScript.js
```

**Output:**
```
DB CONNECTED ✅
DATABSE SEEDED SUCCESSFULLY
```

---

## 5. How to Run the Platform (2-Terminal Workflow)

To run the full site locally, open **TWO separate terminal windows**:

### 🖥️ Terminal 1: Start Backend API & Admin Server
In project root (`c:\PINTU\PRO\Sifa-Store`):
```bash
npm run dev
```
- **Backend API**: `http://localhost:3000/api`
- **AdminJS Panel**: `http://localhost:3000/admin`
- **Socket.io Service**: `ws://localhost:3000`

---

### 🌐 Terminal 2: Start Frontend Web Application
Open a second terminal window, navigate to `frontend/`:
```bash
cd frontend
npm run dev
```
- **Storefront Web App**: `http://localhost:5173`

---

## 6. Access URLs & Admin Dashboard Credentials

### 🔗 Portal Links

| Portal | URL | Description |
| :--- | :--- | :--- |
| **Customer Storefront** | `http://localhost:5173/` | Shop groceries, auto-detect location, 1-click checkout. |
| **AdminJS Master Panel** | `http://localhost:3000/admin` | Database management, user roles, product catalog, commission rates. |
| **Master Admin Web Portal** | `http://localhost:5173/admin/dashboard` | Main web analytics, branch details, commission quick-edit buttons. |
| **Customer Sign In** | `http://localhost:5173/login` | Google 1-Click Login / Mobile Phone login. |
| **Customer Sign Up** | `http://localhost:5173/signup` | Create Customer, Shop Owner, or Delivery partner accounts. |

---

### 🔑 Test Accounts & Credentials

#### 1. Master Admin (Site Owner)
- **Portal URL**: `http://localhost:3000/admin` or `http://localhost:5173/login`
- **Email**: `shifaenterprisesambari@gmail.com`
- **Password**: `Shifa@2025`
- **Access**: Full system access, all sub-branches, commission rate edits, shop owner approvals.

#### 2. Sub-Branch Admin (Goalpara Branch Manager)
- **Portal URL**: `http://localhost:3000/admin`
- **Email**: `shifagoalparaadmin@gmail.com`
- **Password**: `Goalpara@2026`
- **Access**: Restricted access to Goalpara branch orders, products, and partner approvals.

---

## 7. Testing All User Roles (Customer, Shop Owner, Delivery, Admin)

You can easily switch between roles on `http://localhost:5173/login`:

1. **Customer Flow**:
   - Login via **"Continue with Google"** or enter mobile number.
   - Select active branch (*Ambari Branch* or *Goalpara Branch*).
   - Add items to cart ➔ Proceed to Checkout ➔ Complete phone/address details ➔ Place order (COD or Online).

2. **Shop Owner Flow**:
   - Login as Shop Owner at `http://localhost:5173/login?role=shopowner`.
   - Manage incoming orders, mark items as out of stock, toggle shop online/offline.

3. **Delivery Partner Flow**:
   - Login as Delivery Partner at `http://localhost:5173/login?role=delivery`.
   - Accept delivery tasks, send real-time GPS location updates to customer room.

---

## 8. Building & Running the Mobile App (Android APK)

The frontend is configured with **Capacitor** to compile native Android mobile apps:

```bash
cd frontend

# 1. Build the production React web bundle
npm run build

# 2. Copy production assets into Android native project
npx cap sync android

# 3. Open project in Android Studio to build APK or run on phone
npx cap open android
```

In Android Studio, click **Build > Build APK(s)** to generate `app-debug.apk` for testing on real Android phones.

---

## 9. Troubleshooting & Common Fixes

### Q1: Port 3000 is already in use (`EADDRINUSE`)
**Fix (Windows PowerShell)**:
```powershell
Get-NetTCPConnection -LocalPort 3000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Q2: Port 5173 is already in use (`EADDRINUSE`)
**Fix (Windows PowerShell)**:
```powershell
Get-NetTCPConnection -LocalPort 5173 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Q3: MongoDB Atlas Connection Timeout
**Fix**: Verify internet connection and check if your current IP address is whitelisted in MongoDB Atlas Network Access.

### Q4: Google Login throws "Failed to authenticate"
**Fix**: Ensure `GOOGLE_CLIENT_ID` in root `.env` matches your Google Cloud Console Client ID.

---

## 10. Quick Command Reference Cheat Sheet

| Task | Command | Working Directory |
| :--- | :--- | :--- |
| **Install Backend Dependencies** | `npm install` | `c:\PINTU\PRO\Sifa-Store` |
| **Install Frontend Dependencies** | `npm install` | `c:\PINTU\PRO\Sifa-Store\frontend` |
| **Seed Database** | `node seedScript.js` | `c:\PINTU\PRO\Sifa-Store` |
| **Run Backend Server** | `npm run dev` | `c:\PINTU\PRO\Sifa-Store` |
| **Run Frontend Web App** | `npm run dev` | `c:\PINTU\PRO\Sifa-Store\frontend` |
| **Build Production Web Bundle** | `npm run build` | `c:\PINTU\PRO\Sifa-Store\frontend` |
| **Sync Android Mobile App** | `npx cap sync android` | `c:\PINTU\PRO\Sifa-Store\frontend` |

---

*Keep this guide open whenever starting development or testing Shifa Store! 🚀*
