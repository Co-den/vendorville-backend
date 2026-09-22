import logger from "#config/logger.js";
import axios from "axios";

const FLUTTERWAVE_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;

const flutterwave = axios.create({
  baseURL: "https://api.flutterwave.com/v3",
  headers: {
    Authorization: `Bearer ${FLUTTERWAVE_SECRET}`,
    "Content-Type": "application/json",
  },
});

export const flutterwaveApi = {
  
  createCustomer: async ({ email, firstName, lastName, phone }) => {
    try {
      const { data } = await flutterwave.post("/customers", {
        email,
        name: `${firstName} ${lastName}`,
        phone_number: phone,
      });
      return data.data;
    } catch (error) {
      logger.error(
        "Flutterwave createCustomer error",
        error.response?.data || error.message
      );
      throw new Error("Failed to create Flutterwave customer");
    }
  },

 
  createDedicatedAccount: async ({
    email,
    firstName,
    lastName,
    phone,
    bvn,
    nin,
    txRef,
  }) => {
    try {
      const { data } = await flutterwave.post("/virtual-account-numbers", {
        email,
        firstname: firstName,
        lastname: lastName,
        phonenumber: phone,
        is_permanent: true,
        tx_ref: txRef,
        currency: "NGN",
        bvn,
        nin,
      });

      return data.data;
    } catch (error) {
      logger.error(
        "Flutterwave createDedicatedAccount error",
        error.response?.data || error.message
      );

      throw new Error(
        error.response?.data?.message ||
        "Failed to create dedicated account"
      );
    }
  },

  // Resolve account details
  resolveAccount: async (accountNumber, bankCode) => {
    try {
      const { data } = await flutterwave.get(
        `/accounts/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
      );
      return {
        account_number: data.data.account_number,
        account_name: data.data.account_name,
      };
    } catch (error) {
      logger.error(
        "Flutterwave resolveAccount error",
        error.response?.data || error.message
      );
      throw new Error(
        "Could not verify this account. Check the details and try again."
      );
    }
  },

  // Create transfer recipient (for bank account)
  createTransferRecipient: async ({ accountNumber, bankCode, accountName }) => {
    try {
      const { data } = await flutterwave.post("/transfers/recipients", {
        type: "nuban",
        account_number: accountNumber,
        bank_code: bankCode,
        currency: "NGN",
        name: accountName,
      });
      return {
        recipient_code: data.data.id,
        ...data.data,
      };
    } catch (error) {
      logger.error(
        "Flutterwave createTransferRecipient error",
        error.response?.data || error.message
      );
      throw new Error("Failed to save bank account");
    }
  },

  // Initiate transfer/withdrawal
  initiateTransfer: async ({ amount, recipientId, reason }) => {
    try {
      const { data } = await flutterwave.post("/transfers", {
        account_bank: recipientId,
        amount_in_kobo: amount, // Flutterwave expects kobo
        narration: reason,
        currency: "NGN",
      });
      return data.data;
    } catch (error) {
      logger.error(
        "Flutterwave initiateTransfer error",
        error.response?.data || error.message
      );
      throw new Error("Failed to process withdrawal");
    }
  },

  // Verify transaction
  verifyTransaction: async (transactionId) => {
    try {
      const { data } = await flutterwave.get(`/transactions/${transactionId}/verify`);
      return data.data;
    } catch (error) {
      logger.error(
        "Flutterwave verifyTransaction error",
        error.response?.data || error.message
      );
      throw new Error("Failed to verify transaction");
    }
  },

  // Get banks in Nigeria
  getBanks: async () => {
    try {
      const { data } = await flutterwave.get("/banks?country=NG");
      return data.data;
    } catch (error) {
      logger.error(
        "Flutterwave getBanks error",
        error.response?.data || error.message
      );
      throw new Error("Failed to fetch banks");
    }
  },

  // Initialize payment transaction
  initializeTransaction: async ({ email, amount, reference, metadata }) => {
    try {
      const { data } = await flutterwave.post("/payments", {
        tx_ref: reference,
        amount,
        currency: "NGN",
        customer: {
          email,
        },
        meta: metadata,
      });
      return {
        authorization_url: data.data.link,
        access_code: data.data.link,
        ...data.data,
      };
    } catch (error) {
      logger.error(
        "Flutterwave initializeTransaction error",
        error.response?.data || error.message
      );
      throw new Error("Failed to initialize Flutterwave transaction");
    }
  },

  // Charge card (for recurring)
  chargeCard: async ({ token, amount, email, txRef, meta }) => {
    try {
      const { data } = await flutterwave.post("/tokenized-charges", {
        token,
        amount,
        currency: "NGN",
        tx_ref: txRef,
        customer: { email },
        meta,
      });
      return data.data;
    } catch (error) {
      logger.error(
        "Flutterwave chargeCard error",
        error.response?.data || error.message
      );
      throw new Error("Failed to charge card");
    }
  },
};