import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveChromiumExecutable, resolvePlaywrightCoreCandidates } from './lib/playwright.mjs';
import { createSuiteCollector } from './lib/reporter.mjs';
import { startStaticServer } from './lib/server.mjs';
import {
  APPS_CATALOG,
  PORTAL_BASE_URL,
  crawlHtmlLinks,
  formatBinaryHumanSize,
  scanAiSlop,
  scanShortcuts,
  scanThai,
  validateAstroConfig,
  validateDeployWorkflow,
  validateHomepageRules,
  validateReadmeLinks,
  validateReleaseDocs,
  validateScriptTarget,
  validateSecondaryDocs,
  validateSitemapXml,
  validateSubpageStructure,
  validateVersionJson,
} from './lib/validators.mjs';
import { runTier1 } from './tier1.mjs';
import { runTier2 } from './tier2.mjs';
import { runTier3 } from './tier3.mjs';
import { runTier4 } from './tier4.mjs';

const PNG_1X1_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

function writeFileEnsure(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function buildSyntheticSubpageHtml({ app, version, humanSize, iconHref, dlHref, previewHtml, previewScript }) {
  const isMac = app.type === 'macos';
  const compatPill = isMac
    ? 'macOS 13.0+ (Apple Silicon &amp; Intel)'
    : 'Chrome · Brave · Edge (Manifest V3)';
  const dlLabel = `Download ${isMac ? 'DMG' : 'ZIP'} (v${version} · ${humanSize})`;

  const installBody = isMac
    ? `<div class="steps">
        <p>Open installer and drag app to Applications.</p>
        <code>xattr -cr "/Applications/${app.name}.app"</code>
        <button type="button" id="copy-cmd-btn">Copy</button>
      </div>
      <script>
        document.getElementById('copy-cmd-btn').addEventListener('click', async function () {
          const btn = this;
          const cmd = 'xattr -cr "/Applications/${app.name}.app"';
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(cmd);
          }
          btn.textContent = 'Copied!';
        });
      </script>`
    : `<div class="steps">
        <p>Unzip archive, open <code>chrome://extensions/</code>, enable <strong>Developer mode</strong>, and click <strong>Load unpacked</strong>.</p>
      </div>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${app.name} — Pliw App</title>
  <meta name="description" content="Open-source utility ${app.name} for clean workflows." />
  <meta property="og:url" content="${PORTAL_BASE_URL}/${app.slug}/" />
  <meta property="og:image" content="${PORTAL_BASE_URL}/assets/icon.png" />
  <link rel="canonical" href="${PORTAL_BASE_URL}/${app.slug}/" />
  <link rel="stylesheet" href="/public/assets/styles.css" />
</head>
<body>
  <header>
    <a href="/public/"><svg width="16" height="16"></svg> Pliw App</a>
    <a href="/public/#apps">Apps</a>
    <a href="/public/#extensions">Extensions</a>
    <a href="https://github.com/pakkawatkh/public">GitHub</a>
  </header>
  <main>
    <section id="hero">
      <img src="${iconHref}" alt="${app.name}" width="64" height="64" />
      <h1>${app.name}</h1>
      <p>Clean, focused utility for everyday desktop and browser workflows.</p>
      <a href="${dlHref}">${dlLabel}</a>
      <a href="https://${app.repoUrlPart}">GitHub</a>
      <span>${compatPill}</span>
    </section>
    <section id="preview">
      <astro-island component-url="/public/_astro/preview.js" renderer-url="/public/_astro/client.js">
        ${previewHtml}
      </astro-island>
    </section>
    <section id="install">
      <h2>Quick Install</h2>
      ${installBody}
    </section>
  </main>
  <footer>
    <p>Open Source — MIT License</p>
  </footer>
  ${previewScript}
</body>
</html>`;
}

function buildSyntheticWorkspace(tmpRoot) {
  const portalDir = path.join(tmpRoot, 'apps', 'public');
  const publicDir = path.join(portalDir, 'public');
  const distDir = path.join(portalDir, 'dist');

  // 1. Root & release docs
  writeFileEnsure(
    path.join(tmpRoot, 'AGENTS.md'),
    '# Pliw Workspace\nSync installers to `./apps/public/public/<app-slug>/` and run `npm run build`.\n',
  );
  writeFileEnsure(
    path.join(tmpRoot, 'RELEASE_WORKFLOW.md'),
    '# Release Workflow\nSync artifacts to `../public/public/<app-slug>/` and run `npm run build`.\n',
  );
  writeFileEnsure(
    path.join(tmpRoot, '.agents', 'skills', 'pliw-release', 'SKILL.md'),
    '# Pliw Release\nSync to `../public/public/<app-slug>/` and run `npm run build`.\n',
  );
  writeFileEnsure(
    path.join(tmpRoot, 'docs', 'apps', 'public', 'AGENTS.md'),
    '# Portal Guide\nPlace binaries in `public/<app-slug>/` and run `npm run build`.\n',
  );
  writeFileEnsure(
    path.join(tmpRoot, 'docs', 'apps', 'Monkey-Tools', 'AGENTS.md'),
    '# Monkey Tools\nSync to `../public/public/monkey-tools/` and run `npm run build`.\n',
  );
  writeFileEnsure(
    path.join(tmpRoot, 'docs', 'apps', 'Monkey-Tools', 'RELEASE_WORKFLOW.md'),
    '# Monkey Tools Workflow\nSync to `../public/public/monkey-tools/` and run `npm run build`.\n',
  );
  writeFileEnsure(
    path.join(tmpRoot, 'docs', 'apps', 'Pliw-Click', 'AGENTS.md'),
    '# Pliw Click\nSync to `../public/public/pliw-click/` and run `npm run build`.\n',
  );
  writeFileEnsure(
    path.join(tmpRoot, 'docs', 'apps', 'Pliw-Collage', 'AGENTS.md'),
    '# Pliw Collage\nSync to `../public/public/pliw-collage/` and run `npm run build`.\n',
  );
  writeFileEnsure(
    path.join(tmpRoot, 'docs', 'apps', 'Pliw-Extension', 'AGENTS.md'),
    '# Pliw Extension\nSync to `../public/public/pliw-scroll/` and `../public/public/pliw-geo/` then run `npm run build`.\n',
  );

  // 2. Packaging scripts & manifests
  for (const [repo, slug] of [
    ['Monkey-Tools', 'monkey-tools'],
    ['Pliw-Click', 'pliw-click'],
    ['Pliw-Collage', 'pliw-collage'],
  ]) {
    writeFileEnsure(
      path.join(tmpRoot, 'apps', repo, 'scripts', 'create_dmg.sh'),
      `#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -d "$(cd "\${PROJECT_DIR}/.." && pwd)/public" ]]; then
  OUT_DIR="$(cd "\${PROJECT_DIR}/.." && pwd)/public/public/${slug}" # sync target
fi
`,
    );
  }
  writeFileEnsure(
    path.join(tmpRoot, 'apps', 'Pliw-Extension', 'scripts', 'package.sh'),
    `#!/usr/bin/env bash
set -euo pipefail
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORTAL_REPO_DIR="$(cd "\${REPO_DIR}/.." && pwd)/public"
PLIW_OUT_DIR="\${PORTAL_REPO_DIR}/public/pliw-scroll"
mkdir -p "\${PLIW_OUT_DIR}/assets"
`,
  );
  writeFileEnsure(
    path.join(tmpRoot, 'apps', 'Pliw-Extension', 'pliw-scroll', 'manifest.json'),
    JSON.stringify({ manifest_version: 3, name: 'Pliw Scroll', version: '1.2.2' }, null, 2),
  );
  writeFileEnsure(
    path.join(tmpRoot, 'apps', 'Pliw-Extension', 'pliw-geo', 'manifest.json'),
    JSON.stringify({ manifest_version: 3, name: 'Pliw Geo', version: '1.1.2' }, null, 2),
  );

  // 3. Portal config, workflows, src
  writeFileEnsure(
    path.join(portalDir, 'package.json'),
    JSON.stringify(
      {
        name: 'pliw-public-selfcheck',
        type: 'module',
        scripts: { build: 'astro build' },
        dependencies: { '@astrojs/react': '^7.1.9', astro: '^7.4.13', react: '^19.3.1', 'react-dom': '^19.3.1' },
      },
      null,
      2,
    ),
  );
  writeFileEnsure(
    path.join(portalDir, 'astro.config.mjs'),
    `export default { site: 'https://pakkawatkh.github.io', base: '/public', trailingSlash: 'always', output: 'static' };\n`,
  );
  writeFileEnsure(
    path.join(portalDir, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { jsx: 'react-jsx', jsxImportSource: 'react' } }, null, 2),
  );
  writeFileEnsure(path.join(portalDir, '.gitignore'), '.DS_Store\nnode_modules/\ndist/\n.astro/\n');
  writeFileEnsure(
    path.join(portalDir, 'src', 'data', 'apps.ts'),
    `import fs from 'node:fs';\n// version.json + fs.statSync\nexport const slugs = ['monkey-tools','pliw-collage','pliw-click','pliw-scroll','pliw-geo'];\n`,
  );
  writeFileEnsure(
    path.join(portalDir, '.github', 'workflows', 'deploy.yml'),
    `name: Deploy
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
      - uses: actions/deploy-pages@v4
`,
  );
  writeFileEnsure(path.join(portalDir, '.github', 'workflows', 'release.yml'), 'name: Release\n');

  // 4. Static artifacts in public/ and mirrored into dist/
  const staticWrites = [
    ['assets/favicon.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>'],
    ['assets/favicon.png', PNG_1X1_BUFFER],
    ['assets/favicon-32.png', PNG_1X1_BUFFER],
    ['assets/icon.png', PNG_1X1_BUFFER],
    ['LICENSE', 'MIT License\n'],
    [
      'sitemap.xml',
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${PORTAL_BASE_URL}/</loc></url>
  <url><loc>${PORTAL_BASE_URL}/monkey-tools/</loc></url>
  <url><loc>${PORTAL_BASE_URL}/pliw-click/</loc></url>
  <url><loc>${PORTAL_BASE_URL}/pliw-collage/</loc></url>
  <url><loc>${PORTAL_BASE_URL}/pliw-scroll/</loc></url>
  <url><loc>${PORTAL_BASE_URL}/pliw-geo/</loc></url>
</urlset>`,
    ],
    ['monkey-tools/robots.txt', 'User-agent: *\nAllow: /\n'],
    ['monkey-tools/sitemap.xml', '<urlset></urlset>'],
    ['monkey-tools/assets/icon.png', PNG_1X1_BUFFER],
    ['monkey-tools/assets/favicon.png', PNG_1X1_BUFFER],
    ['monkey-tools/assets/favicon-32.png', PNG_1X1_BUFFER],
    ['monkey-tools/monkey-tools-Installer.dmg', Buffer.alloc(1024 * 64, 1)],
    ['monkey-tools/monkey-tools.zip', Buffer.alloc(1024 * 48, 2)],
    [
      'monkey-tools/version.json',
      JSON.stringify(
        {
          latestVersion: '1.0.0',
          releaseDate: '2026-11-25',
          downloadUrl: `${PORTAL_BASE_URL}/monkey-tools/monkey-tools-Installer.dmg`,
          zipUrl: `${PORTAL_BASE_URL}/monkey-tools/monkey-tools.zip`,
          pageUrl: `${PORTAL_BASE_URL}/monkey-tools/`,
          releaseNotes: '- Initial release',
        },
        null,
        2,
      ),
    ],
    ['pliw-click/robots.txt', 'User-agent: *\nAllow: /\n'],
    ['pliw-click/sitemap.xml', '<urlset></urlset>'],
    ['pliw-click/assets/icon.png', PNG_1X1_BUFFER],
    ['pliw-click/pliw-click-Installer.dmg', Buffer.alloc(1024 * 40, 3)],
    ['pliw-click/pliw-click.zip', Buffer.alloc(1024 * 32, 4)],
    [
      'pliw-click/version.json',
      JSON.stringify(
        {
          latestVersion: '1.0.0',
          publishedAt: '2026-11-25T00:00:00Z',
          downloadUrl: `${PORTAL_BASE_URL}/pliw-click/pliw-click-Installer.dmg`,
          zipUrl: `${PORTAL_BASE_URL}/pliw-click/pliw-click.zip`,
          releaseNotes: '- Initial release',
        },
        null,
        2,
      ),
    ],
    ['pliw-collage/assets/icon.png', PNG_1X1_BUFFER],
    ['pliw-collage/pliw-collage-Installer.dmg', Buffer.alloc(1024 * 50, 5)],
    ['pliw-collage/pliw-collage.zip', Buffer.alloc(1024 * 36, 6)],
    [
      'pliw-collage/version.json',
      JSON.stringify(
        {
          latestVersion: '1.0.0',
          releaseDate: '2026-11-25',
          downloadUrl: `${PORTAL_BASE_URL}/pliw-collage/pliw-collage-Installer.dmg`,
          zipUrl: `${PORTAL_BASE_URL}/pliw-collage/pliw-collage.zip`,
          pageUrl: `${PORTAL_BASE_URL}/pliw-collage/`,
          releaseNotes: '- Initial release',
        },
        null,
        2,
      ),
    ],
    ['pliw-scroll/pliw-scroll-v1.2.2.zip', Buffer.alloc(1024 * 20, 7)],
    ['pliw-scroll/assets/icon16.png', PNG_1X1_BUFFER],
    ['pliw-scroll/assets/icon32.png', PNG_1X1_BUFFER],
    ['pliw-scroll/assets/icon48.png', PNG_1X1_BUFFER],
    ['pliw-scroll/assets/icon128.png', PNG_1X1_BUFFER],
    ['pliw-geo/pliw-geo-v1.1.2.zip', Buffer.alloc(1024 * 15, 8)],
    ['pliw-geo/assets/icon128.png', PNG_1X1_BUFFER],
  ];

  for (const [rel, data] of staticWrites) {
    writeFileEnsure(path.join(publicDir, rel), data);
    writeFileEnsure(path.join(distDir, rel), data);
  }

  // Astro runtime stubs in dist/
  writeFileEnsure(path.join(distDir, 'assets', 'styles.css'), 'body { margin: 0; font-family: system-ui, sans-serif; }\n');
  writeFileEnsure(path.join(distDir, '_astro', 'preview.js'), 'export default function() {}\n');
  writeFileEnsure(path.join(distDir, '_astro', 'client.js'), 'export default function() {}\n');

  const metaBySlug = {
    'monkey-tools': { version: '1.0.0', size: formatBinaryHumanSize(1024 * 64), icon: '/public/monkey-tools/assets/icon.png', dl: '/public/monkey-tools/monkey-tools-Installer.dmg' },
    'pliw-collage': { version: '1.0.0', size: formatBinaryHumanSize(1024 * 50), icon: '/public/pliw-collage/assets/icon.png', dl: '/public/pliw-collage/pliw-collage-Installer.dmg' },
    'pliw-click': { version: '1.0.0', size: formatBinaryHumanSize(1024 * 40), icon: '/public/pliw-click/assets/icon.png', dl: '/public/pliw-click/pliw-click-Installer.dmg' },
    'pliw-scroll': { version: '1.2.2', size: formatBinaryHumanSize(1024 * 20), icon: '/public/pliw-scroll/assets/icon128.png', dl: '/public/pliw-scroll/pliw-scroll-v1.2.2.zip' },
    'pliw-geo': { version: '1.1.2', size: formatBinaryHumanSize(1024 * 15), icon: '/public/pliw-geo/assets/icon128.png', dl: '/public/pliw-geo/pliw-geo-v1.1.2.zip' },
  };

  // 5. README.md
  const readmeRows = APPS_CATALOG.map((a) => {
    const m = metaBySlug[a.slug];
    return `| [${a.name}](${PORTAL_BASE_URL}/${a.slug}/) | v${m.version} | [Download](public/${m.dl.replace('/public/', '')}) (${m.size}) |`;
  }).join('\n');
  writeFileEnsure(
    path.join(portalDir, 'README.md'),
    `# Pliw App\n\nOpen-source macOS tools and Chromium extensions.\n\n| App | Version | Download |\n|---|---|---|\n${readmeRows}\n`,
  );

  // 6. Homepage dist/index.html
  const cardHtml = APPS_CATALOG.map((app) => {
    const m = metaBySlug[app.slug];
    const plat = app.category === 'Apps' ? 'macOS 13.0+' : 'Chrome · Brave · Edge';
    const previewWidget =
      app.slug === 'pliw-geo'
        ? `<div class="card-preview" style="height:120px;border:1px solid #cbd5e1;">
            <span id="hp-geo-coords">35.6762° N, 139.6503° E</span>
            <button type="button" id="hp-geo-n">N</button>
          </div>`
        : app.slug === 'pliw-click'
          ? `<div class="card-preview" id="hp-click-stage" style="height:120px;border:1px solid #cbd5e1;">
              <div id="hp-click-orb" style="width:24px;height:24px;transform:translate(0px,0px);">Orb</div>
            </div>`
          : `<div class="card-preview" style="height:120px;border:1px solid #cbd5e1;">
              <button type="button" class="hp-demo-btn" data-slug="${app.slug}">Switch ${app.name}</button>
              <span class="hp-demo-state">Default</span>
            </div>`;
    return `<article data-cat="${app.category}" style="position:relative;padding:56px 24px 24px;display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;width:100%;box-sizing:border-box;border:1px solid #e2e8f0;">
      <div style="position:absolute;top:14px;right:18px;"><span>v${m.version}</span></div>
      <div>
        <img src="${m.icon}" alt="${app.name}" width="48" height="48" />
        <h4>${app.name}</h4>
        <p>${plat}</p>
        <p>Focused open-source utility.</p>
        <a href="/public/${app.slug}/">Details →</a>
        <a href="${m.dl}">Download ${app.type === 'macos' ? 'DMG' : 'ZIP'} (${m.size})</a>
      </div>
      ${previewWidget}
    </article>`;
  }).join('\n');

  writeFileEnsure(
    path.join(distDir, 'index.html'),
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Pliw App — Native macOS Tools &amp; Browser Extensions</title>
  <meta name="description" content="Open-source macOS tools and Chromium browser extensions." />
  <meta property="og:url" content="${PORTAL_BASE_URL}/" />
  <meta property="og:image" content="${PORTAL_BASE_URL}/assets/icon.png" />
  <link rel="canonical" href="${PORTAL_BASE_URL}/" />
  <link rel="stylesheet" href="/public/assets/styles.css" />
  <style>[hidden] { display: none !important; }</style>
</head>
<body>
  <header>
    <a href="/public/"><svg width="16" height="16"></svg> Pliw App</a>
    <a href="#apps">Apps</a>
    <a href="#extensions">Extensions</a>
    <a href="https://github.com/pakkawatkh/public">GitHub</a>
  </header>
  <main>
    <section id="apps">
      <h1>Pliw App</h1>
      <div role="tablist">
        <button type="button" role="tab" data-filter="all" aria-pressed="true">All (5)</button>
        <button type="button" role="tab" data-filter="Apps" aria-pressed="false">Apps (3)</button>
        <button type="button" role="tab" data-filter="Extensions" aria-pressed="false">Extensions (2)</button>
      </div>
      <astro-island component-url="/public/_astro/preview.js" renderer-url="/public/_astro/client.js">
        <div id="extensions" style="max-width:900px;">
          ${cardHtml}
        </div>
      </astro-island>
    </section>
  </main>
  <footer><p>Open Source — MIT License</p></footer>
  <script>
    document.querySelectorAll('[data-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-filter');
        document.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
        document.querySelectorAll('article[data-cat]').forEach((card) => {
          card.hidden = cat !== 'all' && card.getAttribute('data-cat') !== cat;
        });
      });
    });
    document.querySelectorAll('.hp-demo-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.nextElementSibling.textContent = 'Updated!';
      });
    });
    document.getElementById('hp-geo-n').addEventListener('click', () => {
      document.getElementById('hp-geo-coords').textContent = '35.6782° N, 139.6503° E';
    });
    document.getElementById('hp-click-stage').addEventListener('mousemove', (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      const dx = Math.round(e.clientX - r.left - r.width / 2);
      document.getElementById('hp-click-orb').style.transform = 'translate(' + dx + 'px, 4px)';
    });
  </script>
