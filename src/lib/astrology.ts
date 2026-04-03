import {
  Body,
  Ecliptic,
  GeoVector,
  HorizonFromVector,
  MakeTime,
  Observer,
  RotateVector,
  Rotation_ECT_EQJ,
  Rotation_EQJ_HOR,
  SunPosition,
  Vector,
} from "astronomy-engine";

export type BirthForm = {
  date: string;
  time: string;
  location: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
};

export type PlanetPositions = Record<string, number>;

const TROPICAL_SIGNS_EN = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

function normalizeDegrees(value: number) {
  const v = value % 360;
  return v < 0 ? v + 360 : v;
}

export function tropicalSignFromLongitude(deg: number) {
  const idx = Math.floor(normalizeDegrees(deg) / 30) % 12;
  return TROPICAL_SIGNS_EN[idx];
}

export const TROPICAL_SIGN_LABELS_VI: Record<(typeof TROPICAL_SIGNS_EN)[number], string> = {
  Aries: "Bạch Dương",
  Taurus: "Kim Ngưu",
  Gemini: "Song Tử",
  Cancer: "Cự Giải",
  Leo: "Sư Tử",
  Virgo: "Xử Nữ",
  Libra: "Thiên Bình",
  Scorpio: "Bọ Cạp",
  Sagittarius: "Nhân Mã",
  Capricorn: "Ma Kết",
  Aquarius: "Bảo Bình",
  Pisces: "Song Ngư",
};

export function tropicalSignLabelVi(signEn: string) {
  return TROPICAL_SIGN_LABELS_VI[signEn as (typeof TROPICAL_SIGNS_EN)[number]];
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - date.getTime();
}

export function normalizeWallClockTime(time: string): string | null {
  const t = time.trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || h < 0 || h > 23) return null;
  if (!Number.isFinite(min) || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function localTimeInZoneToUtc(date: string, time: string, timeZone: string) {
  const wall = normalizeWallClockTime(time);
  if (!wall) throw new Error("invalid_time");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = wall.split(":").map(Number);
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 3; i += 1) {
    const offset = getTimeZoneOffsetMs(new Date(utcMs), timeZone);
    utcMs = Date.UTC(year, month - 1, day, hour, minute, 0) - offset;
  }
  const out = new Date(utcMs);
  if (Number.isNaN(out.getTime())) throw new Error("invalid_time");
  return out;
}

function tropicalLongitudeGeo(body: Body, utc: Date) {
  const vec = GeoVector(body, utc, true);
  const ecl = Ecliptic(vec);
  return normalizeDegrees(ecl.elon);
}

function tropicalSunLongitude(utc: Date) {
  return normalizeDegrees(SunPosition(utc).elon);
}

function eclipticPointAltitudeDegrees(utc: Date, observer: Observer, eclipticLongitudeDeg: number) {
  const t = MakeTime(utc);
  const rad = (eclipticLongitudeDeg * Math.PI) / 180;
  const vecEct = new Vector(Math.cos(rad), Math.sin(rad), 0, t);
  const vecEqj = RotateVector(Rotation_ECT_EQJ(t), vecEct);
  const vecHor = RotateVector(Rotation_EQJ_HOR(t, observer), vecEqj);
  const hor = HorizonFromVector(vecHor, null);
  return hor.lat;
}

function eclipticPointAzimuthDegrees(utc: Date, observer: Observer, eclipticLongitudeDeg: number) {
  const t = MakeTime(utc);
  const rad = (eclipticLongitudeDeg * Math.PI) / 180;
  const vecEct = new Vector(Math.cos(rad), Math.sin(rad), 0, t);
  const vecEqj = RotateVector(Rotation_ECT_EQJ(t), vecEct);
  const vecHor = RotateVector(Rotation_EQJ_HOR(t, observer), vecEqj);
  const hor = HorizonFromVector(vecHor, null);
  return hor.lon;
}

