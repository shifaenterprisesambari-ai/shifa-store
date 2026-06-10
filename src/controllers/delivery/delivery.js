import Order from "../../models/order.js";
import { DeliveryPartner } from "../../models/user.js";
import { verifyOtp } from "../../services/otpService.js";
import { createNotification } from "../../services/notificationService.js";
import { syncChildOrders } from "../../services/orderSyncService.js";

/**
 * Get all orders assigned to the authenticated delivery partner, or available orders in their branch.
 */
export const getAssignedOrders = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { status } = req.query;

    const rider = await DeliveryPartner.findById(userId);
    const branchId = rider?.branch;

    let query;
    if (status === "available") {
      query = {
        status: "available",
        isParent: true,
        ...(branchId ? { branch: branchId } : {})
      };
    } else {
      query = { 
        deliveryPartner: userId,
        isParent: true 
      };
      if (status) {
        query.status = status;
      }
    }

    // Exclude deliveryOtp for security so riders cannot see it
    const orders = await Order.find(query, { deliveryOtp: 0 })
      .populate("customer", "name phone email address")
      .populate("branch", "name address location")
      .populate({
        path: "items.item",
        populate: {
          path: "shop",
          select: "shopName shopAddress email phone"
        }
      })
      .sort({ createdAt: -1 });

    return reply.send(orders);
  } catch (error) {
    console.error("FAILED TO FETCH RIDER ORDERS:", error);
    return reply
      .status(500)
      .send({ message: "Failed to fetch assigned orders", error });
  }
};

/**
 * Delivery partner manually accepts an available delivery offer.
 */
export const acceptDelivery = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { orderId } = req.params;
    const { deliveryPersonLocation } = req.body || {};

    const rider = await DeliveryPartner.findById(userId);
    if (!rider) {
      return reply.status(404).send({ message: "Delivery partner not found" });
    }

    // Count how many active deliveries this rider currently has
    const activeOrdersCount = await Order.countDocuments({
      deliveryPartner: userId,
      status: { $in: ["acceptedByRider", "pickedUp", "outForDelivery"] }
    });

    if (activeOrdersCount >= 3) {
      if (rider.isAvailable) {
        rider.isAvailable = false;
        await rider.save();
      }
      return reply.status(400).send({ message: "You cannot have more than 3 active delivery assignments concurrently" });
    }

    // Find the available order
    const order = await Order.findOne({
      _id: orderId,
      status: "available",
      isParent: true
    }).populate("customer").populate("branch");

    if (!order) {
      return reply
        .status(404)
        .send({ message: "Order is no longer available or already taken by another delivery partner" });
    }

    // Bind rider to order and update status to acceptedByRider
    order.deliveryPartner = userId;
    order.status = "acceptedByRider";
    if (deliveryPersonLocation) {
      order.deliveryPersonLocation = {
        latitude: deliveryPersonLocation.latitude,
        longitude: deliveryPersonLocation.longitude,
        address: deliveryPersonLocation.address || "",
      };
    }
    await order.save();

    // Mark delivery partner as busy if they reached the limit of 3 concurrent active assignments
    const newActiveCount = activeOrdersCount + 1;
    rider.isAvailable = newActiveCount < 3;
    await rider.save();

    const io = req.server.io;
    if (io) {
      io.to(order._id.toString()).emit("order-accepted-by-rider", {
        orderId: order._id,
        status: "acceptedByRider",
        deliveryPartner: {
          _id: rider._id,
          name: rider.name,
          phone: rider.phone,
        },
      });
    }

    // Notify customer
    await createNotification({
      recipient: order.customer._id,
      recipientModel: "Customer",
      title: "Rider Accepted Your Order",
      message: `Delivery partner ${rider.name || "rider"} has accepted your order and is heading to the store. Your delivery OTP is: ${order.deliveryOtp}.`,
      type: "out_for_delivery",
      orderId: order._id,
      io,
    });

    await syncChildOrders({ parentOrder: order, io });

    // Exclude deliveryOtp for security
    const orderObj = order.toObject();
    delete orderObj.deliveryOtp;

    return reply.send({
      message: "Delivery accepted and assigned to you",
      order: orderObj,
    });
  } catch (error) {
    console.error("FAILED TO ACCEPT DELIVERY:", error);
    return reply
      .status(500)
      .send({ message: "Failed to accept delivery", error });
  }
};

