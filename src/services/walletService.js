import { db } from "#config/database.js";
import logger from "#config/logger.js";
import { wallets, bankAccounts, walletTransactions } from "#models/wallet.js";
import { users } from "#models/user.js";
import { flutterwaveApi } from "#utils/flutterwaveApi.js";
import { eq, and } from "drizzle-orm";

export const getOrCreateWallet = async (userId) => {
  const wallet = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .limit(1);

  if (wallet.length > 0) {
    return wallet[0];
  }

  const [newWallet] = await db
    .insert(wallets)
    .values({
      userId,
      balance: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return newWallet;
};

export const getWalletDetails = async (userId) => {
  const wallet = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .limit(1);

  if (wallet.length === 0) {
    throw new Error("Wallet not found");
  }

  const walletData = wallet[0];

  return {
    balance: walletData.balance,
    accountNumber: walletData.dvaAccountNumber || null,
    bankName: walletData.dvaBankName || null,
    accountName: walletData.dvaAccountName || null,
    hasAccount: !!walletData.dvaAccountNumber,
  };
};

export const generateVirtualDedicatedAccount = async (userId) => {
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userResult.length === 0) throw new Error("User not found");
  const user = userResult[0];

  const wallet = await getOrCreateWallet(userId);

  let customerId = wallet.flutterwaveCustomerId;

  // Create or get customer
  if (!customerId) {
    try {
      const customer = await flutterwaveApi.createCustomer({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phoneNumber,
      });
      customerId = customer.id;
    } catch (error) {
      logger.error("Failed to create Flutterwave customer:", error);
      throw new Error("Failed to create customer account");
    }
  }

  // Create virtual account
  try {
    const dva = await flutterwaveApi.createDedicatedAccount(customerId);

    const [updated] = await db
      .update(wallets)
      .set({
        flutterwaveCustomerId: customerId,
        dvaAccountNumber: dva.account_number,
        dvaBankName: dva.bank_name,
        dvaAccountName: dva.account_name,
        dvaId: String(dva.id),
        updatedAt: new Date(),
      })
      .where(eq(wallets.userId, userId))
      .returning();

    logger.info(
      `Virtual account created for user ${userId}: ${dva.account_number}`
    );

    return {
      accountNumber: updated.dvaAccountNumber,
      bankName: updated.dvaBankName,
      accountName: updated.dvaAccountName,
      message: "Virtual account created successfully",
    };
  } catch (error) {
    logger.error("Failed to create virtual account:", error);
    throw new Error("Failed to create virtual account");
  }
};

export const getTransactions = async (userId) => {
  try {
    const txns = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(walletTransactions.createdAt);

    return txns.map((t) => ({
      id: t.id,
      type: t.type, // withdrawal, deposit, refund
      amount: t.amount,
      status: t.status,
      reference: t.reference,
      description: t.description,
      createdAt: t.createdAt,
    }));
  } catch (error) {
    logger.error("Failed to fetch transactions:", error);
    throw error;
  }
};

export const getBankAccounts = async (userId) => {
  try {
    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.userId, userId));

    return accounts.map((a) => ({
      id: a.id,
      accountNumber: a.accountNumber,
      accountName: a.accountName,
      bankName: a.bankName,
      bankCode: a.bankCode,
      recipientCode: a.recipientCode,
      isDefault: a.isDefault,
    }));
  } catch (error) {
    logger.error("Failed to fetch bank accounts:", error);
    throw error;
  }
};

