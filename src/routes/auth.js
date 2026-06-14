import {
    fetchUser,
    loginCustomer,
    loginDeliveryPartner,
    refreshToken,
    signupCustomerEmail,
    loginCustomerEmail,
    loginGoogleCustomer,
    loginShopOwner,
    forgotPassword,
    resetPassword,
  } from "../controllers/auth/auth.js";
import { updateUser } from "../controllers/tracking/user.js";
import { verifyToken } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const signupSchema = {
  name: { required: true, type: "string", message: "Name is required" },
  email: {
    required: true,
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

const emailLoginSchema = {
  email: {
    required: true,
    type: "string",
    pattern: /^\S+@\S+\.\S+$/,
    message: "Valid email is required",
  },
  password: { required: true, type: "string", message: "Password is required" },
};

export const authRoutes = async (fastify, options) => {
    // Existing routes (preserved)
    fastify.post("/customer/login", loginCustomer);
    fastify.post("/delivery/login", loginDeliveryPartner);
    fastify.post("/refresh-token", refreshToken);
    fastify.get("/user", { preHandler: [verifyToken] }, fetchUser);
    fastify.patch("/user", { preHandler: [verifyToken] }, updateUser);

    // New customer auth routes
    fastify.post(
      "/customer/signup",
      { preHandler: [validate(signupSchema)] },
      signupCustomerEmail
    );
    fastify.post(
      "/customer/login/email",
      { preHandler: [validate(emailLoginSchema)] },
      loginCustomerEmail
    );
    fastify.post("/customer/login/google", loginGoogleCustomer);
    fastify.post("/customer/forgot-password", forgotPassword);
    fastify.post("/customer/reset-password", resetPassword);

    // New shop owner auth route
    fastify.post(
      "/shopowner/login",
      { preHandler: [validate(emailLoginSchema)] },
      loginShopOwner
    );
};