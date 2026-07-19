import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { notifications } from "#models/notification.js";
import { termiiApi } from "#utils/termii.js";
import { sendGenericEmail } from "#utils/verification.js";

const logNotification = async (
  orderId,
  channel,
  recipient,
  event,
  status,
  errorMessage = null,
) => {
  try {
    await db
      .insert(notifications)
      .values({ orderId, channel, recipient, event, status, errorMessage });
  } catch (err) {
    logger.error("Failed to log notification", err);
  }
};

const templates = {
  order_placed_customer: (order, businessName) => ({
    subject: `Order Confirmed — ${order.orderNumber}`,
    sms: `Hi ${order.customerName}, your order ${order.orderNumber} from ${businessName} (₦${order.totalAmount.toLocaleString()}) has been received. We'll notify you when it's confirmed.`,
  }),
  order_placed_vendor: (order) => ({
    subject: `New Order — ${order.orderNumber}`,
    sms: `New order ${order.orderNumber} from ${order.customerName} for ₦${order.totalAmount.toLocaleString()}. Check your VendorVille dashboard.`,
  }),
  order_paid_customer: (order, businessName) => ({
    subject: `Payment Confirmed — ${order.orderNumber}`,
    sms: `Hi ${order.customerName}, payment for order ${order.orderNumber} at ${businessName} has been confirmed. Your order is being prepared.`,
  }),
  order_fulfilled_customer: (order, businessName) => ({
    subject: `Order Ready — ${order.orderNumber}`,
    sms: `Hi ${order.customerName}, your order ${order.orderNumber} from ${businessName} is ready/out for delivery!`,
  }),
  order_cancelled_customer: (order, businessName) => ({
    subject: `Order Cancelled — ${order.orderNumber}`,
    sms: `Hi ${order.customerName}, your order ${order.orderNumber} from ${businessName} has been cancelled. Contact them if you have questions.`,
  }),
  lowStockTemplate: (product, business, isOut) => ({
    subject: isOut
      ? `Out of Stock — ${product.name}`
      : `Low Stock Alert — ${product.name}`,
    sms: isOut
      ? `${business.name}: "${product.name}" (SKU: ${product.sku}) is now OUT OF STOCK. Restock soon to avoid missed sales.`
      : `${business.name}: "${product.name}" (SKU: ${product.sku}) is running low — only ${product.stock} left. Consider restocking.`,
  }),
};

export const notifyLowStock = async ({
  product,
  business,
  vendorPhone,
  vendorEmail,
  isOut,
}) => {
  const content = lowStockTemplate(product, business, isOut);

  if (vendorPhone) {
    try {
      await termiiApi.sendSms(vendorPhone, content.sms);
      await logNotification(
        null,
        "sms",
        vendorPhone,
        isOut ? "out_of_stock" : "low_stock",
        "sent",
      );
    } catch (error) {
      await logNotification(
        null,
        "sms",
        vendorPhone,
        isOut ? "out_of_stock" : "low_stock",
        "failed",
        error.message,
      );
    }
  }

  if (vendorEmail) {
    try {
      await sendGenericEmail(
        vendorEmail,
        content.subject,
        `<div style="font-family: sans-serif; padding: 20px;">
          <h2>${content.subject}</h2>
          <p>${content.sms}</p>
        </div>`,
      );
      await logNotification(
        null,
        "email",
        vendorEmail,
        isOut ? "out_of_stock" : "low_stock",
        "sent",
      );
    } catch (error) {
      await logNotification(
        null,
        "email",
        vendorEmail,
        isOut ? "out_of_stock" : "low_stock",
        "failed",
        error.message,
      );
    }
  }
};

export const notifyOrderEvent = async ({
  event,
  order,
  business,
  vendorEmail,
  vendorPhone,
}) => {
  const notifyCustomer = [
    "order_placed_customer",
    "order_paid_customer",
    "order_fulfilled_customer",
    "order_cancelled_customer",
  ].includes(`${event}_customer`);

  // ----- Customer notification -----
  const customerTemplateKey = `${event}_customer`;
  if (templates[customerTemplateKey] && order.customerPhone) {
    const content = templates[customerTemplateKey](order, business.name);
    try {
      await termiiApi.sendSms(order.customerPhone, content.sms);
      await logNotification(
        order.id,
        "sms",
        order.customerPhone,
        event,
        "sent",
      );
    } catch (error) {
      await logNotification(
        order.id,
        "sms",
        order.customerPhone,
        event,
        "failed",
        error.message,
      );
    }
  }

  // ----- Vendor notification (only on new order) -----
  const vendorTemplateKey = `${event}_vendor`;
  if (templates[vendorTemplateKey] && vendorPhone) {
    const content = templates[vendorTemplateKey](order);
    try {
      await termiiApi.sendSms(vendorPhone, content.sms);
      await logNotification(order.id, "sms", vendorPhone, event, "sent");
    } catch (error) {
      await logNotification(
        order.id,
        "sms",
        vendorPhone,
        event,
        "failed",
        error.message,
      );
    }
  }
};
