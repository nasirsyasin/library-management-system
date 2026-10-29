import { Book } from '../types';
import { AvailabilityBadge } from './AvailabilityBadge';

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onBorrow: (bookId: string) => void;
  onReserve: (bookId: string) => void;
  pendingAction: 'borrow' | 'reserve' | null;
}

export function BookCard({ book, onSelect, onBorrow, onReserve, pendingAction }: BookCardProps) {
  const isAvailable = book.availability === 'available';
  const isLoading = pendingAction !== null && pendingAction === (isAvailable ? 'borrow' : 'reserve');

  return (
    <article className="group flex h-full flex-col rounded-[26px] border border-slate-200 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">{book.category}</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{book.title}</h3>
        </div>
        <AvailabilityBadge availability={book.availability} />
      </div>

      <p className="text-sm font-medium text-slate-700">{book.author}</p>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{book.summary}</p>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
        <span>{book.availableCopies} available</span>
        <span className="font-semibold text-slate-500">{book.totalCopies} total</span>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => onSelect(book)}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Details
        </button>
        <button
          type="button"
          onClick={() => (isAvailable ? onBorrow(book.id) : onReserve(book.id))}
          disabled={pendingAction !== null}
          className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium text-white transition ${
            isAvailable
              ? 'bg-slate-900 hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300'
              : 'bg-amber-600 hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-slate-300'
          }`}
        >
          {pendingAction !== null && isLoading ? (isAvailable ? 'Borrowing...' : 'Reserving...') : isAvailable ? 'Borrow' : 'Reserve'}
        </button>
      </div>
    </article>
  );
}
