import mongoose from "mongoose";

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String },
  shopOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ShopOwner",
  },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  address: { type: String },
  deliveryPartners: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryPartner",
    },
  ],
  commissionPercentage: {
    type: Number,
    default: 10,
    min: 0,
    max: 100,
  },
});

const Branch = mongoose.model("Branch", branchSchema);

export default Branch;