export const addBankAccount = async (userId, bankCode, accountNumber) => {
  try {
    // Resolve account details with Flutterwave
    const accountDetails = await flutterwaveApi.resolveAccount(
      accountNumber,
      bankCode
    );

    if (!accountDetails.account_name) {
      throw new Error("Account name not found");
    }

    // Get banks to find bank name
    const banks = await flutterwaveApi.getBanks();
    const bank = banks.find((b) => b.code === bankCode);
    const bankName = bank?.name || "Unknown Bank";

    // Create transfer recipient with Flutterwave
    const recipient = await flutterwaveApi.createTransferRecipient({
      accountNumber,
      bankCode,
      accountName: accountDetails.account_name,
    });

    // Save to database
    const [account] = await db
      .insert(bankAccounts)
      .values({
        userId,
        accountNumber,
        accountName: accountDetails.account_name,
        bankName,
        bankCode,
        recipientCode: recipient.recipient_code,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    logger.info(
      `Bank account added for user ${userId}: ${accountNumber} (${bankName})`
    );

    return {
      id: account.id,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankName: account.bankName,
      bankCode: account.bankCode,
    };
  } catch (error) {
    logger.error("Failed to add bank account:", error);
    throw error;
  }
};

export const removeBankAccount = async (userId, accountId) => {
  try {
    const account = await db
      .select()
      .from(bankAccounts)
      .where(
        and(eq(bankAccounts.id, parseInt(accountId)), eq(bankAccounts.userId, userId))
      )
      .limit(1);

    if (account.length === 0) {
      throw new Error("Bank account not found");
    }

    await db
      .delete(bankAccounts)
      .where(
        and(eq(bankAccounts.id, parseInt(accountId)), eq(bankAccounts.userId, userId))
      );

    logger.info(`Bank account removed for user ${userId}: ${accountId}`);
  } catch (error) {
    logger.error("Failed to remove bank account:", error);
    throw error;
  }
};

export const withdrawFromWallet = async (userId, amount, bankAccountId) => {
  try {
    const wallet = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    if (wallet.length === 0) {
      throw new Error("Wallet not found");
    }

    const walletData = wallet[0];

    if (walletData.balance < amount) {
      throw new Error("Insufficient balance");
    }

    // Get bank account details
    const account = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.id, parseInt(bankAccountId)),
          eq(bankAccounts.userId, userId)
        )
      )
      .limit(1);

    if (account.length === 0) {
      throw new Error("Bank account not found");
    }

    const bankAccount = account[0];

    // Initiate transfer via Flutterwave
    try {
      const transfer = await flutterwaveApi.initiateTransfer({
        amount: amount * 100, // Convert to kobo
        recipientId: bankAccount.recipientCode,
        reason: `Withdrawal to ${bankAccount.accountName}`,
      });

      // Deduct from wallet
      const [updated] = await db
        .update(wallets)
        .set({
          balance: walletData.balance - amount,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, userId))
        .returning();

      // Record transaction
      await db.insert(walletTransactions).values({
        userId,
        type: "withdrawal",
        amount,
        status: "completed",
        reference: transfer.reference || String(transfer.id),
        description: `Withdrawal to ${bankAccount.accountName} (${bankAccount.accountNumber})`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      logger.info(
        `Withdrawal processed for user ${userId}: ₦${amount} to ${bankAccount.accountNumber}`
      );

      return {
        newBalance: updated.balance,
        reference: transfer.reference || String(transfer.id),
        message: "Withdrawal successful",
      };
    } catch (error) {
      logger.error("Flutterwave transfer error:", error);
      throw new Error("Failed to process withdrawal. Please try again.");
    }
  } catch (error) {
    logger.error("Withdrawal error:", error);
    throw error;
  }
};

export const getBanks = async () => {
  try {
    const banks = await flutterwaveApi.getBanks();
    return banks.map((b) => ({
      code: b.code,
      name: b.name,
    }));
  } catch (error) {
    logger.error("Failed to fetch banks:", error);
    throw error;
  }
};

export const resolveAccountDetails = async (accountNumber, bankCode) => {
  try {
    const details = await flutterwaveApi.resolveAccount(accountNumber, bankCode);
    return {
      accountNumber: details.account_number,
      accountName: details.account_name,
    };
  } catch (error) {
    logger.error("Failed to resolve account:", error);
    throw error;
  }
};

export const addFunds = async (userId, amount, reference) => {
  try {
    const wallet = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    if (wallet.length === 0) {
      throw new Error("Wallet not found");
    }

    const [updated] = await db
      .update(wallets)
      .set({
        balance: wallet[0].balance + amount,
        updatedAt: new Date(),
      })
      .where(eq(wallets.userId, userId))
      .returning();

    // Record transaction
    await db.insert(walletTransactions).values({
      userId,
      type: "deposit",
      amount,
      status: "completed",
      reference,
      description: "Fund deposit",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info(`Added ₦${amount} to wallet for user ${userId}`);

    return updated;
  } catch (error) {
    logger.error("Failed to add funds:", error);
    throw error;
  }
};

export const deductFunds = async (userId, amount, reason) => {
  try {
    const wallet = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    if (wallet.length === 0) {
      throw new Error("Wallet not found");
    }

    if (wallet[0].balance < amount) {
      throw new Error("Insufficient balance");
    }

    const [updated] = await db
      .update(wallets)
      .set({
        balance: wallet[0].balance - amount,
        updatedAt: new Date(),
      })
      .where(eq(wallets.userId, userId))
      .returning();

    logger.info(`Deducted ₦${amount} from wallet for user ${userId}`);

    return updated;
  } catch (error) {
    logger.error("Failed to deduct funds:", error);
    throw error;
  }
};


export const creditWalletFromWebhook = async ({
  dvaAccountNumber,
  amountKobo,
  reference,
  description,
}) => {
  try {
    const wallet = await db
      .select()
      .from(wallets)
      .where(eq(wallets.dvaAccountNumber, dvaAccountNumber))
      .limit(1);

    if (wallet.length === 0) {
      logger.error(`Virtual account not found: ${dvaAccountNumber}`);
      throw new Error("Virtual account not found");
    }

    const walletData = wallet[0];
    const amountNaira = amountKobo / 100;

    // Update wallet balance
    const [updated] = await db
      .update(wallets)
      .set({
        balance: walletData.balance + amountNaira,
        updatedAt: new Date(),
      })
      .where(eq(wallets.id, walletData.id))
      .returning();

    // Record transaction
    await db.insert(WalletTransactions).values({
      userId: walletData.userId,
      type: "deposit",
      amount: amountNaira,
      status: "completed",
      reference,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info(
      `Wallet credited for user ${walletData.userId}: ₦${amountNaira} (Ref: ${reference})`
    );

    return updated;
  } catch (error) {
    logger.error("Failed to credit wallet from webhook:", error);
    throw error;
  }
};