</body>
</html>`,
  );

  // 7. 5 subpages in dist/
  const subpages = [
    {
      app: APPS_CATALOG[0], // Monkey Tools
      previewHtml: `
        <div role="tablist">
          <button type="button" id="mt-tab-clip">Clipboard</button>
          <button type="button" id="mt-tab-emoji">Emoji</button>
          <button type="button" id="mt-tab-trans">Translator</button>
          <button type="button" id="mt-tab-net">Network</button>
        </div>
        <div id="mt-panel">
          <input type="search" id="mt-search" placeholder="Search..." />
          <button type="button" id="mt-ocr">OCR</button>
          <div id="mt-out">Clipboard Item 1</div>
        </div>`,
      previewScript: `<script>
        const mtOut = document.getElementById('mt-out');
        document.getElementById('mt-tab-clip').onclick = () => { mtOut.textContent = 'Clipboard Item 1'; };
        document.getElementById('mt-tab-emoji').onclick = () => {
          mtOut.innerHTML = 'Emoji Picker <button type="button" id="mt-emoji-item">😀</button>';
          document.getElementById('mt-emoji-item').onclick = () => { mtOut.textContent = 'Copied 😀'; };
        };
        document.getElementById('mt-tab-trans').onclick = () => {
          mtOut.innerHTML = 'EN -> ES <button type="button" id="mt-swap">Swap</button><textarea id="mt-ta"></textarea><span id="mt-tr">Hola</span>';
          document.getElementById('mt-swap').onclick = () => { mtOut.querySelector('#mt-tr').textContent = 'ES -> EN'; };
          document.getElementById('mt-ta').oninput = (e) => { mtOut.querySelector('#mt-tr').textContent = 'Translated: ' + e.target.value; };
        };
        document.getElementById('mt-tab-net').onclick = () => { mtOut.innerHTML = 'Live 12.4 MB/s Down · 2.1 MB/s Up <button type="button" id="mt-pause">Pause</button>'; };
        document.getElementById('mt-search').oninput = (e) => { mtOut.textContent = e.target.value ? 'No matches for ' + e.target.value : 'Clipboard Item 1'; };
        document.getElementById('mt-ocr').onclick = () => { mtOut.textContent = 'Extracted OCR Text'; };
      </script>`,
    },
    {
      app: APPS_CATALOG[2], // Pliw Click
      previewHtml: `
        <div id="pc-stage" style="width:260px;height:150px;position:relative;border:1px solid #cbd5e1;">
          Move orb cursor
          <div id="pc-orb" style="width:24px;height:24px;transform:translate(0px,0px);">●</div>
        </div>
        <input type="range" id="pc-slider" min="1" max="10" value="5" />
        <span id="pc-speed">Speed: 5</span>
        <button type="button" id="pc-toggle" aria-pressed="true">Link Protection: On</button>`,
      previewScript: `<script>
        document.getElementById('pc-stage').addEventListener('mousemove', (e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = Math.round(e.clientX - r.left);
          document.getElementById('pc-orb').style.transform = 'translate(' + x + 'px, 10px)';
        });
        document.getElementById('pc-slider').addEventListener('input', (e) => {
          document.getElementById('pc-speed').textContent = 'Speed: ' + e.target.value;
        });
        document.getElementById('pc-toggle').addEventListener('click', (e) => {
          const next = e.currentTarget.getAttribute('aria-pressed') !== 'true';
          e.currentTarget.setAttribute('aria-pressed', String(next));
          e.currentTarget.textContent = 'Link Protection: ' + (next ? 'On' : 'Off');
        });
      </script>`,
    },
    {
      app: APPS_CATALOG[1], // Pliw Collage
      previewHtml: `
        <div>
          <button type="button" class="co-ratio" data-w="180" data-h="240">9:16</button>
          <button type="button" class="co-ratio" data-w="320" data-h="180">16:9</button>
          <button type="button" class="co-layout" data-cols="1fr 1fr">2×2</button>
          <button type="button" class="co-layout" data-cols="1fr 1fr 1fr">3-col</button>
        </div>
        <input type="range" id="co-gap" min="0" max="24" value="8" />
        <div id="co-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:180px;height:240px;">
          <div>1</div><div>2</div>
        </div>`,
      previewScript: `<script>
        const grid = document.getElementById('co-grid');
        document.querySelectorAll('.co-ratio').forEach((b) => {
          b.onclick = () => {
            grid.style.width = b.dataset.w + 'px';
            grid.style.height = b.dataset.h + 'px';
          };
        });
        document.querySelectorAll('.co-layout').forEach((b) => {
          b.onclick = () => { grid.style.gridTemplateColumns = b.dataset.cols; };
        });
        document.getElementById('co-gap').oninput = (e) => { grid.style.gap = e.target.value + 'px'; };
      </script>`,
    },
    {
      app: APPS_CATALOG[3], // Pliw Scroll
      previewHtml: `
        <div>
          <button type="button" class="ps-tool" aria-pressed="true">Pen</button>
          <button type="button" class="ps-tool" aria-pressed="false">Highlighter</button>
          <button type="button" class="ps-swatch" aria-label="Red swatch" style="width:20px;height:20px;background:#ef4444;" aria-pressed="true"></button>
          <button type="button" class="ps-swatch" aria-label="Blue swatch" style="width:20px;height:20px;background:#3b82f6;" aria-pressed="false"></button>
          <button type="button" class="ps-scale" aria-pressed="true">100%</button>
          <button type="button" class="ps-scale" aria-pressed="false">50%</button>
        </div>
        <canvas id="ps-canvas" width="240" height="140" style="border:1px solid #cbd5e1;"></canvas>`,
      previewScript: `<script>
        document.querySelectorAll('.ps-tool').forEach((b) => {
          b.onclick = () => document.querySelectorAll('.ps-tool').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        });
        document.querySelectorAll('.ps-swatch').forEach((b) => {
          b.onclick = () => document.querySelectorAll('.ps-swatch').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        });
        document.querySelectorAll('.ps-scale').forEach((b) => {
          b.onclick = () => document.querySelectorAll('.ps-scale').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        });
        const cv = document.getElementById('ps-canvas');
        const ctx = cv.getContext('2d');
        let down = false;
        cv.addEventListener('mousedown', (e) => { down = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); });
        cv.addEventListener('mousemove', (e) => { if (down) { ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); } });
        window.addEventListener('mouseup', () => { down = false; });
      </script>`,
    },
    {
      app: APPS_CATALOG[4], // Pliw Geo
      previewHtml: `
        <div id="pg-coords">35.6762° N, 139.6503° E</div>
        <button type="button" id="pg-n">N</button>
        <button type="button" id="pg-e">E</button>
        <button type="button" id="pg-1km">1 km</button>
        <button type="button" id="pg-tokyo" aria-pressed="true">Tokyo</button>
        <button type="button" id="pg-london" aria-pressed="false">London</button>
        <button type="button" id="pg-jitter" aria-pressed="false">Jitter: Off</button>
        <button type="button" id="pg-spoof" aria-pressed="true">Spoofing: Active</button>`,
      previewScript: `<script>
        let lat = 35.6762, lng = 139.6503, step = 0.001;
        const render = () => { document.getElementById('pg-coords').textContent = lat.toFixed(4) + '° N, ' + lng.toFixed(4) + '° E'; };
        document.getElementById('pg-n').onclick = () => { lat += step; render(); };
        document.getElementById('pg-e').onclick = () => { lng += step; render(); };
        document.getElementById('pg-1km').onclick = () => { step = 0.01; };
        document.getElementById('pg-london').onclick = () => { lat = 51.5074; lng = -0.1278; render(); };
        document.getElementById('pg-tokyo').onclick = () => { lat = 35.6762; lng = 139.6503; render(); };
        document.getElementById('pg-jitter').onclick = (e) => {
          const p = e.currentTarget.getAttribute('aria-pressed') !== 'true';
          e.currentTarget.setAttribute('aria-pressed', String(p));
          e.currentTarget.textContent = 'Jitter: ' + (p ? 'On' : 'Off');
        };
        document.getElementById('pg-spoof').onclick = (e) => {
          const p = e.currentTarget.getAttribute('aria-pressed') !== 'true';
          e.currentTarget.setAttribute('aria-pressed', String(p));
          e.currentTarget.textContent = 'Spoofing: ' + (p ? 'Active' : 'Paused');
        };
      </script>`,
    },
  ];

  for (const s of subpages) {
    const m = metaBySlug[s.app.slug];
    writeFileEnsure(
      path.join(distDir, s.app.slug, 'index.html'),
      buildSyntheticSubpageHtml({
        app: s.app,
        version: m.version,
        humanSize: m.size,
        iconHref: m.icon,
        dlHref: m.dl,
        previewHtml: s.previewHtml,
        previewScript: s.previewScript,
      }),
    );
  }

  return { portalDir, distDir };
}

export async function runSelfCheck() {
  const { check, summary } = createSuiteCollector('Self-Check — Validators + Isolated Synthetic Tiers 1–4');
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pliw-e2e-selfcheck-'));

  try {
    await check('SC-V1', 'formatBinaryHumanSize matches apps.ts & ls -lh formatting', () => {
      assert.equal(formatBinaryHumanSize(512), '512 B');
      assert.equal(formatBinaryHumanSize(32987), '32 KB');
      assert.equal(formatBinaryHumanSize(62899), '61 KB');
      assert.equal(formatBinaryHumanSize(1925003), '1.8 MB');
      assert.equal(formatBinaryHumanSize(2244723), '2.1 MB');
      assert.equal(formatBinaryHumanSize(2097152), '2.0 MB');
      assert.equal(formatBinaryHumanSize(10485760), '10 MB');
      assert.throws(() => formatBinaryHumanSize(-1));
    });

    await check('SC-V2', 'scanThai accepts English and rejects Thai characters', () => {
      assert.equal(scanThai('Clean English prose').ok, true);
      const bad = scanThai('Hello ภาษาไทย world');
      assert.equal(bad.ok, false);
      assert.equal(bad.matches[0].line, 1);
    });

    await check('SC-V3', 'scanAiSlop accepts direct prose and rejects clichés', () => {
      assert.equal(scanAiSlop('<p>Native clipboard history and OCR utility.</p>').ok, true);
      for (const phrase of ['Thoughtfully Handcrafted', 'Liquid Glass', 'zero bloatware', 'elevate your daily workflow']) {
        assert.equal(scanAiSlop(`<p>${phrase}</p>`).ok, false, `Expected AI-slop reject for "${phrase}"`);
      }
    });

    await check('SC-V4', 'scanShortcuts allows technical terms/code/pre and rejects shortcut glyphs/combos in prose, code, and pre', () => {
      assert.equal(
        scanShortcuts(
          '<p>Option A with Control panel, 2-10 finger tap, 9:16 grid, <code>xattr -cr /Applications/App.app</code></p><pre>xattr -cr "/Applications/Pliw Click.app"</pre>',
        ).ok,
        true,
      );
      for (const bad of ['Press ⌘⇧V to paste', 'Use Ctrl+V', 'Tap Cmd+Shift+E', 'Press Win+V']) {
        assert.equal(scanShortcuts(`<p>${bad}</p>`).ok, false, `Expected shortcut reject for "${bad}"`);
      }
      assert.equal(scanShortcuts('<pre>Press Ctrl+V to paste</pre>').ok, false, 'Expected <pre> Ctrl+V reject');
      assert.equal(scanShortcuts('<pre>Press ⌘⇧V to paste</pre>').ok, false, 'Expected <pre> glyph reject');
    });

    await check('SC-V5', 'validateAstroConfig & validateDeployWorkflow validate positive and negative inputs', () => {
      assert.equal(
        validateAstroConfig("export default { site: 'https://pakkawatkh.github.io', base: '/public', trailingSlash: 'always' };").ok,
        true,
      );
      assert.equal(validateAstroConfig("export default { site: 'https://pakkawatkh.github.io', base: '/' };").ok, false);

      const goodWf = `on:\n  push:\n    branches: [main]\npermissions:\n  pages: write\n  id-token: write\nsteps:\n  - run: npm ci && npm run build\n  - uses: actions/upload-pages-artifact@v3\n    with:\n      path: ./dist\n  - uses: actions/deploy-pages@v4\n`;
      assert.equal(validateDeployWorkflow(goodWf).ok, true);
      assert.equal(validateDeployWorkflow('on: push').ok, false);
    });

    await check('SC-V6', 'validateScriptTarget, validateReleaseDocs & validateSecondaryDocs enforce public/public/ paths', () => {
      assert.equal(
        validateScriptTarget('if [[ -d "../public" ]]; then\n  OUT="../public/public/monkey-tools" # target\nfi\n', { slug: 'monkey-tools' }).ok,
        true,
      );
      assert.equal(
        validateScriptTarget('OUT="../public/monkey-tools" # legacy\n', { slug: 'monkey-tools' }).ok,
        false,
      );
      assert.equal(
        validateReleaseDocs('Sync to ../public/public/<app-slug>/ and run npm run build.', { docName: 'doc' }).ok,
        true,
      );
      assert.equal(
        validateReleaseDocs('Sync to ../public/monkey-tools/ and run npm run build.', { docName: 'doc' }).ok,
        false,
      );
      assert.equal(
        validateSecondaryDocs('Sync to ../public/public/pliw-click/ and run npm run build.', {
          docName: 'AGENTS.md',
          expectedSlugs: ['pliw-click'],
        }).ok,
        true,
      );
      assert.equal(
        validateSecondaryDocs('Sync to ../public/pliw-click/ and run npm run build.', {
          docName: 'AGENTS.md',
          expectedSlugs: ['pliw-click'],
        }).ok,
        false,
      );
    });

    await check('SC-V7', 'validateVersionJson enforces releaseDate vs publishedAt and exact URLs', () => {
      assert.equal(
        validateVersionJson('monkey-tools', {
          latestVersion: '1.0.0',
          releaseDate: '2026-11-25',
          downloadUrl: `${PORTAL_BASE_URL}/monkey-tools/monkey-tools-Installer.dmg`,
          zipUrl: `${PORTAL_BASE_URL}/monkey-tools/monkey-tools.zip`,
          pageUrl: `${PORTAL_BASE_URL}/monkey-tools/`,
          releaseNotes: 'Notes',
        }).ok,
        true,
      );
      assert.equal(
        validateVersionJson('monkey-tools', {
          latestVersion: '1.0.0',
          publishedAt: '2026-11-25T00:00:00Z',
          downloadUrl: `${PORTAL_BASE_URL}/monkey-tools/monkey-tools-Installer.dmg`,
          zipUrl: `${PORTAL_BASE_URL}/monkey-tools/monkey-tools.zip`,
          pageUrl: `${PORTAL_BASE_URL}/monkey-tools/`,
          releaseNotes: 'Notes',
        }).ok,
        false,
      );
    });

    await check('SC-V8', 'validateHomepageRules & validateSubpageStructure catch masked header/footer tabs, exercise [role="tab"], and catch layout violations', () => {
      // Negative: header/footer mention Apps/Extensions/All, but <main> has NO filter buttons
      const maskedHome = `<header><a href="/public/"><svg></svg>Pliw App</a><a href="#apps">Apps</a><a href="#ext">Extensions</a><a href="https://github.com/pakkawatkh/public">GitHub</a></header>
        <main><astro-island component-url="/public/_astro/a.js"></astro-island>
        ${APPS_CATALOG.map((a) => `<h4>${a.name}</h4><a href="/public/${a.slug}/">Details</a>`).join('')}</main>
        <footer>All Apps</footer>`;
      assert.equal(validateHomepageRules(maskedHome).ok, false);

      // Positive: <button role="tab"> and single-quoted href in header
      const cardsMarkup = APPS_CATALOG.map((a) => `<h4>${a.name}</h4><a href="/public/${a.slug}/">Details</a>`).join('');
      const buttonRoleTabHome = `<header><a href="/public/"><svg></svg>Pliw App</a><a href="#apps">Apps</a><a href="#ext">Extensions</a><a href='https://github.com/pakkawatkh/public'>GitHub</a></header>
        <main><div role="tablist"><button type="button" role="tab">All (5)</button><button type="button" role="tab">Apps (3)</button><button type="button" role="tab">Extensions (2)</button></div>
        <astro-island component-url="/public/_astro/a.js"></astro-island>${cardsMarkup}</main>
        <footer>MIT</footer>`;
      const btnTabRes = validateHomepageRules(buttonRoleTabHome);
      assert.equal(btnTabRes.ok, true, btnTabRes.errors.join('; '));

      // Positive: <div role="tab"> without <button> directly exercises [role="tab"] capture group
      const divRoleTabHome = `<header><a href="/public/"><svg></svg>Pliw App</a><a href="#apps">Apps</a><a href="#ext">Extensions</a><a href="https://github.com/pakkawatkh/public">GitHub</a></header>
        <main><div role="tablist"><div role="tab">All (5)</div><div role="tab">Apps (3)</div><div role="tab">Extensions (2)</div></div>
        <astro-island component-url="/public/_astro/a.js"></astro-island>${cardsMarkup}</main>
        <footer>MIT</footer>`;
      const divTabRes = validateHomepageRules(divRoleTabHome);
      assert.equal(divTabRes.ok, true, divTabRes.errors.join('; '));

      // Negative: <div role="tab"> missing Extensions tab (must fail cleanly, never throw TypeError)
      const incompleteRoleTabHome = `<header><a href="/public/"><svg></svg>Pliw App</a><a href="#apps">Apps</a><a href="#ext">Extensions</a><a href="https://github.com/pakkawatkh/public">GitHub</a></header>
        <main><div role="tablist"><div role="tab">All (5)</div><div role="tab">Apps (3)</div></div>
        <astro-island component-url="/public/_astro/a.js"></astro-island>${cardsMarkup}</main>
        <footer>MIT</footer>`;
      const incompleteRes = validateHomepageRules(incompleteRoleTabHome);
      assert.equal(incompleteRes.ok, false);
      assert.ok(incompleteRes.errors.some((e) => /Extensions/.test(e)));

      // Negative: Hero MIT License, <video>, and 2 compat pills
      const badSub = `<header><a href="/public/">Pliw App</a></header>
        <main>
          <section><img src="/public/a.png"/><h1>Monkey Tools</h1><p>Desc</p><a href="/public/a.dmg">Download</a><a href="https://github.com/pakkawatkh/Monkey-Tools">GitHub</a><span>macOS 13.0+ (Apple Silicon & Intel)</span><span>macOS 13.0+ (Apple Silicon & Intel)</span><span>MIT License</span></section>
          <section><video></video></section>
          <section><h2>Quick Install</h2><code>xattr -cr /Applications/a.app</code><button>Copy</button></section>
        </main>
        <footer>MIT</footer>`;
      const subRes = validateSubpageStructure(badSub, { slug: 'monkey-tools', appName: 'Monkey Tools', type: 'macos' });
      assert.equal(subRes.ok, false);
      assert.ok(subRes.errors.length >= 3);
    });

    const { portalDir, distDir } = buildSyntheticWorkspace(tmpRoot);

    await check('SC-V9', 'crawlHtmlLinks & validateReadmeLinks catch missing /public/ base, case-insensitive pliw-app, and broken #fragments', () => {
      const badHtml = `<a href="/assets/icon.png">bad</a>
        <a href="https://github.com/pakkawatkh/pliw-app">stale</a>
        <a href="${PORTAL_BASE_URL}/monkey-tools/#missing-anchor">badfrag</a>
        <meta property="og:url" content="${PORTAL_BASE_URL}/nonexistent/" />`;
      const res = crawlHtmlLinks(distDir, 'index.html', badHtml);
      assert.equal(res.ok, false);
      assert.equal(res.errors.length, 4);

      const badReadme = `[bad](missing.dmg) [stale](https://pakkawatkh.github.io/pliw-app/) [missing-page](${PORTAL_BASE_URL}/nonexistent/)`;
      const rRes = validateReadmeLinks(badReadme, portalDir, distDir);
      assert.equal(rRes.ok, false);
      assert.equal(rRes.errors.length, 3);
    });

    await check('SC-V10', 'validateSitemapXml & Playwright/Chromium discovery checks pass', () => {
      const candidates = resolvePlaywrightCoreCandidates();
      assert.ok(candidates.length > 0);
      const sm = validateSitemapXml(fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8'), [
        `${PORTAL_BASE_URL}/`,
        `${PORTAL_BASE_URL}/monkey-tools/`,
      ]);
      assert.equal(sm.ok, true);
      assert.ok(typeof resolveChromiumExecutable === 'function');
    });

    await check('SC-SRV', 'startStaticServer enforces /public/ mount isolation (404 root, 301 /public, 200 /public/)', async () => {
      const srv = await startStaticServer(distDir, { mountPrefix: '/public' });
      try {
        const rootRes = await fetch(`${srv.origin}/index.html`, { redirect: 'manual' });
        assert.equal(rootRes.status, 404);
        const redirRes = await fetch(`${srv.origin}/public`, { redirect: 'manual' });
        assert.equal(redirRes.status, 301);
        assert.equal(redirRes.headers.get('location'), '/public/');
        const okRes = await fetch(`${srv.origin}/public/`);
        assert.equal(okRes.status, 200);
        assert.match(okRes.headers.get('content-type') || '', /text\/html/i);
      } finally {
        await srv.close();
      }
    });

    const t1 = await runTier1({ workspaceRoot: tmpRoot, skipBuild: true });
    const t2 = await runTier2({ workspaceRoot: tmpRoot });
    const t3 = await runTier3({ workspaceRoot: tmpRoot });
    const t4 = await runTier4({ workspaceRoot: tmpRoot, distDirOverride: distDir });

    await check('SC-T1', `Synthetic Tier 1 passes all checks (got ${t1.passed}/${t1.total})`, () => {
      assert.equal(t1.failed, 0, JSON.stringify(t1.checks.filter((c) => !c.passed)));
      assert.ok(t1.total >= 40, `Expected >= 40 Tier 1 checks, got ${t1.total}`);
    });
    await check('SC-T2', `Synthetic Tier 2 passes all checks (got ${t2.passed}/${t2.total})`, () => {
      assert.equal(t2.failed, 0, JSON.stringify(t2.checks.filter((c) => !c.passed)));
      assert.ok(t2.total >= 40, `Expected >= 40 Tier 2 checks, got ${t2.total}`);
    });
    await check('SC-T3', `Synthetic Tier 3 passes all checks (got ${t3.passed}/${t3.total})`, () => {
      assert.equal(t3.failed, 0, JSON.stringify(t3.checks.filter((c) => !c.passed)));
      assert.ok(t3.total >= 8, `Expected >= 8 Tier 3 checks, got ${t3.total}`);
    });
    await check('SC-T4', `Synthetic Tier 4 passes all Chromium scenarios (got ${t4.passed}/${t4.total})`, () => {
      assert.equal(t4.failed, 0, JSON.stringify(t4.checks.filter((c) => !c.passed)));
      assert.ok(t4.total >= 6, `Expected >= 6 Tier 4 checks, got ${t4.total}`);
    });

    return {
      selfCheck: summary(),
      tiers: [t1, t2, t3, t4],
    };
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}
