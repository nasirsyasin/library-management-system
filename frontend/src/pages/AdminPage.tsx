import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { borrowAPI, catalogAPI, reservationAPI } from "../api";
import { Author, Borrow, Reservation } from "../types";

export function AdminPage() {
  const { user } = useAuth();
  const [activeBorrows, setActiveBorrows] = useState<Borrow[]>([]);
  const [overdueBorrows, setOverdueBorrows] = useState<Borrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [reservationQueue, setReservationQueue] = useState<Reservation[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [bookForm, setBookForm] = useState({ title: "", isbn: "", totalCopies: "", authorId: "" });
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role === "librarian") {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [activeBorrowsRes, overdueBorrowsRes, authorsRes] = await Promise.all([
        borrowAPI.getActiveBorrows(),
        borrowAPI.getOverdueBorrows(),
        catalogAPI.getAuthors(),
      ]);
      setActiveBorrows(activeBorrowsRes.data);
      setOverdueBorrows(overdueBorrowsRes.data);
      setAuthors(authorsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAuthor = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setFormMessage("");
    try {
      const response = await catalogAPI.createAuthor(authorName);
      setAuthors((current) => [...current, response.data].sort((a, b) => a.name.localeCompare(b.name)));
      setBookForm((current) => ({ ...current, authorId: response.data.authorId }));
      setAuthorName("");
      setFormMessage("Author created successfully.");
    } catch (err: any) {
      setFormError(err.response?.data?.error || "Failed to create author");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBook = async (event: React.FormEvent) => {
    event.preventDefault();
    const totalCopies = Number(bookForm.totalCopies);
    if (!bookForm.title.trim() || !bookForm.isbn.trim() || !bookForm.authorId || !Number.isInteger(totalCopies) || totalCopies < 1) {
      setFormError("Enter a title, ISBN, author, and a whole number of copies greater than zero.");
      return;
    }
    setSaving(true);
    setFormError("");
    setFormMessage("");
    try {
      await catalogAPI.createBook({
        title: bookForm.title.trim(),
        isbn: bookForm.isbn.trim(),
        totalCopies,
        availableCopies: totalCopies,
        author: { authorId: bookForm.authorId },
      });
      setBookForm({ title: "", isbn: "", totalCopies: "", authorId: "" });
      setFormMessage("Book created successfully.");
    } catch (err: any) {
      setFormError(err.response?.data?.error || "Failed to create book");
    } finally {
      setSaving(false);
    }
  };

  const fetchQueueForBook = async (bookId: string) => {
    try {
      const res = await reservationAPI.getQueueForBook(bookId);
      setReservationQueue(res.data);
      setSelectedBook(bookId);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to load queue");
    }
  };

  if (user?.role !== "librarian") {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Access denied. Only librarians can access this page.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-center text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={handleCreateAuthor} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Add Author</h2>
          <label className="mb-1 block text-sm font-medium" htmlFor="author-name">Author name</label>
          <input id="author-name" value={authorName} onChange={(event) => setAuthorName(event.target.value)} required className="mb-4 w-full rounded border border-gray-300 px-3 py-2" />
          <button disabled={saving} className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:bg-gray-400">Add Author</button>
        </form>

        <form onSubmit={handleCreateBook} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Add Book</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input placeholder="Title" value={bookForm.title} onChange={(event) => setBookForm({ ...bookForm, title: event.target.value })} required className="rounded border border-gray-300 px-3 py-2" />
            <input placeholder="ISBN" value={bookForm.isbn} onChange={(event) => setBookForm({ ...bookForm, isbn: event.target.value })} required className="rounded border border-gray-300 px-3 py-2" />
            <input type="number" min="1" placeholder="Total copies" value={bookForm.totalCopies} onChange={(event) => setBookForm({ ...bookForm, totalCopies: event.target.value })} required className="rounded border border-gray-300 px-3 py-2" />
            <select value={bookForm.authorId} onChange={(event) => setBookForm({ ...bookForm, authorId: event.target.value })} required className="rounded border border-gray-300 px-3 py-2">
              <option value="">Select author</option>
              {authors.map((author) => <option key={author.authorId} value={author.authorId}>{author.name}</option>)}
            </select>
          </div>
          <button disabled={saving || authors.length === 0} className="mt-4 rounded bg-green-600 px-4 py-2 font-medium text-white disabled:bg-gray-400">Add Book</button>
          {authors.length === 0 && <p className="mt-2 text-sm text-gray-500">Add an author before creating a book.</p>}
        </form>
      </section>

      {(formMessage || formError) && <div className={`mb-4 rounded border px-4 py-3 ${formError ? "border-red-400 bg-red-100 text-red-700" : "border-green-400 bg-green-100 text-green-700"}`}>{formError || formMessage}</div>}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-blue-50 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-2">{activeBorrows.length}</h2>
          <p className="text-gray-600">Active Borrows</p>
        </div>
        <div className="bg-red-50 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-2 text-red-600">{overdueBorrows.length}</h2>
          <p className="text-gray-600">Overdue Borrows</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Active Borrows</h2>
          {activeBorrows.length === 0 ? (
            <p className="text-gray-600">No active borrows</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="border border-gray-300 px-2 py-2 text-left">Member ID</th>
                    <th className="border border-gray-300 px-2 py-2 text-left">Book ID</th>
                    <th className="border border-gray-300 px-2 py-2 text-left">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBorrows.map((borrow) => (
                    <tr key={borrow.borrowId}>
                      <td className="border border-gray-300 px-2 py-2 font-mono text-xs">
                        {borrow.memberId.slice(0, 8)}...
                      </td>
                      <td className="border border-gray-300 px-2 py-2 font-mono text-xs">
                        <button
                          onClick={() => fetchQueueForBook(borrow.bookId)}
                          className="text-blue-600 hover:underline"
                        >
                          {borrow.bookId.slice(0, 8)}...
                        </button>
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        {new Date(borrow.dueDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Overdue Borrows</h2>
          {overdueBorrows.length === 0 ? (
            <p className="text-gray-600">No overdue borrows</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-red-50">
                  <tr>
                    <th className="border border-gray-300 px-2 py-2 text-left">Member ID</th>
                    <th className="border border-gray-300 px-2 py-2 text-left">Book ID</th>
                    <th className="border border-gray-300 px-2 py-2 text-left">Overdue Since</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueBorrows.map((borrow) => (
                    <tr key={borrow.borrowId} className="bg-red-50">
                      <td className="border border-gray-300 px-2 py-2 font-mono text-xs">
                        {borrow.memberId.slice(0, 8)}...
                      </td>
                      <td className="border border-gray-300 px-2 py-2 font-mono text-xs">
                        <button
                          onClick={() => fetchQueueForBook(borrow.bookId)}
                          className="text-blue-600 hover:underline"
                        >
                          {borrow.bookId.slice(0, 8)}...
                        </button>
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        {new Date(borrow.dueDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedBook && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">
            Reservation Queue for {selectedBook.slice(0, 8)}...
          </h2>
          {reservationQueue.length === 0 ? (
            <p className="text-gray-600">No reservations for this book</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-green-50">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left">Position</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Member ID</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Request Date</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reservationQueue.map((reservation, index) => (
                    <tr key={reservation.reservationId}>
                      <td className="border border-gray-300 px-4 py-2 font-semibold">#{index + 1}</td>
                      <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                        {reservation.memberId.slice(0, 8)}...
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {new Date(reservation.requestDate).toLocaleDateString()}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
                          {reservation.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
