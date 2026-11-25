import { useState } from 'react';
import styles from './previews.module.css';

export type PreviewMode = 'compact' | 'full';

export interface PliwCollagePreviewProps {
  mode?: PreviewMode;
}

type LayoutId = 'grid2x2' | 'threeColumns' | 'threeTopBig' | 'splitVertical';
type AspectId = '9:16' | '4:5' | '1:1' | '16:9';
type FramingId = 'center' | 'top' | 'bottom';

interface SlotState {
  label: string;
  gradient: string;
  zoom: number;
  framing: FramingId;
  muted: boolean;
  trim: string;
}

const LAYOUTS: ReadonlyArray<{
  id: LayoutId;
  label: string;
  slots: number;
  templateColumns: string;
  templateRows: string;
}> = [
  { id: 'grid2x2', label: '2×2', slots: 4, templateColumns: '1fr 1fr', templateRows: '1fr 1fr' },
  {
    id: 'threeColumns',
    label: '3 Cols',
    slots: 3,
    templateColumns: '1fr 1fr 1fr',
    templateRows: '1fr',
  },
  { id: 'threeTopBig', label: 'Top Big', slots: 3, templateColumns: '1fr 1fr', templateRows: '1.2fr 1fr' },
  { id: 'splitVertical', label: '2 Vertical', slots: 2, templateColumns: '1fr 1fr', templateRows: '1fr' },
];

const ASPECTS: ReadonlyArray<{
  id: AspectId;
  cssRatio: string;
  dimensions: string;
  platform: string;
  maxWidth: number;
}> = [
  { id: '9:16', cssRatio: '9 / 16', dimensions: '1080 × 1920 px', platform: 'TikTok / Reels', maxWidth: 156 },
  { id: '4:5', cssRatio: '4 / 5', dimensions: '1080 × 1350 px', platform: 'IG Feed', maxWidth: 196 },
  { id: '1:1', cssRatio: '1 / 1', dimensions: '1080 × 1080 px', platform: 'Square', maxWidth: 230 },
  { id: '16:9', cssRatio: '16 / 9', dimensions: '1920 × 1080 px', platform: 'YouTube', maxWidth: 320 },
];

const INITIAL_SLOTS: SlotState[] = [
  {
    label: 'Clip 1',
    gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
    zoom: 1.0,
    framing: 'center',
    muted: false,
    trim: '0.0s – 8.0s',
  },
  {
    label: 'Clip 2',
    gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
    zoom: 1.1,
    framing: 'center',
    muted: true,
    trim: '1.2s – 9.2s',
  },
  {
    label: 'Clip 3',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    zoom: 1.0,
    framing: 'top',
    muted: false,
    trim: '0.5s – 7.5s',
  },
  {
    label: 'Clip 4',
    gradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
    zoom: 1.2,
    framing: 'bottom',
    muted: false,
    trim: '2.0s – 10.0s',
  },
];

