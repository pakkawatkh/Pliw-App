import { useEffect, useRef, useState } from 'react';
import styles from './previews.module.css';

export type PreviewMode = 'compact' | 'full';

export interface PliwFacePreviewProps {
  mode?: PreviewMode;
}

type HudStyle = 'dynamicIsland' | 'notchWings';
type HudPhase = 'idle' | 'scanning' | 'unlocked' | 'retry';

function FaceIdSvg({ size = 34, color = '#ffffff', className }: { size?: number; color?: string; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M8 16V12C8 9.79 9.79 8 12 8H16M32 8H36C38.21 8 40 9.79 40 12V16M40 32V36C40 38.21 38.21 40 36 40H32M16 40H12C9.79 40 8 38.21 8 36V32"
        stroke={color}
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 18V22M30 18V22" stroke={color} strokeWidth="3.1" strokeLinecap="round" />
      <path d="M24 18V26.5C24 27.6 23.1 28.5 22 28.5H21.2" stroke={color} strokeWidth="2.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 32.5C20.2 34.4 22 35.2 24 35.2C26 35.2 27.8 34.4 29.5 32.5" stroke={color} strokeWidth="2.9" strokeLinecap="round" />
    </svg>
  );
}

function UnlockCheckSvg({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="20" stroke="rgba(48, 209, 88, 0.22)" strokeWidth="3" />
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke="#30d158"
        strokeWidth="3"
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
        className={styles.pfRingDraw}
      />
      <path
        d="M15.5 24.8L21.2 30.5L33 18.2"
        stroke="#30d158"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={styles.pfCheckDraw}
      />
    </svg>
  );
}

