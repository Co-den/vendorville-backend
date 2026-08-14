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
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.firstName;
    this.url = url;
    this.from = process.env.EMAIL_FROM;
    const logoPath = path.join(__dirname, "assets", "vv.png");
    this.logoContent = fs.readFileSync(logoPath).toString("base64");
  }

  newTransport() {
    return nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST,
      port: Number(process.env.BREVO_SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_LOGIN,
        pass: process.env.BREVO_SMTP_PASSWORD,
      },
    });
  }
  async verifyEmailConnection() {
    try {
      await this.newTransport().verify();

      logger.info("Brevo SMTP connection successful");
    } catch (error) {
      logger.error("Brevo SMTP connection failed", error);
      throw error;
    }
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
          subject: "Welcome to VendorVille! 🚀",
          html: this.wrapper(`
      <div style="text-align:center; padding:10px 0 25px;">
        <div style="
          display:inline-block;
          background:#eaf6ed;
          color:#132e1b;
          padding:8px 16px;
          border-radius:20px;
          font-size:12px;
          font-weight:bold;
          letter-spacing:1px;
          margin-bottom:18px;
        ">
          WELCOME TO VENDORVILLE
        </div>

        <h1 style="
          font-size:30px;
          line-height:1.3;
          color:#132e1b;
          margin:0 0 18px;
        ">
          Your business journey starts here 🚀
        </h1>

        <p style="
          font-size:16px;
          line-height:1.7;
          color:#666;
          margin:0;
        ">
          We're excited to officially welcome you to VendorVille,
          a platform built to help Nigerian vendors manage their
          businesses with more ease, clarity and confidence.
        </p>
      </div>

      <div style="
        background:#f6f8f6;
        border-radius:12px;
        padding:25px;
        margin:25px 0;
      ">
        <h2 style="
          color:#132e1b;
          font-size:21px;
          margin-top:0;
        ">
          Everything you need, all in one place.
        </h2>

        <p style="
          font-size:15px;
          line-height:1.7;
          color:#555;
        ">
          Running a business comes with a lot of moving parts. From
          keeping track of products and inventory to managing orders,
          sales and customers, staying organized can quickly become
          overwhelming.
        </p>

        <p style="
          font-size:15px;
          line-height:1.7;
          color:#555;
          margin-bottom:0;
        ">
          VendorVille is designed to bring those important parts of
          your business together in one place, giving you a clearer
          view of your operations and helping you spend more time
          focusing on growing your business.
        </p>
      </div>

      <h2 style="
        color:#132e1b;
        font-size:22px;
        margin:30px 0 20px;
      ">
        Here's what you can do with VendorVille
      </h2>

      <div style="margin-bottom:25px;">
        <h3 style="
          color:#132e1b;
          font-size:17px;
          margin-bottom:8px;
        ">
          📦 Manage your inventory
        </h3>

        <p style="
          font-size:15px;
          line-height:1.7;
          color:#666;
          margin-top:0;
        ">
          Keep track of your products and stay informed about what
          is available in your business, helping you stay organized
          and prepared.
        </p>
      </div>

      <div style="margin-bottom:25px;">
        <h3 style="
          color:#132e1b;
          font-size:17px;
          margin-bottom:8px;
        ">
          🛒 Manage orders and sales
        </h3>

        <p style="
          font-size:15px;
          line-height:1.7;
          color:#666;
          margin-top:0;
        ">
          Stay on top of your business activity and manage important
          information from one central place without the stress of
          jumping between different tools.
        </p>
      </div>

      <div style="margin-bottom:30px;">
        <h3 style="
          color:#132e1b;
          font-size:17px;
          margin-bottom:8px;
        ">
          📈 Grow with confidence
        </h3>

        <p style="
          font-size:15px;
          line-height:1.7;
          color:#666;
          margin-top:0;
        ">
          Get a clearer understanding of your business and make better
          decisions as you continue to build, improve and grow.
        </p>
      </div>

      <div style="
        border-top:1px solid #e5e5e5;
        padding-top:30px;
        text-align:center;
      ">
        <h2 style="
          color:#132e1b;
          font-size:23px;
          margin-top:0;
        ">
          Ready to get started?
        </h2>

        <p style="
          font-size:15px;
          line-height:1.7;
          color:#666;
          margin-bottom:25px;
        ">
          Your VendorVille account is now ready. Start exploring the
          platform, set up your business and begin managing your
          operations in a smarter way.
        </p>

        <a
          href="${process.env.FRONTEND_URL}/dashboard"
          style="
            display:inline-block;
            background:#132e1b;
            color:#ffffff;
            text-decoration:none;
            padding:15px 30px;
            border-radius:8px;
            font-size:15px;
            font-weight:bold;
          "
        >
          Go to VendorVille →
        </a>
      </div>

      <div style="
        margin-top:35px;
        padding:25px;
        background:#fff8e8;
        border-radius:12px;
      ">
        <p style="
          font-size:15px;
          line-height:1.7;
          color:#555;
          margin:0;
        ">
          We're excited to have you with us and can't wait to see what
          you build. VendorVille is here to support your journey and
          help make managing your business simpler.
        </p>
      </div>

      <p style="
        font-size:16px;
        line-height:1.7;
        color:#333;
        margin-top:35px;
      ">
        Welcome to VendorVille, ${this.firstName}. We're glad you're here. 🚀
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
              
               <a href="${this.url}"
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

      case "custom":
        return {
          subject: extra.subject,
          html: this.wrapper(`
            <h3>${extra.subject}</h3>
            <p>${extra.message}</p>
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
      logger.info(`Email (${template}) sent to ${this.to}`);
    } catch (error) {
      logger.error(`Error sending ${template} email to ${this.to}`, error);
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
    return this.send("custom", { subject, message });
  }
}
