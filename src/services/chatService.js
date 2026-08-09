import { db } from "#config/database.js";
import { getIo } from "#config/socket.js";
import { chatMessages, chatThreads } from "#models/chat.js";
import { users } from "#models/user.js";
import { and, desc, eq } from "drizzle-orm";

export const getOrCreateThread = async (userId) => {
  const existing = await db
    .select()
    .from(chatThreads)
    .where(eq(chatThreads.userId, userId))
    .limit(1);
  if (existing.length > 0) return existing[0];

  const [thread] = await db.insert(chatThreads).values({ userId }).returning();
  return thread;
};

export const getThreadMessages = async (threadId) => {
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(chatMessages.createdAt);
};

export const sendMessage = async ({
  threadId,
  senderType,
  senderId,
  message,
}) => {
  const [newMessage] = await db
    .insert(chatMessages)
    .values({ threadId, senderType, senderId, message })
    .returning();

  await db
    .update(chatThreads)
    .set({ lastMessageAt: new Date() })
    .where(eq(chatThreads.id, threadId));

  const io = getIo();
  if (io) {
    const thread = await db
      .select()
      .from(chatThreads)
      .where(eq(chatThreads.id, threadId))
      .limit(1);
    io.to(`thread_${threadId}`).emit("new_message", newMessage);
    if (senderType === "vendor") {
      io.to("admins").emit("thread_updated", {
        threadId,
        userId: thread[0].userId,
      });
    } else {
      io.to(`vendor_${thread[0].userId}`).emit("thread_updated", { threadId });
    }
  }

  return newMessage;
};

export const getAllThreadsForAdmin = async () => {
  const threads = await db
    .select()
    .from(chatThreads)
    .orderBy(desc(chatThreads.lastMessageAt));

  return Promise.all(
    threads.map(async (thread) => {
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, thread.userId))
        .limit(1);
      const unreadCount = await db
        .select()
        .from(chatMessages)
        .where(
          and(
            eq(chatMessages.threadId, thread.id),
            eq(chatMessages.senderType, "vendor"),
            eq(chatMessages.isRead, false),
          ),
        );

      return {
        ...thread,
        vendorName: userResult[0]
          ? `${userResult[0].firstName} ${userResult[0].lastName}`
          : "Unknown",
        vendorEmail: userResult[0]?.email,
        unreadCount: unreadCount.length,
      };
    }),
  );
};

export const markThreadRead = async (threadId, readerType) => {
  const otherType = readerType === "admin" ? "vendor" : "admin";
  await db
    .update(chatMessages)
    .set({ isRead: true })
    .where(
      and(
        eq(chatMessages.threadId, threadId),
        eq(chatMessages.senderType, otherType),
      ),
    );
};
