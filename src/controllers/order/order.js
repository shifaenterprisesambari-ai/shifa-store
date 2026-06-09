import mongoose from "mongoose";
import Order from "../../models/order.js";
import Branch from "../../models/branch.js";
import Product from "../../models/products.js";
import { Customer, DeliveryPartner, ShopOwner } from "../../models/user.js";
import { createNotification } from "../../services/notificationService.js";
import { verifyOtp } from "../../services/otpService.js";


export const createOrder = async(req,reply)=>{
    console.log("POST /order request received! Body:", req.body);
    try {
        const {userId}=req.user;
        const { items, branch, totalPrice} = req.body
        
        const customerData= await Customer.findById(userId)

        // Resolve branch: check if it's a direct branch ID, shopOwner ID, or matching a shopOwner's shop field
        let branchId = branch;
        let branchData = await Branch.findById(branchId);

        if (!branchData && branchId) {
            const queryConditions = [];
            if (mongoose.isValidObjectId(branchId)) {
                queryConditions.push({ _id: branchId });
            }
            // Always allow matching custom string/ObjectId shop fields
            queryConditions.push({ shop: branchId });

            const shopOwner = await ShopOwner.findOne({ $or: queryConditions });
            if (shopOwner && shopOwner.branch) {
                branchId = shopOwner.branch;
                branchData = await Branch.findById(branchId);
            }
        }

        // Final Fallback: If no branch could be resolved, default to the first available branch in the database
        if (!branchData) {
            branchData = await Branch.findOne();
            if (branchData) {
                branchId = branchData._id;
            }
        }
        
        if(!customerData){
           return reply.status(404).send({ message: "Customer not found" });
        }

        if(!branchData){
           return reply.status(404).send({ message: "Branch not found" });
        }

        // Retrieve a real database product as a fallback for mock/demo item IDs
        const firstProduct = await Product.findOne();
        console.log("createOrder debug - firstProduct:", firstProduct);

        const mappedItems = items.map((item) => {
            let itemId = item.id || item.item;
            let productObjectId = itemId;

            if (!mongoose.isValidObjectId(itemId)) {
                productObjectId = firstProduct ? firstProduct._id : new mongoose.Types.ObjectId();
                console.log(`createOrder debug - mapped invalid itemId ${itemId} to ${productObjectId}`);
            }

            return {
                id: productObjectId,
                item: productObjectId,
                count: item.count || 1
            };
        });
        console.log("createOrder debug - mappedItems:", mappedItems);

        // Resolve shopOwner of this order:
        // 1. Try finding by matching first product's shop
        let orderShopOwner = undefined;
        if (mappedItems.length > 0) {
            const productDoc = await Product.findById(mappedItems[0].item);
            if (productDoc && productDoc.shop) {
                orderShopOwner = productDoc.shop;
            }
        }

        // 2. Try matching from the branch input if it corresponds to shopOwner ID or shop ID
        if (!orderShopOwner && branch) {
            const queryConditions = [];
            if (mongoose.isValidObjectId(branch)) {
                queryConditions.push({ _id: branch });
                queryConditions.push({ shop: branch });
            }
            const shopOwnerDoc = await ShopOwner.findOne({ $or: queryConditions });
            if (shopOwnerDoc) {
                orderShopOwner = shopOwnerDoc._id;
            }
        }

        // 3. Fallback to branchData.shopOwner
        if (!orderShopOwner && branchData) {
            orderShopOwner = branchData.shopOwner;
        }

        const newOrder = new Order({
            customer:userId,
            items: mappedItems,
            branch: branchId,
            shopOwner: orderShopOwner || undefined,
            totalPrice,
            status: "pending",
            deliveryLocation:{
                latitude: customerData.liveLocation?.latitude || branchData.location?.latitude || 26.100511,
                longitude: customerData.liveLocation?.longitude || branchData.location?.longitude || 90.41108,
                address: customerData.address || "No address available",
            },
            pickupLocation: {
                latitude: branchData.location?.latitude || 26.100511,
                longitude: branchData.location?.longitude || 90.41108,
                address: branchData.address || "No address available",
              },
        });

        let savedOrder = await newOrder.save();

        savedOrder = await savedOrder.populate([
            { path: "items.item" },
        ]);

        // Emit Socket.io event for real-time tracking
        const io = req.server.io;
        if (io) {
            io.to(savedOrder._id.toString()).emit("order-created", {
                orderId: savedOrder._id,
                status: "pending",
            });
        }

        // Notify shop owner about new order
        if (branchData.shopOwner) {
            await createNotification({
                recipient: branchData.shopOwner,
                recipientModel: "ShopOwner",
                title: "New Order",
                message: `New order ${savedOrder.orderId} has been placed.`,
                type: "order_placed",
                orderId: savedOrder._id,
                io,
            });
        }

        // Notify customer
        await createNotification({
            recipient: userId,
            recipientModel: "Customer",
            title: "Order Placed",
            message: `Your order ${savedOrder.orderId} has been placed successfully.`,
            type: "order_placed",
            orderId: savedOrder._id,
            io,
        });

        return reply.status(201).send(savedOrder);
 
    } catch (error) {
        console.log(error);
        return reply.status(500).send({ message: "Failed to create order", error });
    }
}

