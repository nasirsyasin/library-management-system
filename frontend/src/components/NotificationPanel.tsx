import { NotificationItem } from '../types';

interface NotificationPanelProps {
  notifications: NotificationItem[];
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onOpenBook: (bookId: string) => void;
}

export function NotificationPanel({
  notifications,
  isOpen,
  onClose,
  onMarkRead,
  onOpenBook,
}: NotificationPanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <aside className="fixed right-4 top-24 z-50 w-[min(420px,calc(100vw-2rem))] rounded-[28px] border border-slate-200 bg-white/90 p-4 shadow-[0_30px_90px_rgba(15,23,42,0.18)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Notifications</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Alerts</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-slate-200 px-2 py-1 text-slate-600 transition hover:bg-slate-50"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            No notifications yet.
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`rounded-2xl border p-4 ${
                notification.read ? 'border-slate-200 bg-slate-50' : 'border-sky-200 bg-sky-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{notification.message}</p>
                </div>
                {!notification.read ? (
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-500" aria-label="Unread notification" />
                ) : null}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  {new Date(notification.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
                <div className="flex gap-2">
                  {!notification.read ? (
                    <button
                      type="button"
                      onClick={() => onMarkRead(notification.id)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Mark read
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onOpenBook(notification.bookId)}
                    className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                  >
                    Borrow Book
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