/**
 * Delivery partner cancels/releases an accepted delivery assignment.
 */
export const cancelDelivery = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      deliveryPartner: userId,
      isParent: true
    }).populate("customer");

    if (!order) {
      return reply
        .status(404)
        .send({ message: "Order not found or not accepted by you" });
    }

    // Support cancellation in both pre-journey and mid-journey states
    if (!["acceptedByRider", "assigned", "pickedUp", "outForDelivery"].includes(order.status)) {
      return reply.status(400).send({
        message: `Cannot cancel delivery with status: ${order.status}`
      });
    }

    // Release the order back to available state and clear delivery partner
    order.status = "available";
    order.deliveryPartner = undefined;
    await order.save();

    // Mark delivery partner as available again since their active assignments count has decreased
    await DeliveryPartner.findByIdAndUpdate(userId, { isAvailable: true });

    const io = req.server.io;
    if (io) {
      io.to(order._id.toString()).emit("delivery-cancelled-by-rider", {
        orderId: order._id,
        status: "available"
      });
    }

    // Notify customer
    await createNotification({
      recipient: order.customer._id,
      recipientModel: "Customer",
      title: "Rider Sourcing Queue",
      message: `The delivery rider has released your order. It has been placed back in the queue for another nearby rider to accept.`,
      type: "rider_assigned",
      orderId: order._id,
      io,
    });

    await syncChildOrders({ parentOrder: order, io });

    // Exclude deliveryOtp for security
    const orderObj = order.toObject();
    delete orderObj.deliveryOtp;

    return reply.send({
      message: "Delivery cancelled and released successfully",
      order: orderObj,
    });
  } catch (error) {
    console.error("FAILED TO CANCEL DELIVERY:", error);
    return reply
      .status(500)
      .send({ message: "Failed to cancel delivery", error });
  }
};

/**
 * Mark order as picked up from shop.
 */
export const pickupOrder = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      deliveryPartner: userId,
      isParent: true
    });

    if (!order) {
      return reply
        .status(404)
        .send({ message: "Order not found or not assigned to you" });
    }

    if (order.status !== "acceptedByRider") {
      return reply
        .status(400)
        .send({ message: `Cannot pick up order with status: ${order.status}` });
    }

    order.status = "pickedUp";
    await order.save();

    const io = req.server.io;
    if (io) {
      io.to(order._id.toString()).emit("picked-up", {
        orderId: order._id,
        status: "pickedUp",
      });
    }

    await createNotification({
      recipient: order.customer,
      recipientModel: "Customer",
      title: "Order Picked Up",
      message: `Your order ${order.orderId} has been picked up from the shop.`,
      type: "out_for_delivery",
      orderId: order._id,
      io,
    });

    await syncChildOrders({ parentOrder: order, io });

    // Exclude deliveryOtp for security
    const orderObj = order.toObject();
    delete orderObj.deliveryOtp;

    return reply.send({ message: "Order picked up", order: orderObj });
  } catch (error) {
    return reply
      .status(500)
      .send({ message: "Failed to pick up order", error });
  }
};

/**
 * Mark order as out for delivery.
 */
export const startDelivery = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      deliveryPartner: userId,
      isParent: true
    });

    if (!order) {
      return reply
        .status(404)
        .send({ message: "Order not found or not assigned to you" });
    }

    if (order.status !== "pickedUp") {
      return reply.status(400).send({
        message: `Cannot start delivery for order with status: ${order.status}`,
      });
    }

    order.status = "outForDelivery";
    await order.save();

    const io = req.server.io;
    if (io) {
      io.to(order._id.toString()).emit("out-for-delivery", {
        orderId: order._id,
        status: "outForDelivery",
      });
    }

    await createNotification({
      recipient: order.customer,
      recipientModel: "Customer",
      title: "Out For Delivery",
      message: `Your order ${order.orderId} is out for delivery! Share OTP ${order.deliveryOtp} with the delivery partner upon arrival.`,
      type: "out_for_delivery",
      orderId: order._id,
      io,
    });

    await syncChildOrders({ parentOrder: order, io });

    // Exclude deliveryOtp for security
    const orderObj = order.toObject();
    delete orderObj.deliveryOtp;

    return reply.send({ message: "Delivery started", order: orderObj });
  } catch (error) {
    return reply
      .status(500)
      .send({ message: "Failed to start delivery", error });
  }
};

