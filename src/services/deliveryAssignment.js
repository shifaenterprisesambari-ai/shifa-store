import { DeliveryPartner } from "../models/user.js";
import Order from "../models/order.js";
import { generateOtp } from "./otpService.js";
import { createNotification } from "./notificationService.js";
import { syncParentOrderStatus } from "./orderSyncService.js";

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
    const children = await Order.find({ parentOrder: order._id });
    let plainOtp = "";
    let isMultiOtp = false;

    if (children && children.length > 0) {
      const shopOwnerIds = children.map(c => c.shopOwner?.toString()).filter(Boolean);
      const uniqueShopOwners = [...new Set(shopOwnerIds)];

      if (uniqueShopOwners.length > 1) {
        isMultiOtp = true;
        order.deliveryOtp = "Multiple OTPs";
        for (const child of children) {
          const childOtp = generateOtp();
          child.deliveryOtp = childOtp;
          await child.save();
        }
      } else {
        plainOtp = generateOtp();
        order.deliveryOtp = plainOtp;
        for (const child of children) {
          child.deliveryOtp = plainOtp;
          await child.save();
        }
      }
    } else {
      plainOtp = generateOtp();
      order.deliveryOtp = plainOtp;
    }

    // Update the order to available state
    order.status = "available";
    order.deliveryPartner = undefined; // Ensure no rider is assigned initially
    await order.save();

    const { syncChildOrders } = await import("./orderSyncService.js");
    await syncChildOrders({ parentOrder: order, io });

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

    // Construct notification message
    let notificationMessage = "";
    if (isMultiOtp) {
      const childOrdersWithShops = await Order.find({ parentOrder: order._id }).populate({
        path: "items.item",
        populate: { path: "shop", select: "shopName" }
      });
      notificationMessage = `Your order ${order.orderId} is being prepared. It contains items from multiple shops, requiring separate delivery OTPs:\n`;
      for (const child of childOrdersWithShops) {
        const shopName = child.items?.[0]?.item?.shop?.shopName || "Shop";
        notificationMessage += `- ${shopName}: OTP ${child.deliveryOtp}\n`;
      }
      notificationMessage += "Share each OTP only with the delivery partner upon receiving items from that shop.";
    } else {
      notificationMessage = `Your order ${order.orderId} is being prepared by the shop. Your delivery OTP is: ${order.deliveryOtp || plainOtp}. Share this only with the delivery partner upon delivery.`;
    }

    // Notify customer — send plain OTP in notification
    await createNotification({
      recipient: order.customer,
      recipientModel: "Customer",
      title: "Order Accepted & Preparing",
      message: notificationMessage,
      type: "rider_assigned",
      orderId: order._id,
      io,
    });

    // Notify delivery partners in the branch
    const queryConditions = { isAvailable: true };
    if (order.branch) {
      queryConditions.branch = order.branch;
    }
    const riders = await DeliveryPartner.find(queryConditions);
    for (const rider of riders) {
      await createNotification({
        recipient: rider._id,
        recipientModel: "DeliveryPartner",
        title: "New Delivery Offer",
        message: `New order ${order.orderId} is available for delivery at ${order.pickupLocation?.address || 'the branch'}.`,
        type: "new_delivery_assignment",
        orderId: order._id,
        io,
      });
    }

    await syncParentOrderStatus({ parentOrderId: order.parentOrder, io });

    return order;
  } catch (error) {
    console.error("Failed to make order available:", error);
    throw error;
  }
};

