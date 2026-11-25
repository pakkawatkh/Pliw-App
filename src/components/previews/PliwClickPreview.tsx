import { useState } from 'react';
import styles from './previews.module.css';

export type PreviewMode = 'compact' | 'full';

export interface PliwClickPreviewProps {
  mode?: PreviewMode;
}

type DirectionPreset = 'up' | 'down' | 'left' | 'right' | 'idle';
type ScrollMode = '360' | 'vertical';
type TargetContext = 'page' | 'link' | 'editor';

const DEADZONE = 14;
const QUICK_FINGERS = [2, 3, 4, 5] as const;
const ALL_FINGERS = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const DIRECTION_VECTORS: Record<DirectionPreset, { dx: number; dy: number; label: string }> = {
  up: { dx: 0, dy: -40, label: '↑' },
  down: { dx: 0, dy: 40, label: '↓' },
  left: { dx: -40, dy: 0, label: '←' },
  right: { dx: 40, dy: 0, label: '→' },
  idle: { dx: 0, dy: 0, label: 'Idle' },
};

function describeAngle(rad: number): string {
  const deg = (rad * 180) / Math.PI;
  if (deg >= -22.5 && deg < 22.5) return '→';
  if (deg >= 22.5 && deg < 67.5) return '↘';
  if (deg >= 67.5 && deg < 112.5) return '↓';
  if (deg >= 112.5 && deg < 157.5) return '↙';
  if (deg >= -67.5 && deg < -22.5) return '↗';
  if (deg >= -112.5 && deg < -67.5) return '↑';
  if (deg >= -157.5 && deg < -112.5) return '↖';
  return '←';
}

