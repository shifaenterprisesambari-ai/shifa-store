import { Customer, DeliveryPartner, Admin, ShopOwner } from "../../models/user.js";
import Branch from "../../models/branch.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { sendEmail } from "../../services/emailService.js";
import { sendOtpSMS } from "../../services/fast2smsService.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1d" }
  );

  const refreshToken = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
  return { accessToken, refreshToken };
};

// ==========================================
// EXISTING: Customer Phone Login (Updated to Phone & Password)
// ==========================================

export const loginCustomer = async (req, reply) => {
  try {
    const { phone: identifier, password } = req.body;
    if (!identifier) {
      return reply.status(400).send({ message: "Identifier is required" });
    }

    const isEmail = /^\S+@\S+\.\S+$/.test(identifier);
    let customerObj = null;
    let role = "Customer";

    if (isEmail) {
      // Admins log in using email
      const admin = await Admin.findOne({ email: identifier }).populate("branch", "name");
      if (!admin) {
        return reply.status(404).send({ message: "Admin account not found" });
      }
      customerObj = admin;
      role = "Admin";
    } else {
      // Customers log in using mobile number
      const customer = await Customer.findOne({ phone: Number(identifier) });
      if (!customer) {
        return reply.status(404).send({ message: "Customer account not found" });
      }
      customerObj = customer;
      role = "Customer";
    }

    if (!customerObj.password) {
      return reply.status(400).send({
        message: "This account uses Google login. Please sign in with Google.",
      });
    }

    // Support both plain-text (legacy) and bcrypt passwords
    let isMatch = false;
    if (customerObj.password.startsWith("$2")) {
      isMatch = await bcrypt.compare(password, customerObj.password);
    } else {
      isMatch = password === customerObj.password;
    }

    if (!isMatch) {
      return reply.status(400).send({ message: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = generateTokens(customerObj);

    const userObj = customerObj.toObject();
    delete userObj.password;
    userObj.role = role;

    return reply.send({
      message: "Login Successful",
      accessToken,
      refreshToken,
      customer: userObj,
    });
  } catch (error) {
    return reply.status(500).send({ message: "An error occurred", error });
  }
};

// In-memory store for signup mobile OTP verification (phone -> { otp, expires })
const signupOtpStore = new Map();

/**
 * Send a 6-digit OTP code to verify a mobile number before signup.
 */
export const sendSignupOtp = async (req, reply) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return reply.status(400).send({ message: "Mobile number is required" });
    }

    const cleanPhone = String(phone).replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      return reply.status(400).send({ message: "Valid 10-digit mobile number is required" });
    }

    const phoneNum = Number(cleanPhone);

    // Check if phone number already registered across models
    let existing = await Customer.findOne({ phone: phoneNum }) ||
                   await ShopOwner.findOne({ phone: phoneNum }) ||
                   await DeliveryPartner.findOne({ phone: phoneNum }) ||
                   await Admin.findOne({ phone: phoneNum });

    if (existing) {
      return reply.status(409).send({ message: "This mobile number is already registered. Please log in instead." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    signupOtpStore.set(cleanPhone, {
      otp,
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
    });

    console.log(`\n==========================================`);
    console.log(`[Signup OTP] Mobile: ${cleanPhone} | Verification Code: ${otp}`);
    console.log(`==========================================\n`);

    // Send normal SMS via Fast2SMS
    await sendOtpSMS(cleanPhone, otp).catch((e) =>
      console.error("[Signup OTP] Fast2SMS send error:", e.message)
    );

    return reply.send({
      message: "Verification OTP code sent to your mobile number via SMS.",
    });
  } catch (error) {
    console.error("sendSignupOtp error:", error);
    return reply.status(500).send({ message: "An error occurred while sending verification OTP", error });
  }
};

// ==========================================
// NEW: Customer Phone/Email Signup
// ==========================================

export const signupCustomerEmail = async (req, reply) => {
  try {
    const { name, email, password, phone, otp } = req.body;

    const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      return reply.status(400).send({ message: "Valid 10-digit mobile number is required" });
    }

    // Verify OTP code
    const storedOtp = signupOtpStore.get(cleanPhone);
    if (!storedOtp || String(storedOtp.otp).trim() !== String(otp || "").trim()) {
      return reply.status(400).send({ message: "Invalid verification OTP code. Please enter the correct OTP sent to your phone." });
    }

    if (storedOtp.expires < Date.now()) {
      signupOtpStore.delete(cleanPhone);
      return reply.status(400).send({ message: "Verification OTP code has expired. Please request a new code." });
    }

    // Check if phone already exists
    const existingPhone = await Customer.findOne({ phone: Number(cleanPhone) });
    if (existingPhone) {
      return reply
        .status(409)
        .send({ message: "Phone number already registered" });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await Customer.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return reply.status(409).send({ message: "Email already registered" });
      }
    }

    // OTP verified — consume token
    signupOtpStore.delete(cleanPhone);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const customer = new Customer({
      name,
      email: email ? email.toLowerCase() : undefined,
      password: hashedPassword,
      phone: Number(cleanPhone),
      role: "Customer",
      isActivated: true,
    });

    await customer.save();

    const { accessToken, refreshToken } = generateTokens(customer);

    // Don't send password back
    const customerObj = customer.toObject();
    delete customerObj.password;

    return reply.status(201).send({
      message: "Signup Successful",
      accessToken,
      refreshToken,
      customer: customerObj,
    });
  } catch (error) {
    return reply.status(500).send({ message: "An error occurred", error });
  }
};

