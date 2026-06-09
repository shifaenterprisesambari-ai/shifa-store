import "dotenv/config";
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGO_URI);
console.log("Connected ✅");

const Branch = mongoose.model("Branch", new mongoose.Schema({ name: String, image: String, address: String, location: Object }));

const result = await Branch.updateMany({}, { $set: { name: "SHIFA STORE" } });
console.log("Branches updated:", result.modifiedCount);

await mongoose.disconnect();
console.log("Done ✅");
