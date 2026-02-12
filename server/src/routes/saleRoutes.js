import { Router } from "express";
import { createSale, getSales } from "../controllers/saleController.js";

const router = Router();

router.route("/").get(getSales).post(createSale);

export default router;
