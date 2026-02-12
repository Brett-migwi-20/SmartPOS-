import Product from "../models/Product.js";
import Sale from "../models/Sale.js";

const buildLastSevenDays = () => {
  const days = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() - 6);

  for (let index = 0; index < 7; index += 1) {
    const nextDay = new Date(base);
    nextDay.setDate(base.getDate() + index);
    days.push(nextDay);
  }

  return days;
};

export const getDashboardData = async () => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekDays = buildLastSevenDays();
  const weekStart = weekDays[0];

  const [
    todayRevenueResult,
    yesterdayRevenueResult,
    monthlyRevenueResult,
    totalProducts,
    lowStockItems,
    weeklyRevenueRows,
    recentSales,
    topProducts
  ] = await Promise.all([
    Sale.aggregate([
      { $match: { createdAt: { $gte: startOfToday } } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]),
    Sale.aggregate([
      { $match: { createdAt: { $gte: startOfYesterday, $lt: startOfToday } } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]),
    Sale.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]),
    Product.countDocuments(),
    Product.countDocuments({ $expr: { $lte: ["$stock", "$reorderLevel"] } }),
    Sale.aggregate([
      { $match: { createdAt: { $gte: weekStart } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          total: { $sum: "$total" }
        }
      }
    ]),
    Sale.find().sort({ createdAt: -1 }).limit(5).populate("customer", "name"),
    Sale.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: { sku: "$items.sku", name: "$items.name" },
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.lineTotal" }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 }
    ])
  ]);

  const todaySales = todayRevenueResult[0]?.total || 0;
  const yesterdaySales = yesterdayRevenueResult[0]?.total || 0;
  const monthlyRevenue = monthlyRevenueResult[0]?.total || 0;
  const dailyTrend = yesterdaySales === 0 ? 100 : ((todaySales - yesterdaySales) / yesterdaySales) * 100;

  const weeklyMap = new Map(weeklyRevenueRows.map((row) => [row._id, row.total]));
  const weeklySales = weekDays.map((day) => {
    const isoKey = day.toISOString().slice(0, 10);
    return {
      label: day.toLocaleDateString("en-US", { weekday: "short" }),
      date: isoKey,
      total: weeklyMap.get(isoKey) || 0
    };
  });

  return {
    kpis: {
      todaySales,
      dailyTrend,
      monthlyRevenue,
      totalProducts,
      lowStockItems
    },
    weeklySales,
    recentSales: recentSales.map((sale) => ({
      id: sale._id,
      invoiceNumber: sale.invoiceNumber,
      customer: sale.customer?.name || "Walk-in",
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      createdAt: sale.createdAt
    })),
    topProducts: topProducts.map((product) => ({
      sku: product._id.sku,
      name: product._id.name,
      quantity: product.quantity,
      revenue: product.revenue
    }))
  };
};
