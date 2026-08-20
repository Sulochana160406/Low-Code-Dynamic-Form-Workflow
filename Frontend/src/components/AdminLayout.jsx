import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { logout, getStoredUser } from "../services/api";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true, icon: "\u2302" },
  { to: "/create-form", label: "Create Form", icon: "\u270E" },
  { to: "/forms-list", label: "Forms List", icon: "\u2637" },
  { to: "/responses", label: "Responses", icon: "\u2611" },
  { to: "/audit-log", label: "Audit Log", icon: "\u{1F575}" },
];

const THEME_KEY = "formcraft_theme";

function getInitialTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();

  const [theme, setTheme] = useState(getInitialTheme);
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navMenuRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Close the nav menu on every navigation, so it never stays open
  // pointing at a page you already left.
  useEffect(() => {
    setNavMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (navMenuRef.current && !navMenuRef.current.contains(e.target)) {
        setNavMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const initials = (user?.name || user?.email || "?")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-left">
            <span className="sidebar-logo">FC</span>
            <span className="sidebar-brand-text">FormCraft</span>
          </div>

          <div className="nav-menu" ref={navMenuRef}>
            <button
              type="button"
              className={`nav-menu-trigger${navMenuOpen ? " active" : ""}`}
              onClick={() => setNavMenuOpen((v) => !v)}
              aria-label="Open navigation menu"
              aria-expanded={navMenuOpen}
            >
              ⋮
            </button>

            {navMenuOpen && (
              <div className="nav-menu-dropdown">
                <nav className="sidebar-nav">
                  {NAV_ITEMS.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => (isActive ? "active" : undefined)}
                    >
                      <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>
            )}
          </div>
        </div>

        <div className="sidebar-middle" />

        <div className="sidebar-footer">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            <span aria-hidden="true">{theme === "light" ? "\u263D" : "\u2600"}</span>
            <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
          </button>

          <div className="profile-menu" ref={profileRef}>
            {profileOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-name">{user?.name || "Admin"}</div>
                <div className="profile-dropdown-email">{user?.email}</div>
                <hr />
                <button type="button" onClick={handleLogout}>Logout</button>
              </div>
            )}
            <button
              type="button"
              className="profile-trigger"
              onClick={() => setProfileOpen((v) => !v)}
            >
              <span className="profile-avatar">{initials}</span>
              <span className="profile-info">
                <span className="profile-name">{user?.name || "Admin"}</span>
                <span className="profile-email">{user?.email}</span>
              </span>
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;