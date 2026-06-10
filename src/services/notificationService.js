import Notification from "../models/notification.js";
import webpush from "web-push";
import { sendWhatsApp } from "./whatsappService.js";
import { Customer, ShopOwner, DeliveryPartner } from "../models/user.js";

// Configure VAPID keys if set in environment
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:admin@shifastore.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Resolve the phone number for a given recipient user.
 */
const getPhoneForUser = async (recipient, recipientModel) => {
  try {
    let user = null;
    if (recipientModel === "Customer") {
      user = await Customer.findById(recipient).select("phone").lean();
    } else if (recipientModel === "ShopOwner") {
      user = await ShopOwner.findById(recipient).select("phone").lean();
    } else if (recipientModel === "DeliveryPartner") {
      user = await DeliveryPartner.findById(recipient).select("phone").lean();
    }
    return user?.phone || null;
  } catch {
    return null;
  }
};

/**
 * Create a notification in the database, emit it via Socket.io,
 * send a Web Push notification, and send a WhatsApp message.
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
    // 1. Save to database
    const notification = new Notification({
      recipient,
      recipientModel,
      title,
      message,
      type,
      orderId,
    });
    await notification.save();

    // 2. Emit real-time Socket.io notification
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

    // 3. Web Push (background, non-blocking)
    sendWebPush(recipient, title, message, orderId).catch((e) =>
      console.error("Web push error:", e.message)
    );

    // 4. WhatsApp (background, non-blocking)
    sendWhatsAppNotification(recipient, recipientModel, title, message).catch((e) =>
      console.error("WhatsApp error:", e.message)
    );

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    throw error;
  }
};

// ── Internal helpers ─────────────────────────────────────────────────

async function sendWebPush(recipient, title, message, orderId) {
  try {
    const PushSubscription = (await import("../models/pushSubscription.js")).default;
    const subs = await PushSubscription.find({ user: recipient });

    if (subs.length === 0) return;

    const payload = JSON.stringify({
      title,
      body: message,
      url: orderId ? `/order-tracking/${orderId}` : "/",
      tag: `order-${orderId || "general"}`,
    });

    const results = await Promise.allSettled(
      subs.map((sub) => webpush.sendNotification(sub.subscription, payload))
    );

    // Clean up expired/invalid subscriptions
    const PushSubscriptionModel = (await import("../models/pushSubscription.js")).default;
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === "rejected") {
        const err = results[i].reason;
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired — remove it
          await PushSubscriptionModel.deleteOne({ _id: subs[i]._id });
          console.log("Removed expired push subscription:", subs[i]._id);
        } else {
          console.error("Push send error:", err.message);
        }
      }
    }
  } catch (err) {
    console.error("sendWebPush failed:", err.message);
  }
}

async function sendWhatsAppNotification(recipient, recipientModel, title, message) {
  const phone = await getPhoneForUser(recipient, recipientModel);
  if (!phone) return;

  const whatsappText = `*${title}*\n${message}\n\n_Shifa Store_`;
  await sendWhatsApp(phone, whatsappText);
}
