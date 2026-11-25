import { useEffect, useId, useRef, useState } from 'react';
import styles from './previews.module.css';

export type PreviewMode = 'compact' | 'full';

export interface PliwScrollPreviewProps {
  mode?: PreviewMode;
}

type ToolId =
  | 'pen'
  | 'highlighter'
  | 'arrow'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'text'
  | 'blur'
  | 'eraser';

type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface Point {
  x: number;
  y: number;
}

interface AnnotationItem {
  id: number;
  tool: Exclude<ToolId, 'eraser'>;
  color: string;
  strokeWidth: number;
  points: Point[];
  text?: string;
}

interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const DOC_WIDTH = 1440;
const DOC_HEIGHT = 1250;
const DEFAULT_CROP: CropBox = { x: 10, y: 12, w: 80, h: 74 };

const SCROLL_TOOLS: ReadonlyArray<{ id: ToolId; label: string }> = [
  { id: 'pen', label: 'Pen' },
  { id: 'highlighter', label: 'Highlighter' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'rect', label: 'Rect' },
  { id: 'ellipse', label: 'Ellipse' },
  { id: 'line', label: 'Line' },
  { id: 'text', label: 'Text' },
  { id: 'blur', label: 'Pixelate' },
  { id: 'eraser', label: 'Eraser' },
];

const SCROLL_COLORS: ReadonlyArray<{ hex: string; name: string }> = [
  { hex: '#ef4444', name: 'Red' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#eab308', name: 'Yellow' },
  { hex: '#22c55e', name: 'Green' },
  { hex: '#0284c7', name: 'Blue' },
  { hex: '#a855f7', name: 'Purple' },
  { hex: '#0f172a', name: 'Black' },
  { hex: '#ffffff', name: 'White' },
];

const COPY_PRESETS = [
  { id: 'full', scale: 1.0, label: '100% Full' },
  { id: 'optimized', scale: 0.5, label: '50% Optimized' },
  { id: 'compact', scale: 0.3, label: '30% Compact' },
] as const;

const INITIAL_ANNOTATIONS: AnnotationItem[] = [
  {
    id: 1,
    tool: 'rect',
    color: '#0284c7',
    strokeWidth: 3,
    points: [
      { x: 16, y: 38 },
      { x: 74, y: 74 },
    ],
  },
  {
    id: 2,
    tool: 'arrow',
    color: '#ef4444',
    strokeWidth: 3,
    points: [
      { x: 84, y: 24 },
      { x: 64, y: 42 },
    ],
  },
];

const CROP_HANDLES: ReadonlyArray<{ id: HandleId; style: React.CSSProperties; cursor: string }> = [
  { id: 'nw', style: { top: -5, left: -5 }, cursor: 'nwse-resize' },
  { id: 'n', style: { top: -5, left: '50%', transform: 'translateX(-50%)' }, cursor: 'ns-resize' },
  { id: 'ne', style: { top: -5, right: -5 }, cursor: 'nesw-resize' },
  { id: 'e', style: { top: '50%', right: -5, transform: 'translateY(-50%)' }, cursor: 'ew-resize' },
  { id: 'se', style: { bottom: -5, right: -5 }, cursor: 'nwse-resize' },
  { id: 's', style: { bottom: -5, left: '50%', transform: 'translateX(-50%)' }, cursor: 'ns-resize' },
  { id: 'sw', style: { bottom: -5, left: -5 }, cursor: 'nesw-resize' },
  { id: 'w', style: { top: '50%', left: -5, transform: 'translateY(-50%)' }, cursor: 'ew-resize' },
];

function ToolIcon({ id }: { id: ToolId }) {
  switch (id) {
    case 'pen':
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case 'highlighter':
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 12h10M4.5 9.5l5-5 2.5 2.5-5 5H4.5v-2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'arrow':
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 13L13 3M7 3h6v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'rect':
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'ellipse':
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <ellipse cx="8" cy="8" rx="5.5" ry="4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'line':
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 13L13 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'text':
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 3.5h10M8 3.5v9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'blur':
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <rect x="2" y="2" width="5" height="5" rx="1" opacity="0.45" />
          <rect x="9" y="2" width="5" height="5" rx="1" opacity="0.85" />
          <rect x="2" y="9" width="5" height="5" rx="1" opacity="0.85" />
          <rect x="9" y="9" width="5" height="5" rx="1" opacity="0.45" />
        </svg>
      );
    case 'eraser':
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 13h7M3.5 9.5l5-5 4 4-4.5 4.5H5L3.5 9.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      );
  }
}

