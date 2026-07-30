import { getWishlist, toggleWishlistItem, syncWishlist } from "../controllers/customer/wishlist.js";
import { verifyToken } from "../middleware/auth.js";

export const customerRoutes = async (fastify, options) => {
  fastify.addHook("preHandler", async (request, reply) => {
    const isAuthenticated = await verifyToken(request, reply);
    if (!isAuthenticated) {
      return reply.code(401).send({ message: "Unauthorized" });
    }
  });

  fastify.get("/customer/wishlist", getWishlist);
  fastify.post("/customer/wishlist/toggle", toggleWishlistItem);
  fastify.post("/customer/wishlist/sync", syncWishlist);
};
