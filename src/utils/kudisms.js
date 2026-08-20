import logger from "#config/logger.js";
import axios from "axios";

const KUDISMS_API_KEY = process.env.KUDISMS_API_KEY;
const KUDISMS_SENDER_ID = process.env.KUDISMS_SENDER_ID || "vendorville";

const kudisms = axios.create({
  baseURL: "https://my.kudisms.net/api",
});

export const kudismsApi = {
  sendSms: async (to, message) => {
    try {
      const { data } = await kudisms.get("/corporate", {
        params: {
          token: KUDISMS_API_KEY,
          senderID: KUDISMS_SENDER_ID,
          recipient: to,
          message,
          gateway: "2",
        },
      });

      if (data?.status !== "OK" && data?.status !== "success") {
        logger.warn("Kudisms SMS non-success response", data);
      }

      return data;
    } catch (error) {
      logger.error("Kudisms SMS error", error.response?.data || error.message);
      throw new Error("Failed to send SMS");
    }
  },

  sendWhatsApp: async (to, message) => {
    logger.info(
      "WhatsApp channel not supported by Kudisms sending as SMS instead",
    );
    return kudismsApi.sendSms(to, message);
  },
};
