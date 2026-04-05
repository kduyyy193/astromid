import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Moon, Sun, MapPin, Calendar, Clock, ArrowRight, Loader2, Languages, Copy, Download, Check } from 'lucide-react';
import Markdown from 'react-markdown';
import BirthChart from '../components/BirthChart';
import LocationAutocomplete, { type LocationAutocompletePatch } from '../components/LocationAutocomplete';
import {
  generatePaidAstrologyReading,
  getChartPlacementRows,
  getCompatibilityInterpretationResult,
  getCoupleQuickCompareRows,
} from '../lib/gemini';
import { calculatePositionsFromBirthData, type BirthForm, type PlanetPositions } from '../lib/astrology';
import { getCodeInfo, postCheckout, postCodeUse, postVerifyCode, type CheckoutPayload } from '../lib/paymentApi';
import { useDocumentSeo } from '../hooks/useDocumentSeo';

type Language = 'en' | 'vi';
type Mode = 'single' | 'couple';
type Step = 'input' | 'loading' | 'result';
type PayGate = 'none' | 'checking' | 'valid' | 'invalid';

const TRANSLATIONS = {
  en: {
    title: 'AstroMind',
    subtitle: 'Ethereal Wisdom',
    description: 'The universe whispered your name at the moment of your first breath. Let us decode the celestial script written across the heavens for you.',
    birthTime: 'Birth time',
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
    locationPlaceholder: 'Enter location to search',
    quote: 'The zodiac is a celestial dance, not a cage. You are the dancer, and the stars are your rhythm, shaped by the winds of your world.',
    tabSingle: 'Single Reading',
    tabCouple: 'Couple Reading',
    personA: 'Person A',
    personB: 'Person B',
    displayNameOptional: 'Display name (optional)',
    quickCompareTitle: 'Quick compare · Sun · Moon · Venus · Mars',
    resultIntroTemplate: 'Based on your birth data ({date}, {time}, {location}), below is a psychological astrology reading focused on your inner conflicts and core traits.',
    resultCoupleIntroTemplate:
      'Based on both birth profiles ({maleDate}, {maleTime}, {maleLocation}) and ({femaleDate}, {femaleTime}, {femaleLocation}), below is a compatibility reading with statistics.',
    copyReading: 'Copy text',
    downloadReading: 'Download',
    copied: 'Copied',
    generatingReading: 'Weaving starlight into your reading…',
  },
  vi: {
    title: 'AstroMind',
    subtitle: 'Minh Triết Tinh Tú',
    description: 'Vũ trụ đã thì thầm tên bạn vào khoảnh khắc bạn cất tiếng khóc chào đời. Hãy để chúng tôi giải mã mật mã thiên hà được viết riêng cho linh hồn bạn.',
    birthDate: 'Ngày Khởi Đầu (Ngày sinh)',
    birthTime: 'Giờ sinh',
    birthLocation: 'Tọa Độ Nhân Gian (Nơi sinh)',
    generate: 'Thỉnh Cầu Tinh Tú',
    generateCouple: 'Xem Tương Hợp Cặp Đôi',
    loadingTitle: 'Kết Nối Với Đại Vũ Trụ',
    loadingSub: 'Các hành tinh đang xoay chuyển. Lắng nghe tiếng vọng từ hư không...',
    back: 'Trở lại',
    resultTitle: 'Định Mệnh Tinh Trần',
    resultCoupleTitle: 'Bản Đồ Tình Duyên',
    footer: 'Trên sao, dưới vậy. Những vì sao chỉ dẫn cho kẻ biết lắng nghe.',
    locationPlaceholder: 'Nhập vị trí để tìm kiếm',
    quote: 'Cung hoàng đạo là một điệu nhảy của các vì sao, không phải là một chiếc lồng. Bạn là vũ công, và tinh tú là nhịp điệu, được uốn nắn bởi những cơn gió của cuộc đời.',
    tabSingle: 'Xem Cá Nhân',
    tabCouple: 'Xem Cặp Đôi',
    personA: 'Người A',
    personB: 'Người B',
    displayNameOptional: 'Tên gọi (tuỳ chọn)',
    quickCompareTitle: 'So sánh nhanh · Sun · Moon · Venus · Mars',
    resultIntroTemplate: 'Dựa trên dữ liệu ngày sinh của bạn ({date}, {time}, {location}), dưới đây là bản phân tích tâm lý học chiêm tinh tập trung vào các xung đột nội tại và các đặc điểm cốt lõi của bạn.',
    resultCoupleIntroTemplate:
      'Dựa trên dữ liệu ngày sinh của cả hai ({maleDate}, {maleTime}, {maleLocation}) và ({femaleDate}, {femaleTime}, {femaleLocation}), dưới đây là bản phân tích tương hợp kèm thống kê.',
    copyReading: 'Sao chép',
    downloadReading: 'Tải file',
    copied: 'Đã chép',
    generatingReading: 'Đang dệt ánh sao thành lời giải cho bạn…',
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

function formatPlacementExportText(
  rows: ReturnType<typeof getChartPlacementRows> | null,
  lang: Language,
): string {
  if (!rows || rows.length === 0) return '';
  const title = lang === 'vi' ? 'Cung (tropical) — tham chiếu' : 'Tropical placements — reference';
  const lines = rows.map((row) =>
    lang === 'vi'
      ? `${row.labelVi}\t${row.signEn ?? '—'}\t${row.signVi ?? '—'}`
      : `${row.labelEn}\t${row.signEn ?? '—'}`,
  );
  return `${title}\n${lines.join('\n')}`;
}

function formatQuickCompareExport(
  rows: ReturnType<typeof getCoupleQuickCompareRows> | null,
  lang: Language,
  labelA: string,
  labelB: string,
): string {
  if (!rows?.length) return '';
  const title = lang === 'vi' ? 'So sánh nhanh (Sun · Moon · Venus · Mars)' : 'Quick compare (Sun · Moon · Venus · Mars)';
  const lines = rows.map((r) =>
    lang === 'vi'
      ? `${r.label}\t${labelA}: ${r.signA ?? '—'} (${r.signAvi ?? '—'})\t${labelB}: ${r.signB ?? '—'} (${r.signBvi ?? '—'})`
      : `${r.label}\t${labelA}: ${r.signA ?? '—'}\t${labelB}: ${r.signB ?? '—'}`,
  );
  return `${title}\n${lines.join('\n')}`;
}

function BirthFields({
  t,
  data,
  onDateTimeChange,
  onLocationPatch,
  title,
}: {
  t: (typeof TRANSLATIONS)['en'];
  data: BirthForm;
  onDateTimeChange: (key: 'date' | 'time', value: string) => void;
  onLocationPatch: (patch: LocationAutocompletePatch) => void;
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
          onChange={(e) => onDateTimeChange('date', e.target.value)}
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
          onChange={(e) => onDateTimeChange('time', e.target.value)}
          className="w-full bg-transparent border-b border-white/20 py-3 focus:border-[#F27D26] outline-none transition-colors text-xl font-light"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
          <MapPin size={12} /> {t.birthLocation}
        </label>
        <LocationAutocomplete
          value={data.location}
          placeholder={t.locationPlaceholder}
          onChange={onLocationPatch}
          aria-label={t.birthLocation}
        />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentCode = searchParams.get('accessCode');

  const [payGate, setPayGate] = useState<PayGate>(() => (paymentCode ? 'checking' : 'none'));
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paidPayload, setPaidPayload] = useState<CheckoutPayload | null>(null);

  const [step, setStep] = useState<Step>(() => (paymentCode ? 'loading' : 'input'));
  const [mode, setMode] = useState<Mode>('single');
  const [language, setLanguage] = useState<Language>('vi');
  const [singleForm, setSingleForm] = useState<BirthForm>({ date: '', time: '', location: '' });
  const [maleForm, setMaleForm] = useState<BirthForm>({ date: '', time: '', location: '' });
  const [femaleForm, setFemaleForm] = useState<BirthForm>({ date: '', time: '', location: '' });
  const [coupleNameA, setCoupleNameA] = useState('');
  const [coupleNameB, setCoupleNameB] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [singleChartData, setSingleChartData] = useState<PlanetPositions>({});
  const [maleChartData, setMaleChartData] = useState<PlanetPositions>({});
  const [femaleChartData, setFemaleChartData] = useState<PlanetPositions>({});
  const [copyDone, setCopyDone] = useState(false);
  const [accessBlockingMessage, setAccessBlockingMessage] = useState<string | null>(null);
  const [readingPending, setReadingPending] = useState(false);

  const t = TRANSLATIONS[language];
  useDocumentSeo(language);

  const paymentRunSeq = useRef(0);

  useEffect(() => {
    if (!paymentCode) {
      paymentRunSeq.current += 1;
      setPayGate('none');
      setPaidPayload(null);
      setAccessBlockingMessage(null);
      setStep('input');
      setReadingPending(false);
      setSingleChartData({});
      setMaleChartData({});
      setFemaleChartData({});
      return;
    }
    const mySeq = ++paymentRunSeq.current;
    setPayGate('checking');
    setAccessBlockingMessage(null);
    setStep('loading');
    (async () => {
      try {
        const verified = await postVerifyCode(paymentCode);
        if (mySeq !== paymentRunSeq.current) return;
        if (!verified.valid) {
          setPayGate('invalid');
          setPaidPayload(null);
          setAccessBlockingMessage(verified.message);
          setStep('input');
          toast.error(verified.message);
          return;
        }
        const res = await getCodeInfo(paymentCode);
        if (mySeq !== paymentRunSeq.current) return;
        if (!res.payload) {
          setPayGate('invalid');
          setPaidPayload(null);
          setStep('input');
          toast.error('Không lấy được thông tin mã.');
          return;
        }
        const p = res.payload;
        setPaidPayload(p);
        if (p.language === 'vi' || p.language === 'en') setLanguage(p.language);
        if (p.mode === 'single' || p.mode === 'couple') setMode(p.mode);
        setPayGate('valid');
        const paidName = p.language === 'vi' ? 'Quý khách' : 'Guest';
        if (p.mode === 'single' && p.single) {
          const positions = await calculatePositionsFromBirthData(p.single);
          if (mySeq !== paymentRunSeq.current) return;
          setInterpretation('');
          setSingleChartData(positions);
          setMaleChartData({});
          setFemaleChartData({});
          setStep('result');
          setReadingPending(true);
          const reading = await generatePaidAstrologyReading(
            {
              name: paidName,
              date: p.single.date,
              time: p.single.time,
              location: p.single.location,
              latitude: p.single.latitude,
              longitude: p.single.longitude,
              timezone: p.single.timezone,
            },
            p.language,
          );
          if (mySeq !== paymentRunSeq.current) return;
          setInterpretation(reading.text);
          setReadingPending(false);
          if (reading.ok) {
            try {
              await postCodeUse(paymentCode);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Không cập nhật trạng thái mã.');
            }
          }
        } else if (p.mode === 'couple' && p.couple?.personA && p.couple?.personB) {
          const personA = p.couple.personA;
          const personB = p.couple.personB;
          const malePositions = await calculatePositionsFromBirthData(personA);
          const femalePositions = await calculatePositionsFromBirthData(personB);
          if (mySeq !== paymentRunSeq.current) return;
          setInterpretation('');
          setSingleChartData({});
          setMaleChartData(malePositions);
          setFemaleChartData(femalePositions);
          setStep('result');
          setReadingPending(true);
          const reading = await getCompatibilityInterpretationResult(
            personA,
            malePositions,
            personB,
            femalePositions,
            p.language,
          );
          if (mySeq !== paymentRunSeq.current) return;
          setInterpretation(reading.text);
          setReadingPending(false);
          if (reading.ok) {
            try {
              await postCodeUse(paymentCode);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Không cập nhật trạng thái mã.');
            }
          }
        } else {
          setPayGate('invalid');
          setPaidPayload(null);
          setStep('input');
          toast.error('Không lấy được thông tin mã.');
          return;
        }
      } catch (e) {
        if (mySeq !== paymentRunSeq.current) return;
        setReadingPending(false);
        setPayGate('invalid');
        setPaidPayload(null);
        setStep('input');
        toast.error(e instanceof Error ? e.message : 'Không lấy được thông tin mã.');
      }
    })();
    return () => {
      paymentRunSeq.current += 1;
    };
  }, [paymentCode]);

  const submitBlocked = useMemo(() => payGate === 'checking', [payGate]);

  const displaySingle = paidPayload?.mode === 'single' && paidPayload.single ? paidPayload.single : singleForm;
  const displayMale = paidPayload?.mode === 'couple' && paidPayload.couple?.personA ? paidPayload.couple.personA : maleForm;
  const displayFemale = paidPayload?.mode === 'couple' && paidPayload.couple?.personB ? paidPayload.couple.personB : femaleForm;
  const resultLang = paidPayload?.language ?? language;
  const tResult = TRANSLATIONS[resultLang];
  const resultMode = paidPayload?.mode ?? mode;

  const resultIntro = useMemo(() => {
    if (resultMode === 'single') {
      const date = formatBirthDateDisplay(displaySingle.date, resultLang);
      const time = displaySingle.time?.trim() || '—';
      const location = displaySingle.location?.trim() || '—';
      return tResult.resultIntroTemplate.replace('{date}', date).replace('{time}', time).replace('{location}', location);
    }
    const maleDate = formatBirthDateDisplay(displayMale.date, resultLang);
    const maleTime = displayMale.time?.trim() || '—';
    const maleLocation = displayMale.location?.trim() || '—';
    const femaleDate = formatBirthDateDisplay(displayFemale.date, resultLang);
    const femaleTime = displayFemale.time?.trim() || '—';
    const femaleLocation = displayFemale.location?.trim() || '—';
    return tResult.resultCoupleIntroTemplate
      .replace('{maleDate}', maleDate)
      .replace('{maleTime}', maleTime)
      .replace('{maleLocation}', maleLocation)
      .replace('{femaleDate}', femaleDate)
      .replace('{femaleTime}', femaleTime)
      .replace('{femaleLocation}', femaleLocation);
  }, [resultMode, displaySingle, displayMale, displayFemale, resultLang, tResult]);

  const singlePlacementRows = useMemo(() => {
    if (resultMode !== 'single') return null;
    if (!singleChartData || Object.keys(singleChartData).length === 0) return null;
    return getChartPlacementRows(singleChartData);
  }, [resultMode, singleChartData]);

  const malePlacementRows = useMemo(() => {
    if (resultMode !== 'couple') return null;
    if (!maleChartData || Object.keys(maleChartData).length === 0) return null;
    return getChartPlacementRows(maleChartData);
  }, [resultMode, maleChartData]);

  const femalePlacementRows = useMemo(() => {
    if (resultMode !== 'couple') return null;
    if (!femaleChartData || Object.keys(femaleChartData).length === 0) return null;
    return getChartPlacementRows(femaleChartData);
  }, [resultMode, femaleChartData]);

  const personALabel = useMemo(() => {
    if (resultMode !== 'couple') return '';
    const n = paidPayload?.couple?.personA?.displayName?.trim();
    return n || tResult.personA;
  }, [resultMode, paidPayload, tResult.personA]);

  const personBLabel = useMemo(() => {
    if (resultMode !== 'couple') return '';
    const n = paidPayload?.couple?.personB?.displayName?.trim();
    return n || tResult.personB;
  }, [resultMode, paidPayload, tResult.personB]);

  const coupleCompareRows = useMemo(() => {
    if (resultMode !== 'couple') return null;
    if (!maleChartData || Object.keys(maleChartData).length === 0) return null;
    if (!femaleChartData || Object.keys(femaleChartData).length === 0) return null;
    return getCoupleQuickCompareRows(maleChartData, femaleChartData, resultLang);
  }, [resultMode, maleChartData, femaleChartData, resultLang]);

  const exportPlainText = useMemo(() => {
    if (resultMode === 'single') {
      const table = formatPlacementExportText(singlePlacementRows, resultLang);
      if (table) return `${table}\n\n${interpretation}`.trim();
      return interpretation;
    }
    if (resultMode === 'couple') {
      const chunks: string[] = [];
      const qc = formatQuickCompareExport(coupleCompareRows, resultLang, personALabel, personBLabel);
      if (qc) chunks.push(qc);
      const tm = formatPlacementExportText(malePlacementRows, resultLang);
      const tf = formatPlacementExportText(femalePlacementRows, resultLang);
      if (tm) {
        chunks.push(`${personALabel} — ${resultLang === 'vi' ? 'Cung (tropical)' : 'Tropical'}`);
        chunks.push(tm);
      }
      if (tf) {
        chunks.push(`${personBLabel} — ${resultLang === 'vi' ? 'Cung (tropical)' : 'Tropical'}`);
        chunks.push(tf);
      }
      if (chunks.length > 0) return `${chunks.join('\n\n')}\n\n${interpretation}`.trim();
      return interpretation;
    }
    return buildExportText(resultIntro, interpretation);
  }, [
    resultMode,
    singlePlacementRows,
    malePlacementRows,
    femalePlacementRows,
    resultLang,
    interpretation,
    resultIntro,
    coupleCompareRows,
    personALabel,
    personBLabel,
  ]);

  const setSingleDateTime = (key: 'date' | 'time', value: string) => setSingleForm((prev) => ({ ...prev, [key]: value }));
  const setSingleLocation = (patch: LocationAutocompletePatch) => setSingleForm((prev) => ({ ...prev, ...patch }));
  const setMaleDateTime = (key: 'date' | 'time', value: string) => setMaleForm((prev) => ({ ...prev, [key]: value }));
  const setMaleLocation = (patch: LocationAutocompletePatch) => setMaleForm((prev) => ({ ...prev, ...patch }));
  const setFemaleDateTime = (key: 'date' | 'time', value: string) => setFemaleForm((prev) => ({ ...prev, [key]: value }));
  const setFemaleLocation = (patch: LocationAutocompletePatch) => setFemaleForm((prev) => ({ ...prev, ...patch }));

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitBlocked || checkoutLoading) return;
    if (paymentCode && payGate !== 'invalid') return;
    setCheckoutLoading(true);
    try {
      const res = await postCheckout({
        type: 'single',
        mode: 'single',
        language,
        single: singleForm,
      });
      window.location.href = res.checkoutUrl;
    } catch (err) {
      setCheckoutLoading(false);
      toast.error(err instanceof Error ? err.message : 'Không tạo được thanh toán.');
    }
  };

  const handleCoupleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitBlocked || checkoutLoading) return;
    if (paymentCode && payGate !== 'invalid') return;
    setCheckoutLoading(true);
    try {
      const res = await postCheckout({
        type: 'double',
        mode: 'couple',
        language,
        couple: {
          personA: { ...maleForm, displayName: coupleNameA.trim() || undefined },
          personB: { ...femaleForm, displayName: coupleNameB.trim() || undefined },
        },
      });
      window.location.href = res.checkoutUrl;
    } catch (err) {
      setCheckoutLoading(false);
      toast.error(err instanceof Error ? err.message : 'Không tạo được thanh toán.');
    }
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
    const safeDate =
      resultMode === 'single' ? displaySingle.date || 'reading' : `${displayMale.date || 'a'}-${displayFemale.date || 'b'}`;
    a.href = url;
    a.download = `astromind-${safeDate}.txt`;
    a.rel = 'noopener';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackFromResult = () => {
    if (paymentCode || paidPayload) {
      navigate('/', { replace: true });
      return;
    }
    setReadingPending(false);
    setStep('input');
  };

  const showPriceBadge = !paymentCode || payGate === 'invalid';

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
          {step === 'input' && (!paymentCode || payGate === 'invalid') && (
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
                    <BirthFields
                    t={t}
                    data={singleForm}
                    onDateTimeChange={setSingleDateTime}
                    onLocationPatch={setSingleLocation}
                  />
                  </div>
                  <button
                    type="submit"
                    disabled={submitBlocked || checkoutLoading}
                    className="cursor-pointer md:col-span-2 group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#F27D26] via-[#ea7326] to-[#c45a1c] px-4 py-3 text-left text-black shadow-[0_6px_24px_-10px_rgba(242,125,38,0.55)] transition-all hover:shadow-[0_8px_28px_-10px_rgba(242,125,38,0.55)] hover:brightness-[1.02] active:scale-[0.995] disabled:pointer-events-none disabled:opacity-40"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                      <span className="text-sm font-bold leading-tight tracking-tight md:text-base">{t.generate}</span>
                      {showPriceBadge && (
                        <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-black/10 bg-black/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider tabular-nums backdrop-blur-sm md:text-xs">
                          19.000&nbsp;₫
                        </span>
                      )}
                    </span>
                    <span className="flex flex-shrink-0 items-center justify-center rounded-full bg-black/15 p-1.5 ring-1 ring-black/10 backdrop-blur-sm transition-transform group-hover:translate-x-0.5">
                      {checkoutLoading ? (
                        <Loader2 className="animate-spin" size={18} strokeWidth={2.5} />
                      ) : (
                        <ArrowRight size={18} strokeWidth={2.5} />
                      )}
                    </span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCoupleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-md" aria-labelledby="astromind-hero-heading">
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold block">
                        {t.personA} — {t.displayNameOptional}
                      </label>
                      <input
                        type="text"
                        value={coupleNameA}
                        onChange={(e) => setCoupleNameA(e.target.value)}
                        className="w-full bg-transparent border-b border-white/20 py-3 focus:border-[#F27D26] outline-none transition-colors text-lg font-light"
                        autoComplete="nickname"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold block">
                        {t.personB} — {t.displayNameOptional}
                      </label>
                      <input
                        type="text"
                        value={coupleNameB}
                        onChange={(e) => setCoupleNameB(e.target.value)}
                        className="w-full bg-transparent border-b border-white/20 py-3 focus:border-[#F27D26] outline-none transition-colors text-lg font-light"
                        autoComplete="nickname"
                      />
                    </div>
                  </div>
                  <BirthFields
                    t={t}
                    data={maleForm}
                    onDateTimeChange={setMaleDateTime}
                    onLocationPatch={setMaleLocation}
                    title={t.personA}
                  />
                  <BirthFields
                    t={t}
                    data={femaleForm}
                    onDateTimeChange={setFemaleDateTime}
                    onLocationPatch={setFemaleLocation}
                    title={t.personB}
                  />
                  <button
                    type="submit"
                    disabled={submitBlocked || checkoutLoading}
                    className="cursor-pointer md:col-span-2 group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#F27D26] via-[#ea7326] to-[#c45a1c] px-4 py-3 text-left text-black shadow-[0_6px_24px_-10px_rgba(242,125,38,0.55)] transition-all hover:shadow-[0_8px_28px_-10px_rgba(242,125,38,0.55)] hover:brightness-[1.02] active:scale-[0.995] disabled:pointer-events-none disabled:opacity-40"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                      <span className="text-sm font-bold leading-tight tracking-tight md:text-base">{t.generateCouple}</span>
                      {showPriceBadge && (
                        <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-black/10 bg-black/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider tabular-nums backdrop-blur-sm md:text-xs">
                          35.000&nbsp;₫
                        </span>
                      )}
                    </span>
                    <span className="flex flex-shrink-0 items-center justify-center rounded-full bg-black/15 p-1.5 ring-1 ring-black/10 backdrop-blur-sm transition-transform group-hover:translate-x-0.5">
                      {checkoutLoading ? (
                        <Loader2 className="animate-spin" size={18} strokeWidth={2.5} />
                      ) : (
                        <ArrowRight size={18} strokeWidth={2.5} />
                      )}
                    </span>
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
                  <button type="button" onClick={handleBackFromResult} className="text-[10px] uppercase tracking-widest text-[#F27D26] font-bold hover:opacity-80 transition-opacity">
                    ← {tResult.back}
                  </button>
                  <h2 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase leading-none">
                    {(resultMode === 'single' ? tResult.resultTitle : tResult.resultCoupleTitle).split(' ')[0]}{' '}
                    <span className="text-[#F27D26]">
                      {(resultMode === 'single' ? tResult.resultTitle : tResult.resultCoupleTitle).split(' ').slice(1).join(' ')}
                    </span>
                  </h2>
                  {resultMode === 'single' ? (
                    <div className="flex gap-4">
                      <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-xs font-medium text-white/60">{displaySingle.date}</div>
                      <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-xs font-medium text-white/60">{displaySingle.location}</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-xs font-medium text-white/60">
                        {personALabel}: {displayMale.date} • {displayMale.location}
                      </div>
                      <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl text-xs font-medium text-white/60">
                        {personBLabel}: {displayFemale.date} • {displayFemale.location}
                      </div>
                    </div>
                  )}
                </div>
                {resultMode === 'single' && (
                  <div className="flex-shrink-0">
                    <BirthChart planetPositions={singleChartData} />
                  </div>
                )}
              </div>

              {resultMode === 'couple' && Object.keys(maleChartData).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-[10px] uppercase tracking-widest text-[#F27D26] font-bold">{personALabel}</p>
                    <BirthChart size="compact" planetPositions={maleChartData} />
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-[10px] uppercase tracking-widest text-[#F27D26] font-bold">{personBLabel}</p>
                    <BirthChart size="compact" planetPositions={femaleChartData} />
                  </div>
                </div>
              )}

              {resultMode === 'couple' && coupleCompareRows && (
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-[10px] uppercase tracking-widest text-[#F27D26] font-bold mb-4">{tResult.quickCompareTitle}</p>
                  <table className="w-full text-left text-sm border-collapse min-w-[320px]">
                    <thead>
                      <tr className="text-white/40 text-[10px] uppercase tracking-widest border-b border-white/10">
                        <th className="py-2 pr-3 font-bold">{resultLang === 'vi' ? 'Điểm' : 'Point'}</th>
                        <th className="py-2 pr-3 font-bold">{personALabel}</th>
                        <th className="py-2 font-bold">{personBLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupleCompareRows.map((r) => (
                        <tr key={r.key} className="border-b border-white/5 last:border-0">
                          <td className="py-2.5 pr-3 text-white/85 font-light">{r.label}</td>
                          <td className="py-2.5 pr-3 text-white/90">
                            {resultLang === 'vi'
                              ? r.signA
                                ? `${r.signA} (${r.signAvi ?? ''})`
                                : '—'
                              : r.signA ?? '—'}
                          </td>
                          <td className="py-2.5 text-white/90">
                            {resultLang === 'vi'
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

              {resultMode === 'single' && (
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

              {resultMode === 'single' && singlePlacementRows && (
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-[10px] uppercase tracking-widest text-[#F27D26] font-bold mb-4">
                    {resultLang === 'vi' ? 'Cung (tropical) — tham chiếu' : 'Tropical placements — reference'}
                  </p>
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="text-white/40 text-[10px] uppercase tracking-widest border-b border-white/10">
                        <th className="py-2 pr-4 font-bold">{resultLang === 'vi' ? 'Điểm' : 'Point'}</th>
                        <th className="py-2 pr-4 font-bold">{resultLang === 'vi' ? 'Cung (Latin)' : 'Sign'}</th>
                        {resultLang === 'vi' && <th className="py-2 font-bold">Cung (VN)</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {singlePlacementRows.map((row) => (
                        <tr key={row.key} className="border-b border-white/5 last:border-0">
                          <td className="py-2.5 pr-4 text-white/85 font-light">
                            {resultLang === 'vi' ? row.labelVi : row.labelEn}
                          </td>
                          <td className="py-2.5 pr-4 text-white/90">{row.signEn ?? '—'}</td>
                          {resultLang === 'vi' && <td className="py-2.5 text-white/80">{row.signVi ?? '—'}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {resultMode === 'couple' && (malePlacementRows || femalePlacementRows) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  {malePlacementRows && (
                    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                      <p className="text-[10px] uppercase tracking-widest text-[#F27D26] font-bold mb-4">
                        {resultLang === 'vi' ? `${personALabel} · Cung (tropical)` : `${personALabel} · Tropical`}
                      </p>
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="text-white/40 text-[10px] uppercase tracking-widest border-b border-white/10">
                            <th className="py-2 pr-4 font-bold">{resultLang === 'vi' ? 'Điểm' : 'Point'}</th>
                            <th className="py-2 pr-4 font-bold">{resultLang === 'vi' ? 'Cung (Latin)' : 'Sign'}</th>
                            {resultLang === 'vi' && <th className="py-2 font-bold">Cung (VN)</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {malePlacementRows.map((row) => (
                            <tr key={row.key} className="border-b border-white/5 last:border-0">
                              <td className="py-2.5 pr-4 text-white/85 font-light">
                                {resultLang === 'vi' ? row.labelVi : row.labelEn}
                              </td>
                              <td className="py-2.5 pr-4 text-white/90">{row.signEn ?? '—'}</td>
                              {resultLang === 'vi' && <td className="py-2.5 text-white/80">{row.signVi ?? '—'}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {femalePlacementRows && (
                    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                      <p className="text-[10px] uppercase tracking-widest text-[#F27D26] font-bold mb-4">
                        {resultLang === 'vi' ? `${personBLabel} · Cung (tropical)` : `${personBLabel} · Tropical`}
                      </p>
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="text-white/40 text-[10px] uppercase tracking-widest border-b border-white/10">
                            <th className="py-2 pr-4 font-bold">{resultLang === 'vi' ? 'Điểm' : 'Point'}</th>
                            <th className="py-2 pr-4 font-bold">{resultLang === 'vi' ? 'Cung (Latin)' : 'Sign'}</th>
                            {resultLang === 'vi' && <th className="py-2 font-bold">Cung (VN)</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {femalePlacementRows.map((row) => (
                            <tr key={row.key} className="border-b border-white/5 last:border-0">
                              <td className="py-2.5 pr-4 text-white/85 font-light">
                                {resultLang === 'vi' ? row.labelVi : row.labelEn}
                              </td>
                              <td className="py-2.5 pr-4 text-white/90">{row.signEn ?? '—'}</td>
                              {resultLang === 'vi' && <td className="py-2.5 text-white/80">{row.signVi ?? '—'}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {readingPending && (
                <div
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-[#F27D26]/25 bg-[#F27D26]/10 px-5 py-4 mb-8"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="h-5 w-5 shrink-0 text-[#F27D26] animate-spin" aria-hidden />
                  <p className="text-sm text-white/85 font-light">{tResult.generatingReading}</p>
                </div>
              )}

              <div className="bg-white/5 border border-white/10 p-8 md:p-10 rounded-[2rem] backdrop-blur-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <p className="text-[10px] uppercase tracking-widest text-white/35 font-bold">{resultLang === 'vi' ? 'Lời giải' : 'The reading'}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleCopyReading}
                      disabled={readingPending}
                      className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 transition-colors min-h-[44px] disabled:pointer-events-none disabled:opacity-40"
                    >
                      {copyDone ? <Check size={16} className="text-[#F27D26]" /> : <Copy size={16} />}
                      {copyDone ? tResult.copied : tResult.copyReading}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadReading}
                      disabled={readingPending}
                      className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 transition-colors min-h-[44px] disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Download size={16} />
                      {tResult.downloadReading}
                    </button>
                  </div>
                </div>

                <div className="prose prose-invert prose-orange max-w-none border-t border-white/10 pt-6">
                  <div className="markdown-body">
                    <Markdown>{interpretation}</Markdown>
                  </div>
                </div>
              </div>

              <footer className="pt-12 border-t border-white/10 text-center">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/20 font-bold">{tResult.footer}</p>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
