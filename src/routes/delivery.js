import { verifyToken } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import {
  getAssignedOrders,
  acceptDelivery,
  cancelDelivery,
  pickupOrder,
  startDelivery,
  completeDelivery,
  updateLocation,
} from "../controllers/delivery/delivery.js";

export const deliveryRoutes = async (fastify, options) => {
  // All routes require authentication + DeliveryPartner role
  fastify.addHook("preHandler", async (request, reply) => {
    const isAuthenticated = await verifyToken(request, reply);
    if (!isAuthenticated) {
      return reply.code(401).send({ message: "Unauthorized" });
    }
    await authorize("DeliveryPartner")(request, reply);
  });

  // Order management
  fastify.get("/delivery/orders", getAssignedOrders);
  fastify.patch("/delivery/orders/:orderId/accept", acceptDelivery);
  fastify.patch("/delivery/orders/:orderId/cancel", cancelDelivery);
  fastify.patch("/delivery/orders/:orderId/pickup", pickupOrder);
  fastify.patch("/delivery/orders/:orderId/start", startDelivery);
  fastify.patch("/delivery/orders/:orderId/complete", completeDelivery);

  // Live location
  fastify.patch("/delivery/location", updateLocation);
};

