import logger from "#config/logger.js";
import fs from "fs";
import path from "path";
import { Resend } from "resend";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resend = new Resend(process.env.RESEND_API_KEY);

// Generate a 6-digit numeric verification code
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendVerificationEmail = async (email, firstName, code) => {
  try {
    const logoPath = path.join(__dirname, "assets/vv.png");
    const logoContent = fs.readFileSync(logoPath).toString("base64");

    const { data, error } = await resend.emails.send({
      from: "VendorVille <onboarding@resend.dev>",
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
          cid: "vv-logo",
        },
      ],
    });

    if (error) {
      throw new Error(error.message || "Resend API returned an error");
    }

    logger.info(`Verification email sent to ${email}`, { id: data?.id });
  } catch (error) {
    logger.error(`Error sending verification email to ${email}`, error);
    throw new Error("Error sending verification email");
  }
};
