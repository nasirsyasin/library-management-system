import { Book, Borrowing } from '../types';
import { BorrowingCard } from '../components/BorrowingCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';

interface BorrowingsPageProps {
  borrowings: Borrowing[];
  books: Book[];
  isLoading: boolean;
  pendingReturnId: string | null;
  onReturn: (borrowId: string) => void;
}

export function BorrowingsPage({ borrowings, books, isLoading, pendingReturnId, onReturn }: BorrowingsPageProps) {
  const bookMap = new Map(books.map((book) => [book.id, book]));

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><LoadingState message="Loading your borrowings..." /></div>;
  }

  if (!borrowings.length) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState
          title="No active borrowings"
          description="Books you borrow will show up here, along with due dates and return actions."
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Borrowings</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">My Borrowings</h1>
      </div>

      <div className="space-y-4">
        {borrowings.map((borrowing) => (
          <BorrowingCard
            key={borrowing.id}
            borrowing={borrowing}
            book={bookMap.get(borrowing.bookId)}
            onReturn={onReturn}
            pending={pendingReturnId === borrowing.id}
          />
        ))}
      </div>
    </main>
  );
}
