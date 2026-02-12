import { Router } from "express";
import {
  bulkUpsertCategories,
  createCategory,
  deleteCategory,
  exportCategoriesCsv,
  getCategories,
  getCategoryVersions,
  importCategoriesCsv,
  publishCategory,
  rollbackCategoryVersion,
  updateCategory
} from "../controllers/categoryController.js";
import { requirePermission } from "../middleware/permissions.js";

const router = Router();

router.get("/export/csv", requirePermission("content:import"), exportCategoriesCsv);
router.post("/import", requirePermission("content:import"), importCategoriesCsv);
router.post("/bulk", requirePermission("content:import"), bulkUpsertCategories);

router.route("/").get(getCategories).post(requirePermission("content:edit"), createCategory);
router.get("/:id/versions", requirePermission("settings:view"), getCategoryVersions);
router.post("/:id/publish", requirePermission("content:publish"), publishCategory);
router.post("/:id/rollback/:version", requirePermission("content:publish"), rollbackCategoryVersion);
router
  .route("/:id")
  .put(requirePermission("content:edit"), updateCategory)
  .delete(requirePermission("content:delete"), deleteCategory);

export default router;
