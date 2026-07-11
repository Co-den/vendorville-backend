import logger from "#config/logger.js";
import axios from "axios";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

const paystack = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET}`,
    "Content-Type": "application/json",
  },
});

export const paystackApi = {
  createCustomer: async ({ email, firstName, lastName, phone }) => {
    try {
      const { data } = await paystack.post("/customer", {
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
      });
      return data.data;
    } catch (error) {
      logger.error(
        "Paystack createCustomer error",
        error.response?.data || error.message,
      );
      throw new Error("Failed to create Paystack customer");
    }
  },

  createDedicatedAccount: async (customerCode) => {
    try {
      const { data } = await paystack.post("/dedicated_account", {
        customer: customerCode,
        preferred_bank: "wema-bank",
      });
      return data.data;
    } catch (error) {
      logger.error(
        "Paystack createDedicatedAccount error",
        error.response?.data || error.message,
      );
      throw new Error("Failed to create dedicated account");
    }
  },

  resolveAccount: async (accountNumber, bankCode) => {
    try {
      const { data } = await paystack.get(
        `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      );
      return data.data; // { account_number, account_name }
    } catch (error) {
      logger.error(
        "Paystack resolveAccount error",
        error.response?.data || error.message,
      );
      throw new Error(
        "Could not verify this account. Check the details and try again.",
      );
    }
  },

  createTransferRecipient: async ({ accountNumber, bankCode, accountName }) => {
    try {
      const { data } = await paystack.post("/transferrecipient", {
        type: "nuban",
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: "NGN",
      });
      return data.data; // includes recipient_code
    } catch (error) {
      logger.error(
        "Paystack createTransferRecipient error",
        error.response?.data || error.message,
      );
      throw new Error("Failed to save bank account");
    }
  },

  initiateTransfer: async ({ amount, recipientCode, reason }) => {
    try {
      const { data } = await paystack.post("/transfer", {
        source: "balance",
        amount, // kobo
        recipient: recipientCode,
        reason,
      });
      return data.data;
    } catch (error) {
      logger.error(
        "Paystack initiateTransfer error",
        error.response?.data || error.message,
      );
      throw new Error("Failed to process withdrawal");
    }
  },

  verifyTransaction: async (reference) => {
    try {
      const { data } = await paystack.get(`/transaction/verify/${reference}`);
      return data.data;
    } catch (error) {
      logger.error(
        "Paystack verifyTransaction error",
        error.response?.data || error.message,
      );
      throw new Error("Failed to verify transaction");
    }
  },
};
