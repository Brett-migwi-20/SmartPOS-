import mongoose from "mongoose";
import { hasPermission } from "../middleware/permissions.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import { parseCsv, stringifyCsv } from "../utils/csv.js";
import asyncHandler from "../utils/asyncHandler.js";

const VERSION_LIMIT = 40;
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const PRODUCT_SNAPSHOT_FIELDS = [
  "name",
  "sku",
  "category",
  "price",
  "cost",
  "stock",
  "reorderLevel",
  "unit",
  "description",
  "barcode",
  "tags",
  "seo",
  "image",
  "imageUrl",
  "status",
  "publishedAt",
  "publishedBy",
  "lastEditedBy",
  "isActive"
];

const parseNumeric = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeString = (value) => String(value ?? "").trim();

const normalizeBoolean = (value, fallback = true) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = normalizeString(value).toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n"].includes(normalized)) {
    return false;
  }
  return fallback;
};

const splitList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeString(entry))
      .filter(Boolean)
      .filter((entry, index, values) => values.indexOf(entry) === index);
  }

  return normalizeString(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry, index, values) => values.indexOf(entry) === index);
};

const toSlug = (value) =>
  normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const normalizeSeo = (seo = {}, fallbackName = "") => {
  const safeSeo = seo && typeof seo === "object" ? seo : {};
  const title = normalizeString(safeSeo.title || fallbackName);
  const description = normalizeString(safeSeo.description);
  const keywords = splitList(safeSeo.keywords);
  const slug = normalizeString(safeSeo.slug || toSlug(title || fallbackName));

  return {
    title,
    description,
    keywords,
    slug
  };
};

const normalizeImage = (image = {}, fallbackImageUrl = "") => {
  const safeImage = image && typeof image === "object" ? image : {};
  const original = normalizeString(safeImage.original || safeImage.url || fallbackImageUrl);
  const thumbnail = normalizeString(safeImage.thumbnail || original);
  const mimeType = normalizeString(safeImage.mimeType).toLowerCase();

  return {
    original,
    thumbnail,
    altText: normalizeString(safeImage.altText),
    mimeType: ALLOWED_IMAGE_MIME_TYPES.has(mimeType) ? mimeType : "",
    width: Math.max(0, Math.round(parseNumeric(safeImage.width, 0))),
    height: Math.max(0, Math.round(parseNumeric(safeImage.height, 0))),
    size: Math.max(0, Math.round(parseNumeric(safeImage.size, 0)))
  };
};

const buildSnapshot = (product) => {
  const source = product.toObject ? product.toObject() : product;
  return PRODUCT_SNAPSHOT_FIELDS.reduce((accumulator, field) => {
    if (source[field] !== undefined) {
      accumulator[field] = source[field];
    }
    return accumulator;
  }, {});
};

const appendVersion = (product, { action = "updated", changedBy = "System", note = "" } = {}) => {
  const lastVersion = product.versionHistory?.length ? product.versionHistory[product.versionHistory.length - 1].version : 0;
  const versionEntry = {
    version: lastVersion + 1,
    action,
    note: normalizeString(note),
    changedBy,
    changedAt: new Date(),
    snapshot: buildSnapshot(product)
  };

  product.versionHistory = [...(product.versionHistory || []), versionEntry];
  if (product.versionHistory.length > VERSION_LIMIT) {
    product.versionHistory = product.versionHistory.slice(product.versionHistory.length - VERSION_LIMIT);
  }
};

