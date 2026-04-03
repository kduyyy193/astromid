import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Loader2, MapPin, Sparkles } from 'lucide-react';
import LocationAutocomplete, { type LocationAutocompletePatch } from '../components/LocationAutocomplete';
import { computeTropicalChartDebug, tropicalSignFromLongitude, type BirthForm } from '../lib/astrology';

const ROWS: { key: string; label: string }[] = [
  { key: "Sun", label: "Mặt Trời (Sun)" },
  { key: "Moon", label: "Mặt Trăng (Moon)" },
  { key: "Rising", label: "Cung Mọc (Rising)" },
  { key: "Mercury", label: "Sao Thủy" },
  { key: "Venus", label: "Sao Kim" },
  { key: "Earth", label: "Trái Đất (đối Mặt Trời)" },
  { key: "Mars", label: "Sao Hỏa" },
  { key: "Jupiter", label: "Sao Mộc" },
  { key: "Saturn", label: "Sao Thổ" },
  { key: "Uranus", label: "Thiên Vương" },
  { key: "Neptune", label: "Hải Vương" },
];

export default function ChartDebugPage() {
  const [form, setForm] = useState<BirthForm>({
    date: "1990-06-15",
    time: "10:30",
    location: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [utcIso, setUtcIso] = useState<string | null>(null);
  const [geoLine, setGeoLine] = useState<string | null>(null);
  const [localSummaryLine, setLocalSummaryLine] = useState<string | null>(null);
  const [rows, setRows] = useState<{ label: string; deg: number; sign: string }[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUtcIso(null);
    setGeoLine(null);
    setLocalSummaryLine(null);
    setRows([]);
    try {
      const res = await computeTropicalChartDebug(form);
      if (res.ok === false) {
        setError(res.error);
        return;
      }
      const { utcIso: u, geo, positions, localSummary } = res.result;
      setUtcIso(u);
      setLocalSummaryLine(localSummary);
      setGeoLine(`lat ${geo.latitude.toFixed(5)} · lon ${geo.longitude.toFixed(5)} · ${geo.timezone}`);
      const out: { label: string; deg: number; sign: string }[] = [];
      for (const { key, label } of ROWS) {
        const deg = positions[key];
        if (typeof deg !== "number" || Number.isNaN(deg)) continue;
        out.push({ label, deg, sign: tropicalSignFromLongitude(deg) });
      }
      setRows(out);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#F27D26] selection:text-black">
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#3a1510] rounded-full blur-[120px] opacity-30" />
        <div className="absolute bottom-[10%] right-[-5%] w-[50%] h-[50%] bg-[#F27D26] rounded-full blur-[150px] opacity-10" />
      </div>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-12 md:py-20">
        <div className="flex flex-wrap items-center gap-4 mb-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 hover:text-[#F27D26] transition-colors"
          >
            <ArrowLeft size={14} />
            AstroMind
          </Link>
          <Link
            to="/test/reading"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-[#F27D26] transition-colors"
          >
            Chart reading
          </Link>
          <Link
            to="/test/couple"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-[#F27D26] transition-colors"
          >
            Synastry
          </Link>
          <Link
            to="/test/geocode"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-[#F27D26] transition-colors"
          >
            Geocode test
          </Link>
        </div>

        <header className="space-y-2 mb-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#F27D26] font-bold">Debug</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Chart Tropical</h1>
          <p className="text-white/45 text-sm font-light leading-relaxed">
            Giờ sinh theo múi nơi chào đời (VN +7 khi sinh tại VN). Gõ nơi sinh, chọn gợi ý để khóa tọa độ — vòng cung tropical.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-md mb-10">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
              <Calendar size={12} /> Ngày sinh
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full bg-transparent border-b border-white/20 py-3 focus:border-[#F27D26] outline-none transition-colors text-lg font-light"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
              <Clock size={12} /> Giờ sinh · múi nơi sinh (HH:mm)
            </label>
            <input
              type="time"
              required
              value={form.time}
              onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
              className="w-full bg-transparent border-b border-white/20 py-3 focus:border-[#F27D26] outline-none transition-colors text-lg font-light"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
              <MapPin size={12} /> Nơi sinh
            </label>
            <LocationAutocomplete
              value={form.location}
              placeholder="Gõ và chọn địa điểm"
              onChange={(patch: LocationAutocompletePatch) => setForm((prev) => ({ ...prev, ...patch }))}
              aria-label="Nơi sinh"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-gradient-to-br from-[#F27D26] via-[#ea7326] to-[#c45a1c] px-4 py-3 text-sm font-bold text-black shadow-[0_6px_24px_-10px_rgba(242,125,38,0.55)] hover:brightness-[1.02] active:scale-[0.995] disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {loading ? "Đang dựng lá số…" : "Dựng lá số"}
          </button>
        </form>

        {loading && (
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-[#F27D26]/25 bg-[#F27D26]/10 px-5 py-4 mb-8"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-5 w-5 shrink-0 text-[#F27D26] animate-spin" aria-hidden />
            <p className="text-sm text-white/85 font-light">Đang quay vòng cung tropical…</p>
          </div>
        )}

        {error && <p className="text-sm text-red-400/90 mb-6">{error}</p>}

        {utcIso && (
          <div className="space-y-2 mb-8 text-sm text-white/55">
            {localSummaryLine && <p className="font-sans text-white/70 leading-relaxed">{localSummaryLine}</p>}
            <p className="font-mono">
              <span className="text-white/40 text-sm font-sans">UTC (ISO): </span>
              {utcIso}
            </p>
            {geoLine && <p className="font-mono">{geoLine}</p>}
          </div>
        )}

        {rows.length > 0 && (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/[0.06] text-left text-[10px] uppercase tracking-widest text-white/45">
                  <th className="px-4 py-3 font-bold">Vị trí</th>
                  <th className="px-4 py-3 font-bold">Độ (°)</th>
                  <th className="px-4 py-3 font-bold">Cung (Tropical)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-t border-white/10">
                    <td className="px-4 py-3 text-white/90">{r.label}</td>
                    <td className="px-4 py-3 font-mono text-white/70">{r.deg.toFixed(4)}</td>
                    <td className="px-4 py-3 text-[#F27D26] font-semibold">{r.sign}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
