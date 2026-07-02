import { useState } from "react";
import type { useAdminAuth } from "../useAdminAuth";

type SearchResult = {
  id: string; text: string; author: string; color: string;
  wallIdx: number; isHidden: boolean; isFlagged: boolean;
  reportCount: number; witnessCount: number; createdAt: string;
};

export default function Search({ auth }: { auth: ReturnType<typeof useAdminAuth> }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    const token = await auth.getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setResults(data.confessions || []);
      setTotal(data.total || 0);
    } catch { /* ignore */ }
    setSearching(false);
    setSearched(true);
  };

  const hide = async (id: string) => {
    const token = await auth.getToken();
    await fetch(`/api/admin/confessions/${id}/hide`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    setResults((prev) => prev.filter((c) => c.id !== id));
  };

  const unhide = async (id: string) => {
    const token = await auth.getToken();
    await fetch(`/api/admin/confessions/${id}/unhide`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    setResults((prev) => prev.map((c) => c.id === id ? { ...c, isHidden: false } : c));
  };

  const del = async (id: string) => {
    if (!confirm("Permanently delete?")) return;
    const token = await auth.getToken();
    await fetch(`/api/admin/confessions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setResults((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div>
      <div className="page-header">
        <h1>Search Confessions</h1>
        <p>Search by text or author across all confessions (including hidden)</p>
      </div>

      <div className="search-bar">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="search text or author..."
        />
        <button onClick={search} disabled={searching}>
          {searching ? "Searching..." : "Search"}
        </button>
      </div>

      {searched && (
        <p style={{ marginBottom: 12, fontSize: 14, color: "#666" }}>
          {total} result{total !== 1 ? "s" : ""} for "{query}"
        </p>
      )}

      {results.length > 0 && (
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>Text</th>
                <th>Author</th>
                <th>Wall</th>
                <th>Status</th>
                <th>Reports</th>
                <th>Witnesses</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((c) => (
                <tr key={c.id}>
                  <td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.text}</td>
                  <td>{c.author}</td>
                  <td>{c.wallIdx + 1}</td>
                  <td>
                    {c.isHidden && <span className="badge badge-muted">hidden</span>}
                    {c.isFlagged && <span className="badge badge-danger">crisis</span>}
                    {!c.isHidden && !c.isFlagged && <span className="badge badge-success">active</span>}
                  </td>
                  <td>{c.reportCount > 0 ? <span className="badge badge-warning">{c.reportCount}</span> : "—"}</td>
                  <td>{c.witnessCount}</td>
                  <td style={{ fontSize: 12, color: "#666" }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="actions">
                      {c.isHidden ? (
                        <button className="btn btn-sm" onClick={() => unhide(c.id)}>Unhide</button>
                      ) : (
                        <button className="btn btn-sm" onClick={() => hide(c.id)}>Hide</button>
                      )}
                      <button className="btn btn-sm btn-danger" onClick={() => del(c.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {searched && results.length === 0 && (
        <div className="empty">No results found.</div>
      )}
    </div>
  );
}
