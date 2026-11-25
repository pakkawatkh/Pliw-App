import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { launchHeadlessBrowser } from './lib/playwright.mjs';
import { createSuiteCollector } from './lib/reporter.mjs';
import { startStaticServer } from './lib/server.mjs';
import { APPS_CATALOG } from './lib/validators.mjs';

const ROUTES = [
  { routePath: '/public/', expectedH1: /Pliw App/i, label: 'Homepage (/public/)' },
  { routePath: '/public/monkey-tools/', expectedH1: /Monkey Tools/i, label: 'Monkey Tools (/public/monkey-tools/)' },
  { routePath: '/public/pliw-click/', expectedH1: /Pliw Click/i, label: 'Pliw Click (/public/pliw-click/)' },
  { routePath: '/public/pliw-collage/', expectedH1: /Pliw Collage/i, label: 'Pliw Collage (/public/pliw-collage/)' },
  { routePath: '/public/pliw-scroll/', expectedH1: /Pliw Scroll/i, label: 'Pliw Scroll (/public/pliw-scroll/)' },
  { routePath: '/public/pliw-geo/', expectedH1: /Pliw Geo/i, label: 'Pliw Geo (/public/pliw-geo/)' },
];

const PNG_1X1_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function attachTelemetry(page, origin) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedSameOrigin = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err?.message || String(err));
  });
  page.on('response', (res) => {
    if (res.url().startsWith(origin) && res.status() >= 400) {
      failedSameOrigin.push(`${res.status()} ${res.url()}`);
    }
  });
  page.on('requestfailed', (req) => {
    if (req.url().startsWith(origin)) {
      failedSameOrigin.push(`FAILED ${req.url()} (${req.failure()?.errorText || 'unknown'})`);
    }
  });

  return {
    assertClean(contextLabel) {
      assert.equal(consoleErrors.length, 0, `${contextLabel}: console errors: ${consoleErrors.join(' | ')}`);
      assert.equal(pageErrors.length, 0, `${contextLabel}: page errors: ${pageErrors.join(' | ')}`);
      assert.equal(failedSameOrigin.length, 0, `${contextLabel}: failed same-origin requests: ${failedSameOrigin.join(' | ')}`);
    },
  };
}

async function openAndWait(page, url) {
  const response = await page.goto(url, { waitUntil: 'load', timeout: 20000 });
  assert.ok(response, `No navigation response for ${url}`);
  assert.equal(response.status(), 200, `Expected HTTP 200 for ${url}, got ${response.status()}`);
  await page.waitForTimeout(250);
  return response;
}

async function scrollAndHydrate(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
}

async function pollDelta(actionFn, snapshotFn, timeoutMs = 2500) {
  const before = await snapshotFn();
  await actionFn();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const after = await snapshotFn();
    if (JSON.stringify(after) !== JSON.stringify(before)) {
      return { changed: true, before, after };
    }
    await new Promise((r) => setTimeout(r, 80));
  }
  const finalSnap = await snapshotFn();
  return {
    changed: JSON.stringify(finalSnap) !== JSON.stringify(before),
    before,
    after: finalSnap,
  };
}

async function clickAndExpectDelta(page, targetLocator, snapshotFn, timeoutMs = 1500) {
  let delta = await pollDelta(() => targetLocator.click(), snapshotFn, timeoutMs);
  if (!delta.changed) {
    await page.waitForTimeout(250);
    delta = await pollDelta(() => targetLocator.click(), snapshotFn, timeoutMs);
  }
  return delta;
}

function roleButtonOrTab(scope, regex) {
  return scope.getByRole('tab', { name: regex }).or(scope.getByRole('button', { name: regex }));
}

async function findAppCard(page, app) {
  const nameRe = new RegExp(escapeRegExp(app.name), 'i');
  const articleCard = page.locator('article').filter({ has: page.getByRole('heading', { name: nameRe }) });
  if ((await articleCard.count()) > 0) {
    return articleCard.first();
  }
  const fallback = page
    .locator('main section, main div')
    .filter({ has: page.getByRole('heading', { name: nameRe }) })
    .filter({ has: page.getByRole('link', { name: /Details/i }) });
  const count = await fallback.count();
  if (count > 0) {
    return fallback.last();
  }
  return page.locator('main');
}

async function locateSubpageSections(page) {
  const header = page.locator('header').first();
  const footer = page.locator('footer').first();
  const main = page.locator('main').first();
  const topSections = main.locator(':scope > section');
  const secCount = await topSections.count();
  if (secCount === 3) {
    return {
      header,
      hero: topSections.nth(0),
      preview: topSections.nth(1),
      install: topSections.nth(2),
      footer,
      topSectionCount: secCount,
    };
  }
  const hero = main.locator('section').filter({ has: page.locator('h1') }).first();
  const install = main.locator('section').filter({ has: page.getByRole('heading', { name: /Quick Install/i }) }).first();
  const preview = main.locator('section').nth(1);
  return { header, hero, preview, install, footer, topSectionCount: secCount };
}

