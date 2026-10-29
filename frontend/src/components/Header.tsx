import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { NotificationBadge } from './NotificationBadge';
import { NotificationItem } from '../types';

interface HeaderProps {
  unreadCount: number;
  notifications: NotificationItem[];
  onOpenNotifications: () => void;
}

const navItems = [
  { to: '/catalog', label: 'Catalog' },
  { to: '/my-borrows', label: 'My Borrowings' },
  { to: '/my-reservations', label: 'My Reservations' },
  { to: '/notifications', label: 'Notifications' },
];

export function Header({ unreadCount, notifications, onOpenNotifications }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white shadow-lg shadow-slate-900/15">
            L
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight text-slate-900">Library Management</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500">System</p>
          </div>
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/15'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Open notifications"
          >
            <span className="text-lg">🔔</span>
            {notifications.some((note) => !note.read) ? <NotificationBadge count={unreadCount} /> : null}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 md:hidden transition-all hover:border-slate-300 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            <span className="text-lg">☰</span>
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-slate-200 bg-white/95 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2.5 text-sm font-medium ${
                    isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
