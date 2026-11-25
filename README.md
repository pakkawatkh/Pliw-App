# Pliw App — macOS Utilities & Browser Extensions

> Public release portal and download hub for open-source macOS utilities and Manifest V3 Chromium extensions built by **Pakkawat.k**.
> Live site: **https://pakkawatkh.github.io/public/**

---

## Published Applications & Extensions

| App / Extension | Platform | Latest Version | Download | Live Page | Source Code |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **Monkey Tools** | macOS 13.0+ | `v2.3.6` | [DMG (1.8 MB)](https://pakkawatkh.github.io/public/monkey-tools/monkey-tools-Installer.dmg) | [Website](https://pakkawatkh.github.io/public/monkey-tools/) | [GitHub](https://github.com/pakkawatkh/Monkey-Tools) |
| **Pliw Click** | macOS 13.0+ | `v1.3.4` | [DMG (2.1 MB)](https://pakkawatkh.github.io/public/pliw-click/pliw-click-Installer.dmg) | [Website](https://pakkawatkh.github.io/public/pliw-click/) | [GitHub](https://github.com/pakkawatkh/Pliw-Click) |
| **Pliw Collage** | macOS 13.0+ | `v3.1.2` | [DMG (1.8 MB)](https://pakkawatkh.github.io/public/pliw-collage/pliw-collage-Installer.dmg) | [Website](https://pakkawatkh.github.io/public/pliw-collage/) | [GitHub](https://github.com/pakkawatkh/Pliw-Collage) |
| **Pliw Scroll** | Chrome / Brave / Edge | `v1.2.2` | [ZIP (61 KB)](https://pakkawatkh.github.io/public/pliw-scroll/pliw-scroll-v1.2.2.zip) | [Website](https://pakkawatkh.github.io/public/pliw-scroll/) | [GitHub](https://github.com/pakkawatkh/Pliw-Extension) |
| **Pliw Geo** | Chrome / Brave / Edge | `v1.1.2` | [ZIP (32 KB)](https://pakkawatkh.github.io/public/pliw-geo/pliw-geo-v1.1.2.zip) | [Website](https://pakkawatkh.github.io/public/pliw-geo/) | [GitHub](https://github.com/pakkawatkh/Pliw-Extension) |

---

## App Highlights & Previews

### Monkey Tools (`v2.3.6`)
- **Overview:** Clipboard history, offline image OCR (Apple Vision), continuous emoji picker, smart selection translator, and live Menu Bar network speed monitor.
- **Interactive Preview:** [Monkey Tools Showcase](https://pakkawatkh.github.io/public/monkey-tools/#preview)

### Pliw Click (`v1.3.4`)
- **Overview:** Windows-style browser autoscroll with a compact `28pt` frosted-glass 360° orb, 2–10 finger Trackpad middle-click & tap, full Middle-Drag, Thai/English UI, and floating glass update toast.
- **Interactive Preview:** [360° Orb Preview](https://pakkawatkh.github.io/public/pliw-click/#preview)

### Pliw Collage (`v3.1.2`)
- **Overview:** Native macOS Video Collage Studio (`9:16`, `4:5`, `1:1`, `16:9`, custom grids up to `6×6`), pan/zoom framing, trim, border/corner styling, per-slot audio, and fast MP4 export.
- **Interactive Preview:** [Collage Studio Preview](https://pakkawatkh.github.io/public/pliw-collage/#preview)

### Pliw Scroll (`v1.2.2`) & Pliw Geo (`v1.1.2`)
- **Pliw Scroll:** Full-page scrolling screenshot with sticky header protection, 9-tool annotation studio (pen, highlighter, arrow, rectangle, ellipse, line, text, pixelate, eraser), 8-handle crop box, and multi-scale clipboard copy (`100%`, `50%`, `30%`). [Preview](https://pakkawatkh.github.io/public/pliw-scroll/#preview)
- **Pliw Geo:** Browser geolocation spoofer with map picker, place presets, GPS jitter, and live N/S/E/W movement controls. [Preview](https://pakkawatkh.github.io/public/pliw-geo/#preview)

---

## Installation Guide

### macOS Native Apps (`Monkey Tools`, `Pliw Click`, `Pliw Collage`)
1. Download the `.dmg` installer from the table above and open it.
2. Drag the app bundle into your **Applications** folder (`monkey-tools.app`, `Pliw Click.app`, or `Pliw Collage.app`).
3. **First-time Gatekeeper unblock:** If macOS reports that the developer cannot be verified, allow the app in **System Settings → Privacy & Security → Open Anyway**, or run the corresponding command in Terminal:
   ```bash
   xattr -cr "/Applications/monkey-tools.app"
   xattr -cr "/Applications/Pliw Click.app"
   xattr -cr "/Applications/Pliw Collage.app"
   ```
4. **Accessibility Permission** *(required for `Monkey Tools` and `Pliw Click`)*:
   - Enable the app in **System Settings → Privacy & Security → Accessibility**.

### Chromium Browser Extensions (`Pliw Scroll`, `Pliw Geo`)
1. Download the `.zip` archive and unzip it.
2. Open `chrome://extensions/` (or `brave://extensions/` / `edge://extensions/`).
3. Turn on **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the unzipped extension folder (`pliw-scroll` or `pliw-geo`).

---

## Portal Development (Astro + React)

This site is built as a static Astro portal (`site: 'https://pakkawatkh.github.io'`, `base: '/public'`) with interactive React preview islands.

```text
apps/public/
├── .github/workflows/deploy.yml   # Builds dist/ and deploys to GitHub Pages on push to main
├── astro.config.mjs               # Astro + React configuration
├── public/                        # Static installers, version.json feeds, icons, and assets
└── src/
    ├── data/                      # Build-time catalog & version/size loader (types.ts, apps.ts)
    ├── styles/                    # Shared design tokens (tokens.css)
    ├── layouts/                   # BaseLayout.astro and AppDetailLayout.astro
    ├── components/                # SiteHeader, SiteFooter, CatalogExplorer, QuickInstall, previews/
    └── pages/                     # Static routes (/, /monkey-tools/, /pliw-click/, /pliw-collage/, /pliw-scroll/, /pliw-geo/)
```

### Local Commands
```bash
npm install
npm run dev      # Start local Astro dev server
npm run build    # Build production static output into dist/
npm run preview  # Preview the built dist/ output locally
```

---

## License

All apps and extensions in the **Pliw App** catalog are open source under the **[MIT License](LICENSE)**. Copyright © 2026 Pakkawat.k.
