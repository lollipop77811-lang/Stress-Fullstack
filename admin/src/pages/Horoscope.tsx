import { useEffect, useState } from "react";
import type { useAdminAuth } from "../useAdminAuth";

const SIGNS = [
  { name: "Aries", symbol: "♈", emoji: "🐏", element: "Fire" },
  { name: "Taurus", symbol: "♉", emoji: "🐂", element: "Earth" },
  { name: "Gemini", symbol: "♊", emoji: "👯", element: "Air" },
  { name: "Cancer", symbol: "♋", emoji: "🦀", element: "Water" },
  { name: "Leo", symbol: "♌", emoji: "🦁", element: "Fire" },
  { name: "Virgo", symbol: "♍", emoji: "🌾", element: "Earth" },
  { name: "Libra", symbol: "♎", emoji: "⚖️", element: "Air" },
  { name: "Scorpio", symbol: "♏", emoji: "🦂", element: "Water" },
  { name: "Sagittarius", symbol: "♐", emoji: "🏹", element: "Fire" },
  { name: "Capricorn", symbol: "♑", emoji: "🐐", element: "Earth" },
  { name: "Aquarius", symbol: "♒", emoji: "🌊", element: "Air" },
  { name: "Pisces", symbol: "♓", emoji: "🐟", element: "Water" },
];

type HoroscopeEntry = {
  sign: string;
  prediction: string;
};

export default function Horoscope({ auth }: { auth: ReturnType<typeof useAdminAuth> }) {
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedSigns, setSavedSigns] = useState<Set<string>>(new Set());
  const [date, setDate] = useState("");

  const fetchData = async () => {
    const token = await auth.getToken();
    if (!token) return;
    try {
      const res = await fetch("/api/admin/horoscope", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDate(data.date);
      const map: Record<string, string> = {};
      for (const h of data.horoscopes) {
        map[h.sign] = h.prediction || "";
      }
      setEntries(map);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [auth]);

  const save = async (sign: string) => {
    setSaving(sign);
    const token = await auth.getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/horoscope/${sign}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prediction: entries[sign] || "" }),
      });
      if (res.ok) {
        setSavedSigns((prev) => new Set([...prev, sign]));
        setTimeout(() => {
          setSavedSigns((prev) => {
            const next = new Set(prev);
            next.delete(sign);
            return next;
          });
        }, 2000);
      }
    } catch {
      /* ignore */
    }
    setSaving(null);
  };

  const [savingAll, setSavingAll] = useState(false);
  const [allSaved, setAllSaved] = useState(false);

  const saveAll = async () => {
    setSavingAll(true);
    const token = await auth.getToken();
    if (!token) return;
    try {
      // Save all 12 signs in parallel
      await Promise.all(
        SIGNS.map((s) =>
          fetch(`/api/admin/horoscope/${s.name}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ prediction: entries[s.name] || "" }),
          })
        )
      );
      setAllSaved(true);
      setSavedSigns(new Set(SIGNS.map((s) => s.name)));
      setTimeout(() => {
        setAllSaved(false);
        setSavedSigns(new Set());
      }, 3000);
    } catch {
      /* ignore */
    }
    setSavingAll(false);
  };

  if (loading) return <div className="loading">Loading horoscopes...</div>;

  const elementColors: Record<string, string> = {
    Fire: "#f72585",
    Earth: "#28a745",
    Air: "#4361ee",
    Water: "#17a2b8",
  };

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>🔮 Horoscope Manager</h1>
          <p>Update daily predictions for all 12 zodiac signs — {date}</p>
        </div>
        <button
          onClick={saveAll}
          disabled={savingAll}
          style={{
            padding: "10px 24px",
            background: allSaved ? "#28a745" : "#4361ee",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: savingAll ? "wait" : "pointer",
            opacity: savingAll ? 0.7 : 1,
          }}
        >
          {allSaved ? "✓ All Updated!" : savingAll ? "Updating all..." : "Update All →"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
        {SIGNS.map((s) => (
          <div
            key={s.name}
            style={{
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: 8,
              padding: 16,
              boxShadow: "0 1px 3px rgba(0,0,0,.1)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>{s.emoji}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color: elementColors[s.element],
                  }}
                >
                  {s.element} · {s.symbol}
                </span>
              </div>
              {savedSigns.has(s.name) && (
                <span style={{ marginLeft: "auto", fontSize: 12, color: "#28a745", fontWeight: 600 }}>
                  ✓ Saved
                </span>
              )}
            </div>

            {/* Textarea */}
            <textarea
              value={entries[s.name] || ""}
              onChange={(e) =>
                setEntries((prev) => ({ ...prev, [s.name]: e.target.value.slice(0, 500) }))
              }
              placeholder={`Today's prediction for ${s.name}...`}
              rows={3}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid #e0e0e0",
                borderRadius: 4,
                fontSize: 13,
                fontFamily: "inherit",
                resize: "vertical",
                marginBottom: 8,
              }}
            />

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#999" }}>
                {(entries[s.name] || "").length}/500
              </span>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => save(s.name)}
                disabled={saving === s.name}
              >
                {saving === s.name ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
