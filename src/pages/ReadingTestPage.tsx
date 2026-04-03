import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Languages, Loader2, MapPin, Sparkles, User } from 'lucide-react';
import Markdown from 'react-markdown';
import LocationAutocomplete, { type LocationAutocompletePatch } from '../components/LocationAutocomplete';
import { calculatePositionsFromBirthData, type BirthForm } from '../lib/astrology';
import { getAstrologyInterpretation, getChartPlacementRows } from '../lib/gemini';

type Lang = 'vi' | 'en';

export default function ReadingTestPage() {
  const [form, setForm] = useState<BirthForm>({
    date: '1990-06-15',
    time: '10:30',
    location: '',
  });
  const [displayName, setDisplayName] = useState('Test');
  const [language, setLanguage] = useState<Lang>('vi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [placementRows, setPlacementRows] = useState<ReturnType<typeof getChartPlacementRows> | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setText(null);
    setPlacementRows(null);
    try {
      const positions = await calculatePositionsFromBirthData(form);
      const hasChart = Object.keys(positions).length > 0;
      if (!hasChart) {
        setError(
          language === 'vi'
            ? 'Không tính được chart: kiểm tra ngày, giờ HH:mm và nơi sinh (nên chọn từ gợi ý).'
            : 'Could not compute chart: check date, HH:mm time, and location (pick from suggestions).',
        );
        return;
      }
      setPlacementRows(getChartPlacementRows(positions));
      const birthData = {
        name: displayName.trim() || 'Test',
        date: form.date,
        time: form.time,
        location: form.location.trim(),
      };
      const out = await getAstrologyInterpretation(birthData, positions, language);
      setText(out);
    } catch {
      setError(language === 'vi' ? 'Lỗi không xác định.' : 'Unknown error.');
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

      <div className="fixed top-6 right-6 z-50">
        <button
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
          className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full hover:bg-white/10 transition-all backdrop-blur-md"
          aria-label={language === 'en' ? 'Switch to Vietnamese' : 'Switch to English'}
        >
          <Languages size={16} className="text-[#F27D26]" />
          <span className="text-xs font-bold tracking-widest uppercase">{language === 'en' ? 'Tiếng Việt' : 'English'}</span>
        </button>
      </div>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12 md:py-20">
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
            to="/test/couple"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-[#F27D26] transition-colors"
          >
            Synastry
          </Link>
          <Link
            to="/test/geocode"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-[#F27D26] transition-colors"
          >
            Geocode
          </Link>
        </div>

        <header className="space-y-2 mb-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#F27D26] font-bold">Debug</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {language === 'vi' ? 'Soi lá số (thử, không thanh toán)' : 'Chart reading test (no payment)'}
          </h1>
          <p className="text-white/45 text-sm font-light leading-relaxed">
            {language === 'vi'
              ? 'Cùng một lộ trình như sau thanh toán: dựng lá số tropical, rồi giải các cung. Đây là bản thử trên máy bạn.'
              : 'Same path as after checkout: tropical chart, then a sign-by-sign reading. This is a local test run.'}
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-md mb-10"
        >
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
              <User size={12} /> {language === 'vi' ? 'Tên hiển thị (prompt)' : 'Display name (prompt)'}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-transparent border-b border-white/20 py-3 focus:border-[#F27D26] outline-none transition-colors text-lg font-light"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
              <Calendar size={12} /> {language === 'vi' ? 'Ngày sinh' : 'Birth date'}
            </label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              className="w-full bg-transparent border-b border-white/20 py-3 focus:border-[#F27D26] outline-none transition-colors text-lg font-light"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
              <Clock size={12} /> {language === 'vi' ? 'Giờ sinh · múi nơi sinh (HH:mm)' : 'Birth time · local zone (HH:mm)'}
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
              <MapPin size={12} /> {language === 'vi' ? 'Nơi sinh' : 'Birth place'}
            </label>
            <LocationAutocomplete
              value={form.location}
              placeholder={language === 'vi' ? 'Gõ và chọn địa điểm' : 'Search and pick a place'}
              onChange={(patch: LocationAutocompletePatch) => setForm((prev) => ({ ...prev, ...patch }))}
              aria-label={language === 'vi' ? 'Nơi sinh' : 'Birth place'}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-gradient-to-br from-[#F27D26] via-[#ea7326] to-[#c45a1c] px-4 py-3 text-sm font-bold text-black shadow-[0_6px_24px_-10px_rgba(242,125,38,0.55)] hover:brightness-[1.02] active:scale-[0.995] disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {loading
              ? language === 'vi'
                ? 'Đang soi lá số…'
                : 'Reading the chart…'
              : language === 'vi'
                ? 'Soi lá số'
                : 'Cast the reading'}
          </button>
        </form>

        {error && <p className="text-sm text-red-400/90 mb-6">{error}</p>}

        {placementRows && (
          <div className="mb-8 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-[10px] uppercase tracking-widest text-[#F27D26] font-bold mb-4">
              {language === 'vi' ? 'Cung (tropical) — tham chiếu' : 'Tropical placements — reference'}
            </p>
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="text-white/40 text-[10px] uppercase tracking-widest border-b border-white/10">
                  <th className="py-2 pr-4 font-bold">{language === 'vi' ? 'Điểm' : 'Point'}</th>
                  <th className="py-2 pr-4 font-bold">{language === 'vi' ? 'Cung (Latin)' : 'Sign'}</th>
                  {language === 'vi' && <th className="py-2 font-bold">Cung (VN)</th>}
                </tr>
              </thead>
              <tbody>
                {placementRows.map((row) => (
                  <tr key={row.key} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5 pr-4 text-white/85 font-light">
                      {language === 'vi' ? row.labelVi : row.labelEn}
                    </td>
                    <td className="py-2.5 pr-4 text-white/90">{row.signEn ?? '—'}</td>
                    {language === 'vi' && <td className="py-2.5 text-white/80">{row.signVi ?? '—'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {loading && placementRows && (
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-[#F27D26]/25 bg-[#F27D26]/10 px-5 py-4 mb-8"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-5 w-5 shrink-0 text-[#F27D26] animate-spin" aria-hidden />
            <p className="text-sm text-white/85 font-light">
              {language === 'vi'
                ? 'Đang giải mã thông điệp từ các cung trên lá số…'
                : 'Unspooling what the signs on your chart are saying…'}
            </p>
          </div>
        )}

        {text && (
          <div className="bg-white/5 border border-white/10 p-8 md:p-10 rounded-[2rem] backdrop-blur-xl">
            <p className="text-[10px] uppercase tracking-widest text-white/35 font-bold mb-6">
              {language === 'vi' ? 'Lời giải' : 'The reading'}
            </p>
            <div className="prose prose-invert prose-orange max-w-none border-t border-white/10 pt-6">
              <div className="markdown-body">
                <Markdown>{text}</Markdown>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
