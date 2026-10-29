process.env.JWT_SECRET = "test-jwt-secret-for-book-delete-tests";
process.env.CATALOG_DATABASE_URL = "postgresql://test:test@127.0.0.1:5432/test";

jest.mock("../dist/repositories/book.repository", () => ({
  addBookCopy: jest.fn(),
  archiveBook: jest.fn(),
  decrementAvailableCopies: jest.fn(),
  findBookById: jest.fn(),
  hasAvailableCopies: jest.fn(),
  incrementAvailableCopies: jest.fn(),
  insertBook: jest.fn(),
  restoreArchivedBook: jest.fn(),
  searchBooks: jest.fn(),
}));

jest.mock("../dist/services/transaction.client", () => ({
  hasActiveTransactions: jest.fn(),
  TransactionCheckError: class TransactionCheckError extends Error {},
}));

const express = require("express");
const jwt = require("jsonwebtoken");
const { BookService } = require("../dist/services/book.service");
const repository = require("../dist/repositories/book.repository");
const transactionClient = require("../dist/services/transaction.client");
const bookRoutes = require("../dist/routes/book.routes").default;

const bookId = "e8f4aa0e-0b2f-4ea6-9aa4-333f450913b2";
const app = express();
app.use(express.json());
app.use("/api", bookRoutes);

let server;
let baseUrl;

function token(role) {
  return jwt.sign({ memberId: "member-1", role }, process.env.JWT_SECRET);
}

async function deleteBook({ role, id = bookId } = {}) {
  const headers = {};
  if (role) headers.Authorization = `Bearer ${token(role)}`;
  return fetch(`${baseUrl}/api/books/${id}`, { method: "DELETE", headers });
}

beforeAll(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

beforeEach(() => {
  jest.clearAllMocks();
  repository.findBookById.mockResolvedValue({ bookId, archivedAt: null });
  transactionClient.hasActiveTransactions.mockResolvedValue(false);
  repository.archiveBook.mockResolvedValue("archived");
});

describe("book deletion authorization and behavior", () => {
  test("rejects unauthenticated requests", async () => {
    const response = await deleteBook();
    expect(response.status).toBe(401);
    expect(repository.archiveBook).not.toHaveBeenCalled();
  });

  test("rejects member requests even when called directly", async () => {
    const response = await deleteBook({ role: "member" });
    expect(response.status).toBe(403);
    expect(repository.archiveBook).not.toHaveBeenCalled();
  });

  test("allows a librarian to delete a book with no active transactions", async () => {
    const response = await deleteBook({ role: "librarian" });
    expect(response.status).toBe(204);
    expect(await BookService.archive(bookId)).toBe("archived");
    expect(transactionClient.hasActiveTransactions).toHaveBeenCalledWith(bookId);
    expect(repository.archiveBook).toHaveBeenCalledWith(bookId);
  });

  test("blocks deletion when active transactions exist", async () => {
    transactionClient.hasActiveTransactions.mockResolvedValue(true);
    const response = await deleteBook({ role: "librarian" });
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/active borrowings or reservations/i);
    expect(repository.archiveBook).not.toHaveBeenCalled();
    await expect(BookService.archive(bookId)).resolves.toBe("active-transactions");
    expect(repository.archiveBook).not.toHaveBeenCalled();
  });

  test("restores the catalog entry if a transaction appears during archival", async () => {
    transactionClient.hasActiveTransactions
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await expect(BookService.archive(bookId)).resolves.toBe("active-transactions");
    expect(repository.archiveBook).toHaveBeenCalledWith(bookId);
    expect(repository.restoreArchivedBook).toHaveBeenCalledWith(bookId);
  });

  test("returns 404 for a nonexistent book and 400 for an invalid ID", async () => {
    repository.archiveBook.mockResolvedValue("not-found");
    const missing = await deleteBook({ role: "librarian" });
    expect(missing.status).toBe(404);

    const invalid = await deleteBook({ role: "librarian", id: "not-a-uuid" });
    expect(invalid.status).toBe(400);
  });
});
