import Order from "../models/order.js";

/**
 * Syncs status, rider, OTP, and location from child orders to their parent order.
 *
 * @param {Object} params
 * @param {string} params.parentOrderId - The parent order ObjectId
 * @param {Object} params.io - Socket.io server instance
 */
export const syncParentOrderStatus = async ({ parentOrderId, io }) => {
  try {
    if (!parentOrderId) return;
    const parentOrder = await Order.findById(parentOrderId);
    if (!parentOrder) return;

    const children = await Order.find({ parentOrder: parentOrderId });
    if (children.length === 0) return;

    const statuses = children.map((c) => c.status);

    // Aggregate child statuses into a consolidated parent status
    let newStatus = "pending";
    if (statuses.every((s) => s === "delivered")) {
      newStatus = "delivered";
    } else if (statuses.includes("outForDelivery")) {
      newStatus = "outForDelivery";
    } else if (statuses.includes("pickedUp")) {
      newStatus = "pickedUp";
    } else if (statuses.includes("acceptedByRider")) {
      newStatus = "acceptedByRider";
    } else if (statuses.every((s) => ["rejected", "cancelled"].includes(s))) {
      newStatus = "rejected";
    } else if (statuses.includes("available") || statuses.includes("accepted")) {
      newStatus = "accepted";
    }

    parentOrder.status = newStatus;

    // Sync delivery partner info from any active child order
    const activeChildWithRider = children.find((c) => c.deliveryPartner);
    if (activeChildWithRider) {
      parentOrder.deliveryPartner = activeChildWithRider.deliveryPartner;
    }

    // Sync OTP from any active child order
    const activeChildWithOtp = children.find((c) => c.deliveryOtp);
    if (activeChildWithOtp) {
      parentOrder.deliveryOtp = activeChildWithOtp.deliveryOtp;
    }

    // Sync rider location from any active child order
    const activeChildWithLoc = children.find(
      (c) => c.deliveryPersonLocation?.latitude
    );
    if (activeChildWithLoc) {
      parentOrder.deliveryPersonLocation = activeChildWithLoc.deliveryPersonLocation;
    }

    await parentOrder.save();

    const populatedParent = await Order.findById(parentOrderId).populate(
      "customer branch items.item deliveryPartner"
    );

    if (io && populatedParent) {
      // Emit tracking updates to parent room
      io.to(parentOrderId.toString()).emit("liveTrackingUpdates", populatedParent);

      const eventNameMap = {
        accepted: "order-accepted",
        available: "order-available",
        acceptedByRider: "order-accepted-by-rider",
        pickedUp: "picked-up",
        outForDelivery: "out-for-delivery",
        delivered: "delivered",
        rejected: "order-rejected",
        cancelled: "order-cancelled",
      };
      const eventName = eventNameMap[newStatus];
      if (eventName) {
        io.to(parentOrderId.toString()).emit(eventName, populatedParent);
      }
    }
  } catch (error) {
    console.error("Error syncing parent order status:", error);
  }
};
