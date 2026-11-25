import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createSuiteCollector } from './lib/reporter.mjs';
import {
  APPS_CATALOG,
  EXPECTED_ROUTES,
  crawlHtmlLinks,
  escapeRegex,
  extractTagBlock,
  extractTopLevelSections,
  extractVisibleText,
  formatBinaryHumanSize,
  scanThai,
  validateReadmeLinks,
  validateVersionJson,
  walkFiles,
} from './lib/validators.mjs';

const BASELINE_SHAS = [
  { id: 'T2-GT1', label: 'Pliw (root)', rel: '.', sha: '4bca10f' },
  { id: 'T2-GT2', label: 'apps/public', rel: 'apps/public', sha: 'c97825d' },
  { id: 'T2-GT3', label: 'apps/Monkey-Tools', rel: 'apps/Monkey-Tools', sha: '94a4904' },
  { id: 'T2-GT4', label: 'apps/Pliw-Click', rel: 'apps/Pliw-Click', sha: 'c10fd5d' },
  { id: 'T2-GT5', label: 'apps/Pliw-Collage', rel: 'apps/Pliw-Collage', sha: '2ee9658' },
  { id: 'T2-GT6', label: 'apps/Pliw-Extension', rel: 'apps/Pliw-Extension', sha: '3dbf396' },
];

const FORBIDDEN_INTERNAL_NAMES = new Set(['AGENTS.md', '.agents', '.superpowers', 'specs', 'plans']);

function requireDistDir(portalDir) {
  const distDir = path.join(portalDir, 'dist');
  if (!fs.existsSync(distDir) || !fs.statSync(distDir).isDirectory()) {
    throw new Error(`dist/ not found at ${distDir} — run Tier 1 or "npm run build" in apps/public first.`);
  }
  return distDir;
}

