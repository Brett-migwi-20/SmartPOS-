import { Router } from "express";
import { getReportsOverview } from "../controllers/reportController.js";

const router = Router();

router.get("/overview", getReportsOverview);

export default router;
