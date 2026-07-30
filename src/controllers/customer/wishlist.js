import { Customer } from "../../models/user.js";
import Product from "../../models/products.js";
import mongoose from "mongoose";

/**
 * Get customer's wishlist items populated with product details.
 */
export const getWishlist = async (req, reply) => {
  try {
    const { userId } = req.user;
    const customer = await Customer.findById(userId).populate({
      path: "wishlist",
      match: { isEnabled: true },
    });

    if (!customer) {
      return reply.status(404).send({ message: "Customer not found" });
    }

    return reply.send({ wishlist: customer.wishlist || [] });
  } catch (error) {
    console.error("GET WISHLIST ERROR:", error);
    return reply.status(500).send({ message: "Failed to fetch wishlist", error: error.message });
  }
};

/**
 * Toggle a product in/out of the customer's wishlist.
 */
export const toggleWishlistItem = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { productId } = req.body;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return reply.status(400).send({ message: "Valid productId is required" });
    }

    const customer = await Customer.findById(userId);
    if (!customer) {
      return reply.status(404).send({ message: "Customer not found" });
    }

    const exists = customer.wishlist.some(
      (id) => id.toString() === productId.toString()
    );

    if (exists) {
      customer.wishlist = customer.wishlist.filter(
        (id) => id.toString() !== productId.toString()
      );
    } else {
      customer.wishlist.push(productId);
    }

    await customer.save();

    const updatedCustomer = await Customer.findById(userId).populate({
      path: "wishlist",
      match: { isEnabled: true },
    });

    return reply.send({
      message: exists ? "Removed from wishlist" : "Added to wishlist",
      isWishlisted: !exists,
      wishlist: updatedCustomer.wishlist || [],
    });
  } catch (error) {
    console.error("TOGGLE WISHLIST ITEM ERROR:", error);
    return reply.status(500).send({ message: "Failed to update wishlist", error: error.message });
  }
};

/**
 * Batch sync guest local storage wishlist items into MongoDB on login.
 */
export const syncWishlist = async (req, reply) => {
  try {
    const { userId } = req.user;
    const { productIds = [] } = req.body;

    if (!Array.isArray(productIds)) {
      return reply.status(400).send({ message: "productIds must be an array" });
    }

    const validObjectIds = productIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (validObjectIds.length > 0) {
      await Customer.findByIdAndUpdate(
        userId,
        { $addToSet: { wishlist: { $each: validObjectIds } } },
        { new: true }
      );
    }

    const customer = await Customer.findById(userId).populate({
      path: "wishlist",
      match: { isEnabled: true },
    });

    return reply.send({
      message: "Wishlist synced successfully",
      wishlist: customer?.wishlist || [],
    });
  } catch (error) {
    console.error("SYNC WISHLIST ERROR:", error);
    return reply.status(500).send({ message: "Failed to sync wishlist", error: error.message });
  }
};
