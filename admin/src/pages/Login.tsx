import { useState } from "react";
import { useAdminAuth } from "../useAdminAuth";

export default function Login({ auth }: { auth: ReturnType<typeof useAdminAuth> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await auth.loginWithEmail(email, password);
    setBusy(false);
  };

  const handleGoogle = async () => {
    setBusy(true);
    await auth.loginWithGoogle();
    setBusy(false);
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>🛡️ Admin Dashboard</h1>
        <p>Sign in with your admin account</p>

        {auth.error && <div className="login-error">{auth.error}</div>}

        <button className="google-btn" onClick={handleGoogle} disabled={busy || !auth.firebaseEnabled}>
          🔵 Continue with Google
        </button>

        <div style={{ textAlign: "center", margin: "12px 0", color: "#999", fontSize: "13px" }}>or</div>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@gmail.com"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            required
          />
          <button type="submit" disabled={busy || !auth.firebaseEnabled}>
            {busy ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 12, color: "#999", textAlign: "center" }}>
          Not an admin? <a href="/">← back to site</a>
        </p>
      </div>
    </div>
  );
}
