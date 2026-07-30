import mongoose from "mongoose";
import { ShopOwner, DeliveryPartner } from "../models/user.js";

const migrateIdNumbers = async () => {
  try {
    // Migrate Shop Owners
    const owners = await ShopOwner.find({ idNumber: { $exists: false } });
    for (let i = 0; i < owners.length; i++) {
      const count = await ShopOwner.countDocuments({ idNumber: { $exists: true } });
      owners[i].idNumber = `SO-${1001 + count}`;
      await owners[i].save();
    }

    // Migrate Delivery Partners
    const partners = await DeliveryPartner.find({ idNumber: { $exists: false } });
    for (let i = 0; i < partners.length; i++) {
      const count = await DeliveryPartner.countDocuments({ idNumber: { $exists: true } });
      partners[i].idNumber = `DP-${1001 + count}`;
      await partners[i].save();
    }
    if (owners.length > 0 || partners.length > 0) {
      console.log(`MIGRATED ID NUMBERS: ${owners.length} owners, ${partners.length} partners ✅`);
    }
  } catch (err) {
    console.error("Migration error in connectDB:", err);
  }
};

export const connectDB = async(uri)=>{
    try {
        await mongoose.connect(uri)
        console.log("DB CONNECTED ✅")
        await migrateIdNumbers();
    } catch (error) {
        console.log("Database connection error: " ,error)
    }
}