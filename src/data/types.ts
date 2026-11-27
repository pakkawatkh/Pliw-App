// src/data/types.ts — Pure TypeScript types (safe for .astro and React .tsx islands)

export type AppCategory = 'app' | 'extension';

export type AppSlug =
  | 'monkey-tools'
  | 'pliw-collage'
  | 'pliw-click'
  | 'pliw-face'
  | 'pliw-scroll'
  | 'pliw-geo';

/** Exact schema for monkey-tools/version.json and pliw-collage/version.json */
export interface ReleaseDateVersionJson {
  latestVersion: string;
  releaseDate: string;
  downloadUrl: string;
  zipUrl: string;
  pageUrl: string;
  releaseNotes: string;
}

/** Exact schema for pliw-click/version.json */
export interface PublishedAtVersionJson {
  latestVersion: string;
  downloadUrl: string;
  zipUrl: string;
  releaseNotes: string;
  publishedAt: string;
}

export type MacVersionJson = ReleaseDateVersionJson | PublishedAtVersionJson;

export interface AppThemeTokens {
  accent: string;       // --accent
  accent2: string;      // --accent-2
  accentSoft: string;   // --accent-soft
  accentBorder: string; // --accent-border
  glowRgb: string;      // --glow-rgb (e.g. "2, 132, 199")
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
}

export interface QuickInstallStep {
  text: string;
  codeHighlight?: string;
  terminalCommand?: string;
  copyValue?: string;
}

export interface AppQuickInstall {
  packageLabel: string;        // e.g. "monkey-tools-Installer.dmg" or "pliw-scroll-v1.2.2.zip"
  bundleOrFolderName: string;  // e.g. "monkey-tools.app", "Pliw Click.app", "pliw-scroll"
  gatekeeperCommand?: string;  // macOS only
  requiresAccessibility: boolean;
  steps: QuickInstallStep[];
}

export interface AppEntry {
  slug: AppSlug;
  name: string;
  category: AppCategory;
  platformLabel: string;       // "macOS 13.0+" | "Chrome · Brave · Edge"
  compatibilityPill: string;   // "macOS 13.0+ (Apple Silicon & Intel)" | "Chrome · Brave · Edge (Manifest V3)"
  footerPlatform: string;      // "macOS 13.0+" | "Chrome / Brave / Edge"
  description: string;         // 1-line English summary (no AI slop, no shortcuts)
  seoTitle: string;
  seoDescription: string;
  githubUrl: string;
  version: string;             // e.g. "2.3.6"
  versionTag: string;          // e.g. "v2.3.6"
  releaseDate: string;         // YYYY-MM-DD (from releaseDate or publishedAt.slice(0, 10))
  releaseNotes?: string;       // From version.json for macOS apps
  downloadType: 'DMG' | 'ZIP';
  downloadFilename: string;    // e.g. "monkey-tools-Installer.dmg" | "pliw-scroll-v1.2.2.zip"
  downloadRelPath: string;     // "<slug>/<downloadFilename>"
  downloadUrl: string;         // Base-prefixed URL e.g. "/public/monkey-tools/monkey-tools-Installer.dmg"
  fileSizeBytes: number;
  fileSize: string;            // Matches ls -lh e.g. "1.8 MB", "61 KB"
  zipRelPath?: string;         // macOS auto-updater zip e.g. "monkey-tools/monkey-tools.zip"
  zipSize?: string;            // macOS auto-updater zip size e.g. "1.5 MB"
  iconRelPath: string;         // "<slug>/assets/icon.png" | "<slug>/assets/icon128.png"
  iconUrl: string;             // Base-prefixed URL e.g. "/public/monkey-tools/assets/icon.png"
  pageRelPath: string;         // "<slug>/"
  pageUrl: string;             // Base-prefixed URL e.g. "/public/monkey-tools/"
  canonicalUrl: string;        // "https://pakkawatkh.github.io/public/<slug>/"
  theme: AppThemeTokens;
  quickInstall: AppQuickInstall;
}
