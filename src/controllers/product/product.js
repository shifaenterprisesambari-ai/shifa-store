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
 * Fetch all available branches (stores).
 */
export const getAllStores = async (req, reply) => {
  try {
    const stores = await Branch.find().exec();
    return reply.send(stores);
  } catch (error) {
    console.error("FAILED TO GET STORES:", error);
    return reply.status(500).send({ message: "An error occurred fetching stores", error });
  }
};

/**
 * Fetch all enabled/available products belonging to a branch (store) ID.
 */
export const getProductsByStoreId = async (req, reply) => {
  const { branchId } = req.params;

  try {
    // 1. Find all shop owners assigned to this branch
    const shopOwners = await ShopOwner.find({ branch: branchId }).select("_id shop");
    
    // Map both the user _ids and any custom shop IDs assigned to them
    const shopIds = [];
    shopOwners.forEach((so) => {
      shopIds.push(so._id);
      if (so.shop) shopIds.push(so.shop);
    });

    // 2. Query products whose 'shop' field matches any of these IDs
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