function refineAscendantLongitude(utc: Date, observer: Observer, lo: number, hi: number) {
  let a = lo;
  let b = hi;
  for (let i = 0; i < 56; i += 1) {
    const mid = (a + b) / 2;
    const altMid = eclipticPointAltitudeDegrees(utc, observer, mid);
    if (Math.abs(altMid) < 1e-10) return normalizeDegrees(mid);
    const altA = eclipticPointAltitudeDegrees(utc, observer, a);
    if (altA < 0 && altMid >= 0) {
      b = mid;
    } else {
      a = mid;
    }
  }
  return normalizeDegrees((a + b) / 2);
}

function ascendantFromRefinedLongitude(
  utc: Date,
  observer: Observer,
  refinedLongitudeDeg: number,
) {
  const az = eclipticPointAzimuthDegrees(utc, observer, refinedLongitudeDeg);
  if (az > 180) {
    return normalizeDegrees(refinedLongitudeDeg + 180);
  }
  return refinedLongitudeDeg;
}

function tropicalAscendantLongitude(utc: Date, latitude: number, longitude: number) {
  const observer = new Observer(latitude, longitude, 0);
  const step = 0.05;
  let prevLon = 360 - step;
  let prevAlt = eclipticPointAltitudeDegrees(utc, observer, prevLon);
  for (let lon = 0; lon < 360; lon += step) {
    const alt = eclipticPointAltitudeDegrees(utc, observer, lon);
    if (prevAlt < 0 && alt >= 0) {
      const refined = refineAscendantLongitude(utc, observer, prevLon, lon);
      return normalizeDegrees(ascendantFromRefinedLongitude(utc, observer, refined));
    }
    prevAlt = alt;
    prevLon = lon;
  }
  const alt360 = eclipticPointAltitudeDegrees(utc, observer, 360);
  if (prevAlt < 0 && alt360 >= 0) {
    const refined = refineAscendantLongitude(utc, observer, prevLon, 360);
    return normalizeDegrees(ascendantFromRefinedLongitude(utc, observer, refined));
  }
  return 0;
}

function fillTropicalPositions(utc: Date, positions: PlanetPositions) {
  positions.Sun = tropicalSunLongitude(utc);
  positions.Moon = tropicalLongitudeGeo(Body.Moon, utc);
  positions.Mercury = tropicalLongitudeGeo(Body.Mercury, utc);
  positions.Venus = tropicalLongitudeGeo(Body.Venus, utc);
  positions.Mars = tropicalLongitudeGeo(Body.Mars, utc);
  positions.Jupiter = tropicalLongitudeGeo(Body.Jupiter, utc);
  positions.Saturn = tropicalLongitudeGeo(Body.Saturn, utc);
  positions.Uranus = tropicalLongitudeGeo(Body.Uranus, utc);
  positions.Neptune = tropicalLongitudeGeo(Body.Neptune, utc);
  positions.Earth = normalizeDegrees(positions.Sun + 180);
}

type GeocodeHitInternal = {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country?: string;
  admin1?: string;
};

