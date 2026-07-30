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
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
  },
  totalSold: { type: Number, default: 0 }
});

productScehma.index({ shop: 1, isEnabled: 1 });
productScehma.index({ branch: 1, isEnabled: 1 });
productScehma.index({ category: 1, isAvailable: 1 });

productScehma.pre("save", async function (next) {
  if ((this.isModified("shop") || !this.branch) && this.shop) {
    try {
      const shopOwner = await mongoose.model("ShopOwner").findById(this.shop).select("branch");
      if (shopOwner && shopOwner.branch) {
        this.branch = shopOwner.branch;
      }
    } catch (err) {
      return next(err);
    }
  }
  next();
});

const Product = mongoose.model("Product", productScehma);

export default Product;
