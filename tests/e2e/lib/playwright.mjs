import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const NVM_FALLBACK_PW_CORE =
  '/Users/pakkawat/.nvm/versions/node/v24.19.0/lib/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs';

const SYSTEM_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export function resolvePlaywrightCoreCandidates() {
  const execLibDir = path.resolve(path.dirname(process.execPath), '../lib/node_modules');
  const candidates = [];
  if (process.env.PLAYWRIGHT_CORE_PATH) {
    candidates.push(process.env.PLAYWRIGHT_CORE_PATH);
  }
  candidates.push(
    path.join(execLibDir, 'playwright-core', 'index.mjs'),
    path.join(execLibDir, '@playwright', 'cli', 'node_modules', 'playwright-core', 'index.mjs'),
    NVM_FALLBACK_PW_CORE,
    path.join(execLibDir, '@playwright', 'cli', 'node_modules', 'playwright', 'index.mjs'),
  );
  return [...new Set(candidates)];
}

export async function loadPlaywrightCore() {
  for (const pkgName of ['playwright-core', 'playwright']) {
    try {
      const mod = await import(pkgName);
      if (mod?.chromium) return mod;
    } catch {
      // Fall through to explicit path resolution
    }
  }

  for (const candidate of resolvePlaywrightCoreCandidates()) {
    if (candidate && fs.existsSync(candidate)) {
      const stat = fs.statSync(candidate);
      const entryFile = stat.isDirectory() ? path.join(candidate, 'index.mjs') : candidate;
      if (fs.existsSync(entryFile)) {
        const mod = await import(pathToFileURL(entryFile).href);
        if (mod?.chromium) return mod;
      }
    }
  }

  throw new Error(
    `Unable to locate playwright-core. Tried: ${resolvePlaywrightCoreCandidates().join(', ')}`,
  );
}

export function resolveChromiumExecutable(chromium) {
  try {
    const defaultPath = chromium.executablePath?.();
    if (defaultPath && fs.existsSync(defaultPath)) {
      return undefined; // Let Playwright use its native default binary
    }
  } catch {
    // Continue to fallbacks
  }

  const cacheDir = path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
  if (fs.existsSync(cacheDir)) {
    const entries = fs.readdirSync(cacheDir).sort().reverse();
    for (const entry of entries) {
      if (entry.startsWith('chromium-')) {
        for (const archDir of ['chrome-mac-arm64', 'chrome-mac']) {
          const bin = path.join(
            cacheDir,
            entry,
            archDir,
            'Google Chrome for Testing.app',
            'Contents',
            'MacOS',
            'Google Chrome for Testing',
          );
          if (fs.existsSync(bin)) return bin;
        }
      }
      if (entry.startsWith('chromium_headless_shell-')) {
        for (const archDir of ['chrome-headless-shell-mac-arm64', 'chrome-headless-shell-mac']) {
          const bin = path.join(cacheDir, entry, archDir, 'chrome-headless-shell');
          if (fs.existsSync(bin)) return bin;
        }
      }
    }
  }

  if (fs.existsSync(SYSTEM_CHROME)) {
    return SYSTEM_CHROME;
  }

  throw new Error('No Chromium or Google Chrome executable found for headless testing.');
}

export async function launchHeadlessBrowser(extraOptions = {}) {
  const pw = await loadPlaywrightCore();
  const executablePath = resolveChromiumExecutable(pw.chromium);
  const launchOpts = {
    headless: true,
    ...extraOptions,
  };
  if (executablePath && !launchOpts.executablePath) {
    launchOpts.executablePath = executablePath;
  }
  const browser = await pw.chromium.launch(launchOpts);
  return { browser, playwright: pw };
}
