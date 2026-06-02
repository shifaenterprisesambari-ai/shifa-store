import { Customer, DeliveryPartner, ShopOwner } from "../../models/user.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";

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
// EXISTING: Customer Phone Login (preserved)
// ==========================================

export const loginCustomer = async (req, reply) => {
  try {
    const { phone } = req.body;
    let customer = await Customer.findOne({ phone });

    if (!customer) {
      customer = new Customer({
        phone,
        role: "Customer",
        isActivated: true,
      });
      await customer.save();
    }

    const { accessToken, refreshToken } = generateTokens(customer);

    return reply.send({
      message: "Login Successful",
      accessToken,
      refreshToken,
      customer,
    });
  } catch (error) {
    return reply.status(500).send({ message: "An error occurred", error });
  }
};

// ==========================================
// NEW: Customer Email Signup
// ==========================================

export const signupCustomerEmail = async (req, reply) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if email already exists
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return reply.status(409).send({ message: "Email already registered" });
    }

    // Check if phone already exists (if provided)
    if (phone) {
      const existingPhone = await Customer.findOne({ phone });
      if (existingPhone) {
        return reply
          .status(409)
          .send({ message: "Phone number already registered" });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const customer = new Customer({
      name,
      email,
      password: hashedPassword,
      phone: phone || undefined,
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

// ==========================================
// NEW: Customer Email Login
// ==========================================

export const loginCustomerEmail = async (req, reply) => {
  try {
    const { email, password } = req.body;

    const customer = await Customer.findOne({ email });
    if (!customer) {
      return reply.status(404).send({ message: "Customer not found" });
    }

    if (!customer.password) {
      return reply.status(400).send({
        message:
          "This account uses Google login. Please sign in with Google.",
      });
    }

    // Support both plain-text (legacy) and bcrypt passwords
    let isMatch = false;
    if (customer.password.startsWith("$2")) {
      isMatch = await bcrypt.compare(password, customer.password);
    } else {
      isMatch = password === customer.password;
    }

    if (!isMatch) {
      return reply.status(400).send({ message: "Invalid credentials" });
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
    return reply.status(500).send({ message: "An error occurred", error });
  }
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
// NEW: Shop Owner Login (no registration)
// ==========================================

export const loginShopOwner = async (req, reply) => {
  try {
    const { email, password } = req.body;

    const shopOwner = await ShopOwner.findOne({ email });
    if (!shopOwner) {
      return reply.status(404).send({ message: "Shop Owner not found" });
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
    const { email, password } = req.body;
    const deliveryPartner = await DeliveryPartner.findOne({ email });

    if (!deliveryPartner) {
      return reply.status(404).send({ message: "Delivery Partner not found" });
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