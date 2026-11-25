import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createSuiteCollector } from './lib/reporter.mjs';
import {
  APPS_CATALOG,
  EXPECTED_ROUTES,
  PORTAL_BASE_URL,
  validateAstroConfig,
  validateDeployWorkflow,
  validateReleaseDocs,
  validateScriptTarget,
  validateSecondaryDocs,
  validateSitemapXml,
} from './lib/validators.mjs';

function readExtensionVersion(workspaceRoot, extName) {
  const manifestPath = path.join(workspaceRoot, 'apps', 'Pliw-Extension', extName, 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), `Missing extension manifest: ${manifestPath}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.ok(typeof manifest.version === 'string' && /^\d+\.\d+\.\d+$/.test(manifest.version), `Invalid version in ${manifestPath}`);
  return manifest.version;
}

export async function runTier1({ workspaceRoot, skipBuild = false } = {}) {
  const portalDir = path.join(workspaceRoot, 'apps', 'public');
  const distDir = path.join(portalDir, 'dist');
  const publicStaticDir = path.join(portalDir, 'public');
  const { check, summary } = createSuiteCollector('Tier 1 — Build, Route & Artifact Parity, CI, Scripts & Docs');

  await check('T1-B1', 'Astro config exists with site, base: "/public", trailingSlash: "always"', () => {
    const candidates = ['astro.config.mjs', 'astro.config.ts', 'astro.config.js'].map((f) => path.join(portalDir, f));
    const found = candidates.find((p) => fs.existsSync(p));
    assert.ok(found, `Missing astro.config.{mjs,ts,js} in ${portalDir}`);
    const res = validateAstroConfig(fs.readFileSync(found, 'utf8'));
    assert.ok(res.ok, res.errors.join('; '));
  });

  await check('T1-B2', 'apps/public/package.json includes astro + @astrojs/react + react + build script', () => {
    const pkgPath = path.join(portalDir, 'package.json');
    assert.ok(fs.existsSync(pkgPath), `Missing ${pkgPath}`);
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    assert.ok(allDeps.astro, 'package.json missing astro dependency');
    assert.ok(allDeps['@astrojs/react'], 'package.json missing @astrojs/react dependency');
    assert.ok(allDeps.react, 'package.json missing react dependency');
    assert.ok(allDeps['react-dom'], 'package.json missing react-dom dependency');
    assert.ok(pkg.scripts?.build, 'package.json missing scripts.build');
  });

  await check('T1-B3', skipBuild ? 'dist/ directory exists (--skip-build)' : 'npm run build succeeds in apps/public and emits dist/', () => {
    if (!skipBuild) {
      const res = spawnSync('npm', ['run', 'build'], {
        cwd: portalDir,
        encoding: 'utf8',
        timeout: 120000,
      });
      assert.equal(res.status, 0, `npm run build failed (exit ${res.status}):\n${res.stdout}\n${res.stderr}`);
    }
    assert.ok(fs.existsSync(distDir) && fs.statSync(distDir).isDirectory(), `dist/ not found at ${distDir}`);
  });

  await check('T1-B4', 'apps/public/tsconfig.json configures React JSX (react-jsx / react)', () => {
    const tsconfigPath = path.join(portalDir, 'tsconfig.json');
    assert.ok(fs.existsSync(tsconfigPath), `Missing ${tsconfigPath}`);
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    assert.equal(tsconfig.compilerOptions?.jsx, 'react-jsx', 'tsconfig.json compilerOptions.jsx must be "react-jsx"');
    assert.equal(tsconfig.compilerOptions?.jsxImportSource, 'react', 'tsconfig.json compilerOptions.jsxImportSource must be "react"');
  });

  await check('T1-B5', 'apps/public/src/data/apps.ts dynamically loads version.json & fs.statSync sizes for all 5 slugs', () => {
    const appsTsPath = path.join(portalDir, 'src', 'data', 'apps.ts');
    assert.ok(fs.existsSync(appsTsPath), `Missing ${appsTsPath}`);
    const src = fs.readFileSync(appsTsPath, 'utf8');
    assert.match(src, /\bversion\.json\b/, 'src/data/apps.ts must read version.json dynamically');
    assert.match(src, /\b(?:fs\.)?statSync\b/, 'src/data/apps.ts must read installer sizes via fs.statSync');
    for (const app of APPS_CATALOG) {
      assert.ok(src.includes(app.slug), `src/data/apps.ts missing catalog slug "${app.slug}"`);
    }
  });

  await check('T1-B6', 'apps/public/.gitignore excludes node_modules/, dist/, and .astro/', () => {
    const giPath = path.join(portalDir, '.gitignore');
    assert.ok(fs.existsSync(giPath), `Missing ${giPath}`);
    const gi = fs.readFileSync(giPath, 'utf8');
    for (const entry of ['node_modules', 'dist', '.astro']) {
      assert.ok(new RegExp(`^\\s*/?${entry.replace('.', '\\.')}/?\\s*$`, 'm').test(gi), `.gitignore missing ${entry}/`);
    }
  });

  for (let i = 0; i < EXPECTED_ROUTES.length; i += 1) {
    const route = EXPECTED_ROUTES[i];
    await check(`T1-R${i + 1}`, `dist/${route} exists, >500B, and is valid HTML5 document`, () => {
      const filePath = path.join(distDir, route);
      assert.ok(fs.existsSync(filePath), `Missing built HTML route: ${filePath}`);
      const stat = fs.statSync(filePath);
      assert.ok(stat.size > 500, `Built HTML too small (${stat.size} bytes): ${route}`);
      const html = fs.readFileSync(filePath, 'utf8');
      assert.match(html, /<!doctype html>/i, `${route} missing <!doctype html>`);
      assert.match(html, /<\/html>/i, `${route} missing </html>`);
    });
  }

  const artifactGroups = [
    {
      id: 'T1-A1',
      name: 'monkey-tools static artifacts parity (public/ -> dist/)',
      resolveFiles: () => [
        'monkey-tools/version.json',
        'monkey-tools/monkey-tools-Installer.dmg',
        'monkey-tools/monkey-tools.zip',
        'monkey-tools/robots.txt',
        'monkey-tools/sitemap.xml',
        'monkey-tools/assets/icon.png',
        'monkey-tools/assets/favicon.png',
        'monkey-tools/assets/favicon-32.png',
      ],
    },
    {
      id: 'T1-A2',
      name: 'pliw-click static artifacts parity (public/ -> dist/)',
      resolveFiles: () => [
        'pliw-click/version.json',
        'pliw-click/pliw-click-Installer.dmg',
        'pliw-click/pliw-click.zip',
        'pliw-click/robots.txt',
        'pliw-click/sitemap.xml',
        'pliw-click/assets/icon.png',
      ],
    },
    {
      id: 'T1-A3',
      name: 'pliw-collage static artifacts parity (public/ -> dist/)',
      resolveFiles: () => [
        'pliw-collage/version.json',
        'pliw-collage/pliw-collage-Installer.dmg',
        'pliw-collage/pliw-collage.zip',
        'pliw-collage/assets/icon.png',
      ],
    },
    {
      id: 'T1-A4',
      name: 'pliw-scroll static artifacts parity (public/ -> dist/)',
      resolveFiles: () => {
        const scrollVersion = readExtensionVersion(workspaceRoot, 'pliw-scroll');
        return [
          `pliw-scroll/pliw-scroll-v${scrollVersion}.zip`,
          'pliw-scroll/assets/icon16.png',
          'pliw-scroll/assets/icon32.png',
          'pliw-scroll/assets/icon48.png',
          'pliw-scroll/assets/icon128.png',
        ];
      },
    },
    {
      id: 'T1-A5',
      name: 'pliw-geo static artifacts parity (public/ -> dist/)',
      resolveFiles: () => {
        const geoVersion = readExtensionVersion(workspaceRoot, 'pliw-geo');
        return [`pliw-geo/pliw-geo-v${geoVersion}.zip`, 'pliw-geo/assets/icon128.png'];
      },
    },
    {
      id: 'T1-A6',
      name: 'Portal root favicon & brand icons parity (public/assets/ -> dist/assets/)',
      resolveFiles: () => [
        'assets/favicon.svg',
        'assets/favicon.png',
        'assets/favicon-32.png',
        'assets/icon.png',
      ],
    },
    {
      id: 'T1-A7',
      name: 'Portal root sitemap.xml and LICENSE parity (public/ -> dist/)',
      resolveFiles: () => ['sitemap.xml', 'LICENSE'],
    },
  ];

  for (const group of artifactGroups) {
    await check(group.id, group.name, () => {
      for (const rel of group.resolveFiles()) {
        const srcPath = path.join(publicStaticDir, rel);
        const outPath = path.join(distDir, rel);
        assert.ok(fs.existsSync(srcPath), `Missing source artifact in public/: ${rel}`);
        assert.ok(fs.existsSync(outPath), `Missing built artifact in dist/: ${rel}`);
        const srcSize = fs.statSync(srcPath).size;
        const outSize = fs.statSync(outPath).size;
        assert.ok(srcSize > 0, `Source artifact is empty: public/${rel}`);
        assert.equal(outSize, srcSize, `Byte size mismatch for ${rel}: public=${srcSize}, dist=${outSize}`);
      }
    });
  }

  await check('T1-A8', 'dist/sitemap.xml contains all 6 routes under https://pakkawatkh.github.io/public/', () => {
    const sitemapPath = path.join(distDir, 'sitemap.xml');
    assert.ok(fs.existsSync(sitemapPath), `Missing ${sitemapPath}`);
    const expectedUrls = [
      `${PORTAL_BASE_URL}/`,
      `${PORTAL_BASE_URL}/monkey-tools/`,
      `${PORTAL_BASE_URL}/pliw-click/`,
      `${PORTAL_BASE_URL}/pliw-collage/`,
      `${PORTAL_BASE_URL}/pliw-scroll/`,
      `${PORTAL_BASE_URL}/pliw-geo/`,
    ];
    const res = validateSitemapXml(fs.readFileSync(sitemapPath, 'utf8'), expectedUrls);
    assert.ok(res.ok, res.errors.join('; '));
  });

  const deployWfPath = path.join(portalDir, '.github', 'workflows', 'deploy.yml');
  const deployCriteriaIds = [
    { id: 'T1-CI1', desc: '.github/workflows/deploy.yml triggers on push to main branch' },
    { id: 'T1-CI2', desc: '.github/workflows/deploy.yml grants pages: write and id-token: write permissions' },
    { id: 'T1-CI3', desc: '.github/workflows/deploy.yml installs dependencies and runs npm run build' },
    { id: 'T1-CI4', desc: '.github/workflows/deploy.yml uploads ./dist via actions/upload-pages-artifact' },
    { id: 'T1-CI5', desc: '.github/workflows/deploy.yml deploys via actions/deploy-pages' },
  ];

  for (const c of deployCriteriaIds) {
    await check(c.id, c.desc, () => {
      assert.ok(fs.existsSync(deployWfPath), `Missing ${deployWfPath}`);
      const res = validateDeployWorkflow(fs.readFileSync(deployWfPath, 'utf8'));
      const item = res.criteria.find((x) => x.id === c.id);
      assert.ok(item && item.ok, item?.error || `Failed ${c.id}`);
    });
  }

  await check('T1-CI6', '.github/workflows/release.yml remains intact', () => {
    const relPath = path.join(portalDir, '.github', 'workflows', 'release.yml');
    assert.ok(fs.existsSync(relPath), `Existing release.yml missing at ${relPath}`);
  });

  const scripts = [
    {
      syntaxId: 'T1-S1',
      targetId: 'T1-S5',
      file: path.join(workspaceRoot, 'apps', 'Monkey-Tools', 'scripts', 'create_dmg.sh'),
      slug: 'monkey-tools',
      requireMkdirP: false,
    },
    {
      syntaxId: 'T1-S2',
      targetId: 'T1-S6',
      file: path.join(workspaceRoot, 'apps', 'Pliw-Click', 'scripts', 'create_dmg.sh'),
      slug: 'pliw-click',
      requireMkdirP: false,
    },
    {
      syntaxId: 'T1-S3',
      targetId: 'T1-S7',
      file: path.join(workspaceRoot, 'apps', 'Pliw-Collage', 'scripts', 'create_dmg.sh'),
      slug: 'pliw-collage',
      requireMkdirP: false,
    },
    {
      syntaxId: 'T1-S4',
      targetId: 'T1-S8',
      file: path.join(workspaceRoot, 'apps', 'Pliw-Extension', 'scripts', 'package.sh'),
      slug: 'pliw-scroll',
      requireMkdirP: true,
    },
  ];

  for (const s of scripts) {
    const relFile = path.relative(workspaceRoot, s.file);
    await check(s.syntaxId, `${relFile} passes bash -n syntax validation`, () => {
      assert.ok(fs.existsSync(s.file), `Missing script: ${s.file}`);
      const syntax = spawnSync('bash', ['-n', s.file], { encoding: 'utf8' });
      assert.equal(syntax.status, 0, `bash -n failed on ${s.file}: ${syntax.stderr}`);
    });
    await check(s.targetId, `${relFile} targets /public/public/${s.slug} with zero legacy paths`, () => {
      assert.ok(fs.existsSync(s.file), `Missing script: ${s.file}`);
      const res = validateScriptTarget(fs.readFileSync(s.file, 'utf8'), {
        slug: s.slug,
        requireMkdirP: s.requireMkdirP,
      });
      assert.ok(res.ok, res.errors.join('; '));
    });
  }

  const docs = [
    {
      id: 'T1-D1',
      file: path.join(workspaceRoot, 'docs', 'apps', 'public', 'AGENTS.md'),
      name: 'docs/apps/public/AGENTS.md',
      isPortalAgentsDoc: true,
    },
    {
      id: 'T1-D2',
      file: path.join(workspaceRoot, 'RELEASE_WORKFLOW.md'),
      name: 'RELEASE_WORKFLOW.md',
      isPortalAgentsDoc: false,
    },
    {
      id: 'T1-D3',
      file: path.join(workspaceRoot, '.agents', 'skills', 'pliw-release', 'SKILL.md'),
      name: '.agents/skills/pliw-release/SKILL.md',
      isPortalAgentsDoc: false,
    },
  ];

  for (const d of docs) {
    await check(d.id, `${d.name} targets new Astro public/ artifact path & npm run build`, () => {
      assert.ok(fs.existsSync(d.file), `Missing doc: ${d.file}`);
      const res = validateReleaseDocs(fs.readFileSync(d.file, 'utf8'), {
        docName: d.name,
        isPortalAgentsDoc: d.isPortalAgentsDoc,
      });
      assert.ok(res.ok, res.errors.join('; '));
    });
  }

  const secondaryDocs = [
    {
      id: 'T1-D4',
      file: path.join(workspaceRoot, 'AGENTS.md'),
      name: 'AGENTS.md',
      expectedSlugs: [],
    },
    {
      id: 'T1-D5',
      file: path.join(workspaceRoot, 'docs', 'apps', 'Monkey-Tools', 'AGENTS.md'),
      name: 'docs/apps/Monkey-Tools/AGENTS.md',
      expectedSlugs: ['monkey-tools'],
    },
    {
      id: 'T1-D6',
      file: path.join(workspaceRoot, 'docs', 'apps', 'Monkey-Tools', 'RELEASE_WORKFLOW.md'),
      name: 'docs/apps/Monkey-Tools/RELEASE_WORKFLOW.md',
      expectedSlugs: ['monkey-tools'],
    },
    {
      id: 'T1-D7',
      file: path.join(workspaceRoot, 'docs', 'apps', 'Pliw-Click', 'AGENTS.md'),
      name: 'docs/apps/Pliw-Click/AGENTS.md',
      expectedSlugs: ['pliw-click'],
    },
    {
      id: 'T1-D8',
      file: path.join(workspaceRoot, 'docs', 'apps', 'Pliw-Collage', 'AGENTS.md'),
      name: 'docs/apps/Pliw-Collage/AGENTS.md',
      expectedSlugs: ['pliw-collage'],
    },
    {
      id: 'T1-D9',
      file: path.join(workspaceRoot, 'docs', 'apps', 'Pliw-Extension', 'AGENTS.md'),
      name: 'docs/apps/Pliw-Extension/AGENTS.md',
      expectedSlugs: ['pliw-scroll', 'pliw-geo'],
    },
  ];

  for (const d of secondaryDocs) {
    await check(d.id, `${d.name} references public/public/ with zero stale ../public/<slug> paths`, () => {
      assert.ok(fs.existsSync(d.file), `Missing secondary doc: ${d.file}`);
      const res = validateSecondaryDocs(fs.readFileSync(d.file, 'utf8'), {
        docName: d.name,
        expectedSlugs: d.expectedSlugs,
      });
      assert.ok(res.ok, res.errors.join('; '));
    });
  }

  return summary();
}
