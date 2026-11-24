# Business Card Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้างเว็บแอปพลิเคชันสำหรับออกแบบนามบัตรออนไลน์แบบอิสระ (Visual Canvas Editor) ปรับแต่งได้ทุกองค์ประกอบ ออกแบบมาเพื่อคนทำงานและนักธุรกิจโดยเฉพาะ พร้อมระบบ vCard QR Code, เทมเพลตระดับมืออาชีพ, และระบบ Export คุณภาพสูง (300 DPI / PDF พร้อมระยะตัดตกสำหรับโรงพิมพ์)

**Architecture:** Client-side React 19 + TypeScript + Vite architecture พร้อม SVG/DOM Interactive Canvas เพื่อความคมชัดระดับเวกเตอร์และรองรับ Web Fonts ภาษาไทยสมบูรณ์แบบ จัดการสถานะด้วย React Context, มีระบบ History (Undo/Redo), และ Export Engine ผ่าน html-to-image + jsPDF

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React, jspdf, html-to-image, qrcode, canvas-confetti

---

## Task Decomposition

### Task 1: Project Setup & Core Types
**Files:**
- Create: `business-card-studio/package.json`
- Create: `business-card-studio/vite.config.ts`
- Create: `business-card-studio/tsconfig.json`
- Create: `business-card-studio/tailwind.config.js`
- Create: `business-card-studio/src/types/card.ts`

- [ ] **Step 1:** Initialize Vite + React + TypeScript project with Tailwind CSS and install dependencies (`lucide-react`, `jspdf`, `html-to-image`, `qrcode`, `canvas-confetti`).
- [ ] **Step 2:** Define core TypeScript interfaces (`CardElement`, `CardSide`, `CardProject`, `CardDimension`, `TextElement`, `ShapeElement`, `ImageElement`, `QRCodeElement`).
- [ ] **Step 3:** Setup Google Fonts (Prompt, Sarabun, Kanit, Inter, Montserrat, Playfair Display, Cinzel) in `index.html`.

### Task 2: State Management & History (Undo / Redo)
**Files:**
- Create: `business-card-studio/src/context/CardContext.tsx`
- Create: `business-card-studio/src/hooks/useCardHistory.ts`
- Create: `business-card-studio/src/hooks/useKeyboardShortcuts.ts`
- Create: `business-card-studio/src/utils/storage.ts`

- [ ] **Step 1:** Implement `useCardHistory` for immutable state transitions and deep-clone undo/redo stacks.
- [ ] **Step 2:** Implement `CardContext` with element addition, deletion, mutation, z-index reordering, active side selection (Front/Back), and zoom controls.
- [ ] **Step 3:** Implement LocalStorage auto-save and recovery.
- [ ] **Step 4:** Implement keyboard shortcuts (Delete, Duplicate with Cmd/Ctrl+D, Arrow nudge, Shift+Arrow nudge, Cmd/Ctrl+Z undo/redo).

### Task 3: Interactive Visual Canvas & Transform Engine
**Files:**
- Create: `business-card-studio/src/components/canvas/CanvasViewport.tsx`
- Create: `business-card-studio/src/components/canvas/CardCanvas.tsx`
- Create: `business-card-studio/src/components/canvas/ElementRenderer.tsx`
- Create: `business-card-studio/src/components/canvas/TransformHandle.tsx`
- Create: `business-card-studio/src/components/canvas/GuidesOverlay.tsx`

- [ ] **Step 1:** Build `CardCanvas` with standard physical aspect ratio (90x54mm / 3.5x2in), background color/gradient, and bleed/safe-margin overlays.
- [ ] **Step 2:** Implement `TransformHandle` for interactive drag, multi-point resize (corners and edges), and rotation with bounding box handles.
- [ ] **Step 3:** Build `GuidesOverlay` showing smart snap guides (center vertical, center horizontal, edge alignment).
- [ ] **Step 4:** Build `ElementRenderer` supporting text, shapes, images, icons, and dynamic QR codes.