export const loginCustomerEmail = async (req, reply) => {
  return reply.status(410).send({ message: "This endpoint is deprecated. Use /customer/login" });
};

// ==========================================
// NEW: Customer Google OAuth Login/Signup
// ==========================================

export const loginGoogleCustomer = async (req, reply) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return reply.status(400).send({ message: "Google ID token is required" });
    }

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if customer already exists with this Google ID
    let customer = await Customer.findOne({ googleId });

    if (!customer) {
      // Check if customer exists with this email (link accounts)
      customer = await Customer.findOne({ email });

      if (customer) {
        // Link Google ID to existing email account
        customer.googleId = googleId;
        if (!customer.name && name) customer.name = name;
        await customer.save();
      } else {
        // Create new customer account
        customer = new Customer({
          name,
          email,
          googleId,
          role: "Customer",
          isActivated: true,
        });
        await customer.save();
      }
    }

    const { accessToken, refreshToken } = generateTokens(customer);

    const customerObj = customer.toObject();
    delete customerObj.password;

    return reply.send({
      message: "Login Successful",
      accessToken,
      refreshToken,
      customer: customerObj,
    });
  } catch (error) {
    if (error.message?.includes("Token used too late") || error.message?.includes("Invalid token")) {
      return reply.status(401).send({ message: "Invalid or expired Google token" });
    }
    return reply.status(500).send({ message: "An error occurred", error });
  }
};

// ==========================================
// NEW: Shop Owner Signup
// ==========================================

export const signupShopOwner = async (req, reply) => {
  try {
    const { name, email, password, phone, shopName, shopAddress, branchId, otp } = req.body;

    const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      return reply.status(400).send({ message: "Valid 10-digit mobile number is required" });
    }

    // Verify OTP code
    const storedOtp = signupOtpStore.get(cleanPhone);
    if (!storedOtp || String(storedOtp.otp).trim() !== String(otp || "").trim()) {
      return reply.status(400).send({ message: "Invalid verification OTP code. Please enter the correct OTP sent to your phone." });
    }

    if (storedOtp.expires < Date.now()) {
      signupOtpStore.delete(cleanPhone);
      return reply.status(400).send({ message: "Verification OTP code has expired. Please request a new code." });
    }

    const existingPhone = await ShopOwner.findOne({ phone: Number(cleanPhone) });
    if (existingPhone) {
      return reply.status(409).send({ message: "Phone number already registered" });
    }

    if (email) {
      const existingOwner = await ShopOwner.findOne({ email: email.toLowerCase() });
      if (existingOwner) {
        return reply.status(409).send({ message: "Email already registered" });
      }
    }

    signupOtpStore.delete(cleanPhone);

    let targetBranch = null;
    if (branchId && mongoose.isValidObjectId(branchId)) {
      targetBranch = await Branch.findById(branchId);
    }
    if (!targetBranch) {
      targetBranch = await Branch.findOne();
    }

    const shopOwner = new ShopOwner({
      name,
      email: email ? email.toLowerCase() : undefined,
      password, // Password hashing happens automatically in the pre-save hook
      phone: Number(cleanPhone),
      shopName,
      shopAddress,
      role: "ShopOwner",
      branch: targetBranch ? targetBranch._id : undefined,
      isActivated: false,
    });

    await shopOwner.save();

    return reply.status(201).send({
      message: "Registration request submitted successfully! Sent to branch owner for approval.",
      shopOwner: {
        _id: shopOwner._id,
        name: shopOwner.name,
        role: shopOwner.role,
        isActivated: false,
      }
    });
  } catch (error) {
    return reply.status(500).send({ message: "An error occurred", error });
  }
};

