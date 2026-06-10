import mongoose from "mongoose";
import Order from "../../models/order.js";
import { Customer, ShopOwner, DeliveryPartner } from "../../models/user.js";

/**
 * GET /api/admin/stats
 * Returns all real business metrics for the site-owner admin dashboard.
 */
export const getAdminStats = async (req, reply) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      // Overall revenue from parent (consolidated) delivered orders
      revenueResult,
      // Platform earnings from child orders (10% commission)
      platformEarningsResult,
      // Order counts by status (parent orders only)
      orderStatusCounts,
      // Total parent orders
      totalOrders,
      // User counts
      totalCustomers,
      totalShopOwners,
      totalDeliveryPartners,
      // Per-shop-owner breakdown (child orders)
      shopBreakdown,
      // Recent 10 parent orders
      recentOrders,
      // Daily revenue for last 7 days (parent delivered orders)
      dailyRevenue,
    ] = await Promise.all([
      // 1. Total site revenue (parent, delivered)
      Order.aggregate([
        { $match: { isParent: true, status: "delivered" } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]),

      // 2. Platform earnings (child orders, delivered)
      Order.aggregate([
        { $match: { isParent: false, status: "delivered" } },
        { $group: { _id: null, total: { $sum: "$platformEarnings" } } },
      ]),

      // 3. Order counts by status (parent orders)
      Order.aggregate([
        { $match: { isParent: true } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // 4. Total parent orders
      Order.countDocuments({ isParent: true }),

      // 5–7. User counts
      Customer.countDocuments({}),
      ShopOwner.countDocuments({}),
      DeliveryPartner.countDocuments({}),

      // 8. Per-shop-owner breakdown (child orders)
      Order.aggregate([
        { $match: { isParent: false } },
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
        { $unwind: { path: "$ownerInfo", preserveNullAndEmpty: true } },
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
          },
        },
        { $sort: { totalSales: -1 } },
      ]),

      // 9. Recent 10 parent orders
      Order.find({ isParent: true })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("customer", "name email phone")
        .select("orderId totalPrice status createdAt customer")
        .lean(),

      // 10. Daily revenue for last 7 days
      Order.aggregate([
        {
          $match: {
            isParent: true,
            status: "delivered",
            createdAt: { $gte: sevenDaysAgo },
          },
        },
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

    return reply.send({
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
      recentOrders,
      dailyChart,
    });
  } catch (error) {
    console.error("ADMIN STATS ERROR:", error);
    return reply.status(500).send({ message: "Failed to fetch admin stats", error: error.message });
  }
};
