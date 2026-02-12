import { Router } from "express";
import authRoutes from "./authRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
import customerRoutes from "./customerRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import productRoutes from "./productRoutes.js";
import reportRoutes from "./reportRoutes.js";
import saleRoutes from "./saleRoutes.js";

const router = Router();

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "SmartPOS API",
    time: new Date().toISOString()
  });
});

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/customers", customerRoutes);
router.use("/sales", saleRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/reports", reportRoutes);

export default router;
