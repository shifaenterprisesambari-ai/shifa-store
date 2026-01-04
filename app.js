// import "dotenv/config";
// import { connectDB } from "./src/config/connect.js";
// import fastify from "fastify";
// import { PORT } from "./src/config/config.js";
// import fastifySocketId from "fastify-socket.io";
// import { registerRoutes } from "./src/routes/index.js";
// import { admin, buildAdminRouter } from "./src/config/setup.js";

// const start = async () => {
//   await connectDB(process.env.MONGO_URI);
//   const app = fastify();

//   app.register(fastifySocketId, {
//     cors: {
//       origin: "*",
//     },
//     pingIntervel: 10000,
//     pingTimeout: 5000,
//     transports: ["Websocket"],
//   });

//   await registerRoutes(app);

//   await buildAdminRouter(app);

//   app.listen({ port: PORT, host: "0.0.0.0" }, (err, addr) => {
//     if (err) {
//       console.log(err);
//     } else {
//       console.log(
//         `Shifa Store running on http://localhost:${PORT}${admin.options.rootPath}`
//       );
//     }
//   });

//   app.ready().then(() => {
//     app.io.on("connection", (socket) => {
//       console.log("A user Connected ✅");

//       socket.on("jionRoom", (orderId) => {
//         socket.join(orderId);
//         console.log(`🔴 User Joined romm ${orderId}`);
//       });

//       socket.on("disconnect", () => {
//         console.log("User Disconnected ❌");
//       });
//     });
//   });
// };

// start();

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
// import cookie from "@fastify/cookie";
// import session from "@fastify/session";
// import { Server } from "socket.io";

// import { connectDB } from "./src/config/connect.js";
// import { PORT } from "./src/config/config.js";
// import { registerRoutes } from "./src/routes/index.js";
// import { admin, buildAdminRouter } from "./src/config/setup.js";

// const start = async () => {
//   await connectDB(process.env.MONGO_URI);

//   const app = fastify({ logger: true });

//   // ✅ Cookies FIRST
//   await app.register(cookie);

//   // ✅ Session SECOND
//   await app.register(session, {
//     secret: process.env.SESSION_SECRET,
//     cookie: { secure: false },
//     saveUninitialized: false,
//   });

//   // ✅ AdminJS THIRD
//   await buildAdminRouter(app);

//   // ✅ Socket.IO AFTER AdminJS
//   const io = new Server(app.server, {
//     cors: { origin: "*" },
//     transports: ["websocket"],
//   });

//   app.decorate("io", io);

//   io.on("connection", (socket) => {
//     console.log("Socket connected:", socket.id);
//   });

//   // ✅ Routes LAST
//   await registerRoutes(app);

//   await app.listen({ port: PORT, host: "0.0.0.0" });

//   console.log(
//     `🚀 Admin running on http://localhost:${PORT}${admin.options.rootPath}`
//   );
// };

// start();

import "dotenv/config";
import fastify from "fastify";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import { Server } from "socket.io";

import { connectDB } from "./src/config/connect.js";
import { PORT, COOKIE_PASSWORD } from "./src/config/config.js";
import { registerRoutes } from "./src/routes/index.js";
import { admin, buildAdminRouter } from "./src/config/setup.js";

const start = async () => {
  // 🔌 DB
  await connectDB(process.env.MONGO_URI);

  const app = fastify({
    logger: true,
  });

  // 🍪 Cookies (REQUIRED for AdminJS)
  await app.register(cookie);

  // 🧠 Session (Fastify-native ONLY)
  await app.register(session, {
    secret: COOKIE_PASSWORD,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
    saveUninitialized: false,
  });

  // 🛡️ AdminJS (AFTER cookie + session)
  await buildAdminRouter(app);

  // 🔌 Socket.IO (Fastify v5 compatible)
  const io = new Server(app.server, {
    cors: {
      origin: "*",
    },
    pingInterval: 10000,
    pingTimeout: 5000,
    transports: ["websocket"],
  });

  app.decorate("io", io);

  io.on("connection", (socket) => {
    console.log("🔵 Socket connected:", socket.id);

    socket.on("joinRoom", (orderId) => {
      socket.join(orderId);
      console.log(`🟢 Joined room ${orderId}`);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);
    });
  });

  // 🚏 API Routes
  await registerRoutes(app);

  // 🚀 Start server
  await app.listen({ port: PORT, host: "0.0.0.0" });

  console.log(
    `✅ Server running at http://localhost:${PORT}${admin.options.rootPath}`
  );
};

start();
