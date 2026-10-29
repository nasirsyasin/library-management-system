import { Book, Reservation } from '../types';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { ReservationCard } from '../components/ReservationCard';

interface ReservationsPageProps {
  reservations: Reservation[];
  books: Book[];
  isLoading: boolean;
}

export function ReservationsPage({ reservations, books, isLoading }: ReservationsPageProps) {
  const bookMap = new Map(books.map((book) => [book.id, book]));

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><LoadingState message="Loading your reservations..." /></div>;
  }

  if (!reservations.length) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState
          title="No reservations yet"
          description="Books that are checked out can be reserved here, and your waiting position will appear here."
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Reservations</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">My Reservations</h1>
      </div>

      <div className="space-y-4">
        {reservations.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            book={bookMap.get(reservation.bookId)}
          />
        ))}
      </div>
    </main>
  );
}
