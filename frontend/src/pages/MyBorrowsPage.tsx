import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { borrowAPI } from "../api";
import { Borrow } from "../types";

export function MyBorrowsPage() {
  const { user } = useAuth();
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [returning, setReturning] = useState<string | null>(null);

  useEffect(() => {
    fetchBorrows();
  }, [user]);

  const fetchBorrows = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await borrowAPI.getMemberHistory(user.memberId);
      setBorrows(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load borrows");
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (borrowId: string) => {
    setReturning(borrowId);
    try {
      await borrowAPI.returnBook(borrowId);
      alert("Book returned successfully!");
      fetchBorrows();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to return book");
    } finally {
      setReturning(null);
    }
  };

  const activeBorrows = borrows.filter((b) => !b.returnDate);
  const returnedBorrows = borrows.filter((b) => b.returnDate);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-center text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Borrows</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Active Borrows</h2>
        {activeBorrows.length === 0 ? (
          <p className="text-gray-600">No active borrows</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-blue-50">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">Book ID</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Borrow Date</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Due Date</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {activeBorrows.map((borrow) => {
                  const dueDate = new Date(borrow.dueDate);
                  const isOverdue = dueDate < new Date();
                  return (
                    <tr key={borrow.borrowId} className={isOverdue ? "bg-red-50" : ""}>
                      <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                        {borrow.bookId.slice(0, 8)}...
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {new Date(borrow.borrowDate).toLocaleDateString()}
                      </td>
                      <td className={`border border-gray-300 px-4 py-2 ${isOverdue ? "text-red-600 font-semibold" : ""}`}>
                        {dueDate.toLocaleDateString()}
                        {isOverdue && " (OVERDUE)"}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
                          Borrowed
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <button
                          onClick={() => handleReturn(borrow.borrowId)}
                          disabled={returning === borrow.borrowId}
                          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:bg-gray-300 transition"
                        >
                          {returning === borrow.borrowId ? "Returning..." : "Return"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Returned Books</h2>
        {returnedBorrows.length === 0 ? (
          <p className="text-gray-600">No returned books yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">Book ID</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Borrow Date</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Return Date</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {returnedBorrows.map((borrow) => (
                  <tr key={borrow.borrowId}>
                    <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                      {borrow.bookId.slice(0, 8)}...
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {new Date(borrow.borrowDate).toLocaleDateString()}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {borrow.returnDate && new Date(borrow.returnDate).toLocaleDateString()}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                        Returned
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
