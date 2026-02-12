import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true
    },
    phone: {
      type: String,
      trim: true
    },
    tier: {
      type: String,
      enum: ["Standard", "Gold", "Platinum"],
      default: "Standard"
    },
    totalSpend: {
      type: Number,
      default: 0,
      min: 0
    },
    visits: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

const Customer = mongoose.model("Customer", customerSchema);

export default Customer;
