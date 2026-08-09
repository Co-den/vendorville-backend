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
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = jwtSign.verify(token);
      socket.user = decoded;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const room =
      socket.user.type === "admin" ? "admins" : `vendor_${socket.user.id}`;
    socket.join(room);

    socket.on("join_thread", (threadId) => {
      socket.join(`thread_${threadId}`);
    });

    socket.on("disconnect", () => {});
  });

  return io;
};

export const getIo = () => io;