export function PliwScrollPreview({ mode = 'full' }: PliwScrollPreviewProps) {
  const isCompact = mode === 'compact';
  const uid = useId().replace(/:/g, '');
  const stageRef = useRef<HTMLDivElement | null>(null);
  const nextIdRef = useRef<number>(10);
  const toastTimerRef = useRef<number | null>(null);

  const [activeTool, setActiveTool] = useState<ToolId>('arrow');
  const [activeColor, setActiveColor] = useState<string>('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [annotations, setAnnotations] = useState<AnnotationItem[]>(INITIAL_ANNOTATIONS);
  const [draft, setDraft] = useState<AnnotationItem | null>(null);
  const [crop, setCrop] = useState<CropBox>(DEFAULT_CROP);
  const [copyScale, setCopyScale] = useState<1.0 | 0.5 | 0.3>(1.0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const dragStateRef = useRef<{
    handle: HandleId;
    startX: number;
    startY: number;
    startCrop: CropBox;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (msg: string) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 2200);
  };

  const toStagePercent = (clientX: number, clientY: number): Point => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 50, y: 50 };
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = toStagePercent(e.clientX, e.clientY);
    if (activeTool === 'eraser') {
      setAnnotations((prev) => prev.slice(0, -1));
      return;
    }
    if (activeTool === 'text') {
      const id = nextIdRef.current++;
      setAnnotations((prev) => [
        ...prev,
        { id, tool: 'text', color: activeColor, strokeWidth, points: [pt], text: 'Note' },
      ]);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const id = nextIdRef.current++;
    setDraft({
      id,
      tool: activeTool,
      color: activeColor,
      strokeWidth,
      points: [pt, pt],
    });
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draft) return;
    const pt = toStagePercent(e.clientX, e.clientY);
    setDraft((prev) => {
      if (!prev) return null;
      if (prev.tool === 'pen' || prev.tool === 'highlighter') {
        return { ...prev, points: [...prev.points, pt] };
      }
      return { ...prev, points: [prev.points[0], pt] };
    });
  };

  const handleSvgPointerUp = () => {
    if (!draft) return;
    setAnnotations((prev) => [...prev, draft]);
    setDraft(null);
  };

  const handleCropPointerDown = (handle: HandleId, e: React.PointerEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: crop,
    };
  };

  const handleCropPointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    const drag = dragStateRef.current;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!drag || !rect || rect.width === 0 || rect.height === 0) return;
    const dxPct = ((e.clientX - drag.startX) / rect.width) * 100;
    const dyPct = ((e.clientY - drag.startY) / rect.height) * 100;
    let { x, y, w, h } = drag.startCrop;
    const minSize = 20;

    if (drag.handle.includes('e')) {
      w = Math.max(minSize, Math.min(100 - x, w + dxPct));
    }
    if (drag.handle.includes('s')) {
      h = Math.max(minSize, Math.min(100 - y, h + dyPct));
    }
    if (drag.handle.includes('w')) {
      const nextX = Math.max(0, Math.min(x + w - minSize, x + dxPct));
      w = w + (x - nextX);
      x = nextX;
    }
    if (drag.handle.includes('n')) {
      const nextY = Math.max(0, Math.min(y + h - minSize, y + dyPct));
      h = h + (y - nextY);
      y = nextY;
    }
    setCrop({ x, y, w, h });
  };

  const handleCropPointerUp = () => {
    dragStateRef.current = null;
  };

  const adjustCropSize = (dw: number, dh: number) => {
    setCrop((prev) => {
      const nextW = Math.max(24, Math.min(100 - prev.x, prev.w + dw));
      const nextH = Math.max(24, Math.min(100 - prev.y, prev.h + dh));
      return { ...prev, w: nextW, h: nextH };
    });
  };

  const resetCrop = () => {
    setCrop(DEFAULT_CROP);
    showToast('Crop reset');
  };

  const cropPxW = Math.round((crop.w / 100) * DOC_WIDTH);
  const cropPxH = Math.round((crop.h / 100) * DOC_HEIGHT);

  const handleCopyPreset = (preset: (typeof COPY_PRESETS)[number]) => {
    setCopyScale(preset.scale);
    const outW = Math.round(cropPxW * preset.scale);
    const outH = Math.round(cropPxH * preset.scale);
    showToast(`Copied ${preset.label} (${outW} × ${outH} px)`);
  };

  const allItems = draft ? [...annotations, draft] : annotations;
  const getMarkerId = (color: string) => `scroll-arrow-${uid}-${color.replace('#', '')}`;
  const blurPatternId = `scroll-pixel-${uid}`;

  return (
    <div className={`${styles.pvWindow} ${isCompact ? styles.pvCompact : styles.pvFull}`}>
      <div className={styles.pvBar}>
        <div className={styles.pvDots} aria-hidden="true">
          <span className={`${styles.pvDot} ${styles.pvDotClose}`} />
          <span className={`${styles.pvDot} ${styles.pvDotMin}`} />
          <span className={`${styles.pvDot} ${styles.pvDotMax}`} />
        </div>
        <span className={styles.pvBarTitle}>Pliw Scroll · Studio</span>
        <span className={`${styles.statusBadge} ${styles.tabular}`}>
          {cropPxW} × {cropPxH} px
        </span>
      </div>

      <div className={styles.pvBody}>
        <div className={styles.scrollToolbar}>
          <div className={styles.scrollToolsGroup} role="group" aria-label="Annotation tools">
            {SCROLL_TOOLS.map((tool) => {
              const active = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  title={tool.label}
                  aria-label={tool.label}
                  aria-pressed={active}
                  className={`${styles.scrollToolBtn} ${active ? styles.scrollToolBtnActive : ''}`}
                  onClick={() => setActiveTool(tool.id)}
                >
                  <ToolIcon id={tool.id} />
                  {!isCompact && <span>{tool.label}</span>}
                </button>
              );
            })}
          </div>

          <div className={styles.scrollColorRow} role="group" aria-label="Stroke colors">
            {SCROLL_COLORS.map((swatch) => {
              const active = activeColor === swatch.hex;
              return (
                <button
                  key={swatch.hex}
                  type="button"
                  title={swatch.name}
                  aria-label={`${swatch.name} color`}
                  aria-pressed={active}
                  className={`${styles.scrollSwatch} ${active ? styles.scrollSwatchActive : ''}`}
                  style={{ backgroundColor: swatch.hex }}
                  onClick={() => setActiveColor(swatch.hex)}
                />
              );
            })}
          </div>
        </div>

        {!isCompact && (
          <div className={styles.scrollToolbar}>
            <div className={styles.sliderWrap} style={{ maxWidth: 210 }}>
              <label className={styles.controlLabel} htmlFor={`scroll-stroke-${uid}`}>
                Stroke
              </label>
              <input
                id={`scroll-stroke-${uid}`}
                type="range"
                min={2}
                max={24}
                step={1}
                value={strokeWidth}
                aria-label="Stroke width"
                className={styles.pvRange}
                onChange={(e) => setStrokeWidth(Number.parseInt(e.target.value, 10))}
              />
              <span className={`${styles.controlLabel} ${styles.tabular}`}>{strokeWidth}px</span>
            </div>

            <div className={styles.pillRow}>
              <button
                type="button"
                className={styles.pillBtn}
                onClick={() => adjustCropSize(-8, -8)}
              >
                Tighter Crop
              </button>
              <button
                type="button"
                className={styles.pillBtn}
                onClick={() => setCrop({ x: 0, y: 0, w: 100, h: 100 })}
              >
                Full Page
              </button>
              <button type="button" className={styles.pillBtn} onClick={resetCrop}>
                Reset
              </button>
              <button
                type="button"
                className={styles.pillBtn}
                onClick={() => setAnnotations((prev) => prev.slice(0, -1))}
              >
                Undo
              </button>
              <button
                type="button"
                className={styles.pillBtn}
                onClick={() => setAnnotations([])}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div className={styles.scrollStage} ref={stageRef}>
          <div className={styles.scrollMockPage}>
            <div
              style={{
                width: '55%',
                height: 11,
                borderRadius: 4,
                background: 'linear-gradient(90deg, #0284c7, #6366f1)',
              }}
            />
            <div style={{ width: '92%', height: 7, borderRadius: 4, background: '#e2e8f0' }} />
            <div style={{ width: '80%', height: 7, borderRadius: 4, background: '#e2e8f0' }} />
            <div
              style={{
                height: isCompact ? 48 : 88,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #e0f2fe, #ede9fe)',
                border: '1px dashed #93c5fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7',
                fontWeight: 700,
                fontSize: '0.78rem',
              }}
            >
              Full-Page Canvas · Sticky Header Protected
            </div>
            <div style={{ width: '88%', height: 7, borderRadius: 4, background: '#e2e8f0' }} />
            {!isCompact && (
              <>
                <div style={{ width: '74%', height: 7, borderRadius: 4, background: '#e2e8f0' }} />
                <div style={{ width: '85%', height: 7, borderRadius: 4, background: '#f1f5f9' }} />
              </>
            )}
          </div>

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className={styles.scrollSvgLayer}
            onPointerDown={handleSvgPointerDown}
            onPointerMove={handleSvgPointerMove}
            onPointerUp={handleSvgPointerUp}
          >
            <defs>
              {SCROLL_COLORS.map((swatch) => (
                <marker
                  key={swatch.hex}
                  id={getMarkerId(swatch.hex)}
                  markerWidth="6"
                  markerHeight="6"
                  refX="4"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6 Z" fill={swatch.hex} />
                </marker>
              ))}
              <pattern id={blurPatternId} width="4" height="4" patternUnits="userSpaceOnUse">
                <rect width="2" height="2" fill="#94a3b8" />
                <rect x="2" width="2" height="2" fill="#cbd5e1" />
                <rect y="2" width="2" height="2" fill="#cbd5e1" />
                <rect x="2" y="2" width="2" height="2" fill="#64748b" />
              </pattern>
            </defs>

            {allItems.map((item) => {
              const p0 = item.points[0];
              const p1 = item.points[item.points.length - 1] ?? p0;
              const sw = Math.max(0.6, item.strokeWidth * 0.25);

              if (item.tool === 'pen' || item.tool === 'highlighter') {
                const d = item.points.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
                return (
                  <path
                    key={item.id}
                    d={d}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={item.tool === 'highlighter' ? sw * 2.6 : sw}
                    strokeOpacity={item.tool === 'highlighter' ? 0.36 : 1}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              }
              if (item.tool === 'line' || item.tool === 'arrow') {
                return (
                  <line
                    key={item.id}
                    x1={p0.x}
                    y1={p0.y}
                    x2={p1.x}
                    y2={p1.y}
                    stroke={item.color}
                    strokeWidth={sw}
                    strokeLinecap="round"
                    markerEnd={item.tool === 'arrow' ? `url(#${getMarkerId(item.color)})` : undefined}
                  />
                );
              }
              if (item.tool === 'rect' || item.tool === 'blur') {
                const rx = Math.min(p0.x, p1.x);
                const ry = Math.min(p0.y, p1.y);
                const rw = Math.max(4, Math.abs(p1.x - p0.x));
                const rh = Math.max(4, Math.abs(p1.y - p0.y));
                return (
                  <rect
                    key={item.id}
                    x={rx}
                    y={ry}
                    width={rw}
                    height={rh}
                    fill={item.tool === 'blur' ? `url(#${blurPatternId})` : 'none'}
                    stroke={item.tool === 'blur' ? '#64748b' : item.color}
                    strokeWidth={sw}
                    rx="1"
                  />
                );
              }
              if (item.tool === 'ellipse') {
                return (
                  <ellipse
                    key={item.id}
                    cx={(p0.x + p1.x) / 2}
                    cy={(p0.y + p1.y) / 2}
                    rx={Math.max(3, Math.abs(p1.x - p0.x) / 2)}
                    ry={Math.max(3, Math.abs(p1.y - p0.y) / 2)}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={sw}
                  />
                );
              }
              if (item.tool === 'text') {
                return (
                  <g key={item.id} transform={`translate(${p0.x}, ${p0.y})`}>
                    <rect x="-2" y="-4" width="14" height="6" rx="1.5" fill={item.color} />
                    <text x="5" y="0.5" fontSize="3.4" fontWeight="700" fill="#ffffff" textAnchor="middle">
                      {item.text ?? 'Note'}
                    </text>
                  </g>
                );
              }
              return null;
            })}
          </svg>

          <div
            className={styles.cropBox}
            style={{
              left: `${crop.x}%`,
              top: `${crop.y}%`,
              width: `${crop.w}%`,
              height: `${crop.h}%`,
            }}
          >
            {CROP_HANDLES.map((h) => (
              <span
                key={h.id}
                role="slider"
                tabIndex={-1}
                aria-label={`Resize crop ${h.id}`}
                aria-valuenow={Math.round(crop.w)}
                className={styles.cropHandle}
                style={{ ...h.style, cursor: h.cursor }}
                onPointerDown={(e) => handleCropPointerDown(h.id, e)}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
              />
            ))}
            <span className={styles.cropTag}>
              {cropPxW} × {cropPxH} px
            </span>
          </div>
        </div>

        <div className={styles.scrollFooter}>
          <div className={styles.pillRow}>
            {COPY_PRESETS.map((preset) => {
              const active = copyScale === preset.scale;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  className={`${styles.pillBtn} ${active ? styles.pillBtnActive : ''}`}
                  onClick={() => handleCopyPreset(preset)}
                >
                  {preset.label}
                </button>
              );
            })}
            {isCompact && (
              <button type="button" className={styles.pillBtn} onClick={resetCrop}>
                Reset
              </button>
            )}
          </div>

          <div role="status" aria-live="polite">
            {toastMessage && <span className={styles.toastPill}>{toastMessage}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PliwScrollPreview;
