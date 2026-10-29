import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { reservationAPI } from "../api";
import { Reservation } from "../types";

export function MyReservationsPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReservations();
  }, [user]);

  const fetchReservations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await reservationAPI.getMemberReservations(user.memberId);
      setReservations(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-center text-gray-600">Loading...</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    waiting: "bg-yellow-100 text-yellow-800",
    ready: "bg-green-100 text-green-800",
    fulfilled: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Reservations</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {reservations.length === 0 ? (
        <p className="text-center text-gray-600 py-8">No reservations yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-blue-50">
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-left">Book ID</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Request Date</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr key={reservation.reservationId}>
                  <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                    {reservation.bookId.slice(0, 8)}...
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {new Date(reservation.requestDate).toLocaleDateString()}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <span className={`px-3 py-1 rounded text-sm font-medium ${statusColors[reservation.status]}`}>
                      {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
