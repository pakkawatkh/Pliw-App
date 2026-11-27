import { useEffect, useRef, useState } from 'react';
import styles from './previews.module.css';

export type PreviewMode = 'compact' | 'full';

export interface PliwFacePreviewProps {
  mode?: PreviewMode;
}

type HudStyle = 'dynamicIsland' | 'notchWings';
type HudPhase = 'idle' | 'scanning' | 'unlocked' | 'retry';
type LivenessOption = 'Fast' | 'Balanced' | 'Strict';

export function PliwFacePreview({ mode = 'full' }: PliwFacePreviewProps) {
  const isCompact = mode === 'compact';
  const [hudStyle, setHudStyle] = useState<HudStyle>('dynamicIsland');
  const [phase, setPhase] = useState<HudPhase>('unlocked');
  const [liveness, setLiveness] = useState<LivenessOption>('Balanced');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const runDemo = (outcome: 'unlocked' | 'retry') => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setPhase('scanning');
    timerRef.current = window.setTimeout(() => {
      setPhase(outcome);
    }, 850);
  };

  const accent =
    phase === 'unlocked' ? '#30d158' : phase === 'retry' ? '#ff453a' : '#ffffff';

  const statusLabel =
    phase === 'scanning'
      ? 'Scanning face...'
      : phase === 'unlocked'
        ? 'Unlocked · On-device'
        : phase === 'retry'
          ? 'No match · Hover notch to retry'
          : 'Ready on Lock Screen';

  const islandExpanded = hudStyle === 'dynamicIsland' && phase !== 'idle';
  const wingsExpanded = hudStyle === 'notchWings' && phase !== 'idle';

  return (
    <div className={`${styles.pvWindow} ${isCompact ? styles.pvCompact : styles.pvFull}`}>
      <div className={styles.pvBar}>
        <div className={styles.pvDots} aria-hidden="true">
          <span className={`${styles.pvDot} ${styles.pvDotClose}`} />
          <span className={`${styles.pvDot} ${styles.pvDotMin}`} />
          <span className={`${styles.pvDot} ${styles.pvDotMax}`} />
        </div>
        <span className={styles.pvBarTitle}>Pliw Face · Lock Screen HUD</span>
        <span className={styles.statusBadge}>{liveness}</span>
      </div>

      <div className={styles.pvBody}>
        <div
          style={{
            position: 'relative',
            borderRadius: 12,
            overflow: 'hidden',
            background: 'linear-gradient(155deg, #0f172a 0%, #111827 55%, #0b2930 100%)',
            minHeight: isCompact ? 148 : 204,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: isCompact ? 14 : 20,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* MacBook Notch + Active HUD */}
          <div
            style={{
              background: '#000000',
              color: accent,
              width: hudStyle === 'dynamicIsland' ? (islandExpanded ? 146 : 92) : wingsExpanded ? 174 : 92,
              height: hudStyle === 'dynamicIsland' ? (islandExpanded ? 92 : 24) : 26,
              borderBottomLeftRadius: hudStyle === 'dynamicIsland' && islandExpanded ? 24 : 10,
              borderBottomRightRadius: hudStyle === 'dynamicIsland' && islandExpanded ? 24 : 10,
              transition: 'all 280ms cubic-bezier(0.22, 1, 0.36, 1)',
              display: 'flex',
              alignItems: hudStyle === 'dynamicIsland' ? 'flex-end' : 'center',
              justifyContent: hudStyle === 'notchWings' ? 'space-between' : 'center',
              padding: hudStyle === 'dynamicIsland' ? '0 0 16px 0' : '0 12px',
              boxSizing: 'border-box',
            }}
          >
            {hudStyle === 'notchWings' && wingsExpanded && (
              <>
                <span style={{ fontSize: 12, color: phase === 'unlocked' ? '#30d158' : '#e2e8f0' }}>
                  {phase === 'unlocked' ? '🔓' : '🔒'}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>
                  {phase === 'unlocked' ? '✓' : phase === 'retry' ? '✕' : '◎'}
                </span>
              </>
            )}

            {hudStyle === 'dynamicIsland' && islandExpanded && (
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  border: `2.5px solid ${accent}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  fontWeight: 700,
                  color: accent,
                }}
              >
                {phase === 'unlocked' ? '✓' : phase === 'retry' ? '✕' : '◎'}
              </div>
            )}
          </div>

          {/* Lock Screen clock + status */}
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.92)' }}>
            <div style={{ fontSize: isCompact ? 22 : 30, fontWeight: 700, letterSpacing: '-0.03em' }}>
              09:41
            </div>
            <div style={{ fontSize: 11, color: accent, marginTop: 2, fontWeight: 600 }}>
              {statusLabel}
            </div>
          </div>
        </div>

        <div className={styles.controlRow}>
          <div className={styles.pillRow}>
            <button
              type="button"
              className={`${styles.pillBtn} ${hudStyle === 'dynamicIsland' ? styles.pillBtnActive : ''}`}
              onClick={() => setHudStyle('dynamicIsland')}
            >
              Dynamic Island
            </button>
            <button
              type="button"
              className={`${styles.pillBtn} ${hudStyle === 'notchWings' ? styles.pillBtnActive : ''}`}
              onClick={() => setHudStyle('notchWings')}
            >
              Notch Wings
            </button>
          </div>

          <div className={styles.pillRow}>
            <button
              type="button"
              className={`${styles.pillBtn} ${phase === 'unlocked' ? styles.pillBtnActive : ''}`}
              onClick={() => runDemo('unlocked')}
            >
              Test Unlock
            </button>
            <button
              type="button"
              className={`${styles.pillBtn} ${phase === 'retry' ? styles.pillBtnActive : ''}`}
              onClick={() => runDemo('retry')}
            >
              Retry
            </button>
          </div>
        </div>

        {!isCompact && (
          <div className={styles.controlRow}>
            <span className={styles.controlLabel}>Liveness</span>
            <div className={styles.pillRow}>
              {(['Fast', 'Balanced', 'Strict'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={liveness === opt}
                  className={`${styles.pillBtn} ${liveness === opt ? styles.pillBtnActive : ''}`}
                  onClick={() => setLiveness(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PliwFacePreview;
