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
    pageTitle: 'AstroMind | Birth Chart & Astrology Reading (EN/VI)',
    description:
      'Free natal chart app: birth date, time, and place, tropical wheel, and grounded sign-by-sign readings. English or Vietnamese—personalized and calm.',
    keywords: [
      'birth chart online',
      'natal chart',
      'tropical astrology',
      'zodiac reading',
      'AstroMind',
      'personalized horoscope',
      'English Vietnamese astrology',
      'rising sign',
      'sun moon chart',
    ],
    ogSiteName: 'AstroMind',
  },
  vi: {
    pageTitle: 'AstroMind | Lá Số & Chiêm Tinh — Việt / English',
    description:
      'Nhập ngày giờ nơi sinh, xem vòng cung hoàng đạo tropical và lời giải theo từng cung. Giao diện song ngữ Việt–Anh, miễn phí.',
    keywords: [
      'lá số tử vi online',
      'chiêm tinh',
      'hoàng đạo',
      'cung mọc',
      'AstroMind',
      'tử vi song ngữ',
      'giải sao',
      'lá số sinh',
    ],
    ogSiteName: 'AstroMind',
  },
};

/** Relative path under site root for Open Graph / Twitter image */
export const SEO_OG_IMAGE_PATH = '/og-image.svg';
