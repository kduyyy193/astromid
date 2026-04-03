import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Languages, Loader2, MapPin, Sparkles, User } from 'lucide-react';
import Markdown from 'react-markdown';
import BirthChart from '../components/BirthChart';
import LocationAutocomplete, { type LocationAutocompletePatch } from '../components/LocationAutocomplete';
import { calculatePositionsFromBirthData, type BirthForm } from '../lib/astrology';
import {
  getChartPlacementRows,
  getCompatibilityInterpretation,
  getCoupleQuickCompareRows,
} from '../lib/gemini';

type Lang = 'vi' | 'en';

const emptyForm = (): BirthForm => ({
  date: '1990-06-15',
  time: '10:30',
  location: '',
});

export default function CoupleTestPage() {
  const [formA, setFormA] = useState<BirthForm>(emptyForm);
  const [formB, setFormB] = useState<BirthForm>(emptyForm);
  const [nameA, setNameA] = useState('');
  const [nameB, setNameB] = useState('');
  const [language, setLanguage] = useState<Lang>('vi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [placementRowsA, setPlacementRowsA] = useState<ReturnType<typeof getChartPlacementRows> | null>(null);
  const [placementRowsB, setPlacementRowsB] = useState<ReturnType<typeof getChartPlacementRows> | null>(null);
  const [compareRows, setCompareRows] = useState<ReturnType<typeof getCoupleQuickCompareRows> | null>(null);
  const [chartA, setChartA] = useState<Record<string, number> | null>(null);
  const [chartB, setChartB] = useState<Record<string, number> | null>(null);

  const labelA = nameA.trim() || (language === 'vi' ? 'Người A' : 'Person A');
  const labelB = nameB.trim() || (language === 'vi' ? 'Người B' : 'Person B');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setText(null);
    setPlacementRowsA(null);
    setPlacementRowsB(null);
    setCompareRows(null);
    setChartA(null);
    setChartB(null);
    try {
      const posA = await calculatePositionsFromBirthData(formA);
      const posB = await calculatePositionsFromBirthData(formB);
      if (Object.keys(posA).length === 0 || Object.keys(posB).length === 0) {
        setError(
          language === 'vi'
            ? 'Không tính được chart: kiểm tra ngày, giờ HH:mm và nơi sinh (chọn từ gợi ý).'
            : 'Could not compute chart: check date, HH:mm, and location (pick from suggestions).',
        );
        return;
      }
      setChartA(posA);
      setChartB(posB);
      setPlacementRowsA(getChartPlacementRows(posA));
      setPlacementRowsB(getChartPlacementRows(posB));
      setCompareRows(getCoupleQuickCompareRows(posA, posB, language));
      const birthA = {
        date: formA.date,
        time: formA.time,
        location: formA.location.trim(),
        displayName: nameA.trim() || undefined,
      };
      const birthB = {
        date: formB.date,
        time: formB.time,
        location: formB.location.trim(),
        displayName: nameB.trim() || undefined,
      };
      const out = await getCompatibilityInterpretation(birthA, posA, birthB, posB, language);
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

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-20">
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
            to="/test/chart"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-[#F27D26] transition-colors"
          >
            Chart debug
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
            {language === 'vi' ? 'Soi duyên hai lá số (thử, không thanh toán)' : 'Synastry test (no payment)'}
          </h1>
          <p className="text-white/45 text-sm font-light leading-relaxed">
            {language === 'vi'
              ? 'Hai lá số tropical, rồi soi duyên giữa các cung — cùng lộ trình như sau thanh toán. Đây là bản thử trên máy bạn.'
              : 'Two tropical charts, then synastry by sign—same path as after checkout. This is a local test run.'}
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-md mb-10"
        >
          <div className="space-y-6 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                <User size={12} /> {language === 'vi' ? 'Người A — tên (tuỳ chọn)' : 'Person A — name (optional)'}
              </label>
              <input
                type="text"
                value={nameA}
                onChange={(e) => setNameA(e.target.value)}
                className="w-full bg-transparent border-b border-white/20 py-3 focus:border-[#F27D26] outline-none transition-colors text-lg font-light"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                <User size={12} /> {language === 'vi' ? 'Người B — tên (tuỳ chọn)' : 'Person B — name (optional)'}
              </label>
              <input
                type="text"
                value={nameB}
                onChange={(e) => setNameB(e.target.value)}
                className="w-full bg-transparent border-b border-white/20 py-3 focus:border-[#F27D26] outline-none transition-colors text-lg font-light"
              />
            </div>
          </div>

          {(['A', 'B'] as const).map((side) => {
            const form = side === 'A' ? formA : formB;
            const setForm = side === 'A' ? setFormA : setFormB;
            const title = side === 'A' ? labelA : labelB;
            return (
              <div key={side} className="space-y-6 border border-white/10 rounded-2xl p-6 bg-white/[0.02]">
                <p className="text-[10px] uppercase tracking-widest text-[#F27D26] font-bold">{title}</p>
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
              </div>
            );
          })}

          <button
            type="submit"
            disabled={loading}
            className="md:col-span-2 w-full flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-gradient-to-br from-[#F27D26] via-[#ea7326] to-[#c45a1c] px-4 py-3 text-sm font-bold text-black shadow-[0_6px_24px_-10px_rgba(242,125,38,0.55)] hover:brightness-[1.02] active:scale-[0.995] disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {loading
              ? language === 'vi'
                ? 'Đang soi duyên hai lá số…'
                : 'Reading the synastry…'
              : language === 'vi'
                ? 'Soi duyên sao'
                : 'Cast synastry'}
          </button>
        </form>

        {error && <p className="text-sm text-red-400/90 mb-6">{error}</p>}

        {chartA && chartB && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="flex flex-col items-center gap-3">
              <p className="text-[10px] uppercase tracking-widest text-[#F27D26] font-bold">{labelA}</p>
              <BirthChart size="compact" planetPositions={chartA} />
            </div>
            <div className="flex flex-col items-center gap-3">
              <p className="text-[10px] uppercase tracking-widest text-[#F27D26] font-bold">{labelB}</p>
              <BirthChart size="compact" planetPositions={chartB} />
            </div>
          </div>
        )}

        {compareRows && (
          <div className="mb-8 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-[10px] uppercase tracking-widest text-[#F27D26] font-bold mb-4">
              {language === 'vi' ? 'So sánh nhanh · Sun · Moon · Venus · Mars' : 'Quick compare · Sun · Moon · Venus · Mars'}
            </p>
            <table className="w-full text-left text-sm border-collapse min-w-[320px]">
              <thead>
                <tr className="text-white/40 text-[10px] uppercase tracking-widest border-b border-white/10">
                  <th className="py-2 pr-3 font-bold">{language === 'vi' ? 'Điểm' : 'Point'}</th>
                  <th className="py-2 pr-3 font-bold">{labelA}</th>
                  <th className="py-2 font-bold">{labelB}</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((r) => (
                  <tr key={r.key} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5 pr-3 text-white/85 font-light">{r.label}</td>
                    <td className="py-2.5 pr-3 text-white/90">
                      {language === 'vi'
                        ? r.signA
                          ? `${r.signA} (${r.signAvi ?? ''})`
                          : '—'
                        : r.signA ?? '—'}
                    </td>
                    <td className="py-2.5 text-white/90">
                      {language === 'vi'
                        ? r.signB
                          ? `${r.signB} (${r.signBvi ?? ''})`
                          : '—'
                        : r.signB ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {placementRowsA && placementRowsB && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[10px] uppercase tracking-widest text-[#F27D26] font-bold mb-4">
                {language === 'vi' ? `${labelA} · Cung (tropical)` : `${labelA} · Tropical`}
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
                  {placementRowsA.map((row) => (
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
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-[10px] uppercase tracking-widest text-[#F27D26] font-bold mb-4">
                {language === 'vi' ? `${labelB} · Cung (tropical)` : `${labelB} · Tropical`}
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
                  {placementRowsB.map((row) => (
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
          </div>
        )}

        {loading && placementRowsA && placementRowsB && (
          <div
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-[#F27D26]/25 bg-[#F27D26]/10 px-5 py-4 mb-8"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-5 w-5 shrink-0 text-[#F27D26] animate-spin" aria-hidden />
            <p className="text-sm text-white/85 font-light">
              {language === 'vi'
                ? 'Đang hòa hai bản đồ sao thành lời giải tương hợp…'
                : 'Weaving both charts into one compatibility reading…'}
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