export const confirmOrder = async(req,reply)=>{
    try {
        const { orderId } = req.params;
        const { userId } = req.user;
        const { deliveryPersonLocation } = req.body;  
        
        const deliveryPerson = await DeliveryPartner.findById(userId);
        if (!deliveryPerson) {
            return reply.status(404).send({ message: "Delivery Person not found" });
        }
        const order = await Order.findById(orderId);
        if (!order) return reply.status(404).send({ message: "Order not found" });

        if (order.status !== "available") {
            return reply.status(400).send({ message: "Order is not available" });
          }
        
        order.status = "confirmed";

        order.deliveryPartner = userId;
        order.deliveryPersonLocation = {
          latitude: deliveryPersonLocation?.latitude,
          longitude: deliveryPersonLocation?.longitude,
          address: deliveryPersonLocation?.address || "",
        };

        req.server.io.to(orderId).emit('orderConfirmed',order);
        await order.save()
    
        return reply.send(order)

    } catch (error) {
      console.log(error)
        return reply
        .status(500)
        .send({ message: "Failed to confirm order", error });
    }
} 

export const updateOrderStatus=async(req,reply)=>{
    try {
        const { orderId } = req.params;
        const { status, deliveryPersonLocation } = req.body;
        const { userId } = req.user;

        const deliveryPerson = await DeliveryPartner.findById(userId);
        if (!deliveryPerson) {
          return reply.status(404).send({ message: "Delivery Person not found" });
        }
    
        const order = await Order.findById(orderId);
        if (!order) return reply.status(404).send({ message: "Order not found" });

        if (["cancelled", "delivered"].includes(order.status)) {
            return reply.status(400).send({ message: "Order cannot be updated" });
          }
        
        if (order.deliveryPartner.toString() !== userId) {
            return reply.status(403).send({ message: "Unauthorized" });
        }

        order.status = status;
        order.deliveryPersonLocation = deliveryPersonLocation;
        await order.save();

        req.server.io.to(orderId).emit("liveTrackingUpdates", order);

        return reply.send(order);
        
    } catch (error) {
        return reply
        .status(500)
        .send({ message: "Failed to update order status", error });
    }
}

export const getOrders = async (req, reply) => {
    try {
      const { status, customerId, deliveryPartnerId, branchId } = req.query;
      let query = {};
  
      if (status) {
        query.status = status;
      }
      if (customerId) {
        query.customer = customerId;
      }
      if (deliveryPartnerId) {
        query.deliveryPartner = deliveryPartnerId;
        query.branch = branchId;
      }
  
      const orders = await Order.find(query).populate(
        "customer branch items.item deliveryPartner"
      );
  
      return reply.send(orders);
    } catch (error) {
      return reply
        .status(500)
        .send({ message: "Failed to retrieve orders", error });
    }
  };

export const getOrderById = async (req, reply) => {
    try {
      const { orderId } = req.params;
  
      const order = await Order.findById(orderId).populate(
        "customer branch items.item deliveryPartner"
      );
  
      if (!order) {
        return reply.status(404).send({ message: "Order not found" });
      }
  
      return reply.send(order);
    } catch (error) {
      return reply
        .status(500)
        .send({ message: "Failed to retrieve order", error });
    }
  };

/**
 * Verify delivery OTP for an order (customer-facing).
 */
export const verifyDeliveryOtp = async (req, reply) => {
    try {
      const { orderId } = req.params;
      const { otp } = req.body;

      if (!otp) {
        return reply.status(400).send({ message: "OTP is required" });
      }

      const order = await Order.findById(orderId);
      if (!order) {
        return reply.status(404).send({ message: "Order not found" });
      }

      if (!order.deliveryOtp) {
        return reply.status(400).send({ message: "No OTP set for this order" });
      }

      const isValid = await verifyOtp(otp, order.deliveryOtp);
      if (!isValid) {
        return reply.status(400).send({ message: "Invalid OTP" });
      }

      return reply.send({ message: "OTP verified successfully", valid: true });
    } catch (error) {
      return reply
        .status(500)
        .send({ message: "Failed to verify OTP", error });
    }
};