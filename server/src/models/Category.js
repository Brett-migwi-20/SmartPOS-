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

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true
    },
    description: {
      type: String,
      default: ""
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    seo: {
      type: seoSchema,
      default: () => ({})
    },
    image: {
      type: imageSchema,
      default: () => ({})
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

const Category = mongoose.model("Category", categorySchema);

export default Category;
