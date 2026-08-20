import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../services/api";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split">
      <div className="auth-brand-panel">
        <div className="auth-brand-mark">
          <span className="sidebar-logo">FC</span>
          <span className="auth-brand-name">FormCraft</span>
        </div>
        <div className="auth-brand-copy">
          <h1>Build forms.<br />Understand your data.</h1>
          <p>Conditional logic, live analytics, and export — all in one workspace.</p>
        </div>
        <ul className="auth-feature-list">
          <li>Drag-free dynamic form builder</li>
          <li>Response analytics &amp; CSV/JSON export</li>
          <li>Retention policies &amp; audit history</li>
        </ul>
      </div>

      <div className="auth-form-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Create your account</h2>
          <p className="auth-subtitle">Set up access to your dashboard</p>

          {error && <div className="auth-error">{error}</div>}

          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="Your name"
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
            />
          </label>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Creating account…" : "Register"}
          </button>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;