import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { catalogApi } from "../api";
import { reservationApi } from "../../../features/reservation/api";
import { useAuth } from "../../../shared/auth/useAuth";
import { Book } from "../types";
import { CatalogManagementPage } from "./CatalogManagementPage";

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

vi.mock("../../../features/reservation/api", () => ({
  reservationApi: {
    getBookQueue: vi.fn(),
    getMemberReservations: vi.fn(),
    createReservation: vi.fn(),
  },
}));

vi.mock("../../../shared/auth/useAuth", () => ({
  useAuth: vi.fn(),
}));

const book: Book = {
  bookId: "e8f4aa0e-0b2f-4ea6-9aa4-333f450913b2",
  title: "A Book",
  isbn: "1234567890",
  totalCopies: 1,
  availableCopies: 1,
  author: { authorId: "author-1", name: "An Author" },
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: PropsWithChildren) {
    return (
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </MemoryRouter>
    );
  }
  return render(<CatalogManagementPage onBorrow={vi.fn()} onReserve={vi.fn()} />, { wrapper: Wrapper });
}

describe("CatalogManagementPage deletion controls", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(catalogApi.searchBooks).mockResolvedValue([book]);
    vi.mocked(catalogApi.getAuthors).mockResolvedValue([book.author]);
    vi.mocked(reservationApi.getBookQueue).mockResolvedValue([]);
    vi.mocked(catalogApi.deleteBook).mockResolvedValue();
  });

  it("accepts an author name and creates the author when it is new", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { memberId: "admin-1", role: "librarian", email: "admin@example.com", fullName: "Admin" },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(catalogApi.getAuthors).mockResolvedValue([]);
    vi.mocked(catalogApi.createAuthor).mockResolvedValue({ authorId: "new-author", name: "New Author" });
    vi.mocked(catalogApi.createBook).mockResolvedValue({
      ...book,
      author: { authorId: "new-author", name: "New Author" },
    });
    renderPage();

    const authorInput = await screen.findByRole("textbox", { name: "Author" });
    expect(authorInput).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Book title" }), { target: { value: "New Book" } });
    fireEvent.change(authorInput, { target: { value: "New Author" } });
    fireEvent.change(screen.getByRole("textbox", { name: "ISBN" }), { target: { value: "9876543210" } });
    fireEvent.click(screen.getByRole("button", { name: /Add Book/ }));

    await waitFor(() => {
      expect(catalogApi.createAuthor).toHaveBeenCalledWith("New Author");
      expect(catalogApi.createBook).toHaveBeenCalledWith({
        title: "New Book",
        isbn: "9876543210",
        totalCopies: 1,
        author: { authorId: "new-author" },
      });
    });
  });

  it("uses an existing author when the entered name matches", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { memberId: "admin-1", role: "librarian", email: "admin@example.com", fullName: "Admin" },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(catalogApi.createBook).mockResolvedValue(book);
    renderPage();

    fireEvent.change(await screen.findByRole("textbox", { name: "Book title" }), { target: { value: "New Book" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Author" }), { target: { value: " an author " } });
    fireEvent.change(screen.getByRole("textbox", { name: "ISBN" }), { target: { value: "9876543210" } });
    fireEvent.click(screen.getByRole("button", { name: /Add Book/ }));

    await waitFor(() => expect(catalogApi.createBook).toHaveBeenCalledWith({
      title: "New Book",
      isbn: "9876543210",
      totalCopies: 1,
      author: { authorId: "author-1" },
    }));
    expect(catalogApi.createAuthor).not.toHaveBeenCalled();
  });

  it("shows a confirmation and deletes books for librarians", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { memberId: "admin-1", role: "librarian", email: "admin@example.com", fullName: "Admin" },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Delete A Book" }));
    expect(screen.getByText("Are you sure you want to delete this book? This action cannot be undone.")).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(catalogApi.deleteBook).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Delete A Book" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(catalogApi.deleteBook).toHaveBeenCalledWith(book.bookId));
    expect(await screen.findByRole("status")).toHaveTextContent('"A Book" was deleted from the catalog.');
  });

  it("does not show delete controls to members", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { memberId: "member-1", role: "member", email: "member@example.com", fullName: "Member" },
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    renderPage();

    expect(await screen.findByRole("heading", { name: "A Book" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete A Book" })).not.toBeInTheDocument();
  });
});
