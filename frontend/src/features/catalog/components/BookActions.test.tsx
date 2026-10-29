import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Book } from "../types";
import { BookActions } from "./BookActions";

const book: Book = {
  bookId: "book-1",
  title: "A Book",
  isbn: "1234567890",
  totalCopies: 2,
  availableCopies: 1,
  author: { authorId: "author-1", name: "An Author" },
};

describe("BookActions", () => {
  it("offers Borrow when a copy is available", () => {
    const onBorrow = vi.fn();
    const onReserve = vi.fn();
    render(<BookActions book={book} onBorrow={onBorrow} onReserve={onReserve} />);

    fireEvent.click(screen.getByRole("button", { name: "Borrow" }));

    expect(onBorrow).toHaveBeenCalledWith("book-1");
    expect(onReserve).not.toHaveBeenCalled();
  });

  it("offers Reserve when no copies are available", () => {
    const onBorrow = vi.fn();
    const onReserve = vi.fn();
    render(<BookActions book={{ ...book, availableCopies: 0 }} onBorrow={onBorrow} onReserve={onReserve} />);

    fireEvent.click(screen.getByRole("button", { name: "Reserve" }));

    expect(onReserve).toHaveBeenCalledWith("book-1");
    expect(onBorrow).not.toHaveBeenCalled();
  });
});