import { useEffect, useRef, useState } from 'react';
import styles from './previews.module.css';

export type PreviewMode = 'compact' | 'full';

export interface PliwFacePreviewProps {
  mode?: PreviewMode;
}

type StageView = 'lockscreen' | 'enroll';
type HudStyle = 'dynamicIsland' | 'notchWings';
type HudPhase = 'idle' | 'scanning' | 'unlocked' | 'retry';
type LivenessOption = 'Fast' | 'Balanced' | 'Strict';

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
  const [stageView, setStageView] = useState<StageView>('lockscreen');
  const [hudStyle, setHudStyle] = useState<HudStyle>('dynamicIsland');
  const [phase, setPhase] = useState<HudPhase>('unlocked');
  const [animKey, setAnimKey] = useState(0);
  const [liveness, setLiveness] = useState<LivenessOption>('Balanced');

  // Interactive 17-angle circular enrollment state
  const [capturedSectors, setCapturedSectors] = useState<Set<number>>(
    () => new Set([0, 1, 2, 3, 4, 5, 13, 14, 15])
  );
  const [liveAngleDeg, setLiveAngleDeg] = useState<number | null>(null);

  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => clearTimers, []);

  const runDemo = (outcome: 'unlocked' | 'retry') => {
    clearTimers();
    setStageView('lockscreen');
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

  const handleEnrollPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist < 18) {
      setLiveAngleDeg(null);
      return;
    }
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    setLiveAngleDeg(deg);

    const sector = Math.floor(((deg + 11.25) / 22.5) % 16);
    setCapturedSectors((prev) => {
      if (prev.has(sector)) return prev;
      const next = new Set(prev);
      next.add(sector);
      return next;
    });
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

  const enrolledCount = Math.min(17, capturedSectors.size + 1);
  const ringRadius = isCompact ? 50 : 68;

  return (
    <div className={`${styles.pvWindow} ${isCompact ? styles.pvCompact : styles.pvFull}`}>
      <div className={styles.pvBar}>
        <div className={styles.pvDots} aria-hidden="true">
          <span className={`${styles.pvDot} ${styles.pvDotClose}`} />
          <span className={`${styles.pvDot} ${styles.pvDotMin}`} />
          <span className={`${styles.pvDot} ${styles.pvDotMax}`} />
        </div>
        <span className={styles.pvBarTitle}>
          {stageView === 'lockscreen' ? 'Pliw Face · Lock Screen' : 'Pliw Face · 17-Angle Setup'}
        </span>
        <span className={styles.statusBadge}>
          {stageView === 'lockscreen' ? liveness : `${enrolledCount} / 17`}
        </span>
      </div>

      <div className={styles.pvBody}>
        {stageView === 'lockscreen' ? (
          <div className={styles.pfStage}>
            <div className={styles.pfMenuBar} aria-hidden="true">
              <span>MacBook Pro</span>
              <span>Wi-Fi · 100%</span>
            </div>

            {/* Interactive MacBook Notch HUD (hover or click to scan) */}
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

            {/* Lock Screen Clock */}
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

            {/* Bottom Lock Screen User Pill */}
            <div className={styles.pfLoginPill}>
              <span className={styles.pfAvatar}>P.</span>
              <span className={styles.pfPassDots} style={{ color: passStatus.color }}>
                {passStatus.text}
              </span>
            </div>
          </div>
        ) : (
          <div
            className={styles.pfEnrollStage}
            onPointerMove={handleEnrollPointer}
            onPointerLeave={() => setLiveAngleDeg(null)}
            aria-label="Interactive 17-angle circular face enrollment ring"
          >
            <div
              style={{
                position: 'relative',
                width: ringRadius * 2 + 28,
                height: ringRadius * 2 + 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {Array.from({ length: 36 }).map((_, idx) => {
                const tickDeg = idx * 10;
                const sector = Math.floor(((tickDeg + 11.25) / 22.5) % 16);
                const done = capturedSectors.has(sector);
                const isLive =
                  !done &&
                  liveAngleDeg !== null &&
                  Math.abs((((tickDeg - liveAngleDeg + 540) % 360) - 180)) <= 16;

                return (
                  <span
                    key={idx}
                    style={{
                      position: 'absolute',
                      width: done || isLive ? 3 : 2.2,
                      height: done ? 11 : isLive ? 10 : 7,
                      borderRadius: 99,
                      background: done
                        ? '#30d158'
                        : isLive
                          ? 'rgba(255,255,255,0.92)'
                          : 'rgba(255,255,255,0.16)',
                      transform: `rotate(${tickDeg}deg) translateY(-${ringRadius}px)`,
                      transition: 'background 150ms ease, height 150ms ease',
                    }}
                  />
                );
              })}

              <div
                style={{
                  width: ringRadius * 1.48,
                  height: ringRadius * 1.48,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 50% 35%, rgba(48, 209, 88, 0.16), rgba(15, 23, 42, 0.85))',
                  border: `1.5px solid ${enrolledCount === 17 ? '#30d158' : 'rgba(255,255,255,0.14)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {enrolledCount === 17 ? (
                  <UnlockCheckSvg size={isCompact ? 34 : 44} />
                ) : (
                  <FaceIdSvg size={isCompact ? 32 : 42} color="#30d158" />
                )}
              </div>
            </div>

            <div className={styles.pfEnrollCaption}>
              {enrolledCount === 17 ? 'Face ID Ready' : 'Move cursor around the ring'}
            </div>
            {!isCompact && (
              <div className={styles.pfEnrollSub}>
                {enrolledCount} of 17 angles captured · 3D pose calibrated
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className={styles.controlRow}>
          <div className={styles.pillRow}>
            <button
              type="button"
              className={`${styles.pillBtn} ${stageView === 'lockscreen' && hudStyle === 'dynamicIsland' ? styles.pillBtnActive : ''}`}
              onClick={() => {
                setStageView('lockscreen');
                setHudStyle('dynamicIsland');
                runDemo('unlocked');
              }}
            >
              Dynamic Island
            </button>
            <button
              type="button"
              className={`${styles.pillBtn} ${stageView === 'lockscreen' && hudStyle === 'notchWings' ? styles.pillBtnActive : ''}`}
              onClick={() => {
                setStageView('lockscreen');
                setHudStyle('notchWings');
                runDemo('unlocked');
              }}
            >
              Notch Wings
            </button>
            <button
              type="button"
              className={`${styles.pillBtn} ${stageView === 'enroll' ? styles.pillBtnActive : ''}`}
              onClick={() => setStageView('enroll')}
            >
              17-Angle Ring
            </button>
          </div>

          {stageView === 'lockscreen' ? (
            <div className={styles.pillRow}>
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
          ) : (
            <button
              type="button"
              className={styles.pillBtn}
              onClick={() => setCapturedSectors(new Set())}
            >
              Reset Ring
            </button>
          )}
        </div>

        {!isCompact && stageView === 'lockscreen' && (
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
