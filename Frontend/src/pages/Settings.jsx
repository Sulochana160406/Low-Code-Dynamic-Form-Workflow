import { useEffect, useState } from "react";
import { getStoredUser } from "../services/api";

const THEME_KEY = "formcraft_theme";
const LANGUAGE_KEY = "formcraft_language";

function Settings() {
  const user = getStoredUser();

  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "light");
  const [language, setLanguage] = useState(() => localStorage.getItem(LANGUAGE_KEY) || "en");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  const initials = (user?.name || user?.email || "?")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div>
      <div className="page-header">
        <h1>⚙️ Settings</h1>
        <p>Manage your profile and preferences</p>
      </div>

      <div className="panel">
        <div className="panel-header"><h2>Profile</h2></div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span
            className="profile-avatar"
            style={{ width: "56px", height: "56px", fontSize: "20px" }}
          >
            {initials}
          </span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "16px" }}>{user?.name || "Admin"}</div>
            <div style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>{user?.email}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><h2>Appearance</h2></div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={theme === "dark"}
            onChange={(e) => setTheme(e.target.checked ? "dark" : "light")}
          />
          <span className="toggle-switch-track"></span>
          <span className="toggle-switch-label">Dark mode</span>
        </label>
      </div>

      <div className="panel">
        <div className="panel-header"><h2>Language</h2></div>
        <div className="form-group" style={{ maxWidth: "260px" }}>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="te">తెలుగు (Telugu)</option>
            <option value="hi">हिन्दी (Hindi)</option>
          </select>
          <p className="form-hint">
            {language === "en" && "Interface language: English."}
            {language === "te" && "ఇంటర్ఫేస్ భాష: తెలుగు (త్వరలో అందుబాటులోకి వస్తుంది)."}
            {language === "hi" && "इंटरफ़ेस भाषा: हिन्दी (जल्द ही उपलब्ध होगा)."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Settings;