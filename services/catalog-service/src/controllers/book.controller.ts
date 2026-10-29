import { Request, Response } from "express";
import { BookService, CreateBookInput } from "../services/book.service";
import { TransactionCheckError } from "../services/transaction.client";

function postgresErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

export const BookController = {
  search: async (req: Request, res: Response) => {
    const books = await BookService.search(String(req.query.q || ""));
    res.json(books);
  },

  getById: async (req: Request, res: Response) => {
    const book = await BookService.getById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.json(book);
  },

  checkAvailability: async (req: Request, res: Response) => {
    const available = await BookService.isAvailable(req.params.id);
    res.json({ bookId: req.params.id, available });
  },

  decrementAvailability: async (req: Request, res: Response) => {
    try {
      const book = await BookService.decrementAvailability(req.params.id);
      res.json(book);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "No copies available") {
        return res.status(409).json({ error: "No copies available" });
      }
      throw error;
    }
  },
  incrementAvailability: async (req: Request, res: Response) => {
    try {
      const book = await BookService.incrementAvailability(req.params.id);
      res.json(book);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "Book not found") {
        return res.status(404).json({ error: "Book not found" });
      }
      if (error instanceof Error && error.message === "All copies are already available") {
        return res.status(409).json({ error: "All copies are already available" });
      }
      throw error;
    }
  },

  addCopy: async (req: Request, res: Response) => {
    const book = await BookService.addCopy(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.status(201).json(book);
  },

  create: async (req: Request, res: Response) => {
    const input = req.body as Partial<CreateBookInput>;
    const authorId = input.author?.authorId;
    if (
      typeof input.title !== "string" || !input.title.trim() ||
      typeof input.isbn !== "string" || !input.isbn.trim() ||
      !Number.isInteger(input.totalCopies) || Number(input.totalCopies) < 1 ||
      typeof authorId !== "string" || !authorId
    ) {
      return res.status(400).json({ error: "A title, ISBN, Author, and positive totalCopies are required" });
    }

    try {
      const created = await BookService.create({
        title: input.title.trim(),
        isbn: input.isbn.trim(),
        totalCopies: input.totalCopies as number,
        author: { authorId },
      });
      const book = await BookService.getById(created.bookId);
      if (!book) return res.status(404).json({ error: "Book not found after creation" });
      res.status(201).json(book);
    } catch (error: unknown) {
      if (postgresErrorCode(error) === "23505") {
        return res.status(409).json({ error: "A book with that ISBN already exists" });
      }
      if (postgresErrorCode(error) === "23503") {
        return res.status(404).json({ error: "Author not found" });
      }
      throw error;
    }
  },

  archive: async (req: Request, res: Response) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.params.id)) {
      return res.status(400).json({ error: "Invalid book ID" });
    }

    try {
      const result = await BookService.archive(req.params.id);
      if (result === "not-found") return res.status(404).json({ error: "Book not found" });
      if (result === "active-borrowings" || result === "active-transactions") {
        return res.status(409).json({
          error: "This book has active borrowings or reservations and cannot be deleted.",
        });
      }
      return res.status(204).end();
    } catch (error: unknown) {
      if (error instanceof TransactionCheckError) {
        console.error("Book transaction verification failed", error.causeError);
        return res.status(503).json({ error: "Book transactions could not be verified. Please try again." });
      }
      throw error;
    }
  },
};
