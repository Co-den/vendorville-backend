import logger from "#config/logger.js";
import dns from "dns";
import { htmlToText } from "html-to-text";
import nodemailer from "nodemailer";

dns.setDefaultResultOrder("ipv4first");

export default class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.firstName;
    this.url = url;
    this.from = `VendorVille <${process.env.GMAIL_USERNAME}>`;
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

  templates(template, extra = {}) {
    const wrapper = (title, bodyHtml) => `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Hi ${this.firstName},</h2>
        ${bodyHtml}
      </div>
    `;

    switch (template) {
      case "welcome":
        return {
          subject: "Welcome to VendorVille!",
          html: wrapper(
            "Welcome",
            `
            <p>Thanks for joining VendorVille — the platform for Nigerian online vendors to manage inventory, orders, and payments in one place.</p>
            <p>You're all set to start building your business. If you have any questions, we're here to help.</p>
          `,
          ),
        };

      case "verification":
        return {
          subject: "Verify your VendorVille account",
          html: wrapper(
            "Verify",
            `
            <p>Use the code below to verify your email address:</p>
            <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; background: #f4f4f5; padding: 16px; text-align: center; border-radius: 8px; margin: 16px 0;">
              ${extra.code}
            </div>
            <p>This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
          `,
          ),
        };

      case "passwordReset":
        return {
          subject:
            "Your VendorVille password reset link (valid for 10 minutes)",
          html: wrapper(
            "Reset your password",
            `
            <p>You requested a password reset. Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${this.url}" style="background: #132e1b; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p>This link expires in 10 minutes. If you didn't request this, you can safely ignore this email — your password will remain unchanged.</p>
          `,
          ),
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
    };

    try {
      await this.newTransport().sendMail(mailOptions);
      logger.info(`Email (${template}) sent to ${this.to}`);
    } catch (error) {
      logger.error(`Error sending ${template} email to ${this.to}`, error);
      throw error;
    }
  }

  async sendWelcome() {
    await this.send("welcome");
  }

  async sendVerificationCode(code) {
    await this.send("verification", { code });
  }

  async sendPasswordReset() {
    await this.send("passwordReset");
  }
}
