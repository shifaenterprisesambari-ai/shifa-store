import mongoose from "mongoose";
import Counter from "./counter.js";

const orderSchema= new mongoose.Schema({
    orderId:{
        type:String,
        unique:true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref :"Customer",
        required:true
    },
    deliveryPartner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeliveryPartner",
    },
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        required: true,
    },
    shopOwner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ShopOwner",
    },
    items: [
        {
          id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
          },
          item: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
          },
          count: { type: Number, required: true },
        },
      ],
      deliveryLocation: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        address: { type: String },
      },
      pickupLocation: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        address: { type: String },
      },
      deliveryPersonLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String },
      },
      status: {
        type: String,
        enum: [
          "available",
          "pending",
          "accepted",
          "rejected",
          "assigned",
          "acceptedByRider",
          "pickedUp",
          "outForDelivery",
          "confirmed",
          "arriving",
          "delivered",
          "cancelled",
        ],
        default: "pending",
      },
      deliveryOtp: { type: String },
      otpVerified: { type: Boolean, default: false },
      rejectionReason: { type: String },
      totalPrice: { type: Number, required: true },
      isParent: { type: Boolean, default: false },
      parentOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
      platformEarnings: { type: Number, default: 0 },
      vendorPayout: { type: Number, default: 0 },
      paymentMethod: {
        type: String,
        enum: ["COD", "Online"],
        default: "COD",
      },
      paymentStatus: {
        type: String,
        enum: ["unpaid", "paid", "COD", "failed"],
        default: "COD",
      },
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String },
      razorpaySignature: { type: String },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
});

orderSchema.index({ status: 1 });
orderSchema.index({ shopOwner: 1, status: 1 });
orderSchema.index({ deliveryPartner: 1, status: 1 });
orderSchema.index({ parentOrder: 1 });
orderSchema.index({ isParent: 1 });
orderSchema.index({ customer: 1 });

async function getNextSequenceValue(sequenceName) {
    const sequenceDocument = await Counter.findOneAndUpdate(
        { name: sequenceName },
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true }
      );
      return sequenceDocument.sequence_value;
}

orderSchema.pre('save',async function (next){
    if(this.isNew){
        const sequenceValue = await getNextSequenceValue("orderId");
        this.orderId=`ORDR${sequenceValue.toString().padStart(5,'0')}`
    }
    this.updatedAt = Date.now();
    next();
});

const Order = mongoose.model('Order',orderSchema)

export default Order