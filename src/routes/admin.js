import { verifyToken } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { getAdminStats } from "../controllers/admin/dashboard.js";

export const adminRoutes = async (fastify, options) => {
  // All admin routes require authentication + Admin role
  fastify.addHook("preHandler", async (request, reply) => {
    const isAuthenticated = await verifyToken(request, reply);
    if (!isAuthenticated) {
      return reply.code(401).send({ message: "Unauthorized" });
    }
    await authorize("Admin")(request, reply);
  });

  fastify.get("/admin/stats", getAdminStats);
};
