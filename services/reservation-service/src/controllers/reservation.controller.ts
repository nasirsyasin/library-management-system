import { Request, Response } from "express";
import { ReservationService } from "../services/reservation.service";
import { hasActiveReservationForBook } from "../repositories/reservation.repository";

type AuthenticatedRequest = Request & {
  user: { memberId: string; role: string };
};

export const ReservationController = {
  create: async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    const { bookId } = req.body ?? {};
    if (typeof bookId !== "string" || !bookId.trim()) {
      return res.status(400).json({ error: "Book ID is required" });
    }
    try {
      const reservation = await ReservationService.create(user.memberId, bookId);
      res.status(201).json(reservation);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "Book not found") {
        return res.status(404).json({ error: "Book not found" });
      }
      throw error;
    }
  },

  activeTransactionsForBook: async (req: Request, res: Response) =>
    res.json({ active: await hasActiveReservationForBook(req.params.bookId) }),

  nextReadyReservation: async (req: Request, res: Response) =>
    res.json({ reservation: await ReservationService.getNextReadyReservation(req.params.bookId) }),

  fulfillNextReadyReservation: async (req: Request, res: Response) => {
    const memberId = req.body?.memberId;
    if (typeof memberId !== "string" || !memberId.trim()) {
      return res.status(400).json({ error: "Member ID is required" });
    }
    const reservation = await ReservationService.fulfillNextReadyReservation(req.params.bookId, memberId);
    if (!reservation) return res.status(409).json({ error: "Reservation is no longer ready for this member" });
    res.json({ reservation });
  },

  rejectNextReadyReservation: async (req: Request, res: Response) => {
    const memberId = req.body?.memberId;
    if (typeof memberId !== "string" || !memberId.trim()) {
      return res.status(400).json({ error: "Member ID is required" });
    }
    const reservation = await ReservationService.rejectNextReadyReservation(req.params.bookId, memberId);
    res.json({ reservation });
  },

  restoreReadyReservation: async (req: Request, res: Response) => {
    const reservation = await ReservationService.restoreReadyReservation(req.params.reservationId);
    if (!reservation) return res.status(404).json({ error: "Reservation not found or no longer active" });
    res.json({ reservation });
  },

  queueForBook: async (req: Request, res: Response) =>
    res.json(await ReservationService.getQueueForBook(req.params.bookId)),

  memberReservations: async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    if (user.memberId !== req.params.memberId && user.role !== "librarian") {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(await ReservationService.getMemberReservations(req.params.memberId));
  },

  memberNotifications: async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    if (user.memberId !== req.params.memberId) return res.status(403).json({ error: "Forbidden" });
    res.json(await ReservationService.getMemberNotifications(req.params.memberId));
  },

  markNotificationRead: async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    const notification = await ReservationService.markNotificationRead(req.params.notificationId, user.memberId);
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    res.json(notification);
  },

  // Called by borrow-service (REST) when a reserved book is returned.
  notifyAvailability: async (req: Request, res: Response) => {
    const bookId = req.body?.bookId;
    if (typeof bookId !== "string" || !bookId.trim()) {
      return res.status(400).json({ error: "Book ID is required" });
    }
    const result = await ReservationService.notifyNextInQueue(bookId);
    res.json(result || { message: "No one is waiting for this book" });
  },
};
