import mongoose from "mongoose";
import Order from "../../models/order.js";
import Branch from "../../models/branch.js";
import Product from "../../models/products.js";
import { Customer, DeliveryPartner, ShopOwner } from "../../models/user.js";
import { createNotification } from "../../services/notificationService.js";
import { verifyOtp } from "../../services/otpService.js";
import { syncParentOrderStatus } from "../../services/orderSyncService.js";


export const createOrder = async(req,reply)=>{
    console.log("POST /order request received! Body:", req.body);
    try {
        const { userId, role } = req.user;
        const { items, branch, totalPrice } = req.body;

        // Only customers can place orders
        if (role && role !== "Customer") {
            return reply.status(403).send({
                message: `Only customers can place orders. You are logged in as ${role}.`,
            });
        }

        const customerData = await Customer.findById(userId);

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
        
        if (!customerData) {
            return reply.status(404).send({
                message: "Customer account not found. Please log out and log in again.",
                hint: "Your session may be outdated. Try logging out and signing in again.",
                userId,
            });
        }

        if(!branchData){
           return reply.status(404).send({ message: "Branch not found" });
        }

        // Retrieve a real database product as a fallback for mock/demo item IDs
        const firstProduct = await Product.findOne();
        console.log("createOrder debug - firstProduct:", firstProduct);

        const resolvedItemsWithProducts = await Promise.all(items.map(async (item) => {
            let itemId = item.id || item.item;
            let productObjectId = itemId;

            if (!mongoose.isValidObjectId(itemId)) {
                productObjectId = firstProduct ? firstProduct._id : new mongoose.Types.ObjectId();
                console.log(`createOrder debug - mapped invalid itemId ${itemId} to ${productObjectId}`);
            }

            const productDoc = await Product.findById(productObjectId);
            return {
                itemId: productObjectId,
                count: item.count || 1,
                product: productDoc
            };
        }));

        const defaultShopOwner = branchData?.shopOwner || (await ShopOwner.findOne())?._id;

        const itemsWithShopOwner = resolvedItemsWithProducts.map(resolved => {
            const shopOwnerId = resolved.product?.shop || defaultShopOwner;
            return {
                ...resolved,
                shopOwnerId: shopOwnerId ? shopOwnerId.toString() : "unknown"
            };
        });

        // Group items by shopOwnerId
        const groups = {};
        for (const item of itemsWithShopOwner) {
            const key = item.shopOwnerId;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
        }

        // Calculate subtotal for each group and distribute totalPrice proportionally
        let overallSubtotal = 0;
        const groupSubtotals = {};
        for (const key in groups) {
            let subtotal = 0;
            for (const item of groups[key]) {
                const price = item.product?.price || 0;
                subtotal += price * item.count;
            }
            groupSubtotals[key] = subtotal;
            overallSubtotal += subtotal;
        }

        const groupTotalPrices = {};
        const groupKeys = Object.keys(groups);
        let distributedSum = 0;
        for (let i = 0; i < groupKeys.length; i++) {
            const key = groupKeys[i];
            if (i === groupKeys.length - 1) {
                groupTotalPrices[key] = Math.max(0, totalPrice - distributedSum);
            } else {
                const proportion = overallSubtotal > 0 ? (groupSubtotals[key] / overallSubtotal) : (1 / groupKeys.length);
                const share = Math.round(proportion * totalPrice);
                groupTotalPrices[key] = share;
                distributedSum += share;
            }
        }

        const parentMappedItems = resolvedItemsWithProducts.map(resolved => ({
            id: resolved.itemId,
            item: resolved.itemId,
            count: resolved.count
        }));

        const parentOrder = new Order({
            customer: userId,
            items: parentMappedItems,
            branch: branchId,
            totalPrice: totalPrice,
            status: "pending",
            isParent: true,
            parentOrder: null,
            deliveryLocation: {
                latitude: customerData.liveLocation?.latitude || branchData?.location?.latitude || 26.100511,
                longitude: customerData.liveLocation?.longitude || branchData?.location?.longitude || 90.41108,
                address: customerData.address || "No address available",
            },
            pickupLocation: {
                latitude: branchData?.location?.latitude || 26.100511,
                longitude: branchData?.location?.longitude || 90.41108,
                address: branchData?.address || "No address available",
            },
        });

        let savedParentOrder = await parentOrder.save();

        savedParentOrder = await savedParentOrder.populate([
            { path: "items.item" },
        ]);

        const createdOrders = [];
        const io = req.server.io;

        for (const key of groupKeys) {
            const groupItems = groups[key];
            const orderShopOwner = key !== "unknown" ? new mongoose.Types.ObjectId(key) : undefined;

            const mappedGroupItems = groupItems.map(item => ({
                id: item.itemId,
                item: item.itemId,
                count: item.count
            }));

            const groupTotalPrice = groupTotalPrices[key];
            const platformEarnings = Math.round(groupTotalPrice * 0.10 * 100) / 100;
            const vendorPayout = groupTotalPrice - platformEarnings;

            const childOrder = new Order({
                customer: userId,
                items: mappedGroupItems,
                branch: branchId,
                shopOwner: orderShopOwner,
                totalPrice: groupTotalPrice,
                isParent: false,
                parentOrder: savedParentOrder._id,
                platformEarnings,
                vendorPayout,
                status: "pending",
                deliveryLocation: {
                    latitude: customerData.liveLocation?.latitude || branchData?.location?.latitude || 26.100511,
                    longitude: customerData.liveLocation?.longitude || branchData?.location?.longitude || 90.41108,
                    address: customerData.address || "No address available",
                },
                pickupLocation: {
                    latitude: branchData?.location?.latitude || 26.100511,
                    longitude: branchData?.location?.longitude || 90.41108,
                    address: branchData?.address || "No address available",
                },
            });

            let savedChildOrder = await childOrder.save();

            savedChildOrder = await savedChildOrder.populate([
                { path: "items.item" },
            ]);

            createdOrders.push(savedChildOrder);

            if (orderShopOwner) {
                const itemDetailsText = savedChildOrder.items
                    .map(it => `${it.item?.name || "Product"} (x${it.count})`)
                    .join(", ");

                await createNotification({
                    recipient: orderShopOwner,
                    recipientModel: "ShopOwner",
                    title: "New Order",
                    message: `New order ${savedChildOrder.orderId} containing: ${itemDetailsText} has been placed.`,
                    type: "order_placed",
                    orderId: savedChildOrder._id,
                    io,
                });
            }
        }

        if (io) {
            io.to(savedParentOrder._id.toString()).emit("order-created", {
                orderId: savedParentOrder._id,
                status: "pending",
            });
        }

        await createNotification({
            recipient: userId,
            recipientModel: "Customer",
            title: "Order Placed",
            message: `Your order ${savedParentOrder.orderId} has been placed successfully.`,
            type: "order_placed",
            orderId: savedParentOrder._id,
            io,
        });

        return reply.status(201).send(savedParentOrder);
 
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
        await order.save();

        await syncParentOrderStatus({ parentOrderId: order.parentOrder, io: req.server.io });
    
        return reply.send(order);

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

        const io = req.server.io;
        if (io) {
            io.to(orderId).emit("liveTrackingUpdates", order);
        }

        await syncParentOrderStatus({ parentOrderId: order.parentOrder, io });

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
        query.$or = [
          { isParent: true },
          { isParent: false, parentOrder: null }
        ];
      }
      if (deliveryPartnerId) {
        query.deliveryPartner = deliveryPartnerId;
        if (branchId) query.branch = branchId;
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