async function exerciseMonkeyToolsPreview(page, preview) {
  await scrollAndHydrate(page, preview);
  const tabRegexes = [/clipboard/i, /emoji/i, /translat/i, /network/i];
  const presentTabs = [];
  for (const re of tabRegexes) {
    const loc = roleButtonOrTab(preview, re);
    if ((await loc.count()) > 0 && (await loc.first().isVisible())) {
      presentTabs.push({ re, loc: loc.first(), name: (await loc.first().innerText()).trim() });
    }
  }
  assert.ok(presentTabs.length >= 2, `Monkey Tools preview expected >= 2 mode tabs, found ${presentTabs.length}`);

  const textsByTab = [];
  for (const tab of presentTabs) {
    await clickAndExpectDelta(page, tab.loc, () => preview.innerText(), 1000).catch(() => {});
    await page.waitForTimeout(120);
    textsByTab.push(await preview.innerText());
  }
  const uniqueTexts = new Set(textsByTab);
  assert.ok(uniqueTexts.size >= 2, 'Switching Monkey Tools tabs did not update preview content');

  // Clipboard sub-interactions
  const clipTab = presentTabs.find((t) => /clipboard/i.test(t.name));
  if (clipTab) {
    await clipTab.loc.click();
    await page.waitForTimeout(120);

    for (const pillRe of [/pinned/i, /text/i, /images?/i, /all/i]) {
      const pill = roleButtonOrTab(preview, pillRe);
      if ((await pill.count()) > 0 && (await pill.first().isVisible())) {
        await pill.first().click();
        await page.waitForTimeout(80);
      }
    }

    const searchInput = preview.locator('input[type="search"], input[type="text"], [role="searchbox"], [role="textbox"]').first();
    if ((await searchInput.count()) > 0 && (await searchInput.isVisible())) {
      const delta = await pollDelta(
        () => searchInput.fill('nonexistent_xyz_999'),
        () => preview.innerText(),
      );
      assert.ok(delta.changed, 'Monkey Tools search input did not update preview list');
      await searchInput.fill('');
      await page.waitForTimeout(100);
    }

    const pinBtn = preview.getByRole('button', { name: /pin|📌/i }).first();
    if ((await pinBtn.count()) > 0 && (await pinBtn.isVisible())) {
      await pinBtn.click();
      await page.waitForTimeout(100);
    }
    const ocrBtn = preview.getByRole('button', { name: /ocr|extract/i }).first();
    if ((await ocrBtn.count()) > 0 && (await ocrBtn.isVisible())) {
      const ocrDelta = await clickAndExpectDelta(page, ocrBtn, () => preview.innerText());
      assert.ok(ocrDelta.changed, 'Monkey Tools OCR button produced no visible output');
    }
  }

  // Emoji sub-interactions
  const emojiTab = presentTabs.find((t) => /emoji/i.test(t.name));
  if (emojiTab) {
    await emojiTab.loc.click();
    await page.waitForTimeout(120);
    const emojiAction = preview
      .locator('button:visible')
      .filter({ hasNotText: /clipboard|emoji|translat|network/i })
      .first();
    if ((await emojiAction.count()) > 0 && (await emojiAction.isVisible())) {
      await emojiAction.click();
      await page.waitForTimeout(100);
    }
  }

  // Translator sub-interactions
  const transTab = presentTabs.find((t) => /translat/i.test(t.name));
  if (transTab) {
    await transTab.loc.click();
    await page.waitForTimeout(120);
    const swapBtn = preview.getByRole('button', { name: /swap|↔|⇄|switch/i }).first();
    if ((await swapBtn.count()) > 0 && (await swapBtn.isVisible())) {
      const swapDelta = await clickAndExpectDelta(page, swapBtn, () => preview.innerText());
      assert.ok(swapDelta.changed, 'Monkey Tools Translator swap button did not change languages/text');
    }
    const textarea = preview.locator('textarea, input[type="text"]').first();
    if ((await textarea.count()) > 0 && (await textarea.isVisible())) {
      const typeDelta = await pollDelta(() => textarea.fill('Hello world'), () => preview.innerText());
      assert.ok(typeDelta.changed, 'Monkey Tools Translator input did not update output');
    }
  }

  // Network sub-interactions
  const netTab = presentTabs.find((t) => /network/i.test(t.name));
  if (netTab) {
    await netTab.loc.click();
    await page.waitForTimeout(120);
    const netText = await preview.innerText();
    assert.match(netText, /(?:KB\/s|MB\/s|B\/s|Mbps|Download|Upload|Down|Up|Live)/i, 'Monkey Tools Network tab missing speed readout');
    const netCtrl = preview
      .locator('button:visible')
      .filter({ hasNotText: /clipboard|emoji|translat|network/i })
      .first();
    if ((await netCtrl.count()) > 0 && (await netCtrl.isVisible())) {
      await netCtrl.click();
      await page.waitForTimeout(100);
    }
  }
}

