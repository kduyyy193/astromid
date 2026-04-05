import { GoogleGenAI } from "@google/genai";
import { calculatePositionsFromBirthData, tropicalSignLabelVi } from "./astrology";
import { SIGN_TRAITS, type TraitLayers } from "./signTraits";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

type Language = "en" | "vi";
type ChartValue = string | number | null | undefined;
type ChartInput = Record<string, ChartValue>;

const MODELS = [
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-3-flash-preview"
];
const MAX_ATTEMPTS = 4;

type SolarSystemPlanet =
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

type BigThree = "sun" | "moon" | "rising";

export type ChartPlacementKey = BigThree | SolarSystemPlanet;

type InterpretationKey = ChartPlacementKey;

const PLACEMENT_ORDER: ChartPlacementKey[] = [
  "sun",
  "moon",
  "rising",
  "mercury",
  "venus",
  "earth",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
];

const PLACEMENT_LABEL_EN: Record<ChartPlacementKey, string> = {
  sun: "Sun",
  moon: "Moon",
  rising: "Rising (Ascendant)",
  mercury: "Mercury",
  venus: "Venus",
  earth: "Earth",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
};

const PLACEMENT_LABEL_VI: Record<ChartPlacementKey, string> = {
  sun: "Mặt Trời (Sun)",
  moon: "Mặt Trăng (Moon)",
  rising: "Cung mọc (Rising)",
  mercury: "Sao Thủy (Mercury)",
  venus: "Sao Kim (Venus)",
  earth: "Trái Đất / điểm đối Mặt Trời (Earth)",
  mars: "Sao Hỏa (Mars)",
  jupiter: "Sao Mộc (Jupiter)",
  saturn: "Sao Thổ (Saturn)",
  uranus: "Thiên Vương tinh (Uranus)",
  neptune: "Hải Vương tinh (Neptune)",
};

const OPPOSITE_SIGNS: Record<string, string> = {
  Aries: "Libra",
  Taurus: "Scorpio",
  Gemini: "Sagittarius",
  Cancer: "Capricorn",
  Leo: "Aquarius",
  Virgo: "Pisces",
  Libra: "Aries",
  Scorpio: "Taurus",
  Sagittarius: "Gemini",
  Capricorn: "Cancer",
  Aquarius: "Leo",
  Pisces: "Virgo",
};

function resolveEarthSign(chartData: Record<string, string>) {
  if (chartData.earth && SIGN_TRAITS[chartData.earth]) {
    return chartData.earth;
  }

  if (chartData.sun && OPPOSITE_SIGNS[chartData.sun]) {
    return OPPOSITE_SIGNS[chartData.sun];
  }

  return undefined;
}

function normalizeSign(value: ChartValue) {
  if (typeof value === "string" && SIGN_TRAITS[value]) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const normalized = ((value % 360) + 360) % 360;
    const signs = Object.keys(SIGN_TRAITS);
    const index = Math.floor(normalized / 30) % 12;
    return signs[index];
  }

  return undefined;
}

function getChartSign(chartData: ChartInput, key: string) {
  const keys = [key, key.toLowerCase(), key[0].toUpperCase() + key.slice(1)];
  if (key === "rising") {
    keys.push("ascendant", "Ascendant", "ASC");
  }
  for (const k of keys) {
    const sign = normalizeSign(chartData[k]);
    if (sign) return sign;
  }
  return undefined;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown) {
  const e = error as Record<string, unknown> & { message?: string };
  const status = e?.status as string | undefined;
  const code = e?.code as number | string | undefined;
  if (status === "UNAVAILABLE" || code === 503 || code === 429 || status === "RESOURCE_EXHAUSTED") return true;
  const nested = e?.error as { code?: number; status?: string } | undefined;
  if (nested?.code === 503 || nested?.status === "UNAVAILABLE") return true;
  if (typeof e?.message === "string") {
    try {
      const parsed = JSON.parse(e.message) as { error?: { code?: number; status?: string } };
      const err = parsed?.error;
      if (err?.code === 503 || err?.status === "UNAVAILABLE") return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

async function generateWithRetry(prompt: string) {
  let lastError: unknown;

  for (const model of MODELS) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt
        });

        return response.text;

      } catch (error) {
        lastError = error;

        if (!isRetryableError(error)) {
          break;
        }

        if (attempt === MAX_ATTEMPTS) {
          break;
        }

        const delayMs = 1000 * Math.pow(2, attempt - 1);
        await sleep(delayMs);
      }
    }

    console.warn(`Model failed → fallback to next: ${model}`);
  }

  throw lastError;
}

