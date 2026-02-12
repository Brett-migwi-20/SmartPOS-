import asyncHandler from "../utils/asyncHandler.js";
import { getDashboardData } from "../services/dashboardService.js";

export const getDashboardOverview = asyncHandler(async (req, res) => {
  const dashboardData = await getDashboardData();
  res.json(dashboardData);
});
