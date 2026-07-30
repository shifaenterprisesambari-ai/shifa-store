import { verifyToken } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { getAdminStats, getConfig, updateConfig, updateBranchCommission, getPendingRequests, approveRequest, rejectRequest, calculateProfit, calculateRiderPayout } from "../controllers/admin/dashboard.js";

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
  fastify.get("/admin/config", getConfig);
  fastify.put("/admin/config", updateConfig);
  fastify.put("/admin/branch-commission", updateBranchCommission);
  fastify.get("/admin/calculate-profit", calculateProfit);
  fastify.get("/admin/calculate-rider-payout", calculateRiderPayout);
  fastify.get("/admin/pending-requests", getPendingRequests);
  fastify.post("/admin/approve-request", approveRequest);
  fastify.post("/admin/reject-request", rejectRequest);
};

