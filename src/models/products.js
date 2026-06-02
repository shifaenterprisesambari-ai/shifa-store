import mongoose from "mongoose";

const productScehma = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  images: [{ type: String }],
  description: { type: String },
  price: { type: Number, required: true },
  discountPrice: { type: Number },
  quantity: { type: String, required: true },
  stockQuantity: { type: Number, default: 0 },
  isAvailable: { type: Boolean, default: true },
  isEnabled: { type: Boolean, default: true },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ShopOwner",
  },
});

productScehma.index({ shop: 1, isEnabled: 1 });
productScehma.index({ category: 1, isAvailable: 1 });

const Product = mongoose.model("Product", productScehma);

export default Product;
