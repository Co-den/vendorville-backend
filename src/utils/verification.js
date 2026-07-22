import logger from "#config/logger.js";
import fs from "fs";
import {
  Attachment,
  EmailParams,
  MailerSend,
  Recipient,
  Sender,
} from "mailersend";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

const SENDER_EMAIL =
  process.env.MAILERSEND_SENDER_EMAIL || "onboarding@yourdomain.com";
const SENDER_NAME = "VendorVille";

// Generate a 6-digit numeric verification code
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendVerificationEmail = async (email, firstName, code) => {
  try {
    const logoPath = path.join(__dirname, "assets/vv.png");
    const logoContent = fs.readFileSync(logoPath).toString("base64");

    const attachment = new Attachment(
      logoContent,
      "vv.png",
      "inline",
      "vv-logo",
    );

    const sentFrom = new Sender(SENDER_EMAIL, SENDER_NAME);
    const recipients = [new Recipient(email, firstName)];

    const html = `
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
    `;

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject("Verify your VendorVille account")
      .setHtml(html)
      .setAttachments([attachment]);

    const response = await mailerSend.email.send(emailParams);

    logger.info(`Verification email sent to ${email}`, {
      status: response?.statusCode,
    });
  } catch (error) {
    logger.error(`Error sending verification email to ${email}`, error);
    throw error;
  }
};

export const sendGenericEmail = async (to, subject, htmlBody) => {
  try {
    const sentFrom = new Sender(SENDER_EMAIL, SENDER_NAME);
    const recipients = [new Recipient(to)];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(subject)
      .setHtml(htmlBody);

    const response = await mailerSend.email.send(emailParams);

    logger.info(`Email sent to ${to}`, { status: response?.statusCode });
  } catch (error) {
    logger.error(`Error sending email to ${to}`, error);
    throw error;
  }
};
