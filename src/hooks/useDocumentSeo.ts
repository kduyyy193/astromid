import { useEffect } from 'react';
import type { SeoLocale } from '../config/seo';
import { SEO_META, SEO_OG_IMAGE_PATH } from '../config/seo';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

/**
 * Syncs <title>, html[lang], meta description/OG/Twitter, canonical, hreflang, JSON-LD.
 * Uses import.meta.env.VITE_SITE_URL (no trailing slash) when set; otherwise window.location.origin.
 */
export function useDocumentSeo(locale: SeoLocale) {
  useEffect(() => {
    const meta = SEO_META[locale];
    const envBase = import.meta.env.VITE_SITE_URL as string | undefined;
    const base = (envBase || window.location.origin).replace(/\/$/, '');

    document.title = meta.pageTitle;
    document.documentElement.lang = locale === 'vi' ? 'vi' : 'en';

    setMeta('name', 'description', meta.description);
    setMeta('name', 'keywords', meta.keywords.join(', '));
    setMeta('name', 'author', 'AstroMind');
    setMeta('name', 'robots', 'index, follow, max-image-preview:large');
    setMeta('name', 'googlebot', 'index, follow');

    setMeta('property', 'og:title', meta.pageTitle);
    setMeta('property', 'og:description', meta.description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', meta.ogSiteName);
    setMeta('property', 'og:url', `${base}/`);
    setMeta('property', 'og:locale', locale === 'vi' ? 'vi_VN' : 'en_US');

    const ogImage = `${base}${SEO_OG_IMAGE_PATH}`;
    setMeta('property', 'og:image', ogImage);
    setMeta('property', 'og:image:alt', meta.ogSiteName + ' — astrology birth chart');

    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', meta.pageTitle);
    setMeta('name', 'twitter:description', meta.description);
    setMeta('name', 'twitter:image', ogImage);

    setCanonical(`${base}/`);
    // Same URL for all locales (client-side toggle). Google: avoid duplicate hreflang to one URL for multiple langs.

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'AstroMind',
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Any (web browser)',
      browserRequirements: 'Requires JavaScript',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description: meta.description,
      inLanguage: locale === 'vi' ? 'vi-VN' : 'en-US',
      url: `${base}/`,
      isAccessibleForFree: true,
      featureList:
        locale === 'vi'
          ? [
              'Nhập ngày, giờ, nơi sinh',
              'Biểu đồ vòng cung (D3)',
              'Lời giải theo các cung trên lá số',
              'Giao diện song ngữ Việt / English',
            ]
          : [
              'Birth date, time, and place',
              'Zodiac wheel chart (D3)',
              'Sign-by-sign reading from your chart',
              'English / Vietnamese UI',
            ],
    };

    const scriptId = 'astromind-jsonld';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);
  }, [locale]);
}
