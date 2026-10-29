import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { catalogApi } from "../api";
import { useAddCopy, useAuthors, useBook, useBooks, useCreateBook, useDeleteBook } from "./useBooks";

vi.mock("../api", () => ({
  catalogApi: {
    searchBooks: vi.fn(),
    getBook: vi.fn(),
    getAuthors: vi.fn(),
    createAuthor: vi.fn(),
    createBook: vi.fn(),
    addCopy: vi.fn(),
    deleteBook: vi.fn(),
  },
}));

const book = {
  bookId: "book-1",
  title: "The Left Hand of Darkness",
  isbn: "9780441478125",
  totalCopies: 2,
  availableCopies: 1,
  author: { authorId: "author-1", name: "Ursula K. Le Guin" },
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("catalog hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads Books from the search API", async () => {
    vi.mocked(catalogApi.searchBooks).mockResolvedValue([book]);
    const { result } = renderHook(() => useBooks("9780441478125"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(catalogApi.searchBooks).toHaveBeenCalledWith("9780441478125");
    expect(result.current.data).toEqual([book]);
  });

  it("loads a Book and the Author list", async () => {
    vi.mocked(catalogApi.getBook).mockResolvedValue(book);
    vi.mocked(catalogApi.getAuthors).mockResolvedValue([book.author]);
    const wrapper = createWrapper();
    const bookResult = renderHook(() => useBook("book-1"), { wrapper });
    const authorResult = renderHook(() => useAuthors(), { wrapper });

    await waitFor(() => {
      expect(bookResult.result.current.isSuccess).toBe(true);
      expect(authorResult.result.current.isSuccess).toBe(true);
    });

    expect(catalogApi.getBook).toHaveBeenCalledWith("book-1");
    expect(catalogApi.getAuthors).toHaveBeenCalledOnce();
  });

  it("creates a Book without client-supplied Availability", async () => {
    vi.mocked(catalogApi.createBook).mockResolvedValue(book);
    const { result } = renderHook(() => useCreateBook(), { wrapper: createWrapper() });
    const request = {
      title: book.title,
      isbn: book.isbn,
      totalCopies: book.totalCopies,
      author: { authorId: book.author.authorId },
    };

    result.current.mutate(request);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(catalogApi.createBook).toHaveBeenCalledWith(request);
  });

  it("adds a copy using the Catalog command", async () => {
    vi.mocked(catalogApi.addCopy).mockResolvedValue({ ...book, totalCopies: 3, availableCopies: 2 });
    const { result } = renderHook(() => useAddCopy(), { wrapper: createWrapper() });

    result.current.mutate("book-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(catalogApi.addCopy).toHaveBeenCalledWith("book-1");
  });

  it("deletes a book and invalidates catalog and reservation dashboard data", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    vi.mocked(catalogApi.deleteBook).mockResolvedValue();
    const { result } = renderHook(() => useDeleteBook(), { wrapper });

    result.current.mutate("book-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(catalogApi.deleteBook).toHaveBeenCalledWith("book-1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["catalog", "books"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["reservation", "book-queues"] });
  });
});