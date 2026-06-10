import "dotenv/config";
import { connectDB } from "./src/config/connect.js";
import { ShopOwner } from "./src/models/user.js";
import Product from "./src/models/products.js";
import Order from "./src/models/order.js";

const run = async () => {
  await connectDB(process.env.MONGO_URI);
  
  console.log("=== SHOP OWNERS ===");
  const owners = await ShopOwner.find();
  for (const owner of owners) {
    console.log(`Owner ID: ${owner._id}`);
    console.log(`Email: ${owner.email}`);
    console.log(`Role: ${owner.role}`);
    console.log(`Shop Field: ${owner.shop}`);
    console.log(`Branch Field: ${owner.branch}`);
    console.log("--------------------------------");
  }

  console.log("\n=== PRODUCTS ===");
  const products = await Product.find().limit(5);
  for (const prod of products) {
    console.log(`Product ID: ${prod._id}`);
    console.log(`Name: ${prod.name}`);
    console.log(`Shop Ref: ${prod.shop}`);
    console.log("--------------------------------");
  }

  console.log("\n=== LAST 5 ORDERS ===");
  const orders = await Order.find().sort({ createdAt: -1 }).limit(5);
  for (const order of orders) {
    console.log(`Order ID: ${order._id}`);
    console.log(`OrderId (Human Readable): ${order.orderId}`);
    console.log(`Is Parent: ${order.isParent}`);
    console.log(`Parent ID: ${order.parentOrder}`);
    console.log(`ShopOwner Ref: ${order.shopOwner}`);
    console.log(`Status: ${order.status}`);
    console.log("--------------------------------");
  }

  process.exit(0);
};

run().catch(console.error);
