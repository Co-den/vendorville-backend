import logger from "#config/logger.js";
import fs from "fs";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MailerSend SMTP relay transporter
const transporter = nodemailer.createTransport({
  host: "smtp.mailersend.net",
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAILERSEND_SMTP_USER,
    pass: process.env.MAILERSEND_SMTP_PASS,
  },
});

// Generate a 6-digit numeric verification code
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendVerificationEmail = async (email, firstName, code) => {
  try {
    const logoPath = path.join(__dirname, "assets/vv.png");
    const logoContent = fs.readFileSync(logoPath).toString("base64");

    await transporter.sendMail({
      from: `"VendorVille" <${process.env.MAILERSEND_SENDER_EMAIL}>`,
      to: email,
      subject: "Verify your VendorVille account",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="cid:vv-logo" alt="VendorVille" width="140" style="display: inline-block;" />
          </div>
          <h2>Hi ${firstName},</h2>
          <p>Thanks for signing up for VendorVille. Use the code below to verify your email address:</p>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; background: #f4f4f5; padding: 16px; text-align: center; border-radius: 8px; margin: 16px 0;">
            ${code}
          </div>
          <p>This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
      attachments: [
        {
          filename: "vv.png",
          content: logoContent,
          encoding: "base64",
          cid: "vv-logo",
        },
      ],
    });

    logger.info(`Verification email sent to ${email}`);
  } catch (error) {
    logger.error(`Error sending verification email to ${email}`, error);
    throw error;
  }
};

export const sendGenericEmail = async (to, subject, htmlBody) => {
  try {
    await transporter.sendMail({
      from: `"VendorVille" <${process.env.MAILERSEND_SENDER_EMAIL}>`,
      to,
      subject,
      html: htmlBody,
    });

    logger.info(`Email sent to ${to}`);
  } catch (error) {
    logger.error(`Error sending email to ${to}`, error);
    throw error;
  }
};
