import { Router } from "express";
import { BookController } from "../controllers/book.controller";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth, requireRole, requireService } from "../middleware/auth.middleware";

const router = Router();

router.get("/books", asyncHandler(BookController.search));
router.get("/books/:id", asyncHandler(BookController.getById));
router.get("/books/:id/availability", asyncHandler(BookController.checkAvailability));
router.post("/books/:id/availability/decrement", requireService("borrow-service"), asyncHandler(BookController.decrementAvailability));
router.post("/books/:id/availability/increment", requireService("borrow-service"), asyncHandler(BookController.incrementAvailability));
router.post("/books/:id/copies", requireAuth, requireRole("librarian"), asyncHandler(BookController.addCopy));
router.post("/books", requireAuth, requireRole("librarian"), asyncHandler(BookController.create));
router.delete("/books/:id", requireAuth, requireRole("librarian"), asyncHandler(BookController.archive));

export default router;
