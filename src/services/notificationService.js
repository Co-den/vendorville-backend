import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { notifications } from "#models/notification.js";
import { sendPushToUser } from "#services/pushService.js";
import Email from "#utils/email.js";
import { kudismsApi } from "#utils/kudisms.js";

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
  order_dispatched_customer: (order, businessName) => ({
    subject: `Order Out for Delivery — ${order.orderNumber}`,
    sms: `Hi ${order.customerName}, your order ${order.orderNumber} from ${businessName} is out for delivery!`,
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
      await kudismsApi.sendSms(vendorPhone, content.sms);
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
      await new Email({
        email: vendorEmail,
        firstName: "Vendor",
      }).sendNotification(content.subject, content.sms);
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
  const customerTemplateKey = `${event}_customer`;

  if (templates[customerTemplateKey] && order.customerPhone) {
    const content = templates[customerTemplateKey](order, business.name);

    try {
      await kudismsApi.sendSms(
        order.customerPhone,
        content.sms,
        order.customerName,
        business.smsSenderId || "VendorVille",
      );

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

  const vendorTemplateKey = `${event}_vendor`;

  if (templates[vendorTemplateKey] && vendorPhone) {
    const content = templates[vendorTemplateKey](order);

    try {
      await kudismsApi.sendSms(
        vendorPhone,
        content.sms,
        order.customerName,
        "VendorVille",
      );

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

  if (event === "order_placed" && business.userId) {
    sendPushToUser(business.userId, "vendor", {
      title: "New Order Received",
      body: `${order.customerName} placed an order for ₦${order.totalAmount.toLocaleString()}`,
      url: "/dashboard/orders",
    }).catch((err) => logger.error("Push notification error", err));
  }
};
