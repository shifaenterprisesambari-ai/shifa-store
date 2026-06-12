import Order from "../models/order.js";

/**
 * Syncs status from child orders to their parent order.
 * Triggers delivery partner assignment on the parent order when all child orders are accepted.
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

    // 1. Rider-locking logic: if rider is already assigned, auto-sync any newly accepted child orders
    if (parentOrder.deliveryPartner) {
      for (const child of children) {
        if (child.status === "accepted") {
          child.status = parentOrder.status === "available" ? "accepted" : parentOrder.status;
          child.deliveryPartner = parentOrder.deliveryPartner;
          if (parentOrder.deliveryOtp !== "Multiple OTPs") {
            child.deliveryOtp = parentOrder.deliveryOtp;
          }
          child.deliveryPersonLocation = parentOrder.deliveryPersonLocation;
          await child.save();

          if (io) {
            io.to(child._id.toString()).emit("liveTrackingUpdates", child);
          }
        }
      }
    } else {
      // 2. Instant-sourcing logic: as soon as ANY shop owner accepts, make parent order available to riders
      if (["pending", "accepted"].includes(parentOrder.status)) {
        const hasAccepted = children.some((c) => c.status === "accepted");
        if (hasAccepted) {
          const { assignDeliveryPartner } = await import("./deliveryAssignment.js");
          await assignDeliveryPartner({ order: parentOrder, io });
          return;
        }
      }
    }

    let newStatus = parentOrder.status;

    // Status aggregation logic
    if (["pending", "accepted", "available"].includes(parentOrder.status)) {
      if (statuses.every((s) => ["rejected", "cancelled"].includes(s))) {
        newStatus = "rejected";
      } else if (statuses.includes("accepted")) {
        newStatus = "accepted";
      } else {
        newStatus = "pending";
      }
    } else {
      // If parent has a rider, it completes when all non-rejected products are delivered
      const activeChildren = children.filter((c) => c.status !== "rejected" && c.status !== "cancelled");
      if (activeChildren.length > 0 && activeChildren.every((c) => c.status === "delivered")) {
        newStatus = "delivered";
      }
    }

    if (parentOrder.status !== newStatus) {
      parentOrder.status = newStatus;
      await parentOrder.save();
    }

    const populatedParent = await Order.findById(parentOrderId)
      .populate("customer branch deliveryPartner")
      .populate({
        path: "items.item",
        populate: {
          path: "shop",
          select: "shopName shopAddress email phone"
        }
      });

    if (populatedParent) {
      const parentObj = populatedParent.toObject();
      const childrenList = await Order.find({ parentOrder: parentOrderId });
      parentObj.childOrders = childrenList;

      if (io) {
        // Emit tracking updates to parent room
        io.to(parentOrderId.toString()).emit("liveTrackingUpdates", parentObj);

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
          io.to(parentOrderId.toString()).emit(eventName, parentObj);
        }
      }
    }
  } catch (error) {
    console.error("Error syncing parent order status:", error);
  }
};

/**
 * Syncs status, rider, OTP, and location from a parent order to all its child orders.
 *
 * @param {Object} params
 * @param {Object} params.parentOrder - The parent order document
 * @param {Object} params.io - Socket.io server instance
 */
export const syncChildOrders = async ({ parentOrder, io }) => {
  try {
    if (!parentOrder || !parentOrder.isParent) return;

    const children = await Order.find({ parentOrder: parentOrder._id });
    if (children.length === 0) return;

    const childStatusMap = {
      pending: "pending",
      accepted: "accepted",
      available: "accepted", // child orders stay accepted when parent is available
      acceptedByRider: "acceptedByRider",
      pickedUp: "pickedUp",
      outForDelivery: "outForDelivery",
      delivered: "delivered",
      cancelled: "cancelled",
      rejected: "rejected",
    };

    const targetChildStatus = childStatusMap[parentOrder.status] || "accepted";

    for (const child of children) {
      // 1. Keep already finalized/rejected/cancelled child orders unchanged
      if (["rejected", "cancelled", "delivered"].includes(child.status)) {
        continue;
      }

      // 2. Keep pending orders as pending, but sync the rider, location, and OTP
      if (child.status === "pending") {
        child.deliveryPartner = parentOrder.deliveryPartner;
        child.deliveryPersonLocation = parentOrder.deliveryPersonLocation;
        if (parentOrder.deliveryOtp !== "Multiple OTPs") {
          child.deliveryOtp = parentOrder.deliveryOtp;
        }
        await child.save();

        if (io) {
          io.to(child._id.toString()).emit("liveTrackingUpdates", child);
        }
        continue;
      }

      child.status = targetChildStatus;
      child.deliveryPartner = parentOrder.deliveryPartner;
      child.deliveryPersonLocation = parentOrder.deliveryPersonLocation;
      if (parentOrder.deliveryOtp !== "Multiple OTPs") {
        child.deliveryOtp = parentOrder.deliveryOtp;
      }
      await child.save();

      if (io) {
        // Emit events for each child order to keep their tracking/shop rooms updated
        io.to(child._id.toString()).emit("liveTrackingUpdates", child);
      }

      // Notify individual shop owners when order is delivered
      if (parentOrder.status === "delivered" && child.shopOwner) {
        try {
          const { createNotification } = await import("./notificationService.js");
          await createNotification({
            recipient: child.shopOwner,
            recipientModel: "ShopOwner",
            title: "Order Delivered",
            message: `Order ${child.orderId} has been delivered to the customer.`,
            type: "delivery_completed",
            orderId: child._id,
            io,
          });
        } catch (err) {
          console.error(`Failed to notify shop owner of delivery for child ${child._id}:`, err);
        }
      }
    }
  } catch (error) {
    console.error("Error syncing child orders from parent:", error);
  }
};
