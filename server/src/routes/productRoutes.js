import { Router } from "express";
import {
  bulkUpsertProducts,
  createProduct,
  deleteProduct,
  exportProductsCsv,
  getProducts,
  getProductVersions,
  importProductsCsv,
  publishProduct,
  rollbackProductVersion,
  updateProduct
} from "../controllers/productController.js";
import { requirePermission } from "../middleware/permissions.js";

const router = Router();

router.get("/export/csv", requirePermission("content:import"), exportProductsCsv);
router.post("/import", requirePermission("content:import"), importProductsCsv);
router.post("/bulk", requirePermission("content:import"), bulkUpsertProducts);

router.route("/").get(getProducts).post(requirePermission("content:edit"), createProduct);
router.get("/:id/versions", requirePermission("settings:view"), getProductVersions);
router.post("/:id/publish", requirePermission("content:publish"), publishProduct);
router.post("/:id/rollback/:version", requirePermission("content:publish"), rollbackProductVersion);
router
  .route("/:id")
  .put(requirePermission("content:edit"), updateProduct)
  .delete(requirePermission("content:delete"), deleteProduct);

export default router;
