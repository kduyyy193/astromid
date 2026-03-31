import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Moon, Sun, MapPin, Calendar, Clock, ArrowRight, Loader2, Languages, Copy, Download, Check } from 'lucide-react';
import Markdown from 'react-markdown';
import BirthChart from './components/BirthChart';
import { getAstrologyInterpretation, getCompatibilityInterpretation } from './lib/gemini';
import { calculatePositionsFromBirthData, type PlanetPositions } from './lib/astrology';
import { useDocumentSeo } from './hooks/useDocumentSeo';

type Language = 'en' | 'vi';
type Mode = 'single' | 'couple';
type Step = 'input' | 'loading' | 'result';
type BirthForm = { date: string; time: string; location: string };

const TRANSLATIONS = {
  en: {
    title: 'AstroMind',
    subtitle: 'Ethereal Wisdom',
    description: 'The universe whispered your name at the moment of your first breath. Let us decode the celestial script written across the heavens for you.',
    birthTime: 'Celestial Alignment (Time)',
    birthLocation: 'Earthly Coordinates (Location)',
    birthDate: 'Moment of Arrival (Date)',
    generate: 'Invoke the Stars',
    generateCouple: 'Reveal Couple Dynamics',
    loadingTitle: 'Aligning with the Cosmos',
    loadingSub: 'The planets are shifting into place. Listening to the whispers of the void...',
    back: 'Return to the Earthly Plane',
    resultTitle: 'Your Astral Destiny',
    resultCoupleTitle: 'Your Relationship Constellation',
    footer: 'As above, so below. The stars guide those who listen.',
    locationPlaceholder: 'City, Country',
    quote: 'The zodiac is a celestial dance, not a cage. You are the dancer, and the stars are your rhythm, shaped by the winds of your world.',
    tabSingle: 'Single Reading',
    tabCouple: 'Couple Reading',
    personA: 'Male',
    personB: 'Female',
    resultIntroTemplate: 'Based on your birth data ({date}, {time}, {location}), below is a psychological astrology reading focused on your inner conflicts and core traits.',
    resultCoupleIntroTemplate:
      'Based on both birth profiles ({maleDate}, {maleTime}, {maleLocation}) and ({femaleDate}, {femaleTime}, {femaleLocation}), below is a compatibility reading with statistics.',
    copyReading: 'Copy text',
    downloadReading: 'Download',
    copied: 'Copied',
  },
  vi: {
    title: 'AstroMind',
    subtitle: 'Minh Triết Tinh Tú',
    description: 'Vũ trụ đã thì thầm tên bạn vào khoảnh khắc bạn cất tiếng khóc chào đời. Hãy để chúng tôi giải mã mật mã thiên hà được viết riêng cho linh hồn bạn.',
    birthDate: 'Ngày Khởi Đầu (Ngày sinh)',
    birthTime: 'Thời Khắc Giao Thoa (Giờ sinh)',
    birthLocation: 'Tọa Độ Nhân Gian (Nơi sinh)',
    generate: 'Thỉnh Cầu Tinh Tú',
    generateCouple: 'Xem Tương Hợp Cặp Đôi',
    loadingTitle: 'Kết Nối Với Đại Vũ Trụ',
    loadingSub: 'Các hành tinh đang xoay chuyển. Lắng nghe tiếng vọng từ hư không...',
    back: 'Trở lại cõi thực',
    resultTitle: 'Định Mệnh Tinh Trần',
    resultCoupleTitle: 'Bản Đồ Tình Duyên',
    footer: 'Trên sao, dưới vậy. Những vì sao chỉ dẫn cho kẻ biết lắng nghe.',
    locationPlaceholder: 'Thành phố, Quốc gia',
    quote: 'Cung hoàng đạo là một điệu nhảy của các vì sao, không phải là một chiếc lồng. Bạn là vũ công, và tinh tú là nhịp điệu, được uốn nắn bởi những cơn gió của cuộc đời.',
    tabSingle: 'Xem Cá Nhân',
    tabCouple: 'Xem Cặp Đôi',
    personA: 'Nam',
    personB: 'Nữ',
    resultIntroTemplate: 'Dựa trên dữ liệu ngày sinh của bạn ({date}, {time}, {location}), dưới đây là bản phân tích tâm lý học chiêm tinh tập trung vào các xung đột nội tại và các đặc điểm cốt lõi của bạn.',
    resultCoupleIntroTemplate:
      'Dựa trên dữ liệu ngày sinh của cả hai ({maleDate}, {maleTime}, {maleLocation}) và ({femaleDate}, {femaleTime}, {femaleLocation}), dưới đây là bản phân tích tương hợp kèm thống kê.',
    copyReading: 'Sao chép',
    downloadReading: 'Tải file',
    copied: 'Đã chép',
  },
};