async function fetchOpenMeteoGeocodeList(
  location: string,
  language: "vi" | "en",
): Promise<{ ok: false } | { ok: true; hits: GeocodeHitInternal[] }> {
  const q = encodeURIComponent(location.trim());
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=8&language=${language}&format=json`;
  const res = await fetch(url);
  if (!res.ok) return { ok: false };
  const data = await res.json();
  const arr = data?.results;
  if (!Array.isArray(arr)) return { ok: true, hits: [] };
  const hits: GeocodeHitInternal[] = [];
  for (const r of arr) {
    if (
      r &&
      typeof r.name === "string" &&
      typeof r.latitude === "number" &&
      typeof r.longitude === "number" &&
      typeof r.timezone === "string"
    ) {
      hits.push({
        name: r.name,
        latitude: r.latitude,
        longitude: r.longitude,
        timezone: r.timezone,
        country: typeof r.country === "string" ? r.country : undefined,
        admin1: typeof r.admin1 === "string" ? r.admin1 : undefined,
      });
    }
  }
  return { ok: true, hits };
}

async function resolveCoordinatesAndTimezone(location: string) {
  let lastErr = "geocode_failed";
  for (const lang of ["vi", "en"] as const) {
    const pack = await fetchOpenMeteoGeocodeList(location, lang);
    if (!pack.ok) {
      lastErr = "geocode_failed";
      continue;
    }
    if (pack.hits.length > 0) {
      const first = pack.hits[0];
      return {
        latitude: first.latitude,
        longitude: first.longitude,
        timezone: first.timezone,
      };
    }
    lastErr = "geocode_not_found";
  }
  throw new Error(lastErr);
}

async function resolveGeoFromBirthData(data: BirthForm) {
  if (
    typeof data.latitude === "number" &&
    Number.isFinite(data.latitude) &&
    typeof data.longitude === "number" &&
    Number.isFinite(data.longitude) &&
    typeof data.timezone === "string" &&
    data.timezone.length > 0
  ) {
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
    };
  }
  return resolveCoordinatesAndTimezone(data.location);
}

export type GeocodeCandidate = GeocodeHitInternal;

export async function geocodeSearch(query: string): Promise<
  { ok: true; language: "vi" | "en"; candidates: GeocodeCandidate[] } | { ok: false; reason: "empty" | "failed" | "not_found" }
> {
  const trimmed = query.trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  let anyNetworkFailure = false;
  for (const lang of ["vi", "en"] as const) {
    const pack = await fetchOpenMeteoGeocodeList(trimmed, lang);
    if (!pack.ok) {
      anyNetworkFailure = true;
      continue;
    }
    if (pack.hits.length > 0) {
      return { ok: true, language: lang, candidates: pack.hits };
    }
  }
  if (anyNetworkFailure) return { ok: false, reason: "failed" };
  return { ok: false, reason: "not_found" };
}

export type TropicalChartDebugSuccess = {
  utcIso: string;
  geo: { latitude: number; longitude: number; timezone: string };
  localWallClock: string;
  localSummary: string;
  positions: PlanetPositions & { Rising?: number; rising?: number; Earth?: number };
};

export async function computeTropicalChartDebug(data: BirthForm): Promise<
  { ok: true; result: TropicalChartDebugSuccess } | { ok: false; error: string }
> {
  if (!data.date?.trim() || !data.location?.trim()) {
    return { ok: false, error: "Thiếu ngày hoặc nơi sinh." };
  }
  const wallTime = normalizeWallClockTime(data.time ?? "");
  if (!wallTime) {
    return {
      ok: false,
      error:
        "Giờ sinh không hợp lệ. Nhập HH:mm (vd. 07:30) — theo múi nơi chào đời (VN +7 khi sinh tại VN).",
    };
  }
  try {
    const geo = await resolveGeoFromBirthData(data);
    const utc = localTimeInZoneToUtc(data.date, wallTime, geo.timezone);
    const positions: PlanetPositions = {};
    fillTropicalPositions(utc, positions);
    const risingDeg = tropicalAscendantLongitude(utc, geo.latitude, geo.longitude);
    positions.Rising = risingDeg;
    positions.rising = risingDeg;
    const localWallClock = `${data.date.trim()} ${wallTime}`;
    const tzNote =
      geo.timezone === "Asia/Ho_Chi_Minh"
        ? "Múi nơi chào đời · VN +7."
        : "Múi nơi chào đời · " + geo.timezone + ".";
    return {
      ok: true,
      result: {
        utcIso: utc.toISOString(),
        geo: { latitude: geo.latitude, longitude: geo.longitude, timezone: geo.timezone },
        localWallClock,
        localSummary: `${localWallClock} · ${geo.timezone} — ${tzNote}`,
        positions,
      },
    };
  } catch {
    return { ok: false, error: "Geocode hoặc tính toán thất bại." };
  }
}

export async function calculatePositionsFromBirthData(data: BirthForm) {
  const positions: PlanetPositions = {};
  const wallTime = normalizeWallClockTime(data.time ?? "");
  if (!data.date || !data.location || !wallTime) return positions;
  try {
    const geo = await resolveGeoFromBirthData(data);
    const utc = localTimeInZoneToUtc(data.date, wallTime, geo.timezone);
    fillTropicalPositions(utc, positions);
    const risingDeg = tropicalAscendantLongitude(utc, geo.latitude, geo.longitude);
    positions.Rising = risingDeg;
    positions.rising = risingDeg;
    return positions;
  } catch {
    return positions;
  }
}
