import logger from "#config/logger.js";
import dns from "dns";
import fs from "fs";
import { htmlToText } from "html-to-text";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

dns.setDefaultResultOrder("ipv4first");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export default class Email {
  constructor(user, url = null) {
    this.to = user.email;
    this.firstName = user.firstName;
    this.url = url;
    this.from = `VendorVille <${process.env.GMAIL_USERNAME}>`;

    const logoPath = path.join(__dirname, "assets", "vv.png");
    this.logoContent = fs.readFileSync(logoPath).toString("base64");
  }

  newTransport() {
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USERNAME,
        pass: process.env.GMAIL_PASSWORD,
      },
    });
  }

  wrapper(bodyHtml) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; color: #333;">
        <div style="text-align:center; margin-bottom:30px;">
          <img src="cid:vv-logo" alt="VendorVille" width="170" />
        </div>

        <h2 style="margin-bottom:20px;">
          Hi ${this.firstName},
        </h2>

        ${bodyHtml}

        <hr style="margin:40px 0; border:none; border-top:1px solid #e5e5e5;" />

        <p style="font-size:13px; color:#777;">
          VendorVille Technologies Limited
        </p>
      </div>
    `;
  }

  templates(template, extra = {}) {
    switch (template) {
      case "welcome":
        return {
          subject: "Welcome to VendorVille!",
          html: this.wrapper(`
            <p>
              Thanks for joining VendorVille — the platform built for Nigerian vendors to manage inventory, orders and payments in one place.
            </p>

            <p>
              Your account is ready. We can't wait to see you grow your business with us.
            </p>
          `),
        };

      case "verification":
        return {
          subject: "Verify your VendorVille account",
          html: this.wrapper(`
            <p>
              Thanks for signing up. Use the verification code below to verify your email address.
            </p>

            <div style="
              font-size:30px;
              font-weight:bold;
              letter-spacing:6px;
              background:#f4f4f5;
              padding:18px;
              text-align:center;
              border-radius:8px;
              margin:25px 0;
            ">
              ${extra.code}
            </div>

            <p>
              This code expires in <strong>15 minutes</strong>.
            </p>

            <p>
              If you didn't request this, you can safely ignore this email.
            </p>
          `),
        };

      case "passwordReset":
        return {
          subject: "Reset your VendorVille password",
          html: this.wrapper(`
            <p>
              We received a request to reset your password.
            </p>

            <div style="text-align:center; margin:30px 0;">
              <a
                href="${this.url}"
                style="
                  background:#132e1b;
                  color:#fff;
                  text-decoration:none;
                  padding:14px 30px;
                  border-radius:8px;
                  display:inline-block;
                  font-weight:bold;
                "
              >
                Reset Password
              </a>
            </div>

            <p>
              This link expires in <strong>10 minutes</strong>.
            </p>

            <p>
              If you didn't request a password reset, you can ignore this email.
            </p>
          `),
        };

      default:
        throw new Error(`Unknown email template: ${template}`);
    }
  }

  async send(template, extra = {}) {
    const { subject, html } = this.templates(template, extra);

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html),

      attachments: [
        {
          filename: "vv.png",
          content: this.logoContent,
          encoding: "base64",
          cid: "vv-logo",
        },
      ],
    };

    try {
      await this.newTransport().sendMail(mailOptions);
      logger.info(`${template} email sent to ${this.to}`);
    } catch (error) {
      logger.error(`Failed to send ${template} email to ${this.to}`, error);
      throw error;
    }
  }

  async sendWelcome() {
    return this.send("welcome");
  }

  async sendVerificationCode(code) {
    return this.send("verification", { code });
  }

  async sendPasswordReset() {
    return this.send("passwordReset");
  }
  async sendNotification(subject, message) {
    return this.sendCustom(
      subject,
      this.wrapper(`
      <h3>${subject}</h3>
      <p>${message}</p>
    `),
    );
  }
}
