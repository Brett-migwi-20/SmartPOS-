import Sale from "../models/Sale.js";

export const getReportOverview = async (days = 30) => {
  const lookback = Number(days);
  const safeDays = Number.isNaN(lookback) || lookback <= 0 ? 30 : lookback;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - safeDays);
  startDate.setHours(0, 0, 0, 0);

  const [summaryRows, paymentBreakdown, categorySales, dailyRevenue] = await Promise.all([
    Sale.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          totalOrders: { $sum: 1 },
          avgTicket: { $avg: "$total" }
        }
      }
    ]),
    Sale.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          amount: { $sum: "$total" }
        }
      },
      { $sort: { amount: -1 } }
    ]),
    Sale.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.categoryName",
          revenue: { $sum: "$items.lineTotal" },
          units: { $sum: "$items.quantity" }
        }
      },
      { $sort: { revenue: -1 } }
    ]),
    Sale.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt"
            }
          },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  const summary = summaryRows[0] || {
    totalRevenue: 0,
    totalOrders: 0,
    avgTicket: 0
  };

  return {
    windowDays: safeDays,
    generatedAt: new Date().toISOString(),
    summary,
    paymentBreakdown: paymentBreakdown.map((row) => ({
      method: row._id,
      count: row.count,
      amount: row.amount
    })),
    categorySales: categorySales.map((row) => ({
      category: row._id || "Uncategorized",
      revenue: row.revenue,
      units: row.units
    })),
    dailyRevenue: dailyRevenue.map((row) => ({
      date: row._id,
      revenue: row.revenue,
      orders: row.orders
    }))
  };
};
