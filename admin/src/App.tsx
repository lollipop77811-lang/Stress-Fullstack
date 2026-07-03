import { useState } from "react";
import { useAdminAuth } from "./useAdminAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import Flagged from "./pages/Flagged";
import Search from "./pages/Search";
import Horoscope from "./pages/Horoscope";

type Page = "dashboard" | "reports" | "flagged" | "search" | "horoscope";

const NAV: { id: Page; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "reports", label: "Reports", icon: "🚩" },
  { id: "flagged", label: "Crisis Flags", icon: "💙" },
  { id: "search", label: "Search", icon: "🔍" },
  { id: "horoscope", label: "Horoscope", icon: "🔮" },
];

export default function App() {
  const auth = useAdminAuth();
  const [page, setPage] = useState<Page>("dashboard");

  // Loading state
  if (auth.loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <p style={{ color: "#666" }}>Loading...</p>
      </div>
    );
  }

  // Not logged in or not admin → show login
  if (!auth.user || !auth.account?.isAdmin) {
    return <Login auth={auth} />;
  }

  return (
    <div className="app">
      {/* Sidebar */}
      <div className="sidebar" style={{ display: "flex", flexDirection: "column" }}>
        <div className="sidebar-logo">🛡️ OSK Admin</div>
        <div className="sidebar-nav" style={{ flex: 1 }}>
          {NAV.map((n) => (
            <div
              key={n.id}
              className={`sidebar-link ${page === n.id ? "active" : ""}`}
              onClick={() => setPage(n.id)}
            >
              <span>{n.icon}</span> {n.label}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <div style={{ marginBottom: 8 }}>Logged in as:<br /><strong>{auth.account.username}</strong></div>
          <button
            onClick={auth.logout}
            style={{
              background: "none", border: "1px solid rgba(255,255,255,.2)", color: "rgba(255,255,255,.6)",
              padding: "6px 12px", borderRadius: 4, fontSize: 12, cursor: "pointer", width: "100%",
            }}
          >
            Sign Out
          </button>
          <div style={{ marginTop: 8 }}>
            <a href="/" style={{ color: "rgba(255,255,255,.4)", fontSize: 12 }}>← back to site</a>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="main">
        {page === "dashboard" && <Dashboard auth={auth} />}
        {page === "reports" && <Reports auth={auth} />}
        {page === "flagged" && <Flagged auth={auth} />}
        {page === "search" && <Search auth={auth} />}
        {page === "horoscope" && <Horoscope auth={auth} />}
      </div>
    </div>
  );
}
