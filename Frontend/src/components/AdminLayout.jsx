import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { logout, getStoredUser } from "../services/api";
import { useLanguage } from "../i18n";

const NAV_ITEMS = [
  { to: "/", key: "dashboard", end: true, icon: "\u2302" },
  { to: "/create-form", key: "createForm", icon: "\u270E" },
  { to: "/forms-list", key: "formsList", icon: "\u2637" },
  { to: "/responses", key: "responses", icon: "\u2611" },
  { to: "/audit-log", key: "auditLog", icon: "\u{1F575}" },
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
  const { t } = useLanguage();

  // The theme can also be changed from the Settings page — this just
  // makes sure the <html data-theme> attribute is applied on first load
  // and stays correct if it was set in a previous session.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", getInitialTheme());
  }, []);

  const [navOpen, setNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close the drawer/profile menu on every navigation.
  useEffect(() => {
    setNavOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      <header className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            className={`nav-menu-trigger${navOpen ? " active" : ""}`}
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={navOpen}
          >
            ☰
          </button>

          <div className="topbar-brand">
            <span className="sidebar-logo">FC</span>
            <span className="topbar-brand-text">FormCraft</span>
          </div>
        </div>

        <div className="profile-menu" ref={profileRef}>
          <button
            type="button"
            className="profile-trigger"
            onClick={() => setProfileOpen((v) => !v)}
            aria-label="Open profile menu"
          >
            <span className="profile-avatar">{initials}</span>
          </button>

          {profileOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-name">{user?.name || "Admin"}</div>
              <div className="profile-dropdown-email">{user?.email}</div>
              <hr />
              <NavLink to="/settings">⚙ {t("settings")}</NavLink>
              <button type="button" className="logout" onClick={handleLogout}>{t("logout")}</button>
            </div>
          )}
        </div>
      </header>

      {navOpen && (
        <>
          <div className="nav-drawer-backdrop" onClick={() => setNavOpen(false)} />
          <div className="nav-drawer">
            <div className="nav-drawer-header">
              <div className="topbar-brand">
                <span className="sidebar-logo">FC</span>
                <span className="topbar-brand-text">FormCraft</span>
              </div>
              <button
                type="button"
                className="nav-drawer-close"
                onClick={() => setNavOpen(false)}
                aria-label="Close navigation menu"
              >
                ✕
              </button>
            </div>

            <nav className="sidebar-nav">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? "active" : undefined)}
                >
                  <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
                  <span>{t(item.key)}</span>
                </NavLink>
              ))}

              <hr className="nav-drawer-divider" />

              <NavLink
                to="/settings"
                className={({ isActive }) => (isActive ? "active" : undefined)}
              >
                <span className="sidebar-icon" aria-hidden="true">⚙</span>
                <span>{t("settings")}</span>
              </NavLink>
            </nav>
          </div>
        </>
      )}

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;