import Order from "../../models/order.js";
import { assignDeliveryPartner } from "../../services/deliveryAssignment.js";
import { createNotification } from "../../services/notificationService.js";
import { syncParentOrderStatus } from "../../services/orderSyncService.js";

/**
 * Get orders for the shop owner's branch, filtered by status.
 */
export const getShopOrders = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { status } = req.query;

    // Query only this specific shop owner's orders — do NOT include the shared
    // branch condition, which would leak other owners' orders to each other.
    const query = { shopOwner: userId };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate("customer", "name phone email")
      .populate("deliveryPartner", "name phone")
      .populate("items.item")
      .populate("branch", "name address")
      .sort({ createdAt: -1 });

    return reply.send(orders);
  } catch (error) {
    return reply
      .status(500)
      .send({ message: "Failed to fetch orders", error });
  }
};

/**
 * Accept an order — triggers automatic delivery partner assignment.
 */
export const acceptOrder = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { orderId } = req.params;

    const order = await Order.findOne({ 
      _id: orderId, 
      shopOwner: userId,
    });

    if (!order) {
      return reply
        .status(404)
        .send({ message: "Order not found or unauthorized" });
    }

    if (order.status !== "pending") {
      return reply
        .status(400)
        .send({ message: `Cannot accept order with status: ${order.status}` });
    }

    // Update status to accepted
    order.status = "accepted";
    await order.save();

    // Emit Socket.io event
    const io = req.server.io;
    if (io) {
      io.to(order._id.toString()).emit("order-accepted", {
        orderId: order._id,
        status: "accepted",
      });
    }

    // Notify customer
    await createNotification({
      recipient: order.customer,
      recipientModel: "Customer",
      title: "Order Accepted",
      message: `Your order ${order.orderId} has been accepted by the shop. A delivery partner will be assigned shortly.`,
      type: "order_accepted",
      orderId: order._id,
      io,
    });

    // Auto-assign delivery partner
    const updatedOrder = await assignDeliveryPartner({ order, io });

    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate("customer", "name phone email")
      .populate("deliveryPartner", "name phone")
      .populate("items.item")
      .populate("branch", "name address");

    return reply.send({
      message: "Order accepted successfully",
      order: populatedOrder,
    });
  } catch (error) {
    console.error("FAILED TO ACCEPT ORDER:", error);
    return reply
      .status(500)
      .send({ message: "Failed to accept order", error });
  }
};

/**
 * Reject an order with a reason.
 */
export const rejectOrder = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ 
      _id: orderId, 
      shopOwner: userId,
    });

    if (!order) {
      return reply
        .status(404)
        .send({ message: "Order not found or unauthorized" });
    }

    if (order.status !== "pending") {
      return reply
        .status(400)
        .send({ message: `Cannot reject order with status: ${order.status}` });
    }

    order.status = "rejected";
    order.rejectionReason = reason || "Order rejected by shop";
    await order.save();

    // Notify customer
    const io = req.server.io;
    await createNotification({
      recipient: order.customer,
      recipientModel: "Customer",
      title: "Order Rejected",
      message: `Your order ${order.orderId} has been rejected. Reason: ${order.rejectionReason}`,
      type: "order_rejected",
      orderId: order._id,
      io,
    });

    await syncParentOrderStatus({ parentOrderId: order.parentOrder, io });

    return reply.send({
      message: "Order rejected",
      order,
    });
  } catch (error) {
    console.error("FAILED TO REJECT ORDER:", error);
    return reply
      .status(500)
      .send({ message: "Failed to reject order", error });
  }
};
