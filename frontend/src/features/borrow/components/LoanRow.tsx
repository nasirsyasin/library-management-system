import { useBook } from "../../catalog/hooks/useBooks";
import { Loan } from "../types";

interface LoanRowProps {
  loan: Loan;
  pending: boolean;
  onReturn: (borrowId: string) => void;
}

export function LoanRow({ loan, pending, onReturn }: LoanRowProps) {
  const bookQuery = useBook(loan.bookId);

  return (
    <article className="flex flex-col gap-4 border-b border-slate-200 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-semibold text-slate-900">
          {bookQuery.data?.title ?? (bookQuery.isError ? "Book details unavailable" : "Loading Book...")}
        </h2>
        {loan.status === "pending" ? (
          <p className="mt-1 text-sm text-amber-700">Awaiting librarian approval</p>
        ) : loan.status === "rejected" ? (
          <p className="mt-1 text-sm text-red-700">Request declined</p>
        ) : loan.returnDate ? (
          <p className="mt-1 text-sm text-emerald-700">
            Returned {new Date(loan.returnDate).toLocaleDateString()}
          </p>
        ) : loan.dueDate ? (
          <p className="mt-1 text-sm text-slate-600">Due {new Date(loan.dueDate).toLocaleDateString()}</p>
        ) : null}
      </div>
      {loan.status === "approved" && loan.returnDate === null ? (
        <button
          type="button"
          onClick={() => onReturn(loan.borrowId)}
          disabled={pending}
          className="self-start rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60 sm:self-auto"
        >
          {pending ? "Returning..." : "Return"}
        </button>
      ) : null}
    </article>
  );
}