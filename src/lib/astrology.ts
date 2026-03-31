type BirthForm = { date: string; time: string; location: string };

export type PlanetPositions = Record<string, number>;

const BASE_PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"] as const;

function normalizeDegrees(value: number) {
  const v = value % 360;
  return v < 0 ? v + 360 : v;
}

function randomDegree() {
  return Math.random() * 360;
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

function localTimeInZoneToUtc(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 3; i += 1) {
    const offset = getTimeZoneOffsetMs(new Date(utcMs), timeZone);
    utcMs = Date.UTC(year, month - 1, day, hour, minute, 0) - offset;
  }
  return new Date(utcMs);
}

function toJulianDay(date: Date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function getAscendantLongitude(dateUtc: Date, latitude: number, longitude: number) {
  const jd = toJulianDay(dateUtc);
  const d = jd - 2451545.0;
  const gmst = normalizeDegrees(280.46061837 + 360.98564736629 * d);
  const lst = normalizeDegrees(gmst + longitude);
  const epsilon = (23.43929111 * Math.PI) / 180;
  const theta = (lst * Math.PI) / 180;
  const phi = (latitude * Math.PI) / 180;
  const lambda = Math.atan2(-Math.cos(theta), Math.sin(theta) * Math.cos(epsilon) + Math.tan(phi) * Math.sin(epsilon));
  return normalizeDegrees((lambda * 180) / Math.PI);
}

async function resolveCoordinatesAndTimezone(location: string) {
  const q = encodeURIComponent(location.trim());
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("geocode_failed");
  const data = await res.json();
  const first = data?.results?.[0];
  if (!first || typeof first.latitude !== "number" || typeof first.longitude !== "number" || typeof first.timezone !== "string") {
    throw new Error("geocode_not_found");
  }
  return {
    latitude: first.latitude,
    longitude: first.longitude,
    timezone: first.timezone,
  };
}

function basePlanetPositions() {
  const positions: PlanetPositions = {};
  for (const planet of BASE_PLANETS) positions[planet] = randomDegree();
  return positions;
}

export async function calculatePositionsFromBirthData(data: BirthForm) {
  const positions = basePlanetPositions();
  if (!data.date || !data.time || !data.location) return positions;
  try {
    const geo = await resolveCoordinatesAndTimezone(data.location);
    const utc = localTimeInZoneToUtc(data.date, data.time, geo.timezone);
    positions.Rising = getAscendantLongitude(utc, geo.latitude, geo.longitude);
    return positions;
  } catch {
    return positions;
  }
}

