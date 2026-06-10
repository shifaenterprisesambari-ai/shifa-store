import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "userModel",
  },
  userModel: {
    type: String,
    required: true,
    enum: ["Customer", "ShopOwner", "DeliveryPartner"],
  },
  subscription: {
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
  createdAt: { type: Date, default: Date.now },
});

pushSubscriptionSchema.index({ user: 1 });

const PushSubscription = mongoose.model("PushSubscription", pushSubscriptionSchema);
export default PushSubscription;
