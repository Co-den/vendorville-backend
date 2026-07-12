import logger from "#config/logger.js";
import securityMiddleware from "#middlewares/security.js";
import authRoutes from "#routes/authRoutes.js";
import businessRoutes from "#routes/businessRoutes.js";
import orderRoutes from "#routes/orderRoutes.js";
import productRoutes from "#routes/productRoutes.js";
import userRoutes from "#routes/userRoutes.js";
import walletRoutes from "#routes/walletRoutes.js";
import webhookRoutes from "#routes/webhookRoutes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

const app = express();
app.use(
  "/api/webhooks",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    req.rawBody = req.body;
    req.body = JSON.parse(req.body.toString());
    next();
  },
  webhookRoutes,
);
// then later, your normal:
app.use(express.json());

app.use(helmet());
app.use(express.json());
const allowedOrigins = [
  "http://localhost:3000",
  "https://vendorville.vercel.app",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }

      callback(new Error("Not allowed by CORS"));
    },
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
app.use("/api/wallet", walletRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/businesses/:businessId/products", productRoutes);
app.use("/api/businesses/:businessId/orders", orderRoutes);

app.use("/nonexsistent", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

export default app;
