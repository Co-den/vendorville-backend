import logger from "#config/logger.js";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate a 6-digit numeric verification code
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Reusable transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  family: 4,
});

export const sendVerificationEmail = async (email, firstName, code) => {
  try {
    await transporter.sendMail({
      from: `"VendorHub" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your VendorHub account",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="cid:vv" alt="VendorHub" width="140" style="display: inline-block;" />
          </div>
          <h2>Hi ${firstName},</h2>
          <p>Thanks for signing up for VendorHub. Use the code below to verify your email address:</p>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; background: #f4f4f5; padding: 16px; text-align: center; border-radius: 8px; margin: 16px 0;">
            ${code}
          </div>
          <p>This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
      attachments: [
        {
          filename: "logo.png",
          path: path.join(__dirname, "../assets/vv.png"),
          cid: "vv",
        },
      ],
    });
    logger.info(`Verification email sent to ${email}`);
  } catch (error) {
    logger.error(`Error sending verification email to ${email}`, error);
    throw new Error("Error sending verification email");
  }
};