// ==========================================
// NEW: Delivery Partner Signup
// ==========================================

export const signupDeliveryPartner = async (req, reply) => {
  try {
    const { name, email, password, phone, branchId, otp } = req.body;

    const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);
    if (cleanPhone.length !== 10) {
      return reply.status(400).send({ message: "Valid 10-digit mobile number is required" });
    }

    // Verify OTP code
    const storedOtp = signupOtpStore.get(cleanPhone);
    if (!storedOtp || String(storedOtp.otp).trim() !== String(otp || "").trim()) {
      return reply.status(400).send({ message: "Invalid verification OTP code. Please enter the correct OTP sent to your phone." });
    }

    if (storedOtp.expires < Date.now()) {
      signupOtpStore.delete(cleanPhone);
      return reply.status(400).send({ message: "Verification OTP code has expired. Please request a new code." });
    }

    const existingPhone = await DeliveryPartner.findOne({ phone: Number(cleanPhone) });
    if (existingPhone) {
      return reply.status(409).send({ message: "Phone number already registered" });
    }

    if (email) {
      const existingPartner = await DeliveryPartner.findOne({ email: email.toLowerCase() });
      if (existingPartner) {
        return reply.status(409).send({ message: "Email already registered" });
      }
    }

    signupOtpStore.delete(cleanPhone);

    let targetBranch = null;
    if (branchId && mongoose.isValidObjectId(branchId)) {
      targetBranch = await Branch.findById(branchId);
    }
    if (!targetBranch) {
      targetBranch = await Branch.findOne();
    }

    const deliveryPartner = new DeliveryPartner({
      name,
      email: email ? email.toLowerCase() : undefined,
      password, // Password hashing happens automatically in the pre-save hook
      phone: Number(cleanPhone),
      role: "DeliveryPartner",
      branch: targetBranch ? targetBranch._id : undefined,
      isActivated: false,
      isAvailable: true,
    });

    await deliveryPartner.save();

    if (targetBranch) {
      targetBranch.deliveryPartners = targetBranch.deliveryPartners || [];
      targetBranch.deliveryPartners.push(deliveryPartner._id);
      await targetBranch.save();
    }

    return reply.status(201).send({
      message: "Registration request submitted successfully! Sent to branch owner for approval.",
      deliveryPartner: {
        _id: deliveryPartner._id,
        name: deliveryPartner.name,
        role: deliveryPartner.role,
        isActivated: false,
      }
    });
  } catch (error) {
    return reply.status(500).send({ message: "An error occurred", error });
  }
};

// ==========================================
// NEW: Shop Owner Login (no registration)
// ==========================================

