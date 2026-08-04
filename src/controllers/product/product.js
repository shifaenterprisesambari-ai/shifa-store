import Product from "../../models/products.js";
import Branch from "../../models/branch.js";
import { ShopOwner } from "../../models/user.js";

const AMBARI_BRANCH_IDS = ["6a441737f444f1f690c3c039", "6a4eb29042d2ac6fea33fc3f"];

/**
 * Fetch all products in a given category.
 */
export const getProductsByCategoryId = async (req, reply) => {
  const { categoryId } = req.params;
  const { branchId } = req.query;

  try {
    const filter = { category: categoryId, isEnabled: true, isAvailable: true };

    if (branchId) {
      const isAmbari = AMBARI_BRANCH_IDS.includes(String(branchId));
      const targetBranchFilter = isAmbari ? { $in: AMBARI_BRANCH_IDS } : branchId;

      // Find all shop owners belonging to this branch
      const shopOwners = await ShopOwner.find({
        branch: isAmbari ? { $in: AMBARI_BRANCH_IDS } : branchId
      }).select("_id shop").lean();

      const shopIds = shopOwners.map((s) => s._id);
      shopOwners.forEach((s) => {
        if (s.shop) shopIds.push(s.shop);
      });

      filter.$or = [
        { branch: targetBranchFilter },
        { shop: { $in: shopIds } },
        { branch: { $exists: false } },
        { branch: null }
      ];
    }

    let products = await Product.find(filter)
      .populate("category", "name image")
      .populate({
        path: "shop",
        select: "shopName isClosed branch",
        populate: {
          path: "branch",
          select: "location"
        }
      })
      .exec();

    // Fallback: If no products found for specific branch, return products in category across all branches
    if (products.length === 0) {
      products = await Product.find({ category: categoryId, isEnabled: true, isAvailable: true })
        .populate("category", "name image")
        .populate({
          path: "shop",
          select: "shopName isClosed branch",
          populate: { path: "branch", select: "location" }
        })
        .exec();
    }

    return reply.send(products);
  } catch (error) {
    console.error("FAILED TO GET PRODUCTS BY CATEGORY:", error);
    return reply.status(500).send({ message: "An error occurred fetching products", error });
  }
};

/**
 * Fetch all shop owners as individual stores, enriched with branch info.
 * Each ShopOwner represents a distinct store in the "Popular Stores Near You" section.
 */
export const getAllStores = async (req, reply) => {
  try {
    const { branchId } = req.query;
    const filter = {};

    if (branchId) {
      const isAmbari = AMBARI_BRANCH_IDS.includes(String(branchId));
      filter.branch = isAmbari ? { $in: AMBARI_BRANCH_IDS } : branchId;
    }

    let shopOwners = await ShopOwner.find(filter)
      .populate("branch", "name image address location")
      .lean()
      .exec();

    // Fallback: If no stores found for specific branch, return all active shop owners
    if (shopOwners.length === 0) {
      shopOwners = await ShopOwner.find({})
        .populate("branch", "name image address location")
        .lean()
        .exec();
    }

    // Shape each shop owner into a store object for the frontend.
    const stores = shopOwners.map((so) => ({
      _id: so._id,
      shopId: so.shop,
      name: so.shopName || so.name,
      image: so.shopImage || so.branch?.image || null,
      address: so.shopAddress || so.branch?.address || null,
      location: so.branch?.location || null,
      branchName: so.branch?.name || null,
      isClosed: so.isClosed || false,
    }));

    return reply.send(stores);
  } catch (error) {
    console.error("FAILED TO GET STORES:", error);
    return reply.status(500).send({ message: "An error occurred fetching stores", error });
  }
};

/**
 * Fetch all enabled/available products belonging to a shop owner (store) or branch.
 * The :storeId param can be a ShopOwner's _id or a Branch's _id.
 */
export const getProductsByStoreId = async (req, reply) => {
  const { branchId: storeId } = req.params;

  try {
    // 1. Try finding ShopOwner by _id
    let shopOwner = await ShopOwner.findById(storeId).lean();

    // 2. If not found by _id, try finding ShopOwner by shop field
    if (!shopOwner) {
      shopOwner = await ShopOwner.findOne({ shop: storeId }).lean();
    }

    // 3. If not a ShopOwner, check if storeId is a Branch ID!
    if (!shopOwner) {
      const isAmbari = AMBARI_BRANCH_IDS.includes(String(storeId));
      const branchDoc = await Branch.findById(storeId).lean();

      if (branchDoc || isAmbari) {
        const targetBranchFilter = isAmbari ? { $in: AMBARI_BRANCH_IDS } : storeId;

        const shopOwners = await ShopOwner.find({
          branch: targetBranchFilter
        }).select("_id shop").lean();

        const shopIds = shopOwners.map((s) => s._id);
        shopOwners.forEach((s) => { if (s.shop) shopIds.push(s.shop); });

        let products = await Product.find({
          $or: [
            { branch: targetBranchFilter },
            { shop: { $in: shopIds } }
          ],
          isEnabled: true,
          isAvailable: true,
        })
          .populate("category", "name image")
          .populate({
            path: "shop",
            select: "shopName isClosed branch",
            populate: { path: "branch", select: "location" }
          })
          .exec();

        if (products.length === 0) {
          products = await Product.find({ isEnabled: true, isAvailable: true })
            .populate("category", "name image")
            .populate({
              path: "shop",
              select: "shopName isClosed branch",
              populate: { path: "branch", select: "location" }
            })
            .exec();
        }

        return reply.send(products);
      }

      const allFallbackProducts = await Product.find({ isEnabled: true, isAvailable: true })
        .populate("category", "name image")
        .populate({
          path: "shop",
          select: "shopName isClosed branch",
          populate: { path: "branch", select: "location" }
        })
        .exec();

      return reply.send(allFallbackProducts);
    }

    // Found ShopOwner: fetch products for shopOwner._id or shopOwner.shop or branch
    const shopIds = [shopOwner._id];
    if (shopOwner.shop) shopIds.push(shopOwner.shop);

    const isAmbariShop = shopOwner.branch && AMBARI_BRANCH_IDS.includes(String(shopOwner.branch));

    let products = await Product.find({
      $or: [
        { shop: { $in: shopIds } },
        { branch: isAmbariShop ? { $in: AMBARI_BRANCH_IDS } : shopOwner.branch }
      ],
      isEnabled: true,
      isAvailable: true,
    })
      .populate("category", "name image")
      .populate({
        path: "shop",
        select: "shopName isClosed branch",
        populate: { path: "branch", select: "location" }
      })
      .exec();

    if (products.length === 0) {
      products = await Product.find({ isEnabled: true, isAvailable: true })
        .populate("category", "name image")
        .populate({
          path: "shop",
          select: "shopName isClosed branch",
          populate: { path: "branch", select: "location" }
        })
        .exec();
    }

    return reply.send(products);
  } catch (error) {
    console.error("FAILED TO GET STORE PRODUCTS:", error);
    return reply.status(500).send({ message: "An error occurred fetching store products", error });
  }
};

/**
 * Fetch all geographical branches for location selection.
 */
export const getAllBranches = async (req, reply) => {
  try {
    const branches = await Branch.find({}).lean().exec();
    return reply.send(branches);
  } catch (error) {
    console.error("FAILED TO GET BRANCHES:", error);
    return reply.status(500).send({ message: "An error occurred fetching branches", error });
  }
};
