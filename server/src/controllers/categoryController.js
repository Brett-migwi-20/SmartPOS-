import mongoose from "mongoose";
import { hasPermission } from "../middleware/permissions.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import { parseCsv, stringifyCsv } from "../utils/csv.js";
import asyncHandler from "../utils/asyncHandler.js";

const VERSION_LIMIT = 40;
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const CATEGORY_SNAPSHOT_FIELDS = [
  "name",
  "code",
  "description",
  "displayOrder",
  "seo",
  "image",
  "status",
  "publishedAt",
  "publishedBy",
  "lastEditedBy",
  "isActive"
];

const normalizeString = (value) => String(value ?? "").trim();

const parseNumeric = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

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

const normalizeImage = (image = {}) => {
  const safeImage = image && typeof image === "object" ? image : {};
  const original = normalizeString(safeImage.original || safeImage.url || "");
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

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

const normalizeCategoryPayload = (source = {}, { allowStatus = false } = {}) => {
  const payload = {};

  if (hasOwn(source, "name")) {
    payload.name = normalizeString(source.name);
  }
  if (hasOwn(source, "code")) {
    payload.code = normalizeString(source.code).toUpperCase();
  }
  if (hasOwn(source, "description")) {
    payload.description = normalizeString(source.description);
  }
  if (hasOwn(source, "displayOrder")) {
    payload.displayOrder = Math.max(0, Math.round(parseNumeric(source.displayOrder, 0)));
  }
  if (hasOwn(source, "seo")) {
    payload.seo = normalizeSeo(source.seo, payload.name || normalizeString(source.name));
  }
  if (hasOwn(source, "image")) {
    payload.image = normalizeImage(source.image);
  }
  if (hasOwn(source, "isActive")) {
    payload.isActive = normalizeBoolean(source.isActive, true);
  }
  if (allowStatus && hasOwn(source, "status")) {
    payload.status = normalizeString(source.status).toLowerCase() === "published" ? "published" : "draft";
  }

  return payload;
};

const buildSnapshot = (category) => {
  const source = category.toObject ? category.toObject() : category;
  return CATEGORY_SNAPSHOT_FIELDS.reduce((accumulator, field) => {
    if (source[field] !== undefined) {
      accumulator[field] = source[field];
    }
    return accumulator;
  }, {});
};

const appendVersion = (category, { action = "updated", changedBy = "System", note = "" } = {}) => {
  const lastVersion = category.versionHistory?.length ? category.versionHistory[category.versionHistory.length - 1].version : 0;
  category.versionHistory = [
    ...(category.versionHistory || []),
    {
      version: lastVersion + 1,
      action,
      note: normalizeString(note),
      changedBy,
      changedAt: new Date(),
      snapshot: buildSnapshot(category)
    }
  ];

  if (category.versionHistory.length > VERSION_LIMIT) {
    category.versionHistory = category.versionHistory.slice(category.versionHistory.length - VERSION_LIMIT);
  }
};

const hydrateWithSnapshot = (category, snapshot = {}) => {
  for (const field of CATEGORY_SNAPSHOT_FIELDS) {
    if (snapshot[field] !== undefined) {
      category.set(field, snapshot[field]);
    }
  }
};

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ displayOrder: 1, name: 1 });
  res.json(categories);
});

export const createCategory = asyncHandler(async (req, res) => {
  const actorName = req.authUser?.name || "System";
  const payload = normalizeCategoryPayload(req.body);

  if (!payload.name || !payload.code) {
    res.status(400);
    throw new Error("Category name and code are required.");
  }

  const category = new Category({
    ...payload,
    status: "draft",
    lastEditedBy: actorName,
    seo: payload.seo || normalizeSeo({}, payload.name),
    image: payload.image || normalizeImage({})
  });

  appendVersion(category, {
    action: "created",
    changedBy: actorName,
    note: "Category created"
  });

  await category.save();
  res.status(201).json(category);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const actorName = req.authUser?.name || "System";
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error("Category not found.");
  }

  const payload = normalizeCategoryPayload(req.body);
  for (const [key, value] of Object.entries(payload)) {
    category.set(key, value);
  }
  category.lastEditedBy = actorName;

  appendVersion(category, {
    action: "updated",
    changedBy: actorName,
    note: normalizeString(req.body.saveMode || "manual save")
  });

  await category.save();
  res.json(category);
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const linkedProduct = await Product.findOne({ category: req.params.id });
  if (linkedProduct) {
    res.status(400);
    throw new Error("Cannot delete category with linked products.");
  }

  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    res.status(404);
    throw new Error("Category not found.");
  }

  res.status(204).send();
});