export function PliwClickPreview({ mode = 'full' }: PliwClickPreviewProps) {
  const isCompact = mode === 'compact';
  const [vector, setVector] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 40 });
  const [scrollMode, setScrollMode] = useState<ScrollMode>('360');
  const [speed, setSpeed] = useState<number>(1.0);
  const [fingers, setFingers] = useState<number>(3);
  const [smartProtection, setSmartProtection] = useState<boolean>(true);
  const [targetContext, setTargetContext] = useState<TargetContext>('page');

  const isPassthrough = smartProtection && targetContext !== 'page';
  const dist = Math.hypot(vector.dx, vector.dy);
  const effectiveDx = scrollMode === 'vertical' ? 0 : vector.dx;
  const effectiveDy = vector.dy;
  const effectiveDist = scrollMode === 'vertical' ? Math.abs(effectiveDy) : dist;
  const orbActive = !isPassthrough && effectiveDist >= DEADZONE;
  const rad = Math.atan2(effectiveDy, effectiveDx);

  const orbitRadius = isCompact ? 11.5 : 13;
  const chevronX = orbActive ? Math.cos(rad) * orbitRadius : 0;
  const chevronY = orbActive ? Math.sin(rad) * orbitRadius : 0;
  const chevronDeg = orbActive ? (rad * 180) / Math.PI + 90 : 0;

  const pageShiftX = orbActive ? Math.max(-18, Math.min(18, (-Math.cos(rad) * 8 * speed))) : 0;
  const pageShiftY = orbActive ? Math.max(-18, Math.min(18, (-Math.sin(rad) * 8 * speed))) : 0;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    setVector({ dx, dy });
  };

  const handleDirectionClick = (dir: DirectionPreset) => {
    const v = DIRECTION_VECTORS[dir];
    setVector({ dx: v.dx, dy: v.dy });
  };

  const statusText = isPassthrough
    ? targetContext === 'link'
      ? 'Native Passthrough · Link protected'
      : 'Native Passthrough · App ignored'
    : orbActive
      ? `Scrolling ${describeAngle(rad)} · ${speed.toFixed(1)}x`
      : 'Deadzone · Idle';

  return (
    <div className={`${styles.pvWindow} ${isCompact ? styles.pvCompact : styles.pvFull}`}>
      <div className={styles.pvBar}>
        <div className={styles.pvDots} aria-hidden="true">
          <span className={`${styles.pvDot} ${styles.pvDotClose}`} />
          <span className={`${styles.pvDot} ${styles.pvDotMin}`} />
          <span className={`${styles.pvDot} ${styles.pvDotMax}`} />
        </div>
        <span className={styles.pvBarTitle}>Pliw Click · 360° Autoscroll</span>
        <span className={`${styles.statusBadge} ${styles.tabular}`}>{fingers} Fingers</span>
      </div>

      <div className={styles.pvBody}>
        <div
          className={styles.clickStage}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setVector({ dx: 0, dy: 0 })}
          aria-label="Interactive 360 degree autoscroll orb stage"
        >
          <div className={styles.clickStageHud}>
            <span className={styles.clickHudBadge}>{statusText}</span>
            <span className={styles.clickHudBadge}>
              {scrollMode === '360' ? '360° Free' : 'Vertical Only'}
            </span>
          </div>

          <div
            className={styles.clickMockPage}
            style={{ transform: `translate(${pageShiftX}px, ${pageShiftY}px)` }}
          >
            <div className={styles.clickLine} style={{ width: '58%', height: 12, background: '#64748b' }} />
            <div className={styles.clickLine} style={{ width: '92%' }} />
            <div className={styles.clickLine} style={{ width: '84%' }} />
            <div className={styles.clickLine} style={{ width: '88%' }} />
            <div className={styles.clickLine} style={{ width: '68%' }} />
          </div>

          <div className={styles.clickOrb}>
            <svg
              width="10"
              height="6"
              viewBox="0 0 10 6"
              fill="none"
              aria-hidden="true"
              style={{
                position: 'absolute',
                opacity: orbActive ? 0.96 : 0,
                transform: `translate(${chevronX}px, ${chevronY}px) rotate(${chevronDeg}deg)`,
                transition: 'opacity 0.12s ease',
              }}
            >
              <path
                d="M1 5 Q5 1 9 5"
                stroke="#0284c7"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <div className={styles.clickControls}>
          <div className={styles.controlRow}>
            <div className={styles.pillRow}>
              {(['up', 'down', 'left', 'right', 'idle'] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  className={styles.pillBtn}
                  onClick={() => handleDirectionClick(dir)}
                >
                  {DIRECTION_VECTORS[dir].label}
                </button>
              ))}
            </div>

            <div className={styles.pillRow}>
              <button
                type="button"
                aria-pressed={scrollMode === '360'}
                className={`${styles.pillBtn} ${scrollMode === '360' ? styles.pillBtnActive : ''}`}
                onClick={() => setScrollMode('360')}
              >
                360° Free
              </button>
              <button
                type="button"
                aria-pressed={scrollMode === 'vertical'}
                className={`${styles.pillBtn} ${scrollMode === 'vertical' ? styles.pillBtnActive : ''}`}
                onClick={() => setScrollMode('vertical')}
              >
                Vertical Only
              </button>
            </div>
          </div>

          <div className={styles.sliderWrap}>
            <label className={styles.controlLabel} htmlFor={`click-speed-${mode}`}>
              Speed
            </label>
            <input
              id={`click-speed-${mode}`}
              type="range"
              min={0.3}
              max={3.0}
              step={0.1}
              value={speed}
              aria-label="Autoscroll speed"
              className={styles.pvRange}
              onChange={(e) => setSpeed(Number.parseFloat(e.target.value))}
            />
            <span className={`${styles.controlLabel} ${styles.tabular}`}>{speed.toFixed(1)}x</span>
          </div>

          <div className={styles.controlRow}>
            {isCompact ? (
              <div className={styles.pillRow}>
                <label className={styles.controlLabel} htmlFor={`click-fingers-${mode}`}>
                  Fingers
                </label>
                <select
                  id={`click-fingers-${mode}`}
                  aria-label="Trackpad fingers"
                  className={styles.pvSelect}
                  style={{ width: 'auto' }}
                  value={fingers}
                  onChange={(e) => setFingers(Number.parseInt(e.target.value, 10))}
                >
                  {ALL_FINGERS.map((count) => (
                    <option key={count} value={count}>
                      {count} Fingers
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className={styles.pillRow}>
                <span className={styles.controlLabel}>Fingers:</span>
                {QUICK_FINGERS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    aria-pressed={fingers === count}
                    className={`${styles.pillBtn} ${fingers === count ? styles.pillBtnActive : ''}`}
                    onClick={() => setFingers(count)}
                  >
                    {count}
                  </button>
                ))}
                <select
                  aria-label="Trackpad fingers"
                  className={styles.pvSelect}
                  style={{ width: 'auto' }}
                  value={fingers}
                  onChange={(e) => setFingers(Number.parseInt(e.target.value, 10))}
                >
                  {ALL_FINGERS.map((count) => (
                    <option key={count} value={count}>
                      {count} Fingers
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              role="switch"
              aria-checked={smartProtection}
              className={`${styles.pillBtn} ${smartProtection ? styles.pillBtnActive : ''}`}
              onClick={() => setSmartProtection((prev) => !prev)}
            >
              Smart Protection: {smartProtection ? 'On' : 'Off'}
            </button>
          </div>

          <div className={styles.pillRow}>
            {(
              [
                { id: 'page', label: 'Empty Page' },
                { id: 'link', label: 'Link / Tab' },
                { id: 'editor', label: 'Figma · VS Code' },
              ] as const
            ).map((ctx) => (
              <button
                key={ctx.id}
                type="button"
                aria-pressed={targetContext === ctx.id}
                className={`${styles.pillBtn} ${targetContext === ctx.id ? styles.pillBtnActive : ''}`}
                onClick={() => setTargetContext(ctx.id)}
              >
                {ctx.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PliwClickPreview;
