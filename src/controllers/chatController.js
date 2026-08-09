import * as chatService from "#services/chatService.js";

export const getMyThread = async (req, res) => {
  try {
    const thread = await chatService.getOrCreateThread(req.user.id);
    const messages = await chatService.getThreadMessages(thread.id);
    await chatService.markThreadRead(thread.id, "vendor");
    res.status(200).json({ thread, messages });
  } catch (error) {
    res.status(500).json({ message: "Error loading chat" });
  }
};

export const sendVendorMessage = async (req, res) => {
  try {
    const thread = await chatService.getOrCreateThread(req.user.id);
    const message = await chatService.sendMessage({
      threadId: thread.id,
      senderType: "vendor",
      senderId: req.user.id,
      message: req.body.message,
    });
    res.status(201).json({ message });
  } catch (error) {
    res.status(400).json({ message: "Could not send message" });
  }
};

export const getAllThreads = async (req, res) => {
  try {
    const threads = await chatService.getAllThreadsForAdmin();
    res.status(200).json({ threads });
  } catch (error) {
    res.status(500).json({ message: "Error loading threads" });
  }
};

export const getThreadMessages = async (req, res) => {
  try {
    const messages = await chatService.getThreadMessages(req.params.threadId);
    await chatService.markThreadRead(req.params.threadId, "admin");
    res.status(200).json({ messages });
  } catch (error) {
    res.status(500).json({ message: "Error loading messages" });
  }
};

export const sendAdminMessage = async (req, res) => {
  try {
    const message = await chatService.sendMessage({
      threadId: req.params.threadId,
      senderType: "admin",
      senderId: req.admin.id,
      message: req.body.message,
    });
    res.status(201).json({ message });
  } catch (error) {
    res.status(400).json({ message: "Could not send message" });
  }
};
