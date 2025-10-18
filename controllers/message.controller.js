import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";

export const sendMessage = async (req, res) => {
  try {
    const senderID = req.id;
    const receiverID = req.params.id;
    const { message } = req.body;
    if (!message) {
      return res
        .status(400)
        .json({ message: "Message is required!!!", success: false });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [senderID, receiverID] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderID, receiverID],
        messages: [],
      });
    }
    const newMessage = await Message.create({
      senderID,
      receiverID,
      message,
    });
    conversation.messages.push(newMessage._id);
    await Promise.all[(conversation.save(), newMessage.save())];

    return res.status(201).json({
      newMessage,
      success: true,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An unexpected error occerred!!!", success: false });
  }
};

export const getMessage = async (req, res) => {
  try {
    const senderID = req.id;
    const receiverID = req.params.id;
    const conversation = await Conversation.find({
      participants: { $all: [senderID, receiverID] },
    });
    if (!conversation) {
      return res.status(200).json({
        success: true,
        messages: [],
      });
    }
    return res.status(200).json({
      success: true,
      messages: conversation.messages,
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        message: "An unexpected error occurred!!!",
        success: false,
        error: error.message,
      });
  }
};