/**
 * Complete delivery — requires OTP verification.
 */
export const completeDelivery = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { orderId } = req.params;
    const { otp } = req.body;

    if (!otp) {
      return reply.status(400).send({ message: "OTP is required" });
    }

    const order = await Order.findOne({
      _id: orderId,
      deliveryPartner: userId,
      isParent: true
    });

    if (!order) {
      return reply
        .status(404)
        .send({ message: "Order not found or not assigned to you" });
    }

    if (order.status !== "outForDelivery") {
      return reply.status(400).send({
        message: `Cannot complete order with status: ${order.status}`,
      });
    }

    // Verify OTP
    const isValidOtp = await verifyOtp(otp, order.deliveryOtp);
    if (!isValidOtp) {
      return reply.status(400).send({ message: "Invalid OTP" });
    }

    order.status = "delivered";
    order.otpVerified = true;
    await order.save();

    // Mark delivery partner as available again since their active assignments count has decreased
    await DeliveryPartner.findByIdAndUpdate(userId, { isAvailable: true });

    const io = req.server.io;
    if (io) {
      io.to(order._id.toString()).emit("delivered", {
        orderId: order._id,
        status: "delivered",
      });
    }

    // Notify customer
    await createNotification({
      recipient: order.customer,
      recipientModel: "Customer",
      title: "Order Delivered",
      message: `Your order ${order.orderId} has been delivered successfully!`,
      type: "delivered",
      orderId: order._id,
      io,
    });

    // Notify delivery partner
    await createNotification({
      recipient: userId,
      recipientModel: "DeliveryPartner",
      title: "Delivery Completed",
      message: `You have successfully delivered order ${order.orderId}.`,
      type: "delivery_completed",
      orderId: order._id,
      io,
    });

    await syncChildOrders({ parentOrder: order, io });

    // Exclude deliveryOtp for security
    const orderObj = order.toObject();
    delete orderObj.deliveryOtp;

    return reply.send({ message: "Delivery completed successfully", order: orderObj });
  } catch (error) {
    return reply
      .status(500)
      .send({ message: "Failed to complete delivery", error });
  }
};

/**
 * Update delivery partner's live location and broadcast to order room.
 */
export const updateLocation = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { latitude, longitude, orderId } = req.body;

    if (!latitude || !longitude) {
      return reply
        .status(400)
        .send({ message: "Latitude and longitude are required" });
    }

    // Update delivery partner's live location
    await DeliveryPartner.findByIdAndUpdate(userId, {
      liveLocation: { latitude, longitude },
    });

    // If orderId provided, update order's deliveryPersonLocation and broadcast
    if (orderId) {
      const updatedOrder = await Order.findByIdAndUpdate(orderId, {
        deliveryPersonLocation: { latitude, longitude },
      }, { new: true });

      const io = req.server.io;
      if (io) {
        io.to(orderId.toString()).emit("location-updated", {
          orderId,
          deliveryPersonLocation: { latitude, longitude },
        });
      }

      if (updatedOrder && updatedOrder.parentOrder) {
        await Order.findByIdAndUpdate(updatedOrder.parentOrder, {
          deliveryPersonLocation: { latitude, longitude },
        });
        if (io) {
          io.to(updatedOrder.parentOrder.toString()).emit("location-updated", {
            orderId: updatedOrder.parentOrder,
            deliveryPersonLocation: { latitude, longitude },
          });
        }
      }
    }

    return reply.send({ message: "Location updated" });
  } catch (error) {
    return reply
      .status(500)
      .send({ message: "Failed to update location", error });
  }
};