export const publishCategory = asyncHandler(async (req, res) => {
  const actorName = req.authUser?.name || "System";
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error("Category not found.");
  }

  category.status = "published";
  category.publishedAt = new Date();
  category.publishedBy = actorName;
  category.lastEditedBy = actorName;

  appendVersion(category, {
    action: "published",
    changedBy: actorName,
    note: normalizeString(req.body?.note || "Published")
  });

  await category.save();
  res.json(category);
});

export const getCategoryVersions = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id).select("versionHistory");

  if (!category) {
    res.status(404);
    throw new Error("Category not found.");
  }

  const versions = [...(category.versionHistory || [])]
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

export const rollbackCategoryVersion = asyncHandler(async (req, res) => {
  const actorName = req.authUser?.name || "System";
  const targetVersion = Math.max(1, Math.round(parseNumeric(req.params.version, 0)));
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error("Category not found.");
  }

  const versionEntry = (category.versionHistory || []).find((entry) => entry.version === targetVersion);
  if (!versionEntry) {
    res.status(404);
    throw new Error("Version not found.");
  }

  hydrateWithSnapshot(category, versionEntry.snapshot || {});
  category.lastEditedBy = actorName;

  appendVersion(category, {
    action: "rollback",
    changedBy: actorName,
    note: `Rolled back to version ${targetVersion}`
  });

  await category.save();
  res.json(category);
});

export const bulkUpsertCategories = asyncHandler(async (req, res) => {
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
      const normalized = normalizeCategoryPayload(row, { allowStatus: canPublish });
      const lookupId = normalizeString(row._id || row.id);
      const lookupCode = normalizeString(normalized.code || row.code).toUpperCase();
      const existing =
        (lookupId && mongoose.Types.ObjectId.isValid(lookupId) ? await Category.findById(lookupId) : null) ||
        (lookupCode ? await Category.findOne({ code: lookupCode }) : null);

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
        if (!normalized.name || !normalized.code) {
          throw new Error("name and code are required.");
        }

        const category = new Category({
          ...normalized,
          status: normalized.status || "draft",
          publishedAt: normalized.status === "published" ? new Date() : null,
          publishedBy: normalized.status === "published" ? actorName : "",
          lastEditedBy: actorName,
          seo: normalized.seo || normalizeSeo({}, normalized.name),
          image: normalized.image || normalizeImage({})
        });

        appendVersion(category, {
          action: "bulk",
          changedBy: actorName,
          note: "Bulk create"
        });
        await category.save();
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

export const importCategoriesCsv = asyncHandler(async (req, res) => {
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

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    try {
      const source = {
        name: row.name,
        code: row.code,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        status: row.status,
        seo: {
          title: row.seoTitle,
          description: row.seoDescription,
          keywords: row.seoKeywords,
          slug: row.seoSlug
        },
        image: {
          altText: row.imageAltText
        }
      };

      const normalized = normalizeCategoryPayload(source, { allowStatus: canPublish });
      if (!normalized.name || !normalized.code) {
        throw new Error("name and code are required.");
      }

      const existing = await Category.findOne({ code: normalized.code });
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
        const category = new Category({
          ...normalized,
          status: normalized.status || "draft",
          publishedAt: normalized.status === "published" ? new Date() : null,
          publishedBy: normalized.status === "published" ? actorName : "",
          lastEditedBy: actorName,
          seo: normalized.seo || normalizeSeo({}, normalized.name),
          image: normalized.image || normalizeImage({})
        });

        appendVersion(category, {
          action: "imported",
          changedBy: actorName,
          note: "CSV import create"
        });
        await category.save();
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

export const exportCategoriesCsv = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ displayOrder: 1, name: 1 });
  const csvRows = categories.map((category) => ({
    id: String(category._id),
    name: category.name,
    code: category.code,
    description: category.description || "",
    displayOrder: category.displayOrder || 0,
    status: category.status || "draft",
    isActive: category.isActive ? "true" : "false",
    imageAltText: category.image?.altText || "",
    seoTitle: category.seo?.title || "",
    seoDescription: category.seo?.description || "",
    seoKeywords: (category.seo?.keywords || []).join(", "),
    seoSlug: category.seo?.slug || ""
  }));

  const csv = stringifyCsv(csvRows, [
    "id",
    "name",
    "code",
    "description",
    "displayOrder",
    "status",
    "isActive",
    "imageAltText",
    "seoTitle",
    "seoDescription",
    "seoKeywords",
    "seoSlug"
  ]);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=\"categories-export.csv\"");
  res.status(200).send(csv);
});