const resolveCategoryId = async (value) => {
  const candidate = normalizeString(value);
  if (!candidate) {
    return "";
  }

  if (mongoose.Types.ObjectId.isValid(candidate)) {
    const category = await Category.findById(candidate).select("_id");
    return category ? String(category._id) : "";
  }

  const byCode = await Category.findOne({ code: candidate.toUpperCase() }).select("_id");
  if (byCode) {
    return String(byCode._id);
  }

  const byName = await Category.findOne({ name: new RegExp(`^${candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }).select("_id");
  if (byName) {
    return String(byName._id);
  }

  return "";
};

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

const normalizeProductPayload = async (source = {}, { allowStatus = false } = {}) => {
  const payload = {};

  if (hasOwn(source, "name")) {
    payload.name = normalizeString(source.name);
  }
  if (hasOwn(source, "sku")) {
    payload.sku = normalizeString(source.sku).toUpperCase();
  }
  if (hasOwn(source, "category")) {
    payload.category = await resolveCategoryId(source.category);
  }
  if (hasOwn(source, "price")) {
    payload.price = Math.max(0, parseNumeric(source.price, 0));
  }
  if (hasOwn(source, "cost")) {
    payload.cost = Math.max(0, parseNumeric(source.cost, 0));
  }
  if (hasOwn(source, "stock")) {
    payload.stock = Math.max(0, Math.round(parseNumeric(source.stock, 0)));
  }
  if (hasOwn(source, "reorderLevel")) {
    payload.reorderLevel = Math.max(0, Math.round(parseNumeric(source.reorderLevel, 5)));
  }
  if (hasOwn(source, "unit")) {
    payload.unit = normalizeString(source.unit || "pcs") || "pcs";
  }
  if (hasOwn(source, "description")) {
    payload.description = normalizeString(source.description);
  }
  if (hasOwn(source, "barcode")) {
    payload.barcode = normalizeString(source.barcode);
  }
  if (hasOwn(source, "tags")) {
    payload.tags = splitList(source.tags);
  }
  if (hasOwn(source, "seo")) {
    payload.seo = normalizeSeo(source.seo, payload.name || normalizeString(source.name));
  }
  if (hasOwn(source, "image") || hasOwn(source, "imageUrl")) {
    payload.image = normalizeImage(source.image, source.imageUrl);
    payload.imageUrl = payload.image.original || normalizeString(source.imageUrl);
  }
  if (hasOwn(source, "isActive")) {
    payload.isActive = normalizeBoolean(source.isActive, true);
  }
  if (allowStatus && hasOwn(source, "status")) {
    payload.status = normalizeString(source.status).toLowerCase() === "published" ? "published" : "draft";
  }

  return payload;
};

const hydrateWithSnapshot = (product, snapshot = {}) => {
  for (const field of PRODUCT_SNAPSHOT_FIELDS) {
    if (snapshot[field] !== undefined) {
      product.set(field, snapshot[field]);
    }
  }
};

const mapCategoryLookup = async () => {
  const categories = await Category.find().select("_id code name");
  const byId = new Map(categories.map((category) => [String(category._id), category]));
  const byCode = new Map(categories.map((category) => [category.code.toUpperCase(), category]));
  const byName = new Map(categories.map((category) => [category.name.toLowerCase(), category]));

  return {
    byId,
    byCode,
    byName
  };
};

const resolveCategoryFromLookup = (row, lookup) => {
  const categoryId = normalizeString(row.categoryId || row.category || "");
  const categoryCode = normalizeString(row.categoryCode || "");
  const categoryName = normalizeString(row.categoryName || "");

  if (categoryId && lookup.byId.has(categoryId)) {
    return lookup.byId.get(categoryId);
  }
  if (categoryCode && lookup.byCode.has(categoryCode.toUpperCase())) {
    return lookup.byCode.get(categoryCode.toUpperCase());
  }
  if (categoryName && lookup.byName.has(categoryName.toLowerCase())) {
    return lookup.byName.get(categoryName.toLowerCase());
  }

  return null;
};

export const getProducts = asyncHandler(async (req, res) => {
  const { search, category, lowStock, status, activeOnly } = req.query;
  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } }
    ];
  }

  if (category) {
    filter.category = category;
  }

  if (status) {
    filter.status = status;
  }

  if (activeOnly === "true") {
    filter.isActive = true;
  }

  if (lowStock === "true") {
    filter.$expr = { $lte: ["$stock", "$reorderLevel"] };
  }

  const products = await Product.find(filter).populate("category", "name code").sort({ updatedAt: -1 });
  res.json(products);
});

export const createProduct = asyncHandler(async (req, res) => {
  const actorName = req.authUser?.name || "System";
  const payload = await normalizeProductPayload(req.body);

  if (!payload.name || !payload.sku || !payload.category || payload.price === undefined) {
    res.status(400);
    throw new Error("name, sku, category and price are required.");
  }

  if (!(await Category.findById(payload.category).select("_id"))) {
    res.status(400);
    throw new Error("Invalid category.");
  }

  const product = new Product({
    ...payload,
    seo: payload.seo || normalizeSeo({}, payload.name),
    image: payload.image || normalizeImage({}, ""),
    status: "draft",
    lastEditedBy: actorName
  });

  appendVersion(product, {
    action: "created",
    changedBy: actorName,
    note: "Product created"
  });

  await product.save();
  const populatedProduct = await Product.findById(product._id).populate("category", "name code");
  res.status(201).json(populatedProduct);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const actorName = req.authUser?.name || "System";
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  const payload = await normalizeProductPayload(req.body);
  if (hasOwn(payload, "category") && !payload.category) {
    res.status(400);
    throw new Error("Invalid category.");
  }

  for (const [key, value] of Object.entries(payload)) {
    product.set(key, value);
  }
  product.lastEditedBy = actorName;

  appendVersion(product, {
    action: "updated",
    changedBy: actorName,
    note: normalizeString(req.body.saveMode || "manual save")
  });

  await product.save();
  const populatedProduct = await Product.findById(product._id).populate("category", "name code");
  res.json(populatedProduct);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  res.status(204).send();
});

export const publishProduct = asyncHandler(async (req, res) => {
  const actorName = req.authUser?.name || "System";
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  product.status = "published";
  product.publishedAt = new Date();
  product.publishedBy = actorName;
  product.lastEditedBy = actorName;

  appendVersion(product, {
    action: "published",
    changedBy: actorName,
    note: normalizeString(req.body?.note || "Published")
  });

  await product.save();
  const populatedProduct = await Product.findById(product._id).populate("category", "name code");
  res.json(populatedProduct);
});

export const getProductVersions = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).select("versionHistory");

  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  const versions = [...(product.versionHistory || [])]
    .sort((left, right) => right.version - left.version)
    .map((entry) => ({
      version: entry.version,
      action: entry.action,
      note: entry.note,
      changedBy: entry.changedBy,
      changedAt: entry.changedAt
    }));

  res.json(versions);
});

export const rollbackProductVersion = asyncHandler(async (req, res) => {
  const actorName = req.authUser?.name || "System";
  const targetVersion = parseNumeric(req.params.version, 0);

  const product = await Product.findById(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  const versionEntry = (product.versionHistory || []).find((entry) => entry.version === targetVersion);
  if (!versionEntry) {
    res.status(404);
    throw new Error("Version not found.");
  }

  hydrateWithSnapshot(product, versionEntry.snapshot || {});
  product.lastEditedBy = actorName;

  appendVersion(product, {
    action: "rollback",
    changedBy: actorName,
    note: `Rolled back to version ${targetVersion}`
  });

  await product.save();
  const populatedProduct = await Product.findById(product._id).populate("category", "name code");
  res.json(populatedProduct);
});

export const bulkUpsertProducts = asyncHandler(async (req, res) => {
  const actorName = req.authUser?.name || "System";
  const canPublish = hasPermission(req.authUser?.role || "Viewer", "content:publish");
  const items = Array.isArray(req.body.items) ? req.body.items : [];

  if (!items.length) {
    res.status(400);
    throw new Error("items array is required.");
  }

  let created = 0;
  let updated = 0;
  const errors = [];

  for (let index = 0; index < items.length; index += 1) {
    const row = items[index];
    try {
      const normalized = await normalizeProductPayload(row, { allowStatus: canPublish });

      const lookupId = normalizeString(row._id || row.id);
      const lookupSku = normalizeString(normalized.sku || row.sku).toUpperCase();
      const existing =
        (lookupId && mongoose.Types.ObjectId.isValid(lookupId) ? await Product.findById(lookupId) : null) ||
        (lookupSku ? await Product.findOne({ sku: lookupSku }) : null);

      if (existing) {
        for (const [key, value] of Object.entries(normalized)) {
          existing.set(key, value);
        }
        if (normalized.status === "published") {
          existing.publishedAt = existing.publishedAt || new Date();
          existing.publishedBy = actorName;
        }
        existing.lastEditedBy = actorName;
        appendVersion(existing, {
          action: "bulk",
          changedBy: actorName,
          note: "Bulk update"
        });
        await existing.save();
        updated += 1;
      } else {
        if (!normalized.name || !normalized.sku || !normalized.category || normalized.price === undefined) {
          throw new Error("name, sku, category and price are required.");
        }

        const product = new Product({
          ...normalized,
          status: normalized.status || "draft",
          publishedAt: normalized.status === "published" ? new Date() : null,
          publishedBy: normalized.status === "published" ? actorName : "",
          lastEditedBy: actorName,
          seo: normalized.seo || normalizeSeo({}, normalized.name),
          image: normalized.image || normalizeImage({}, "")
        });

        appendVersion(product, {
          action: "bulk",
          changedBy: actorName,
          note: "Bulk create"
        });
        await product.save();
        created += 1;
      }
    } catch (error) {
      errors.push({
        row: index + 1,
        message: error.message
      });
    }
  }

  res.json({
    created,
    updated,
    errors
  });
});

export const importProductsCsv = asyncHandler(async (req, res) => {
  const actorName = req.authUser?.name || "System";
  const canPublish = hasPermission(req.authUser?.role || "Viewer", "content:publish");
  const csvText = normalizeString(req.body.csvText);
  const overwrite = normalizeBoolean(req.body.overwrite, true);

  if (!csvText) {
    res.status(400);
    throw new Error("csvText is required.");
  }

  const rows = parseCsv(csvText);
  if (!rows.length) {
    res.status(400);
    throw new Error("No CSV rows found.");
  }

  const categoryLookup = await mapCategoryLookup();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    try {
      const category = resolveCategoryFromLookup(row, categoryLookup);
      if (!category) {
        throw new Error("Category not found for row.");
      }

      const source = {
        name: row.name,
        sku: row.sku,
        category: String(category._id),
        price: row.price,
        cost: row.cost,
        stock: row.stock,
        reorderLevel: row.reorderLevel,
        unit: row.unit,
        description: row.description,
        barcode: row.barcode,
        tags: row.tags,
        isActive: row.isActive,
        seo: {
          title: row.seoTitle,
          description: row.seoDescription,
          keywords: row.seoKeywords,
          slug: row.seoSlug
        },
        image: {
          altText: row.imageAltText
        },
        status: row.status
      };

      const normalized = await normalizeProductPayload(source, { allowStatus: canPublish });
      if (!normalized.name || !normalized.sku || normalized.price === undefined) {
        throw new Error("name, sku and price are required.");
      }

      const existing = await Product.findOne({ sku: normalized.sku });
      if (existing && !overwrite) {
        skipped += 1;
        continue;
      }

      if (existing) {
        for (const [key, value] of Object.entries(normalized)) {
          existing.set(key, value);
        }
        if (normalized.status === "published") {
          existing.publishedAt = existing.publishedAt || new Date();
          existing.publishedBy = actorName;
        }
        existing.lastEditedBy = actorName;
        appendVersion(existing, {
          action: "imported",
          changedBy: actorName,
          note: "CSV import update"
        });
        await existing.save();
        updated += 1;
      } else {
        const product = new Product({
          ...normalized,
          status: normalized.status || "draft",
          publishedAt: normalized.status === "published" ? new Date() : null,
          publishedBy: normalized.status === "published" ? actorName : "",
          lastEditedBy: actorName,
          seo: normalized.seo || normalizeSeo({}, normalized.name),
          image: normalized.image || normalizeImage({}, "")
        });

        appendVersion(product, {
          action: "imported",
          changedBy: actorName,
          note: "CSV import create"
        });
        await product.save();
        created += 1;
      }
    } catch (error) {
      errors.push({
        row: index + 2,
        message: error.message
      });
    }
  }

  res.json({
    created,
    updated,
    skipped,
    errors
  });
});

export const exportProductsCsv = asyncHandler(async (req, res) => {
  const products = await Product.find().populate("category", "name code").sort({ updatedAt: -1 });
  const csvRows = products.map((product) => ({
    id: String(product._id),
    name: product.name,
    sku: product.sku,
    categoryId: String(product.category?._id || ""),
    categoryCode: product.category?.code || "",
    categoryName: product.category?.name || "",
    price: product.price,
    cost: product.cost,
    stock: product.stock,
    reorderLevel: product.reorderLevel,
    unit: product.unit,
    description: product.description || "",
    barcode: product.barcode || "",
    tags: (product.tags || []).join(", "),
    status: product.status,
    isActive: product.isActive ? "true" : "false",
    imageAltText: product.image?.altText || "",
    seoTitle: product.seo?.title || "",
    seoDescription: product.seo?.description || "",
    seoKeywords: (product.seo?.keywords || []).join(", "),
    seoSlug: product.seo?.slug || ""
  }));

  const csv = stringifyCsv(csvRows, [
    "id",
    "name",
    "sku",
    "categoryId",
    "categoryCode",
    "categoryName",
    "price",
    "cost",
    "stock",
    "reorderLevel",
    "unit",
    "description",
    "barcode",
    "tags",
    "status",
    "isActive",
    "imageAltText",
    "seoTitle",
    "seoDescription",
    "seoKeywords",
    "seoSlug"
  ]);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=\"products-export.csv\"");
  res.status(200).send(csv);
});
