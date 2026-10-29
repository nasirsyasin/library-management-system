import { Book, Borrowing } from '../types';
import { StatusBadge } from './StatusBadge';

interface BorrowingCardProps {
  borrowing: Borrowing;
  book?: Book;
  onReturn: (id: string) => void;
  pending: boolean;
}

export function BorrowingCard({ borrowing, book, onReturn, pending }: BorrowingCardProps) {
  const dueDateLabel = new Date(borrowing.dueDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Borrowing</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{book?.title || 'Book title unavailable'}</h3>
          <p className="text-sm text-slate-600">{book?.author || 'Unknown author'}</p>
        </div>
        <StatusBadge status={borrowing.status} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Due</p>
          <p className="mt-2 text-sm font-medium text-slate-800">{dueDateLabel}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Borrowed</p>
          <p className="mt-2 text-sm font-medium text-slate-800">
            {new Date(borrowing.borrowDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Status</p>
          <p className="mt-2 text-sm font-medium text-slate-800">{borrowing.status === 'returned' ? 'Returned' : 'Active'}</p>
        </div>
      </div>

      {borrowing.status !== 'returned' ? (
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => onReturn(borrowing.id)}
            disabled={pending}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {pending ? 'Returning...' : 'Return Book'}
          </button>
        </div>
      ) : null}
    </article>
  );
}
