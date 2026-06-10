import Notification from "../models/notification.js";
import webpush from "web-push";

// Configure VAPID keys if set in environment
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:admin@shifastore.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Create a notification in the database and emit it via Socket.io if available.
 *
 * @param {Object} params
 * @param {string} params.recipient - User ObjectId
 * @param {string} params.recipientModel - "Customer" | "ShopOwner" | "DeliveryPartner"
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification body
 * @param {string} params.type - Notification type enum value
 * @param {string} [params.orderId] - Associated order ObjectId
 * @param {Object} [params.io] - Socket.io server instance (optional)
 * @returns {Promise<Object>} The saved notification document
 */
export const createNotification = async ({
  recipient,
  recipientModel,
  title,
  message,
  type,
  orderId = null,
  io = null,
}) => {
  try {
    const notification = new Notification({
      recipient,
      recipientModel,
      title,
      message,
      type,
      orderId,
    });

    await notification.save();

    // Emit real-time notification to user-specific room
    if (io) {
      io.to(`user-${recipient.toString()}`).emit("notification", {
        _id: notification._id,
        title,
        message,
        type,
        orderId,
        isRead: false,
        createdAt: notification.createdAt,
      });
    }

    // Send Web Push Notification in the background
    try {
      const PushSubscription = (await import("../models/pushSubscription.js")).default;
      const subs = await PushSubscription.find({ user: recipient });

      const payload = JSON.stringify({
        title,
        body: message,
        url: orderId ? `/order-tracking/${orderId}` : "/",
      });

      for (const sub of subs) {
        await webpush.sendNotification(sub.subscription, payload);
      }
    } catch (pushErr) {
      console.error("Failed to send web push notifications:", pushErr);
    }

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    throw error;
  }
};
