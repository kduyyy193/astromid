/**
 * SEO copy for AstroMind (landing / SPA).
 * Titles ≤ ~60 chars; descriptions ~150–160 chars for snippets.
 */

export type SeoLocale = 'en' | 'vi';

export interface SeoMeta {
  pageTitle: string;
  description: string;
  keywords: string[];
  ogSiteName: string;
}

export const SEO_META: Record<SeoLocale, SeoMeta> = {
  en: {
    pageTitle: 'AstroMind | AI Birth Chart & Astrology Reading (EN/VI)',
    description:
      'Free AI astrology app: birth chart wheel, date/time/place input, and Gemini-powered natal insights. Switch English or Vietnamese—personalized, grounded readings.',
    keywords: [
      'AI astrology',
      'birth chart online',
      'natal chart',
      'Gemini astrology',
      'horoscope AI',
      'zodiac reading',
      'AstroMind',
      'personalized horoscope',
      'English Vietnamese astrology',
    ],
    ogSiteName: 'AstroMind',
  },
  vi: {
    pageTitle: 'AstroMind | Lá Số & Chiêm Tinh AI (Gemini) — Việt / English',
    description:
      'Ứng dụng chiêm tinh AI: nhập ngày giờ nơi sinh, xem vòng cung hoàng đạo, nhận lời giải cá nhân bằng Gemini. Giao diện song ngữ Việt–Anh, miễn phí.',
    keywords: [
      'chiêm tinh AI',
      'lá số tử vi online',
      'giải sao AI',
      'hoàng đạo',
      'Gemini chiêm tinh',
      'AstroMind',
      'tử vi song ngữ',
      'horoscope AI tiếng Việt',
    ],
    ogSiteName: 'AstroMind',
  },
};

/** Relative path under site root for Open Graph / Twitter image */
export const SEO_OG_IMAGE_PATH = '/og-image.svg';
