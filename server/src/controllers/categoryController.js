import Category from "../models/Category.js";
import Product from "../models/Product.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json(categories);
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, code, description = "" } = req.body;

  if (!name || !code) {
    res.status(400);
    throw new Error("Category name and code are required.");
  }

  const category = await Category.create({
    name,
    code,
    description
  });

  res.status(201).json(category);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!category) {
    res.status(404);
    throw new Error("Category not found.");
  }

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
