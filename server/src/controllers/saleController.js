import Customer from "../models/Customer.js";
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import asyncHandler from "../utils/asyncHandler.js";

const generateInvoiceNumber = () => {
  const stamp = Date.now().toString().slice(-8);
  const randomSuffix = Math.floor(Math.random() * 900 + 100);
  return `INV-${stamp}-${randomSuffix}`;
};

export const getSales = asyncHandler(async (req, res) => {
  const { from, to, limit = 50 } = req.query;
  const filter = {};

  if (from || to) {
    filter.createdAt = {};
    if (from) {
      filter.createdAt.$gte = new Date(from);
    }
    if (to) {
      filter.createdAt.$lte = new Date(to);
    }
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const sales = await Sale.find(filter).sort({ createdAt: -1 }).limit(safeLimit).populate("customer", "name email");
  res.json(sales);
});

export const createSale = asyncHandler(async (req, res) => {
  const { items, customerId = null, paymentMethod = "card" } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error("At least one sale item is required.");
  }

  const requestedQuantities = new Map();
  for (const item of items) {
    const productId = String(item.productId || "");
    const quantity = Number(item.quantity);

    if (!productId) {
      res.status(400);
      throw new Error("Every sale item must include a productId.");
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      res.status(400);
      throw new Error("Every sale item must include a valid quantity.");
    }

    requestedQuantities.set(productId, (requestedQuantities.get(productId) || 0) + quantity);
  }

  const productIds = [...requestedQuantities.keys()];
  const products = await Product.find({ _id: { $in: productIds } }).populate("category", "name");
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  const lineItems = [...requestedQuantities.entries()].map(([productId, quantity]) => {
    const product = productMap.get(productId);

    if (!product) {
      res.status(400);
      throw new Error("One or more items reference an unknown product.");
    }
    if (product.stock < quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for ${product.name}.`);
    }

    const lineTotal = Number((product.price * quantity).toFixed(2));
    return {
      product: product._id,
      name: product.name,
      sku: product.sku,
      categoryName: product.category?.name || "Uncategorized",
      quantity,
      price: product.price,
      lineTotal
    };
  });

  const subtotal = Number(lineItems.reduce((sum, lineItem) => sum + lineItem.lineTotal, 0).toFixed(2));
  const tax = Number((subtotal * 0.08).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));

  const invoiceNumber = generateInvoiceNumber();
  const sale = await Sale.create({
    invoiceNumber,
    items: lineItems,
    customer: customerId || null,
    subtotal,
    tax,
    total,
    paymentMethod
  });

  const bulkOps = lineItems.map((lineItem) => ({
    updateOne: {
      filter: { _id: lineItem.product },
      update: { $inc: { stock: -lineItem.quantity } }
    }
  }));
  await Product.bulkWrite(bulkOps);

  if (customerId) {
    await Customer.findByIdAndUpdate(customerId, {
      $inc: { totalSpend: total, visits: 1 }
    });
  }

  const populatedSale = await Sale.findById(sale._id).populate("customer", "name email");
  res.status(201).json(populatedSale);
});
