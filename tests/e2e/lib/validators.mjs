import fs from 'node:fs';
import path from 'node:path';

export const PORTAL_ORIGIN = 'https://pakkawatkh.github.io';
export const PORTAL_BASE_URL = 'https://pakkawatkh.github.io/public';

export const EXPECTED_ROUTES = [
  'index.html',
  'monkey-tools/index.html',
  'pliw-click/index.html',
  'pliw-collage/index.html',
  'pliw-scroll/index.html',
  'pliw-geo/index.html',
];

export const APPS_CATALOG = [
  {
    slug: 'monkey-tools',
    name: 'Monkey Tools',
    type: 'macos',
    category: 'Apps',
    platformShort: /macOS\s*13\.0\+/i,
    compatPill: /macOS\s*13\.0\+\s*\(Apple Silicon\s*&\s*Intel\)/gi,
    installerFile: 'monkey-tools-Installer.dmg',
    zipFile: 'monkey-tools.zip',
    repoUrlPart: 'github.com/pakkawatkh/Monkey-Tools',
    dateField: 'releaseDate',
    datePattern: /^\d{4}-\d{2}-\d{2}$/,
    forbiddenDateField: 'publishedAt',
    requirePageUrl: true,
  },
  {
    slug: 'pliw-collage',
    name: 'Pliw Collage',
    type: 'macos',
    category: 'Apps',
    platformShort: /macOS\s*13\.0\+/i,
    compatPill: /macOS\s*13\.0\+\s*\(Apple Silicon\s*&\s*Intel\)/gi,
    installerFile: 'pliw-collage-Installer.dmg',
    zipFile: 'pliw-collage.zip',
    repoUrlPart: 'github.com/pakkawatkh/Pliw-Collage',
    dateField: 'releaseDate',
    datePattern: /^\d{4}-\d{2}-\d{2}$/,
    forbiddenDateField: 'publishedAt',
    requirePageUrl: true,
  },
  {
    slug: 'pliw-click',
    name: 'Pliw Click',
    type: 'macos',
    category: 'Apps',
    platformShort: /macOS\s*13\.0\+/i,
    compatPill: /macOS\s*13\.0\+\s*\(Apple Silicon\s*&\s*Intel\)/gi,
    installerFile: 'pliw-click-Installer.dmg',
    zipFile: 'pliw-click.zip',
    repoUrlPart: 'github.com/pakkawatkh/Pliw-Click',
    dateField: 'publishedAt',
    datePattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
    forbiddenDateField: 'releaseDate',
    requirePageUrl: false,
  },
  {
    slug: 'pliw-scroll',
    name: 'Pliw Scroll',
    type: 'extension',
    category: 'Extensions',
    platformShort: /Chrome\s*·\s*Brave\s*·\s*Edge/i,
    compatPill: /Chrome\s*·\s*Brave\s*·\s*Edge\s*\(Manifest V3\)/gi,
    repoUrlPart: 'github.com/pakkawatkh/Pliw-Extension',
  },
  {
    slug: 'pliw-geo',
    name: 'Pliw Geo',
    type: 'extension',
    category: 'Extensions',
    platformShort: /Chrome\s*·\s*Brave\s*·\s*Edge/i,
    compatPill: /Chrome\s*·\s*Brave\s*·\s*Edge\s*\(Manifest V3\)/gi,
    repoUrlPart: 'github.com/pakkawatkh/Pliw-Extension',
  },
];

export const AI_SLOP_PATTERNS = [
  { label: 'thoughtfully handcrafted', re: /\bthoughtfully\s+handcrafted\b/i },
  { label: 'handcrafted', re: /\bhandcrafted\b/i },
  { label: 'curated suite', re: /\bcurated\s+suite\b/i },
  { label: 'elevate your workflow', re: /\belevate\s+your(?:\s+daily)?\s+workflow\b/i },
  { label: 'zero bloatware', re: /\bzero\s+bloatware\b/i },
  { label: 'apple-grade craftsmanship', re: /\bapple-grade\s+craftsmanship\b/i },
  { label: 'liquid glass', re: /\bliquid\s+glass\b/i },
  { label: 'fluid glassmorphism', re: /\bfluid\s+glassmorphism\b/i },
  { label: 'acrylic clipboard', re: /\bacrylic\s+clipboard\b/i },
  { label: 'discover premium', re: /\bdiscover\s+premium\b/i },
  { label: 'ultra-fast', re: /\bultra-fast\b/i },
  { label: 'supercharge your', re: /\bsupercharge\s+your\b/i },
];

export const SHORTCUT_GLYPH_RE = /[⌘⌥⌃⇧]/u;
export const SHORTCUT_COMBO_RE =
  /\b(?:Cmd|Command|Ctrl|Control|Opt|Option|Alt|Shift|Win|Super)\s*\+\s*(?:[A-Za-z0-9]|F\d{1,2}|Space|Enter|Return|Tab|Esc|Escape|Up|Down|Left|Right)\b/i;
