export const SITE_ORIGIN = 'https://pakkawatkh.github.io';
export const DEFAULT_OG_IMAGE = 'https://pakkawatkh.github.io/public/assets/icon.png';

export function getBasePath(): string {
  const raw =
    (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/public/';
  return raw.endsWith('/') ? raw : `${raw}/`;
}

/**
 * Joins a relative path onto Astro's normalized BASE_URL (`/public/`).
 * - For route pages (`trailingSlash: 'always'`), pass trailing slash: `withBase('monkey-tools/')` -> `/public/monkey-tools/`
 * - For files/assets, omit trailing slash: `withBase('assets/favicon.svg')` -> `/public/assets/favicon.svg`
 */
export function withBase(relPath: string = ''): string {
  const base = getBasePath();
  const clean = relPath.replace(/^\/+/, '');
  return `${base}${clean}`;
}
