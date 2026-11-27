import { useState } from 'react';

export type PreviewMode = 'compact' | 'full';

export interface PliwMixPreviewProps {
  mode?: PreviewMode;
}

interface MixerAppRow {
  id: string;
  name: string;
  color: string;
  letter: string;
  volume: number;
  muted: boolean;
  output: string;
}

const OUTPUT_DEVICES = ['System Default', 'MacBook Speakers', 'AirPods Pro', 'Studio Display'];

const INITIAL_APPS: MixerAppRow[] = [
  { id: 'chrome', name: 'Google Chrome', color: '#3b82f6', letter: 'C', volume: 75, muted: false, output: 'MacBook Speakers' },
  { id: 'spotify', name: 'Spotify', color: '#22c55e', letter: 'S', volume: 45, muted: false, output: 'AirPods Pro' },
  { id: 'discord', name: 'Discord', color: '#6366f1', letter: 'D', volume: 100, muted: false, output: 'System Default' },
];

export function PliwMixPreview({ mode = 'full' }: PliwMixPreviewProps) {
  const isCompact = mode === 'compact';
  const [masterVolume, setMasterVolume] = useState(82);
  const [apps, setApps] = useState<MixerAppRow[]>(INITIAL_APPS);

  const visibleApps = isCompact ? apps.slice(0, 2) : apps;
  const hasCustom = apps.some((a) => a.volume !== 100 || a.muted || a.output !== 'System Default');

  const updateApp = (id: string, patch: Partial<MixerAppRow>) => {
    setApps((prev) => prev.map((app) => (app.id === id ? { ...app, ...patch } : app)));
  };

  const resetAll = () => {
    setApps((prev) => prev.map((app) => ({ ...app, volume: 100, muted: false, output: 'System Default' })));
  };

  return (
    <div
      style={{
        width: '100%',
        borderRadius: isCompact ? 16 : 20,
        background: 'linear-gradient(145deg, #1c1917 0%, #291815 55%, #18181b 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: isCompact ? 14 : 24,
        color: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        boxShadow: '0 18px 40px rgba(0, 0, 0, 0.28)',
      }}
    >
      <div
        style={{
          maxWidth: isCompact ? '100%' : 390,
          margin: '0 auto',
          borderRadius: 14,
          background: 'rgba(28, 28, 30, 0.92)',
          border: '1px solid rgba(255,255,255,0.12)',
          overflow: 'hidden',
        }}
      >
        {/* Popover Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isCompact ? '10px 12px' : '12px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                background: 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #e11d48 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
              }}
              aria-hidden="true"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
                <line x1="6" y1="4" x2="6" y2="20" />
                <circle cx="6" cy="9" r="2.2" fill="#fff" />
                <line x1="12" y1="4" x2="12" y2="20" />
                <circle cx="12" cy="15" r="2.2" fill="#fff" />
                <line x1="18" y1="4" x2="18" y2="20" />
                <circle cx="18" cy="8" r="2.2" fill="#fff" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.15 }}>Pliw Mix</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)' }}>Per-App Audio Mixer</div>
            </div>
          </div>

          {hasCustom && (
            <button
              type="button"
              onClick={resetAll}
              style={{
                border: 'none',
                borderRadius: 999,
                padding: '4px 9px',
                fontSize: 10.5,
                fontWeight: 600,
                background: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.82)',
                cursor: 'pointer',
              }}
            >
              Reset All
            </button>
          )}
        </div>

        <div style={{ padding: isCompact ? 10 : 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
          {/* Master Volume */}
          {!isCompact && (
            <div
              style={{
                padding: '9px 11px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.72)' }}>
                <span style={{ fontWeight: 600 }}>Master Output</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{masterVolume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={masterVolume}
                aria-label="Master Volume"
                onChange={(e) => setMasterVolume(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#f97316', cursor: 'pointer' }}
              />
            </div>
          )}

          {/* Per-App Rows */}
          {visibleApps.map((app) => (
            <div
              key={app.id}
              style={{
                padding: isCompact ? '8px 10px' : '10px 11px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.045)',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      background: app.color,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    {app.letter}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {app.name}
                  </span>
                </div>

                <select
                  aria-label={`${app.name} output device`}
                  value={app.output}
                  onChange={(e) => updateApp(app.id, { output: e.target.value })}
                  style={{
                    fontSize: 10.5,
                    background: 'rgba(255,255,255,0.08)',
                    color: '#f8fafc',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    padding: '2px 6px',
                    cursor: 'pointer',
                  }}
                >
                  {OUTPUT_DEVICES.map((dev) => (
                    <option key={dev} value={dev} style={{ color: '#0f172a' }}>
                      {dev}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => updateApp(app.id, { muted: !app.muted })}
                  aria-label={app.muted ? `Unmute ${app.name}` : `Mute ${app.name}`}
                  style={{
                    border: 'none',
                    borderRadius: 6,
                    padding: '3px 7px',
                    fontSize: 10.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: app.muted ? 'rgba(225, 29, 72, 0.26)' : 'rgba(255,255,255,0.09)',
                    color: app.muted ? '#fda4af' : '#e2e8f0',
                    minWidth: 44,
                  }}
                >
                  {app.muted ? 'Muted' : 'Mute'}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={app.muted ? 0 : app.volume}
                  aria-label={`${app.name} volume`}
                  onChange={(e) => updateApp(app.id, { volume: Number(e.target.value), muted: false })}
                  style={{ flex: 1, accentColor: '#f97316', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', width: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {app.muted ? '0%' : `${app.volume}%`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PliwMixPreview;
