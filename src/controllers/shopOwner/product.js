import mongoose from "mongoose";
import Product from "../../models/products.js";
import { ShopOwner } from "../../models/user.js";

/**
 * Get all products belonging to the authenticated shop owner.
 * Builds a broad $in query covering all IDs associated with this owner
 * (their user _id, their shop field, and their branch _id) so products
 * seeded with any of those IDs are all returned correctly.
 */
export const getShopProducts = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { category, isAvailable, isEnabled } = req.query;

    const shopOwner = await ShopOwner.findById(userId);

    // Collect every possible ID that might be stored as the product's `shop` field
    const possibleIds = [new mongoose.Types.ObjectId(userId)];
    if (shopOwner?.shop) possibleIds.push(shopOwner.shop);
    if (shopOwner?.branch) possibleIds.push(shopOwner.branch);

    const query = { shop: { $in: possibleIds } };
    if (category) query.category = category;
    if (isAvailable !== undefined) query.isAvailable = isAvailable === "true";
    if (isEnabled !== undefined) query.isEnabled = isEnabled === "true";

    const products = await Product.find(query)
      .populate("category", "name image")
      .sort({ createdAt: -1 });

    return reply.send(products);
  } catch (error) {
    console.error("getShopProducts error:", error);
    return reply
      .status(500)
      .send({ message: "Failed to fetch products", error });
  }
};

/**
 * Add a new product for the authenticated shop owner.
 */
export const addProduct = async (req, reply) => {
  try {
    const { userId } = req.user;
    const {
      name,
      image,
      images,
      description,
      price,
      discountPrice,
      quantity,
      stockQuantity,
      category,
      isAvailable,
    } = req.body;

    const shopOwner = await ShopOwner.findById(userId);
    const shopId = shopOwner?.shop || userId;

    const product = new Product({
      name,
      image,
      images: images || [],
      description,
      price,
      discountPrice,
      quantity,
      stockQuantity: stockQuantity || 0,
      category,
      shop: shopId,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      isEnabled: true,
    });

    await product.save();

    const populatedProduct = await Product.findById(product._id).populate(
      "category",
      "name image"
    );

    return reply.status(201).send({
      message: "Product added successfully",
      product: populatedProduct,
    });
  } catch (error) {
    return reply
      .status(500)
      .send({ message: "Failed to add product", error });
  }
};

/**
 * Update an existing product (only if it belongs to the shop owner).
 */
export const updateProduct = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { productId } = req.params;
    const updateData = req.body;

    const shopOwner = await ShopOwner.findById(userId);
    const shopId = shopOwner?.shop || userId;

    const product = await Product.findOne({
      _id: productId,
      $or: [ { shop: shopId }, { shop: userId } ]
    });

    if (!product) {
      return reply
        .status(404)
        .send({ message: "Product not found or unauthorized" });
    }

    // Only allow updating specific fields
    const allowedFields = [
      "name",
      "image",
      "images",
      "description",
      "price",
      "discountPrice",
      "quantity",
      "stockQuantity",
      "category",
      "isAvailable",
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        product[field] = updateData[field];
      }
    }

    await product.save();

    const populatedProduct = await Product.findById(product._id).populate(
      "category",
      "name image"
    );

    return reply.send({
      message: "Product updated successfully",
      product: populatedProduct,
    });
  } catch (error) {
    return reply
      .status(500)
      .send({ message: "Failed to update product", error });
  }
};

/**
 * Delete a product (only if it belongs to the shop owner).
 */
export const deleteProduct = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { productId } = req.params;

    const shopOwner = await ShopOwner.findById(userId);
    const shopId = shopOwner?.shop || userId;

    const product = await Product.findOneAndDelete({
      _id: productId,
      $or: [ { shop: shopId }, { shop: userId } ]
    });

    if (!product) {
      return reply
        .status(404)
        .send({ message: "Product not found or unauthorized" });
    }

    return reply.send({ message: "Product deleted successfully" });
  } catch (error) {
    return reply
      .status(500)
      .send({ message: "Failed to delete product", error });
  }
};

/**
 * Toggle product enabled/disabled status.
 */
export const toggleProduct = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { productId } = req.params;

    const shopOwner = await ShopOwner.findById(userId);
    const shopId = shopOwner?.shop || userId;

    const product = await Product.findOne({
      _id: productId,
      $or: [ { shop: shopId }, { shop: userId } ]
    });

    if (!product) {
      return reply
        .status(404)
        .send({ message: "Product not found or unauthorized" });
    }

    product.isEnabled = !product.isEnabled;
    await product.save();

    return reply.send({
      message: `Product ${product.isEnabled ? "enabled" : "disabled"} successfully`,
      product,
    });
  } catch (error) {
    return reply
      .status(500)
      .send({ message: "Failed to toggle product", error });
  }
};
