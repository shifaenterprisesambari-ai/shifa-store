# Shifa Store - Google Play Store Deployment Documentation

This document contains critical configurations, signing keys, and store descriptions required for deploying and updating the **Shifa Store** app on the Google Play Store.

---

## 🔑 App Signing Key Details (Keystore)

This keystore is used to digitally sign the Android App Bundle (`.aab`) for production deployment.

> [!CAUTION]
> **DO NOT LOSE THIS KEYSTORE FILE OR THE PASSWORDS.** If you lose them, you will not be able to upload future updates to the Google Play Store. Keep a backup copy of the `.jks` file on Google Drive, OneDrive, or in your email.

* **Keystore File Location on Laptop:**  
  `C:\PINTU\PRO\Sifa-Store\frontend\android\sifa-store-key.jks`
* **Keystore Password:**  
  `ShifaStore2026!` *(Or the custom password you entered)*
* **Key Alias:**  
  `sifa-store` *(Or `key0` if you left the default)*
* **Key Password:**  
  `ShifaStore2026!` *(Same as keystore password)*
* **Key Validity:**  
  `25 years`

### Certificate Details:
* **First and Last Name:** `Shifa Store`
* **Organization:** `Shifa Enterprises`
* **Country Code (XX):** `IN`

---

## 📦 How to Build the App Bundle (.aab)

Whenever you make frontend changes and want to create a new version for the Play Store, run these steps:

1. **Rebuild and Sync the Frontend (in terminal):**
   ```powershell
   cd frontend
   npm run build
   npx cap sync android
   ```
2. **Generate the Signed Bundle in Android Studio:**
   * Open Android Studio with the folder `C:\PINTU\PRO\Sifa-Store\frontend\android`.
   * Go to **Build** -> **Generate Signed Bundle / APK...**
   * Choose **Android App Bundle** -> click **Next**.
   * Choose your keystore (`sifa-store-key.jks`), enter the passwords and alias above, and click **Next**.
   * Select **`release`** as the Build Variant.
   * Click **Create / Finish**.
3. **Locate the File:**
   * The generated `.aab` file will be saved at:  
     `C:\PINTU\PRO\Sifa-Store\frontend\android\app\release\app-release.aab`
   * Upload this file to the Google Play Console.

---

## 📝 Play Store Descriptions

Use these texts when setting up your **Main Store Listing** and creating releases on the Google Play Console:

### 1. Store Listing - Option A (Default)
* **Short Description (Max 80 chars):**  
  `Order fresh groceries & daily essentials online. Fast delivery to your doorstep!`
* **Full Description (Max 4000 chars):**  
  ```text
  Welcome to Shifa Store – your ultimate online grocery and daily essentials delivery app! 

  Get everything you need delivered straight to your doorstep in just 15 to 25 minutes. From fresh fruits and vegetables to kitchen staples, dairy products, beverages, snacks, and household cleaning essentials, Shifa Store makes daily shopping quick, easy, and hassle-free.

  Why choose Shifa Store?

  🚀 Superfast Delivery: No more waiting in long supermarket lines. We deliver your orders fresh and fast, right when you need them.

  🍎 Fresh & High Quality: We source the freshest fruits, vegetables, and high-quality grocery items from trusted local vendors to ensure the best for your family.

  📍 Precision Location Pinning: Easily select your delivery location using our pinpoint map picker. Our delivery partners will find your doorstep without calling you for directions.

  💳 Secure & Flexible Payment Options:
  - Pay securely online using Pay Online (Razorpay) supporting UPI, Cards, Netbanking, and Wallets.
  - Or choose Cash on Delivery (COD) for ultimate convenience.

  📦 Real-Time Order Tracking: Track your order from the moment it is accepted by the store, picked up by our delivery partner, to the second it arrives at your door.

  Download Shifa Store today and experience the easiest way to shop for groceries!
  ```

### 2. Store Listing - Option B (Alternative Corporate Style)
* **Short Description (Max 80 chars):**  
  `Your premium destination for fresh groceries, fruits, & essentials delivered fast.`
* **Full Description (Max 4000 chars):**  
  ```text
  Shifa Store is a premium, localized grocery delivery service designed to bring fresh groceries and daily essentials directly to your home. 

  Through our partnership with local shop owners and vendors, we guarantee the highest quality selection of fresh produce, dairy, bakery items, household essentials, and pantry staples—all delivered in a single, superfast order.

  Key Features & Services:
  • Handpicked Quality: Fresh fruits, vegetables, and premium daily essentials sourced directly from the best local shops.
  • 15-Minute Delivery: Efficient, local delivery networks ensure your order arrives at your door without delay.
  • Seamless Map Location Picker: Precision coordinate pinning so our riders can navigate directly to your location.
  • Pay Online or COD: Safe checkout integrations (including Razorpay online payments and Cash on Delivery options).
  • Order Syncing & Real-Time Updates: Complete end-to-end tracking of your order from dispatch to delivery.

  Download the Shifa Store app to enjoy a seamless, high-quality shopping experience today!
  ```

### 3. Release Notes ("What's New in this Version" - Required during release)
* Copy and paste these notes into the Release Notes box when creating a deployment release on the Play Console:
  ```text
  • Enabled online payment options using Razorpay (supporting UPI, Cards, Netbanking, and Wallets).
  • Added precision map pinning for easier and more accurate delivery locations.
  • Improved real-time order tracking and shop owner notifications.
  • General performance improvements and bug fixes for the mobile app interface.
  ```
