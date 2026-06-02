import { verifyToken } from "../middleware/auth.js";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notification/notification.js";

export const notificationRoutes = async (fastify, options) => {
  // All routes require authentication (any role)
  fastify.addHook("preHandler", async (request, reply) => {
    const isAuthenticated = await verifyToken(request, reply);
    if (!isAuthenticated) {
      return reply.code(401).send({ message: "Unauthorized" });
    }
  });

  fastify.get("/notifications", getNotifications);
  fastify.patch("/notifications/:id/read", markAsRead);
  fastify.patch("/notifications/read-all", markAllAsRead);
};
