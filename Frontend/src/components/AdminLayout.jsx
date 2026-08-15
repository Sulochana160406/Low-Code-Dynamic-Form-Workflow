import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout, getStoredUser } from "../services/api";

function AdminLayout() {
  const linkClass = ({ isActive }) => (isActive ? "active" : undefined);
  const navigate = useNavigate();
  const user = getStoredUser();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <nav>
        <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
        <NavLink to="/create-form" className={linkClass}>Create Form</NavLink>
        <NavLink to="/forms-list" className={linkClass}>Forms List</NavLink>
        <NavLink to="/responses" className={linkClass}>Responses</NavLink>
        <span className="nav-spacer" />
        {user && <span className="nav-user">{user.name || user.email}</span>}
        <button type="button" className="nav-logout" onClick={handleLogout}>
          Logout
        </button>
      </nav>
      <Outlet />
    </>
  );
}

export default AdminLayout;