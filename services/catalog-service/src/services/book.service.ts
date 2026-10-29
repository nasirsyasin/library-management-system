import {
  addBookCopy,
  archiveBook,
  decrementAvailableCopies,
  findBookById,
  hasAvailableCopies,
  incrementAvailableCopies,
  insertBook,
  restoreArchivedBook,
  searchBooks,
} from "../repositories/book.repository";
import { hasActiveTransactions } from "./transaction.client";

export interface CreateBookInput {
  title: string;
  isbn: string;
  totalCopies: number;
  author: { authorId: string };
}

export const BookService = {
  search: searchBooks,
  getById: findBookById,
  isAvailable: hasAvailableCopies,
  decrementAvailability: decrementAvailableCopies,
  incrementAvailability: incrementAvailableCopies,
  addCopy: addBookCopy,
  archive: async (bookId: string) => {
    const book = await findBookById(bookId);
    if (!book || book.archivedAt) return "not-found" as const;
    if (await hasActiveTransactions(bookId)) return "active-transactions" as const;
    const archived = await archiveBook(bookId);
    if (archived !== "archived") return archived;

    try {
      if (await hasActiveTransactions(bookId)) {
        await restoreArchivedBook(bookId);
        return "active-transactions" as const;
      }
    } catch (error: unknown) {
      await restoreArchivedBook(bookId);
      throw error;
    }
    return "archived" as const;
  },
  create: (data: CreateBookInput) =>
    insertBook({
      title: data.title,
      isbn: data.isbn,
      totalCopies: data.totalCopies,
      authorAuthorId: data.author.authorId,
    }),
};
