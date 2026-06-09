import "dotenv/config";
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;

const branchSchema = new mongoose.Schema({
  name: String, image: String, shopOwner: mongoose.Schema.Types.ObjectId,
  location: { latitude: Number, longitude: Number },
  address: String,
  deliveryPartners: [mongoose.Schema.Types.ObjectId],
});
const Branch = mongoose.model("Branch", branchSchema);

const shopOwnerSchema = new mongoose.Schema({
  name: String, email: String, role: String,
  branch: mongoose.Schema.Types.ObjectId,
  shop: mongoose.Schema.Types.ObjectId,
});
const ShopOwner = mongoose.model("ShopOwner", shopOwnerSchema);

const productSchema = new mongoose.Schema({
  name: String, price: Number, isEnabled: Boolean, isAvailable: Boolean,
  shop: mongoose.Schema.Types.ObjectId,
});
const Product = mongoose.model("Product", productSchema);

await mongoose.connect(MONGO_URI);
console.log("Connected ✅\n");

const branches = await Branch.find().lean();
console.log(`=== BRANCHES (${branches.length}) ===`);
branches.forEach(b => console.log(` - ${b._id} | name: "${b.name}" | shopOwner: ${b.shopOwner}`));

const shopOwners = await ShopOwner.find().lean();
console.log(`\n=== SHOP OWNERS (${shopOwners.length}) ===`);
shopOwners.forEach(s => console.log(` - ${s._id} | email: ${s.email} | name: "${s.name}" | branch: ${s.branch} | shop: ${s.shop}`));

const products = await Product.find().lean();
console.log(`\n=== PRODUCTS (${products.length}) ===`);
products.forEach(p => console.log(` - "${p.name}" | price: ${p.price} | shop: ${p.shop} | enabled: ${p.isEnabled} | available: ${p.isAvailable}`));

await mongoose.disconnect();
