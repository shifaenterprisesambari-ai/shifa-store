import "dotenv/config";
import mongoose from "mongoose";
import { authenticate } from "./src/config/config.js";

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB successfully!");
    const result = await authenticate("shifaenterprisesambari@gmail.com", "Shifa@2025");
    console.log("Authentication result:", result);
  } catch (error) {
    console.error("Error during authentication test:", error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