function formatBirthDateDisplay(isoDate: string, lang: Language): string {
  if (!isoDate) return '—';
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function buildExportText(intro: string, body: string): string {
  return `${intro}\n\n${body}`.trim();
}

function BirthFields({
  t,
  data,
  onChange,
  title,
}: {
  t: (typeof TRANSLATIONS)['en'];
  data: BirthForm;
  onChange: (key: keyof BirthForm, value: string) => void;
  title?: string;
}) {
  return (
    <div className="space-y-6">
      {title && <p className="text-[10px] uppercase tracking-widest text-[#F27D26] font-bold">{title}</p>}
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
          <Calendar size={12} /> {t.birthDate}
        </label>
        <input
          required
          type="date"
          value={data.date}
          onChange={(e) => onChange('date', e.target.value)}
          className="w-full bg-transparent border-b border-white/20 py-3 focus:border-[#F27D26] outline-none transition-colors text-xl font-light"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
          <Clock size={12} /> {t.birthTime}
        </label>
        <input
          required
          type="time"
          value={data.time}
          onChange={(e) => onChange('time', e.target.value)}
          className="w-full bg-transparent border-b border-white/20 py-3 focus:border-[#F27D26] outline-none transition-colors text-xl font-light"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
          <MapPin size={12} /> {t.birthLocation}
        </label>
        <input
          required
          type="text"
          placeholder={t.locationPlaceholder}
          value={data.location}
          onChange={(e) => onChange('location', e.target.value)}
          className="w-full bg-transparent border-b border-white/20 py-3 focus:border-[#F27D26] outline-none transition-colors text-xl font-light"
        />
      </div>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState<Step>('input');
  const [mode, setMode] = useState<Mode>('single');
  const [language, setLanguage] = useState<Language>('vi');
  const [singleForm, setSingleForm] = useState<BirthForm>({ date: '', time: '', location: '' });
  const [maleForm, setMaleForm] = useState<BirthForm>({ date: '', time: '', location: '' });
  const [femaleForm, setFemaleForm] = useState<BirthForm>({ date: '', time: '', location: '' });
  const [interpretation, setInterpretation] = useState('');
  const [singleChartData, setSingleChartData] = useState<PlanetPositions>({});
  const [copyDone, setCopyDone] = useState(false);

  const t = TRANSLATIONS[language];
  useDocumentSeo(language);

  const resultIntro = useMemo(() => {
    if (mode === 'single') {
      const date = formatBirthDateDisplay(singleForm.date, language);
      const time = singleForm.time?.trim() || '—';
      const location = singleForm.location?.trim() || '—';
      return t.resultIntroTemplate.replace('{date}', date).replace('{time}', time).replace('{location}', location);
    }
    const maleDate = formatBirthDateDisplay(maleForm.date, language);
    const maleTime = maleForm.time?.trim() || '—';
    const maleLocation = maleForm.location?.trim() || '—';
    const femaleDate = formatBirthDateDisplay(femaleForm.date, language);
    const femaleTime = femaleForm.time?.trim() || '—';
    const femaleLocation = femaleForm.location?.trim() || '—';
    return t.resultCoupleIntroTemplate
      .replace('{maleDate}', maleDate)
      .replace('{maleTime}', maleTime)
      .replace('{maleLocation}', maleLocation)
      .replace('{femaleDate}', femaleDate)
      .replace('{femaleTime}', femaleTime)
      .replace('{femaleLocation}', femaleLocation);
  }, [mode, singleForm, maleForm, femaleForm, language, t]);

  const exportPlainText = useMemo(() => buildExportText(resultIntro, interpretation), [resultIntro, interpretation]);

  const setSingleField = (key: keyof BirthForm, value: string) => setSingleForm((prev) => ({ ...prev, [key]: value }));
  const setMaleField = (key: keyof BirthForm, value: string) => setMaleForm((prev) => ({ ...prev, [key]: value }));
  const setFemaleField = (key: keyof BirthForm, value: string) => setFemaleForm((prev) => ({ ...prev, [key]: value }));

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('loading');
    const positions = await calculatePositionsFromBirthData(singleForm);
    setSingleChartData(positions);
    const result = await getAstrologyInterpretation(singleForm, positions, language);
    setInterpretation(result || '');
    setStep('result');
  };

  const handleCoupleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('loading');
    const malePositions = await calculatePositionsFromBirthData(maleForm);
    const femalePositions = await calculatePositionsFromBirthData(femaleForm);
    const result = await getCompatibilityInterpretation(maleForm, malePositions, femaleForm, femalePositions, language);
    setInterpretation(result || '');
    setStep('result');
  };

  const handleCopyReading = async () => {
    try {
      await navigator.clipboard.writeText(exportPlainText);
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 2200);
    } catch {
      setCopyDone(false);
    }
  };

  const handleDownloadReading = () => {
    const blob = new Blob([exportPlainText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeDate = mode === 'single' ? singleForm.date || 'reading' : `${maleForm.date || 'a'}-${femaleForm.date || 'b'}`;
    a.href = url;
    a.download = `astromind-${safeDate}.txt`;
    a.rel = 'noopener';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#F27D26] selection:text-black overflow-x-hidden">
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

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-24">
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
              <header className="space-y-4">
                <div className="flex items-center gap-2 text-[#F27D26] uppercase tracking-[0.2em] text-xs font-semibold">
                  <Sparkles size={14} />
                  <span>{t.subtitle}</span>
                </div>
                <h1 id="astromind-hero-heading" className="text-6xl md:text-8xl font-bold tracking-tighter leading-[0.9] uppercase">
                  Astro<span className="text-[#F27D26]">Mind</span>
                </h1>
                <p className="text-white/50 text-lg max-w-md font-light leading-relaxed">{t.description}</p>
                <div className="pt-4 border-l-2 border-[#F27D26]/30 pl-6 max-w-lg">
                  <p className="text-white/40 text-sm italic font-light leading-relaxed">"{t.quote}"</p>
                </div>
              </header>

              <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setMode('single')}
                  className={`rounded-full px-5 py-2 text-xs font-bold tracking-widest uppercase transition-colors ${mode === 'single' ? 'bg-[#F27D26] text-black' : 'text-white/70 hover:text-white'}`}
                >
                  {t.tabSingle}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('couple')}
                  className={`rounded-full px-5 py-2 text-xs font-bold tracking-widest uppercase transition-colors ${mode === 'couple' ? 'bg-[#F27D26] text-black' : 'text-white/70 hover:text-white'}`}
                >
                  {t.tabCouple}
                </button>
              </div>

              {mode === 'single' ? (
                <form onSubmit={handleSingleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-md" aria-labelledby="astromind-hero-heading">
                  <div className="md:col-span-2">
                    <BirthFields t={t} data={singleForm} onChange={setSingleField} />
                  </div>
                  <button type="submit" className="md:col-span-2 cursor-pointer group flex items-center justify-between bg-[#F27D26] text-black px-8 py-6 rounded-2xl font-bold text-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                    <span>{t.generate}</span>
                    <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCoupleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-md" aria-labelledby="astromind-hero-heading">
                  <BirthFields t={t} data={maleForm} onChange={setMaleField} title={t.personA} />
                  <BirthFields t={t} data={femaleForm} onChange={setFemaleField} title={t.personB} />
                  <button type="submit" className="md:col-span-2 cursor-pointer group flex items-center justify-between bg-[#F27D26] text-black px-8 py-6 rounded-2xl font-bold text-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                    <span>{t.generateCouple}</span>
                    <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                  </button>
                </form>
              )}
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
              <div className="relative">
                <div className="absolute inset-0 bg-[#F27D26] blur-3xl opacity-20 animate-pulse" />
                <Loader2 size={64} className="text-[#F27D26] animate-spin relative z-10" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-light tracking-widest uppercase italic">{t.loadingTitle}</h2>
                <p className="text-white/40 text-sm animate-pulse">{t.loadingSub}</p>
              </div>
            </motion.div>
          )}

          {step === 'result' && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-16">
              <div className="flex flex-col md:flex-row gap-12 items-center">
                <div className="flex-1 space-y-6">
                  <button onClick={() => setStep('input')} className="text-[10px] uppercase tracking-widest text-[#F27D26] font-bold hover:opacity-80 transition-opacity">
                    ← {t.back}
                  </button>
                  <h2 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase leading-none">
                    {(mode === 'single' ? t.resultTitle : t.resultCoupleTitle).split(' ')[0]}{' '}
                    <span className="text-[#F27D26]">{(mode === 'single' ? t.resultTitle : t.resultCoupleTitle).split(' ').slice(1).join(' ')}</span>
                  </h2>
                  {mode === 'single' ? (
                    <div className="flex gap-4">
                      <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-xs font-medium text-white/60">{singleForm.date}</div>
                      <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-xs font-medium text-white/60">{singleForm.location}</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-xs font-medium text-white/60">{t.personA}: {maleForm.date} • {maleForm.location}</div>
                      <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-xs font-medium text-white/60">{t.personB}: {femaleForm.date} • {femaleForm.location}</div>
                    </div>
                  )}
                </div>
                {mode === 'single' && (
                  <div className="flex-shrink-0">
                    <BirthChart planetPositions={singleChartData} />
                  </div>
                )}
              </div>

              {mode === 'single' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['Sun', 'Moon', 'Mercury'].map((planet) => (
                    <div key={planet} className="bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{planet}</span>
                        <span className="text-[#F27D26] text-xl">{planet === 'Sun' ? <Sun size={20} /> : planet === 'Moon' ? <Moon size={20} /> : <Sparkles size={20} />}</span>
                      </div>
                      <div className="text-3xl font-bold tracking-tight">{Math.floor(singleChartData[planet] ?? 0)}°</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-white/5 border border-white/10 p-8 md:p-12 rounded-[2rem] backdrop-blur-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <p className="text-[10px] uppercase tracking-widest text-white/35 font-bold">{language === 'vi' ? 'Kết quả' : 'Reading'}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCopyReading}
                      className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 transition-colors min-h-[44px]"
                    >
                      {copyDone ? <Check size={16} className="text-[#F27D26]" /> : <Copy size={16} />}
                      {copyDone ? t.copied : t.copyReading}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadReading}
                      className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 transition-colors min-h-[44px]"
                    >
                      <Download size={16} />
                      {t.downloadReading}
                    </button>
                  </div>
                </div>

                <p className="text-white/70 text-base md:text-lg leading-relaxed font-light border-l-2 border-[#F27D26]/40 pl-4 md:pl-5">{resultIntro}</p>

                <div className="prose prose-invert prose-orange max-w-none pt-2 border-t border-white/10">
                  <div className="markdown-body">
                    <Markdown>{interpretation}</Markdown>
                  </div>
                </div>
              </div>

              <footer className="pt-12 border-t border-white/10 text-center">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-bold">{t.footer}</p>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
