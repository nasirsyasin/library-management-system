import { Book } from "../types";

interface BookActionsProps {
  book: Book;
  pending?: boolean;
  onBorrow: (bookId: string) => void;
  onReserve: (bookId: string) => void;
}

export function BookActions({ book, pending = false, onBorrow, onReserve }: BookActionsProps) {
  const canBorrow = book.availableCopies > 0;

  return (
    <button
      type="button"
      onClick={() => (canBorrow ? onBorrow(book.bookId) : onReserve(book.bookId))}
      disabled={pending}
      className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
        canBorrow ? "bg-slate-900 hover:bg-slate-700" : "bg-amber-700 hover:bg-amber-600"
      }`}
    >
      {pending ? (canBorrow ? "Borrowing..." : "Reserving...") : canBorrow ? "Borrow" : "Reserve"}
    </button>
  );
}