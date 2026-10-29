import { NotificationList } from "../../notification/components/NotificationList";
import { useReservations } from "../hooks/useReservations";
import { ReservationRow } from "./ReservationRow";

interface ReservationsPageProps {
  memberId: string;
}

export function ReservationsPage({ memberId }: ReservationsPageProps) {
  const reservationsQuery = useReservations(memberId);
  const reservations = reservationsQuery.data ?? [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-slate-900">Reservations</h1>
      {reservationsQuery.isPending ? <p role="status" className="mt-5">Loading Reservations...</p> : null}
      {reservationsQuery.isError ? (
        <p role="alert" className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          Reservations could not be loaded. Check your connection and try again.
        </p>
      ) : null}
      {!reservationsQuery.isPending && !reservationsQuery.isError && reservations.length === 0 ? (
        <p className="mt-5 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700">
          You have no Reservations. Browse the Catalog to reserve a Book that is unavailable.
        </p>
      ) : null}
      <section aria-label="Waiting List">
        {reservations.map((reservation) => <ReservationRow key={reservation.reservationId} reservation={reservation} />)}
      </section>
      <NotificationList memberId={memberId} />
    </main>
  );
}