import {
    fetchUser,
    loginCustomer,
    loginDeliveryPartner,
    refreshToken,
    signupCustomerEmail,
    loginCustomerEmail,
    loginGoogleCustomer,
    loginShopOwner,
    signupShopOwner,
    signupDeliveryPartner,
    forgotPassword,
    resetPassword,
    googleLogin,
    sendSignupOtp,
  } from "../controllers/auth/auth.js";
import { updateUser } from "../controllers/tracking/user.js";
import { verifyToken } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const signupSchema = {
  name: { required: true, type: "string", message: "Name is required" },
  phone: {
    required: true,
    type: "string",
    pattern: /^\+?\d{10,15}$/,
    message: "Valid phone number is required (10-15 digits)",
  },
  email: {
    required: false,
    type: "string",
    pattern: /^\S+@\S+\.\S+$/,
    message: "Valid email is required",
  },
  password: {
    required: true,
    type: "string",
    minLength: 6,
    message: "Password must be at least 6 characters",
  },
};

const loginSchema = {
  phone: {
    required: true,
    type: "string",
    pattern: /^(\+?\d{10,15}|\S+@\S+\.\S+)$/,
    message: "Valid phone number or email is required",
  },
  password: { required: true, type: "string", message: "Password is required" },
};

export const authRoutes = async (fastify, options) => {
    // Existing routes (preserved)
    fastify.post(
      "/customer/login",
      { preHandler: [validate(loginSchema)] },
      loginCustomer
    );
    fastify.post(
      "/delivery/login",
      { preHandler: [validate(loginSchema)] },
      loginDeliveryPartner
    );
    fastify.post("/refresh-token", refreshToken);
    fastify.get("/user", { preHandler: [verifyToken] }, fetchUser);
    fastify.patch("/user", { preHandler: [verifyToken] }, updateUser);

    // New customer auth routes
    fastify.post("/customer/send-signup-otp", sendSignupOtp);
    fastify.post(
      "/customer/signup",
      { preHandler: [validate(signupSchema)] },
      signupCustomerEmail
    );
    fastify.post("/customer/google-login", googleLogin);
    fastify.post("/customer/login/google", googleLogin);
    fastify.post("/customer/forgot-password", forgotPassword);
    fastify.post("/customer/reset-password", resetPassword);

    // New shop owner auth route
    fastify.post(
      "/shopowner/login",
      { preHandler: [validate(loginSchema)] },
      loginShopOwner
    );
    fastify.post(
      "/shopowner/signup",
      { preHandler: [validate(signupSchema)] },
      signupShopOwner
    );

    // New delivery partner signup route
    fastify.post(
      "/delivery/signup",
      { preHandler: [validate(signupSchema)] },
      signupDeliveryPartner
    );
};