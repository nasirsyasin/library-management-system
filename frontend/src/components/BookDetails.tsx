import { Book } from '../types';
import { AvailabilityBadge } from './AvailabilityBadge';

interface BookDetailsProps {
  book: Book;
  onClose: () => void;
  onBorrow: (bookId: string) => void;
  onReserve: (bookId: string) => void;
  pendingAction: 'borrow' | 'reserve' | null;
}

export function BookDetails({ book, onClose, onBorrow, onReserve, pendingAction }: BookDetailsProps) {
  const isAvailable = book.availability === 'available';
  const actionText = isAvailable ? 'Borrow Book' : 'Reserve Book';
  const isProcessing = pendingAction !== null && (isAvailable ? pendingAction === 'borrow' : pendingAction === 'reserve');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_40px_120px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">{book.category}</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{book.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <AvailabilityBadge availability={book.availability} />
          <span className="text-sm text-slate-600">{book.availableCopies} of {book.totalCopies} copies available</span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Author</p>
            <p className="mt-2 text-base font-medium text-slate-800">{book.author}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">ISBN</p>
            <p className="mt-2 text-base font-medium text-slate-800">{book.isbn}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Summary</p>
          <p className="mt-2 text-sm leading-7 text-slate-700">{book.summary}</p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Keep Browsing
          </button>
          <button
            type="button"
            onClick={() => (isAvailable ? onBorrow(book.id) : onReserve(book.id))}
            disabled={isProcessing}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white transition ${
              isAvailable
                ? 'bg-slate-900 hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300'
                : 'bg-amber-600 hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-slate-300'
            }`}
          >
            {isProcessing ? (isAvailable ? 'Borrowing...' : 'Reserving...') : actionText}
          </button>
        </div>
      </div>
    </div>
  );
}
