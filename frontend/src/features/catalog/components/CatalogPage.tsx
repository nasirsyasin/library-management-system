import { FormEvent, useState } from "react";
import { useBooks } from "../hooks/useBooks";
import { Book } from "../types";
import { BookActions } from "./BookActions";

interface CatalogPageProps {
  onBorrow: (bookId: string) => void;
  onReserve: (bookId: string) => void;
  pendingBookId?: string | null;
}

export function CatalogPage({ onBorrow, onReserve, pendingBookId = null }: CatalogPageProps) {
  const [searchValue, setSearchValue] = useState("");
  const [query, setQuery] = useState("");
  const booksQuery = useBooks(query);
  const books = booksQuery.data ?? [];

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery(searchValue.trim());
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 rounded-xl bg-slate-900 p-6 text-white sm:p-8">
        <p className="text-xs font-semibold uppercase text-slate-300">Catalog</p>
        <h1 className="mt-2 text-3xl font-semibold">Find a Book</h1>
        <form onSubmit={submitSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search by title, author, or ISBN"
            aria-label="Search by title, author, or ISBN"
            className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500"
          />
          <button type="submit" className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-900">
            Search
          </button>
        </form>
      </header>

      {booksQuery.isPending ? <p role="status">Loading catalog...</p> : null}
      {booksQuery.isError ? (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          Catalog could not be loaded. Check your connection and try the search again.
        </p>
      ) : null}
      {!booksQuery.isPending && !booksQuery.isError && books.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-700">
          {query ? "No Books match that search. Try a title, author, or ISBN." : "No Books are listed in the Catalog yet."}
        </p>
      ) : null}

      <section aria-label="Catalog results" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {books.map((book: Book) => (
          <article key={book.bookId} className="flex flex-col rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">{book.title}</h2>
            <p className="mt-1 text-sm text-slate-700">{book.author.name}</p>
            <p className="mt-3 text-xs text-slate-600">ISBN: {book.isbn}</p>
            <p className="mt-2 text-sm text-slate-700">
              {book.availableCopies} of {book.totalCopies} copies available
            </p>
            <div className="mt-4">
              <BookActions
                book={book}
                pending={pendingBookId === book.bookId}
                onBorrow={onBorrow}
                onReserve={onReserve}
              />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}