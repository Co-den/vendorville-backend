import logger from "#config/logger.js";
import axios from "axios";

const KUDISMS_TOKEN = process.env.KUDISMS_API_TOKEN;
const KUDISMS_SENDER_ID = process.env.KUDISMS_SENDER_ID || "VendorVille";

const kudisms = axios.create({
  baseURL: "https://my.kudisms.net/api",
});

export const kudismsApi = {
  sendSms: async (
    to,
    message,
    name = "Customer",
    senderID = KUDISMS_SENDER_ID,
  ) => {
    try {
      const normalizedPhone = to.replace(/^0/, "234").replace(/\D/g, "");

      const { data } = await kudisms.post("/personalisedsms", {
        token: KUDISMS_TOKEN,
        senderID,
        message,
        csvHeaders: ["phone_number", "name"],
        recipients: [
          {
            phone_number: normalizedPhone,
            name,
          },
        ],
      });

      if (data?.status !== "success") {
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
      "WhatsApp channel not supported by Kudisms, sending as SMS instead",
    );

    return kudismsApi.sendSms(to, message);
  },
};
