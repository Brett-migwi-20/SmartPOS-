import Category from "../models/Category.js";
import Product from "../models/Product.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getProducts = asyncHandler(async (req, res) => {
  const { search, category, lowStock } = req.query;
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

  if (lowStock === "true") {
    filter.$expr = { $lte: ["$stock", "$reorderLevel"] };
  }

  const products = await Product.find(filter).populate("category", "name code").sort({ createdAt: -1 });
  res.json(products);
});

export const createProduct = asyncHandler(async (req, res) => {
  const { name, sku, category, price, stock = 0, reorderLevel = 5 } = req.body;

  if (!name || !sku || !category || price === undefined) {
    res.status(400);
    throw new Error("name, sku, category and price are required.");
  }

  const categoryExists = await Category.findById(category);
  if (!categoryExists) {
    res.status(400);
    throw new Error("Invalid category.");
  }

  const product = await Product.create({
    ...req.body,
    stock: Number(stock),
    reorderLevel: Number(reorderLevel),
    price: Number(price),
    cost: Number(req.body.cost || 0)
  });

  const populatedProduct = await Product.findById(product._id).populate("category", "name code");
  res.status(201).json(populatedProduct);
});

export const updateProduct = asyncHandler(async (req, res) => {
  if (req.body.category) {
    const categoryExists = await Category.findById(req.body.category);
    if (!categoryExists) {
      res.status(400);
      throw new Error("Invalid category.");
    }
  }

  const payload = { ...req.body };
  for (const numericField of ["price", "cost", "stock", "reorderLevel"]) {
    if (payload[numericField] !== undefined) {
      payload[numericField] = Number(payload[numericField]);
    }
  }

  const product = await Product.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true
  }).populate("category", "name code");

  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  res.json(product);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  res.status(204).send();
});
