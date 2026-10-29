import { ReactNode, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AuthUser } from "../auth/AuthContext";

interface AppLayoutProps {
  user: AuthUser;
  unreadNotificationCount: number;
  onLogout: () => void;
  children: ReactNode;
}

export function AppLayout({ user, unreadNotificationCount, onLogout, children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const isLibraryDashboard =
    user.role === "librarian" && (
      pathname === "/catalog" ||
      pathname === "/librarian/catalog" ||
      pathname === "/librarian/member-requests" ||
      pathname === "/librarian/borrow-requests"
    );
  const navigation = [
    { to: user.role === "librarian" ? "/librarian/catalog" : "/catalog", label: "Catalog", end: true },
    { to: "/my-loans", label: "My Borrowed Books", end: false },
    { to: "/reservations", label: "Reservations", end: false },
    ...(user.role === "librarian" ? [
      { to: "/librarian/member-requests", label: "Member Requests", end: false },
      { to: "/librarian/borrow-requests", label: "Borrow Requests", end: false },
    ] : []),
  ];

  return (
    <div className={isLibraryDashboard ? "min-h-screen bg-[#0b0a09] text-[#e7e5e4]" : "min-h-screen"}>
      {!isLibraryDashboard ? <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <NavLink to="/catalog" className="text-base font-semibold text-slate-900">Library Management</NavLink>
          <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
              >
                {item.label}
                {item.to === "/reservations" && unreadNotificationCount > 0 ? (
                  <span className="ml-2 inline-flex min-w-5 justify-center rounded-full bg-amber-700 px-1.5 py-0.5 text-xs text-white">
                    {unreadNotificationCount}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <span className="text-right text-xs text-slate-600">
              {user.role === "librarian" ? "Librarian" : "Member"}<br />{user.memberId}
            </span>
            <button type="button" onClick={onLogout} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800">
              Sign out
            </button>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 md:hidden"
          >
            Menu
          </button>
        </div>
        {mobileMenuOpen ? (
          <nav aria-label="Mobile navigation" className="grid gap-1 border-t border-slate-200 bg-white p-3 md:hidden">
            {navigation.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100">
                {item.label}{item.to === "/reservations" && unreadNotificationCount > 0 ? ` (${unreadNotificationCount})` : ""}
              </NavLink>
            ))}
            <p className="px-3 py-2 text-xs text-slate-600">{user.role === "librarian" ? "Librarian" : "Member"} · {user.memberId}</p>
            <button type="button" onClick={onLogout} className="justify-self-start rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800">Sign out</button>
          </nav>
        ) : null}
      </header> : null}
      {children}
    </div>
  );
}