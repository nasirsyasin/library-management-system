import { Link } from "react-router-dom";
import { useBook } from "../../catalog/hooks/useBooks";
import { MemberReservation } from "../types";

interface ReservationRowProps {
  reservation: MemberReservation;
}

export function ReservationRow({ reservation }: ReservationRowProps) {
  const bookQuery = useBook(reservation.bookId);
  const bookTitle = bookQuery.data?.title ?? "Book details unavailable";

  return (
    <article className="flex flex-col gap-2 border-b border-slate-200 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-semibold text-slate-900">{bookTitle}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {reservation.status === "waiting" && reservation.queuePosition !== null
            ? `Waiting list position ${reservation.queuePosition}`
            : reservation.status === "ready"
              ? "A copy is ready; your borrow request is awaiting librarian approval"
              : `Reservation ${reservation.status}`}
        </p>
        <p className="mt-1 text-xs text-slate-500">Requested {new Date(reservation.requestDate).toLocaleDateString()}</p>
      </div>
      <Link to="/catalog" className="text-sm font-semibold text-slate-800 underline">View Catalog</Link>
    </article>
  );
}