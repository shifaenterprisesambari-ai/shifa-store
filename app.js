// import "dotenv/config";
// import fastify from "fastify";
// import { Server } from "socket.io";

// import { connectDB } from "./src/config/connect.js";
// import { PORT } from "./src/config/config.js";
// import { registerRoutes } from "./src/routes/index.js";
// import { admin, buildAdminRouter } from "./src/config/setup.js";

// const start = async () => {
//   await connectDB(process.env.MONGO_URI);

//   const app = fastify({
//     logger: true,
//   });

//   // ✅ Create Socket.IO server (Fastify v5 compatible)
//   const io = new Server(app.server, {
//     cors: {
//       origin: "*",
//     },
//     pingInterval: 10000,
//     pingTimeout: 5000,
//     transports: ["websocket"],
//   });

//   // ✅ Make io accessible everywhere
//   app.decorate("io", io);

//   // 🔌 Socket events
//   io.on("connection", (socket) => {
//     console.log("A user connected ✅", socket.id);

//     socket.on("joinRoom", (orderId) => {
//       socket.join(orderId);
//       console.log(`🔴 User joined room ${orderId}`);
//     });

//     socket.on("disconnect", () => {
//       console.log("User disconnected ❌", socket.id);
//     });
//   });

//   // Routes & Admin
//   await registerRoutes(app);
//   await buildAdminRouter(app);

//   // Start server
//   await app.listen({ port: PORT, host: "0.0.0.0" });

//   console.log(
//     `🚀 Shifa Store running on http://localhost:${PORT}${admin.options.rootPath}`
//   );
// };

// start();

// import "dotenv/config";
// import fastify from "fastify";
// import session from "@fastify/session";
// import { Server } from "socket.io";

// import { connectDB } from "./src/config/connect.js";
// import { PORT, COOKIE_PASSWORD } from "./src/config/config.js";
// import { registerRoutes } from "./src/routes/index.js";
// import { admin, buildAdminRouter } from "./src/config/setup.js";

// const start = async () => {
//   await connectDB(process.env.MONGO_URI);

//   const app = fastify({ logger: true });

//   // ✅ Register session ONLY (AdminJS will handle cookies)
//   await app.register(session, {
//     secret: COOKIE_PASSWORD,
//     cookie: {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "lax",
//     },
//     saveUninitialized: false,
//   });

//   // ✅ AdminJS
//   await buildAdminRouter(app);

//   // ✅ Socket.IO
//   const io = new Server(app.server, {
//     cors: { origin: "*" },
//     transports: ["websocket"],
//   });

//   app.decorate("io", io);

//   io.on("connection", (socket) => {
//     console.log("🔵 Socket connected:", socket.id);
//   });

//   // ✅ Routes
//   await registerRoutes(app);

//   await app.listen({ port: PORT, host: "0.0.0.0" });

//   console.log(
//     `✅ Server running at http://localhost:${PORT}${admin.options.rootPath}`
//   );
// };

// start();

import "dotenv/config";
import fastify from "fastify";
import { Server } from "socket.io";

import { connectDB } from "./src/config/connect.js";
import { PORT } from "./src/config/config.js";
import { registerRoutes } from "./src/routes/index.js";
import { admin, buildAdminRouter } from "./src/config/setup.js";

const start = async () => {
  await connectDB(process.env.MONGO_URI);

  const app = fastify({ logger: true });

  // ✅ AdminJS (handles cookies internally)
  await buildAdminRouter(app);

  // ✅ Socket.IO
  const io = new Server(app.server, {
    cors: { origin: "*" },
    transports: ["websocket"],
  });

  app.decorate("io", io);

  io.on("connection", (socket) => {
    console.log("🔵 Socket connected:", socket.id);
  });

  // ✅ Routes
  await registerRoutes(app);

  await app.listen({ port: PORT, host: "0.0.0.0" });

  console.log(
    `✅ Server running at http://localhost:${PORT}${admin.options.rootPath}`
  );
};

start();
