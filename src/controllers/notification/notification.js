import Notification from "../../models/notification.js";

/**
 * Get notifications for the authenticated user.
 */
export const getNotifications = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 20, unreadOnly } = req.query;

    const query = { recipient: userId };
    if (unreadOnly === "true") {
      query.isRead = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: userId, isRead: false }),
    ]);

    return reply.send({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      unreadCount,
    });
  } catch (error) {
    return reply
      .status(500)
      .send({ message: "Failed to fetch notifications", error });
  }
};

/**
 * Mark a single notification as read.
 */
export const markAsRead = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return reply.status(404).send({ message: "Notification not found" });
    }

    return reply.send({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    return reply
      .status(500)
      .send({ message: "Failed to mark notification as read", error });
  }
};

/**
 * Mark all notifications as read for the authenticated user.
 */
export const markAllAsRead = async (req, reply) => {
  try {
    const { userId } = req.user;

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );

    return reply.send({ message: "All notifications marked as read" });
  } catch (error) {
    return reply
      .status(500)
      .send({ message: "Failed to mark notifications as read", error });
  }
};

/**
 * Subscribe a device/user for push notifications.
 */
export const subscribeUser = async (req, reply) => {
  try {
    const { userId, role } = req.user;
    const subscription = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return reply.status(400).send({ message: "Invalid subscription details" });
    }

    // Import dynamically or at top. Mongoose models are registered globally.
    const PushSubscription = (await import("../../models/pushSubscription.js")).default;

    // Upsert subscription to prevent duplicates
    await PushSubscription.findOneAndUpdate(
      { user: userId, "subscription.endpoint": subscription.endpoint },
      {
        user: userId,
        userModel: role,
        subscription: subscription,
      },
      { upsert: true, new: true }
    );

    return reply.status(201).send({ message: "Subscribed successfully" });
  } catch (error) {
    console.error("Subscription failed:", error);
    return reply.status(500).send({ message: "Subscription failed", error });
  }
};

/**
 * Get VAPID public key.
 */
export const getVapidPublicKey = async (req, reply) => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return reply.status(500).send({ message: "VAPID key not configured on server" });
    }
    return reply.send({ publicKey });
  } catch (error) {
    return reply.status(500).send({ message: "Failed to get VAPID key", error });
  }
};