export const loginShopOwner = async (req, reply) => {
  try {
    const { phone, password } = req.body;
    if (!phone) {
      return reply.status(400).send({ message: "Mobile number is required" });
    }
    const query = { phone: Number(phone) };

    const shopOwner = await ShopOwner.findOne(query);
    if (!shopOwner) {
      return reply.status(404).send({ message: "Shop Owner not found" });
    }

    if (!shopOwner.isActivated) {
      return reply.status(403).send({ message: "Your registration request is pending admin approval." });
    }

    // Support both plain-text (legacy) and bcrypt passwords
    let isMatch = false;
    if (shopOwner.password && shopOwner.password.startsWith("$2")) {
      isMatch = await bcrypt.compare(password, shopOwner.password);
    } else {
      isMatch = password === shopOwner.password;
    }

    if (!isMatch) {
      return reply.status(400).send({ message: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = generateTokens(shopOwner);

    const shopOwnerObj = shopOwner.toObject();
    delete shopOwnerObj.password;

    return reply.send({
      message: "Login Successful",
      accessToken,
      refreshToken,
      shopOwner: shopOwnerObj,
    });
  } catch (error) {
    return reply.status(500).send({ message: "An error occurred", error });
  }
};

// ==========================================
// EXISTING: Delivery Partner Login (now with bcrypt)
// ==========================================

export const loginDeliveryPartner = async (req, reply) => {
  try {
    const { phone, password } = req.body;
    if (!phone) {
      return reply.status(400).send({ message: "Mobile number is required" });
    }
    const query = { phone: Number(phone) };

    const deliveryPartner = await DeliveryPartner.findOne(query);

    if (!deliveryPartner) {
      return reply.status(404).send({ message: "Delivery Partner not found" });
    }

    if (!deliveryPartner.isActivated) {
      return reply.status(403).send({ message: "Your registration request is pending admin approval." });
    }

    // Support both plain-text (legacy) and bcrypt passwords
    let isMatch = false;
    if (deliveryPartner.password.startsWith("$2")) {
      // bcrypt hash
      isMatch = await bcrypt.compare(password, deliveryPartner.password);
    } else {
      // Legacy plain-text comparison
      isMatch = password === deliveryPartner.password;
    }

    if (!isMatch) {
      return reply.status(400).send({ message: "Invalid Credentials" });
    }

    const { accessToken, refreshToken } = generateTokens(deliveryPartner);

    return reply.send({
      message: "Login Successful",
      accessToken,
      refreshToken,
      deliveryPartner,
    });
  } catch (error) {
    return reply.status(500).send({ message: "An error occurred", error });
  }
};

// ==========================================
// EXISTING: Refresh Token (extended for ShopOwner)
// ==========================================

export const refreshToken = async (req, reply) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return reply.status(401).send({ message: "Refresh token required" });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    let user;

    if (decoded.role === "Customer") {
      user = await Customer.findById(decoded.userId);
    } else if (decoded.role === "DeliveryPartner") {
      user = await DeliveryPartner.findById(decoded.userId);
    } else if (decoded.role === "ShopOwner") {
      user = await ShopOwner.findById(decoded.userId);
    } else {
      return reply.status(403).send({ message: "Invalid Role" });
    }

    if (!user) {
      return reply.status(403).send({ message: "User not found" });
    }

    const { accessToken, refreshToken: newRefreshToken } =
      generateTokens(user);

    return reply.send({
      message: "Token Refreshed",
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return reply.status(403).send({ message: "Invalid Refresh Token" });
  }
};

// ==========================================
// EXISTING: Fetch User (extended for ShopOwner)
// ==========================================

export const fetchUser = async (req, reply) => {
  try {
    const { userId, role } = req.user;
    let user;

    if (role === "Customer") {
      user = await Customer.findById(userId);
    } else if (role === "DeliveryPartner") {
      user = await DeliveryPartner.findById(userId);
    } else if (role === "ShopOwner") {
      user = await ShopOwner.findById(userId).populate("branch");
    } else if (role === "Admin") {
      user = await Admin.findById(userId);
    } else {
      return reply.status(403).send({ message: "Invalid Role" });
    }

    if (!user) {
      return reply.status(404).send({ message: "User not found" });
    }

    // Strip password from response
    const userObj = user.toObject();
    delete userObj.password;

    return reply.send({
      message: "User fetched successfully",
      user: userObj,
    });
  } catch (error) {
    return reply.status(500).send({ message: "An error occurred", error });
  }
};

// ==========================================
// ==========================================
// ==========================================
// Universal Forgot Password OTP request (Fast2SMS SMS Only)
// ==========================================
export const forgotPassword = async (req, reply) => {
  try {
    const { email, phone } = req.body;
    const searchVal = String(email || phone || "").trim();
    if (!searchVal) {
      return reply.status(400).send({ message: "Mobile number or Email is required" });
    }

    const isEmail = /^\S+@\S+\.\S+$/.test(searchVal);
    let query = {};
    if (isEmail) {
      query = { email: searchVal.toLowerCase() };
    } else {
      const digits = searchVal.replace(/\D/g, "").slice(-10);
      if (digits.length === 10) {
        query = { phone: Number(digits) };
      } else {
        query = { phone: Number(searchVal) || 0 };
      }
    }

    let user = await Customer.findOne(query);
    if (!user) {
      user = await ShopOwner.findOne(query);
      if (user && !user.isActivated) {
        return reply.status(403).send({ message: "Cannot reset password: Shop Owner account request is pending approval." });
      }
    }
    if (!user) {
      user = await DeliveryPartner.findOne(query);
      if (user && !user.isActivated) {
        return reply.status(403).send({ message: "Cannot reset password: Rider account request is pending approval." });
      }
    }
    if (!user) {
      user = await Admin.findOne(query);
    }

    if (!user) {
      // Return generic message for security
      return reply.send({
        message: "If an account with this information exists, you will receive a reset OTP via Fast2SMS SMS.",
      });
    }

    if (!user.phone) {
      return reply.status(400).send({ message: "This account does not have a registered mobile number to receive SMS OTP." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes valid
    await user.save();

    console.log(`\n==========================================`);
    console.log(`[Forgot Password] Fast2SMS SMS OTP for ${user.phone}: ${otp}`);
    console.log(`==========================================\n`);

    // Send SMS via Fast2SMS
    await sendOtpSMS(user.phone, otp).catch((e) =>
      console.error("[Forgot Password] Fast2SMS send error:", e.message)
    );

    return reply.send({
      message: "A password reset verification OTP code has been sent to your mobile number via Fast2SMS SMS.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return reply.status(500).send({ message: "An error occurred while processing forgot password", error });
  }
};


// ==========================================
// Universal Reset Password verification
// ==========================================
export const resetPassword = async (req, reply) => {
  try {
    const { email, phone, otp, newPassword } = req.body;
    const searchVal = String(email || phone || "").trim();
    if (!searchVal || !otp || !newPassword) {
      return reply.status(400).send({ message: "Mobile/Email, OTP, and new password are required" });
    }

    const isEmail = /^\S+@\S+\.\S+$/.test(searchVal);
    let query = {};
    if (isEmail) {
      query = { email: searchVal.toLowerCase() };
    } else {
      const digits = searchVal.replace(/\D/g, "").slice(-10);
      if (digits.length === 10) {
        query = { phone: Number(digits) };
      } else {
        query = { phone: Number(searchVal) || 0 };
      }
    }

    let user = await Customer.findOne(query) ||
               await ShopOwner.findOne(query) ||
               await DeliveryPartner.findOne(query) ||
               await Admin.findOne(query);

    if (!user) {
      return reply.status(404).send({ message: "No account found with this information" });
    }

    if (!user.resetPasswordOtp || String(user.resetPasswordOtp).trim() !== String(otp).trim()) {
      return reply.status(400).send({ message: "Invalid verification code" });
    }

    if (user.resetPasswordOtpExpires && user.resetPasswordOtpExpires < Date.now()) {
      return reply.status(400).send({ message: "Verification code has expired. Please request a new code." });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.plainPassword = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save();

    return reply.send({
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return reply.status(500).send({ message: "An error occurred while resetting password", error });
  }
};

/**
 * Log in or auto-register a customer using Google OAuth ID token.
 */
export const googleLogin = async (req, reply) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return reply.status(400).send({ message: "Google ID Token is required" });
    }

    const activeClientId = process.env.GOOGLE_CLIENT_ID || "1096015868047-imd9e2m46trkc0q1n1ueuqm33mbb7tga.apps.googleusercontent.com";
    const client = new OAuth2Client(activeClientId);

    const ticket = await client.verifyIdToken({
      idToken,
      audience: [
        activeClientId,
        "1096015868047-imd9e2m46trkc0q1n1ueuqm33mbb7tga.apps.googleusercontent.com",
        "768773895387-t43up2am200fapr272d44d0e14l7noh0.apps.googleusercontent.com"
      ],
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return reply.status(400).send({ message: "Invalid Google token payload" });
    }

    const { email, name, picture, sub: googleId } = payload;

    // Find customer by googleId or email
    let customer = await Customer.findOne({
      $or: [{ googleId }, { email }]
    });

    if (!customer) {
      // Auto-register new Customer profile
      customer = new Customer({
        name,
        email,
        googleId,
        profileImage: picture,
        isActivated: true,
        role: "Customer",
      });
      await customer.save();
    } else {
      // Update googleId & profile image if missing
      let updated = false;
      if (!customer.googleId) {
        customer.googleId = googleId;
        updated = true;
      }
      if (picture && !customer.profileImage) {
        customer.profileImage = picture;
        updated = true;
      }
      if (updated) {
        await customer.save();
      }
    }

    const { accessToken, refreshToken } = generateTokens(customer);

    return reply.send({
      message: "Google Login successful!",
      accessToken,
      refreshToken,
      user: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        role: customer.role,
        profileImage: customer.profileImage,
      },
    });
  } catch (error) {
    console.error("GOOGLE LOGIN ERROR:", error);
    return reply.status(400).send({ message: "Failed to authenticate with Google", error: error.message });
  }
};