import { Book, NotificationItem } from '../types';
import { EmptyState } from '../components/EmptyState';

interface NotificationsPageProps {
  notifications: NotificationItem[];
  books: Book[];
  onOpenBook: (bookId: string) => void;
  onMarkAsRead: (id: string) => void;
}

export function NotificationsPage({ notifications, books, onOpenBook, onMarkAsRead }: NotificationsPageProps) {
  const bookMap = new Map(books.map((book) => [book.id, book]));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Notifications</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Your Alerts</h1>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="When a reserved title becomes available, you will see it here and can borrow right away."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`rounded-2xl border p-5 shadow-sm ${
                notification.read ? 'border-slate-200 bg-white' : 'border-sky-200 bg-sky-50'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{notification.message}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    {new Date(notification.timestamp).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {!notification.read ? <span className="h-2.5 w-2.5 rounded-full bg-sky-500" aria-label="Unread notification" /> : null}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                  {bookMap.get(notification.bookId)?.title || 'Library title'}
                </p>
                <div className="flex gap-2">
                  {!notification.read ? (
                    <button
                      type="button"
                      onClick={() => onMarkAsRead(notification.id)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Mark read
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onOpenBook(notification.bookId)}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700"
                  >
                    Borrow Book
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
