import mongoose from "mongoose";
import Order from "../../models/order.js";
import { Customer, ShopOwner, DeliveryPartner } from "../../models/user.js";
import Config from "../../models/config.js";

/**
 * GET /api/admin/stats
 * Returns all real business metrics for the site-owner admin dashboard.
 */
export const getAdminStats = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { branchId } = req.query;

    const adminUser = await mongoose.model("Admin").findById(userId);
    let targetBranchId = adminUser?.branch;

    if (!targetBranchId && branchId && mongoose.isValidObjectId(branchId)) {
      targetBranchId = new mongoose.Types.ObjectId(branchId);
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const revenueMatch = { isParent: true, status: "delivered" };
    const platformMatch = { isParent: false, status: "delivered" };
    const statusCountsMatch = { isParent: true };
    const totalOrdersQuery = { isParent: true };
    const customerQuery = {};
    const shopOwnerQuery = {};
    const deliveryPartnerQuery = {};
    const shopBreakdownMatch = { isParent: false };
    const recentOrdersQuery = { isParent: true };
    const dailyRevenueMatch = {
      isParent: true,
      status: "delivered",
      createdAt: { $gte: sevenDaysAgo },
    };
    const deliveryBreakdownMatch = {
      isParent: true,
      status: "delivered",
      deliveryPartner: { $ne: null },
    };
    const deliveryHistoryQuery = { isParent: true, status: "delivered" };
    const shopOwnerHistoryQuery = { isParent: false, status: "delivered" };

    if (targetBranchId) {
      revenueMatch.branch = targetBranchId;
      platformMatch.branch = targetBranchId;
      statusCountsMatch.branch = targetBranchId;
      totalOrdersQuery.branch = targetBranchId;
      customerQuery.branch = targetBranchId;
      shopOwnerQuery.branch = targetBranchId;
      deliveryPartnerQuery.branch = targetBranchId;
      shopBreakdownMatch.branch = targetBranchId;
      recentOrdersQuery.branch = targetBranchId;
      dailyRevenueMatch.branch = targetBranchId;
      deliveryBreakdownMatch.branch = targetBranchId;
      deliveryHistoryQuery.branch = targetBranchId;
      shopOwnerHistoryQuery.branch = targetBranchId;
    }

    const [
      revenueResult,
      platformEarningsResult,
      orderStatusCounts,
      totalOrders,
      totalCustomers,
      totalShopOwners,
      totalDeliveryPartners,
      shopBreakdown,
      recentOrders,
      dailyRevenue,
      deliveryBreakdown,
      deliveryHistory,
      shopOwnerHistory,
    ] = await Promise.all([
      // 1. Total site revenue (parent, delivered)
      Order.aggregate([
        { $match: revenueMatch },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]),

      // 2. Platform earnings (child orders, delivered)
      Order.aggregate([
        { $match: platformMatch },
        { $group: { _id: null, total: { $sum: "$platformEarnings" } } },
      ]),

      // 3. Order counts by status (parent orders)
      Order.aggregate([
        { $match: statusCountsMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // 4. Total parent orders
      Order.countDocuments(totalOrdersQuery),

      // 5–7. User counts
      Customer.countDocuments(customerQuery),
      ShopOwner.countDocuments(shopOwnerQuery),
      DeliveryPartner.countDocuments(deliveryPartnerQuery),

      // 8. Per-shop-owner breakdown (child orders)
      Order.aggregate([
        { $match: shopBreakdownMatch },
        {
          $group: {
            _id: "$shopOwner",
            totalSales: { $sum: "$totalPrice" },
            platformCut: { $sum: "$platformEarnings" },
            vendorPayout: { $sum: "$vendorPayout" },
            orderCount: { $sum: 1 },
            deliveredCount: {
              $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
            },
          },
        },
        {
          $lookup: {
            from: "shopowners",
            localField: "_id",
            foreignField: "_id",
            as: "ownerInfo",
          },
        },
        { $unwind: { path: "$ownerInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            totalSales: 1,
            platformCut: 1,
            vendorPayout: 1,
            orderCount: 1,
            deliveredCount: 1,
            name: { $ifNull: ["$ownerInfo.shopName", "$ownerInfo.name"] },
            email: "$ownerInfo.email",
            idNumber: "$ownerInfo.idNumber",
          },
        },
        { $sort: { totalSales: -1 } },
      ]),

      // 9. Recent 10 parent orders
      Order.find(recentOrdersQuery)
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("customer", "name email phone")
        .select("orderId totalPrice status createdAt customer")
        .lean(),

      // 10. Daily revenue for last 7 days
      Order.aggregate([
        { $match: dailyRevenueMatch },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            revenue: { $sum: "$totalPrice" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 11. Delivery partner breakdown
      Order.aggregate([
        { $match: deliveryBreakdownMatch },
        {
          $group: {
            _id: "$deliveryPartner",
            completedDeliveries: { $sum: 1 },
            totalDistance: { $sum: "$distance" },
            totalEarnings: { $sum: "$deliveryPartnerPayout" },
          },
        },
        {
          $lookup: {
            from: "deliverypartners",
            localField: "_id",
            foreignField: "_id",
            as: "partnerInfo",
          },
        },
        { $unwind: { path: "$partnerInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            completedDeliveries: 1,
            totalDistance: 1,
            totalEarnings: 1,
            name: "$partnerInfo.name",
            email: "$partnerInfo.email",
            phone: "$partnerInfo.phone",
            idNumber: "$partnerInfo.idNumber",
          },
        },
      ]),

      // 12. Delivery deals history log (all delivered parent orders)
      Order.find(deliveryHistoryQuery)
        .sort({ createdAt: -1 })
        .populate("deliveryPartner", "name email phone idNumber")
        .populate("customer", "name email phone")
        .lean(),

      // 13. Shop Owner deals history log (all delivered child orders)
      Order.find(shopOwnerHistoryQuery)
        .sort({ createdAt: -1 })
        .populate("shopOwner", "shopName name email phone idNumber")
        .populate("customer", "name email phone")
        .populate("items.item", "name")
        .lean(),
    ]);

    // Build status map
    const statusMap = {};
    orderStatusCounts.forEach(({ _id, count }) => {
      if (_id) statusMap[_id] = count;
    });

    // Build daily revenue array for last 7 days (fill missing days with 0)
    const dailyRevenueMap = {};
    dailyRevenue.forEach((d) => {
      dailyRevenueMap[d._id] = { revenue: d.revenue, orders: d.orders };
    });

    const dailyChart = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
      });
      dailyChart.push({
        date: key,
        label,
        revenue: dailyRevenueMap[key]?.revenue || 0,
        orders: dailyRevenueMap[key]?.orders || 0,
      });
    }

    let branchInfo = null;
    if (targetBranchId) {
      const bDoc = await mongoose.model("Branch").findById(targetBranchId).lean();
      if (bDoc) {
        branchInfo = {
          id: bDoc._id,
          name: bDoc.name,
          commissionPercentage: bDoc.commissionPercentage !== undefined ? bDoc.commissionPercentage : 10,
        };
      }
    }

    return reply.send({
      branchInfo,
      revenue: {
        total: revenueResult[0]?.total || 0,
        platformEarnings: platformEarningsResult[0]?.total || 0,
        vendorPayout:
          (revenueResult[0]?.total || 0) -
          (platformEarningsResult[0]?.total || 0),
      },
      orders: {
        total: totalOrders,
        byStatus: statusMap,
        pending: statusMap["pending"] || 0,
        accepted: statusMap["accepted"] || 0,
        delivered: statusMap["delivered"] || 0,
        cancelled: statusMap["cancelled"] || 0,
        outForDelivery: statusMap["outForDelivery"] || 0,
      },
      users: {
        customers: totalCustomers,
        shopOwners: totalShopOwners,
        deliveryPartners: totalDeliveryPartners,
      },
      shopBreakdown,
      deliveryBreakdown,
      deliveryHistory,
      shopOwnerHistory,
      recentOrders,
      dailyChart,
    });
  } catch (error) {
    console.error("ADMIN STATS ERROR:", error);
    return reply.status(500).send({ message: "Failed to fetch admin stats", error: error.message });
  }
};

export const getConfig = async (req, reply) => {
  try {
    const configs = await Config.find({});
    const configMap = {};
    configs.forEach((c) => {
      configMap[c.key] = c.value;
    });
    if (configMap["rider_pay_per_km"] === undefined) {
      configMap["rider_pay_per_km"] = 3.5;
    }
    if (configMap["shop_commission_percentage"] === undefined) {
      configMap["shop_commission_percentage"] = 10;
    }
    return reply.send(configMap);
  } catch (error) {
    return reply.status(500).send({ message: "Failed to fetch configs", error });
  }
};

export const updateConfig = async (req, reply) => {
  try {
    const updates = req.body;
    for (const key in updates) {
      await Config.findOneAndUpdate(
        { key },
        { key, value: updates[key] },
        { upsert: true, new: true }
      );
    }
    return reply.send({ message: "Configurations updated successfully" });
  } catch (error) {
    return reply.status(500).send({ message: "Failed to update configs", error });
  }
};

export const updateBranchCommission = async (req, reply) => {
  try {
    const { branchId, shopOwnerId, commissionPercentage } = req.body;
    const pct = Number(commissionPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return reply.status(400).send({ message: "Invalid commission percentage (must be between 0 and 100)" });
    }

    if (branchId) {
      const Branch = (await import("../../models/branch.js")).default;
      await Branch.findByIdAndUpdate(branchId, { commissionPercentage: pct });
    }

    if (shopOwnerId) {
      const { ShopOwner } = await import("../../models/user.js");
      await ShopOwner.findByIdAndUpdate(shopOwnerId, { commissionPercentage: pct });
    }

    return reply.send({ message: `Commission percentage updated to ${pct}% successfully!` });
  } catch (error) {
    console.error("FAILED TO UPDATE BRANCH COMMISSION:", error);
    return reply.status(500).send({ message: "Failed to update commission rate", error: error.message });
  }
};

export const getPendingRequests = async (req, reply) => {
  try {
    const adminUser = await mongoose.model("Admin").findById(req.user.userId);
    let targetBranchId = adminUser?.branch;
    
    const filter = { isActivated: false };
    if (targetBranchId) {
      filter.branch = targetBranchId;
    } else if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      filter.branch = new mongoose.Types.ObjectId(req.query.branchId);
    }

    const [pendingShopOwners, pendingDeliveryPartners] = await Promise.all([
      ShopOwner.find(filter).select("-password").lean(),
      DeliveryPartner.find(filter).select("-password").lean(),
    ]);
    return reply.send({
      shopOwners: pendingShopOwners,
      deliveryPartners: pendingDeliveryPartners,
    });
  } catch (error) {
    return reply.status(500).send({ message: "Failed to fetch pending requests", error });
  }
};

export const approveRequest = async (req, reply) => {
  try {
    const { userId, role } = req.body;
    if (!userId || !role) {
      return reply.status(400).send({ message: "userId and role are required" });
    }
    let user;
    if (role === "ShopOwner") {
      user = await ShopOwner.findById(userId);
    } else if (role === "DeliveryPartner") {
      user = await DeliveryPartner.findById(userId);
    } else {
      return reply.status(400).send({ message: "Invalid role specified" });
    }
    if (!user) {
      return reply.status(404).send({ message: "User request not found" });
    }
    user.isActivated = true;
    await user.save();
    return reply.send({ message: "Account request approved and activated successfully" });
  } catch (error) {
    return reply.status(500).send({ message: "Failed to approve request", error });
  }
};

export const rejectRequest = async (req, reply) => {
  try {
    const { userId, role } = req.body;
    if (!userId || !role) {
      return reply.status(400).send({ message: "userId and role are required" });
    }
    let user;
    if (role === "ShopOwner") {
      user = await ShopOwner.findByIdAndDelete(userId);
    } else if (role === "DeliveryPartner") {
      user = await DeliveryPartner.findByIdAndDelete(userId);
    } else {
      return reply.status(400).send({ message: "Invalid role specified" });
    }
    if (!user) {
      return reply.status(404).send({ message: "User request not found" });
    }
    return reply.send({ message: "Account request rejected and application removed successfully" });
  } catch (error) {
    return reply.status(500).send({ message: "Failed to reject request", error });
  }
};

export const calculateProfit = async (req, reply) => {
  try {
    const { days, shopOwnerId } = req.query;
    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum <= 0) {
      return reply.status(400).send({ message: "Invalid days parameter" });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    const adminUser = await mongoose.model("Admin").findById(req.user.userId);
    let targetBranchId = adminUser?.branch;

    const matchQuery = {
      isParent: false,
      status: "delivered",
      createdAt: { $gte: startDate }
    };

    if (targetBranchId) {
      matchQuery.branch = targetBranchId;
    } else if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      matchQuery.branch = new mongoose.Types.ObjectId(req.query.branchId);
    }

    if (shopOwnerId && shopOwnerId !== "all") {
      matchQuery.shopOwner = new mongoose.Types.ObjectId(shopOwnerId);
    }

    const result = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalPrice" },
          platformCut: { $sum: "$platformEarnings" },
          vendorPayout: { $sum: "$vendorPayout" },
          deliveredCount: { $sum: 1 }
        }
      }
    ]);

    const profitData = result[0] || {
      totalSales: 0,
      platformCut: 0,
      vendorPayout: 0,
      deliveredCount: 0
    };

    return reply.send({
      days: daysNum,
      shopOwnerId: shopOwnerId || "all",
      ...profitData
    });
  } catch (error) {
    console.error("CALCULATE PROFIT ERROR:", error);
    return reply.status(500).send({ message: "Failed to calculate profit", error: error.message });
  }
};

