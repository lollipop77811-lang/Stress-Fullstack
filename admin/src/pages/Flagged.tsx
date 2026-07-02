import { useEffect, useState } from "react";
import type { useAdminAuth } from "../useAdminAuth";

type FlaggedConfession = {
  id: string; text: string; author: string; color: string;
  wallIdx: number; isHidden: boolean; witnessCount: number;
  createdAt: string;
};

export default function Flagged({ auth }: { auth: ReturnType<typeof useAdminAuth> }) {
  const [list, setList] = useState<FlaggedConfession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const token = await auth.getToken();
    if (!token) return;
    try {
      const res = await fetch("/api/admin/flagged", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setList(data.confessions || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [auth]);

  const resolve = async (id: string) => {
    const token = await auth.getToken();
    await fetch(`/api/admin/confessions/${id}/resolve-flag`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    setList((prev) => prev.filter((c) => c.id !== id));
  };

  const hide = async (id: string) => {
    const token = await auth.getToken();
    await fetch(`/api/admin/confessions/${id}/hide`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    setList((prev) => prev.filter((c) => c.id !== id));
  };

  if (loading) return <div className="loading">Loading flagged confessions...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Crisis Flagged Confessions</h1>
        <p>Confessions that triggered self-harm detection. Review and resolve.</p>
      </div>

      {list.length === 0 ? (
        <div className="empty">No flagged confessions. 💙</div>
      ) : (
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>Text</th>
                <th>Author</th>
                <th>Wall</th>
                <th>Hidden?</th>
                <th>Witnesses</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td style={{ maxWidth: 350 }}>{c.text}</td>
                  <td>{c.author}</td>
                  <td>{c.wallIdx + 1}</td>
                  <td>{c.isHidden ? <span className="badge badge-muted">hidden</span> : <span className="badge badge-success">visible</span>}</td>
                  <td>{c.witnessCount}</td>
                  <td style={{ fontSize: 12, color: "#666" }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="actions">
                      <button className="btn btn-sm btn-success" onClick={() => resolve(c.id)}>Resolve</button>
                      <button className="btn btn-sm btn-danger" onClick={() => hide(c.id)}>Hide</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
