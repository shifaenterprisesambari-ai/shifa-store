import { DeliveryPartner } from "../models/user.js";
import Order from "../models/order.js";
import { generateOtp } from "./otpService.js";
import { createNotification } from "./notificationService.js";

/**
 * Transition an accepted order to the available orders queue.
 * Generates a delivery OTP and notifies the customer of their OTP.
 *
 * @param {Object} params
 * @param {Object} params.order - The order document (must be populated with branch)
 * @param {Object} params.io - Socket.io server instance
 * @returns {Promise<Object>} Updated order in "available" state
 */
export const assignDeliveryPartner = async ({ order, io }) => {
  try {
    // Generate plain OTP for delivery verification
    const plainOtp = generateOtp();

    // Update the order to available state
    order.status = "available";
    order.deliveryOtp = plainOtp;
    order.deliveryPartner = undefined; // Ensure no rider is assigned initially
    await order.save();

    // Emit Socket.io event for real-time tracking
    if (io) {
      io.to(order._id.toString()).emit("order-available", {
        orderId: order._id,
        status: "available",
      });
      // Broadcast to all sockets that a new order is available
      io.emit("new-available-order", {
        orderId: order._id,
        branchId: order.branch?._id || order.branch,
      });
    }

    // Notify customer — send plain OTP in notification
    await createNotification({
      recipient: order.customer,
      recipientModel: "Customer",
      title: "Order Accepted & Preparing",
      message: `Your order ${order.orderId} is being prepared by the shop. Your delivery OTP is: ${plainOtp}. Share this only with the delivery partner upon delivery.`,
      type: "rider_assigned",
      orderId: order._id,
      io,
    });

    return order;
  } catch (error) {
    console.error("Failed to make order available:", error);
    throw error;
  }
};

