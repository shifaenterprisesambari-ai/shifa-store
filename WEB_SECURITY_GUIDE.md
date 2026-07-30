# 🎓 Master Web Application Security Guide: From Fundamentals to Advanced Protection

Welcome to the **Complete Web Application Security Handbook**! This guide is designed as an educational reference covering fundamental, advanced, and enterprise-grade security concepts using **Shifa Store** as a practical real-world architecture.

---

## 📚 Table of Contents
1. [The Core Pillars of Web Security (CIA Triad)](#1-the-core-pillars-of-web-security-cia-triad)
2. [Authentication & Authorization (Passwords, bcrypt & JWT)](#2-authentication--authorization-passwords-bcrypt--jwt)
3. [OAuth 2.0 & Federated Identity (Google 1-Click Login)](#3-oauth-20--federated-identity-google-1-click-login)
4. [Payment Gateway Security (HMAC-SHA256 Signatures)](#4-payment-gateway-security-hmac-sha256-signatures)
5. [Mass Assignment & Over-Posting Vulnerabilities](#5-mass-assignment--over-posting-vulnerabilities)
6. [CORS & Same-Origin Policy (SOP)](#6-cors--same-origin-policy-sop)
7. [Rate Limiting & DDoS / Brute-Force Defense](#7-rate-limiting--ddos--brute-force-defense)
8. [Cross-Site Scripting (XSS) & React Escaping](#8-cross-site-scripting-xss--react-escaping)
9. [NoSQL & SQL Injection Defenses](#9-nosql--sql-injection-defenses)
10. [CSRF (Cross-Site Request Forgery) & Cookie Hardening](#10-csrf-cross-site-request-forgery--cookie-hardening)
11. [File Upload Security & Media Validation](#11-file-upload-security--media-validation)
12. [Token Revocation & Remote Logout Strategies](#12-token-revocation--remote-logout-strategies)
13. [HTTP Security Headers & Clickjacking (Helmet & CSP)](#13-http-security-headers--clickjacking-helmet--csp)
14. [Subresource Integrity (SRI) & CDN Security](#14-subresource-integrity-sri--cdn-security)
15. [WebSocket & Real-Time Security (Socket.io)](#15-websocket--real-time-security-socketio)
16. [Web Push Notifications & VAPID Key Security](#16-web-push-notifications--vapid-key-security)
17. [PII Logging Protection & Principle of Least Privilege](#17-pii-logging-protection--principle-of-least-privilege)
18. [Secrets Management & Environment Isolation](#18-secrets-management--environment-isolation)
19. [Comprehensive Attack & Defense Matrix](#19-comprehensive-attack--defense-matrix)
20. [Production Launch Security Checklist](#20-production-launch-security-checklist)
21. [Interactive Developer Security Quiz](#21-interactive-developer-security-quiz)

---

## 1. The Core Pillars of Web Security (CIA Triad)

Web application security revolves around three primary guarantees known as the **CIA Triad**:

```
                    ┌─────────────────────────┐
                    │      CONFIDENTIALITY    │
                    │ (Only authorized views) │
                    └────────────┬────────────┘
                                 │
                                 │
         ┌───────────────────────┴───────────────────────┐
         │                                               │
┌────────┴────────────────┐                     ┌────────┴────────────────┐
│        INTEGRITY        │                     │       AVAILABILITY      │
│ (No data tampering)     │                     │ (Server stays online)   │
└─────────────────────────┘                     └─────────────────────────┘
```

1. **Confidentiality**: Customer addresses, phone numbers, and order histories must be unreadable to unauthorized parties.
2. **Integrity**: Cart item totals, product prices, and payment statuses cannot be tampered with in transit or in memory.
3. **Availability**: The platform remains responsive and operational even during traffic spikes or malicious flood attempts.

---

## 2. Authentication & Authorization (Passwords, bcrypt & JWT)

### A. Password Hashing with `bcrypt`
- **The Vulnerability**: Storing plain-text passwords means a single database leak compromises all user credentials across the internet.
- **The Defense**: Passwords must be hashed using a **one-way cryptographic algorithm** like `bcrypt`:
  ```javascript
  const hashedPassword = await bcrypt.hash(userPassword, 10);
  ```
- **How Salting & Cost Factors Work**:
  - **Salt**: A random string added to the password before hashing so identical passwords (e.g. `123456`) produce completely unique hash strings.
  - **Cost Factor (`10`)**: Forces $2^{10} = 1024$ iterations per hash. This deliberate slowness makes GPU-based rainbow table brute-forcing virtually impossible.

---

### B. JSON Web Tokens (JWT) & Stateless Auth
Instead of storing session memory on the server for thousands of concurrent users, we issue a signed **JWT**:

```
 [ Header (Alg: HS256) ] . [ Payload (userId, role) ] . [ Cryptographic Signature ]
```

1. The client attaches the token in the HTTP Authorization header:
   ```http
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
2. **Verification Middleware ([auth.js](file:///c:/PINTU/PRO/Sifa-Store/src/middleware/auth.js))**:
   ```javascript
   const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
   req.user = decoded;
   ```
3. **Why it's Secure**: If an attacker edits the payload (e.g. changing `role: "Customer"` to `role: "Admin"`), the secret-based signature validation fails immediately.

---

### C. Role-Based Access Control (RBAC)
Shifa Store enforces strict access control by checking `req.user.role`:
- **Customer**: Access store catalog, place orders, view personal profile.
- **ShopOwner**: Manage own shop inventory, view incoming orders for their shop.
- **DeliveryPartner**: Accept assigned delivery orders, update live GPS location.
- **Admin**: Master control panel, branch commission management, branch details.

---

## 3. OAuth 2.0 & Federated Identity (Google 1-Click Login)

Federated Identity allows users to log in securely using their existing Google account without creating or remembering passwords.

### Sequence Diagram:
```
Customer              React Frontend             Backend Server              Google Auth Server
   │                        │                          │                             │
   │── Click "Google Login"─►                          │                             │
   │                        │────── Request ID Token───┼────────────────────────────►│
   │                        │◄───── Return ID Token────┼─────────────────────────────│
   │                        │                          │                             │
   │                        │── POST /google-login ───►│                             │
   │                        │   (idToken)              │── verifyIdToken(idToken)───►│
   │                        │                          │◄─ Valid Payload (email, sub)│
   │                        │◄─ Return Shifa JWT ──────│                             │
```

**Security Mechanism**: The backend verifies Google's cryptographic RSA signature (`OAuth2Client.verifyIdToken`). An attacker cannot forge an ID token.

---

## 4. Payment Gateway Security (HMAC-SHA256 Signatures)

### Rule #1: Never Trust Client-Side Prices!
A browser environment is completely controllable by the user (Chrome DevTools, Postman, proxy tools). If the frontend sends `{ amount: 10 }`, the server must NEVER trust it.

### How Razorpay HMAC Signature Verification Works:
1. **Server Calculation**: Backend fetches item prices from MongoDB, calculates `grandTotal`, and creates a Razorpay Order.
2. **Payment Execution**: Customer pays on Razorpay's encrypted checkout widget.
3. **Signature Verification ([order.js](file:///c:/PINTU/PRO/Sifa-Store/src/controllers/order/order.js))**:
   Razorpay returns `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
   ```javascript
   const body = razorpay_order_id + "|" + razorpay_payment_id;
   const expectedSignature = crypto
     .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
     .update(body.toString())
     .digest("hex");

   if (expectedSignature === razorpay_signature) {
     // Payment is authentic & verified!
   }
   ```

---

## 5. Mass Assignment & Over-Posting Vulnerabilities

### What is Mass Assignment?
Mass Assignment happens when an API blindly passes user-submitted JSON objects (`req.body`) into a database update query.

**Example Vulnerability Scenario**:
An attacker sends a POST request to update their profile:
```json
{
  "name": "Attacker",
  "role": "Admin",
  "isActivated": true
}
```
If the backend does `Customer.findByIdAndUpdate(id, req.body)`, the attacker just promoted themselves to **Master Admin**!

### How We Defend Against Mass Assignment ([user.js](file:///c:/PINTU/PRO/Sifa-Store/src/controllers/tracking/user.js)):
We explicitly sanitize and strip sensitive fields from `req.body` before saving to MongoDB:
```javascript
// Prevent updating sensitive fields
delete updateData.password;
delete updateData.role;
delete updateData.email;
delete updateData.googleId;
```

---

## 6. CORS & Same-Origin Policy (SOP)

### What is CORS?
**Cross-Origin Resource Sharing (CORS)** is a browser security mechanism that restricts a webpage on domain A from making requests to an API on domain B.

### Configuration in Shifa Store ([app.js](file:///c:/PINTU/PRO/Sifa-Store/app.js)):
```javascript
const allowedOrigins = [
  "http://localhost:5173",
  "https://shifastore.online",
  "https://www.shifastore.online"
];

app.register(cors, {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error("CORS origin not allowed"), false);
  },
  credentials: true
});
```

---

## 7. Rate Limiting & DDoS / Brute-Force Defense

### What is a Brute-Force Attack?
Attackers use automated botnets to send thousands of requests trying passwords or promo codes.

### Implementation ([app.js](file:///c:/PINTU/PRO/Sifa-Store/app.js)):
```javascript
await app.register(rateLimit, {
  max: 150, // 150 requests
  timeWindow: '1 minute', // Per 1 minute window per IP
});
```
When an IP exceeds 150 requests/min, Fastify returns **HTTP 429 (Too Many Requests)**.

---

## 8. Cross-Site Scripting (XSS) & React Escaping

### What is XSS?
Cross-Site Scripting occurs when an attacker inserts malicious JavaScript into user input (e.g. entering `<script>stealCookies()</script>` into a product review or address field).

### How React Protects Against XSS:
By default, React **automatically escapes** string values embedded in JSX:
```jsx
{/* Safe! React converts `<` to `&lt;` and `>` to `&gt;` */}
<p>{user.address}</p>
```
- **Dangerous Practice**: Avoid `dangerouslySetInnerHTML={{ __html: userSubmittedData }}` unless properly sanitized with libraries like `DOMPurify`.

---

## 9. NoSQL & SQL Injection Defenses

### What is NoSQL Injection?
In unvalidated Node.js apps, sending a payload like `{ "email": { "$ne": null }, "password": { "$ne": null } }` can trick a query into returning the first user (often an Admin).

### How Mongoose Prevents NoSQL Injection:
Mongoose enforces strict Schema types:
```javascript
const customerSchema = new Schema({
  email: { type: String, required: true },
  phone: { type: Number, sparse: true }
});
```
If a payload passes an object `{ "$ne": null }` to a field defined as `String` or `Number`, Mongoose casts or rejects it before executing the query.

---

## 10. CSRF (Cross-Site Request Forgery) & Cookie Hardening

### What is CSRF?
CSRF occurs when a user visits a malicious website while logged into `shifastore.online`. The malicious site triggers a hidden request to `shifastore.online/api/order`. If credentials are sent automatically in plain cookies, the browser executes the request!

### How We Prevent CSRF:
1. **Bearer Tokens**: JWTs are sent via `Authorization: Bearer <token>` HTTP headers. Browsers **do not** automatically attach custom headers to cross-site requests.
2. **Cookie Flags (for Admin Sessions)**:
   - `HttpOnly`: Prevents JavaScript from reading the cookie via `document.cookie`.
   - `SameSite=Lax` or `SameSite=Strict`: Prevents the browser from sending the cookie on cross-site requests.
   - `Secure`: Ensures the cookie is only sent over encrypted HTTPS connections.

---

## 11. File Upload Security & Media Validation

Unrestricted file uploads allow attackers to upload executable scripts (e.g. `shell.php` or `malware.exe`) to your server.

### Security Best Practices for File Uploads:
1. **MIME-Type & Extension Whitelisting**: Allow only `image/jpeg`, `image/png`, `image/webp`.
2. **Rename Files on Upload**: Never preserve original file names. Use UUIDs: `upload-9f8a2b3c.jpg`.
3. **Max File Size Limit**: Cap uploads (e.g. max 5MB).
4. **Cloud Object Storage**: Store user uploaded images on Cloudinary or AWS S3 instead of local server directories.

---

## 12. Token Revocation & Remote Logout Strategies

JWTs are stateless, meaning once issued, a token remains valid until it expires.

### How to Revoke Tokens ("Log out of all devices"):
1. **Token Blacklisting**: Store revoked JWT IDs (`jti`) in Redis with an expiration matching the token's lifetime.
2. **User Token Versioning**: Add a `tokenVersion` integer field to the `Customer` schema. When a user changes their password or clicks "Log Out All Devices", increment `tokenVersion++`. Any JWT containing an old token version is instantly rejected by middleware!

---

## 13. HTTP Security Headers & Clickjacking (Helmet & CSP)

Security headers tell the browser how to behave securely:

| Header Name | Security Function |
| :--- | :--- |
| **`Strict-Transport-Security` (HSTS)** | Forces the browser to connect using HTTPS only, preventing SSL stripping. |
| **`X-Frame-Options: DENY`** | Prevents Clickjacking by disallowing your app from being rendered inside an `<iframe>`. |
| **`X-Content-Type-Options: nosniff`** | Stops browsers from guessing (sniffing) MIME types. |
| **`Content-Security-Policy` (CSP)** | Restricts which domains can load scripts, images, and fonts on your page. |

---

## 14. Subresource Integrity (SRI) & CDN Security

When loading external scripts from CDNs (such as Razorpay JS SDK or Google OAuth SDK), an attacker who compromises the CDN could inject malware into your site.

### How Subresource Integrity (SRI) Works:
We attach a cryptographic hash to the script tag:
```html
<script 
  src="https://checkout.razorpay.com/v1/checkout.js" 
  integrity="sha384-..." 
  crossorigin="anonymous">
</script>
```
If the CDN script content changes by even a single byte, the browser blocks execution!

---

## 15. WebSocket & Real-Time Security (Socket.io)

Shifa Store uses WebSockets for real-time rider tracking and notification popups.

### Room-Based Isolation ([app.js](file:///c:/PINTU/PRO/Sifa-Store/app.js)):
```javascript
socket.on("joinUserRoom", (userId) => {
  socket.join(`user-${userId}`);
});
```
- **Security Rule**: Socket events are scoped to specific rooms (`user-${userId}` or `orderId`). A customer in room `user-A` cannot intercept messages broadcast to `user-B`.

---

## 16. Web Push Notifications & VAPID Key Security

Web Push notifications rely on **VAPID (Voluntary Application Server Identification)**:
- **Public Key**: Shared with the client browser to subscribe to push events.
- **Private Key**: Kept strictly secret on the backend server (`.env`).
- **Security Benefit**: Browser push services (Google FCM, Apple APNs) verify that push notifications strictly originate from Shifa Store's private key.

---

## 17. PII Logging Protection & Principle of Least Privilege

### A. PII (Personally Identifiable Information) Redaction
Never output raw passwords, credit card numbers, or auth headers into server log files:
```javascript
// ❌ Dangerous:
console.log("Login payload:", req.body); // Logs raw password to disk!

// ✅ Safe:
console.log("Login attempt for email:", req.body.email);
```

### B. Principle of Least Privilege
- **Database User**: MongoDB connection strings should use a database user restricted to `readWrite` on `Grocery-app` only—never `root` or `dbAdmin`.
- **Node.js Process**: Never run Node.js backend processes as system `root` user in Linux. Run under a dedicated unprivileged system user (e.g. `www-data` or `node`).

---

## 18. Secrets Management & Environment Isolation

### The Rules of `.env`:
1. **Never commit `.env` to Git**: Store sensitive API keys, database URIs, and passwords in `.env`.
2. **Add `.env` to `.gitignore`**:
   ```gitignore
   node_modules
   .env
   dist/
   ```
3. **Frontend Leak Protection**: Never put backend secret keys (`GOOGLE_CLIENT_SECRET`, `RAZORPAY_KEY_SECRET`) inside React/Vite frontend code. Frontend code is visible to anyone who views page source.

---

## 19. Comprehensive Attack & Defense Matrix

| Cyber Threat | Attacker's Goal | Defense Mechanism in Shifa Store |
| :--- | :--- | :--- |
| **Credential Stuffing** | Testing stolen password lists. | Rate limiting (`@fastify/rate-limit`) + bcrypt salting. |
| **Mass Assignment** | Adding `role: "Admin"` in profile update. | Explicit field deletion (`delete updateData.role`) in controller. |
| **Payment Tampering** | Buying items for ₹0 or negative prices. | Server-side database price calculation + Razorpay HMAC signature checks. |
| **JWT Tampering** | Elevating role from Customer to Admin. | HS256 secret signature verification (`ACCESS_TOKEN_SECRET`). |
| **Account Takeover** | Stealing session cookies. | `HttpOnly` and `SameSite` cookie flags + Bearer header tokens. |
| **XSS Script Injection** | Stealing local storage data via `<script>`. | React automatic JSX HTML escaping + Content Security Policies. |
| **Eavesdropping** | Intercepting Wi-Fi traffic. | HTTPS / TLS 1.3 encryption on production domain. |

---

## 20. Production Launch Security Checklist

Before taking Shifa Store live:
- ✅ Set `NODE_ENV=production` in environment variables.
- ✅ Generate 256-bit random strings for `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`.
- ✅ Restrict CORS origins to your official production domain (`https://shifastore.online`).
- ✅ Verify SSL/HTTPS certificates are active on your domain.
- ✅ Audit `.gitignore` to guarantee `.env` is excluded.
- ✅ Run `npm audit` to check for third-party package vulnerabilities.

---

## 21. Interactive Developer Security Quiz

Test your knowledge with these 5 quick web security questions!

<details>
<summary><b>Question 1: Why should order prices never be calculated in the React frontend?</b></summary>
<br/>
<b>Answer:</b> Because the client browser environment can be edited by anyone using Chrome DevTools or proxy tools. A user could change an item price from ₹500 to ₹1 before sending the request. Prices must ALWAYS be fetched from the database on the server!
</details>

<details>
<summary><b>Question 2: What happens if an attacker edits a JWT token payload to change their role to "Admin"?</b></summary>
<br/>
<b>Answer:</b> The backend verification call <code>jwt.verify(token, secret)</code> will fail because altering any character in the payload invalidates the token's cryptographic signature.
</details>

<details>
<summary><b>Question 3: How does bcrypt prevent rainbow table attacks?</b></summary>
<br/>
<b>Answer:</b> By generating a unique random "salt" for every password before hashing, so even identical passwords produce completely different hash strings.
</details>

<details>
<summary><b>Question 4: What is Mass Assignment and how do we prevent it?</b></summary>
<br/>
<b>Answer:</b> Mass Assignment happens when an API updates database fields directly from <code>req.body</code> without filtering. We prevent it by stripping sensitive fields (e.g. <code>delete updateData.role</code>) before passing data to MongoDB.
</details>

<details>
<summary><b>Question 5: Why is Google 1-Click Login more secure than traditional password login?</b></summary>
<br/>
<b>Answer:</b> Because users don't type or store passwords on our server, eliminating keyloggers, weak passwords, and credential stuffing risks. The server verifies Google's RSA signature directly.
</details>

---

*Keep this handbook as a lifelong reference for building secure software! 🚀*