export const STRICT_CODE_SHORTCUT_COMBO_RE =
  /\b(?:Cmd|Command|Ctrl|Control|Alt|Win|Super)\s*\+\s*(?:[A-Za-z0-9]|F\d{1,2}|Space|Enter|Return|Tab|Esc|Escape|Up|Down|Left|Right)\b/i;

export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&middot;/g, '·')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

export function stripHtmlTags(html) {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

export function stripNonVisibleHtml(html, { stripCode = false } = {}) {
  let out = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ');
  if (stripCode) {
    out = out
      .replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, ' ')
      .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, ' ');
  }
  return out;
}

export function extractVisibleText(html, { stripCode = false } = {}) {
  return stripHtmlTags(stripNonVisibleHtml(html, { stripCode }));
}

export function stripJsComments(source) {
  let out = '';
  let i = 0;
  let quote = null;
  let inLine = false;
  let inBlock = false;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (inLine) {
      if (ch === '\n') {
        inLine = false;
        out += ch;
      }
      i += 1;
      continue;
    }
    if (inBlock) {
      if (ch === '*' && next === '/') {
        inBlock = false;
        out += ' ';
        i += 2;
      } else {
        if (ch === '\n') out += '\n';
        i += 1;
      }
      continue;
    }
    if (quote) {
      out += ch;
      if (ch === '\\') {
        out += next ?? '';
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '/') {
      inLine = true;
      i += 2;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlock = true;
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

export function formatBinaryHumanSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    throw new Error(`Invalid byte size: ${bytes}`);
  }
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1023.5) {
    return `${kb < 9.95 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  const mb = kb / 1024;
  return `${mb < 9.95 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export function scanThai(text) {
  const matches = [];
  const lines = String(text).split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const lineMatches = lines[i].match(/[\u0E00-\u0E7F]+/gu);
    if (lineMatches) {
      matches.push({ line: i + 1, tokens: lineMatches, snippet: lines[i].trim().slice(0, 120) });
    }
  }
  return { ok: matches.length === 0, matches };
}

export function extractHtmlMetadataStrings(html) {
  const strings = [];
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) strings.push(decodeHtmlEntities(titleMatch[1].trim()));

  const metaRegex = /<meta\b([^>]*)>/gi;
  let m;
  while ((m = metaRegex.exec(html)) !== null) {
    const attrs = m[1];
    const isDesc =
      /\bname\s*=\s*["']description["']/i.test(attrs) ||
      /\bproperty\s*=\s*["']og:description["']/i.test(attrs) ||
      /\bproperty\s*=\s*["']og:title["']/i.test(attrs) ||
      /\bname\s*=\s*["']twitter:description["']/i.test(attrs);
    if (isDesc) {
      const contentMatch = attrs.match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      if (contentMatch) {
        strings.push(decodeHtmlEntities((contentMatch[1] ?? contentMatch[2] ?? '').trim()));
      }
    }
  }
  return strings;
}

export function scanAiSlop(content, { isHtml = true } = {}) {
  const chunks = [];
  if (isHtml) {
    chunks.push(...extractHtmlMetadataStrings(content));
    chunks.push(extractVisibleText(content, { stripCode: false }));
  } else {
    chunks.push(content);
  }
  const combined = chunks.join('\n');
  const violations = [];
  for (const { label, re } of AI_SLOP_PATTERNS) {
    const m = combined.match(re);
    if (m) {
      violations.push({ cliché: label, match: m[0] });
    }
  }
  return { ok: violations.length === 0, violations };
}

export function scanShortcuts(content, { isHtml = true, isMarkdown = false } = {}) {
  const violations = [];

  if (isHtml) {
    const metaStrings = extractHtmlMetadataStrings(content);
    for (const s of metaStrings) {
      if (SHORTCUT_GLYPH_RE.test(s) || SHORTCUT_COMBO_RE.test(s)) {
        violations.push({ source: 'meta/title', text: s });
      }
    }

    // Check inline <code> only for explicit shortcut glyphs or Cmd/Ctrl/Alt/Win+ combos
    const codeMatches = content.matchAll(/<code\b[^>]*>([\s\S]*?)<\/code>/gi);
    for (const cm of codeMatches) {
      const codeText = stripHtmlTags(cm[1]);
      if (SHORTCUT_GLYPH_RE.test(codeText) || STRICT_CODE_SHORTCUT_COMBO_RE.test(codeText)) {
        violations.push({ source: '<code>', text: codeText });
      }
    }

    // Also check <pre> blocks for explicit shortcut glyphs or Cmd/Ctrl/Alt/Win+ combos
    const preMatches = content.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi);
    for (const pm of preMatches) {
      const preText = stripHtmlTags(pm[1]);
      if (SHORTCUT_GLYPH_RE.test(preText) || STRICT_CODE_SHORTCUT_COMBO_RE.test(preText)) {
        violations.push({ source: '<pre>', text: preText });
      }
    }

    const bodyText = extractVisibleText(content, { stripCode: true });
    for (const re of [SHORTCUT_GLYPH_RE, SHORTCUT_COMBO_RE]) {
      const m = bodyText.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`));
      if (m) {
        violations.push({ source: 'visible-text', match: m[0] });
      }
    }
  } else if (isMarkdown) {
    const withoutFenced = content.replace(/```[\s\S]*?```/g, ' ');
    const inlineCodes = withoutFenced.matchAll(/`([^`\n]+)`/g);
    for (const ic of inlineCodes) {
      if (SHORTCUT_GLYPH_RE.test(ic[1]) || STRICT_CODE_SHORTCUT_COMBO_RE.test(ic[1])) {
        violations.push({ source: 'inline-code', text: ic[1] });
      }
    }
    const prose = withoutFenced.replace(/`[^`\n]+`/g, ' ');
    for (const re of [SHORTCUT_GLYPH_RE, SHORTCUT_COMBO_RE]) {
      const m = prose.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`));
      if (m) {
        violations.push({ source: 'markdown-prose', match: m[0] });
      }
    }
  } else {
    for (const re of [SHORTCUT_GLYPH_RE, SHORTCUT_COMBO_RE]) {
      const m = content.match(re);
      if (m) violations.push({ source: 'text', match: m[0] });
    }
  }

  return { ok: violations.length === 0, violations };
}

export function validateAstroConfig(content) {
  const clean = stripJsComments(content);
  const errors = [];
  if (!/site\s*:\s*['"`]https:\/\/pakkawatkh\.github\.io\/?['"`]/.test(clean)) {
    errors.push("astro.config must set site: 'https://pakkawatkh.github.io'");
  }
  if (!/base\s*:\s*['"`]\/public\/?['"`]/.test(clean)) {
    errors.push("astro.config must set base: '/public'");
  }
  if (!/trailingSlash\s*:\s*['"`]always['"`]/.test(clean)) {
    errors.push("astro.config must set trailingSlash: 'always'");
  }
  return { ok: errors.length === 0, errors };
}

export function validateDeployWorkflow(yamlContent) {
  const clean = yamlContent
    .split(/\r?\n/)
    .map((line) => line.replace(/(^|\s)#.*$/, ''))
    .join('\n');

  const criteria = [
    {
      id: 'T1-CI1',
      description: '.github/workflows/deploy.yml triggers on push to main branch',
      ok: /\bon\s*:[\s\S]*?\bpush\s*:[\s\S]*?\bbranches\s*:\s*(?:\[[^\]]*['"]?main['"]?[^\]]*\]|(?:\r?\n\s*-\s*['"]?main['"]?))/m.test(
        clean,
      ),
      error: 'deploy.yml must trigger on push to main branch',
    },
    {
      id: 'T1-CI2',
      description: '.github/workflows/deploy.yml grants pages: write and id-token: write permissions',
      ok: /\bpages\s*:\s*write\b/.test(clean) && /\bid-token\s*:\s*write\b/.test(clean),
      error: 'deploy.yml must grant permissions: pages: write and id-token: write',
    },
    {
      id: 'T1-CI3',
      description: '.github/workflows/deploy.yml installs dependencies and runs npm run build',
      ok: /\bnpm\s+(?:ci|install)\b/.test(clean) && /\bnpm\s+run\s+build\b/.test(clean),
      error: 'deploy.yml must install dependencies (npm ci/install) and run npm run build',
    },
    {
      id: 'T1-CI4',
      description: '.github/workflows/deploy.yml uploads ./dist via actions/upload-pages-artifact',
      ok: /actions\/upload-pages-artifact@/i.test(clean) && /\bpath\s*:\s*['"]?(?:\.\/)?dist\/?['"]?/.test(clean),
      error: 'deploy.yml must use actions/upload-pages-artifact with dist path',
    },
    {
      id: 'T1-CI5',
      description: '.github/workflows/deploy.yml deploys via actions/deploy-pages',
      ok: /actions\/deploy-pages@/i.test(clean),
      error: 'deploy.yml must use actions/deploy-pages',
    },
  ];

  const errors = criteria.filter((c) => !c.ok).map((c) => c.error);
  return { ok: errors.length === 0, errors, criteria };
}

function stripShellInlineComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote) {
      if (ch === '\\' && quote === '"') {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '\\') {
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === '#' && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i).trim();
    }
  }
  return line.trim();
}

export function validateScriptTarget(scriptContent, { slug, requireMkdirP = false } = {}) {
  const errors = [];
  const lines = scriptContent.split(/\r?\n/);
  const vars = {};
  let foundTarget = false;
  let hasMkdirP = false;

  for (let idx = 0; idx < lines.length; idx += 1) {
    const raw = lines[idx];
    const trimmed = stripShellInlineComment(raw);
    if (!trimmed) continue;

    // Ignore [ -d ".../public" ] and [[ -d ".../public" ]] existence guards
    if (/^\s*(?:if|elif)?\s*\[{1,2}\s*(?:!\s*)?-[df]\s+/.test(trimmed)) {
      continue;
    }

    // Track simple shell variable assignments like VAR=".../public"
    const assignMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/);
    if (assignMatch) {
      const [, name, valRaw] = assignMatch;
      const val = valRaw.replace(/^["']|["']$/g, '');
      vars[name] = val;
    }

    if (/\bmkdir\s+-p\b/.test(trimmed)) {
      hasMkdirP = true;
    }

    // Expand known ${VAR} or $VAR occurrences to resolve composed paths like ${PORTAL_REPO_DIR}/public/pliw-scroll
    let expanded = trimmed;
    for (let pass = 0; pass < 3; pass += 1) {
      expanded = expanded.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (m, a, b) => {
        const key = a || b;
        return vars[key] ?? m;
      });
    }

    if (expanded.includes(`/${slug}`)) {
      if (expanded.includes(`/public/public/${slug}`)) {
        foundTarget = true;
      } else if (new RegExp(`/public/${escapeRegex(slug)}(?:\\b|/|"|'|$)`).test(expanded)) {
        errors.push(`Line ${idx + 1} targets legacy /public/${slug} instead of /public/public/${slug}: ${trimmed}`);
      }
    }
  }

  if (!foundTarget) {
    errors.push(`Script does not assign or reference target path /public/public/${slug}`);
  }
  if (requireMkdirP && !hasMkdirP) {
    errors.push('Script must ensure target directory exists via mkdir -p');
  }

  return { ok: errors.length === 0, errors };
}

const STALE_REL_PORTAL_RE =
  /(^|[^/\w])(\.\.\/public\/(?!public\/)(?:monkey-tools|pliw-click|pliw-collage|pliw-scroll|pliw-geo|<app-slug>|<ext-name>|<new-app>|<web-app>))/gi;
const STALE_APPS_PORTAL_RE =
  /(^|[^/\w])(apps\/public\/(?!public\/)(?:monkey-tools|pliw-click|pliw-collage|pliw-scroll|pliw-geo|<app-slug>|<ext-name>|<new-app>|<web-app>))/gi;

export function validateReleaseDocs(docContent, { docName, isPortalAgentsDoc = false } = {}) {
  const errors = [];

  if (!/\bnpm\s+run\s+build\b/.test(docContent)) {
    errors.push(`${docName} must document "npm run build"`);
  }

  if (isPortalAgentsDoc) {
    if (!/public\/<app-slug>\/|public\/public\//.test(docContent)) {
      errors.push(`${docName} must document public/<app-slug>/ static path`);
    }
  } else {
    if (!/public\/public\/(?:<app-slug>|<ext-name>|<new-app>|monkey-tools|pliw-click|pliw-collage|pliw-scroll|pliw-geo)/.test(docContent)) {
      errors.push(`${docName} must document public/public/<app-slug>/ target path`);
    }
  }

  const lines = docContent.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const m1 = line.match(STALE_REL_PORTAL_RE);
    const m2 = line.match(STALE_APPS_PORTAL_RE);
    if (m1 || m2) {
      errors.push(`${docName}:${i + 1} contains stale pre-migration portal path: ${(m1 || m2)[0].trim()}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function validateSecondaryDocs(docContent, { docName, expectedSlugs = [] } = {}) {
  const errors = [];

  if (!/\bnpm\s+run\s+build\b/.test(docContent)) {
    errors.push(`${docName} must reference "npm run build"`);
  }

  if (!/public\/public\//.test(docContent)) {
    errors.push(`${docName} must reference public/public/ artifact path`);
  }

  for (const slug of expectedSlugs) {
    if (!docContent.includes(`public/public/${slug}`)) {
      errors.push(`${docName} must reference public/public/${slug}`);
    }
  }

  const lines = docContent.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const m1 = line.match(STALE_REL_PORTAL_RE);
    const m2 = line.match(STALE_APPS_PORTAL_RE);
    if (m1 || m2) {
      errors.push(`${docName}:${i + 1} contains stale pre-migration portal path: ${(m1 || m2)[0].trim()}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function validateSitemapXml(xmlContent, expectedUrls) {
  const errors = [];
  if (!/<urlset\b/i.test(xmlContent) || !/<\/urlset>/i.test(xmlContent)) {
    errors.push('sitemap.xml must contain valid <urlset>...</urlset> wrapper');
  }
  const locs = new Set(
    [...xmlContent.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].trim()),
  );
  for (const expected of expectedUrls) {
    if (!locs.has(expected)) {
      errors.push(`sitemap.xml missing <loc>${expected}</loc>`);
    }
  }
  return { ok: errors.length === 0, errors, locs: [...locs] };
}

export function validateVersionJson(slug, data, publicData = null) {
  const errors = [];
  const spec = APPS_CATALOG.find((a) => a.slug === slug && a.type === 'macos');
  if (!spec) {
    return { ok: false, errors: [`Unknown macOS version.json app slug: ${slug}`] };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, errors: [`${slug}/version.json must be a JSON object`] };
  }

  if (typeof data.latestVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(data.latestVersion)) {
    errors.push(`${slug}/version.json latestVersion invalid: ${data.latestVersion}`);
  }
  const expectedDmg = `${PORTAL_BASE_URL}/${slug}/${slug}-Installer.dmg`;
  const expectedZip = `${PORTAL_BASE_URL}/${slug}/${slug}.zip`;
  if (data.downloadUrl !== expectedDmg) {
    errors.push(`${slug}/version.json downloadUrl mismatch: expected ${expectedDmg}, got ${data.downloadUrl}`);
  }
  if (data.zipUrl !== expectedZip) {
    errors.push(`${slug}/version.json zipUrl mismatch: expected ${expectedZip}, got ${data.zipUrl}`);
  }
  if (typeof data.releaseNotes !== 'string' || data.releaseNotes.trim().length === 0) {
    errors.push(`${slug}/version.json releaseNotes must be a non-empty string`);
  }

  if (typeof data[spec.dateField] !== 'string' || !spec.datePattern.test(data[spec.dateField])) {
    errors.push(`${slug}/version.json missing or malformed ${spec.dateField}: ${data[spec.dateField]}`);
  }
  if (spec.forbiddenDateField in data) {
    errors.push(`${slug}/version.json must NOT contain ${spec.forbiddenDateField}`);
  }
  if (spec.requirePageUrl) {
    const expectedPage = `${PORTAL_BASE_URL}/${slug}/`;
    if (data.pageUrl !== expectedPage) {
      errors.push(`${slug}/version.json pageUrl mismatch: expected ${expectedPage}, got ${data.pageUrl}`);
    }
  }

  if (publicData !== null && JSON.stringify(data) !== JSON.stringify(publicData)) {
    errors.push(`${slug}/version.json in dist/ differs from public/`);
  }

  return { ok: errors.length === 0, errors };
}

function resolveDistTarget(distDir, relTarget) {
  const normalized = path.posix.normalize(`/${relTarget}`).slice(1);
  if (normalized.startsWith('..')) return null;
  const fullPath = path.resolve(distDir, normalized);
  if (fullPath !== path.resolve(distDir) && !fullPath.startsWith(path.resolve(distDir) + path.sep)) {
    return null;
  }
  if (fs.existsSync(fullPath)) {
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) return fullPath;
    if (stat.isDirectory()) {
      const indexHtml = path.join(fullPath, 'index.html');
      if (fs.existsSync(indexHtml) && fs.statSync(indexHtml).isFile()) return indexHtml;
    }
  }
  return null;
}

export function extractHtmlReferences(htmlContent) {
  const clean = htmlContent
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');

  const refs = [];

  for (const m of clean.matchAll(/\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    refs.push({ attr: 'href/src', url: (m[1] ?? m[2] ?? '').trim() });
  }

  for (const m of clean.matchAll(/\bsrcset\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const raw = (m[1] ?? m[2] ?? '').trim();
    for (const candidate of raw.split(',')) {
      const url = candidate.trim().split(/\s+/)[0];
      if (url) refs.push({ attr: 'srcset', url });
    }
  }

  for (const m of clean.matchAll(/<astro-island\b([^>]*)>/gi)) {
    const attrs = m[1];
    for (const attrName of ['component-url', 'renderer-url']) {
      const attrMatch = attrs.match(new RegExp(`\\b${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
      if (attrMatch) {
        refs.push({ attr: `astro-island:${attrName}`, url: (attrMatch[1] ?? attrMatch[2] ?? '').trim() });
      }
    }
  }

  for (const m of clean.matchAll(/<meta\b([^>]*)>/gi)) {
    const attrs = m[1];
    const propMatch = attrs.match(/\b(?:property|name)\s*=\s*["'](og:image|twitter:image|og:url)["']/i);
    if (propMatch) {
      const cm = attrs.match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      if (cm) {
        refs.push({ attr: `meta:${propMatch[1].toLowerCase()}`, url: (cm[1] ?? cm[2] ?? '').trim() });
      }
    }
  }

  return refs;
}

export function crawlHtmlLinks(distDir, htmlRelPath, htmlContent) {
  const errors = [];
  const refs = extractHtmlReferences(htmlContent);
  const resolvedDist = path.resolve(distDir);
  const htmlDirPosix = path.posix.dirname(htmlRelPath.replace(/\\/g, '/'));

  for (const { attr, url } of refs) {
    if (!url || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('data:') || url.startsWith('javascript:')) {
      continue;
    }

    if (/pakkawatkh\.(?:github\.io|com)\/[^"'\s]*pliw-app/i.test(url) || /\bPliw-App\b/i.test(url)) {
      errors.push(`${htmlRelPath} (${attr}): stale Pliw-App reference "${url}"`);
      continue;
    }

    if (/^https?:\/\//i.test(url)) {
      if (url.startsWith(`${PORTAL_ORIGIN}/`)) {
        if (url !== PORTAL_BASE_URL && !url.startsWith(`${PORTAL_BASE_URL}/`)) {
          errors.push(`${htmlRelPath} (${attr}): site URL missing /public/ base prefix "${url}"`);
          continue;
        }
        const [withoutFragment, frag] = url.split('#');
        const cleanPath = withoutFragment.split('?')[0];
        const rel = cleanPath.slice(PORTAL_BASE_URL.length).replace(/^\/+/, '');
        const resolved = resolveDistTarget(resolvedDist, rel);
        if (!resolved) {
          errors.push(`${htmlRelPath} (${attr}): broken portal URL "${url}" -> missing in dist/`);
        } else if (frag && resolved.endsWith('.html')) {
          const targetHtml = fs.readFileSync(resolved, 'utf8');
          const fragRe = new RegExp(`\\b(?:id|name)\\s*=\\s*["']${escapeRegex(frag)}["']`, 'i');
          if (!fragRe.test(targetHtml)) {
            errors.push(
              `${htmlRelPath} (${attr}): broken fragment "${url}" in ${path.relative(resolvedDist, resolved)}`,
            );
          }
        }
      }
      continue;
    }

    if (url.startsWith('//')) continue;

    // Fragment-only link
    if (url.startsWith('#')) {
      const frag = url.slice(1);
      if (frag) {
        const fragRe = new RegExp(`\\b(?:id|name)\\s*=\\s*["']${escapeRegex(frag)}["']`, 'i');
        if (!fragRe.test(htmlContent)) {
          errors.push(`${htmlRelPath} (${attr}): broken same-page anchor "${url}"`);
        }
      }
      continue;
    }

    const [pathOnly, frag] = url.split('#');
    const cleanPath = pathOnly.split('?')[0];

    let targetRel = null;
    if (cleanPath.startsWith('/')) {
      if (cleanPath !== '/public' && !cleanPath.startsWith('/public/')) {
        errors.push(`${htmlRelPath} (${attr}): root-absolute path missing /public/ base "${url}"`);
        continue;
      }
      targetRel = cleanPath.slice('/public'.length).replace(/^\/+/, '');
    } else {
      const joined = htmlDirPosix === '.' ? cleanPath : path.posix.join(htmlDirPosix, cleanPath);
      if (joined.startsWith('..')) {
        errors.push(`${htmlRelPath} (${attr}): relative path escapes dist/ "${url}"`);
        continue;
      }
      targetRel = joined;
    }

    const resolvedFile = resolveDistTarget(resolvedDist, targetRel);
    if (!resolvedFile) {
      errors.push(`${htmlRelPath} (${attr}): broken internal target "${url}"`);
      continue;
    }

    if (frag && resolvedFile.endsWith('.html')) {
      const targetHtml = fs.readFileSync(resolvedFile, 'utf8');
      const fragRe = new RegExp(`\\b(?:id|name)\\s*=\\s*["']${escapeRegex(frag)}["']`, 'i');
      if (!fragRe.test(targetHtml)) {
        errors.push(`${htmlRelPath} (${attr}): broken fragment "${url}" in ${path.relative(resolvedDist, resolvedFile)}`);
      }
    }
  }

  return { ok: errors.length === 0, errors, checkedCount: refs.length };
}

export function validateReadmeLinks(readmeContent, publicRepoDir, distDir = null) {
  const errors = [];
  const cleaned = readmeContent.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]+`/g, ' ');
  const links = [...cleaned.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)].map((m) => m[1]);

  for (const url of links) {
    if (/pakkawatkh\.(?:github\.io|com)\/[^"'\s]*pliw-app/i.test(url) || /\bPliw-App\b/i.test(url)) {
      errors.push(`README.md contains stale Pliw-App link: ${url}`);
      continue;
    }
    if (url.startsWith(`${PORTAL_ORIGIN}/`)) {
      if (url !== PORTAL_BASE_URL && !url.startsWith(`${PORTAL_BASE_URL}/`)) {
        errors.push(`README.md URL missing /public/ base: ${url}`);
        continue;
      }
      const rel = url.split('#')[0].split('?')[0].slice(PORTAL_BASE_URL.length).replace(/^\/+/, '');
      const hasDist = Boolean(distDir && fs.existsSync(distDir));
      const checkRoot = hasDist ? distDir : path.join(publicRepoDir, 'public');
      if (fs.existsSync(checkRoot)) {
        const target = resolveDistTarget(checkRoot, rel);
        const allowCatalogFallback =
          !distDir && (rel === '' || APPS_CATALOG.some((a) => `${a.slug}/` === rel || a.slug === rel));
        if (!target && !allowCatalogFallback) {
          errors.push(`README.md portal URL target missing in ${path.basename(checkRoot)}/: ${url}`);
        }
      }
      continue;
    }
    if (/^https?:\/\//i.test(url) || url.startsWith('#') || url.startsWith('mailto:')) continue;

    const cleanRel = url.split('#')[0].split('?')[0];
    const resolved = path.resolve(publicRepoDir, cleanRel);
    if (!fs.existsSync(resolved)) {
      errors.push(`README.md broken relative link: ${url}`);
    }
  }
  return { ok: errors.length === 0, errors, checkedCount: links.length };
}

export function extractTagBlock(html, tagName) {
  const openRe = new RegExp(`<${tagName}\\b[^>]*>`, 'i');
  const closeTag = `</${tagName}>`;
  const m = openRe.exec(html);
  if (!m) return null;
  const start = m.index;
  let depth = 0;
  const tokenRe = new RegExp(`<(\/?)${tagName}\\b[^>]*>`, 'gi');
  tokenRe.lastIndex = start;
  let tok;
  while ((tok = tokenRe.exec(html)) !== null) {
    if (tok[1] === '/') {
      depth -= 1;
      if (depth === 0) {
        return {
          start,
          end: tok.index + tok[0].length,
          html: html.slice(start, tok.index + tok[0].length),
        };
      }
    } else {
      depth += 1;
    }
  }
  const fallbackClose = html.toLowerCase().indexOf(closeTag, start);
  if (fallbackClose !== -1) {
    return {
      start,
      end: fallbackClose + closeTag.length,
      html: html.slice(start, fallbackClose + closeTag.length),
    };
  }
  return null;
}

export function extractTopLevelSections(mainHtml) {
  const sections = [];
  const tokenRe = /<(\/?)section\b[^>]*>/gi;
  let depth = 0;
  let currentStart = -1;
  let tok;
  while ((tok = tokenRe.exec(mainHtml)) !== null) {
    if (tok[1] === '/') {
      depth -= 1;
      if (depth === 0 && currentStart !== -1) {
        sections.push(mainHtml.slice(currentStart, tok.index + tok[0].length));
        currentStart = -1;
      }
    } else {
      if (depth === 0) currentStart = tok.index;
      depth += 1;
    }
  }
  return sections;
}

export function validateHomepageRules(htmlContent) {
  const errors = [];
  const header = extractTagBlock(htmlContent, 'header');
  if (!header) {
    errors.push('Homepage missing <header>');
  } else {
    const headerText = extractVisibleText(header.html);
    if (!/Pliw App/i.test(headerText)) {
      errors.push('Homepage <header> missing "Pliw App" brand');
    }
    if (!/<svg\b|<img\b/i.test(header.html)) {
      errors.push('Homepage <header> missing brand icon (<svg> or <img>)');
    }
    const navLinks = [...header.html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((m) => {
      const hrefMatch = m[1].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      return {
        attrs: m[1],
        text: stripHtmlTags(m[2]),
        href: hrefMatch?.[1] ?? hrefMatch?.[2] ?? '',
      };
    });

    for (const link of navLinks) {
      const label = link.text;
      const isAllowed =
        /Pliw App/i.test(label) ||
        /^Apps$/i.test(label) ||
        /^Extensions$/i.test(label) ||
        (/GitHub/i.test(label) && /github\.com/i.test(link.href));
      if (!isAllowed) {
        errors.push(`Homepage <header> contains unexpected nav link: "${label}" (${link.href})`);
      }
    }
    for (const app of APPS_CATALOG) {
      if (new RegExp(`\\b${escapeRegex(app.name)}\\b`, 'i').test(headerText) || header.html.includes(`/${app.slug}/`)) {
        errors.push(`Homepage <header> must NOT list individual app "${app.name}"`);
      }
    }
    if (!navLinks.some((l) => /^Apps$/i.test(l.text))) {
      errors.push('Homepage <header> missing "Apps" link');
    }
    if (!navLinks.some((l) => /^Extensions$/i.test(l.text))) {
      errors.push('Homepage <header> missing "Extensions" link');
    }
    if (!navLinks.some((l) => /GitHub/i.test(l.text))) {
      errors.push('Homepage <header> missing "GitHub" link');
    }
  }

  const visiblePage = extractVisibleText(htmlContent);
  if (/Upcoming Apps|Coming Soon/i.test(visiblePage)) {
    errors.push('Homepage must NOT contain "Upcoming Apps" or "Coming Soon" cards');
  }

  for (const legacyClass of ['spec-pill', 'hub-quick-specs', 'app-card-upcoming', 'values-section']) {
    if (new RegExp(`class\\s*=\\s*["'][^"']*\\b${legacyClass}\\b`, 'i').test(htmlContent)) {
      errors.push(`Homepage contains legacy CSS class ".${legacyClass}"`);
    }
  }

  if (!/<astro-island\b/i.test(htmlContent)) {
    errors.push('Homepage missing interactive <astro-island> for catalog/previews');
  }

  const mainBlock = extractTagBlock(htmlContent, 'main');
  if (!mainBlock) {
    errors.push('Homepage missing <main>');
  } else {
    const tabLabels = [];
    for (const bm of mainBlock.html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)) {
      tabLabels.push(stripHtmlTags(bm[1]));
    }
    for (const tm of mainBlock.html.matchAll(/<([a-z0-9]+)\b[^>]*\brole\s*=\s*["']tab["'][^>]*>([\s\S]*?)<\/\1>/gi)) {
      tabLabels.push(stripHtmlTags(tm[2]));
    }

    for (const tabLabel of ['All', 'Apps', 'Extensions']) {
      const re = new RegExp(`^\\s*${tabLabel}(?:\\s*\\(\\d+\\))?\\s*$`, 'i');
      if (!tabLabels.some((lbl) => re.test(lbl))) {
        errors.push(`Homepage <main> missing category filter <button>/[role="tab"] "${tabLabel}"`);
      }
    }
  }

  const visibleMain = mainBlock ? extractVisibleText(mainBlock.html) : visiblePage;
  const mainMarkup = mainBlock ? mainBlock.html : htmlContent;
  for (const app of APPS_CATALOG) {
    if (!new RegExp(`\\b${escapeRegex(app.name)}\\b`, 'i').test(visibleMain)) {
      errors.push(`Homepage missing app card "${app.name}"`);
    }
    if (!mainMarkup.includes(`${app.slug}/`)) {
      errors.push(`Homepage missing Details link to "${app.slug}/"`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function validateSubpageStructure(htmlContent, { slug, appName, type }) {
  const errors = [];
  const header = extractTagBlock(htmlContent, 'header');
  const main = extractTagBlock(htmlContent, 'main');
  const footer = extractTagBlock(htmlContent, 'footer');

  if (!header) errors.push(`${slug}: missing <header>`);
  if (!main) errors.push(`${slug}: missing <main>`);
  if (!footer) errors.push(`${slug}: missing <footer>`);

  if (header && main && footer) {
    if (!(header.start < main.start && main.start < footer.start)) {
      errors.push(`${slug}: layout order must be <header> -> <main> -> <footer>`);
    }
  }

  if (/<video\b/i.test(htmlContent)) {
    errors.push(`${slug}: must NOT contain legacy <video> tags`);
  }

  if (!/<link\b[^>]*rel\s*=\s*["']stylesheet["']|<style\b/i.test(htmlContent)) {
    errors.push(`${slug}: missing shared stylesheet link or style block`);
  }

  if (main) {
    const sections = extractTopLevelSections(main.html);
    if (sections.length !== 3) {
      errors.push(
        `${slug}: <main> must have strictly 3 top-level <section> blocks (Hero, Preview, Quick Install), found ${sections.length}`,
      );
    } else {
      const [heroHtml, previewHtml, installHtml] = sections;
      const heroText = extractVisibleText(heroHtml);

      if (!/<img\b/i.test(heroHtml)) {
        errors.push(`${slug}: Hero missing app icon <img>`);
      }
      const h1Match = heroHtml.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
      if (!h1Match || !new RegExp(escapeRegex(appName), 'i').test(stripHtmlTags(h1Match[1]))) {
        errors.push(`${slug}: Hero missing <h1> containing "${appName}"`);
      }
      if (!/<p\b[^>]*>[\s\S]*?\S[\s\S]*?<\/p>/i.test(heroHtml)) {
        errors.push(`${slug}: Hero missing subtitle <p>`);
      }
      if (!/<a\b[^>]*href\s*=\s*["'][^"']*\.(?:dmg|zip)["'][^>]*>/i.test(heroHtml) || !/\bDownload\b/i.test(heroText)) {
        errors.push(`${slug}: Hero missing Download (.dmg/.zip) button`);
      }
      if (!/<a\b[^>]*href\s*=\s*["'][^"']*github\.com\/pakkawatkh\/[^"']*["'][^>]*>/i.test(heroHtml)) {
        errors.push(`${slug}: Hero missing GitHub link`);
      }

      const compatRegex =
        type === 'macos'
          ? /macOS\s*13\.0\+\s*\(Apple Silicon\s*&\s*Intel\)/gi
          : /Chrome\s*·\s*Brave\s*·\s*Edge\s*\(Manifest V3\)/gi;
      const compatMatches = heroText.match(compatRegex) || [];
      if (compatMatches.length !== 1) {
        errors.push(`${slug}: Hero must contain exactly 1 compatibility pill, found ${compatMatches.length}`);
      }

      if (/MIT\s+License/i.test(heroText)) {
        errors.push(`${slug}: Hero must NOT duplicate "MIT License" (belongs in footer)`);
      }

      const previewText = extractVisibleText(previewHtml);
      if (previewText.length === 0 && !/<astro-island\b/i.test(previewHtml)) {
        errors.push(`${slug}: Preview section appears empty`);
      }

      const installText = extractVisibleText(installHtml);
      if (!/<h[23]\b[^>]*>[\s\S]*?Quick Install[\s\S]*?<\/h[23]>/i.test(installHtml)) {
        errors.push(`${slug}: Quick Install section missing "Quick Install" heading`);
      }
      if (type === 'macos') {
        if (!/xattr\s+-cr\b/i.test(installText)) {
          errors.push(`${slug}: macOS Quick Install missing "xattr -cr" command`);
        }
        if (!/<button\b[^>]*>[\s\S]*?Copy[\s\S]*?<\/button>/i.test(installHtml)) {
          errors.push(`${slug}: macOS Quick Install missing Copy button`);
        }
      } else {
        if (!/chrome:\/\/extensions\//i.test(installText) || !/Developer mode/i.test(installText) || !/Load unpacked/i.test(installText)) {
          errors.push(`${slug}: Extension Quick Install must mention chrome://extensions/, Developer mode, and Load unpacked`);
        }
      }
    }
  }

  if (footer) {
    const footerText = extractVisibleText(footer.html);
    if (!/\bMIT\b/i.test(footerText)) {
      errors.push(`${slug}: <footer> missing MIT License`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function walkFiles(dir, { skipDirs = new Set(['.git', 'node_modules', '.build', 'dist', '.astro']) } = {}) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      results.push({ path: full, isDir: true, name: entry.name });
      results.push(...walkFiles(full, { skipDirs }));
    } else {
      results.push({ path: full, isDir: false, name: entry.name });
    }
  }
  return results;
}
