import { FormEvent, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { reservationApi } from "../../reservation/api";
import { useAddCopy, useAuthors, useBooks, useCreateAuthor, useCreateBook, useDeleteBook } from "../hooks/useBooks";
import { Book } from "../types";
import { useAuth } from "../../../shared/auth/useAuth";

type BookStatus = "all" | "available" | "borrowed" | "reserved";
type DashboardTab = "books" | "members";

interface CatalogManagementPageProps {
  onBorrow: (bookId: string) => void;
  onReserve: (bookId: string) => void;
  pendingBookId?: string | null;
}

const inputClass =
  "h-[34px] min-w-0 rounded-md border border-[#302d2b] bg-[#0b0a09] px-3 text-[13px] text-[#e7e5e4] outline-none placeholder:text-[#85817e] focus:border-emerald-500";

function BookIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M6 3.75h10.5A1.5 1.5 0 0 1 18 5.25v15H7.5A1.5 1.5 0 0 1 6 18.75z" />
      <path d="M6 18.75a1.5 1.5 0 0 1 1.5-1.5H18M9 7h6" />
    </svg>
  );
}

export function CatalogManagementPage({
  onBorrow,
  onReserve,
  pendingBookId = null,
}: CatalogManagementPageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const authorsQuery = useAuthors();
  const createAuthor = useCreateAuthor();
  const createBook = useCreateBook();
  const addCopy = useAddCopy();
  const deleteBook = useDeleteBook();
  const [title, setTitle] = useState("");
  const [isbn, setIsbn] = useState("");
  const [totalCopies, setTotalCopies] = useState(1);
  const [authorName, setAuthorName] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BookStatus>("all");
  const [activeTab, setActiveTab] = useState<DashboardTab>("books");
  const [showAddForm, setShowAddForm] = useState(true);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState("");

  const allBooksQuery = useBooks("");
  const searchQuery = useBooks(search);
  const allBooks = allBooksQuery.data ?? [];
  const searchResults = searchQuery.data ?? [];
  const authors = authorsQuery.data ?? [];
  const bookIds = allBooks.map((book) => book.bookId);
  const reservationCountsQuery = useQuery({
    queryKey: ["reservation", "book-queues", bookIds],
    queryFn: async () => {
      const queues = await Promise.all(allBooks.map((book) => reservationApi.getBookQueue(book.bookId)));
      return Object.fromEntries(allBooks.map((book, index) => [book.bookId, queues[index].length]));
    },
    enabled: allBooksQuery.isSuccess && bookIds.length > 0,
  });
  const reservationCounts = reservationCountsQuery.data ?? {};
  const visibleBooks = searchResults.filter((book) => {
    if (status === "available") return book.availableCopies > 0;
    if (status === "borrowed") return book.availableCopies < book.totalCopies;
    if (status === "reserved") return (reservationCounts[book.bookId] ?? 0) > 0;
    return true;
  });
  const totalCopiesCount = allBooks.reduce((total, book) => total + book.totalCopies, 0);
  const availableCopiesCount = allBooks.reduce((total, book) => total + book.availableCopies, 0);
  const borrowedCopiesCount = totalCopiesCount - availableCopiesCount;
  const reservedCount = Object.values(reservationCounts).reduce((total, count) => total + count, 0);
  const canDeleteBooks = user?.role === "librarian";

  const confirmDeleteBook = () => {
    if (!bookToDelete || !canDeleteBooks) return;
    deleteBook.mutate(bookToDelete.bookId, {
      onSuccess: () => {
        setDeleteSuccess(`"${bookToDelete.title}" was deleted from the catalog.`);
        setBookToDelete(null);
      },
    });
  };

  const deleteErrorMessage = deleteBook.isError
    ? axios.isAxiosError<{ error?: string }>(deleteBook.error) && deleteBook.error.response?.data.error
      ? deleteBook.error.response.data.error
      : "The book could not be deleted. Please try again."
    : null;

  const submitBook = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedAuthorName = authorName.trim();
    if (!Number.isInteger(totalCopies) || totalCopies < 1 || !trimmedAuthorName) return;

    const existingAuthor = authors.find(
      (author) => author.name.trim().toLocaleLowerCase() === trimmedAuthorName.toLocaleLowerCase(),
    );
    const addBookWithAuthor = (authorId: string) => {
      createBook.mutate(
        { title: title.trim(), isbn: isbn.trim(), totalCopies, author: { authorId } },
        {
          onSuccess: () => {
            setTitle("");
            setIsbn("");
            setAuthorName("");
            setTotalCopies(1);
          },
        },
      );
    };

    if (existingAuthor) {
      addBookWithAuthor(existingAuthor.authorId);
      return;
    }

    createAuthor.mutate(trimmedAuthorName, {
      onSuccess: (author) => addBookWithAuthor(author.authorId),
    });
  };

  return (
    <main className="min-h-screen bg-[#0b0a09] px-4 pb-8 pt-4 text-[#e7e5e4] sm:px-6">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-4 flex h-7 items-center justify-between">
          <div className="flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.02em]">
            <span className="text-emerald-400"><BookIcon className="h-5 w-5" /></span>
            <span>Library System</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/librarian/borrow-requests" className="rounded-md border border-[#302d2b] px-3 py-1.5 text-xs font-medium text-[#c8c4c0] transition hover:bg-[#211f1d]">
              Borrow Requests
            </Link>
            <button
              type="button"
              aria-label="Refresh dashboard data"
              title="Refresh"
              onClick={() => queryClient.invalidateQueries()}
              className="rounded-md p-1.5 text-[#898582] transition hover:bg-[#211f1d] hover:text-white"
            >
              <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20 7v5h-5M4.6 9a7.5 7.5 0 0 1 13-2L20 12M4 17v-5h5m10.4 3a7.5 7.5 0 0 1-13 2L4 12" />
              </svg>
            </button>
          </div>
        </header>

        <section aria-label="Library statistics" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { label: "Titles", value: allBooksQuery.isPending ? "—" : allBooks.length, tone: "neutral" },
            { label: "Copies", value: allBooksQuery.isPending ? "—" : totalCopiesCount, tone: "neutral" },
            { label: "Available", value: allBooksQuery.isPending ? "—" : availableCopiesCount, tone: "green" },
            { label: "Borrowed", value: allBooksQuery.isPending ? "—" : borrowedCopiesCount, tone: "amber" },
            {
              label: "Reserved",
              value: reservationCountsQuery.isError || (reservationCountsQuery.isPending && bookIds.length > 0) ? "—" : reservedCount,
              tone: "blue",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`flex h-[61px] flex-col items-center justify-center rounded-lg ${
                stat.tone === "green"
                  ? "bg-[#09251d] text-emerald-400"
                  : stat.tone === "amber"
                    ? "bg-[#2b180c] text-amber-400"
                    : stat.tone === "blue"
                      ? "bg-[#111a31] text-blue-400"
                      : "bg-[#1a1918] text-[#e7e5e4]"
              }`}
            >
              <span className="text-[17px] font-bold leading-5">{stat.value}</span>
              <span className={`mt-0.5 text-[11px] ${stat.tone === "neutral" ? "text-[#a5a09c]" : ""}`}>{stat.label}</span>
            </div>
          ))}
        </section>

        <div role="tablist" aria-label="Dashboard sections" className="mt-3 flex h-[35px] rounded-lg bg-[#272625] p-[3px]">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "books"}
            onClick={() => setActiveTab("books")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md text-xs transition ${
              activeTab === "books" ? "bg-[#0d0c0b] text-[#e7e5e4]" : "text-[#aaa6a2] hover:text-white"
            }`}
          >
            <BookIcon className="h-3.5 w-3.5" /> Books
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "members"}
            onClick={() => setActiveTab("members")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md text-xs transition ${
              activeTab === "members" ? "bg-[#0d0c0b] text-[#e7e5e4]" : "text-[#aaa6a2] hover:text-white"
            }`}
          >
            <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="12" cy="8" r="3.2" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
            </svg>
            Members
          </button>
        </div>

        {activeTab === "books" ? (
          <>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <svg aria-hidden="true" className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a19c98]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" />
                </svg>
                <input
                  type="search"
                  aria-label="Search books"
                  placeholder="Search books..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={`${inputClass} w-full pl-8`}
                />
              </label>
              <select
                aria-label="Filter books by status"
                value={status}
                onChange={(event) => setStatus(event.target.value as BookStatus)}
                className={`${inputClass} h-[34px] w-full sm:w-[120px]`}
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="borrowed">Borrowed</option>
                <option value="reserved">Reserved</option>
              </select>
              <button
                type="button"
                aria-expanded={showAddForm}
                onClick={() => setShowAddForm((shown) => !shown)}
                className="inline-flex h-[34px] items-center justify-center gap-2 rounded-md bg-[#18c467] px-3 text-xs font-medium text-[#062013] transition hover:bg-[#25d475]"
              >
                <span className="text-base leading-none">+</span> Add
              </button>
            </div>

            {authorsQuery.isError ? <p role="alert" className="mt-3 text-sm text-red-300">Authors could not be loaded. Refresh and try again.</p> : null}
            {showAddForm ? (
              <form onSubmit={submitBook} className="mt-4 rounded-lg border border-[#302d2b] bg-[#1c1a19] p-3.5 sm:p-4">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <label className="sr-only" htmlFor="book-title">Book title</label>
                  <input id="book-title" value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="Book title" className={inputClass} />
                  <label className="sr-only" htmlFor="book-author">Author</label>
                  <input id="book-author" value={authorName} onChange={(event) => setAuthorName(event.target.value)} required placeholder="Author" className={inputClass} />
                  <label className="sr-only" htmlFor="book-isbn">ISBN</label>
                  <input id="book-isbn" value={isbn} onChange={(event) => setIsbn(event.target.value)} required placeholder="ISBN" className={inputClass} />
                  <div className="flex items-center gap-3 text-xs text-[#aaa6a2]">
                    <span>Copies:</span>
                    <button type="button" aria-label="Decrease copy count" disabled={totalCopies <= 1} onClick={() => setTotalCopies((count) => Math.max(1, count - 1))} className="h-[34px] w-[34px] rounded-md border border-[#302d2b] text-emerald-200 disabled:opacity-40">−</button>
                    <span className="min-w-3 text-center text-[#e7e5e4]">{totalCopies}</span>
                    <button type="button" aria-label="Increase copy count" onClick={() => setTotalCopies((count) => count + 1)} className="h-[34px] w-[34px] rounded-md border border-[#302d2b] text-emerald-200 hover:bg-[#272421]">+</button>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <button type="submit" disabled={createAuthor.isPending || createBook.isPending} className="inline-flex h-[31px] items-center gap-2 rounded-md bg-[#168843] px-3 text-xs font-medium text-[#092114] transition hover:bg-[#20a350] disabled:cursor-not-allowed disabled:opacity-50">
                    <span className="text-base leading-none">+</span> {createAuthor.isPending || createBook.isPending ? "Adding..." : "Add Book"}
                  </button>
                  <button type="button" onClick={() => setShowAddForm(false)} className="text-xs text-emerald-200 hover:text-white">Cancel</button>
                  {createBook.isSuccess ? <span role="status" className="text-xs text-emerald-300">Book added.</span> : null}
                  {createAuthor.isError || createBook.isError ? <span role="alert" className="text-xs text-red-300">Could not add book. Check the ISBN and author.</span> : null}
                </div>
              </form>
            ) : null}

            {reservationCountsQuery.isError ? <p role="alert" className="mt-3 text-xs text-red-300">Reservation counts could not be loaded.</p> : null}
            {deleteSuccess ? <p role="status" className="mt-3 text-sm text-emerald-300">{deleteSuccess}</p> : null}
            {allBooksQuery.isError || searchQuery.isError ? (
              <p role="alert" className="mt-4 rounded-lg border border-red-900 bg-[#24110f] p-4 text-sm text-red-200">
                The catalog could not be loaded. Check your connection and try again.
              </p>
            ) : null}
            {allBooksQuery.isPending || searchQuery.isPending ? <p role="status" className="mt-4 text-sm text-[#aaa6a2]">Loading catalog...</p> : null}
            {!allBooksQuery.isPending && !searchQuery.isPending && visibleBooks.length === 0 ? (
              <p className="mt-4 rounded-lg border border-[#302d2b] bg-[#1c1a19] p-5 text-sm text-[#aaa6a2]">
                {search || status !== "all" ? "No books match these filters." : "No books are listed in the catalog yet."}
              </p>
            ) : null}

            <section aria-label="Book inventory" className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visibleBooks.map((book: Book) => {
                const borrowed = book.totalCopies - book.availableCopies;
                const reserved = reservationCounts[book.bookId] ?? 0;
                const isPending = pendingBookId === book.bookId;
                const isAddingCopy = addCopy.isPending && addCopy.variables === book.bookId;
                return (
                  <article key={book.bookId} className="flex min-h-[160px] flex-col rounded-lg border border-[#302d2b] bg-[#1c1a19] p-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <div className="relative mt-0.5 flex h-[42px] w-[34px] shrink-0 items-center justify-center rounded bg-[#10b981] text-[#e9fff7]">
                        <BookIcon className="h-5 w-5" />
                        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#090909] px-1 text-[9px] font-semibold text-white">{book.totalCopies}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-[13px] font-semibold leading-5 text-[#e7e5e4]">{book.title}</h2>
                        <p className="truncate text-[11px] leading-4 text-[#aaa6a2]">{book.author?.name ?? "Unknown author"}</p>
                        <p className="mt-1 truncate text-[10px] text-[#85817e]">{book.isbn}</p>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <div className="my-2 flex items-center justify-between border-y border-dashed border-[#302d2b] py-1.5">
                        <div className="flex items-center gap-1">
                          <span className="rounded bg-[#0d3228] px-1.5 py-0.5 text-[10px] text-emerald-400">◉ {book.availableCopies}</span>
                          {borrowed > 0 ? <span className="rounded bg-[#38240e] px-1.5 py-0.5 text-[10px] text-amber-400">▣ {borrowed}</span> : null}
                          {reserved > 0 ? <span className="rounded bg-[#172548] px-1.5 py-0.5 text-[10px] text-blue-400">◷ {reserved}</span> : null}
                        </div>
                        <button
                          type="button"
                          aria-label={`Add copy of ${book.title}`}
                          title="Add copy"
                          disabled={isAddingCopy}
                          onClick={() => addCopy.mutate(book.bookId)}
                          className="flex h-6 w-6 items-center justify-center rounded text-emerald-200 hover:bg-[#292623] disabled:opacity-50"
                        >
                          {isAddingCopy ? "…" : "+"}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={isPending || book.availableCopies === 0}
                          onClick={() => onBorrow(book.bookId)}
                          className="flex h-[27px] items-center justify-center gap-1.5 rounded-md border border-[#302d2b] bg-[#0d0c0b] text-[11px] font-medium text-emerald-200 hover:border-emerald-800 disabled:cursor-not-allowed disabled:text-[#6f6964]"
                        >
                          <BookIcon className="h-3 w-3" /> {isPending && book.availableCopies > 0 ? "Borrowing..." : "Borrow"}
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => onReserve(book.bookId)}
                          className="flex h-[27px] items-center justify-center gap-1.5 rounded-md text-[11px] font-medium text-emerald-200 hover:bg-[#292623] disabled:cursor-not-allowed disabled:text-[#6f6964]"
                        >
                          <BookIcon className="h-3 w-3" /> {isPending ? "Reserving..." : "Reserve"}
                        </button>
                      </div>
                      {canDeleteBooks ? (
                        <button
                          type="button"
                          aria-label={`Delete ${book.title}`}
                          onClick={() => {
                            deleteBook.reset();
                            setDeleteSuccess("");
                            setBookToDelete(book);
                          }}
                          className="mt-2 flex h-[27px] w-full items-center justify-center gap-1.5 rounded-md border border-red-900/70 bg-[#24110f] text-[11px] font-medium text-red-300 transition hover:border-red-700 hover:bg-[#321411]"
                        >
                          <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
                          </svg>
                          Delete Book
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </section>
          </>
        ) : (
          <section role="tabpanel" aria-label="Members" className="mt-4 rounded-lg border border-[#302d2b] bg-[#1c1a19] p-6">
            <h1 className="text-sm font-semibold">Member registrations</h1>
            <p className="mt-2 text-xs text-[#aaa6a2]">Review new membership applications and approve or reject pending accounts.</p>
            <Link to="/librarian/member-requests" className="mt-4 inline-flex rounded-md bg-[#168843] px-3 py-2 text-xs font-medium text-[#092114] transition hover:bg-[#20a350]">
              Open Member Requests
            </Link>
          </section>
        )}
        {bookToDelete ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-book-title"
              className="w-full max-w-md rounded-xl border border-[#3b302e] bg-[#171412] p-5 shadow-2xl"
            >
              <h2 id="delete-book-title" className="text-base font-semibold text-[#f5f5f4]">Delete book?</h2>
              <p className="mt-3 text-sm leading-6 text-[#c4bfbb]">
                Are you sure you want to delete this book? This action cannot be undone.
              </p>
              <p className="mt-2 text-sm font-medium text-[#e7e5e4]">{bookToDelete.title}</p>
              <p className="mt-2 text-xs leading-5 text-[#a8a29e]">
                The book will be archived so borrowing and reservation history is preserved.
              </p>
              {deleteErrorMessage ? <p role="alert" className="mt-3 text-sm text-red-300">{deleteErrorMessage}</p> : null}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={deleteBook.isPending}
                  onClick={() => {
                    setBookToDelete(null);
                    deleteBook.reset();
                  }}
                  className="rounded-md border border-[#403a36] px-3 py-2 text-xs font-medium text-[#d6d3d1] hover:bg-[#292421] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteBook.isPending}
                  onClick={confirmDeleteBook}
                  className="rounded-md bg-red-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleteBook.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
