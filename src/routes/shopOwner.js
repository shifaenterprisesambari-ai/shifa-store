import { verifyToken } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import {
  getShopProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  toggleProduct,
} from "../controllers/shopOwner/product.js";
import {
  getShopOrders,
  acceptOrder,
  rejectOrder,
} from "../controllers/shopOwner/order.js";
import { getDashboardStats, updateShopSettings } from "../controllers/shopOwner/dashboard.js";

export const shopOwnerRoutes = async (fastify, options) => {
  // All routes require authentication + ShopOwner role
  fastify.addHook("preHandler", async (request, reply) => {
    const isAuthenticated = await verifyToken(request, reply);
    if (!isAuthenticated) {
      return reply.code(401).send({ message: "Unauthorized" });
    }
    await authorize("ShopOwner")(request, reply);
  });

  // Dashboard & Settings
  fastify.get("/shop/dashboard", getDashboardStats);
  fastify.put("/shop/settings", updateShopSettings);

  // Product management
  fastify.get("/shop/products", getShopProducts);
  fastify.post("/shop/products", addProduct);
  fastify.put("/shop/products/:productId", updateProduct);
  fastify.delete("/shop/products/:productId", deleteProduct);
  fastify.patch("/shop/products/:productId/toggle", toggleProduct);

  // Order management
  fastify.get("/shop/orders", getShopOrders);
  fastify.patch("/shop/orders/:orderId/accept", acceptOrder);
  fastify.patch("/shop/orders/:orderId/reject", rejectOrder);
};
