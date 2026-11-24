# AGENTS.md — Tiffy-App Public Website & Release Portal Guide

> Repository-level playbook for AI coding agents maintaining **Tiffy-App** (`https://github.com/pakkawatkh/Tiffy-App`), the public GitHub Pages distribution hub at **`https://pakkawatkh.github.io/Tiffy-App/`**.

---

## 1. Project Overview

- **Role:** Public landing page, product detail pages, direct download hosting (`.dmg`, `.zip`), and In-App Auto-Updater `version.json` endpoints for all published Tiffy apps and extensions.
- **Live URL:** `https://pakkawatkh.github.io/Tiffy-App/` *(case-sensitive path — always use `Tiffy-App`, never lowercase `tiffy-app`)*
- **License:** Open Source — MIT License

### Published Catalog
- **Apps (macOS 13.0+):**
  - `monkey-tools/` → **Monkey Tools** (`https://github.com/pakkawatkh/monkey-tools`)
  - `tiffy-collage/` → **Tiffy Collage** (`https://github.com/pakkawatkh/Tiffy-Collage`)
  - `tiffy-click/` → **Tiffy Click** (`https://github.com/pakkawatkh/Tiffy-Click`)
- **Extensions (Chrome · Brave · Edge):**
  - `tiffy-scroll/` → **Tiffy Scroll** (`https://github.com/pakkawatkh/tiffy-extension`)
  - `tiffy-geo/` → **Tiffy Geo** (`https://github.com/pakkawatkh/tiffy-extension`)

---

## 2. Website Design & Copy Rules (Mandatory)

1. **100% English Website:** Zero Thai text anywhere in `*.html` or `README.md`.
2. **Human, Direct Product Copy (No AI Slop):**
   - Write like an indie Mac developer describing real tools — concrete, brief, and honest.
   - **Never** use AI-marketing clichés (e.g., *"Thoughtfully Handcrafted"*, *"curated suite"*, *"elevate your daily workflow"*, *"zero bloatware"*, *"Apple-Grade Craftsmanship"*, *"Liquid Glass"*, *"Fluid Glassmorphism"*).
   - **Never** put keyboard shortcuts (e.g., `⌘⇧V`, `⌘V`, `⌘1–9`) inside app descriptions or marketing blurbs.
3. **Homepage (`index.html`) Standards:**
   - **Navbar:** Minimal MacBook-style brand icon (`assets/favicon.svg`) + `Tiffy App` + only **`Apps`** and **`Extensions`** nav links + `GitHub` button. Do not list individual app names in the top navbar.
   - **Categories:** Group catalog into **Apps** and **Extensions** with working category filter tabs (`All`, `Apps`, `Extensions`).
   - **App Cards:** Uniform top-aligned layout (`align-items: start` with `padding-top: 58px` so the version pill never overlaps the preview). Each card shows only: Icon + App Name + Platform (`macOS 13.0+` / `Chrome · Brave · Edge`), 1-line purpose, 2 buttons (`Details →`, `Download DMG/ZIP (size)`), and the clean right-side preview window. No feature tag grids, no spec pills, no fake "Upcoming Apps" cards.
4. **Unified App Detail Page Template (`<app-slug>/index.html`):**
   - Every app subpage **must** use the shared stylesheet `../assets/app-page.css` and the exact same minimal structure:
     **Navbar → Hero → Preview → Quick Install → Footer**
   - **Hero contains only:** App Icon, `<h1>App Name</h1>`, 1-line purpose, Download button (with version & exact file size) + `GitHub` button, and a single compatibility pill (`macOS 13.0+ (Apple Silicon & Intel)` or `Chrome · Brave · Edge (Manifest V3)`). Do not duplicate `MIT License` in the hero (it belongs in the footer).
   - **No bloated Feature card grids** and **no legacy promo videos**.
   - **Cross-page consistency:** When improving `assets/app-page.css` or the shared page layout, apply the improvement across other app pages where appropriate; app-specific tweaks can stay local.

---

## 3. Standard Release & Update Checklist

Whenever an app or extension publishes a new version:

1. Verify the new installer (`.dmg` + `.zip`) is synced into `<app-slug>/` and check its exact human-readable file size (`ls -lh`).
2. Update `<app-slug>/version.json` (`latestVersion`, `downloadUrl`, `zipUrl`, `releaseNotes`, date) — verify all URLs use `https://pakkawatkh.github.io/Tiffy-App/`.
3. Update version and exact file size in:
   - `index.html`
   - `<app-slug>/index.html`
   - `README.md`
4. Verify zero Thai characters and zero broken links, then commit and push:
   ```bash
   git add -A
   git commit -m "chore(release): <App Name> vX.Y.Z"
   git push origin main
   ```