function buildProfile(chartData: ChartInput) {
  const normalizedForEarth: Record<string, string> = {};
  const sunSign = getChartSign(chartData, "sun");
  const earthSignRaw = getChartSign(chartData, "earth");
  if (sunSign) normalizedForEarth.sun = sunSign;
  if (earthSignRaw) normalizedForEarth.earth = earthSignRaw;

  const profile: Record<InterpretationKey, TraitLayers | null> = {
    sun: null,
    moon: null,
    rising: null,
    mercury: null,
    venus: null,
    earth: null,
    mars: null,
    jupiter: null,
    saturn: null,
    uranus: null,
    neptune: null,
  };

  const mapping: Record<InterpretationKey, InterpretationKey> = {
    sun: "sun",
    moon: "moon",
    rising: "rising",
    mercury: "mercury",
    venus: "venus",
    earth: "earth",
    mars: "mars",
    jupiter: "jupiter",
    saturn: "saturn",
    uranus: "uranus",
    neptune: "neptune",
  };

  for (const [planet, section] of Object.entries(mapping)) {
    const sign =
      planet === "earth"
        ? resolveEarthSign(normalizedForEarth)
        : getChartSign(chartData, planet);
    if (sign && SIGN_TRAITS[sign]) {
      profile[section] = SIGN_TRAITS[sign];
    }
  }

  return profile;
}

function buildPlacementSigns(chartData: ChartInput): Record<ChartPlacementKey, string | null> {
  const normalizedForEarth: Record<string, string> = {};
  const sunSign = getChartSign(chartData, "sun");
  const earthSignRaw = getChartSign(chartData, "earth");
  if (sunSign) normalizedForEarth.sun = sunSign;
  if (earthSignRaw) normalizedForEarth.earth = earthSignRaw;

  return {
    sun: sunSign ?? null,
    moon: getChartSign(chartData, "moon") ?? null,
    rising: getChartSign(chartData, "rising") ?? null,
    mercury: getChartSign(chartData, "mercury") ?? null,
    venus: getChartSign(chartData, "venus") ?? null,
    earth: resolveEarthSign(normalizedForEarth) ?? null,
    mars: getChartSign(chartData, "mars") ?? null,
    jupiter: getChartSign(chartData, "jupiter") ?? null,
    saturn: getChartSign(chartData, "saturn") ?? null,
    uranus: getChartSign(chartData, "uranus") ?? null,
    neptune: getChartSign(chartData, "neptune") ?? null,
  };
}

export function getChartPlacementSigns(chartData: ChartInput): Record<ChartPlacementKey, string | null> {
  return buildPlacementSigns(chartData);
}

export type ChartPlacementRow = {
  key: ChartPlacementKey;
  labelEn: string;
  labelVi: string;
  signEn: string | null;
  signVi: string | null;
};

export function getChartPlacementRows(chartData: ChartInput): ChartPlacementRow[] {
  const p = buildPlacementSigns(chartData);
  return PLACEMENT_ORDER.map((key) => {
    const signEn = p[key];
    const signVi = signEn ? tropicalSignLabelVi(signEn) ?? null : null;
    return {
      key,
      labelEn: PLACEMENT_LABEL_EN[key],
      labelVi: PLACEMENT_LABEL_VI[key],
      signEn,
      signVi,
    };
  });
}

const COMPARE_PLACEMENT_KEYS: ChartPlacementKey[] = ["sun", "moon", "venus", "mars"];

export type CoupleQuickCompareRow = {
  key: ChartPlacementKey;
  label: string;
  signA: string | null;
  signB: string | null;
  signAvi: string | null;
  signBvi: string | null;
};

