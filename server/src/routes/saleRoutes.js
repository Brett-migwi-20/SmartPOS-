import { Router } from "express";
import { createSale, getSales } from "../controllers/saleController.js";
import { requirePermission } from "../middleware/permissions.js";

const router = Router();

router.route("/").get(requirePermission("sales:view"), getSales).post(requirePermission("sales:create"), createSale);

export default router;
