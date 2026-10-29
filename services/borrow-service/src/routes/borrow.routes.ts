import { Router } from "express";
import { BorrowController } from "../controllers/borrow.controller";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth, requireRole, requireService } from "../middleware/auth.middleware";

const router = Router();

router.get("/internal/books/:bookId/active-transactions", requireService("catalog-service"), asyncHandler(BorrowController.activeTransactionsForBook));
router.get("/borrows/requests", requireAuth, requireRole("librarian"), asyncHandler(BorrowController.pendingBorrowRequests));
router.get("/borrows/active", requireAuth, requireRole("librarian"), asyncHandler(BorrowController.activeBorrows));
router.get("/borrows/overdue", requireAuth, requireRole("librarian"), asyncHandler(BorrowController.overdueBorrows));
router.get("/borrows/member/:memberId", requireAuth, asyncHandler(BorrowController.memberHistory));
router.post("/borrows", requireAuth, asyncHandler(BorrowController.borrow));
router.patch("/borrows/requests/:borrowId/approve", requireAuth, requireRole("librarian"), asyncHandler(BorrowController.approveBorrowRequest));
router.patch("/borrows/requests/:borrowId/reject", requireAuth, requireRole("librarian"), asyncHandler(BorrowController.rejectBorrowRequest));
router.post("/borrows/:borrowId/return", requireAuth, asyncHandler(BorrowController.returnBook));

export default router;
