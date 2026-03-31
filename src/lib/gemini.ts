import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface TraitLayers {
  core: string[];
  shadow: string[];
  conflict?: string;
}

type Language = "en" | "vi";
type ChartValue = string | number | null | undefined;
type ChartInput = Record<string, ChartValue>;
const DEFAULT_MODEL = "gemini-3-flash-preview";
const MAX_RETRIES = 3;

const SIGN_TRAITS: Record<string, TraitLayers> = {
  Aries: {
    core: ["energetic", "courageous", "adventurous"],
    shadow: ["impulsive", "restless"],
    conflict: "You want to lead but fear losing control"
  },
  Taurus: {
    core: ["stable", "patient", "persistent"],
    shadow: ["stubborn", "possessive"],
    conflict: "You crave comfort but resist change"
  },
  Gemini: {
    core: ["communicative", "curious", "adaptable"],
    shadow: ["restless", "superficial"],
    conflict: "You love variety but struggle with commitment"
  },
  Cancer: {
    core: ["emotional", "nurturing", "protective"],
    shadow: ["moody", "over-sensitive"],
    conflict: "You seek safety but fear vulnerability"
  },
  Leo: {
    core: ["confident", "charismatic", "loyal"],
    shadow: ["prideful", "attention-seeking"],
    conflict: "You want recognition but fear rejection"
  },
  Virgo: {
    core: ["analytical", "practical", "detail-oriented"],
    shadow: ["overcritical", "perfectionist"],
    conflict: "You aim for perfection but feel easily frustrated"
  },
  Libra: {
    core: ["harmonious", "relationship-oriented", "fair-minded"],
    shadow: ["indecisive", "people-pleasing"],
    conflict: "You want peace but fear conflict"
  },
  Scorpio: {
    core: ["intense", "passionate", "determined"],
    shadow: ["secretive", "jealous"],
    conflict: "You desire depth but struggle with trust"
  },
  Sagittarius: {
    core: ["optimistic", "adventurous", "honest"],
    shadow: ["restless", "blunt"],
    conflict: "You seek freedom but fear commitment"
  },
  Capricorn: {
    core: ["disciplined", "ambitious", "practical"],
    shadow: ["rigid", "overly serious"],
    conflict: "You aim for success but fear failure"
  },
  Aquarius: {
    core: ["independent", "unconventional", "intellectual"],
    shadow: ["detached", "unpredictable"],
    conflict: "You value freedom but struggle with intimacy"
  },
  Pisces: {
    core: ["intuitive", "empathetic", "imaginative"],
    shadow: ["over-sensitive", "escapist"],
    conflict: "You want connection but fear being overwhelmed"
  },
};

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

type InterpretationKey = BigThree | SolarSystemPlanet;

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
  return normalizeSign(chartData[key] ?? chartData[key.toLowerCase()] ?? chartData[key[0].toUpperCase() + key.slice(1)]);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown) {
  const status = (error as any)?.status;
  const code = (error as any)?.code;
  return status === "UNAVAILABLE" || code === 503 || code === 429 || status === "RESOURCE_EXHAUSTED";
}

async function generateWithRetry(prompt: string) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt
      });
      return response.text;
    } catch (error) {
      lastError = error;
      if (attempt === MAX_RETRIES || !isRetryableError(error)) {
        throw error;
      }
      const delayMs = 1000 * Math.pow(2, attempt - 1);
      await sleep(delayMs);
    }
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

