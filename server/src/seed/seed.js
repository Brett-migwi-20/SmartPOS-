import { connectDatabase } from "../config/db.js";
import Category from "../models/Category.js";
import Customer from "../models/Customer.js";
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import User from "../models/User.js";

const seed = async () => {
  await connectDatabase();

  await Promise.all([
    Sale.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Customer.deleteMany({}),
    User.deleteMany({})
  ]);

  const categories = await Category.insertMany([
    { name: "Beverages", code: "BEV", description: "Coffee, tea, juices and bottled drinks." },
    { name: "Bakery", code: "BAK", description: "Daily baked breads and pastries." },
    { name: "Dairy", code: "DAI", description: "Milk, yogurt and refrigerated goods." },
    { name: "Snacks", code: "SNK", description: "Ready-to-eat snack items." }
  ]);
  const categoryByCode = Object.fromEntries(categories.map((category) => [category.code, category]));

  const products = await Product.insertMany([
    {
      name: "Organic Espresso Beans (500g)",
      sku: "ESP-500",
      category: categoryByCode.BEV._id,
      price: 18.5,
      cost: 11.25,
      stock: 42,
      reorderLevel: 10,
      unit: "bag"
    },
    {
      name: "Artisan Sourdough Loaf",
      sku: "BRD-SRD",
      category: categoryByCode.BAK._id,
      price: 6.25,
      cost: 2.9,
      stock: 12,
      reorderLevel: 5,
      unit: "loaf"
    },
    {
      name: "Sparkling Mineral Water (1L)",
      sku: "WAT-SPK",
      category: categoryByCode.BEV._id,
      price: 2.99,
      cost: 1.1,
      stock: 156,
      reorderLevel: 20,
      unit: "bottle"
    },
    {
      name: "Sea Salt Dark Choc Cookies",
      sku: "SNK-CK1",
      category: categoryByCode.SNK._id,
      price: 4.5,
      cost: 1.8,
      stock: 28,
      reorderLevel: 8,
      unit: "pack"
    },
    {
      name: "Full Cream Milk (2L)",
      sku: "MLK-2L",
      category: categoryByCode.DAI._id,
      price: 5.8,
      cost: 3.2,
      stock: 3,
      reorderLevel: 6,
      unit: "carton"
    },
    {
      name: "Greek Yogurt Plain (500g)",
      sku: "YGT-500",
      category: categoryByCode.DAI._id,
      price: 7.2,
      cost: 3.75,
      stock: 15,
      reorderLevel: 5,
      unit: "tub"
    }
  ]);

  const customers = await Customer.insertMany([
    {
      name: "Jordan Miles",
      email: "jordan@example.com",
      phone: "(555) 010-1133",
      tier: "Gold",
      totalSpend: 241.2,
      visits: 8
    },
    {
      name: "Priya Shah",
      email: "priya@example.com",
      phone: "(555) 010-8972",
      tier: "Standard",
      totalSpend: 82.9,
      visits: 3
    },
    {
      name: "Marcus Lee",
      email: "marcus@example.com",
      phone: "(555) 010-7714",
      tier: "Platinum",
      totalSpend: 548.72,
      visits: 14
    }
  ]);

  await User.insertMany([
    {
      name: "Alex Thompson",
      email: "admin@smartpos.local",
      password: "admin123",
      role: "Store Administrator"
    },
    {
      name: "Maya Patel",
      email: "manager@smartpos.local",
      password: "manager123",
      role: "Manager"
    },
    {
      name: "Chris Walker",
      email: "editor@smartpos.local",
      password: "editor123",
      role: "Editor"
    },
    {
      name: "Jordan Kim",
      email: "cashier@smartpos.local",
      password: "cashier123",
      role: "Cashier"
    },
    {
      name: "Lee Morgan",
      email: "viewer@smartpos.local",
      password: "viewer123",
      role: "Viewer"
    }
  ]);

  const espresso = products.find((product) => product.sku === "ESP-500");
  const water = products.find((product) => product.sku === "WAT-SPK");
  const loaf = products.find((product) => product.sku === "BRD-SRD");

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 2);

  await Sale.insertMany([
    {
      invoiceNumber: "INV-SEED-1001",
      customer: customers[0]._id,
      paymentMethod: "card",
      items: [
        {
          product: espresso._id,
          name: espresso.name,
          sku: espresso.sku,
          categoryName: "Beverages",
          quantity: 1,
          price: espresso.price,
          lineTotal: espresso.price
        },
        {
          product: water._id,
          name: water.name,
          sku: water.sku,
          categoryName: "Beverages",
          quantity: 3,
          price: water.price,
          lineTotal: Number((water.price * 3).toFixed(2))
        }
      ],
      subtotal: Number((espresso.price + water.price * 3).toFixed(2)),
      tax: Number(((espresso.price + water.price * 3) * 0.08).toFixed(2)),
      total: Number(((espresso.price + water.price * 3) * 1.08).toFixed(2)),
      createdAt: baseDate,
      updatedAt: baseDate
    },
    {
      invoiceNumber: "INV-SEED-1002",
      customer: customers[1]._id,
      paymentMethod: "cash",
      items: [
        {
          product: loaf._id,
          name: loaf.name,
          sku: loaf.sku,
          categoryName: "Bakery",
          quantity: 2,
          price: loaf.price,
          lineTotal: Number((loaf.price * 2).toFixed(2))
        }
      ],
      subtotal: Number((loaf.price * 2).toFixed(2)),
      tax: Number((loaf.price * 2 * 0.08).toFixed(2)),
      total: Number((loaf.price * 2 * 1.08).toFixed(2)),
      createdAt: new Date(baseDate.getTime() + 86400000),
      updatedAt: new Date(baseDate.getTime() + 86400000)
    }
  ]);

  console.log("[seed] demo data inserted");
  process.exit(0);
};

seed().catch((error) => {
  console.error("[seed] failed", error);
  process.exit(1);
});
