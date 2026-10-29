import { Router } from "express";
import { ReservationController } from "../controllers/reservation.controller";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth, requireRole, requireService } from "../middleware/auth.middleware";

const router = Router();

router.get("/internal/books/:bookId/active-transactions", requireService("catalog-service"), asyncHandler(ReservationController.activeTransactionsForBook));
router.get("/internal/books/:bookId/ready", requireService("borrow-service"), asyncHandler(ReservationController.nextReadyReservation));
router.patch("/internal/books/:bookId/ready/fulfill", requireService("borrow-service"), asyncHandler(ReservationController.fulfillNextReadyReservation));
router.patch("/internal/books/:bookId/ready/reject", requireService("borrow-service"), asyncHandler(ReservationController.rejectNextReadyReservation));
router.patch("/internal/reservations/:reservationId/restore-ready", requireService("borrow-service"), asyncHandler(ReservationController.restoreReadyReservation));
router.post("/reservations", requireAuth, asyncHandler(ReservationController.create));
router.get("/reservations/book/:bookId", requireAuth, requireRole("librarian"), asyncHandler(ReservationController.queueForBook));
router.get("/reservations/member/:memberId", requireAuth, asyncHandler(ReservationController.memberReservations));
router.get("/notifications/member/:memberId", requireAuth, asyncHandler(ReservationController.memberNotifications));
router.patch("/notifications/:notificationId/read", requireAuth, asyncHandler(ReservationController.markNotificationRead));
router.post("/reservations/notify-availability", requireService("borrow-service"), asyncHandler(ReservationController.notifyAvailability));

export default router;
