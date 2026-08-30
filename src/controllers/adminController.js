import * as adminService from "#services/adminService.js";
import { manualTrialExpirationCheck } from "#jobs/trial-expiration.js";
import { cookies } from "#utils/cookies.js";
import { jwtSign } from "#utils/jwt.js";

export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await adminService.loginAdmin(email, password);

    const token = jwtSign.sign({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      type: "admin",
    });
    cookies.setCookie(res, "admin_token", token);

    res.status(200).json({ admin, token });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

export const logoutAdmin = async (req, res) => {
  cookies.clearCookie(res, "admin_token");
  res.status(200).json({ message: "Logged out" });
};

export const getPendingBusinesses = async (req, res) => {
  try {
    const businesses = await adminService.getPendingBusinesses();
    res.status(200).json({ businesses });
  } catch (error) {
    res.status(500).json({ message: "Error loading businesses" });
  }
};

export const getAllBusinesses = async (req, res) => {
  try {
    const businesses = await adminService.getAllBusinesses(req.query.status);
    res.status(200).json({ businesses });
  } catch (error) {
    res.status(500).json({ message: "Error loading businesses" });
  }
};

export const approveBusiness = async (req, res) => {
  try {
    const business = await adminService.approveBusiness(req.params.id);
    res.status(200).json({ business });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const rejectBusiness = async (req, res) => {
  try {
    const business = await adminService.rejectBusiness(
      req.params.id,
      req.body.reason,
    );
    res.status(200).json({ business });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const stats = await adminService.getEnhancedStats();
    res.status(200).json({ stats });
  } catch (error) {
    res.status(500).json({ message: "Error loading stats" });
  }
};

export const TrialExpirationCheck = async (req, res) => {
  try {
    const result = await manualTrialExpirationCheck();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}