export function getCoupleQuickCompareRows(
  chartA: ChartInput,
  chartB: ChartInput,
  language: Language,
): CoupleQuickCompareRow[] {
  const sa = getChartPlacementSigns(chartA);
  const sb = getChartPlacementSigns(chartB);
  return COMPARE_PLACEMENT_KEYS.map((key) => {
    const signA = sa[key];
    const signB = sb[key];
    return {
      key,
      label: language === "vi" ? PLACEMENT_LABEL_VI[key] : PLACEMENT_LABEL_EN[key],
      signA,
      signB,
      signAvi: signA ? tropicalSignLabelVi(signA) ?? null : null,
      signBvi: signB ? tropicalSignLabelVi(signB) ?? null : null,
    };
  });
}

async function getAstrologyInterpretationCore(birthData: any, chartData: ChartInput, language: Language) {
  const profile = buildProfile(chartData);
  const placements = buildPlacementSigns(chartData);
  const birthContext = {
    date: birthData?.date,
    time: birthData?.time,
    location: birthData?.location,
  };

  const placementLines =
    language === "vi"
      ? PLACEMENT_ORDER.map((k) => {
        const s = placements[k];
        const vi = s ? tropicalSignLabelVi(s) : null;
        return `${PLACEMENT_LABEL_VI[k]}: ${s ? `${s} (${vi ?? s})` : "không xác định"}`;
      }).join("\n")
      : PLACEMENT_ORDER.map((k) => {
        const s = placements[k];
        return `${PLACEMENT_LABEL_EN[k]}: ${s ?? "unknown"}`;
      }).join("\n");

  const languageInstruction =
    language === "vi"
      ? "Tiếng Việt, cực gọn. Giọng **gần giới trẻ** (20s): tự nhiên, đời thường, có thể hơi playful; tránh văn hành chính, sách giáo khoa, câu sáo rỗng. Có thể nhắc FOMO, deadline, crush, vibe, burn-out, toxic (khi hợp ngữ cảnh) — vừa phải, không nhồi slang. Tổng bài ~450–600 từ. Không lời dẫn, không chào. Mục 1: 2–3 câu/Sun|Moon|Rising. Mục 2: 1–2 câu/hành tinh. Mục 3–6: gạch ngắn."
      : "English, very tight. **Youth voice** (Gen Z / late teens–20s): casual, relatable, like a smart friend—not academic. Light internet-era wording when it fits (FOMO, vibe, burnout, boundaries); do not overdo slang or memes. Total max ~350–450 words. No intro, no greeting. Section 1: 2–3 sentences per Sun/Moon/Rising. Section 2: 1–2 sentences per planet. Sections 3–6: short bullets.";

  const structureVi = `
Cấu trúc Markdown (bắt đầu ngay bằng tiêu đề mục 1 — không đoạn mở đầu):

Không bảng placement. Không câu kiểu: chào, xin chào, dưới đây là, bản phân tích của bạn, theo dữ liệu. Giải thích sao cho **dễ đọc trên điện thoại**, câu ngắn, ít phụ lục.

1. **Big Three (Sun · Moon · Rising)**:
- Mỗi phần: một dòng nêu cung (Latin + tiếng Việt), rồi **tối đa 2–3 câu** (gộp archetype + conflict + một ý core/shadow).

2. **Mercury → Neptune + Earth**:
- \`###\` theo thứ tự; mỗi mục **1–2 câu** (cung đúng GROUND TRUTH + một ý từ profile).

3. **Core Dynamics**:
- 2–3 gạch đầu dòng.

4. **Youth Lens**:
- 2 gạch đầu dòng.

5. **Synthesis**:
- **Một đoạn 2 câu**.

6. **Advice**:
- **3 gạch đầu dòng**.
`;

  const structureEn = `
Markdown structure — **first line must be the first heading** (section 1). No intro paragraph.

No placement table. No greetings, no "here is your reading", no "based on your chart" preamble. **Short sentences**, mobile-friendly skimming.

1. **Big Three (Sun · Moon · Rising)**:
- Each: one line naming the sign, then **max 2–3 sentences** (archetype + conflict + one core/shadow idea).

2. **Mercury through Neptune + Earth**:
- \`###\` in order; **1–2 sentences** each. Skip unknown.

3. **Core Dynamics**:
- 2–3 bullets.

4. **Youth Lens**:
- 2 bullets.

5. **Synthesis**:
- **Two sentences**.

6. **Advice**:
- **3 bullets**.
`;

  const prompt = `
You are an astrologer who writes like a sharp friend in their twenties: clear, real, not preachy—still grounded in the profile data.

IMPORTANT RULES:
- ONLY use the structured tropical sign profile for each placement (from the JSON below). Paraphrase briefly; do not add new labels or claims outside this material. Do not quote entire lists; synthesize.
- GROUND TRUTH placements below are authoritative: every stated sign must match exactly in each subsection; do not duplicate them as a summary table at the top.
- If profile data for a placement is null, still state the sign from GROUND TRUTH and give a minimal reading without inventing traits.
- Output **must start with** the first Markdown heading of section 1 (e.g. \`## 1.\` or \`## Big Three\`). **Forbidden:** greetings, addressing the user by name, welcome lines, "dưới đây là...", "based on your birth data", meta commentary about the analysis.

Birth context (no name — do not invent or guess a name):
${JSON.stringify(birthContext, null, 2)}

GROUND TRUTH — tropical sign per point (authoritative):
${placementLines}

GROUND TRUTH — machine-readable:
${JSON.stringify(placements, null, 2)}

Structured tropical sign profiles (per placement):
${JSON.stringify(profile, null, 2)}

${languageInstruction}

${language === "vi" ? structureVi : structureEn}
`;

  return await generateWithRetry(prompt);
}

