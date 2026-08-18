import { jwtSign } from "#utils/jwt.js";
import { Server } from "socket.io";

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:3000",
        "https://vendorville.vercel.app",
        /\.vercel\.app$/,
      ],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      socket.user = null; // anonymous — only allowed to join public tracking rooms
      return next();
    }
    try {
      socket.user = jwtSign.verify(token);
      next();
    } catch {
      socket.user = null;
      next();
    }
  });

  io.on("connection", (socket) => {
    if (socket.user) {
      const room =
        socket.user.type === "admin" ? "admins" : `vendor_${socket.user.id}`;
      socket.join(room);
    }

    socket.on("join_thread", (threadId) => {
      if (!socket.user) return; // chat requires auth
      socket.join(`thread_${threadId}`);
    });

    // Public — anyone can join an order tracking room (order ID acts as the "secret" alongside phone verification already done via REST)
    socket.on("join_order_tracking", (orderId) => {
      socket.join(`order_${orderId}`);
    });

    // Rider location pushes — no auth required, gated by trackingToken validated via REST before this
    socket.on("rider_location_update", ({ orderId, lat, lng }) => {
      socket
        .to(`order_${orderId}`)
        .emit("rider_location", { lat, lng, updatedAt: new Date() });
    });

    socket.on("disconnect", () => {});
  });

  return io;
};

export const getIo = () => io;
