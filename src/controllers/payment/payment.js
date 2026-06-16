import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../../models/order.js";
import { createNotification } from "../../services/notificationService.js";

const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

/**
 * STEP 1: BACKEND - Create Order
 * Endpoint: POST /api/create-order
 */
export const createRazorpayOrder = async (req, reply) => {
  try {
    const { amount, currency, receipt } = req.body || {};

    // Validate amount is present and >= 100 paise
    if (amount === undefined || amount === null) {
      return reply.status(400).send({ message: "Amount is required" });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 100) {
      return reply.status(400).send({ message: "Amount must be at least 100 paise" });
    }

    const razorpay = getRazorpayInstance();
    const options = {
      amount: Math.round(numericAmount),
      currency: currency || "INR",
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    return reply.status(201).send({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Razorpay order creation failed:", error);
    return reply.status(500).send({
      message: "Failed to create Razorpay order",
      error: error.message || error,
    });
  }
};

/**
 * STEP 3: BACKEND - Verify Signature
 * Endpoint: POST /api/verify-payment
 */
export const verifyRazorpayPayment = async (req, reply) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body || {};
    const userId = req.user?.userId;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return reply.status(400).send({ message: "Missing required payment fields" });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      // Signature mismatch: update database order (if any) to failed
      await Order.updateMany(
        { razorpayOrderId: razorpay_order_id },
        { $set: { paymentStatus: "failed" } }
      );
      return reply.status(400).send({ message: "Invalid payment signature" });
    }

    // Check if there's a matching database parent order
    const parentOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id, isParent: true });
    
    if (parentOrder) {
      if (parentOrder.paymentStatus === "paid") {
        return reply.send({
          message: "Payment already verified",
          order: parentOrder,
        });
      }

      // Update parent order
      parentOrder.paymentStatus = "paid";
      parentOrder.razorpayPaymentId = razorpay_payment_id;
      parentOrder.razorpaySignature = razorpay_signature;
      await parentOrder.save();

      // Update child orders
      const childOrders = await Order.find({ parentOrder: parentOrder._id });
      for (const child of childOrders) {
        child.paymentStatus = "paid";
        child.razorpayPaymentId = razorpay_payment_id;
        child.razorpaySignature = razorpay_signature;
        await child.save();
      }

      const io = req.server.io;

      // Notify shop owners of child orders
      for (const child of childOrders) {
        if (child.shopOwner) {
          const populatedChild = await Order.findById(child._id).populate("items.item");
          const itemDetailsText = populatedChild.items
            .map(it => `${it.item?.name || "Product"} (x${it.count})`)
            .join(", ");

          await createNotification({
            recipient: child.shopOwner,
            recipientModel: "ShopOwner",
            title: "New Order",
            message: `New order ${child.orderId} containing: ${itemDetailsText} has been placed.`,
            type: "order_placed",
            orderId: child._id,
            io,
          });
        }
      }

      // Emit socket events to order room
      if (io) {
        io.to(parentOrder._id.toString()).emit("order-created", {
          orderId: parentOrder._id,
          status: "pending",
        });
      }

      // Notify customer (if userId is available)
      if (userId) {
        await createNotification({
          recipient: userId,
          recipientModel: "Customer",
          title: "Order Placed",
          message: `Your order ${parentOrder.orderId} has been placed successfully.`,
          type: "order_placed",
          orderId: parentOrder._id,
          io,
        });
      }

      const populatedParent = await Order.findById(parentOrder._id)
        .populate("customer branch deliveryPartner")
        .populate({
          path: "items.item",
        });

      return reply.send({
        message: "Payment verified successfully",
        order: populatedParent,
      });
    }

    // If no matching database order is found, return generic success
    return reply.send({
      message: "Payment verified successfully",
      status: "success",
    });
  } catch (error) {
    console.error("Payment verification failed:", error);
    return reply.status(500).send({
      message: "Failed to verify payment",
      error: error.message || error,
    });
  }
};
