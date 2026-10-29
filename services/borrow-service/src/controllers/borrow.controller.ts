import { Request, Response } from "express";
import { BorrowService } from "../services/borrow.service";
import { hasActiveBorrowForBook } from "../repositories/borrow.repository";

export const BorrowController = {
  activeBorrows: async (_req: Request, res: Response) => res.json(await BorrowService.getActiveBorrows()),

  pendingBorrowRequests: async (_req: Request, res: Response) =>
    res.json(await BorrowService.getPendingBorrowRequests()),

  activeTransactionsForBook: async (req: Request, res: Response) =>
    res.json({ active: await hasActiveBorrowForBook(req.params.bookId) }),

  overdueBorrows: async (_req: Request, res: Response) => res.json(await BorrowService.getOverdueBorrows()),

  memberHistory: async (req: Request, res: Response) => {
    const user = (req as Request & { user: { memberId: string; role: string } }).user;
    if (user.memberId !== req.params.memberId && user.role !== "librarian") {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(await BorrowService.getMemberHistory(req.params.memberId));
  },

  borrow: async (req: Request, res: Response) => {
    const bookId = req.body?.bookId;
    if (typeof bookId !== "string" || !bookId.trim()) {
      return res.status(400).json({ error: "Book ID is required" });
    }
    try {
      const user = (req as Request & { user: { memberId: string } }).user;
      const request = await BorrowService.requestBorrow(user.memberId, bookId);
      res.status(201).json(request);
    } catch (error: unknown) {
      console.error("Borrow request could not be submitted", error);
      res.status(500).json({ error: "Borrow request could not be submitted" });
    }
  },

  approveBorrowRequest: async (req: Request, res: Response) => {
    try {
      res.json(await BorrowService.approveBorrowRequest(req.params.borrowId));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      const statusCode = message === "Borrow request not found" ? 404
        : [
          "Borrow request is no longer pending",
          "Book is not available",
          "Book is reserved for another member",
        ].includes(message) ? 409
          : 500;
      if (statusCode === 500) {
        console.error("Borrow request approval could not be completed", error);
        return res.status(500).json({ error: "Borrow request approval could not be completed" });
      }
      res.status(statusCode).json({ error: message });
    }
  },

  rejectBorrowRequest: async (req: Request, res: Response) => {
    try {
      const rejected = await BorrowService.rejectBorrowRequest(req.params.borrowId);
      try {
        await BorrowService.handleRejectedReservedBorrow(rejected);
      } catch (queueError: unknown) {
        console.error("Borrow request was rejected, but the next reservation could not be promoted", queueError);
      }
      res.json(rejected);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      const statusCode = message === "Borrow request not found" ? 404
        : message === "Borrow request is no longer pending" ? 409
          : 500;
      if (statusCode === 500) {
        console.error("Borrow request rejection could not be completed", error);
        return res.status(500).json({ error: "Borrow request rejection could not be completed" });
      }
      res.status(statusCode).json({ error: message });
    }
  },

  returnBook: async (req: Request, res: Response) => {
    const user = (req as Request & { user: { memberId: string } }).user;
    let borrow;
    try {
      borrow = await BorrowService.returnBook(req.params.borrowId, user.memberId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      const statusCode = message === "Forbidden" ? 403
        : message === "Borrow not found" ? 404
          : ["Borrow has already been returned", "Borrow is not an active loan"].includes(message) ? 409
            : 500;
      if (statusCode === 500) {
        console.error("Return request could not be completed", error);
        return res.status(500).json({ error: "Return could not be completed" });
      }
      return res.status(statusCode).json({ error: message });
    }

    try {
      await BorrowService.finalizeReturnedBook(borrow.bookId);
    } catch (error: unknown) {
      console.error("Book return succeeded, but the next reservation could not be assigned for approval", error);
    }

    res.json(borrow);
  },
};
