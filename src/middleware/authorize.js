/**
 * Role-based authorization middleware.
 * Must be used AFTER verifyToken middleware (expects req.user to be set).
 *
 * @param  {...string} roles - Allowed roles (e.g., "Customer", "ShopOwner", "DeliveryPartner")
 * @returns {Function} Fastify preHandler middleware
 *
 * @example
 * fastify.get("/shop/dashboard", {
 *   preHandler: [verifyToken, authorize("ShopOwner")]
 * }, getDashboardStats);
 */
export const authorize = (...roles) => {
  return async (req, reply) => {
    if (!req.user) {
      return reply.status(401).send({ message: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return reply
        .status(403)
        .send({ message: "Forbidden: Insufficient permissions" });
    }
  };
};
