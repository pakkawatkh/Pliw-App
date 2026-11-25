import { useId, useState } from 'react';
import styles from './previews.module.css';

export type PreviewMode = 'compact' | 'full';

export interface PliwGeoPreviewProps {
  mode?: PreviewMode;
}

type Direction = 'N' | 'S' | 'E' | 'W';
type StepMeters = 10 | 100 | 1000;

const GEO_PRESETS = [
  { name: 'Bangkok', lat: 13.7563, lng: 100.5018 },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'New York', lat: 40.7128, lng: -74.006 },
] as const;

const STEP_OPTIONS: ReadonlyArray<{ meters: StepMeters; label: string }> = [
  { meters: 10, label: '10 m' },
  { meters: 100, label: '100 m' },
  { meters: 1000, label: '1 km' },
];

function clampLat(v: number): number {
  return Math.max(-85.05, Math.min(85.05, v));
}

function clampLng(v: number): number {
  return Math.max(-180, Math.min(180, v));
}

function clampPct(v: number): number {
  return Math.max(8, Math.min(92, v));
}

function formatCoordPair(lat: number, lng: number): string {
  const latHem = lat >= 0 ? 'N' : 'S';
  const lngHem = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latHem}, ${Math.abs(lng).toFixed(4)}° ${lngHem}`;
}

export function PliwGeoPreview({ mode = 'full' }: PliwGeoPreviewProps) {
  const isCompact = mode === 'compact';
  const uid = useId().replace(/:/g, '');
  const gridPatternId = `geo-grid-${uid}`;
  const [spoofingActive, setSpoofingActive] = useState<boolean>(true);
  const [selectedPreset, setSelectedPreset] = useState<string | null>('Tokyo');
  const [lat, setLat] = useState<number>(35.6762);
  const [lng, setLng] = useState<number>(139.6503);
  const [pinPos, setPinPos] = useState<{ xPct: number; yPct: number }>({ xPct: 50, yPct: 50 });
  const [stepMeters, setStepMeters] = useState<StepMeters>(100);
  const [jitterEnabled, setJitterEnabled] = useState<boolean>(true);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest('button')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    setLat((prev) => clampLat(prev + (0.5 - ny) * 0.04));
    setLng((prev) => clampLng(prev + (nx - 0.5) * 0.04));
    setPinPos({ xPct: clampPct(nx * 100), yPct: clampPct(ny * 100) });
    setSelectedPreset(null);
  };

  const moveDirection = (dir: Direction) => {
    const dLat = stepMeters / 111320;
    const cosLat = Math.cos((lat * Math.PI) / 180);
    const dLng = stepMeters / (111320 * (Math.abs(cosLat) > 0.01 ? cosLat : 0.01));
    const deltaPct = stepMeters === 1000 ? 10 : stepMeters === 100 ? 5 : 2;

    if (dir === 'N') {
      setLat((prev) => clampLat(prev + dLat));
      setPinPos((prev) => ({ ...prev, yPct: clampPct(prev.yPct - deltaPct) }));
    } else if (dir === 'S') {
      setLat((prev) => clampLat(prev - dLat));
      setPinPos((prev) => ({ ...prev, yPct: clampPct(prev.yPct + deltaPct) }));
    } else if (dir === 'E') {
      setLng((prev) => clampLng(prev + dLng));
      setPinPos((prev) => ({ ...prev, xPct: clampPct(prev.xPct + deltaPct) }));
    } else if (dir === 'W') {
      setLng((prev) => clampLng(prev - dLng));
      setPinPos((prev) => ({ ...prev, xPct: clampPct(prev.xPct - deltaPct) }));
    }
    setSelectedPreset(null);
  };

  const selectCity = (preset: (typeof GEO_PRESETS)[number]) => {
    setLat(preset.lat);
    setLng(preset.lng);
    setSelectedPreset(preset.name);
    setPinPos({ xPct: 50, yPct: 50 });
  };

  const coordText = formatCoordPair(lat, lng);

  const mapStage = (
    <div
      className={styles.geoMapStage}
      onClick={handleMapClick}
      role="region"
      aria-label="Interactive geolocation map"
    >
      <svg className={styles.geoMapSvg} viewBox="0 0 400 240" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern id={gridPatternId} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(16, 185, 129, 0.16)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="400" height="240" fill={`url(#${gridPatternId})`} />
        <path d="M-10,165 Q120,120 220,150 T410,110 L410,240 L-10,240 Z" fill="rgba(14, 165, 233, 0.12)" />
        <rect x="48" y="34" width="68" height="44" rx="8" fill="rgba(16, 185, 129, 0.12)" />
        <rect x="260" y="38" width="84" height="54" rx="10" fill="rgba(16, 185, 129, 0.1)" />
        <path d="M0,108 L400,82" stroke="rgba(255,255,255,0.85)" strokeWidth="6" />
        <path d="M168,0 L196,240" stroke="rgba(255,255,255,0.82)" strokeWidth="5" />
        <path d="M40,0 L102,240" stroke="rgba(255,255,255,0.55)" strokeWidth="3" />
        <path d="M0,188 L400,162" stroke="rgba(255,255,255,0.55)" strokeWidth="3" />
      </svg>

      <div
        className={styles.geoPin}
        style={{ left: `${pinPos.xPct}%`, top: `${pinPos.yPct}%` }}
      >
        <div className={`${styles.geoPinHalo} ${!spoofingActive ? styles.geoPinHaloMuted : ''}`}>
          <div className={`${styles.geoPinCore} ${!spoofingActive ? styles.geoPinCoreMuted : ''}`} />
        </div>
      </div>

      <div className={styles.geoCoordsHud}>{coordText}</div>
      <div className={styles.geoCityBadge}>{selectedPreset ?? 'Custom Pin'}</div>
    </div>
  );

  const controls = (
    <>
      <div className={styles.pillRow} role="group" aria-label="City presets">
        {GEO_PRESETS.map((city) => {
          const active = selectedPreset === city.name;
          return (
            <button
              key={city.name}
              type="button"
              aria-pressed={active}
              className={`${styles.pillBtn} ${active ? styles.pillBtnActive : ''}`}
              onClick={() => selectCity(city)}
            >
              {city.name}
            </button>
          );
        })}
      </div>

      <div className={styles.controlRow}>
        <div className={styles.pillRow} role="group" aria-label="Movement step size">
          {STEP_OPTIONS.map((opt) => (
            <button
              key={opt.meters}
              type="button"
              aria-pressed={stepMeters === opt.meters}
              className={`${styles.pillBtn} ${stepMeters === opt.meters ? styles.pillBtnActive : ''}`}
              onClick={() => setStepMeters(opt.meters)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className={styles.geoNudgePad} role="group" aria-label="Move coordinates">
          {(
            [
              { dir: 'N', label: 'North' },
              { dir: 'S', label: 'South' },
              { dir: 'W', label: 'West' },
              { dir: 'E', label: 'East' },
            ] as const
          ).map(({ dir, label }) => (
            <button
              key={dir}
              type="button"
              className={styles.geoNudgeBtn}
              aria-label={label}
              title={`Move ${label}`}
              onClick={() => moveDirection(dir)}
            >
              {dir}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.controlRow}>
        <button
          type="button"
          role="switch"
          aria-checked={jitterEnabled}
          className={`${styles.pillBtn} ${jitterEnabled ? styles.pillBtnActive : ''}`}
          onClick={() => setJitterEnabled((prev) => !prev)}
        >
          GPS Jitter: {jitterEnabled ? '±2–4 m' : 'Off'}
        </button>

        {!isCompact && (
          <button
            type="button"
            className={styles.pillBtn}
            onClick={() => setPinPos({ xPct: 50, yPct: 50 })}
          >
            Center Pin
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className={`${styles.pvWindow} ${isCompact ? styles.pvCompact : styles.pvFull}`}>
      <div className={styles.pvBar}>
        <div className={styles.pvDots} aria-hidden="true">
          <span className={`${styles.pvDot} ${styles.pvDotClose}`} />
          <span className={`${styles.pvDot} ${styles.pvDotMin}`} />
          <span className={`${styles.pvDot} ${styles.pvDotMax}`} />
        </div>
        <span className={styles.pvBarTitle}>Pliw Geo</span>
        <button
          type="button"
          role="switch"
          aria-checked={spoofingActive}
          className={`${styles.geoStatusPill} ${spoofingActive ? styles.geoStatusActive : styles.geoStatusIdle}`}
          onClick={() => setSpoofingActive((prev) => !prev)}
        >
          {spoofingActive ? 'Spoofing Active' : 'Real Location'}
        </button>
      </div>

      <div className={styles.pvBody}>
        {isCompact ? (
          <>
            {mapStage}
            <div className={styles.geoControlsCompact}>{controls}</div>
          </>
        ) : (
          <div className={styles.geoFullGrid}>
            {mapStage}
            <div className={styles.geoSidePanel}>
              <div className={styles.controlRow}>
                <span className={styles.controlLabel}>Coordinates</span>
                <span className={`${styles.statusBadge} ${styles.tabular}`}>Accuracy: 15 m</span>
              </div>
              {controls}
              <div className={styles.geoCodeOut}>
                <div>{`coords.latitude: ${lat.toFixed(6)}`}</div>
                <div>{`coords.longitude: ${lng.toFixed(6)}`}</div>
                <div>{`status: "${spoofingActive ? 'granted (spoofed)' : 'browser default'}"`}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PliwGeoPreview;
