#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
const errors = [];

const requiredRoutes = [
  'index.html',
  'monkey-tools/index.html',
  'pliw-click/index.html',
  'pliw-collage/index.html',
  'pliw-scroll/index.html',
  'pliw-geo/index.html',
];

const macApps = ['monkey-tools', 'pliw-click', 'pliw-collage'];
const extensions = ['pliw-scroll', 'pliw-geo'];

if (!fs.existsSync(distDir)) {
  console.error('dist/ not found. Run "npm run build" first.');
  process.exit(1);
}

for (const route of requiredRoutes) {
  const full = path.join(distDir, route);
  if (!fs.existsSync(full)) errors.push(`Missing route: dist/${route}`);
}

for (const slug of macApps) {
  const dir = path.join(distDir, slug);
  const manifestPath = path.join(dir, 'version.json');
  const dmgPath = path.join(dir, `${slug}-Installer.dmg`);
  const zipPath = path.join(dir, `${slug}.zip`);

  for (const [label, file] of [['version.json', manifestPath], ['DMG', dmgPath], ['ZIP', zipPath]]) {
    if (!fs.existsSync(file)) errors.push(`Missing ${label} for ${slug}: ${path.relative(rootDir, file)}`);
  }

  if (fs.existsSync(manifestPath)) {
    try {
      const json = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (!json.latestVersion) errors.push(`${slug}/version.json missing latestVersion`);
      for (const key of ['downloadUrl', 'zipUrl']) {
        if (!String(json[key] ?? '').startsWith('https://pakkawatkh.github.io/public/')) {
          errors.push(`${slug}/version.json invalid ${key}: ${json[key]}`);
        }
      }
    } catch (err) {
      errors.push(`${slug}/version.json invalid JSON: ${err.message}`);
    }
  }
}

for (const slug of extensions) {
  const dir = path.join(distDir, slug);
  const zips = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.zip')) : [];
  if (zips.length === 0) errors.push(`Missing extension ZIP in dist/${slug}/`);
}

// Check zero Thai characters in built HTML and README.md
const thaiRegex = /[\u0E00-\u0E7F]/;
const filesToScan = [...requiredRoutes.map((r) => path.join(distDir, r)), path.join(rootDir, 'README.md')];
for (const file of filesToScan) {
  if (fs.existsSync(file) && thaiRegex.test(fs.readFileSync(file, 'utf8'))) {
    errors.push(`Thai characters found in ${path.relative(rootDir, file)}`);
  }
}

if (errors.length > 0) {
  console.error('❌ Portal check failed:');
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log(`✅ Portal check passed: ${requiredRoutes.length} routes, ${macApps.length} macOS apps, ${extensions.length} extensions, 0 Thai chars.`);