export const calculateRiderPayout = async (req, reply) => {
  try {
    const { days, deliveryPartnerId } = req.query;
    const daysNum = parseInt(days);
    if (isNaN(daysNum) || daysNum <= 0) {
      return reply.status(400).send({ message: "Invalid days parameter" });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0);

    const adminUser = await mongoose.model("Admin").findById(req.user.userId);
    let targetBranchId = adminUser?.branch;

    const matchQuery = {
      isParent: true,
      status: "delivered",
      deliveryPartner: { $ne: null },
      createdAt: { $gte: startDate }
    };

    if (targetBranchId) {
      matchQuery.branch = targetBranchId;
    } else if (req.query.branchId && mongoose.isValidObjectId(req.query.branchId)) {
      matchQuery.branch = new mongoose.Types.ObjectId(req.query.branchId);
    }

    if (deliveryPartnerId && deliveryPartnerId !== "all") {
      matchQuery.deliveryPartner = new mongoose.Types.ObjectId(deliveryPartnerId);
    }

    const result = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalDistance: { $sum: "$distance" },
          deliveredCount: { $sum: 1 }
        }
      }
    ]);

    const payoutData = result[0] || {
      totalDistance: 0,
      deliveredCount: 0
    };

    return reply.send({
      days: daysNum,
      deliveryPartnerId: deliveryPartnerId || "all",
      ...payoutData
    });
  } catch (error) {
    console.error("CALCULATE RIDER PAYOUT ERROR:", error);
    return reply.status(500).send({ message: "Failed to calculate rider payout", error: error.message });
  }
};


