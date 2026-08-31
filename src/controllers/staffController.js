// controllers/staffController.js
import * as staffService from "#services/staffService.js";
import { cookies } from "#utils/cookies.js";
import { jwtSign } from "#utils/jwt.js";

export const getStaff = async (req, res) => {
  try {
    const staff = await staffService.getStaff(req.user.id, req.params.id);
    res.status(200).json({ staff });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getStaffCount = async (req, res) => {
  try {
    const count = await staffService.getStaffCount(req.user.id, req.params.id);
    res.status(200).json({ count });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getStaffById = async (req, res) => {
  try {
    const staff = await staffService.getStaffById(
      req.user.id,
      req.params.id,
      req.params.staffId,
    );
    res.status(200).json({ staff });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getStaffStats = async (req, res) => {
  try {
    const stats = await staffService.getStaffStats(req.user.id, req.params.id);
    res.status(200).json({ stats });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const inviteStaff = async (req, res) => {
  try {
    const staff = await staffService.inviteStaff(
      req.user.id,
      req.params.id,
      req.body,
    );
    res.status(201).json({ staff });
  } catch (error) {
    if (error.message === "STAFF_LIMIT_REACHED") {
      return res.status(403).json({
        message:
          "You've reached your staff limit for your current plan. Upgrade to add more team members.",
        code: "STAFF_LIMIT_REACHED",
      });
    }
    res.status(400).json({ message: error.message });
  }
};

export const removeStaff = async (req, res) => {
  try {
    await staffService.removeStaff(
      req.user.id,
      req.params.id,
      req.params.staffId,
    );
    res.status(200).json({ message: "Staff member removed" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const toggleStaffActive = async (req, res) => {
  try {
    const staff = await staffService.toggleStaffActive(
      req.user.id,
      req.params.id,
      req.params.staffId,
      req.body.isActive,
    );
    res.status(200).json({ staff });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateStaffRole = async (req, res) => {
  try {
    const staff = await staffService.updateStaffRole(
      req.user.id,
      req.params.id,
      req.params.staffId,
      req.body.newRole,
    );
    res.status(200).json({ staff });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const resetStaffPassword = async (req, res) => {
  try {
    const staff = await staffService.resetStaffPassword(
      req.user.id,
      req.params.id,
      req.params.staffId,
      req.body.newPassword,
    );
    res.status(200).json({
      message: "Password reset and notification email sent",
      staff,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const loginStaff = async (req, res) => {
  try {
    const { email, password } = req.body;
    const staff = await staffService.loginStaff(email, password);

    const token = jwtSign.sign({
      id: staff.id,
      email: staff.email,
      role: "staff",
      staffRole: staff.role,
      businessId: staff.businessId,
      type: "staff",
    });

    cookies.setCookie(res, "staff_token", token);
    res.status(200).json({ staff, token });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};
