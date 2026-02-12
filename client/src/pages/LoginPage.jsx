import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/http.js";

function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("admin@smartpos.local");
  const [password, setPassword] = React.useState("admin123");
  const [error, setError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const payload = await api.login({ email, password });
      onLogin(payload);
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <p className="login-badge">SmartPOS Enterprise</p>
        <h1>Sign In to Dashboard</h1>
        <p className="login-help">Use the seeded credentials to access your POS workspace.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            autoComplete="email"
            id="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />

          <label htmlFor="password">Password</label>
          <input
            autoComplete="current-password"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />

          {error ? <p className="form-error">{error}</p> : null}

          <button className="btn btn-primary btn-wide" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="login-footer">Default login: admin@smartpos.local / admin123</p>
      </div>
    </div>
  );
}

export default LoginPage;
