import { useState, useRef } from "react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("max 2MB");
      return;
    }
    setUploading(true);
    setAvatarError("");
    try {
      await auth.uploadAvatar(file);
    } catch {
      setAvatarError("upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
          {/* Avatar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 12 }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 60, height: 60, borderRadius: "50%",
                background: auth.account.avatarUrl ? `url(${auth.account.avatarUrl}) center/cover` : "#4361ee",
                border: "2px solid rgba(255,255,255,.3)",
                cursor: "pointer", position: "relative",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontWeight: 700, color: "#fff",
                marginBottom: 6,
              }}
              title="Click to upload profile picture"
            >
              {!auth.account.avatarUrl && auth.account.username.charAt(0).toUpperCase()}
              {uploading && (
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: "rgba(0,0,0,.5)", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 14,
                }}>
                  ⏳
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarUpload}
            />
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", fontWeight: 600 }}>
              {auth.account.username}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)", marginTop: 2 }}>
              {avatarError || "click avatar to change"}
            </div>
          </div>

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
