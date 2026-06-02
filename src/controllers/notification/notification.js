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
