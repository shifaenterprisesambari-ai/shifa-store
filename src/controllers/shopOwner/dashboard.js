import mongoose from "mongoose";
import Order from "../../models/order.js";
import Product from "../../models/products.js";
import Branch from "../../models/branch.js";
import { ShopOwner } from "../../models/user.js";

/**
 * Get dashboard statistics for the authenticated shop owner.
 */
export const getDashboardStats = async (req, reply) => {
  try {
    const { userId } = req.user;

    const shopOwner = await ShopOwner.findById(userId);
    const branchId = shopOwner?.branch;

    // Collect every possible ID that might be stored as the product's `shop` field
    const possibleIds = [new mongoose.Types.ObjectId(userId)];
    if (shopOwner?.shop) possibleIds.push(shopOwner.shop);
    if (shopOwner?.branch) possibleIds.push(shopOwner.branch);

    const productQuery = { shop: { $in: possibleIds } };
    const activeProductQuery = { shop: { $in: possibleIds }, isEnabled: true, isAvailable: true };

    const orderQuery = { shopOwner: userId };

    // Aggregate matching for aggregation pipeline (must manually cast to ObjectId)
    const matchQuery = { 
      status: "delivered", 
      shopOwner: new mongoose.Types.ObjectId(userId)
    };

    // Run queries in parallel
    const [
      totalProducts,
      activeProducts,
      pendingOrders,
      acceptedOrders,
      deliveredOrders,
      totalOrders,
      revenueResult,
    ] = await Promise.all([
      Product.countDocuments(productQuery),
      Product.countDocuments(activeProductQuery),
      Order.countDocuments({ ...orderQuery, status: "pending" }),
      Order.countDocuments({ ...orderQuery, status: "accepted" }),
      Order.countDocuments({ ...orderQuery, status: "delivered" }),
      Order.countDocuments(orderQuery),
      Order.aggregate([
        { $match: matchQuery },
        { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" } } },
      ]),
    ]);

    const totalRevenue =
      revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Build a store-info object using the owner's own personal fields first,
    // falling back to the shared branch data for location/address.
    const branchDoc = branchId ? await Branch.findById(branchId).lean() : null;
    const storeInfo = {
      name: shopOwner.shopName || branchDoc?.name || null,
      image: shopOwner.shopImage || branchDoc?.image || null,
      address: shopOwner.shopAddress || branchDoc?.address || null,
      location: branchDoc?.location || null,
      branchId: branchId || null,
    };

    return reply.send({
      products: {
        total: totalProducts,
        active: activeProducts,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        accepted: acceptedOrders,
        delivered: deliveredOrders,
      },
      revenue: totalRevenue,
      branch: storeInfo,
    });
  } catch (error) {
    console.error("FAILED TO FETCH DASHBOARD STATS:", error);
    return reply
      .status(500)
      .send({ message: "Failed to fetch dashboard stats", error });
  }
};

/**
 * Update shop (branch) settings like name, address, photo URL, location.
 */
export const updateShopSettings = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { name, address, image, latitude, longitude } = req.body;

    const shopOwner = await ShopOwner.findById(userId);
    if (!shopOwner) {
      return reply.status(404).send({ message: "Shop Owner not found" });
    }

    // Save personal store branding directly on the ShopOwner document.
    // This avoids overwriting the shared Branch that all owners reference.
    if (name !== undefined) shopOwner.shopName = name;
    if (address !== undefined) shopOwner.shopAddress = address;
    if (image !== undefined) shopOwner.shopImage = image;
    await shopOwner.save();

    // Also update branch location coordinates if provided (branch = physical location, shared is fine)
    if ((latitude !== undefined || longitude !== undefined) && shopOwner.branch) {
      const branch = await Branch.findById(shopOwner.branch);
      if (branch) {
        if (!branch.location) branch.location = {};
        if (latitude !== undefined) branch.location.latitude = Number(latitude);
        if (longitude !== undefined) branch.location.longitude = Number(longitude);
        await branch.save();
      }
    }

    return reply.send({
      message: "Shop settings updated successfully",
      branch: {
        name: shopOwner.shopName,
        image: shopOwner.shopImage,
        address: shopOwner.shopAddress,
      },
    });
  } catch (error) {
    console.error("FAILED TO UPDATE SHOP SETTINGS:", error);
    return reply.status(500).send({ message: "Failed to update shop settings", error });
  }
};
