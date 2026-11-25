import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createSuiteCollector } from './lib/reporter.mjs';
import {
  APPS_CATALOG,
  EXPECTED_ROUTES,
  scanAiSlop,
  scanShortcuts,
  validateHomepageRules,
  validateSubpageStructure,
} from './lib/validators.mjs';

function requireDistDir(portalDir) {
  const distDir = path.join(portalDir, 'dist');
  if (!fs.existsSync(distDir) || !fs.statSync(distDir).isDirectory()) {
    throw new Error(`dist/ not found at ${distDir} — run Tier 1 or "npm run build" in apps/public first.`);
  }
  return distDir;
}

export async function runTier3({ workspaceRoot } = {}) {
  const portalDir = path.join(workspaceRoot, 'apps', 'public');
  const { check, summary } = createSuiteCollector('Tier 3 — Cross-Feature & Website Standards Compliance');

  for (let i = 0; i < EXPECTED_ROUTES.length; i += 1) {
    const route = EXPECTED_ROUTES[i];
    await check(`T3-AS${i + 1}`, `dist/${route}: zero AI-slop clichés in metadata or visible prose`, () => {
      const distDir = requireDistDir(portalDir);
      const html = fs.readFileSync(path.join(distDir, route), 'utf8');
      const res = scanAiSlop(html, { isHtml: true });
      assert.ok(res.ok, `AI-slop found in ${route}: ${JSON.stringify(res.violations)}`);
    });
  }

  await check('T3-AS7', 'apps/public/README.md: zero AI-slop clichés', () => {
    const readmePath = path.join(portalDir, 'README.md');
    assert.ok(fs.existsSync(readmePath), `Missing ${readmePath}`);
    const readme = fs.readFileSync(readmePath, 'utf8');
    const res = scanAiSlop(readme, { isHtml: false });
    assert.ok(res.ok, `AI-slop found in README.md: ${JSON.stringify(res.violations)}`);
  });

  for (let i = 0; i < EXPECTED_ROUTES.length; i += 1) {
    const route = EXPECTED_ROUTES[i];
    await check(`T3-KS${i + 1}`, `dist/${route}: zero keyboard shortcuts in app descriptions or metadata`, () => {
      const distDir = requireDistDir(portalDir);
      const html = fs.readFileSync(path.join(distDir, route), 'utf8');
      const res = scanShortcuts(html, { isHtml: true });
      assert.ok(res.ok, `Shortcuts found in ${route}: ${JSON.stringify(res.violations)}`);
    });
  }

  await check('T3-KS7', 'apps/public/README.md: zero keyboard shortcuts in descriptions', () => {
    const readmePath = path.join(portalDir, 'README.md');
    assert.ok(fs.existsSync(readmePath), `Missing ${readmePath}`);
    const readme = fs.readFileSync(readmePath, 'utf8');
    const res = scanShortcuts(readme, { isHtml: false, isMarkdown: true });
    assert.ok(res.ok, `Shortcuts found in README.md: ${JSON.stringify(res.violations)}`);
  });

  await check('T3-HP1', 'Homepage navbar link discipline, category tabs, uniform 5-card catalog & zero legacy classes', () => {
    const distDir = requireDistDir(portalDir);
    const homeHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
    const res = validateHomepageRules(homeHtml);
    assert.ok(res.ok, res.errors.join(' | '));
  });

  for (let i = 0; i < APPS_CATALOG.length; i += 1) {
    const app = APPS_CATALOG[i];
    await check(
      `T3-SP${i + 1}`,
      `${app.slug}/index.html: unified 5-part layout (Navbar -> Hero -> Preview -> Quick Install -> Footer)`,
      () => {
        const distDir = requireDistDir(portalDir);
        const subHtml = fs.readFileSync(path.join(distDir, app.slug, 'index.html'), 'utf8');
        const res = validateSubpageStructure(subHtml, {
          slug: app.slug,
          appName: app.name,
          type: app.type,
        });
        assert.ok(res.ok, res.errors.join(' | '));
      },
    );
  }

  return summary();
}
