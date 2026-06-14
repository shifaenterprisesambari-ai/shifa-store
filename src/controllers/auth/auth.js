import { Customer, DeliveryPartner, ShopOwner } from "../../models/user.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);


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

// ==========================================
// NEW: Customer Forgot Password OTP request
// ==========================================
export const forgotPassword = async (req, reply) => {
  try {
    const { email } = req.body;
    if (!email) {
      return reply.status(400).send({ message: "Email is required" });
    }

    const customer = await Customer.findOne({ email });
    if (!customer) {
      // Return a generic message for security (don't reveal if email exists)
      return reply.send({
        message: "If an account with this email exists, you will receive a reset OTP.",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    customer.resetPasswordOtp = otp;
    customer.resetPasswordOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes from now
    await customer.save();

    // Always log to console for debugging
    console.log(`\n==========================================`);
    console.log(`[Forgot Password] OTP for ${email}: ${otp}`);
    console.log(`==========================================\n`);

    // Send email via Resend
    // ⚠️  FREE TIER NOTE: Without a verified domain, Resend only allows sending
    //     to the email you registered with (set RESEND_TEST_TO_EMAIL in .env).
    //     To send to ANY email: verify your domain at https://resend.com/domains
    //     then set RESEND_FROM_EMAIL=noreply@yourdomain.com and remove RESEND_TEST_TO_EMAIL.
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const toEmail = process.env.RESEND_TEST_TO_EMAIL || email; // Override recipient for testing
    const { error: emailError } = await resend.emails.send({
      from: `Shifa Store <${fromEmail}>`,
      to: toEmail,
      subject: "Your Shifa Store Password Reset OTP",
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #FF7A00 0%, #FFC400 100%); padding: 36px 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">🛒 Shifa Store</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Fresh groceries at your doorstep</p>
          </div>

          <!-- Body -->
          <div style="padding: 40px 32px;">
            <h2 style="color: #1A1A1A; margin: 0 0 12px; font-size: 22px; font-weight: 700;">Password Reset Request</h2>
            <p style="color: #6B7280; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
              Hi ${customer.name || "there"},<br/><br/>
              We received a request to reset your password. Use the verification code below. It expires in <strong>10 minutes</strong>.
            </p>

            <!-- OTP Box -->
            <div style="background: #FFF7ED; border: 2px solid #FF7A00; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
              <p style="color: #6B7280; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your OTP Code</p>
              <p style="color: #FF7A00; font-size: 42px; font-weight: 800; letter-spacing: 10px; margin: 0; font-family: 'Courier New', monospace;">${otp}</p>
            </div>

            <p style="color: #9CA3AF; font-size: 13px; line-height: 1.6; margin: 0;">
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #F8F9FA; padding: 20px 32px; text-align: center; border-top: 1px solid #E5E7EB;">
            <p style="color: #9CA3AF; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Shifa Store. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    if (emailError) {
      console.error("[Resend] Email send error:", emailError);
      // Graceful fallback — OTP is always in console logs
      return reply.send({
        message: "Reset OTP generated. Check server console if email did not arrive.",
      });
    }

    return reply.send({
      message: "A verification OTP has been sent to your email address. Please check your inbox.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return reply.status(500).send({ message: "An error occurred", error });
  }
};


// ==========================================
// NEW: Customer Reset Password verification
// ==========================================
export const resetPassword = async (req, reply) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return reply.status(400).send({ message: "All fields are required" });
    }

    const customer = await Customer.findOne({ email });
    if (!customer) {
      return reply.status(404).send({ message: "No customer account found with this email" });
    }

    if (!customer.resetPasswordOtp || customer.resetPasswordOtp !== otp) {
      return reply.status(400).send({ message: "Invalid verification code" });
    }

    if (customer.resetPasswordOtpExpires < Date.now()) {
      return reply.status(400).send({ message: "Verification code has expired" });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    customer.password = hashedPassword;
    customer.plainPassword = newPassword;
    customer.resetPasswordOtp = undefined;
    customer.resetPasswordOtpExpires = undefined;
    await customer.save();

    return reply.send({
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return reply.status(500).send({ message: "An error occurred", error });
  }
};