function PadlockSvg({ open, size = 13, color }: { open: boolean; size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2.5" fill={color} />
      {open ? (
        <path d="M8 11V7.5C8 5.29 9.79 3.5 12 3.5C13.9 3.5 15.5 4.8 15.9 6.6" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      ) : (
        <path d="M8 11V7.5C8 5.29 9.79 3.5 12 3.5C14.21 3.5 16 5.29 16 7.5V11" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function PliwFacePreview({ mode = 'full' }: PliwFacePreviewProps) {
  const isCompact = mode === 'compact';
  const [hudStyle, setHudStyle] = useState<HudStyle>('dynamicIsland');
  const [phase, setPhase] = useState<HudPhase>('unlocked');
  const [animKey, setAnimKey] = useState(0);
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => clearTimers, []);

  const runDemo = (outcome: 'unlocked' | 'retry') => {
    clearTimers();
    setPhase('scanning');
    setAnimKey((k) => k + 1);

    const t1 = window.setTimeout(() => {
      setPhase(outcome);
      setAnimKey((k) => k + 1);
    }, 820);

    const t2 = window.setTimeout(() => {
      setPhase('idle');
    }, outcome === 'unlocked' ? 2350 : 2100);

    timersRef.current.push(t1, t2);
  };

  const isActive = phase !== 'idle';
  const islandExpanded = hudStyle === 'dynamicIsland' && isActive;
  const wingsExpanded = hudStyle === 'notchWings' && isActive;

  const notchW =
    hudStyle === 'dynamicIsland'
      ? islandExpanded
        ? isCompact
          ? 122
          : 146
        : 92
      : wingsExpanded
        ? isCompact
          ? 158
          : 178
        : 92;

  const notchH =
    hudStyle === 'dynamicIsland'
      ? islandExpanded
        ? isCompact
          ? 84
          : 102
        : 22
      : 24;

  const notchRadius =
    hudStyle === 'dynamicIsland' && islandExpanded ? 24 : 9;

  const passStatus =
    phase === 'scanning'
      ? { text: 'Scanning Face ID...', color: '#e2e8f0' }
      : phase === 'unlocked'
        ? { text: '••••••••••  Unlocked', color: '#30d158' }
        : phase === 'retry'
          ? { text: 'Hover notch to retry', color: '#ff6961' }
          : { text: 'Hover notch to unlock', color: 'rgba(226,232,240,0.68)' };

  return (
    <div className={`${styles.pvWindow} ${isCompact ? styles.pvCompact : styles.pvFull}`}>
      <div className={styles.pvBar}>
        <div className={styles.pvDots} aria-hidden="true">
          <span className={`${styles.pvDot} ${styles.pvDotClose}`} />
          <span className={`${styles.pvDot} ${styles.pvDotMin}`} />
          <span className={`${styles.pvDot} ${styles.pvDotMax}`} />
        </div>
        <span className={styles.pvBarTitle}>Pliw Face · Lock Screen</span>
        <span className={styles.statusBadge}>
          {hudStyle === 'dynamicIsland' ? 'Dynamic Island' : 'Notch Wings'}
        </span>
      </div>

      <div className={styles.pvBody}>
        <div className={styles.pfStage}>
          <div className={styles.pfMenuBar} aria-hidden="true">
            <span>MacBook Pro</span>
            <span>Wi-Fi · 100%</span>
          </div>

          <div
            className={styles.pfNotchAnchor}
            onMouseEnter={() => {
              if (phase === 'idle' || phase === 'retry') runDemo('unlocked');
            }}
            onClick={() => runDemo('unlocked')}
            role="button"
            tabIndex={0}
            aria-label="Hover or click notch to trigger Face ID scan"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                runDemo('unlocked');
              }
            }}
          >
            <div
              key={phase === 'retry' ? `shake-${animKey}` : 'notch'}
              className={`${styles.pfNotchBody} ${phase === 'retry' ? styles.pfShake : ''}`}
              style={{
                width: notchW,
                height: notchH,
                borderBottomLeftRadius: notchRadius,
                borderBottomRightRadius: notchRadius,
                paddingTop: islandExpanded ? 20 : 0,
              }}
            >
              {hudStyle === 'dynamicIsland' && islandExpanded && (
                <>
                  {phase === 'scanning' && (
                    <FaceIdSvg
                      size={isCompact ? 34 : 42}
                      color="#ffffff"
                      className={styles.pfFaceScan}
                    />
                  )}
                  {phase === 'unlocked' && (
                    <UnlockCheckSvg key={`chk-${animKey}`} size={isCompact ? 36 : 44} />
                  )}
                  {phase === 'retry' && (
                    <FaceIdSvg size={isCompact ? 34 : 42} color="#ff453a" />
                  )}
                </>
              )}

              {hudStyle === 'notchWings' && wingsExpanded && (
                <div className={styles.pfWingsRow}>
                  <PadlockSvg
                    open={phase === 'unlocked'}
                    size={12}
                    color={phase === 'unlocked' ? '#30d158' : phase === 'retry' ? '#ff453a' : '#f8fafc'}
                  />
                  {phase === 'scanning' && (
                    <FaceIdSvg size={14} color="#30d158" className={styles.pfFaceScan} />
                  )}
                  {phase === 'unlocked' && (
                    <UnlockCheckSvg key={`wchk-${animKey}`} size={16} />
                  )}
                  {phase === 'retry' && (
                    <span style={{ color: '#ff453a', fontSize: 12, fontWeight: 800, lineHeight: 1 }}>✕</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div
            className={styles.pfClockWrap}
            style={{
              opacity: islandExpanded && isCompact ? 0.25 : 0.96,
              transform: islandExpanded && isCompact ? 'translateY(4px)' : 'translateY(0)',
            }}
          >
            {!isCompact && <div className={styles.pfClockDate}>Thursday, November 27</div>}
            <div className={styles.pfClockTime}>09:41</div>
          </div>

          <div className={styles.pfLoginPill}>
            <span className={styles.pfAvatar}>P.</span>
            <span className={styles.pfPassDots} style={{ color: passStatus.color }}>
              {passStatus.text}
            </span>
          </div>
        </div>

        <div className={styles.pfControls}>
          <div className={styles.pfSegmented}>
            <button
              type="button"
              className={`${styles.pillBtn} ${hudStyle === 'dynamicIsland' ? styles.pillBtnActive : ''}`}
              onClick={() => {
                setHudStyle('dynamicIsland');
                runDemo('unlocked');
              }}
            >
              Dynamic Island
            </button>
            <button
              type="button"
              className={`${styles.pillBtn} ${hudStyle === 'notchWings' ? styles.pillBtnActive : ''}`}
              onClick={() => {
                setHudStyle('notchWings');
                runDemo('unlocked');
              }}
            >
              Notch Wings
            </button>
          </div>

          <div className={styles.pfSegmented}>
            <button
              type="button"
              className={`${styles.pillBtn} ${phase === 'unlocked' ? styles.pillBtnActive : ''}`}
              onClick={() => runDemo('unlocked')}
            >
              Unlock
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
      </div>
    </div>
  );
}

export default PliwFacePreview;
