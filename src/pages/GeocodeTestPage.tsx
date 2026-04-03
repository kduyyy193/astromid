import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, MapPin, Search } from 'lucide-react';
import { geocodeSearch, type GeocodeCandidate } from '../lib/astrology';

export default function GeocodeTestPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [languageUsed, setLanguageUsed] = useState<'vi' | 'en' | null>(null);
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const [errorKey, setErrorKey] = useState<'empty' | 'failed' | 'not_found' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorKey(null);
    setLanguageUsed(null);
    setCandidates([]);
    try {
      const res = await geocodeSearch(query);
      if (!res.ok) {
        setErrorKey('failed');
        return;
      }
      setLanguageUsed(res.language);
      setCandidates(res.candidates);
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
            to="/test/chart"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-[#F27D26] transition-colors"
          >
            Chart debug
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
        </div>

        <header className="space-y-2 mb-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#F27D26] font-bold">Debug</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Geocode test</h1>
          <p className="text-white/45 text-sm font-light leading-relaxed">
            Nhập địa danh như trên form chính. Cùng cách tra và khóa tọa độ như khi tính Cung Mọc trên lá số.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-md mb-10">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
              <MapPin size={12} /> Nơi sinh / địa chỉ
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ví dụ: Hà Nội, Việt Nam"
              className="w-full bg-transparent border-b border-white/20 py-3 focus:border-[#F27D26] outline-none transition-colors text-lg font-light"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-gradient-to-br from-[#F27D26] via-[#ea7326] to-[#c45a1c] px-4 py-3 text-sm font-bold text-black shadow-[0_6px_24px_-10px_rgba(242,125,38,0.55)] hover:brightness-[1.02] active:scale-[0.995] disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            {loading ? 'Đang neo điểm…' : 'Neo điểm nơi sinh'}
          </button>
        </form>

        {loading && (
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-[#F27D26]/25 bg-[#F27D26]/10 px-5 py-4 mb-8"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-5 w-5 shrink-0 text-[#F27D26] animate-spin" aria-hidden />
            <p className="text-sm text-white/85 font-light">Đang khóa tọa độ địa cầu cho lá số…</p>
          </div>
        )}

        {errorKey === 'empty' && (
          <p className="text-sm text-amber-400/90">Nhập ít nhất một ký tự.</p>
        )}
        {errorKey === 'failed' && (
          <p className="text-sm text-red-400/90">Không kết nối được. Thử lại sau.</p>
        )}
        {errorKey === 'not_found' && (
          <p className="text-sm text-white/50">Không tìm thấy kết quả với cả tiếng Việt và tiếng Anh.</p>
        )}

        {candidates.length > 0 && (
          <div className="space-y-4">
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
              {candidates.length} gợi ý · ngôn ngữ tra cứu: <span className="text-[#F27D26]">{languageUsed}</span>
            </p>
            <ul className="space-y-3">
              {candidates.map((c, i) => (
                <li
                  key={`${c.name}-${c.latitude}-${c.longitude}-${i}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm"
                >
                  <p className="font-semibold text-white">{i === 0 ? 'Mặc định (dòng đầu)' : `Gợi ý ${i + 1}`}: {c.name}</p>
                  <p className="mt-2 text-white/60 font-mono text-xs leading-relaxed">
                    lat {c.latitude.toFixed(5)} · lon {c.longitude.toFixed(5)}
                    <br />
                    timezone {c.timezone}
                  </p>
                  {(c.admin1 || c.country) && (
                    <p className="mt-2 text-white/45 text-xs">
                      {[c.admin1, c.country].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
