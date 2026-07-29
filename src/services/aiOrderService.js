import { db } from "#config/database.js";
import { products } from "#models/product.js";
import { getSubscription } from "#services/subscriptionService.js";
import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const parseOrderFromText = async (userId, businessId, text) => {
  const sub = await getSubscription(userId);
  if (sub.plan !== "enterprise") {
    throw new Error("AI order creation is available on the Enterprise plan.");
  }

  const productList = await db
    .select()
    .from(products)
    .where(eq(products.businessId, businessId));
  if (productList.length === 0)
    throw new Error("No products found for this business.");

  const catalogText = productList
    .map(
      (p) =>
        `${p.id}: ${p.name} (SKU: ${p.sku}, ₦${p.price / 100}, stock: ${p.stock})`,
    )
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Here is a vendor's product catalog:\n${catalogText}\n\nA vendor typed this order request: "${text}"\n\nMatch the request to products in the catalog and return ONLY a JSON array (no other text) of objects with "productId" and "quantity", e.g. [{"productId": 3, "quantity": 2}]. If a mentioned item doesn't match any product, omit it. If nothing matches, return [].`,
      },
    ],
  });

  const responseText = message.content[0].text.trim();
  let items;
  try {
    items = JSON.parse(responseText);
  } catch {
    throw new Error("Could not understand that order. Try rephrasing it.");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("No matching products found for that request.");
  }

  return items.map((item) => {
    const product = productList.find((p) => p.id === item.productId);
    return {
      productId: item.productId,
      quantity: item.quantity,
      name: product?.name,
      price: product ? product.price / 100 : 0,
      stock: product?.stock,
    };
  });
};