async function exercisePliwClickPreview(page, preview) {
  await scrollAndHydrate(page, preview);

  const box = await preview.boundingBox();
  assert.ok(box && box.width > 100 && box.height > 100, 'Pliw Click preview section missing valid bounding box');

  // Prefer smallest inner stage box matching /move|orb|cursor|scroll/i (>= 140x120)
  const stageBox = await preview.evaluate((root) => {
    const rootRect = root.getBoundingClientRect();
    const candidates = [...root.querySelectorAll('div, svg')]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width >= 140 && r.height >= 120 && r.height <= rootRect.height + 2)
      .sort((a, b) => a.r.width * a.r.height - b.r.width * b.r.height);
    const named = candidates.find(({ el }) => /move|orb|cursor|scroll/i.test(el.textContent || ''));
    const chosen = (named || candidates[0])?.r || rootRect;
    return { x: chosen.left, y: chosen.top, width: chosen.width, height: chosen.height };
  });

  const snapStage = async () =>
    preview.evaluate((root) => {
      const nodes = [...root.querySelectorAll('*')];
      const transforms = nodes
        .map((n) => {
          const cs = getComputedStyle(n);
          const r = n.getBoundingClientRect();
          return `${cs.transform}|${cs.opacity}|${Math.round(r.left)}:${Math.round(r.top)}`;
        })
        .filter((s) => !s.startsWith('none|1|'));
      return { transforms, text: root.innerText };
    });

  const cx = stageBox.x + stageBox.width / 2;
  const cy = stageBox.y + stageBox.height / 2;
  await page.mouse.move(cx + Math.min(80, stageBox.width * 0.3), cy - Math.min(50, stageBox.height * 0.25));
  await page.waitForTimeout(150);
  const topRight = await snapStage();

  await page.mouse.move(cx - Math.min(80, stageBox.width * 0.3), cy + Math.min(50, stageBox.height * 0.25));
  await page.waitForTimeout(150);
  const bottomLeft = await snapStage();

  assert.notEqual(
    JSON.stringify(topRight),
    JSON.stringify(bottomLeft),
    'Pliw Click orb stage did not respond visually to pointer movement',
  );

  // Interactive controls (slider, finger-count, link protection / toggles)
  const slider = preview.locator('input[type="range"], [role="slider"]').first();
  if ((await slider.count()) > 0 && (await slider.isVisible())) {
    const delta = await pollDelta(async () => {
      await slider.evaluate((el) => {
        const min = Number(el.min || 0);
        const max = Number(el.max || 100);
        const nextVal = Number(el.value) === max ? String(min) : String(max);
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(el, nextVal);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }, () => preview.innerText());
    assert.ok(delta.changed, 'Pliw Click slider adjustment did not update preview readout');
  }

  const toggle = preview.locator('input[type="checkbox"], [role="switch"]').first().or(
    preview.getByRole('button', { name: /link|protect|invert|horizontal|autoscroll|finger/i }).first(),
  );
  if ((await toggle.count()) > 0 && (await toggle.first().isVisible())) {
    const snapCtrl = async () => ({
      text: await preview.innerText(),
      checked: await toggle.first().isChecked().catch(() => null),
      pressed: await toggle.first().getAttribute('aria-pressed').catch(() => null),
    });
    const delta = await clickAndExpectDelta(page, toggle.first(), snapCtrl);
    assert.ok(delta.changed, 'Pliw Click control toggle did not change state');
  }
}

async function exercisePliwCollagePreview(page, preview) {
  await scrollAndHydrate(page, preview);

  const ratioButtons = [];
  for (const re of [/9:16/, /4:5/, /1:1/, /16:9/]) {
    const btn = roleButtonOrTab(preview, re);
    if ((await btn.count()) > 0 && (await btn.first().isVisible())) {
      ratioButtons.push(btn.first());
    }
  }
  assert.ok(ratioButtons.length >= 2, `Pliw Collage preview expected >= 2 aspect ratio buttons, found ${ratioButtons.length}`);

  const snapCanvas = async () =>
    preview.evaluate((root) => {
      const boxes = [...root.querySelectorAll('div')].map((d) => {
        const r = d.getBoundingClientRect();
        const cs = getComputedStyle(d);
        return `${Math.round(r.width)}x${Math.round(r.height)}:${cs.gridTemplateColumns}:${cs.gap}:${cs.borderRadius}`;
      });
      return { text: root.innerText, boxes: boxes.slice(0, 30) };
    });

  await ratioButtons[0].click();
  await page.waitForTimeout(120);
  const firstSnap = await snapCanvas();
  await ratioButtons[ratioButtons.length - 1].click();
  await page.waitForTimeout(120);
  const lastSnap = await snapCanvas();
  assert.notEqual(
    JSON.stringify(firstSnap),
    JSON.stringify(lastSnap),
    'Pliw Collage aspect ratio switch produced no DOM/layout delta',
  );

  const layoutBtns = [];
  for (const re of [/2\s*[×x]\s*2/i, /3\s*col/i, /top.?big/i, /columns/i, /rows/i, /grid/i]) {
    const btn = roleButtonOrTab(preview, re);
    if ((await btn.count()) > 0 && (await btn.first().isVisible())) {
      layoutBtns.push(btn.first());
    }
  }
  if (layoutBtns.length >= 2) {
    const nonActive = [];
    for (const lb of layoutBtns) {
      const pressed = await lb.getAttribute('aria-pressed');
      const selected = await lb.getAttribute('aria-selected');
      if (pressed !== 'true' && selected !== 'true') nonActive.push(lb);
    }
    const targetLayout = nonActive[0] || layoutBtns[1];
    const delta = await clickAndExpectDelta(page, targetLayout, snapCanvas);
    assert.ok(delta.changed, 'Pliw Collage layout preset switch produced no DOM/layout delta');
  }

  const slider = preview.locator('input[type="range"]').first();
  if ((await slider.count()) > 0 && (await slider.isVisible())) {
    const delta = await pollDelta(async () => {
      await slider.evaluate((el) => {
        const min = Number(el.min || 0);
        const max = Number(el.max || 32);
        const nextVal = Number(el.value) === max ? String(min) : String(max);
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(el, nextVal);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }, snapCanvas);
    assert.ok(delta.changed, 'Pliw Collage spacing/radius/trim slider produced no DOM/style delta');
  } else {
    const stepBtn = preview.getByRole('button', { name: /^(?:\+|-|−|increase|decrease)$/i }).first();
    if ((await stepBtn.count()) > 0 && (await stepBtn.isVisible())) {
      const delta = await clickAndExpectDelta(page, stepBtn, snapCanvas);
      assert.ok(delta.changed, 'Pliw Collage +/- step button produced no DOM/style delta');
    }
  }
}

async function exercisePliwScrollPreview(page, preview) {
  await scrollAndHydrate(page, preview);

  const toolButtons = preview.locator('button, [role="button"], [role="tab"]').filter({
    hasText: /pen|highlighter|arrow|rect|ellipse|line|text|blur|pixelate|eraser|crop/i,
  });
  const toolCount = await toolButtons.count();
  const ariaTools = [];
  if (toolCount < 2) {
    for (const re of [/pen/i, /highlighter/i, /arrow/i, /rect/i, /ellipse/i, /line/i, /text/i, /blur|pixelate/i, /eraser/i]) {
      const b = preview.getByRole('button', { name: re });
      if ((await b.count()) > 0 && (await b.first().isVisible())) ariaTools.push(b.first());
    }
  } else {
    for (let i = 0; i < Math.min(toolCount, 4); i += 1) {
      ariaTools.push(toolButtons.nth(i));
    }
  }
  assert.ok(ariaTools.length >= 2, `Pliw Scroll preview expected >= 2 annotation tool buttons, found ${ariaTools.length}`);

  const snapToolState = async () =>
    preview.evaluate((root) => {
      const btns = [...root.querySelectorAll('button, [role="tab"]')].map((b) => ({
        label: (b.getAttribute('aria-label') || b.getAttribute('title') || b.textContent || '').trim(),
        pressed: b.getAttribute('aria-pressed'),
        selected: b.getAttribute('aria-selected'),
        bg: getComputedStyle(b).backgroundColor,
        border: getComputedStyle(b).borderColor,
        outline: getComputedStyle(b).outlineColor,
        transform: getComputedStyle(b).transform,
        cls: b.className,
      }));
      return { btns, text: root.innerText };
    });

  await ariaTools[0].click();
  await page.waitForTimeout(100);
  const s1 = await snapToolState();
  await ariaTools[1].click();
  await page.waitForTimeout(100);
  const s2 = await snapToolState();
  assert.notEqual(JSON.stringify(s1), JSON.stringify(s2), 'Pliw Scroll annotation tool switching caused no state delta');

  // Color swatch click check (if present)
  const swatchIndices = await preview.evaluate((root) => {
    const btns = [...root.querySelectorAll('button:not([disabled])')];
    const indices = [];
    for (let i = 0; i < btns.length; i += 1) {
      const b = btns[i];
      const r = b.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const meta = `${b.getAttribute('aria-label') || ''} ${b.getAttribute('title') || ''}`.trim();
      const txt = (b.textContent || '').trim();
      const isNamedColor = /(?:red|blue|green|yellow|orange|purple|pink|black|white|cyan|teal|emerald|color|swatch|#[0-9a-f]{3,6})/i.test(meta);
      const isCompactSwatch = r.width <= 36 && r.height <= 36 && txt.length === 0 && getComputedStyle(b).backgroundColor !== 'rgba(0, 0, 0, 0)';
      if (isNamedColor || isCompactSwatch) {
        indices.push({ index: i, active: b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-selected') === 'true' });
      }
    }
    return indices;
  });
  if (swatchIndices.length >= 2) {
    const targetSwatch = swatchIndices.find((s) => !s.active) || swatchIndices[1];
    const swatchLoc = preview.locator('button:not([disabled])').nth(targetSwatch.index);
    const swatchDelta = await clickAndExpectDelta(page, swatchLoc, snapToolState);
    assert.ok(swatchDelta.changed, 'Pliw Scroll color swatch selection caused no state/style delta');
  }

  // Pointer stroke or crop-handle drag on stage/canvas
  const dragBox = await preview.evaluate((root) => {
    const canvas = root.querySelector('canvas');
    if (canvas) {
      const r = canvas.getBoundingClientRect();
      if (r.width >= 80 && r.height >= 80) return { kind: 'canvas', x: r.left, y: r.top, width: r.width, height: r.height };
    }
    const svgs = [...root.querySelectorAll('svg')].filter((s) => {
      const r = s.getBoundingClientRect();
      return r.width >= 100 && r.height >= 80;
    });
    if (svgs.length > 0) {
      const r = svgs[0].getBoundingClientRect();
      return { kind: 'svg', x: r.left, y: r.top, width: r.width, height: r.height };
    }
    const divs = [...root.querySelectorAll('div')]
      .map((d) => ({ d, r: d.getBoundingClientRect() }))
      .filter(({ r }) => r.width >= 160 && r.height >= 120)
      .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height);
    if (divs.length > 0) {
      const r = divs[0].r;
      return { kind: 'stage', x: r.left, y: r.top, width: r.width, height: r.height };
    }
    return null;
  });

  if (dragBox) {
    const startX = dragBox.x + dragBox.width * 0.25;
    const startY = dragBox.y + dragBox.height * 0.3;
    const endX = dragBox.x + dragBox.width * 0.72;
    const endY = dragBox.y + dragBox.height * 0.68;
    const snapDraw = async () =>
      preview.evaluate((root) => {
        const canvas = root.querySelector('canvas');
        const canvasUrl = canvas ? canvas.toDataURL().slice(0, 500) : null;
        const svgHtml = [...root.querySelectorAll('svg')].map((s) => s.innerHTML.length).join(',');
        const rects = [...root.querySelectorAll('div')].slice(0, 25).map((d) => {
          const r = d.getBoundingClientRect();
          return `${Math.round(r.left)}:${Math.round(r.top)}:${Math.round(r.width)}x${Math.round(r.height)}`;
        });
        return { canvasUrl, svgHtml, rects, text: root.innerText };
      });
    const beforeDrag = await snapDraw();
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(120);
    const afterDrag = await snapDraw();
    if (dragBox.kind === 'canvas') {
      assert.notEqual(
        JSON.stringify(beforeDrag),
        JSON.stringify(afterDrag),
        'Pliw Scroll canvas pointer stroke produced no visual delta',
      );
    }
  }

  // Scale presets (100% / 50% / 30%)
  const scaleBtns = [];
  for (const re of [/100%/, /50%/, /30%/]) {
    const b = roleButtonOrTab(preview, re);
    if ((await b.count()) > 0 && (await b.first().isVisible())) scaleBtns.push(b.first());
  }
  if (scaleBtns.length >= 2) {
    await scaleBtns[0].click();
    await page.waitForTimeout(80);
    const beforeScale = await snapToolState();
    await scaleBtns[1].click();
    await page.waitForTimeout(80);
    const afterScale = await snapToolState();
    assert.notEqual(
      JSON.stringify(beforeScale),
      JSON.stringify(afterScale),
      'Pliw Scroll scale preset switching produced no state delta',
    );
  }
}

async function exercisePliwGeoPreview(page, preview) {
  await scrollAndHydrate(page, preview);

  const coordRe = /[-]?\d+\.\d+\s*°?\s*[NS]?.*[-]?\d+\.\d+/i;
  const initialText = await preview.innerText();
  assert.match(initialText, coordRe, `Pliw Geo preview missing initial coordinate readout in: ${initialText.slice(0, 200)}`);

  const northBtn = preview.getByRole('button', { name: /^(N|North|↑)$/i }).first();
  const eastBtn = preview.getByRole('button', { name: /^(E|East|→)$/i }).first();
  assert.ok((await northBtn.count()) > 0, 'Pliw Geo preview missing North (N) button');
  assert.ok((await eastBtn.count()) > 0, 'Pliw Geo preview missing East (E) button');

  const parseFirstLat = (text) => {
    const degMatch = text.match(/([-]?\d+\.\d+)\s*°\s*[NS]/i);
    if (degMatch) return Number.parseFloat(degMatch[1]);
    const pairMatch = text.match(/([-]?\d+\.\d{3,})[^\d-]+([-]?\d+\.\d{3,})/);
    if (pairMatch) return Number.parseFloat(pairMatch[1]);
    return null;
  };

  const northDelta = await pollDelta(() => northBtn.click(), () => preview.innerText());
  const eastDelta = await pollDelta(() => eastBtn.click(), () => preview.innerText());
  assert.ok(northDelta.changed || eastDelta.changed, 'Pliw Geo N/E buttons did not update coordinates or UI');
  const defaultLatBefore = parseFirstLat(northDelta.before);
  const defaultLatAfter = parseFirstLat(northDelta.after);
  const defaultLatDelta =
    defaultLatBefore !== null && defaultLatAfter !== null ? Math.abs(defaultLatAfter - defaultLatBefore) : null;

  // Step size selector (10m / 100m / 1km)
  const kmBtn = roleButtonOrTab(preview, /1\s*km/i).first();
  if ((await kmBtn.count()) > 0 && (await kmBtn.isVisible())) {
    const snapKmBtn = () =>
      kmBtn.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          pressed: el.getAttribute('aria-pressed'),
          selected: el.getAttribute('aria-selected'),
          cls: el.className,
          bg: cs.backgroundColor,
          color: cs.color,
          border: cs.borderColor,
        };
      });
    const kmBtnDelta = await pollDelta(() => kmBtn.click(), snapKmBtn, 800);
    const kmDelta = await pollDelta(() => northBtn.click(), () => preview.innerText());
    assert.ok(kmDelta.changed, 'Pliw Geo 1km step movement did not update coordinates');
    const kmLatBefore = parseFirstLat(kmDelta.before);
    const kmLatAfter = parseFirstLat(kmDelta.after);
    const kmLatDelta =
      kmLatBefore !== null && kmLatAfter !== null ? Math.abs(kmLatAfter - kmLatBefore) : null;
    const largerStepProduced =
      defaultLatDelta !== null && kmLatDelta !== null && defaultLatDelta > 0 && kmLatDelta > defaultLatDelta * 1.5;
    assert.ok(
      kmBtnDelta.changed || largerStepProduced,
      `Pliw Geo 1 km step button did not update active state or increase North coordinate step (default=${defaultLatDelta}, 1km=${kmLatDelta})`,
    );
  } else {
    const stepSelect = preview.locator('select').first();
    if ((await stepSelect.count()) > 0 && (await stepSelect.isVisible())) {
      const opts = await stepSelect.locator('option').allTextContents();
      if (opts.length >= 2) {
        const prevVal = await stepSelect.inputValue();
        await stepSelect.selectOption({ index: opts.length - 1 });
        await page.waitForTimeout(80);
        const nextVal = await stepSelect.inputValue();
        const selectDelta = await pollDelta(() => northBtn.click(), () => preview.innerText());
        assert.ok(selectDelta.changed, 'Pliw Geo step select movement did not update coordinates');
        assert.notEqual(nextVal, prevVal, 'Pliw Geo step <select> did not change selected value');
      }
    }
  }

  // City presets (must change coordinates if city preset buttons exist)
  const cityButtons = [];
  for (const cityRe of [/London/i, /New York/i, /Bangkok/i, /Singapore/i, /Tokyo/i, /Paris/i, /Sydney/i]) {
    const cityBtn = preview.getByRole('button', { name: cityRe }).first();
    if ((await cityBtn.count()) > 0 && (await cityBtn.isVisible())) {
      cityButtons.push(cityBtn);
    }
  }
  if (cityButtons.length > 0) {
    let cityChanged = false;
    for (const cityBtn of cityButtons) {
      const pressed = await cityBtn.getAttribute('aria-pressed');
      if (pressed === 'true' && cityButtons.length > 1) continue;
      const cityDelta = await clickAndExpectDelta(page, cityBtn, () => preview.innerText());
      if (cityDelta.changed) {
        cityChanged = true;
        break;
      }
    }
    if (!cityChanged) {
      for (const cityBtn of cityButtons) {
        const cityDelta = await clickAndExpectDelta(page, cityBtn, () => preview.innerText());
        if (cityDelta.changed) {
          cityChanged = true;
          break;
        }
      }
    }
    assert.ok(cityChanged, 'Pliw Geo city preset buttons did not update visible coordinates');
  }

  // Jitter toggle
  const jitterCtrl = preview.getByRole('checkbox', { name: /jitter/i }).or(preview.getByRole('switch', { name: /jitter/i })).or(
    preview.getByRole('button', { name: /jitter/i }),
  );
  if ((await jitterCtrl.count()) > 0 && (await jitterCtrl.first().isVisible())) {
    const snapJitter = async () => ({
      text: await preview.innerText(),
      checked: await jitterCtrl.first().isChecked().catch(() => null),
      ariaChecked: await jitterCtrl.first().getAttribute('aria-checked').catch(() => null),
      pressed: await jitterCtrl.first().getAttribute('aria-pressed').catch(() => null),
    });
    const jitterDelta = await clickAndExpectDelta(page, jitterCtrl.first(), snapJitter);
    assert.ok(jitterDelta.changed, 'Pliw Geo jitter toggle did not update state');
  }

  // Spoofing status switch
  const spoofCtrl = preview
    .getByRole('checkbox', { name: /spoof|fake|active|real|enable|simulat/i })
    .or(preview.getByRole('switch', { name: /spoof|fake|active|real|enable|simulat/i }))
    .or(preview.getByRole('button', { name: /spoof|fake|active|paused|enable|disable|simulat/i }));
  if ((await spoofCtrl.count()) > 0 && (await spoofCtrl.first().isVisible())) {
    const snapSpoof = async () => ({
      text: await preview.innerText(),
      checked: await spoofCtrl.first().isChecked().catch(() => null),
      pressed: await spoofCtrl.first().getAttribute('aria-pressed').catch(() => null),
    });
    const spoofDelta = await clickAndExpectDelta(page, spoofCtrl.first(), snapSpoof);
    assert.ok(spoofDelta.changed, 'Pliw Geo spoofing status switch did not update state');
  }
}

export async function runTier4({ workspaceRoot, distDirOverride = null } = {}) {
  const distDir = distDirOverride || path.join(workspaceRoot, 'apps', 'public', 'dist');
  if (!fs.existsSync(distDir) || !fs.statSync(distDir).isDirectory()) {
    throw new Error(`dist/ not found at ${distDir} — run Tier 1 or "npm run build" in apps/public first.`);
  }

  const { check, summary } = createSuiteCollector('Tier 4 — Headless Chromium Interactive Scenarios');
  const srv = await startStaticServer(distDir, { mountPrefix: '/public' });
  const { browser } = await launchHeadlessBrowser();

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: srv.origin });

    // External image isolation: prevent offline external map tiles or remote images from hanging load or failing naturalWidth
    await context.route('**/*', async (route) => {
      const req = route.request();
      const url = req.url();
      if (!url.startsWith(srv.origin) && !url.startsWith('data:') && !url.startsWith('blob:')) {
        if (req.resourceType() === 'image') {
          try {
            const res = await route.fetch({ timeout: 3000 });
            if (res.ok()) {
              await route.fulfill({ response: res });
              return;
            }
          } catch {
            // Fall through to 1x1 PNG fallback
          }
          await route.fulfill({
            status: 200,
            contentType: 'image/png',
            body: PNG_1X1_BUFFER,
          });
          return;
        }
      }
      await route.continue();
    });

    // 1. All 6 routes HTTP 200, 1 visible H1, imgs naturalWidth > 0, no horizontal overflow, zero console/page/same-origin errors
    for (let i = 0; i < ROUTES.length; i += 1) {
      const r = ROUTES[i];
      await check(`T4-R${i + 1}`, `${r.label}: HTTP 200, 1 visible <h1>, valid <img>s, no overflow, 0 errors`, async () => {
        const page = await context.newPage();
        const telemetry = attachTelemetry(page, srv.origin);
        try {
          await openAndWait(page, `${srv.origin}${r.routePath}`);

          const visibleH1s = page.locator('h1:visible');
          const h1Count = await visibleH1s.count();
          assert.equal(h1Count, 1, `${r.routePath}: expected exactly 1 visible <h1>, found ${h1Count}`);
          const h1Text = (await visibleH1s.first().innerText()).trim();
          assert.match(h1Text, r.expectedH1, `${r.routePath}: <h1> "${h1Text}" did not match ${r.expectedH1}`);

          const brokenImgs = await page.evaluate(() =>
            [...document.querySelectorAll('img')]
              .filter((img) => {
                const st = getComputedStyle(img);
                return st.display !== 'none' && st.visibility !== 'hidden' && img.getBoundingClientRect().width > 0;
              })
              .filter((img) => !img.complete || img.naturalWidth === 0)
              .map((img) => img.getAttribute('src')),
          );
          assert.equal(brokenImgs.length, 0, `${r.routePath}: broken visible <img>(s): ${brokenImgs.join(', ')}`);

          const overflow = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
          }));
          assert.ok(
            overflow.scrollWidth <= overflow.innerWidth + 2,
            `${r.routePath}: horizontal overflow detected (${overflow.scrollWidth} > ${overflow.innerWidth})`,
          );

          telemetry.assertClean(r.routePath);
        } finally {
          await page.close();
        }
      });
    }

    // 2. Homepage Navbar discipline, Category filters (All / Apps / Extensions), uniform cards, non-overlap & Details navigation
    await check('T4-HP1', 'Homepage navbar discipline, All/Apps/Extensions category filters, uniform non-overlapping cards', async () => {
      const page = await context.newPage();
      const telemetry = attachTelemetry(page, srv.origin);
      try {
        await openAndWait(page, `${srv.origin}/public/`);

        // Navbar discipline
        const header = page.locator('header').first();
        assert.ok(await header.isVisible(), 'Homepage <header> not visible');
        const navItems = await header.locator('a:visible').evaluateAll((els) =>
          els.map((el) => ({ text: (el.textContent || '').trim(), href: el.getAttribute('href') || '' })),
        );
        assert.equal(navItems.length, 4, `Homepage <header> expected 4 visible links (Pliw App, Apps, Extensions, GitHub), got ${navItems.length}`);
        assert.ok(navItems.some((n) => /Pliw App/i.test(n.text)), 'Navbar missing Pliw App brand');
        assert.ok(navItems.some((n) => /^Apps$/i.test(n.text)), 'Navbar missing Apps link');
        assert.ok(navItems.some((n) => /^Extensions$/i.test(n.text)), 'Navbar missing Extensions link');
        assert.ok(navItems.some((n) => /GitHub/i.test(n.text) && n.href.includes('github.com')), 'Navbar missing GitHub link');
        for (const app of APPS_CATALOG) {
          assert.ok(
            !navItems.some((n) => n.text.toLowerCase().includes(app.name.toLowerCase()) || n.href.includes(`/${app.slug}/`)),
            `Navbar must not list individual app "${app.name}"`,
          );
        }

        // Category filters
        const main = page.locator('main').first();
        const allTab = roleButtonOrTab(main, /^\s*All(?:\s*\(\d+\))?\s*$/i).first();
        const appsTab = roleButtonOrTab(main, /^\s*Apps(?:\s*\(\d+\))?\s*$/i).first();
        const extTab = roleButtonOrTab(main, /^\s*Extensions(?:\s*\(\d+\))?\s*$/i).first();
        await scrollAndHydrate(page, allTab);
        assert.ok(await allTab.isVisible(), 'Homepage missing "All" filter tab');
        assert.ok(await appsTab.isVisible(), 'Homepage missing "Apps" filter tab');
        assert.ok(await extTab.isVisible(), 'Homepage missing "Extensions" filter tab');

        const isAppHeadingVisible = async (name) => {
          const h = main.getByRole('heading', { name: new RegExp(`^\\s*${escapeRegExp(name)}\\s*$`, 'i') });
          const c = await h.count();
          for (let k = 0; k < c; k += 1) {
            if (await h.nth(k).isVisible()) return true;
          }
          return false;
        };

        for (const app of APPS_CATALOG) {
          assert.ok(await isAppHeadingVisible(app.name), `Initial All view missing visible card for ${app.name}`);
        }

        await appsTab.click();
        await page.waitForTimeout(150);
        for (const app of APPS_CATALOG) {
          const vis = await isAppHeadingVisible(app.name);
          assert.equal(vis, app.category === 'Apps', `After clicking Apps: ${app.name} visible=${vis}`);
        }

        await extTab.click();
        await page.waitForTimeout(150);
        for (const app of APPS_CATALOG) {
          const vis = await isAppHeadingVisible(app.name);
          assert.equal(vis, app.category === 'Extensions', `After clicking Extensions: ${app.name} visible=${vis}`);
        }

        await allTab.click();
        await page.waitForTimeout(150);
        for (const app of APPS_CATALOG) {
          assert.ok(await isAppHeadingVisible(app.name), `After restoring All: ${app.name} not visible`);
        }

        // Card structure, icon naturalWidth, platform label, uniform widths & non-overlapping badge/preview check
        const cardWidths = [];
        for (const app of APPS_CATALOG) {
          const card = await findAppCard(page, app);
          const cardText = await card.innerText();
          assert.ok(!/Upcoming/i.test(cardText), `Card for ${app.name} contains forbidden "Upcoming" text`);
          assert.match(cardText, app.platformShort, `Card for ${app.name} missing platform label (${app.platformShort})`);

          const cardImgs = await card.locator('img:visible').evaluateAll((els) =>
            els.map((img) => ({ complete: img.complete, naturalWidth: img.naturalWidth, src: img.getAttribute('src') })),
          );
          assert.ok(cardImgs.length >= 1, `Card for ${app.name} missing visible icon <img>`);
          for (const im of cardImgs) {
            assert.ok(im.complete && im.naturalWidth > 0, `Card for ${app.name} has broken <img>: ${im.src}`);
          }

          const detailsLink = card.getByRole('link', { name: /Details/i }).first();
          assert.ok((await detailsLink.count()) > 0, `Card for ${app.name} missing Details link`);
          const detailsHref = await detailsLink.getAttribute('href');
          assert.ok(detailsHref && detailsHref.includes(`${app.slug}/`), `Card for ${app.name} Details href "${detailsHref}" missing ${app.slug}/`);

          const dlLink = card.getByRole('link', { name: /Download/i }).first();
          assert.ok((await dlLink.count()) > 0, `Card for ${app.name} missing Download link`);
          const dlHref = await dlLink.getAttribute('href');
          assert.ok(dlHref && /\.(?:dmg|zip)$/i.test(dlHref), `Card for ${app.name} Download href "${dlHref}" must end in .dmg or .zip`);

          const geom = await card.evaluate((el) => {
            const overlaps = (a, b) =>
              a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
            const cr = el.getBoundingClientRect();
            const allNodes = [...el.querySelectorAll('*')];
            const badgeNodes = allNodes.filter((n) => {
              const st = getComputedStyle(n);
              if (st.display === 'none' || st.visibility === 'hidden') return false;
              const txt = (n.textContent || '').trim();
              return /^v\d+\.\d+\.\d+$/.test(txt) && n.children.length === 0;
            });
            const badgeRect = badgeNodes[0]?.getBoundingClientRect() || null;
            const headingEl = el.querySelector('h2, h3, h4, h5');
            const headingRect = headingEl?.getBoundingClientRect() || null;
            const detailsEl = [...el.querySelectorAll('a')].find((a) => /Details/i.test(a.textContent || '')) || null;
            const previewCandidates = [...el.querySelectorAll('div')]
              .filter((d) => {
                if (headingEl && (d.contains(headingEl) || headingEl.contains(d))) return false;
                if (detailsEl && d.contains(detailsEl)) return false;
                const r = d.getBoundingClientRect();
                return r.width >= 150 && r.height >= 100;
              })
              .sort((a, b) => {
                const ra = a.getBoundingClientRect();
                const rb = b.getBoundingClientRect();
                return rb.width * rb.height - ra.width * ra.height;
              });
            const previewRect = previewCandidates[0]?.getBoundingClientRect() || null;
            let badgeOverlapsPreview = false;
            let badgeOverlapsHeading = false;
            if (badgeRect && previewRect) badgeOverlapsPreview = overlaps(badgeRect, previewRect);
            if (badgeRect && headingRect) badgeOverlapsHeading = overlaps(badgeRect, headingRect);

            let topAlignedDiff = null;
            if (headingEl && previewCandidates[0]) {
              const children = [...el.children];
              const leftCol = children.find((c) => c.contains(headingEl));
              const rightCol = children.find((c) => c.contains(previewCandidates[0]) || c === previewCandidates[0]);
              if (leftCol && rightCol && leftCol !== rightCol) {
                const lr = leftCol.getBoundingClientRect();
                const rr = rightCol.getBoundingClientRect();
                if (Math.abs(lr.left - rr.left) > 80) {
                  topAlignedDiff = Math.abs(lr.top - rr.top);
                }
              }
            }
            return {
              width: cr.width,
              hasBadge: Boolean(badgeRect),
              badgeOverlapsPreview,
              badgeOverlapsHeading,
              topAlignedDiff,
            };
          });

          cardWidths.push(geom.width);
          assert.ok(geom.hasBadge, `Card for ${app.name} missing visible version badge (vX.Y.Z)`);
          assert.equal(geom.badgeOverlapsPreview, false, `Card for ${app.name}: version badge overlaps preview frame`);
          assert.equal(geom.badgeOverlapsHeading, false, `Card for ${app.name}: version badge overlaps heading`);
          if (geom.topAlignedDiff !== null) {
            assert.ok(geom.topAlignedDiff <= 24, `Card for ${app.name}: columns not top-aligned (delta ${geom.topAlignedDiff}px)`);
          }
        }

        const minW = Math.min(...cardWidths);
        const maxW = Math.max(...cardWidths);
        assert.ok(maxW - minW <= 4, `Homepage cards do not have uniform width: min=${minW}, max=${maxW}`);

        // Navigate via Details link to verify MPA navigation
        const firstDetails = main.getByRole('link', { name: /Details/i }).first();
        await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), firstDetails.click()]);
        assert.ok(page.url().startsWith(`${srv.origin}/public/`), `Details link navigated outside /public/: ${page.url()}`);

        telemetry.assertClean('T4-HP1');
      } finally {
        await page.close();
      }
    });

    // 3. Homepage interactive preview smoke test on `/`
    await check('T4-HP2', 'Homepage interactive card previews respond to user interaction with zero errors', async () => {
      const page = await context.newPage();
      const telemetry = attachTelemetry(page, srv.origin);
      try {
        await openAndWait(page, `${srv.origin}/public/`);
        let interactiveCardsVerified = 0;

        for (const app of APPS_CATALOG) {
          const card = await findAppCard(page, app);
          await scrollAndHydrate(page, card);

          const btns = card.locator('button:visible, [role="tab"]:visible');
          const btnCount = await btns.count();
          let cardChanged = false;

          if (btnCount > 0) {
            const candidateIndices = [];
            for (let bIdx = 0; bIdx < btnCount; bIdx += 1) {
              const b = btns.nth(bIdx);
              const pressed = await b.getAttribute('aria-pressed');
              const selected = await b.getAttribute('aria-selected');
              if (pressed !== 'true' && selected !== 'true') {
                candidateIndices.push(bIdx);
              }
            }
            if (candidateIndices.length === 0) {
              if (btnCount >= 2) candidateIndices.push(1);
              candidateIndices.push(0);
            }
            const snapCard = () =>
              card.evaluate((el) => ({
                text: el.innerText,
                attrs: [...el.querySelectorAll('button, [role="tab"], [style]')].map((n) => ({
                  p: n.getAttribute('aria-pressed'),
                  s: n.getAttribute('aria-selected'),
                  t: getComputedStyle(n).transform,
                  bg: getComputedStyle(n).backgroundColor,
                })),
              }));
            for (const bIdx of candidateIndices.slice(0, 3)) {
              const delta = await clickAndExpectDelta(page, btns.nth(bIdx), snapCard, 1200);
              if (delta.changed) {
                cardChanged = true;
                interactiveCardsVerified += 1;
                break;
              }
            }
          }

          if (!cardChanged) {
            // Check pointer-tracking stage if present (e.g. Pliw Click)
            const stageBox = await card.evaluate((el) => {
              const heading = el.querySelector('h2, h3, h4, h5');
              const details = [...el.querySelectorAll('a')].find((a) => /Details/i.test(a.textContent || ''));
              const cands = [...el.querySelectorAll('div')]
                .filter((d) => {
                  if (heading && (d.contains(heading) || heading.contains(d))) return false;
                  if (details && d.contains(details)) return false;
                  const r = d.getBoundingClientRect();
                  return r.width >= 120 && r.height >= 80;
                })
                .sort((a, b) => {
                  const ra = a.getBoundingClientRect();
                  const rb = b.getBoundingClientRect();
                  return ra.width * ra.height - rb.width * rb.height;
                });
              const target = cands[0];
              if (!target) return null;
              const r = target.getBoundingClientRect();
              return { x: r.left, y: r.top, width: r.width, height: r.height };
            });

            if (stageBox) {
              const snapPointer = () =>
                card.evaluate((el) =>
                  [...el.querySelectorAll('*')].map((n) => {
                    const cs = getComputedStyle(n);
                    return `${cs.transform}|${cs.opacity}`;
                  }),
                );
              await page.mouse.move(stageBox.x + stageBox.width * 0.8, stageBox.y + stageBox.height * 0.25);
              await page.waitForTimeout(100);
              const s1 = await snapPointer();
              await page.mouse.move(stageBox.x + stageBox.width * 0.2, stageBox.y + stageBox.height * 0.75);
              await page.waitForTimeout(100);
              const s2 = await snapPointer();
              if (JSON.stringify(s1) !== JSON.stringify(s2)) {
                interactiveCardsVerified += 1;
              }
            }
          }
        }
        assert.ok(interactiveCardsVerified >= 1, 'Expected at least 1 interactive card preview on homepage to update DOM/styles on interaction');
        telemetry.assertClean('T4-HP2');
      } finally {
        await page.close();
      }
    });

    // 4-8. All 5 subpage interactive React previews
    const previewHandlers = [
      { id: 'T4-PV1', slug: 'monkey-tools', name: 'Monkey Tools', fn: exerciseMonkeyToolsPreview },
      { id: 'T4-PV2', slug: 'pliw-click', name: 'Pliw Click', fn: exercisePliwClickPreview },
      { id: 'T4-PV3', slug: 'pliw-collage', name: 'Pliw Collage', fn: exercisePliwCollagePreview },
      { id: 'T4-PV4', slug: 'pliw-scroll', name: 'Pliw Scroll', fn: exercisePliwScrollPreview },
      { id: 'T4-PV5', slug: 'pliw-geo', name: 'Pliw Geo', fn: exercisePliwGeoPreview },
    ];

    for (const p of previewHandlers) {
      await check(p.id, `${p.name} subpage interactive React preview responds with real DOM/style deltas`, async () => {
        const page = await context.newPage();
        const telemetry = attachTelemetry(page, srv.origin);
        try {
          await openAndWait(page, `${srv.origin}/public/${p.slug}/`);
          const { preview } = await locateSubpageSections(page);
          await p.fn(page, preview);
          telemetry.assertClean(p.id);
        } finally {
          await page.close();
        }
      });
    }

    // 9-13. Quick Install Copy + 5-part DOM/bounding-box vertical order + Hero/Footer invariants on all 5 subpages
    for (let i = 0; i < APPS_CATALOG.length; i += 1) {
      const app = APPS_CATALOG[i];
      await check(
        `T4-QI${i + 1}`,
        `${app.name} subpage: 5-part vertical/DOM order, Hero/Footer invariants, and Quick Install interaction`,
        async () => {
          const page = await context.newPage();
          const telemetry = attachTelemetry(page, srv.origin);
          try {
            await openAndWait(page, `${srv.origin}/public/${app.slug}/`);
            const { header, hero, preview, install, footer, topSectionCount } = await locateSubpageSections(page);
            assert.equal(topSectionCount, 3, `${app.slug}: expected 3 top-level <section>s in <main>, found ${topSectionCount}`);
            assert.equal(await page.locator('video').count(), 0, `${app.slug}: forbidden <video> found`);

            // Check strict DOM order & top-to-bottom non-overlapping bounding boxes
            const blocks = [header, hero, preview, install, footer];
            const rects = [];
            for (const b of blocks) {
              assert.ok(await b.isVisible(), `${app.slug}: one of the 5 layout blocks is not visible`);
              rects.push(await b.boundingBox());
            }
            for (let j = 0; j < rects.length - 1; j += 1) {
              assert.ok(
                rects[j].y < rects[j + 1].y && rects[j].y + rects[j].height <= rects[j + 1].y + 2,
                `${app.slug}: block ${j} overlaps or is out of vertical order with block ${j + 1}`,
              );
            }

            const domOrdered = await page.evaluate(() => {
              const h = document.querySelector('header');
              const m = document.querySelector('main');
              const f = document.querySelector('footer');
              const secs = m ? [...m.querySelectorAll(':scope > section')] : [];
              const nodes = [h, ...secs, f].filter(Boolean);
              if (nodes.length !== 5) return false;
              for (let k = 0; k < nodes.length - 1; k += 1) {
                if ((nodes[k].compareDocumentPosition(nodes[k + 1]) & Node.DOCUMENT_POSITION_FOLLOWING) === 0) {
                  return false;
                }
              }
              return true;
            });
            assert.ok(domOrdered, `${app.slug}: 5 layout parts not in strict DOM order`);

            // Hero completeness & invariants
            const heroImg = hero.locator('img:visible').first();
            assert.ok((await heroImg.count()) > 0, `${app.slug}: Hero missing visible icon <img>`);
            const heroImgOk = await heroImg.evaluate((img) => img.complete && img.naturalWidth > 0);
            assert.ok(heroImgOk, `${app.slug}: Hero icon <img> failed to load (naturalWidth === 0)`);

            const heroSubtitle = hero.locator('p:visible').first();
            assert.ok((await heroSubtitle.count()) > 0, `${app.slug}: Hero missing visible subtitle <p>`);
            const subtitleText = (await heroSubtitle.innerText()).trim();
            assert.ok(subtitleText.length > 0, `${app.slug}: Hero subtitle <p> is empty`);

            const heroDlLink = hero.getByRole('link', { name: /Download/i }).first();
            assert.ok(await heroDlLink.isVisible(), `${app.slug}: Hero missing visible Download link`);
            const heroDlText = await heroDlLink.innerText();
            const heroDlHref = await heroDlLink.getAttribute('href');
            assert.match(heroDlText, /v\d+\.\d+\.\d+/, `${app.slug}: Hero Download button missing version tag`);
            assert.ok(heroDlHref && /\.(?:dmg|zip)$/i.test(heroDlHref), `${app.slug}: Hero Download href "${heroDlHref}" must end in .dmg or .zip`);

            const heroGhLink = hero.getByRole('link', { name: /GitHub/i }).first();
            assert.ok(await heroGhLink.isVisible(), `${app.slug}: Hero missing visible GitHub link`);
            const heroGhHref = await heroGhLink.getAttribute('href');
            assert.ok(heroGhHref && heroGhHref.includes(app.repoUrlPart), `${app.slug}: Hero GitHub href "${heroGhHref}" missing ${app.repoUrlPart}`);

            const heroText = await hero.innerText();
            assert.ok(!/MIT\s+License/i.test(heroText), `${app.slug}: Hero must not contain MIT License`);
            const compatMatches = heroText.match(app.compatPill) || [];
            assert.equal(compatMatches.length, 1, `${app.slug}: Hero must contain exactly 1 compatibility pill`);

            const footerText = await footer.innerText();
            assert.match(footerText, /\bMIT\b/i, `${app.slug}: Footer missing MIT License`);

            // Quick Install Copy button (scoped strictly to install section)
            await scrollAndHydrate(page, install);
            if (app.type === 'macos') {
              const installText = await install.innerText();
              assert.match(installText, /xattr\s+-cr[\s\S]*\/Applications\//i, `${app.slug}: Quick Install missing xattr -cr`);
              const copyBtn = install.getByRole('button', { name: /copy/i }).first();
              assert.ok(await copyBtn.isVisible(), `${app.slug}: Quick Install Copy button not visible`);

              await copyBtn.click();
              const installHandle = await install.elementHandle();
              await page.waitForFunction(
                (el) => Boolean(el && (/copied/i.test(el.innerText) || el.querySelector('[aria-label*="copied" i]'))),
                installHandle,
                { timeout: 1500 },
              );
              const clipText = await page.evaluate(() => navigator.clipboard.readText());
              assert.match(clipText, /xattr\s+-cr[\s\S]*\/Applications\//i, `${app.slug}: clipboard content did not contain xattr -cr /Applications/: "${clipText}"`);
            } else {
              const installText = await install.innerText();
              assert.match(installText, /chrome:\/\/extensions\//i, `${app.slug}: Quick Install missing chrome://extensions/`);
              assert.match(installText, /Developer mode/i, `${app.slug}: Quick Install missing Developer mode`);
              assert.match(installText, /Load unpacked/i, `${app.slug}: Quick Install missing Load unpacked`);
            }

            telemetry.assertClean(`T4-QI-${app.slug}`);
          } finally {
            await page.close();
          }
        },
      );
    }

    await context.close();
  } finally {
    await browser.close();
    await srv.close();
  }

  return summary();
}
