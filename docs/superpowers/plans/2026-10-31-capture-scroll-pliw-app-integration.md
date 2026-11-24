# Capture Scroll Extension Integration into Pliw App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the **Capture Scroll** Chromium browser extension from `pliw-extension/capture-scroll` into the public `pliw-app` distribution hub and launch its dedicated landing page at `https://pakkawatkh.github.io/pliw-app/capture-scroll/`.

**Architecture:** Distribute the extension as a clean standalone archive (`capture-scroll-v1.0.0.zip`), construct a high-converting Apple-grade glassmorphic landing page (`pliw-app/capture-scroll/index.html`), and update the central hub portal (`pliw-app/index.html`) to showcase both macOS utilities and browser extensions.

**Tech Stack:** HTML5, CSS3 (Modern Glassmorphism & ProMotion-like transitions), Vanilla JavaScript, SVG, Schema.org JSON-LD, Zip packaging.

**Spec:** [`docs/superpowers/specs/2026-10-31-capture-scroll-pliw-app-integration-design.md`](file:///Users/pakkawat/Documents/clipboard/docs/superpowers/specs/2026-10-31-capture-scroll-pliw-app-integration-design.md)

## Global Constraints

- **Static Distribution:** All pages must remain pure static HTML/CSS/JS without npm/bundler dependencies so they run seamlessly on GitHub Pages.
- **Visual Design Parity:** All new UI elements must follow the design language established in `pliw-app` and `monkey-tools/index.html` (light mode clean Apple aesthetic, SF Pro font stack, glassmorphism, rounded pill buttons, subtle borders).
- **Download Integrity:** `capture-scroll-v1.0.0.zip` must contain a valid Manifest V3 structure that can be unzipped and directly loaded into Chrome/Brave/Edge via Developer Mode without missing files.

## Review Focus

1. **ZIP archive root structure:** Unzipping must not produce nested wrapper folders that confuse "Load unpacked" users; `manifest.json` must be directly accessible.
2. **Relative links and asset paths:** Assets and navigation links must work both on local file system / local preview servers and under GitHub Pages subpath `https://pakkawatkh.github.io/pliw-app/`.
3. **Mobile layout responsiveness:** The new Capture Scroll card in `pliw-app/index.html` and the landing page must adapt cleanly to screens under 860px and 480px.
4. **Existing functionality preservation:** The Monkey Tools video player, audio unmute toggle, DMG download link, and spec pills on `pliw-app/index.html` must remain fully intact.
5. **Cross-browser install instructions:** Guide must accurately cover specific steps for Chrome, Brave, and Edge.

---

### Task 1: Package Capture Scroll Extension & Prepare Assets

**Files:**
- Create: `pliw-app/capture-scroll/assets/`
- Create: `pliw-app/capture-scroll/capture-scroll-v1.0.0.zip`

**Interfaces:**
- Consumes: `pliw-extension/capture-scroll/` files (`manifest.json`, `icons/`, `popup/`, `scripts/`, `preview/`)
- Produces: `capture-scroll-v1.0.0.zip` downloadable binary and local icon assets for the landing page

- [ ] **Step 1: Create directory structure and copy assets**
  Create `pliw-app/capture-scroll/assets/` and copy icons (`icon128.png`, `icon48.png`, `icon32.png`, `icon16.png`) from `pliw-extension/capture-scroll/icons/`.

- [ ] **Step 2: Generate clean distribution ZIP**
  Package `manifest.json`, `icons`, `popup`, `scripts`, `preview`, and `README.md` into `pliw-app/capture-scroll/capture-scroll-v1.0.0.zip`, excluding git and OS metadata (`.DS_Store`).

- [ ] **Step 3: Verify archive integrity**
  Run `unzip -t pliw-app/capture-scroll/capture-scroll-v1.0.0.zip` and verify `manifest.json` is at the root of the archive and valid.

- [ ] **Step 4: Commit assets and zip**
  ```bash
  cd pliw-app && git add capture-scroll/assets capture-scroll/capture-scroll-v1.0.0.zip
  git commit -m "feat(capture-scroll): package v1.0.0 extension zip and icon assets"
  ```

---

### Task 2: Create Dedicated Landing Page (`capture-scroll/index.html`)

**Files:**
- Create: `pliw-app/capture-scroll/index.html`

**Interfaces:**
- Consumes: `capture-scroll/capture-scroll-v1.0.0.zip`, `capture-scroll/assets/`
- Produces: `https://pakkawatkh.github.io/pliw-app/capture-scroll/` standalone product landing page

- [ ] **Step 1: Draft the HTML landing page structure**
  Include:
  - High-SEO head tags (Schema.org `SoftwareApplication` & `FAQPage`, OpenGraph, Twitter Cards).
  - Navigation bar with back link to Pliw App Hub and direct link to Monkey Tools.
  - Hero Section: Headline, Subtitle, Chrome/Brave/Edge browser pill badges, Primary CTA (Direct Download `.zip`), and Secondary CTA (Anchor to Install Guide).
  - Interactive Visual Studio Preview Mockup: Stylized mockup of a browser tab capturing full document height, transitioning into the Studio Cropper with 8 resize handles and clipboard copy toast.
  - Deep Dive Feature Grid:
    - 📸 Automated Scroll & Physical High-DPI Canvas Stitching.
    - ✂️ Studio Cropper with Live Dimension Display.
    - 📋 One-Click Native Clipboard Copy (`⌘V` ready for Figma/Slack).
    - 🔒 100% Offline, Zero Telemetry, Manifest V3.
  - Step-by-Step Developer Mode Installation Guide:
    - Visual guide for Chrome (`chrome://extensions`), Brave (`brave://extensions`), and Edge (`edge://extensions`).
    - Steps: 1. Download & Unzip, 2. Open Extension Manager, 3. Toggle Developer Mode, 4. Load Unpacked & Pin.
  - FAQ section answering common questions (Is it free? How does crop work? Why developer mode?).
  - Footer matching Pliw App theme.

- [ ] **Step 2: Implement styling and interactions**
  Add cohesive CSS styles using custom properties matching `pliw-app`, responsive breakpoints for mobile/desktop, interactive copy-snippet or tab buttons if needed, and smooth scrolling.

- [ ] **Step 3: Verify landing page**
  Test HTML markup, verify all internal anchors, download link targeting `capture-scroll-v1.0.0.zip`, and responsiveness.

- [ ] **Step 4: Commit landing page**
  ```bash
  cd pliw-app && git add capture-scroll/index.html
  git commit -m "feat(capture-scroll): create dedicated glassmorphic landing page"
  ```

---

### Task 3: Update Central Hub Portal (`pliw-app/index.html`)

**Files:**
- Modify: `pliw-app/index.html`

**Interfaces:**
- Consumes: `capture-scroll/`, `capture-scroll/capture-scroll-v1.0.0.zip`
- Produces: Updated central hub showcasing both Monkey Tools and Capture Scroll

- [ ] **Step 1: Update Navigation & Hero Header**
  - Update Nav links: add `<li><a href="capture-scroll/">Capture Scroll</a></li>`.
  - Update Hero badge to: `Thoughtfully Handcrafted • macOS Utilities & Chromium Extensions`.
  - Update Hero title/subtitle to reflect the unified productivity suite.

- [ ] **Step 2: Add Capture Scroll Featured App Card to Apps Catalog**
  Insert a new featured card in `.apps-grid`:
  - Ribbon: `● Released v1.0.0 • Extension`
  - Icon: 📸 Gradient icon or `capture-scroll/assets/icon128.png`
  - Title: **Capture Scroll**
  - Subtitle: **Full-Page Scrolling Screenshot & Interactive Studio Cropper**
  - Description: Auto-scrolls and stitches full-length web pages onto physical Retina canvas, with built-in 8-handle Crop Studio and direct `⌘V` clipboard copy.
  - Feature tags: `📸 Auto-Stitch Canvas`, `✂️ 8-Handle Cropper`, `📋 One-Click ⌘V Copy`, `🖥️ Retina 2x Crisp`, `⚡ Manifest V3`
  - Action buttons:
    - "View App Details & Tour →" (`href="capture-scroll/"`)
    - "Download Extension (.ZIP)" (`href="capture-scroll/capture-scroll-v1.0.0.zip" download`)
    - "Installation Guide" (`href="capture-scroll/#install"`)
  - Quick specs column:
    - Target: Chromium (Chrome, Brave, Edge)
    - Package: Manifest V3 (.ZIP)
    - Privacy: 100% Offline / Local

- [ ] **Step 3: Update Footer and cross-links**
  Add Capture Scroll to footer links.

- [ ] **Step 4: Verify Hub page layout**
  Check that Monkey Tools promo video, specs, and layout remain unaffected while Capture Scroll is presented with equal polish.

- [ ] **Step 5: Commit hub updates**
  ```bash
  cd pliw-app && git add index.html
  git commit -m "feat(hub): feature Capture Scroll browser extension in applications catalog"
  ```

---

### Task 4: Documentation, Sitemap & Final Verification

**Files:**
- Modify: `pliw-app/README.md`
- Modify: `pliw-app/monkey-tools/sitemap.xml` / create root `pliw-app/sitemap.xml`

- [ ] **Step 1: Update README.md**
  Add **Capture Scroll** under Available Applications in `pliw-app/README.md` with features, direct zip link, and official website URL (`https://pakkawatkh.github.io/pliw-app/capture-scroll/`).

- [ ] **Step 2: Update or add sitemap**
  Ensure root `sitemap.xml` lists:
  - `https://pakkawatkh.github.io/pliw-app/`
  - `https://pakkawatkh.github.io/pliw-app/monkey-tools/`
  - `https://pakkawatkh.github.io/pliw-app/capture-scroll/`

- [ ] **Step 3: End-to-end verification**
  - Verify all relative links work properly.
  - Verify zip download extracts correctly and contains `manifest.json`.
  - Check responsive rendering on small viewports.

- [ ] **Step 4: Commit documentation & sitemap**
  ```bash
  cd pliw-app && git add README.md sitemap.xml
  git commit -m "docs: catalog Capture Scroll in README and update sitemap"
  ```
