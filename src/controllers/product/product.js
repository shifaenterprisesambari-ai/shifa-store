import Product from "../../models/products.js";
import Branch from "../../models/branch.js";
import { ShopOwner } from "../../models/user.js";

/**
 * Fetch all products in a given category.
 */
export const getProductsByCategoryId = async (req, reply) => {
  const { categoryId } = req.params;

  try {
    const products = await Product.find({ category: categoryId })
      .populate("category", "name image")
      .exec();

    return reply.send(products);
  } catch (error) {
    return reply.status(500).send({ message: "An error occurred", error });
  }
};

/**
 * Fetch all shop owners as individual stores, enriched with branch info.
 * Each ShopOwner represents a distinct store in the "Popular Stores Near You" section.
 */
export const getAllStores = async (req, reply) => {
  try {
    const shopOwners = await ShopOwner.find()
      .populate("branch", "name image address location")
      .lean()
      .exec();

    // Shape each shop owner into a store object for the frontend.
    // Priority: owner's personal store fields → shared branch fields → owner login name
    const stores = shopOwners.map((so) => ({
      _id: so._id,
      shopId: so.shop,
      name: so.shopName || so.name,          // personal store name → owner name fallback
      image: so.shopImage || so.branch?.image || null,  // personal photo → branch photo
      address: so.shopAddress || so.branch?.address || null,
      location: so.branch?.location || null,
      branchName: so.branch?.name || null,
    }));

    return reply.send(stores);
  } catch (error) {
    console.error("FAILED TO GET STORES:", error);
    return reply.status(500).send({ message: "An error occurred fetching stores", error });
  }
};

/**
 * Fetch all enabled/available products belonging to a shop owner (store).
 * The :storeId param is the ShopOwner's _id.
 */
export const getProductsByStoreId = async (req, reply) => {
  const { branchId: storeId } = req.params;

  try {
    // Find the shop owner to get their custom shop ID
    const shopOwner = await ShopOwner.findById(storeId).select("_id shop").lean();

    if (!shopOwner) {
      return reply.status(404).send({ message: "Store not found" });
    }

    // Build list of IDs to match against products.shop
    // Products may have been saved with either the shopOwner._id or shopOwner.shop
    const shopIds = [shopOwner._id];
    if (shopOwner.shop) shopIds.push(shopOwner.shop);

    const products = await Product.find({
      shop: { $in: shopIds },
      isEnabled: true,
      isAvailable: true,
    })
      .populate("category", "name image")
      .exec();

    return reply.send(products);
  } catch (error) {
    console.error("FAILED TO GET STORE PRODUCTS:", error);
    return reply.status(500).send({ message: "An error occurred fetching store products", error });
  }
};
