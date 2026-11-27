// src/data/apps.ts — Build-time catalog reading public/<slug>/version.json and fs.statSync sizes

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_ORIGIN, withBase } from '../utils/paths';
import type {
  AppEntry,
  AppQuickInstall,
  AppSlug,
  AppThemeTokens,
  MacVersionJson,
} from './types';

export * from './types';
export { withBase };

const cwdPublic = path.resolve(process.cwd(), 'public');
const PUBLIC_DIR = fs.existsSync(cwdPublic)
  ? cwdPublic
  : fileURLToPath(new URL('../../public', import.meta.url));

/**
 * Formats byte counts in binary KiB/MiB matching macOS/BSD `ls -lh` output.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1023.5) {
    return `${kb < 9.95 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  const mb = kb / 1024;
  return `${mb < 9.95 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

function statPublicFile(relPath: string): number {
  const fullPath = path.join(PUBLIC_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing static distribution file: ${fullPath}`);
  }
  return fs.statSync(fullPath).size;
}

interface MacReleaseMeta {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  downloadFilename: string;
  downloadRelPath: string;
  fileSizeBytes: number;
  fileSize: string;
  zipRelPath: string;
  zipSize: string;
}

function loadMacRelease(slug: AppSlug): MacReleaseMeta {
  const manifestPath = path.join(PUBLIC_DIR, slug, 'version.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing version.json for ${slug}: ${manifestPath}`);
  }

  const raw = fs.readFileSync(manifestPath, 'utf-8');
  const json = JSON.parse(raw) as MacVersionJson;

  if (!json.latestVersion || !json.downloadUrl || !json.zipUrl) {
    throw new Error(`Invalid version.json schema for ${slug}`);
  }

  const rawDate = 'releaseDate' in json ? json.releaseDate : json.publishedAt;
  if (!rawDate) {
    throw new Error(`Missing releaseDate/publishedAt in version.json for ${slug}`);
  }
  const releaseDate = rawDate.slice(0, 10);

  const downloadFilename = path.posix.basename(new URL(json.downloadUrl).pathname);
  const zipFilename = path.posix.basename(new URL(json.zipUrl).pathname);

  const downloadRelPath = `${slug}/${downloadFilename}`;
  const zipRelPath = `${slug}/${zipFilename}`;

  const fileSizeBytes = statPublicFile(downloadRelPath);
  const zipSizeBytes = statPublicFile(zipRelPath);

  return {
    version: json.latestVersion,
    releaseDate,
    releaseNotes: json.releaseNotes,
    downloadFilename,
    downloadRelPath,
    fileSizeBytes,
    fileSize: formatFileSize(fileSizeBytes),
    zipRelPath,
    zipSize: formatFileSize(zipSizeBytes),
  };
}

interface ExtensionArchiveMeta {
  version: string;
  downloadFilename: string;
  downloadRelPath: string;
  fileSizeBytes: number;
  fileSize: string;
  releaseDate: string;
}

function parseSemver(ver: string): { core: [number, number, number]; pre: string[] } {
  const withoutBuild = ver.split('+')[0] ?? '0.0.0';
  const dashIdx = withoutBuild.indexOf('-');
  const coreStr = dashIdx === -1 ? withoutBuild : withoutBuild.slice(0, dashIdx);
  const preStr = dashIdx === -1 ? '' : withoutBuild.slice(dashIdx + 1);
  const [maj = 0, min = 0, pat = 0] = coreStr.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pre = preStr ? preStr.split('.') : [];
  return { core: [maj, min, pat], pre };
}

function compareSemverDesc(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i += 1) {
    if (pb.core[i] !== pa.core[i]) return pb.core[i] - pa.core[i];
  }
  // SemVer 2.0.0: stable release has higher precedence than pre-release
  if (pa.pre.length === 0 && pb.pre.length > 0) return -1;
  if (pa.pre.length > 0 && pb.pre.length === 0) return 1;
  const maxLen = Math.max(pa.pre.length, pb.pre.length);
  for (let i = 0; i < maxLen; i += 1) {
    const idA = pa.pre[i];
    const idB = pb.pre[i];
    if (idA === undefined) return 1;
    if (idB === undefined) return -1;
    const numA = /^\d+$/.test(idA);
    const numB = /^\d+$/.test(idB);
    if (numA && numB) {
      const diff = Number.parseInt(idB, 10) - Number.parseInt(idA, 10);
      if (diff !== 0) return diff;
    } else if (numA !== numB) {
      // Numeric identifiers always have lower precedence than non-numeric identifiers
      return numA ? 1 : -1;
    } else if (idA !== idB) {
      return idA < idB ? 1 : -1;
    }
  }
  return 0;
}

function discoverExtensionArchive(slug: AppSlug): ExtensionArchiveMeta {
  const dir = path.join(PUBLIC_DIR, slug);
  if (!fs.existsSync(dir)) {
    throw new Error(`Missing extension public directory for ${slug}: ${dir}`);
  }

  const pattern = new RegExp(`^${slug}-v(\\d+\\.\\d+\\.\\d+(?:-[\\w.-]+)?)\\.zip$`);
  const matches = fs
    .readdirSync(dir)
    .map((filename) => {
      const m = filename.match(pattern);
      return m ? { filename, version: m[1] } : null;
    })
    .filter((entry): entry is { filename: string; version: string } => entry !== null)
    .sort((a, b) => compareSemverDesc(a.version, b.version));

  if (matches.length === 0) {
    throw new Error(`No extension zip matching ${slug}-v*.zip found in ${dir}`);
  }

  const chosen = matches[0];
  const downloadRelPath = `${slug}/${chosen.filename}`;
  const fullPath = path.join(PUBLIC_DIR, downloadRelPath);
  const stat = fs.statSync(fullPath);

  return {
    version: chosen.version,
    downloadFilename: chosen.filename,
    downloadRelPath,
    fileSizeBytes: stat.size,
    fileSize: formatFileSize(stat.size),
    releaseDate: stat.mtime.toISOString().slice(0, 10),
  };
}

interface StaticAppSpec {
  slug: AppSlug;
  name: string;
  category: 'app' | 'extension';
  platformLabel: string;
  compatibilityPill: string;
  footerPlatform: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  githubUrl: string;
  iconRelPath: string;
  bundleOrFolderName: string;
  gatekeeperCommand?: string;
  requiresAccessibility: boolean;
  theme: AppThemeTokens;
  buildQuickInstall: (downloadFilename: string) => AppQuickInstall;
}

const APP_SPECS: StaticAppSpec[] = [
  {
    slug: 'monkey-tools',
    name: 'Monkey Tools',
    category: 'app',
    platformLabel: 'macOS 13.0+',
    compatibilityPill: 'macOS 13.0+ (Apple Silicon & Intel)',
    footerPlatform: 'macOS 13.0+',
    description:
      'Clipboard history, offline image OCR, emoji picker, and instant text translator in your macOS Menu Bar.',
    seoTitle: 'Monkey Tools — Clipboard History, OCR & Translator for macOS',
    seoDescription:
      'macOS Menu Bar clipboard history, offline image OCR, emoji picker, and instant text translator.',
    githubUrl: 'https://github.com/pakkawatkh/Monkey-Tools',
    iconRelPath: 'monkey-tools/assets/icon.png',
    bundleOrFolderName: 'monkey-tools.app',
    gatekeeperCommand: 'xattr -cr "/Applications/monkey-tools.app"',
    requiresAccessibility: true,
    theme: {
      accent: '#0284c7',
      accent2: '#4f46e5',
      accentSoft: '#f0f9ff',
      accentBorder: '#bae6fd',
      glowRgb: '2, 132, 199',
      badgeBg: '#f0fdf4',
      badgeColor: '#16a34a',
      badgeBorder: '#bbf7d0',
    },
    buildQuickInstall: (downloadFilename) => ({
      packageLabel: downloadFilename,
      bundleOrFolderName: 'monkey-tools.app',
      gatekeeperCommand: 'xattr -cr "/Applications/monkey-tools.app"',
      requiresAccessibility: true,
      steps: [
        {
          text: `Open ${downloadFilename} and drag monkey-tools.app to Applications.`,
        },
        {
          text: 'If blocked by Gatekeeper, allow in System Settings → Privacy & Security or run:',
          terminalCommand: 'xattr -cr "/Applications/monkey-tools.app"',
        },
        {
          text: 'Enable monkey-tools in System Settings → Privacy & Security → Accessibility.',
        },
      ],
    }),
  },
  {
    slug: 'pliw-collage',
    name: 'Pliw Collage',
    category: 'app',
    platformLabel: 'macOS 13.0+',
    compatibilityPill: 'macOS 13.0+ (Apple Silicon & Intel)',
    footerPlatform: 'macOS 13.0+',
    description:
      'Combine multiple video clips into 9:16, 4:5, 1:1, 16:9, or custom grids up to 6×6 and export MP4 on macOS.',
    seoTitle: 'Pliw Collage — Video Collage Studio for macOS',
    seoDescription:
      'Native macOS video collage studio for 9:16, 4:5, 1:1, 16:9, and custom grids up to 6×6 with fast MP4 export.',
    githubUrl: 'https://github.com/pakkawatkh/Pliw-Collage',
    iconRelPath: 'pliw-collage/assets/icon.png',
    bundleOrFolderName: 'Pliw Collage.app',
    gatekeeperCommand: 'xattr -cr "/Applications/Pliw Collage.app"',
    requiresAccessibility: false,
    theme: {
      accent: '#ec4899',
      accent2: '#6366f1',
      accentSoft: '#fdf2f8',
      accentBorder: '#fbcfe8',
      glowRgb: '236, 72, 153',
      badgeBg: '#fdf2f8',
      badgeColor: '#be185d',
      badgeBorder: '#fbcfe8',
    },
    buildQuickInstall: (downloadFilename) => ({
      packageLabel: downloadFilename,
      bundleOrFolderName: 'Pliw Collage.app',
      gatekeeperCommand: 'xattr -cr "/Applications/Pliw Collage.app"',
      requiresAccessibility: false,
      steps: [
        {
          text: `Open ${downloadFilename} and drag Pliw Collage.app to Applications.`,
        },
        {
          text: 'If blocked by Gatekeeper, allow in System Settings → Privacy & Security or run:',
          terminalCommand: 'xattr -cr "/Applications/Pliw Collage.app"',
        },
      ],
    }),
  },
  {
    slug: 'pliw-click',
    name: 'Pliw Click',
    category: 'app',
    platformLabel: 'macOS 13.0+',
    compatibilityPill: 'macOS 13.0+ (Apple Silicon & Intel)',
    footerPlatform: 'macOS 13.0+',
    description:
      'Windows-style browser autoscroll, 2–10 finger Trackpad middle-click & tap, and full Middle-Drag for macOS.',
    seoTitle: 'Pliw Click — Middle-Click, Middle-Drag & Browser Autoscroll for macOS',
    seoDescription:
      'Windows-style browser autoscroll, multi-finger Trackpad middle-click & tap, and full Middle-Drag for macOS.',
    githubUrl: 'https://github.com/pakkawatkh/Pliw-Click',
    iconRelPath: 'pliw-click/assets/icon.png',
    bundleOrFolderName: 'Pliw Click.app',
    gatekeeperCommand: 'xattr -cr "/Applications/Pliw Click.app"',
    requiresAccessibility: true,
    theme: {
      accent: '#06b6d4',
      accent2: '#2563eb',
      accentSoft: '#ecfeff',
      accentBorder: '#a5f3fc',
      glowRgb: '6, 182, 212',
      badgeBg: '#ecfeff',
      badgeColor: '#0e7490',
      badgeBorder: '#a5f3fc',
    },
    buildQuickInstall: (downloadFilename) => ({
      packageLabel: downloadFilename,
      bundleOrFolderName: 'Pliw Click.app',
      gatekeeperCommand: 'xattr -cr "/Applications/Pliw Click.app"',
      requiresAccessibility: true,
      steps: [
        {
          text: `Open ${downloadFilename} and drag Pliw Click.app to Applications.`,
        },
        {
          text: 'If blocked by Gatekeeper, allow in System Settings → Privacy & Security or run:',
          terminalCommand: 'xattr -cr "/Applications/Pliw Click.app"',
        },
        {
          text: 'Enable Pliw Click in System Settings → Privacy & Security → Accessibility.',
        },
      ],
    }),
  },
  {
    slug: 'pliw-face',
    name: 'Pliw Face',
    category: 'app',
    platformLabel: 'macOS 13.0+',
    compatibilityPill: 'macOS 13.0+ (Apple Silicon & Intel)',
    footerPlatform: 'macOS 13.0+',
    description:
      'On-device Face Unlock for macOS with 17-angle enrollment, anti-spoofing liveness checks, and a Dynamic Island Notch HUD.',
    seoTitle: 'Pliw Face — On-Device Face Unlock for macOS',
    seoDescription:
      'Unlock your Mac on-device with Apple Neural Engine face recognition, anti-spoofing liveness checks, and Dynamic Island or Notch Wings HUD.',
    githubUrl: 'https://github.com/pakkawatkh/Pliw-face',
    iconRelPath: 'pliw-face/assets/icon.png',
    bundleOrFolderName: 'Pliw Face.app',
    gatekeeperCommand: 'xattr -cr "/Applications/Pliw Face.app"',
    requiresAccessibility: true,
    theme: {
      accent: '#10b981',
      accent2: '#0d9488',
      accentSoft: '#ecfdf5',
      accentBorder: '#a7f3d0',
      glowRgb: '16, 185, 129',
      badgeBg: '#ecfdf5',
      badgeColor: '#047857',
      badgeBorder: '#a7f3d0',
    },
    buildQuickInstall: (downloadFilename) => ({
      packageLabel: downloadFilename,
      bundleOrFolderName: 'Pliw Face.app',
      gatekeeperCommand: 'xattr -cr "/Applications/Pliw Face.app"',
      requiresAccessibility: true,
      steps: [
        {
          text: `Open ${downloadFilename} and drag Pliw Face.app to Applications.`,
        },
        {
          text: 'If blocked by Gatekeeper, allow in System Settings → Privacy & Security or run:',
          terminalCommand: 'xattr -cr "/Applications/Pliw Face.app"',
        },
        {
          text: 'Grant Camera and Accessibility permissions in System Settings, then enroll your face inside Setup.',
        },
      ],
    }),
  },
  {
    slug: 'pliw-mix',
    name: 'Pliw Mix',
    category: 'app',
    platformLabel: 'macOS 14.2+',
    compatibilityPill: 'macOS 14.2+ (Apple Silicon & Intel)',
    footerPlatform: 'macOS 14.2+',
    description:
      'Control per-app volume, mute, and audio output routing from the macOS Menu Bar using Core Audio Process Taps.',
    seoTitle: 'Pliw Mix — Per-App Audio Mixer for macOS',
    seoDescription:
      'Native macOS 14.2+ Menu Bar per-app audio mixer with volume control, mute, and per-app output routing without virtual audio drivers.',
    githubUrl: 'https://github.com/pakkawatkh/Pliw-Mix',
    iconRelPath: 'pliw-mix/assets/icon.png',
    bundleOrFolderName: 'Pliw Mix.app',
    gatekeeperCommand: 'xattr -cr "/Applications/Pliw Mix.app"',
    requiresAccessibility: false,
    theme: {
      accent: '#f97316',
      accent2: '#e11d48',
      accentSoft: '#fff7ed',
      accentBorder: '#fed7aa',
      glowRgb: '249, 115, 22',
      badgeBg: '#fff7ed',
      badgeColor: '#c2410c',
      badgeBorder: '#fed7aa',
    },
    buildQuickInstall: (downloadFilename) => ({
      packageLabel: downloadFilename,
      bundleOrFolderName: 'Pliw Mix.app',
      gatekeeperCommand: 'xattr -cr "/Applications/Pliw Mix.app"',
      requiresAccessibility: false,
      steps: [
        {
          text: `Open ${downloadFilename} and drag Pliw Mix.app to Applications.`,
        },
        {
          text: 'If blocked by Gatekeeper, allow in System Settings → Privacy & Security or run:',
          terminalCommand: 'xattr -cr "/Applications/Pliw Mix.app"',
        },
        {
          text: 'Allow Pliw Mix under System Settings → Privacy & Security → Screen & System Audio Recording (System Audio Recording Only).',
        },
      ],
    }),
  },
  {
    slug: 'pliw-scroll',
    name: 'Pliw Scroll',
    category: 'extension',
    platformLabel: 'Chrome · Brave · Edge',
    compatibilityPill: 'Chrome · Brave · Edge (Manifest V3)',
    footerPlatform: 'Chrome / Brave / Edge',
    description:
      'Capture full-page scrolling screenshots, draw and annotate freely, crop with 8 handles, and copy in one click.',
    seoTitle: 'Pliw Scroll — Full-Page Scrolling Screenshot Extension',
    seoDescription:
      'Full-page scrolling screenshot extension with freehand drawing & annotation studio, 8-handle crop, and one-click clipboard copy.',
    githubUrl: 'https://github.com/pakkawatkh/Pliw-Extension',
    iconRelPath: 'pliw-scroll/assets/icon128.png',
    bundleOrFolderName: 'pliw-scroll',
    requiresAccessibility: false,
    theme: {
      accent: '#0284c7',
      accent2: '#6366f1',
      accentSoft: '#eff6ff',
      accentBorder: '#bfdbfe',
      glowRgb: '2, 132, 199',
      badgeBg: '#eff6ff',
      badgeColor: '#0284c7',
      badgeBorder: '#bfdbfe',
    },
    buildQuickInstall: (downloadFilename) => ({
      packageLabel: downloadFilename,
      bundleOrFolderName: 'pliw-scroll',
      requiresAccessibility: false,
      steps: [
        {
          text: `Download and unzip ${downloadFilename}.`,
        },
        {
          text: 'Open chrome://extensions/ (or brave://extensions/ / edge://extensions/) and enable Developer mode.',
          codeHighlight: 'chrome://extensions/',
          copyValue: 'chrome://extensions/',
        },
        {
          text: 'Click Load unpacked and select the unzipped pliw-scroll folder.',
          codeHighlight: 'pliw-scroll',
        },
      ],
    }),
  },
  {
    slug: 'pliw-geo',
    name: 'Pliw Geo',
    category: 'extension',
    platformLabel: 'Chrome · Brave · Edge',
    compatibilityPill: 'Chrome · Brave · Edge (Manifest V3)',
    footerPlatform: 'Chrome / Brave / Edge',
    description:
      'Simulate any browser GPS location with an interactive map picker, favorites, GPS jitter, and live N/S/E/W controls.',
    seoTitle: 'Pliw Geo — Browser GPS Location Simulator Extension',
    seoDescription:
      'Spoof browser geolocation with an interactive map picker, GPS jitter, and live N/S/E/W movement controls.',
    githubUrl: 'https://github.com/pakkawatkh/Pliw-Extension',
    iconRelPath: 'pliw-geo/assets/icon128.png',
    bundleOrFolderName: 'pliw-geo',
    requiresAccessibility: false,
    theme: {
      accent: '#059669',
      accent2: '#0284c7',
      accentSoft: '#ecfdf5',
      accentBorder: '#a7f3d0',
      glowRgb: '16, 185, 129',
      badgeBg: '#ecfdf5',
      badgeColor: '#047857',
      badgeBorder: '#a7f3d0',
    },
    buildQuickInstall: (downloadFilename) => ({
      packageLabel: downloadFilename,
      bundleOrFolderName: 'pliw-geo',
      requiresAccessibility: false,
      steps: [
        {
          text: `Download and unzip ${downloadFilename}.`,
        },
        {
          text: 'Open chrome://extensions/ (or brave://extensions/ / edge://extensions/) and enable Developer mode.',
          codeHighlight: 'chrome://extensions/',
          copyValue: 'chrome://extensions/',
        },
        {
          text: 'Click Load unpacked and select the unzipped pliw-geo folder.',
          codeHighlight: 'pliw-geo',
        },
      ],
    }),
  },
];

function buildAppEntry(spec: StaticAppSpec): AppEntry {
  // Verify icon file exists in public/
  statPublicFile(spec.iconRelPath);

  const pageRelPath = `${spec.slug}/`;
  const pageUrl = withBase(pageRelPath);
  const canonicalUrl = `${SITE_ORIGIN}${withBase(pageRelPath)}`;
  const iconUrl = withBase(spec.iconRelPath);

  if (spec.category === 'app') {
    const mac = loadMacRelease(spec.slug);
    return {
      slug: spec.slug,
      name: spec.name,
      category: 'app',
      platformLabel: spec.platformLabel,
      compatibilityPill: spec.compatibilityPill,
      footerPlatform: spec.footerPlatform,
      description: spec.description,
      seoTitle: spec.seoTitle,
      seoDescription: spec.seoDescription,
      githubUrl: spec.githubUrl,
      version: mac.version,
      versionTag: `v${mac.version}`,
      releaseDate: mac.releaseDate,
      releaseNotes: mac.releaseNotes,
      downloadType: 'DMG',
      downloadFilename: mac.downloadFilename,
      downloadRelPath: mac.downloadRelPath,
      downloadUrl: withBase(mac.downloadRelPath),
      fileSizeBytes: mac.fileSizeBytes,
      fileSize: mac.fileSize,
      zipRelPath: mac.zipRelPath,
      zipSize: mac.zipSize,
      iconRelPath: spec.iconRelPath,
      iconUrl,
      pageRelPath,
      pageUrl,
      canonicalUrl,
      theme: spec.theme,
      quickInstall: spec.buildQuickInstall(mac.downloadFilename),
    };
  }

  const ext = discoverExtensionArchive(spec.slug);
  return {
    slug: spec.slug,
    name: spec.name,
    category: 'extension',
    platformLabel: spec.platformLabel,
    compatibilityPill: spec.compatibilityPill,
    footerPlatform: spec.footerPlatform,
    description: spec.description,
    seoTitle: spec.seoTitle,
    seoDescription: spec.seoDescription,
    githubUrl: spec.githubUrl,
    version: ext.version,
    versionTag: `v${ext.version}`,
    releaseDate: ext.releaseDate,
    downloadType: 'ZIP',
    downloadFilename: ext.downloadFilename,
    downloadRelPath: ext.downloadRelPath,
    downloadUrl: withBase(ext.downloadRelPath),
    fileSizeBytes: ext.fileSizeBytes,
    fileSize: ext.fileSize,
    iconRelPath: spec.iconRelPath,
    iconUrl,
    pageRelPath,
    pageUrl,
    canonicalUrl,
    theme: spec.theme,
    quickInstall: spec.buildQuickInstall(ext.downloadFilename),
  };
}

export const APPS: AppEntry[] = APP_SPECS.map(buildAppEntry);
export const MAC_APPS: AppEntry[] = APPS.filter((app) => app.category === 'app');
export const EXTENSIONS: AppEntry[] = APPS.filter((app) => app.category === 'extension');

export function getAppBySlug(slug: AppSlug): AppEntry {
  const found = APPS.find((app) => app.slug === slug);
  if (!found) {
    throw new Error(`Unknown app slug: ${slug}`);
  }
  return found;
}
