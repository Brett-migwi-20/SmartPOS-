import mongoose from "mongoose";

const seoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "",
      trim: true
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    keywords: {
      type: [String],
      default: []
    },
    slug: {
      type: String,
      default: "",
      trim: true
    }
  },
  { _id: false }
);

const imageSchema = new mongoose.Schema(
  {
    original: {
      type: String,
      default: ""
    },
    thumbnail: {
      type: String,
      default: ""
    },
    altText: {
      type: String,
      default: "",
      trim: true
    },
    mimeType: {
      type: String,
      default: ""
    },
    width: {
      type: Number,
      default: 0
    },
    height: {
      type: Number,
      default: 0
    },
    size: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const versionSchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true
    },
    action: {
      type: String,
      enum: ["created", "updated", "published", "rollback", "imported", "bulk"],
      default: "updated"
    },
    note: {
      type: String,
      default: "",
      trim: true
    },
    changedBy: {
      type: String,
      default: "System"
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    cost: {
      type: Number,
      default: 0,
      min: 0
    },
    stock: {
      type: Number,
      default: 0,
      min: 0
    },
    reorderLevel: {
      type: Number,
      default: 5,
      min: 0
    },
    unit: {
      type: String,
      default: "pcs"
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    barcode: {
      type: String,
      default: "",
      trim: true
    },
    tags: {
      type: [String],
      default: []
    },
    seo: {
      type: seoSchema,
      default: () => ({})
    },
    image: {
      type: imageSchema,
      default: () => ({})
    },
    imageUrl: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft"
    },
    publishedAt: {
      type: Date,
      default: null
    },
    publishedBy: {
      type: String,
      default: ""
    },
    lastEditedBy: {
      type: String,
      default: ""
    },
    versionHistory: {
      type: [versionSchema],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
