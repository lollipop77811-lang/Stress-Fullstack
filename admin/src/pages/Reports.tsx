import { useEffect, useState } from "react";
import type { useAdminAuth } from "../useAdminAuth";

type ReportedConfession = {
  id: string; text: string; author: string; color: string;
  wallIdx: number; reportCount: number; witnessCount: number;
  isFlagged: boolean; createdAt: string;
};

type ReportedComment = {
  id: string; text: string; author: string;
  confessionId: string; confessionText: string;
  reportCount: number; createdAt: string;
};

export default function Reports({ auth }: { auth: ReturnType<typeof useAdminAuth> }) {
  const [confessions, setConfessions] = useState<ReportedConfession[]>([]);
  const [comments, setComments] = useState<ReportedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"confessions" | "comments">("confessions");

  const fetchData = async () => {
    const token = await auth.getToken();
    if (!token) return;
    try {
      const res = await fetch("/api/admin/reports", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setConfessions(data.confessions || []);
      setComments(data.comments || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [auth]);

  const hideConfession = async (id: string) => {
    const token = await auth.getToken();
    await fetch(`/api/admin/confessions/${id}/hide`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    setConfessions((prev) => prev.filter((c) => c.id !== id));
  };

  const deleteConfession = async (id: string) => {
    if (!confirm("Permanently delete this confession?")) return;
    const token = await auth.getToken();
    await fetch(`/api/admin/confessions/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setConfessions((prev) => prev.filter((c) => c.id !== id));
  };

  const hideComment = async (id: string) => {
    const token = await auth.getToken();
    await fetch(`/api/admin/comments/${id}/hide`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  const deleteComment = async (id: string) => {
    if (!confirm("Permanently delete this comment?")) return;
    const token = await auth.getToken();
    await fetch(`/api/admin/comments/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  if (loading) return <div className="loading">Loading reports...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Reports Queue</h1>
        <p>Reported content sorted by report count (highest first)</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          className={`btn ${tab === "confessions" ? "btn-primary" : ""}`}
          onClick={() => setTab("confessions")}
        >
          Confessions ({confessions.length})
        </button>
        <button
          className={`btn ${tab === "comments" ? "btn-primary" : ""}`}
          onClick={() => setTab("comments")}
        >
          Comments ({comments.length})
        </button>
      </div>

      {tab === "confessions" && (
        confessions.length === 0 ? (
          <div className="empty">No reported confessions. 🎉</div>
        ) : (
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>Text</th>
                  <th>Author</th>
                  <th>Reports</th>
                  <th>Witnesses</th>
                  <th>Flagged</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {confessions.map((c) => (
                  <tr key={c.id}>
                    <td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.text}</td>
                    <td>{c.author}</td>
                    <td><span className="badge badge-warning">{c.reportCount}</span></td>
                    <td>{c.witnessCount}</td>
                    <td>{c.isFlagged ? <span className="badge badge-danger">crisis</span> : "—"}</td>
                    <td style={{ fontSize: 12, color: "#666" }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-sm" onClick={() => hideConfession(c.id)}>Hide</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteConfession(c.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "comments" && (
        comments.length === 0 ? (
          <div className="empty">No reported comments. 🎉</div>
        ) : (
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>Comment</th>
                  <th>On Confession</th>
                  <th>Author</th>
                  <th>Reports</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((c) => (
                  <tr key={c.id}>
                    <td style={{ maxWidth: 250 }}>{c.text}</td>
                    <td style={{ maxWidth: 200, fontSize: 12, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.confessionText}</td>
                    <td>{c.author}</td>
                    <td><span className="badge badge-warning">{c.reportCount}</span></td>
                    <td style={{ fontSize: 12, color: "#666" }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-sm" onClick={() => hideComment(c.id)}>Hide</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteComment(c.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
