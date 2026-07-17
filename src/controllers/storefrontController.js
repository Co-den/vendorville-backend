import * as storefrontService from "#services/storefrontService.js";
import { cookies } from "#utils/cookies.js";
import { jwtSign } from "#utils/jwt.js";
import { paystackApi } from "#utils/paystack.js";

export const getStorefront = async (req, res) => {
  try {
    const data = await storefrontService.getStorefront(req.params.slug);
    res.status(200).json(data);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const createOrder = async (req, res) => {
  try {
    // If a customer is logged in (optional), req.customer is set by a soft auth middleware
    const customerAccountId = req.customer?.id || null;
    const order = await storefrontService.createGuestOrder(
      req.params.slug,
      req.body,
      customerAccountId,
    );
    res.status(201).json({ order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const verifyPaystackPayment = async (req, res) => {
  try {
    const { reference } = req.body;
    const verification = await paystackApi.verifyTransaction(reference);
    if (verification.status !== "success") {
      return res.status(400).json({ message: "Payment was not successful" });
    }
    const result = await storefrontService.markOrderPaidByReference(
      reference,
      verification.amount,
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const registerCustomer = async (req, res) => {
  try {
    const account = await storefrontService.registerCustomer(req.body);
    const token = jwtSign.sign({
      id: account.id,
      email: account.email,
      type: "customer",
    });
    cookies.setCookie(res, "customer_token", token);
    res.status(201).json({ customer: account });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;
    const account = await storefrontService.loginCustomer(email, password);
    const token = jwtSign.sign({
      id: account.id,
      email: account.email,
      type: "customer",
    });
    cookies.setCookie(res, "customer_token", token);
    res.status(200).json({ customer: account });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

export const getDirectory = async (req, res) => {
  try {
    const { search, category } = req.query;
    const businesses = await storefrontService.getDirectory({
      search,
      category,
    });
    res.status(200).json({ businesses });
  } catch (error) {
    res.status(500).json({ message: "Failed to load directory" });
  }
};
