# Design Spec: Capture Scroll Extension Integration into Pliw App Hub

- **Date:** 2026-10-31
- **Status:** Proposed (Awaiting Approval)
- **Target Repository:** `pliw-app` (`https://pakkawatkh.github.io/pliw-app/`)
- **Source Extension:** `pliw-extension/capture-scroll`

---

## 1. Intent & Context (The "Why")

`pliw-app` serves as the official public portal and distribution hub for productivity utilities built by Pakkawat.k. Until now, it exclusively showcased native macOS software (`monkey-tools`).

A new browser extension, **Capture Scroll**, was developed in the companion repository `pliw-extension/capture-scroll`. It provides full-page scrolling screenshots with automated HTML5 canvas stitching, an interactive 8-handle Crop Studio, and one-click `⌘V` clipboard copy.

The intent of this project is to integrate **Capture Scroll** seamlessly into the public Pliw App suite on GitHub Pages (`https://pakkawatkh.github.io/pliw-app/`), elevating the site from a single-app macOS portal into a cohesive multi-product suite covering both **macOS Native Applications** and **Browser Extensions**.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Hub Portal Updates (`pliw-app/index.html`)**:
  - Update branding/copy from macOS-only to unified "macOS & Browser Productivity Suite".
  - Add **Capture Scroll** as a prominent application card in the catalog with status badge (`🧩 Extension v1.0.0`), key feature tags, direct `.zip` download button, and a link to the dedicated landing page.
  - Update top navigation to include links to both Monkey Tools and Capture Scroll.
- **Dedicated Landing Page (`pliw-app/capture-scroll/index.html`)**:
  - Build a showcase page matching the Apple-grade glassmorphic aesthetic of `monkey-tools/index.html`.
  - Include rich feature breakdowns (Full-Page Canvas Stitching, Interactive Crop Studio, One-Click `⌘V` Clipboard Copy, Retina 2x Crisp Rendering).
  - Provide a clear, visual 4-step developer mode installation guide for Chromium browsers (**Google Chrome**, **Brave Browser**, **Microsoft Edge**).
  - Include interactive/visual demo preview of the extension UI.
  - Include FAQ section and SEO Schema.org (`SoftwareApplication`, `FAQPage`) metadata.
- **Distribution Package**:
  - Package `pliw-extension/capture-scroll` into a clean, ready-to-load `capture-scroll-v1.0.0.zip` located in `pliw-app/capture-scroll/`.
  - Copy necessary icon assets (`icon128.png`, `icon48.png`, `icon32.png`, `icon16.png`) to `pliw-app/capture-scroll/assets/`.
- **Repository Documentation**:
  - Update `pliw-app/README.md` to catalog Capture Scroll alongside Monkey Tools with download links and descriptions.

### Non-Goals
- Publishing to Chrome Web Store / Edge Add-ons store in this phase (distribution will be via direct unpacked `.zip` download with developer mode instructions).
- Modifying the core extension codebase logic in `pliw-extension/capture-scroll` (unless fixing a packaging/asset path bug).

### Anti-Goals
- Breaking the existing layout or visual hierarchy of Monkey Tools.
- Bloating the static site with heavy client-side JavaScript frameworks (keeping it 100% vanilla HTML5/CSS3/JS, zero bundlers).

---

## 3. Approaches Considered

### Approach 1: Full Suite Hub + Dedicated Landing Page (Selected)
- Hub portal (`index.html`) features both apps in a categorized or ranked layout.
- A dedicated landing page `/capture-scroll/` is created with in-depth installation guide, feature demos, and direct `.zip` download.
- **Trade-offs:** Requires crafting a dedicated HTML page, but provides standalone URLs, complete documentation, superior UX, and parity with Monkey Tools.

### Approach 2: Hub Card Only
- Only add an extension card with an accordion/modal guide on `index.html`. No dedicated `/capture-scroll/` route.
- **Trade-offs:** Faster to build, but clutters the hub page and lacks dedicated shareable landing pages and SEO structure.

*Decision:* Approach 1 was chosen by the user for a comprehensive, professional presence.

---

## 4. Architecture & Implementation Details

### A. Asset & Packaging Strategy
1. Copy extension icons:
   - Source: `pliw-extension/capture-scroll/icons/`
   - Destination: `pliw-app/capture-scroll/assets/`
2. Create distribution archive:
   - Archive `pliw-extension/capture-scroll` (excluding unnecessary root README or git files) into:
   - `pliw-app/capture-scroll/capture-scroll-v1.0.0.zip`

### B. Hub Portal (`pliw-app/index.html`)
1. **Nav bar**: Add `<li><a href="capture-scroll/">Capture Scroll</a></li>`.
2. **Hero badge**: Update to "macOS & Browser Productivity Suite".
3. **Apps Grid**:
   - Section or tabs for apps, or sequential featured cards:
     - Card 1: **Monkey Tools** (Native macOS Swift App)
     - Card 2: **Capture Scroll** (Chromium Browser Extension)
   - Capture Scroll card features:
     - Badge: `🧩 Released v1.0.0`
     - Icon: 📸 gradient / official extension icon
     - Description: Full-page automated scroll screenshot with interactive crop studio and direct clipboard copy.
     - Feature tags: `📸 Auto-Stitch Canvas`, `✂️ 8-Handle Crop Studio`, `📋 Direct ⌘V Copy`, `🖥️ Retina 2x Support`, `⚡ Manifest V3`
     - Action buttons: "View Details & Guide →" and "Download Extension (.ZIP)".
     - Quick specs: Platform (Chrome / Brave / Edge), Manifest (V3), Size (~45 KB).

### C. Dedicated Landing Page (`pliw-app/capture-scroll/index.html`)
1. **Header & Navigation**: Matching brand styling with back link to Hub.
2. **Hero Section**:
   - Headline: "Full-Page Screenshots. Cropped & Copied in Seconds."
   - Subtitle: "The high-precision Chromium extension for designers, developers, and power users. Capture entire web pages with zero header stutter, crop with live pixel handles, and paste straight into Figma, Slack, or Notes."
   - CTA buttons: "Download Extension (.zip)" and "Installation Guide ↓".
3. **Interactive / Visual Studio Showcase**:
   - Visual mockup showing the browser window, popup triggering capture, and the Preview Studio with crop handles and copy confirmation.
4. **Core Capabilities (Deep Dive)**:
   - 1. Automated Scrolling & Smart Canvas Stitching (hiding sticky headers and scrollbars).
   - 2. Precision 8-Handle Interactive Crop Studio.
   - 3. One-Click Native Clipboard Copy (`⌘V` ready).
   - 4. 100% Offline & Private (pure local JavaScript, zero telemetry).
5. **Step-by-Step Installation Guide (Chromium)**:
   - Tabs or visually clear cards for Chrome, Brave, and Edge.
   - Instructions on toggling Developer Mode, clicking "Load unpacked", and pinning the extension.
6. **FAQ & Schema.org**:
   - Comprehensive answers regarding permissions, privacy, browser support.

### D. Documentation (`pliw-app/README.md`)
- Add a new section under Available Applications for Capture Scroll with direct link, zip download link, and feature checklist.

---

## 5. Verification & Testing Plan
- Test local rendering of `pliw-app/index.html` and `pliw-app/capture-scroll/index.html`.
- Test responsiveness across mobile (375px), tablet (768px), and desktop (1280px+).
- Verify `.zip` download link integrity and contents (extracting and verifying Manifest V3 loads unpacked in Chrome).
- Check navigation links and cross-linking between Hub, Monkey Tools, and Capture Scroll.
