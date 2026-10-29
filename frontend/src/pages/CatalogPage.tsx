import { FormEvent, useMemo, useState } from 'react';
import { Book } from '../types';
import { BookCard } from '../components/BookCard';
import { BookDetails } from '../components/BookDetails';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';

interface CatalogPageProps {
  books: Book[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  isSearching: boolean;
  error: string | null;
  selectedBook: Book | null;
  onSelectBook: (book: Book) => void;
  onCloseBookDetails: () => void;
  onBorrow: (bookId: string) => void;
  onReserve: (bookId: string) => void;
  pendingAction: { type: 'borrow' | 'reserve'; id: string } | null;
}

export function CatalogPage({
  books,
  searchValue,
  onSearchChange,
  isSearching,
  error,
  selectedBook,
  onSelectBook,
  onCloseBookDetails,
  onBorrow,
  onReserve,
  pendingAction,
}: CatalogPageProps) {
  const [localQuery, setLocalQuery] = useState(searchValue);

  const filteredBooks = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return books;
    return books.filter((book) => {
      const haystack = `${book.title} ${book.author} ${book.category} ${book.isbn}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [books, searchValue]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSearchChange(localQuery);
  };

  const handleClear = () => {
    setLocalQuery('');
    onSearchChange('');
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-8 overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-[0_28px_80px_rgba(15,23,42,0.18)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-300">Library catalog</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Find the right book for your next read</h1>
          </div>
          <div className="grid grid-cols-3 gap-3 text-left">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-300">Titles</p>
              <p className="mt-1 text-lg font-semibold">{books.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-300">Available</p>
              <p className="mt-1 text-lg font-semibold">{books.filter((book) => book.availability === 'available').length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-300">Waiting</p>
              <p className="mt-1 text-lg font-semibold">{books.filter((book) => book.availability === 'checked_out').length}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3 md:flex-row">
          <input
            value={localQuery}
            onChange={(event) => setLocalQuery(event.target.value)}
            placeholder="Search by title, author, category, or ISBN"
            className="flex-1 rounded-2xl border border-slate-600 bg-white/10 px-4 py-3.5 text-sm text-white placeholder:text-slate-300 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
            aria-label="Search books"
          />
          <button
            type="submit"
            className="rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-950/10 transition hover:bg-slate-100"
          >
            Search
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-2xl border border-slate-500 bg-transparent px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Clear
          </button>
        </form>
      </section>

      {error ? <ErrorState title="Search failed" message={error} /> : null}

      {isSearching ? (
        <LoadingState message="Searching books..." />
      ) : filteredBooks.length === 0 ? (
        <EmptyState
          title={searchValue ? 'No books match that search' : 'Browse the catalog'}
          description={
            searchValue
              ? 'Try a different keyword, author name, or category to continue.'
              : 'Use the catalog search to find titles by author, category, or ISBN.'
          }
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onSelect={onSelectBook}
              onBorrow={onBorrow}
              onReserve={onReserve}
              pendingAction={pendingAction && pendingAction.id === book.id ? pendingAction.type : null}
            />
          ))}
        </div>
      )}

      {selectedBook ? (
        <BookDetails
          book={selectedBook}
          onClose={onCloseBookDetails}
          onBorrow={onBorrow}
          onReserve={onReserve}
          pendingAction={pendingAction && pendingAction.id === selectedBook.id ? pendingAction.type : null}
        />
      ) : null}
    </main>
  );
}