export function PliwCollagePreview({ mode = 'full' }: PliwCollagePreviewProps) {
  const isCompact = mode === 'compact';
  const [layoutId, setLayoutId] = useState<LayoutId>('grid2x2');
  const [aspectId, setAspectId] = useState<AspectId>('1:1');
  const [spacing, setSpacing] = useState<number>(12);
  const [cornerRadius, setCornerRadius] = useState<number>(24);
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [slots, setSlots] = useState<SlotState[]>(INITIAL_SLOTS);

  const layout = LAYOUTS.find((l) => l.id === layoutId) ?? LAYOUTS[0];
  const aspect = ASPECTS.find((a) => a.id === aspectId) ?? ASPECTS[2];
  const safeSelected = Math.min(selectedSlot, layout.slots - 1);
  const activeSlot = slots[safeSelected];

  const handleLayoutChange = (nextId: LayoutId) => {
    const nextLayout = LAYOUTS.find((l) => l.id === nextId) ?? LAYOUTS[0];
    setLayoutId(nextId);
    setSelectedSlot((prev) => Math.min(prev, nextLayout.slots - 1));
  };

  const toggleSlotMute = (idx: number) => {
    setSlots((prev) =>
      prev.map((slot, i) => (i === idx ? { ...slot, muted: !slot.muted } : slot))
    );
  };

  const updateSelectedSlot = (patch: Partial<SlotState>) => {
    setSlots((prev) =>
      prev.map((slot, i) => (i === safeSelected ? { ...slot, ...patch } : slot))
    );
  };

  const previewGap = Math.max(0, Math.round(spacing * 0.25));
  const previewRadius = Math.max(0, Math.round(cornerRadius * 0.35));

  const renderCanvas = () => (
    <div className={styles.collageCanvasWrap}>
      <div
        className={styles.collageFrame}
        style={{
          aspectRatio: aspect.cssRatio,
          maxWidth: isCompact ? Math.min(aspect.maxWidth, 220) : aspect.maxWidth,
          gridTemplateColumns: layout.templateColumns,
          gridTemplateRows: layout.templateRows,
          gap: `${previewGap}px`,
        }}
      >
        {slots.slice(0, layout.slots).map((slot, idx) => {
          const isSelected = safeSelected === idx;
          const spanTop = layoutId === 'threeTopBig' && idx === 0;
          const origin =
            slot.framing === 'top'
              ? 'center top'
              : slot.framing === 'bottom'
                ? 'center bottom'
                : 'center center';
          return (
            <div
              key={slot.label}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`Select ${slot.label}`}
              className={`${styles.collageSlot} ${isSelected ? styles.collageSlotSelected : ''}`}
              style={{
                borderRadius: `${previewRadius}px`,
                gridColumn: spanTop ? '1 / -1' : undefined,
              }}
              onClick={() => setSelectedSlot(idx)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedSlot(idx);
                }
              }}
            >
              <div
                className={styles.collageSlotFill}
                style={{
                  background: slot.gradient,
                  transform: `scale(${slot.zoom})`,
                  transformOrigin: origin,
                }}
              />
              <span className={styles.collageSlotLabel}>{slot.label}</span>
              <button
                type="button"
                className={styles.collageMuteBtn}
                aria-label={slot.muted ? `Unmute ${slot.label}` : `Mute ${slot.label}`}
                aria-pressed={slot.muted}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSlotMute(idx);
                }}
              >
                {slot.muted ? '🔇' : '🔊'}
              </button>
            </div>
          );
        })}
      </div>
      <div className={styles.collageMetaLabel}>
        {aspect.dimensions} · {aspect.platform}
      </div>
    </div>
  );

  return (
    <div
      className={`${styles.pvWindow} ${isCompact ? styles.pvCompact : styles.pvFull} ${styles.pvDark}`}
    >
      <div className={styles.pvBar}>
        <div className={styles.pvDots} aria-hidden="true">
          <span className={`${styles.pvDot} ${styles.pvDotClose}`} />
          <span className={`${styles.pvDot} ${styles.pvDotMin}`} />
          <span className={`${styles.pvDot} ${styles.pvDotMax}`} />
        </div>
        <span className={styles.pvBarTitle}>Pliw Collage</span>
        <span className={`${styles.collageMetaLabel} ${styles.tabular}`}>{aspect.id}</span>
      </div>

      <div className={styles.pvBody}>
        {isCompact ? (
          <div className={styles.collageLayout}>
            <div className={styles.pillRow}>
              {LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={layoutId === l.id}
                  className={`${styles.pillBtn} ${styles.pillBtnDark} ${layoutId === l.id ? styles.pillBtnDarkActive : ''}`}
                  onClick={() => handleLayoutChange(l.id)}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div className={styles.pillRow}>
              {ASPECTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={aspectId === a.id}
                  className={`${styles.pillBtn} ${styles.pillBtnDark} ${aspectId === a.id ? styles.pillBtnDarkActive : ''}`}
                  onClick={() => setAspectId(a.id)}
                >
                  {a.id}
                </button>
              ))}
            </div>

            {renderCanvas()}

            <div className={styles.sliderWrap}>
              <label className={styles.collageMetaLabel} htmlFor="collage-spacing-compact">
                Spacing
              </label>
              <input
                id="collage-spacing-compact"
                type="range"
                min={0}
                max={48}
                step={2}
                value={spacing}
                aria-label="Collage spacing"
                className={styles.pvRange}
                onChange={(e) => setSpacing(Number.parseInt(e.target.value, 10))}
              />
              <span className={`${styles.collageMetaLabel} ${styles.tabular}`}>{spacing}px</span>
            </div>

            <div className={styles.sliderWrap}>
              <label className={styles.collageMetaLabel} htmlFor="collage-radius-compact">
                Radius
              </label>
              <input
                id="collage-radius-compact"
                type="range"
                min={0}
                max={64}
                step={2}
                value={cornerRadius}
                aria-label="Collage corner radius"
                className={styles.pvRange}
                onChange={(e) => setCornerRadius(Number.parseInt(e.target.value, 10))}
              />
              <span className={`${styles.collageMetaLabel} ${styles.tabular}`}>
                {cornerRadius}px
              </span>
            </div>
          </div>
        ) : (
          <div className={styles.collageLayout}>
            <div className={styles.collagePane}>
              <div className={styles.collagePaneTitle}>Layout &amp; Style</div>
              <div className={styles.pillRow}>
                {LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={layoutId === l.id}
                    className={`${styles.pillBtn} ${styles.pillBtnDark} ${layoutId === l.id ? styles.pillBtnDarkActive : ''}`}
                    onClick={() => handleLayoutChange(l.id)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              <div className={styles.pillRow}>
                {ASPECTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={aspectId === a.id}
                    className={`${styles.pillBtn} ${styles.pillBtnDark} ${aspectId === a.id ? styles.pillBtnDarkActive : ''}`}
                    onClick={() => setAspectId(a.id)}
                  >
                    {a.id}
                  </button>
                ))}
              </div>

              <div className={styles.sliderWrap}>
                <label className={styles.collageMetaLabel} htmlFor="collage-spacing-full">
                  Spacing
                </label>
                <input
                  id="collage-spacing-full"
                  type="range"
                  min={0}
                  max={48}
                  step={2}
                  value={spacing}
                  aria-label="Collage spacing"
                  className={styles.pvRange}
                  onChange={(e) => setSpacing(Number.parseInt(e.target.value, 10))}
                />
                <span className={`${styles.collageMetaLabel} ${styles.tabular}`}>{spacing}px</span>
              </div>

              <div className={styles.sliderWrap}>
                <label className={styles.collageMetaLabel} htmlFor="collage-radius-full">
                  Radius
                </label>
                <input
                  id="collage-radius-full"
                  type="range"
                  min={0}
                  max={64}
                  step={2}
                  value={cornerRadius}
                  aria-label="Collage corner radius"
                  className={styles.pvRange}
                  onChange={(e) => setCornerRadius(Number.parseInt(e.target.value, 10))}
                />
                <span className={`${styles.collageMetaLabel} ${styles.tabular}`}>
                  {cornerRadius}px
                </span>
              </div>
            </div>

            <div className={styles.collagePane}>{renderCanvas()}</div>

            <div className={styles.collagePane}>
              <div className={styles.collagePaneTitle}>
                Slot Inspector · {activeSlot.label}
              </div>

              <div className={styles.sliderWrap}>
                <label className={styles.collageMetaLabel} htmlFor="collage-zoom-full">
                  Zoom
                </label>
                <input
                  id="collage-zoom-full"
                  type="range"
                  min={1.0}
                  max={2.0}
                  step={0.1}
                  value={activeSlot.zoom}
                  aria-label="Slot zoom"
                  className={styles.pvRange}
                  onChange={(e) =>
                    updateSelectedSlot({ zoom: Number.parseFloat(e.target.value) })
                  }
                />
                <span className={`${styles.collageMetaLabel} ${styles.tabular}`}>
                  {activeSlot.zoom.toFixed(1)}×
                </span>
              </div>

              <div className={styles.pillRow}>
                {(['center', 'top', 'bottom'] as const).map((fr) => (
                  <button
                    key={fr}
                    type="button"
                    aria-pressed={activeSlot.framing === fr}
                    className={`${styles.pillBtn} ${styles.pillBtnDark} ${activeSlot.framing === fr ? styles.pillBtnDarkActive : ''}`}
                    onClick={() => updateSelectedSlot({ framing: fr })}
                  >
                    {fr === 'center' ? 'Center' : fr === 'top' ? 'Top' : 'Bottom'}
                  </button>
                ))}
              </div>

              <div className={styles.controlRow}>
                <span className={styles.collageMetaLabel}>Trim: {activeSlot.trim}</span>
                <button
                  type="button"
                  aria-pressed={activeSlot.muted}
                  className={`${styles.pillBtn} ${styles.pillBtnDark} ${activeSlot.muted ? styles.pillBtnDarkActive : ''}`}
                  onClick={() => toggleSlotMute(safeSelected)}
                >
                  {activeSlot.muted ? 'Muted 🔇' : 'Audio On 🔊'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PliwCollagePreview;
