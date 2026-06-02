import "dotenv/config";
import { connectDB } from "./src/config/connect.js";
import fastify from "fastify";
import { PORT } from "./src/config/config.js";
import fastifySocketId from "fastify-socket.io";
import { registerRoutes } from "./src/routes/index.js";
import { admin, buildAdminRouter } from "./src/config/setup.js";
import cors from "@fastify/cors";
import jwt from "jsonwebtoken";

const start = async () => {
  await connectDB(process.env.MONGO_URI);
  const app = fastify();

  // Register CORS
  app.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  // Register Socket.io
  app.register(fastifySocketId, {
    cors: {
      origin: "*",
    },
    pingInterval: 10000,
    pingTimeout: 5000,
    transports: ["websocket", "polling"],
  });

  await registerRoutes(app);

  // Encapsulate AdminJS and session middleware so they do not globally interfere with API endpoints
  await app.register(async (adminContext) => {
    await buildAdminRouter(adminContext);
  });

  app.listen({ port: PORT, host: "0.0.0.0" }, (err, addr) => {
    if (err) {
      console.log(err);
    } else {
      console.log(
        `Shifa Store running on http://localhost:${PORT}${admin.options.rootPath}`
      );
    }
  });

  app.ready().then(() => {
    app.io.on("connection", (socket) => {
      console.log("A user Connected ✅");

      // Join an order-specific room for real-time tracking
      socket.on("joinRoom", (orderId) => {
        socket.join(orderId);
        console.log(`🟢 User joined room ${orderId}`);
      });

      // Join a user-specific room for personal notifications
      socket.on("joinUserRoom", (userId) => {
        socket.join(`user-${userId}`);
        console.log(`🔔 User joined notification room user-${userId}`);
      });

      // Handle delivery partner location updates
      socket.on("location-update", (data) => {
        const { orderId, latitude, longitude } = data;
        if (orderId) {
          socket.to(orderId).emit("location-updated", {
            orderId,
            deliveryPersonLocation: { latitude, longitude },
          });
        }
      });

      socket.on("disconnect", () => {
        console.log("User Disconnected ❌");
      });
    });
  });
};

start();
