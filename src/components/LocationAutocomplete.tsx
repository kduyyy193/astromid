import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { geocodeSearch, type GeocodeCandidate } from '../lib/astrology';

export type LocationAutocompletePatch = {
  location: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
};

function formatCandidateLabel(c: GeocodeCandidate) {
  const raw = [c.name, c.admin1, c.country].filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  const parts: string[] = [];
  for (const p of raw) {
    const t = p.trim();
    const last = parts[parts.length - 1];
    if (!last || last.toLowerCase() !== t.toLowerCase()) parts.push(t);
  }
  return parts.join(", ");
}

function formatCandidateSubtitle(c: GeocodeCandidate) {
  const nameLower = c.name.trim().toLowerCase();
  const raw = [c.admin1, c.country].filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  const parts: string[] = [];
  for (const p of raw) {
    const t = p.trim();
    if (t.toLowerCase() === nameLower) continue;
    const last = parts[parts.length - 1];
    if (!last || last.toLowerCase() !== t.toLowerCase()) parts.push(t);
  }
  return parts.join(" · ");
}

type Props = {
  value: string;
  placeholder: string;
  onChange: (patch: LocationAutocompletePatch) => void;
  'aria-label'?: string;
};

export default function LocationAutocomplete({ value, placeholder, onChange, 'aria-label': ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    const q = value.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setCandidates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await geocodeSearch(q);
          if (!res.ok) setCandidates([]);
          else setCandidates(res.candidates);
        } finally {
          setLoading(false);
        }
      })();
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    onChange({ location: text, latitude: undefined, longitude: undefined, timezone: undefined });
    setOpen(true);
  };

  const pick = (c: GeocodeCandidate) => {
    onChange({
      location: formatCandidateLabel(c),
      latitude: c.latitude,
      longitude: c.longitude,
      timezone: c.timezone,
    });
    setOpen(false);
    setCandidates([]);
  };

  return (
    <div className="relative" ref={rootRef}>
      <input
        required
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={handleInput}
        onFocus={() => {
          if (value.trim().length >= 2) setOpen(true);
        }}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-autocomplete="list"
        role="combobox"
        className="w-full bg-transparent border-b border-white/20 py-3 pr-9 focus:border-[#F27D26] outline-none transition-colors text-xl font-light"
      />
      {loading && (
        <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-white/40">
          <Loader2 size={18} className="animate-spin" aria-hidden />
        </span>
      )}
      {open && candidates.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-[100] mt-0.5 max-h-60 overflow-y-auto rounded-xl border border-white/15 bg-[#0a0a0a]/95 py-1 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.85)] backdrop-blur-md"
        >
          {candidates.map((c, i) => (
            <li key={`${c.name}-${c.latitude}-${c.longitude}-${i}`} role="option">
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm font-light text-white/90 hover:bg-white/10 transition-colors"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(c)}
              >
                <span className="block">{c.name}</span>
                <span className="block text-[11px] text-white/45 mt-0.5">
                  {formatCandidateSubtitle(c)}
                  {c.latitude != null && c.longitude != null ? (
                    <span className="ml-1 font-mono text-white/35">
                      ({c.latitude.toFixed(4)}, {c.longitude.toFixed(4)})
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
