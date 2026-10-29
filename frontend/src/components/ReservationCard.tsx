import { Book, Reservation } from '../types';
import { StatusBadge } from './StatusBadge';

interface ReservationCardProps {
  reservation: Reservation;
  book?: Book;
}

export function ReservationCard({ reservation, book }: ReservationCardProps) {
  const createdDate = new Date(reservation.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Reservation</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{book?.title || 'Book title unavailable'}</h3>
          <p className="text-sm text-slate-600">{book?.author || 'Unknown author'}</p>
        </div>
        <StatusBadge status={reservation.status} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Position</p>
          <p className="mt-2 text-sm font-medium text-slate-800">#{reservation.queuePosition}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Made</p>
          <p className="mt-2 text-sm font-medium text-slate-800">{createdDate}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Notification</p>
          <p className="mt-2 text-sm font-medium text-slate-800">{reservation.status === 'available' ? 'Ready' : 'Waiting'}</p>
        </div>
      </div>
    </article>
  );
}
