import { Link, useNavigate } from "react-router-dom";
import { authService } from "../services/auth.service";

function Navbar() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const isAuthenticated = authService.isAuthenticated();

  const handleLogout = (): void => {
    authService.logout();
    navigate("/login");
  };

  return (
    <nav className="bg-indigo-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold">
            Yoga Studio
          </Link>

          <div className="flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                <Link to="/sessions" className="hover:text-indigo-200">
                  Sessions
                </Link>
                {user && user.admin ? (
                  <Link to="/sessions/create" className="hover:text-indigo-200">
                    Create Session
                  </Link>
                ) : null}
                <Link to="/profile" className="hover:text-indigo-200">
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-indigo-700 hover:bg-indigo-800 px-4 py-2 rounded"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-indigo-200">
                  Login
                </Link>
                <Link to="/register" className="hover:text-indigo-200">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
