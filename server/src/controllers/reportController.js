import asyncHandler from "../utils/asyncHandler.js";
import { getReportOverview } from "../services/reportService.js";

export const getReportsOverview = asyncHandler(async (req, res) => {
  const data = await getReportOverview(req.query.days);
  res.json(data);
});
