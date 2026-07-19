import logger from "#config/logger.js";
import axios from "axios";

const TERMII_API_KEY = process.env.TERMII_API_KEY;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || "VendorVille";

const termii = axios.create({
  baseURL: "https://api.ng.termii.com/api",
});

export const termiiApi = {
  sendSms: async (to, message) => {
    try {
      const { data } = await termii.post("/sms/send", {
        to,
        from: TERMII_SENDER_ID,
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: TERMII_API_KEY,
      });
      return data;
    } catch (error) {
      logger.error("Termii SMS error", error.response?.data || error.message);
      throw new Error("Failed to send SMS");
    }
  },

  sendWhatsApp: async (to, message) => {
    try {
      const { data } = await termii.post("/sms/send", {
        to,
        from: TERMII_SENDER_ID,
        sms: message,
        type: "plain",
        channel: "whatsapp",
        api_key: TERMII_API_KEY,
      });
      return data;
    } catch (error) {
      logger.error(
        "Termii WhatsApp error",
        error.response?.data || error.message,
      );
      throw new Error("Failed to send WhatsApp message");
    }
  },
};
