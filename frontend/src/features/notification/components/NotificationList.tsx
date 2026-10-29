import { useMarkNotificationRead, useNotifications } from "../hooks/useNotifications";

interface NotificationListProps {
  memberId: string;
}

export function NotificationList({ memberId }: NotificationListProps) {
  const notificationsQuery = useNotifications(memberId);
  const markRead = useMarkNotificationRead(memberId);
  const notifications = notificationsQuery.data ?? [];

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
      {notificationsQuery.isPending ? <p role="status" className="mt-3 text-sm">Loading Notifications...</p> : null}
      {notificationsQuery.isError ? (
        <p role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          Notifications could not be loaded. Check your connection and try again.
        </p>
      ) : null}
      {!notificationsQuery.isPending && !notificationsQuery.isError && notifications.length === 0 ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700">
          You have no Notifications yet. We’ll show a message here when a reserved Book is ready.
        </p>
      ) : null}
      {markRead.isError ? <p role="alert" className="mt-3 text-sm text-red-800">Notification could not be marked as read. Try again.</p> : null}
      <div className="mt-2">
        {notifications.map((notification) => (
          <article key={notification.notificationId} className="flex flex-col gap-3 border-b border-slate-200 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-slate-800">{notification.message}</p>
              <p className="mt-1 text-xs text-slate-500">{new Date(notification.sentDate).toLocaleString()}</p>
              {!notification.read ? <p className="mt-1 text-xs font-semibold text-amber-800">Unread</p> : null}
            </div>
            {!notification.read ? (
              <button
                type="button"
                onClick={() => markRead.mutate(notification.notificationId)}
                disabled={markRead.isPending}
                className="self-start rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 disabled:opacity-60"
              >
                Mark read
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}