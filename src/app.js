import logger from "#config/logger.js";
import securityMiddleware from "#middlewares/security.js";
import authRoutes from "#routes/authRoutes.js";
import userRoutes from "#routes/userRoutes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

const app = express();

app.use(helmet());
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
       "https://vendorville.vercel.app/",
       "https://vendorville-backend.onrender.com/api/auth",
      ],
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
);

app.use(securityMiddleware);

app.get("/", (req, res) => {
  logger.info("hello from devops");
  res.status(200).send("Hello World! ITS WORKING");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get("/api", (req, res) => {
  res.status(200).json({ message: "DevOps API! is running" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.use("/nonexsistent", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

export default app;
