# 🚀 Pre-Publish Security & Production Deployment Guide

This document outlines the security hardening already completed and the step-by-step checklist required before publishing **Shifa Store** live on your server or custom domain (`shifastore.online`).

---

## ✅ 1. Security Improvements Completed Right Now

### 🛡️ Rate Limiting Protection (`@fastify/rate-limit`)
- **Implemented in**: `app.js`
- **Protection**: Automatically limits requests to **150 requests per minute per IP address**. Prevents automated brute-force attacks on login forms, account creation spam, and server DDoS.

### 🌐 Whitelisted Dynamic CORS & Socket.io Security
- **Implemented in**: `app.js`
- **Protection**: Restricted cross-origin access (`CORS`) and WebSocket (`Socket.io`) connections to authorized origins (`http://localhost:5173`, `process.env.FRONTEND_URL`, `https://shifastore.online`, `https://www.shifastore.online`). Malicious external websites cannot hijack API calls or socket events.

### 💳 Cryptographic Payment Verification (Razorpay)
- **Implemented in**: `src/controllers/order/order.js`
- **Protection**: Payment completion uses **HMAC-SHA256 signature verification** against `RAZORPAY_KEY_SECRET`. Users cannot bypass payments or tamper with order amounts.

### 🔑 Google OAuth 2.0 Identity Security
- **Implemented in**: `src/controllers/auth/auth.js` & `frontend/src/App.jsx`
- **Protection**: Authenticates Google One Tap & Google 1-Click Login using official Google JWT signature verification (`google-auth-library`).

### 📱 Mandatory Details Enforcement
- **Implemented in**: `src/controllers/order/order.js` & `frontend/src/pages/customer/Checkout.jsx`
- **Protection**: Mandates valid **10-digit Mobile Phone Number** and **Delivery Address** before placing orders.

---

## 📋 2. Pre-Publish Action Items (Before Going Live)

Complete these 5 steps when deploying Shifa Store to your live VPS, Nginx server, or cloud hosting:

### Step 1: Set Production Environment Variables (`.env`)
In your live server's `.env` file, set:
```env
NODE_ENV=production
FRONTEND_URL=https://shifastore.online
PORT=3000

# Strong 256-bit Random Secrets
ACCESS_TOKEN_SECRET=8f4a1c6e9d2b7f3a5e8c1b4d7f9a2e5c8b1d4f7a9e2c5b8d1f4a7e9c2b5d8f1
REFRESH_TOKEN_SECRET=9e2c5b8d1f4a7e9c2b5d8f1a4e7c0b3d6f9a2e5c8b1d4f7a9e2c5b8d1f4a7e9

# Google OAuth Client Credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Live Razorpay Credentials
RAZORPAY_KEY_ID=rzp_live_T2OYIb7eI1JtWJ
RAZORPAY_KEY_SECRET=1MnYbD6sPTackxA7c9uQI7sB
```

### Step 2: Add Live Domain to Google Cloud Console
1. Go to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Click your OAuth 2.0 Client ID (`1096015868047-...`).
3. Under **Authorized JavaScript Origins**, add:
   - `https://shifastore.online`
   - `https://www.shifastore.online`
4. Under **Authorized Redirect URIs**, add:
   - `https://shifastore.online`
5. Save changes.

### Step 3: SSL / HTTPS Encryption Setup
- Ensure your live server uses **SSL/HTTPS** (e.g. free Let's Encrypt SSL via Certbot).
- **Why**: Google Login, Browser Geolocation API (`navigator.geolocation`), and Payment Gateways **require HTTPS** on production domains.

### Step 4: Razorpay Webhook Configuration (Optional for Live Notifications)
1. Go to [Razorpay Dashboard -> Settings -> Webhooks](https://dashboard.razorpay.com/app/webhooks).
2. Add Webhook URL: `https://api.shifastore.online/api/order/razorpay-webhook` (or your domain endpoint).
3. Select events: `order.paid`, `payment.failed`.

### Step 5: Enable Nginx Reverse Proxy (Recommended for VPS)
If hosting on a Linux VPS (Ubuntu/Debian), configure Nginx reverse proxy to forward traffic to `http://localhost:3000`:
```nginx
server {
    server_name api.shifastore.online;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Summary
With rate-limiting, CORS whitelisting, HMAC payment verification, and JWT security active, **Shifa Store is secure and ready for pre-launch testing**.