function getExpectedAppVersionAndBinary(workspaceRoot, portalDir, app) {
  const publicDir = path.join(portalDir, 'public');
  if (app.type === 'macos') {
    const vjPath = path.join(publicDir, app.slug, 'version.json');
    assert.ok(fs.existsSync(vjPath), `Missing ${vjPath}`);
    const vj = JSON.parse(fs.readFileSync(vjPath, 'utf8'));
    const binPath = path.join(publicDir, app.slug, app.installerFile);
    assert.ok(fs.existsSync(binPath), `Missing installer ${binPath}`);
    const bytes = fs.statSync(binPath).size;
    return {
      version: vj.latestVersion,
      humanSize: formatBinaryHumanSize(bytes),
      bytes,
    };
  }
  const manifestPath = path.join(workspaceRoot, 'apps', 'Pliw-Extension', app.slug, 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), `Missing extension manifest ${manifestPath}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const zipName = `${app.slug}-v${manifest.version}.zip`;
  const zipPath = path.join(publicDir, app.slug, zipName);
  assert.ok(fs.existsSync(zipPath), `Missing extension archive ${zipPath}`);
  const bytes = fs.statSync(zipPath).size;
  return {
    version: manifest.version,
    humanSize: formatBinaryHumanSize(bytes),
    bytes,
  };
}

function extractCardScopeFromHomepage(html, app) {
  const articleMatches = [...html.matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/gi)];
  for (const m of articleMatches) {
    if (new RegExp(`\\b${escapeRegex(app.name)}\\b`, 'i').test(m[0]) && m[0].includes(`${app.slug}/`)) {
      return extractVisibleText(m[0]);
    }
  }
  // Fallback: slice from app heading (<h2>-<h5>) to the next app heading or </main>
  const headingRe = new RegExp(`<h[2-5][^>]*>[\\s\\S]*?${escapeRegex(app.name)}[\\s\\S]*?<\\/h[2-5]>`, 'i');
  const hm = headingRe.exec(html);
  if (!hm) return '';
  const tail = html.slice(hm.index);
  const nextCard = tail.slice(hm[0].length).search(/<(?:h[2-5]|article|footer)\b/i);
  const slice = nextCard === -1 ? tail.slice(0, 3000) : tail.slice(0, hm[0].length + nextCard);
  return extractVisibleText(slice);
}

function extractReadmeAppScope(readme, app) {
  const lines = readme.split(/\r?\n/);
  const matchingRows = lines.filter(
    (l) =>
      new RegExp(`\\b${escapeRegex(app.name)}\\b`, 'i').test(l) ||
      l.toLowerCase().includes(app.slug),
  );
  const headingIdx = lines.findIndex(
    (l) =>
      /^#{2,4}\s/.test(l) &&
      (new RegExp(`\\b${escapeRegex(app.name)}\\b`, 'i').test(l) || l.toLowerCase().includes(app.slug)),
  );
  let headingSection = '';
  if (headingIdx !== -1) {
    let endIdx = lines.length;
    for (let i = headingIdx + 1; i < lines.length; i += 1) {
      if (/^#{2,4}\s/.test(lines[i])) {
        endIdx = i;
        break;
      }
    }
    headingSection = lines.slice(headingIdx, endIdx).join('\n');
  }

  const tableRows = matchingRows.filter((l) => l.includes('|'));
  if (tableRows.length > 0 && headingSection) {
    return `${tableRows.join('\n')}\n${headingSection}`;
  }
  if (tableRows.length > 0) {
    return tableRows.join('\n');
  }
  if (headingSection) {
    return headingSection;
  }
  return matchingRows.join('\n');
}

function findForbiddenBoundaryItems(rootDir) {
  const items = walkFiles(rootDir, { skipDirs: new Set(['.git', 'node_modules', '.build', 'dist', '.astro']) });
  const banned = [];
  for (const item of items) {
    const rel = path.relative(rootDir, item.path);
    if (FORBIDDEN_INTERNAL_NAMES.has(item.name)) {
      banned.push(rel);
    } else if (
      !item.isDir &&
      (/^(?:spec|plan).*\.md$/i.test(item.name) || /[-_](?:spec|plan)\.md$/i.test(item.name))
    ) {
      banned.push(rel);
    }
  }
  return banned;
}

function findBinaryArtifacts(repoDir) {
  const items = walkFiles(repoDir, { skipDirs: new Set(['.git', 'node_modules', '.build', 'dist']) });
  const found = [];
  for (const item of items) {
    if (/\.(?:dmg|zip|app)$/i.test(item.name)) {
      found.push(path.relative(repoDir, item.path));
    }
  }
  return found;
}

export async function runTier2({ workspaceRoot } = {}) {
  const portalDir = path.join(workspaceRoot, 'apps', 'public');
  const { check, summary } = createSuiteCollector('Tier 2 — Boundaries, Invariants, Links, Sizes & Repo Hygiene');

  await check('T2-TH1', 'Zero Thai characters across dist/**/*.{html,json,xml,txt}', () => {
    const distDir = requireDistDir(portalDir);
    const files = walkFiles(distDir, { skipDirs: new Set() }).filter(
      (f) => !f.isDir && /\.(?:html|json|xml|txt)$/i.test(f.name),
    );
    assert.ok(files.length >= 6, 'Expected at least 6 built text/HTML files in dist/');
    const violations = [];
    for (const f of files) {
      const res = scanThai(fs.readFileSync(f.path, 'utf8'));
      if (!res.ok) {
        violations.push(`${path.relative(distDir, f.path)}: ${res.matches.map((m) => `L${m.line}:${m.tokens.join(',')}`).join('; ')}`);
      }
    }
    assert.equal(violations.length, 0, `Thai text found in dist/: ${violations.join(' | ')}`);
  });

  await check('T2-TH2', 'Zero Thai characters in apps/public/README.md', () => {
    const readmePath = path.join(portalDir, 'README.md');
    assert.ok(fs.existsSync(readmePath), `Missing ${readmePath}`);
    const res = scanThai(fs.readFileSync(readmePath, 'utf8'));
    assert.ok(res.ok, `Thai text in README.md: ${JSON.stringify(res.matches)}`);
  });

  await check('T2-TH3', 'Zero Thai characters across apps/public/src/**/*', () => {
    const srcDir = path.join(portalDir, 'src');
    if (!fs.existsSync(srcDir)) return;
    const files = walkFiles(srcDir, { skipDirs: new Set() }).filter(
      (f) => !f.isDir && /\.(?:astro|tsx?|jsx?|css|json|md|mjs)$/i.test(f.name),
    );
    const violations = [];
    for (const f of files) {
      const res = scanThai(fs.readFileSync(f.path, 'utf8'));
      if (!res.ok) {
        violations.push(`${path.relative(srcDir, f.path)}: ${res.matches.map((m) => `L${m.line}:${m.tokens.join(',')}`).join('; ')}`);
      }
    }
    assert.equal(violations.length, 0, `Thai text found in src/: ${violations.join(' | ')}`);
  });

  for (let i = 0; i < EXPECTED_ROUTES.length; i += 1) {
    const route = EXPECTED_ROUTES[i];
    await check(`T2-LK${i + 1}`, `Zero broken internal links, assets, og:image/og:url, or Astro islands in dist/${route}`, () => {
      const distDir = requireDistDir(portalDir);
      const filePath = path.join(distDir, route);
      assert.ok(fs.existsSync(filePath), `Missing ${filePath}`);
      const res = crawlHtmlLinks(distDir, route, fs.readFileSync(filePath, 'utf8'));
      assert.ok(res.ok, res.errors.join(' | '));
      assert.ok(res.checkedCount > 0, `Expected at least 1 reference in ${route}`);
    });
  }

  await check('T2-LK7', 'Zero broken links or stale Pliw-App URLs in apps/public/README.md', () => {
    const readmePath = path.join(portalDir, 'README.md');
    assert.ok(fs.existsSync(readmePath), `Missing ${readmePath}`);
    const distDir = path.join(portalDir, 'dist');
    const res = validateReadmeLinks(fs.readFileSync(readmePath, 'utf8'), portalDir, fs.existsSync(distDir) ? distDir : null);
    assert.ok(res.ok, res.errors.join(' | '));
  });

  for (const [idx, slug] of ['monkey-tools', 'pliw-click', 'pliw-collage'].entries()) {
    await check(`T2-VJ${idx + 1}`, `${slug}/version.json matches exact updater schema & public/===dist/ parity`, () => {
      const distDir = requireDistDir(portalDir);
      const pubJsonPath = path.join(portalDir, 'public', slug, 'version.json');
      const distJsonPath = path.join(distDir, slug, 'version.json');
      assert.ok(fs.existsSync(pubJsonPath), `Missing ${pubJsonPath}`);
      assert.ok(fs.existsSync(distJsonPath), `Missing ${distJsonPath}`);
      const pubData = JSON.parse(fs.readFileSync(pubJsonPath, 'utf8'));
      const distData = JSON.parse(fs.readFileSync(distJsonPath, 'utf8'));
      const res = validateVersionJson(slug, distData, pubData);
      assert.ok(res.ok, res.errors.join('; '));
    });
  }

  for (const [idx, extSlug] of ['pliw-scroll', 'pliw-geo'].entries()) {
    await check(`T2-VJ${idx + 4}`, `${extSlug}: dist/${extSlug} contains single .zip matching manifest.json version`, () => {
      const distDir = requireDistDir(portalDir);
      const manifestPath = path.join(workspaceRoot, 'apps', 'Pliw-Extension', extSlug, 'manifest.json');
      assert.ok(fs.existsSync(manifestPath), `Missing ${manifestPath}`);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const expectedZip = `${extSlug}-v${manifest.version}.zip`;
      const distExtDir = path.join(distDir, extSlug);
      assert.ok(fs.existsSync(distExtDir), `Missing ${distExtDir}`);
      const zips = fs.readdirSync(distExtDir).filter((f) => f.endsWith('.zip'));
      assert.deepEqual(zips, [expectedZip], `Expected single archive [${expectedZip}] in dist/${extSlug}, found [${zips.join(', ')}]`);
    });
  }

  // Granular per-surface version & ls -lh size parity: Homepage cards (T2-SZ1..5), Heroes (T2-SZ6..10), README (T2-SZ11..15)
  for (let i = 0; i < APPS_CATALOG.length; i += 1) {
    const app = APPS_CATALOG[i];
    await check(`T2-SZ${i + 1}`, `${app.name}: homepage card version & ls -lh size parity`, () => {
      const distDir = requireDistDir(portalDir);
      const { version, humanSize } = getExpectedAppVersionAndBinary(workspaceRoot, portalDir, app);
      const homeHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
      const cardText = extractCardScopeFromHomepage(homeHtml, app);
      assert.ok(cardText.length > 0, `Could not isolate homepage card for ${app.name}`);
      assert.ok(cardText.includes(version), `Homepage card for ${app.name} missing version ${version}; got: ${cardText.slice(0, 200)}`);
      assert.ok(cardText.includes(humanSize), `Homepage card for ${app.name} missing size ${humanSize}; got: ${cardText.slice(0, 200)}`);
    });
  }

  for (let i = 0; i < APPS_CATALOG.length; i += 1) {
    const app = APPS_CATALOG[i];
    await check(`T2-SZ${i + 6}`, `${app.name}: subpage hero version & ls -lh size parity`, () => {
      const distDir = requireDistDir(portalDir);
      const { version, humanSize } = getExpectedAppVersionAndBinary(workspaceRoot, portalDir, app);
      const subHtml = fs.readFileSync(path.join(distDir, app.slug, 'index.html'), 'utf8');
      const mainBlock = extractTagBlock(subHtml, 'main');
      assert.ok(mainBlock, `${app.slug}/index.html missing <main>`);
      const sections = extractTopLevelSections(mainBlock.html);
      assert.ok(sections.length >= 1, `${app.slug}/index.html missing hero <section>`);
      const heroText = extractVisibleText(sections[0]);
      assert.ok(heroText.includes(version), `${app.slug} hero missing version ${version}`);
      assert.ok(heroText.includes(humanSize), `${app.slug} hero missing exact size ${humanSize}`);
    });
  }

  for (let i = 0; i < APPS_CATALOG.length; i += 1) {
    const app = APPS_CATALOG[i];
    await check(`T2-SZ${i + 11}`, `${app.name}: README.md version & ls -lh size parity`, () => {
      const { version, humanSize } = getExpectedAppVersionAndBinary(workspaceRoot, portalDir, app);
      const readmePath = path.join(portalDir, 'README.md');
      assert.ok(fs.existsSync(readmePath), `Missing ${readmePath}`);
      const readmeText = fs.readFileSync(readmePath, 'utf8');
      const readmeScope = extractReadmeAppScope(readmeText, app);
      assert.ok(readmeScope.includes(version), `README.md section for ${app.name} missing version ${version}`);
      assert.ok(readmeScope.includes(humanSize), `README.md section for ${app.name} missing exact size ${humanSize}`);
    });
  }

  // Granular clean repo boundaries (T2-CB1..CB6)
  await check('T2-CB1', 'apps/public clean boundary: zero AGENTS.md, .agents, .superpowers, specs, or plans', () => {
    const banned = findForbiddenBoundaryItems(portalDir);
    assert.equal(banned.length, 0, `Forbidden internal docs/dirs inside apps/public: ${banned.join(', ')}`);
  });

  const sourceRepos = [
    { id: 'T2-CB2', name: 'Monkey-Tools' },
    { id: 'T2-CB3', name: 'Pliw-Click' },
    { id: 'T2-CB4', name: 'Pliw-Collage' },
    { id: 'T2-CB5', name: 'Pliw-Extension' },
  ];

  for (const repo of sourceRepos) {
    await check(repo.id, `apps/${repo.name} clean boundary: zero internal docs/dirs and zero .dmg/.zip/.app artifacts`, () => {
      const repoDir = path.join(workspaceRoot, 'apps', repo.name);
      if (!fs.existsSync(repoDir)) return;
      const banned = findForbiddenBoundaryItems(repoDir);
      assert.equal(banned.length, 0, `Forbidden internal docs/dirs inside apps/${repo.name}: ${banned.join(', ')}`);
      const bins = findBinaryArtifacts(repoDir);
      assert.equal(bins.length, 0, `Unexpected binary/archive inside apps/${repo.name}: ${bins.join(', ')}`);
    });
  }

  await check('T2-CB6', 'Remaining ./apps/* subdirs clean boundary: zero AGENTS.md, .agents, .superpowers, specs, or plans', () => {
    const appsRoot = path.join(workspaceRoot, 'apps');
    if (!fs.existsSync(appsRoot)) return;
    const managed = new Set(['public', 'Monkey-Tools', 'Pliw-Click', 'Pliw-Collage', 'Pliw-Extension']);
    const entries = fs.readdirSync(appsRoot, { withFileTypes: true });
    const banned = [];
    for (const entry of entries) {
      if (managed.has(entry.name)) continue;
      if (FORBIDDEN_INTERNAL_NAMES.has(entry.name)) {
        banned.push(entry.name);
      } else if (entry.isDirectory()) {
        for (const rel of findForbiddenBoundaryItems(path.join(appsRoot, entry.name))) {
          banned.push(path.join(entry.name, rel));
        }
      }
    }
    assert.equal(banned.length, 0, `Forbidden internal docs/dirs inside other ./apps/* entries: ${banned.join(', ')}`);
  });

  // Granular local-only git invariant per repository (T2-GT1..GT6)
  for (const repo of BASELINE_SHAS) {
    await check(repo.id, `Local-only git invariant (${repo.label}): HEAD remains at ${repo.sha} with 0 ahead commits`, () => {
      const repoDir = path.resolve(workspaceRoot, repo.rel);
      if (!fs.existsSync(path.join(repoDir, '.git'))) return;
      const headRes = spawnSync('git', ['-C', repoDir, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
      assert.equal(headRes.status, 0, `git rev-parse failed for ${repo.label}`);
      const headSha = headRes.stdout.trim();
      assert.equal(
        headSha,
        repo.sha,
        `${repo.label} HEAD changed from baseline ${repo.sha} to ${headSha} (local-only invariant violated)`,
      );

      const aheadRes = spawnSync('git', ['-C', repoDir, 'rev-list', '--count', '@{u}..HEAD'], { encoding: 'utf8' });
      if (aheadRes.status === 0) {
        assert.equal(Number(aheadRes.stdout.trim()), 0, `${repo.label} has unpushed local commits`);
      }
    });
  }

  return summary();
}
