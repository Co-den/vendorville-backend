import logger from "#config/logger.js";
import { initSocket } from "#config/socket.js";
import http from "http";
import { startTrialExpirationJob } from "#jobs/trial-expiration.js";
import app from "./app.js";

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Listening on http://localhost:${PORT}`);

  try {
    startTrialExpirationJob();
    logger.info("✓ Cron jobs initialized successfully");
  } catch (error) {
    logger.error("✗ Failed to initialize cron jobs:", error);
  }
});