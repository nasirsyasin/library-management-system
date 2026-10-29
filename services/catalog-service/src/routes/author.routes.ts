import { Router } from "express";
import { AuthorController } from "../controllers/author.controller";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.get("/authors", asyncHandler(AuthorController.list));
router.post("/authors", requireAuth, requireRole("librarian"), asyncHandler(AuthorController.create));

export default router;