export async function getAstrologyInterpretation(
  birthData: any,
  chartData: ChartInput,
  language: Language
) {
  const profile = buildProfile(chartData);

  const languageInstruction =
    language === "vi"
      ? "Viết bằng tiếng Việt, văn phong sâu sắc, trúng người dùng, grounded và thực tế. Nhấn mạnh xung đột nội tâm nếu có."
      : "Write in English, clear, emotionally engaging, psychologically grounded (avoid vague mysticism). Highlight internal conflicts where applicable.";

  const prompt = `
You are an expert astrologer AI assistant.

IMPORTANT RULES:
- ONLY use the provided core, shadow, and conflict traits.
- DO NOT invent new traits or spiritual concepts.
- Highlight internal conflicts to make interpretation feel personal.
- Make the narrative emotionally engaging but grounded in psychology.

User Birth Data:
${JSON.stringify(birthData, null, 2)}

Structured Personality Traits:
${JSON.stringify(profile, null, 2)}

${languageInstruction}

Follow this structure in Markdown:

1. **Identity Layer (Big Three)**:
- Sun → core identity and life direction
- Moon → emotional world and attachment needs
- Rising → outward style and first impression

2. **Planetary Personality Map (8 Planets)**:
- Mercury → thinking and communication
- Venus → love, attraction, values
- Earth → grounding, practical embodiment, daily stability
- Mars → drive, action, conflict style
- Jupiter → growth, belief, expansion
- Saturn → discipline, fear, limitation
- Uranus → independence, disruption, originality
- Neptune → imagination, sensitivity, idealism

3. **Core Dynamics**:
- Explain how Big Three modifies or amplifies the 8-planet expression
- Identify 1-2 strongest reinforcing patterns across the 8 planets
- Identify where traits clash and create inner tension

4. **Youth Lens (Modern Inner Struggles)**:
- Nổi sợ và bất an thường gặp của giới trẻ (ví dụ: sợ thua kém, sợ bị bỏ lại, sợ “không đủ tốt”) và liên hệ trực tiếp với các trait (core/shadow/conflict) bạn đã cung cấp
- Xu hướng và áp lực “trend” (ví dụ: FOMO, cảm giác phải bắt kịp, áp lực hình ảnh) và chỉ ra nó bộc lộ qua các hành tinh/cung tương ứng trong 8 planets + Big Three
- “Đứa trẻ bên trong” như một phần nhu cầu cảm xúc: cần được thấu hiểu, được an toàn, được công nhận; chỉ dùng các hướng trait hiện có để diễn giải (không thêm trait mới)
- Kết nối các chủ đề trên với ít nhất 1 major internal conflict đã nêu ở phần Core Dynamics

5. **Synthesis (Core Pattern)**:
Combine all elements into:
- 1–2 key personality patterns
- 1 major internal conflict

6. **Advice (Actionable)**:
Give realistic advice based on:
- conflict
- behavioral tendencies

7. **Emotional Hook**:
End with a short, grounded but resonant reflection (not overly poetic, not vague).
`;

  try {
    return await generateWithRetry(prompt);
  } catch (error) {
    console.error("Gemini Error:", error);
    return language === "vi"
      ? "Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau."
      : "System error. Please try again later.";
  }
}

export async function getCompatibilityInterpretation(
  maleBirthData: any,
  maleChartData: ChartInput,
  femaleBirthData: any,
  femaleChartData: ChartInput,
  language: Language
) {
  const maleProfile = buildProfile(maleChartData);
  const femaleProfile = buildProfile(femaleChartData);

  const languageInstruction =
    language === "vi"
      ? "Viết bằng tiếng Việt, rõ ràng, sâu sắc, thực tế. Giọng văn hiện đại, không sáo rỗng."
      : "Write in English, clear, insightful, practical, and emotionally grounded.";

  const prompt = `
You are an expert astrology compatibility analyst.

IMPORTANT RULES:
- ONLY use the provided core, shadow, and conflict traits.
- DO NOT invent new traits or spiritual concepts.
- If Rising is null for a person, state that Rising-based conclusions are limited.
- Keep insights realistic and psychologically grounded.
- Return percentages as integers from 0 to 100.

Male Birth Data:
${JSON.stringify(maleBirthData, null, 2)}

Male Structured Traits:
${JSON.stringify(maleProfile, null, 2)}

Female Birth Data:
${JSON.stringify(femaleBirthData, null, 2)}

Female Structured Traits:
${JSON.stringify(femaleProfile, null, 2)}

${languageInstruction}

Follow this structure in Markdown:

1. **Compatibility Stats**:
- Overall Compatibility: XX%
- Emotional Sync (Moon + Neptune + Big Three): XX%
- Attraction & Romance (Venus + Mars): XX%
- Long-term Stability (Saturn + Earth + Jupiter): XX%
- Conflict Risk (shadow + conflict interplay): XX%

2. **How They Match**:
- 2-3 strongest compatibility drivers
- 2-3 friction points that can repeat

3. **Big Three & 8 Planets Summary**:
- Explain how Sun/Moon/Rising of each person shape the relationship tone
- Explain key interactions from Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune

4. **Modern Relationship Lens**:
- Mention likely dynamics in modern dating (communication style, ghosting risk, reassurance needs, pressure from social comparison)
- Link each dynamic to provided traits only

5. **Action Plan For The Couple**:
- 3 concrete actions to improve compatibility
- 3 red-flag patterns to avoid

6. **Closing Reflection**:
- End with a short, grounded reflection for both people.
`;

  try {
    return await generateWithRetry(prompt);
  } catch (error) {
    console.error("Gemini Compatibility Error:", error);
    return language === "vi"
      ? "Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau."
      : "System error. Please try again later.";
  }
}