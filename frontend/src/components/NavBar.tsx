import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold hover:text-blue-100 transition">
          📚 Library
        </Link>
        
        {user ? (
          <div className="flex items-center gap-6">
            <div className="text-sm">
              <p>{user.role === "librarian" ? "👨‍💼 Librarian" : "👤 Member"}</p>
              <p className="text-blue-100">{user.memberId}</p>
            </div>
            <div className="flex gap-4">
              <Link
                to="/catalog"
                className="hover:text-blue-100 transition"
              >
                Catalog
              </Link>
              <Link
                to="/my-borrows"
                className="hover:text-blue-100 transition"
              >
                My Borrows
              </Link>
              <Link
                to="/my-reservations"
                className="hover:text-blue-100 transition"
              >
                Reservations
              </Link>
              {user.role === "librarian" && (
                <Link
                  to="/admin"
                  className="hover:text-blue-100 transition"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded transition"
              >
                Logout
              </button>
            </div>
          </div>
        ) : (
          <Link
            to="/login"
            className="bg-white text-blue-600 px-4 py-2 rounded font-medium hover:bg-blue-50 transition"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
