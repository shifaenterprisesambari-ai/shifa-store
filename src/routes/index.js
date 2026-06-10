import { authRoutes } from "./auth.js";
import { orderRoutes } from "./order.js";
import { categoryRoutes, productRoutes } from "./products.js";
import { shopOwnerRoutes } from "./shopOwner.js";
import { deliveryRoutes } from "./delivery.js";
import { notificationRoutes } from "./notification.js";
import { adminRoutes } from "./admin.js";

const prefix = "/api";

export const registerRoutes = async (fastify) => {
  fastify.register(authRoutes, { prefix: prefix });
  fastify.register(productRoutes, { prefix: prefix });
  fastify.register(categoryRoutes, { prefix: prefix });
  fastify.register(orderRoutes, { prefix: prefix });
  fastify.register(shopOwnerRoutes, { prefix: prefix });
  fastify.register(deliveryRoutes, { prefix: prefix });
  fastify.register(notificationRoutes, { prefix: prefix });
  fastify.register(adminRoutes, { prefix: prefix });
};
