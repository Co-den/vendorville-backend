import logger from "#config/logger.js";
import { creditWalletFromWebhook } from "#services/walletService.js";
import crypto from "crypto";

export const paystackWebhook = async (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(req.rawBody) // requires raw body — see app.js note below
    .digest("hex");

  if (hash !== signature) {
    logger.warn("Paystack webhook signature mismatch");
    return res.status(401).send("Invalid signature");
  }

  const event = req.body;

  if (
    event.event === "charge.success" &&
    event.data.channel === "dedicated_nuban"
  ) {
    try {
      await creditWalletFromWebhook({
        dvaAccountNumber: event.data.authorization.receiver_bank_account_number,
        amountKobo: event.data.amount,
        reference: event.data.reference,
        description: `Deposit from ${event.data.authorization.sender_name || "bank transfer"}`,
      });
    } catch (error) {
      logger.error("Error processing Paystack webhook", error);
    }
  }

  res.sendStatus(200); // always acknowledge receipt quickly
};
