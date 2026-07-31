import "dotenv/config";
import { connectDB } from "./src/config/connect.js";
import fastify from "fastify";
import { PORT } from "./src/config/config.js";
import fastifySocketId from "fastify-socket.io";
import { registerRoutes } from "./src/routes/index.js";
import { admin, buildAdminRouter } from "./src/config/setup.js";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import jwt from "jsonwebtoken";

const start = async () => {
  await connectDB(process.env.MONGO_URI);
  const app = fastify({ trustProxy: true });

  // Rate Limiting Protection (Prevents Brute-Force & DDoS)
  await app.register(rateLimit, {
    max: 150, // max 150 requests per minute per IP
    timeWindow: '1 minute',
    errorResponseBuilder: (req, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Too many requests. Please wait a minute before trying again.`,
    }),
  });

  // Dynamic Origin Whitelist for CORS
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    process.env.FRONTEND_URL,
    "https://shifa-store.vercel.app",
    "https://shifastore.online",
    "https://www.shifastore.online",
  ].filter(Boolean);

  const corsOrigin = (origin, cb) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.endsWith(".vercel.app") ||
      origin.endsWith(".onrender.com") ||
      process.env.NODE_ENV !== "production"
    ) {
      cb(null, true);
    } else {
      cb(new Error("CORS Policy: Origin Not Allowed"), false);
    }
  };

  // Register CORS
  app.register(cors, {
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });

  // Register Socket.io
  app.register(fastifySocketId, {
    cors: {
      origin: corsOrigin,
      credentials: true,
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

