import { useEffect, useState } from "react";
import { getStoredUser } from "../services/api";
import { useLanguage } from "../i18n";

const THEME_KEY = "formcraft_theme";

function Settings() {
  const user = getStoredUser();
  const { language, setLanguage, t } = useLanguage();

  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

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
        <h1>⚙️ {t("settings")}</h1>
        <p>Manage your profile and preferences</p>
      </div>

      <div className="panel">
        <div className="panel-header"><h2>{t("profile")}</h2></div>
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
        <div className="panel-header"><h2>{t("appearance")}</h2></div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={theme === "dark"}
            onChange={(e) => setTheme(e.target.checked ? "dark" : "light")}
          />
          <span className="toggle-switch-track"></span>
          <span className="toggle-switch-label">{t("darkMode")}</span>
        </label>
      </div>

      <div className="panel">
        <div className="panel-header"><h2>{t("language")}</h2></div>
        <div className="form-group" style={{ maxWidth: "260px" }}>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="te">తెలుగు (Telugu)</option>
            <option value="hi">हिन्दी (Hindi)</option>
          </select>
          <p className="form-hint">
            {language === "en" && "The navigation, headers and key labels now show in English."}
            {language === "te" && "నావిగేషన్, హెడర్‌లు మరియు ముఖ్య లేబుల్స్ ఇప్పుడు తెలుగులో కనిపిస్తాయి."}
            {language === "hi" && "नेविगेशन, हेडर और मुख्य लेबल अब हिन्दी में दिखते हैं।"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Settings;