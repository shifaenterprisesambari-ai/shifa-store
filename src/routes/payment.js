import { createRazorpayOrder, verifyRazorpayPayment } from "../controllers/payment/payment.js";
import jwt from "jsonwebtoken";

export const paymentRoutes = async (fastify, options) => {
  fastify.addHook("preHandler", async (request, reply) => {
    try {
      const authHeader = request.headers["authorization"];
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.status(401).send({ message: "Access token required" });
      }
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      request.user = decoded;
    } catch (error) {
      return reply.status(401).send({ message: "Unauthorized or invalid token" });
    }
  });

  fastify.post("/create-order", createRazorpayOrder);
  fastify.post("/verify-payment", verifyRazorpayPayment);
};
