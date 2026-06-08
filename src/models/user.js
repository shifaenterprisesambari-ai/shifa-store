import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Base User Schema

const userSchema = new mongoose.Schema({
    name: { type : String },
    role: {
        type: String,
        enum: ["Customer", "Admin", "DeliveryPartner", "ShopOwner"],
        required: true,
    },
    isActivated: {type: Boolean, default: false}
})

// Customer Schema

const customerSchema = new mongoose.Schema({
    ...userSchema.obj,
    phone : { type: Number, unique: true, sparse: true },
    email: { type: String, unique: true, sparse: true },
    password: { type: String },
    plainPassword: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ["Customer"], default: "Customer" },
    liveLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    address: { type: String },
    addresses: [{
      label: { type: String },
      address: { type: String },
      latitude: { type: Number },
      longitude: { type: Number },
      isDefault: { type: Boolean, default: false },
    }],
})

// Delivery Partner Schema
const deliveryPartnerSchema = new mongoose.Schema({
    ...userSchema.obj,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    plainPassword: { type: String },
    phone: { type: Number, required: true },
    role: { type: String, enum: ["DeliveryPartner"], default: "DeliveryPartner" },
    liveLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    address: { type: String },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },
    isAvailable: { type: Boolean, default: true },
  });

// Shop Owner Schema

const shopOwnerSchema = new mongoose.Schema({
    ...userSchema.obj,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    plainPassword: { type: String },
    phone: { type: Number },
    role: { type: String, enum: ["ShopOwner"], default: "ShopOwner" },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },
    shop: { type: mongoose.Schema.Types.ObjectId },
    // Personal store identity — independent of the shared Branch document
    shopName: { type: String },       // owner's own store brand name
    shopImage: { type: String },      // owner's own store photo/logo URL
    shopAddress: { type: String },    // owner's own store address
});

// Admin Schema

const adminSchema = new mongoose.Schema({
    ...userSchema.obj,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["Admin"], default: "Admin" },
});

// Hook to automatically hash passwords before saving
const hashPasswordHook = async function (next) {
  if (this.isModified("password") && this.password) {
    // Avoid double hashing if already bcrypt hashed
    if (!this.password.startsWith("$2")) {
      // Store the plain text password in a visible field in the database
      this.plainPassword = this.password;
      try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
      } catch (err) {
        return next(err);
      }
    }
  }
  next();
};

customerSchema.pre("save", hashPasswordHook);
deliveryPartnerSchema.pre("save", hashPasswordHook);
shopOwnerSchema.pre("save", hashPasswordHook);
adminSchema.pre("save", hashPasswordHook);

export const Customer = mongoose.model("Customer", customerSchema);
export const DeliveryPartner = mongoose.model(
  "DeliveryPartner",
  deliveryPartnerSchema
);
export const ShopOwner = mongoose.model("ShopOwner", shopOwnerSchema);
export const Admin = mongoose.model("Admin", adminSchema);
