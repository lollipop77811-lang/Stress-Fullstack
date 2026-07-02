import { useEffect, useState } from "react";
import type { useAdminAuth } from "../useAdminAuth";

type Stats = {
  totalConfessions: number;
  hiddenConfessions: number;
  flaggedConfessions: number;
  reportedConfessions: number;
  totalComments: number;
  hiddenComments: number;
  totalAccounts: number;
  totalWalls: number;
};

export default function Dashboard({ auth }: { auth: ReturnType<typeof useAdminAuth> }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await auth.getToken();
      if (!token) return;
      try {
        const res = await fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setStats(data);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [auth]);

  if (loading) return <div className="loading">Loading stats...</div>;

  const cards = [
    { label: "Total Confessions", value: stats?.totalConfessions ?? 0, className: "" },
    { label: "Reported (pending)", value: stats?.reportedConfessions ?? 0, className: "warning" },
    { label: "Crisis Flagged", value: stats?.flaggedConfessions ?? 0, className: "danger" },
    { label: "Hidden Confessions", value: stats?.hiddenConfessions ?? 0, className: "" },
    { label: "Total Comments", value: stats?.totalComments ?? 0, className: "" },
    { label: "Hidden Comments", value: stats?.hiddenComments ?? 0, className: "" },
    { label: "Total Accounts", value: stats?.totalAccounts ?? 0, className: "" },
    { label: "Total Walls", value: stats?.totalWalls ?? 0, className: "success" },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of the platform</p>
      </div>
      <div className="stats-grid">
        {cards.map((c) => (
          <div className="stat-card" key={c.label}>
            <div className="label">{c.label}</div>
            <div className={`value ${c.className}`}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
