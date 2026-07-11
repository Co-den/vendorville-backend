import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { users } from "#models/user.js";
import { bankAccounts, wallets, walletTransactions } from "#models/wallet.js";
import { paystackApi } from "#utils/paystack.js";
import { desc, eq } from "drizzle-orm";

export const getOrCreateWallet = async (userId) => {
  const existing = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .limit(1);
  if (existing.length > 0) return existing[0];

  const [newWallet] = await db
    .insert(wallets)
    .values({ userId, balance: 0 })
    .returning();
  return newWallet;
};

export const getWalletDetails = async (userId) => {
  const wallet = await getOrCreateWallet(userId);
  return {
    balance: wallet.balance / 100, // convert kobo -> naira for display
    accountNumber: wallet.dvaAccountNumber,
    bankName: wallet.dvaBankName,
    accountName: wallet.dvaAccountName,
  };
};

export const generateDedicatedAccount = async (userId) => {
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (userResult.length === 0) throw new Error("User not found");
  const user = userResult[0];

  const wallet = await getOrCreateWallet(userId);

  let customerCode = wallet.paystackCustomerCode;
  if (!customerCode) {
    const customer = await paystackApi.createCustomer({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phoneNumber,
    });
    customerCode = customer.customer_code;
  }

  const dva = await paystackApi.createDedicatedAccount(customerCode);

  const [updated] = await db
    .update(wallets)
    .set({
      paystackCustomerCode: customerCode,
      dvaAccountNumber: dva.account_number,
      dvaBankName: dva.bank.name,
      dvaAccountName: dva.account_name,
      dvaId: String(dva.id),
      updatedAt: new Date(),
    })
    .where(eq(wallets.userId, userId))
    .returning();

  logger.info(`Dedicated account created for user ${userId}`);

  return {
    accountNumber: updated.dvaAccountNumber,
    bankName: updated.dvaBankName,
    accountName: updated.dvaAccountName,
  };
};

export const getTransactions = async (userId) => {
  const wallet = await getOrCreateWallet(userId);
  const txs = await db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.walletId, wallet.id))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(50);

  return txs.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amount: tx.amount / 100,
    description: tx.description,
    status: tx.status,
    date: tx.createdAt.toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  }));
};

// Called by the Paystack webhook when a deposit is confirmed
export const creditWalletFromWebhook = async ({
  dvaAccountNumber,
  amountKobo,
  reference,
  description,
}) => {
  const walletResult = await db
    .select()
    .from(wallets)
    .where(eq(wallets.dvaAccountNumber, dvaAccountNumber))
    .limit(1);
  if (walletResult.length === 0) {
    logger.warn(
      `Webhook credit failed — no wallet found for account ${dvaAccountNumber}`,
    );
    return;
  }
  const wallet = walletResult[0];

  // Idempotency check — avoid double-crediting if Paystack retries the webhook
  const existingTx = await db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.reference, reference))
    .limit(1);
  if (existingTx.length > 0) {
    logger.info(
      `Webhook for reference ${reference} already processed, skipping`,
    );
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(wallets)
      .set({ balance: wallet.balance + amountKobo, updatedAt: new Date() })
      .where(eq(wallets.id, wallet.id));
    await tx.insert(walletTransactions).values({
      walletId: wallet.id,
      type: "credit",
      amount: amountKobo,
      description: description || "Wallet deposit",
      reference,
      status: "paid",
    });
  });

  logger.info(
    `Wallet ${wallet.id} credited ₦${amountKobo / 100} via reference ${reference}`,
  );
};

export const getBankAccounts = async (userId) => {
  const accounts = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.userId, userId));
  return accounts.map((a) => ({
    id: a.id,
    bankName: a.bankName,
    accountNumber: a.accountNumber,
    accountName: a.accountName,
    isPrimary: a.isPrimary,
  }));
};

export const addBankAccount = async (
  userId,
  bankCode,
  accountNumber,
  bankName,
) => {
  const resolved = await paystackApi.resolveAccount(accountNumber, bankCode);

  const recipient = await paystackApi.createTransferRecipient({
    accountNumber,
    bankCode,
    accountName: resolved.account_name,
  });

  const existingAccounts = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.userId, userId));
  const isPrimary = existingAccounts.length === 0;

  const [newAccount] = await db
    .insert(bankAccounts)
    .values({
      userId,
      bankCode,
      bankName,
      accountNumber,
      accountName: resolved.account_name,
      recipientCode: recipient.recipient_code,
      isPrimary,
    })
    .returning();

  return {
    id: newAccount.id,
    bankName: newAccount.bankName,
    accountNumber: newAccount.accountNumber,
    accountName: newAccount.accountName,
    isPrimary: newAccount.isPrimary,
  };
};

export const removeBankAccount = async (userId, accountId) => {
  await db.delete(bankAccounts).where(eq(bankAccounts.id, accountId));
};

export const withdrawFromWallet = async (
  userId,
  amountNaira,
  bankAccountId,
) => {
  const wallet = await getOrCreateWallet(userId);
  const amountKobo = Math.round(amountNaira * 100);

  if (amountKobo > wallet.balance) {
    throw new Error("Insufficient wallet balance");
  }

  const accountResult = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.id, bankAccountId))
    .limit(1);
  if (accountResult.length === 0) throw new Error("Bank account not found");
  const account = accountResult[0];

  const reference = `wd_${Date.now()}_${userId}`;

  const transfer = await paystackApi.initiateTransfer({
    amount: amountKobo,
    recipientCode: account.recipientCode,
    reason: "Wallet withdrawal",
  });

  await db.transaction(async (tx) => {
    await tx
      .update(wallets)
      .set({ balance: wallet.balance - amountKobo, updatedAt: new Date() })
      .where(eq(wallets.id, wallet.id));
    await tx.insert(walletTransactions).values({
      walletId: wallet.id,
      type: "debit",
      amount: amountKobo,
      description: `Withdrawal to ${account.bankName} ••${account.accountNumber.slice(-4)}`,
      reference,
      status: transfer.status === "success" ? "paid" : "pending",
    });
  });

  return {
    newBalance: (wallet.balance - amountKobo) / 100,
    transferStatus: transfer.status,
  };
};