### Task 4: Content Elements & Left Sidebar Panels
**Files:**
- Create: `business-card-studio/src/components/sidebar/Sidebar.tsx`
- Create: `business-card-studio/src/components/sidebar/TemplatesPanel.tsx`
- Create: `business-card-studio/src/components/sidebar/TextPanel.tsx`
- Create: `business-card-studio/src/components/sidebar/QRPanel.tsx`
- Create: `business-card-studio/src/components/sidebar/ShapesPanel.tsx`
- Create: `business-card-studio/src/components/sidebar/IconsPanel.tsx`
- Create: `business-card-studio/src/components/sidebar/ImagesPanel.tsx`
- Create: `business-card-studio/src/components/sidebar/BackgroundPanel.tsx`
- Create: `business-card-studio/src/utils/vcard.ts`

- [ ] **Step 1:** Build `TextPanel` with presets (Name, Job Title, Company, Quick Contact Block) and Thai font previews.
- [ ] **Step 2:** Build `QRPanel` with form inputs (Full Name, Phone, Email, Company, Website, Note) and live vCard 3.0 generation.
- [ ] **Step 3:** Build `IconsPanel` with categorized business icons (Phone, Email, Globe, Pin, LinkedIn, X, Instagram, etc.).
- [ ] **Step 4:** Build `ShapesPanel` with lines, rectangles, rounded cards, badges, and separators.
- [ ] **Step 5:** Build `ImagesPanel` with local image file upload, company logo placement, and fit options.
- [ ] **Step 6:** Build `BackgroundPanel` for custom solid colors, gradients, and textures.

### Task 5: Curated Executive & Business Templates
**Files:**
- Create: `business-card-studio/src/constants/templates.ts`
- Modify: `business-card-studio/src/components/sidebar/TemplatesPanel.tsx`

- [ ] **Step 1:** Design 6 high-end professional templates:
  - Executive Minimalist (B&W clean, premium typography)
  - Corporate Elite (Deep Navy & Champagne Gold)
  - Tech Modern Dark (Charcoal & Electric Cyan with centered Back QR)
  - Luxury Matte & Bronze (Prestige serif, warm gold accents)
  - Creative Professional (Modern asymmetrical grid layout)
  - Medical / Consultant Clean (Emerald / Slate crisp layout)
- [ ] **Step 2:** Enable 1-click template application with non-destructive option to keep user's existing contact info.

### Task 6: Contextual Property Inspector & Layer Management
**Files:**
- Create: `business-card-studio/src/components/inspector/Inspector.tsx`
- Create: `business-card-studio/src/components/inspector/TextInspector.tsx`
- Create: `business-card-studio/src/components/inspector/ShapeInspector.tsx`
- Create: `business-card-studio/src/components/inspector/ImageInspector.tsx`
- Create: `business-card-studio/src/components/inspector/LayerStack.tsx`

- [ ] **Step 1:** Build `TextInspector` (Font family, size, weight, text color, letter-spacing, line-height, text-align, uppercase).
- [ ] **Step 2:** Build `ShapeInspector` (Fill, stroke, stroke-width, corner-radius, opacity).
- [ ] **Step 3:** Build `LayerStack` with drag-to-reorder, lock element, toggle visibility, duplicate, and delete controls.

### Task 7: 3D Flip Card Preview & High-Res Export Engine
**Files:**
- Create: `business-card-studio/src/components/modals/Preview3DModal.tsx`
- Create: `business-card-studio/src/components/modals/ExportModal.tsx`
- Create: `business-card-studio/src/utils/exporter.ts`
- Create: `business-card-studio/src/components/layout/Header.tsx`

- [ ] **Step 1:** Build `Preview3DModal` with CSS 3D transform card flip animation (click or drag to rotate front and back).
- [ ] **Step 2:** Implement 300 DPI high-resolution PNG/JPEG raster export for front, back, or combined sheet.
- [ ] **Step 3:** Implement Print-Ready PDF export with jsPDF including optional 3mm bleed margin and crop marks.
- [ ] **Step 4:** Implement Project Save/Load (.json) and vCard (.vcf) direct download.
- [ ] **Step 5:** Assemble main Header with side toggle (Front / Back), zoom slider, Undo/Redo, 3D Preview button, and Export modal.
