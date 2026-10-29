import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { MemberRequestsPage } from "./features/admin/components/MemberRequestsPage";
import { BorrowRequestsPage } from "./features/admin/components/BorrowRequestsPage";
import { MyLoansPage } from "./features/borrow/components/MyLoansPage";
import { getBorrowErrorMessage, useBorrow } from "./features/borrow/hooks/useLoans";
import { CatalogManagementPage } from "./features/catalog/components/CatalogManagementPage";
import { CatalogPage } from "./features/catalog/components/CatalogPage";
import { useNotifications } from "./features/notification/hooks/useNotifications";
import { useBookReturnedSocket } from "./features/notification/hooks/useNotifications";
import { ReservationsPage } from "./features/reservation/components/ReservationsPage";
import { getReservationErrorMessage, useCreateReservation } from "./features/reservation/hooks/useReservations";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { useAuth } from "./shared/auth/useAuth";
import { AppLayout } from "./shared/layout/AppLayout";
import { useToast } from "./shared/toast/ToastProvider";

function AppShell() {
  const { user, logout } = useAuth();
  const { notify } = useToast();

  if (!user) return <Navigate to="/login" replace />;

  const borrow = useBorrow(user.memberId);
  const createReservation = useCreateReservation(user.memberId);
  const notifications = useNotifications(user.memberId);
  useBookReturnedSocket(user.memberId);
  const unreadCount = (notifications.data ?? []).filter((notification) => !notification.read).length;
  const pendingBookId = borrow.isPending
    ? borrow.variables ?? null
    : createReservation.isPending
      ? createReservation.variables ?? null
      : null;

  const handleBorrow = (bookId: string) => {
    borrow.mutate(bookId, {
      onSuccess: () => notify("Borrow request sent. You'll see the assigned book and due date under My Borrowed Books after approval."),
      onError: (error) => notify(getBorrowErrorMessage(error)),
    });
  };

  const handleReserve = (bookId: string) => {
    createReservation.mutate(bookId, {
      onSuccess: () => notify("Reservation added to your Waiting List."),
      onError: (error) => notify(getReservationErrorMessage(error)),
    });
  };

  return (
    <AppLayout user={user} unreadNotificationCount={unreadCount} onLogout={logout}>
      <Routes>
        <Route path="/" element={<Navigate to={user.role === "librarian" ? "/librarian/catalog" : "/catalog"} replace />} />
        <Route
          path="/catalog"
          element={user.role === "librarian"
            ? <CatalogManagementPage onBorrow={handleBorrow} onReserve={handleReserve} pendingBookId={pendingBookId} />
            : <CatalogPage onBorrow={handleBorrow} onReserve={handleReserve} pendingBookId={pendingBookId} />}
        />
        <Route path="/my-loans" element={<MyLoansPage memberId={user.memberId} />} />
        <Route path="/reservations" element={<ReservationsPage memberId={user.memberId} />} />
        <Route
          path="/librarian/catalog"
          element={user.role === "librarian"
            ? <CatalogManagementPage onBorrow={handleBorrow} onReserve={handleReserve} pendingBookId={pendingBookId} />
            : <Navigate to="/catalog" replace />}
        />
        <Route
          path="/librarian/member-requests"
          element={user.role === "librarian" ? <MemberRequestsPage /> : <Navigate to="/catalog" replace />}
        />
        <Route
          path="/librarian/borrow-requests"
          element={user.role === "librarian" ? <BorrowRequestsPage /> : <Navigate to="/catalog" replace />}
        />
        <Route path="/my-borrows" element={<Navigate to="/my-loans" replace />} />
        <Route path="/my-reservations" element={<Navigate to="/reservations" replace />} />
        <Route path="/notifications" element={<Navigate to="/reservations" replace />} />
        <Route path="/admin" element={<Navigate to="/librarian/catalog" replace />} />
        <Route path="*" element={<Navigate to="/catalog" replace />} />
      </Routes>
    </AppLayout>
  );
}

function LoginRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p role="status" className="p-6">Checking login...</p>;
  return user ? <Navigate to="/catalog" replace /> : <LoginPage />;
}

function RegisterRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p role="status" className="p-6">Checking login...</p>;
  return user ? <Navigate to="/" replace /> : <RegisterPage />;
}

function ProtectedRoutes() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p role="status" className="p-6">Checking login...</p>;
  return user ? <AppShell /> : <Navigate to="/login" replace />;
}

export default function LibraryApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/register" element={<RegisterRoute />} />
        <Route path="*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}