export async function getAstrologyInterpretation(birthData: any, chartData: ChartInput, language: Language) {
  try {
    const text = await getAstrologyInterpretationCore(birthData, chartData, language);
    return text ?? "";
  } catch (error) {
    console.error("Gemini Error:", error);
    return language === "vi"
      ? "Bầu trời đang lặng im. Thử lại sau một lát nhé."
      : "The stars are quiet right now. Please try again in a moment.";
  }
}

async function getCompatibilityInterpretationCore(
  maleBirthData: any,
  maleChartData: ChartInput,
  femaleBirthData: any,
  femaleChartData: ChartInput,
  language: Language
) {
  const maleProfile = buildProfile(maleChartData);
  const femaleProfile = buildProfile(femaleChartData);
  const labelA =
    typeof maleBirthData?.displayName === "string" && maleBirthData.displayName.trim()
      ? maleBirthData.displayName.trim()
      : language === "vi"
        ? "Người A"
        : "Person A";
  const labelB =
    typeof femaleBirthData?.displayName === "string" && femaleBirthData.displayName.trim()
      ? femaleBirthData.displayName.trim()
      : language === "vi"
        ? "Người B"
        : "Person B";

  const ctxA = { date: maleBirthData?.date, time: maleBirthData?.time, location: maleBirthData?.location };
  const ctxB = { date: femaleBirthData?.date, time: femaleBirthData?.time, location: femaleBirthData?.location };

  const languageInstruction =
    language === "vi"
      ? "Tiếng Việt, cực gọn. Giọng gần giới trẻ (20s), tự nhiên; tránh sáo, tránh văn hành chính. Tổng ~500–700 từ. Không chào, không meta."
      : "English, tight. Youth voice (20s), casual—not academic. Total ~400–550 words. No greeting, no meta.";

  const compatVi = `
Cấu trúc Markdown — **dòng đầu là heading mục 1**.

Không chào, không “dưới đây là…”. Dùng nhãn **${labelA}** và **${labelB}** khi nói về từng người.

1. **Chỉ số nhanh (ước lượng)**:
- Tổng thể: XX% (số nguyên 0–100)
- Đồng điệu cảm xúc (Moon + Neptune): XX%
- Hấp lực / romance (Kim + Hỏa): XX%
- Bền lâu (Thổ + Mộc + Earth): XX%
- Rủi ro xung đột (shadow): XX%

2. **Hợp & kính**:
- 2–3 gạch: điểm mạnh
- 2–3 gạch: ma sát hay lặp lại

3. **Sun · Moon · Venus · Mars (đối chiếu)**:
- Một đoạn ngắn hoặc gạch: cách bốn cặp cung này (từ profile) tạo vibe chung; không liệt kê bảng.

4. **Góc nhìn Gen Z**:
- 2–3 gạch: FOMO, ranh giới, toxic pattern, nhu cầu reassurance — gắn trait đã cho.

5. **Việc nên làm / né**:
- 3 gạch hành động
- 2 gạch red flag
`;

  const compatEn = `
Markdown — **first line is the section-1 heading**.

No greetings or preamble. Use labels **${labelA}** and **${labelB}** for each person.

1. **Quick scores (estimate)**:
- Overall: XX% (integer 0–100)
- Emotional sync (Moon + Neptune): XX%
- Attraction / romance (Venus + Mars): XX%
- Long-term (Saturn + Jupiter + Earth): XX%
- Conflict risk (shadow): XX%

2. **Fit & friction**:
- 2–3 bullets strengths
- 2–3 bullets recurring friction

3. **Sun · Moon · Venus · Mars (cross-check)**:
- Short paragraph or bullets: how these sign pairs land; no raw tables.

4. **Modern dating lens**:
- 2–3 bullets: FOMO, boundaries, reassurance—tie to traits only.

5. **Do / avoid**:
- 3 action bullets
- 2 red-flag bullets
`;

  const prompt = `
You are a compatibility reader who sounds like a sharp friend in their twenties—grounded, not preachy. Use only the structured sign profiles below.

IMPORTANT RULES:
- ONLY use structured tropical sign profile fields for each person. Synthesize; do not invent traits.
- Refer to the two people as "${labelA}" and "${labelB}" (not "male/female" unless needed medically).
- Output **must start** with the first Markdown heading of section 1. Forbidden: greetings, welcome, "here is your reading".
- Return all percentages as integers 0–100 in section 1.

${labelA} — birth context:
${JSON.stringify(ctxA, null, 2)}

${labelA} — sign profiles per placement:
${JSON.stringify(maleProfile, null, 2)}

${labelB} — birth context:
${JSON.stringify(ctxB, null, 2)}

${labelB} — sign profiles per placement:
${JSON.stringify(femaleProfile, null, 2)}

${languageInstruction}

${language === "vi" ? compatVi : compatEn}
`;

  return await generateWithRetry(prompt);
}

