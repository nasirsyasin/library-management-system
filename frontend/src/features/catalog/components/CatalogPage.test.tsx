import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useBooks } from "../hooks/useBooks";
import { Book } from "../types";
import { CatalogPage } from "./CatalogPage";

vi.mock("../hooks/useBooks", () => ({
  useBooks: vi.fn(),
}));

const unavailableBook: Book = {
  bookId: "book-1",
  title: "Currently Borrowed Book",
  isbn: "1234567890",
  totalCopies: 1,
  availableCopies: 0,
  author: { authorId: "author-1", name: "Library Author" },
};

describe("CatalogPage", () => {
  it("keeps unavailable books visible and lets members reserve them", () => {
    const onBorrow = vi.fn();
    const onReserve = vi.fn();
    vi.mocked(useBooks).mockReturnValue({
      data: [unavailableBook],
      isPending: false,
      isError: false,
    } as ReturnType<typeof useBooks>);

    render(<CatalogPage onBorrow={onBorrow} onReserve={onReserve} />);

    expect(screen.getByRole("heading", { name: unavailableBook.title })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reserve" }));
    expect(onReserve).toHaveBeenCalledWith(unavailableBook.bookId);
    expect(onBorrow).not.toHaveBeenCalled();
  });
});
