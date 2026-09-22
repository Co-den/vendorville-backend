import logger from "#config/logger.js";
import { creditWalletFromWebhook } from "#services/walletService.js";
import crypto from "crypto";


export const flutterwaveWebhook = async (req, res) => {
  const signature = req.headers["verif-hash"];

  
  const hash = crypto
    .createHmac("sha256", process.env.FLUTTERWAVE_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== signature) {
    logger.warn("Flutterwave webhook signature mismatch", {
      receivedHash: signature,
      calculatedHash: hash,
    });
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.body;

  try {
    switch (event.event) {
      // When funds are received to virtual account
      case "virtual-account.incoming-transfer":
        await handleIncomingTransfer(event);
        break;

      // When a settlement/payout completes
      case "settlement.completed":
        await handleSettlementComplete(event);
        break;

      // When a charge succeeds (for regular payments)
      case "charge.completed":
        await handleChargeComplete(event);
        break;

      default:
        logger.debug(`Unhandled Flutterwave event: ${event.event}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error("Error processing Flutterwave webhook:", {
      event: event.event,
      error: error.message,
    });
    
    res.status(200).json({ success: false, error: error.message });
  }
};

/**
 * Handle incoming transfer to virtual account
 * This fires when customer sends money to their virtual account
 */
const handleIncomingTransfer = async (event) => {
  const { data } = event;

  logger.info("Processing incoming virtual account transfer", {
    accountNumber: data.account_number,
    amount: data.amount,
    reference: data.transaction_ref,
  });

  await creditWalletFromWebhook({
    dvaAccountNumber: data.account_number,
    amountKobo: Math.round(data.amount * 100), // Convert to kobo
    reference: data.transaction_ref,
    description: `Deposit via ${data.sender_name || "bank transfer"}`,
  });
};

/**
 * Handle settlement completion
 * This fires when vendor withdrawal/payout completes
 */
const handleSettlementComplete = async (event) => {
  const { data } = event;

  logger.info("Settlement completed", {
    reference: data.reference,
    amount: data.amount,
    status: data.status,
  });

  // Update transaction status in database
  // You'll need to add this to your transaction service
  // await updateTransactionStatus(data.reference, "completed");
};

/**
 * Handle charge completion
 * This fires when payment to platform completes
 */
const handleChargeComplete = async (event) => {
  const { data } = event;

  logger.info("Charge completed", {
    reference: data.tx_ref,
    amount: data.amount,
    status: data.status,
  });

  // Handle subscription payments, orders, etc.
  // await handlePaymentComplete(data.tx_ref, data.amount);
};