export async function getCompatibilityInterpretation(
  maleBirthData: any,
  maleChartData: ChartInput,
  femaleBirthData: any,
  femaleChartData: ChartInput,
  language: Language
) {
  try {
    const text = await getCompatibilityInterpretationCore(
      maleBirthData,
      maleChartData,
      femaleBirthData,
      femaleChartData,
      language
    );
    return text ?? "";
  } catch (error) {
    console.error("Gemini Compatibility Error:", error);
    return language === "vi"
      ? "Bầu trời đang lặng im. Thử lại sau một lát nhé."
      : "The stars are quiet right now. Please try again in a moment.";
  }
}

export type GeminiTextResult = { ok: true; text: string } | { ok: false; text: string };

export async function getCompatibilityInterpretationResult(
  maleBirthData: any,
  maleChartData: ChartInput,
  femaleBirthData: any,
  femaleChartData: ChartInput,
  language: Language
): Promise<GeminiTextResult> {
  try {
    const text = await getCompatibilityInterpretationCore(
      maleBirthData,
      maleChartData,
      femaleBirthData,
      femaleChartData,
      language
    );
    return { ok: true, text: text ?? "" };
  } catch {
    return {
      ok: false,
      text:
        language === "vi"
          ? "Bầu trời đang lặng im. Thử lại sau một lát nhé."
          : "The stars are quiet right now. Please try again in a moment.",
    };
  }
}

export type PaidReadingInput = {
  name: string;
  date: string;
  time: string;
  location: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
};

export async function generatePaidAstrologyReading(
  input: PaidReadingInput,
  language: Language
): Promise<GeminiTextResult> {
  try {
    const birthData = {
      name: input.name.trim(),
      date: input.date,
      time: input.time,
      location: input.location.trim(),
    };
    const positions = await calculatePositionsFromBirthData({
      date: birthData.date,
      time: birthData.time,
      location: birthData.location,
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: input.timezone,
    });
    const text = await getAstrologyInterpretationCore(birthData, positions, language);
    return { ok: true, text: text ?? "" };
  } catch {
    return {
      ok: false,
      text:
        language === "vi"
          ? "Bầu trời đang lặng im. Thử lại sau một lát nhé."
          : "The stars are quiet right now. Please try again in a moment.",
    };
  }
}