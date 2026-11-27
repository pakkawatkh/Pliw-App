import { useEffect, useRef, useState } from 'react';
import type { AppEntry, AppSlug } from '../data/types';
import { MonkeyToolsPreview } from './previews/MonkeyToolsPreview';
import { PliwClickPreview } from './previews/PliwClickPreview';
import { PliwCollagePreview } from './previews/PliwCollagePreview';
import { PliwFacePreview } from './previews/PliwFacePreview';
import { PliwScrollPreview } from './previews/PliwScrollPreview';
import { PliwGeoPreview } from './previews/PliwGeoPreview';

export type CatalogFilter = 'all' | 'app' | 'extension';

export interface CatalogExplorerProps {
  apps: AppEntry[];
}

const FILTER_ORDER: readonly CatalogFilter[] = ['all', 'app', 'extension'];

function filterFromHash(hash: string): CatalogFilter | null {
  if (hash === '#apps') return 'app';
  if (hash === '#extensions') return 'extension';
  if (hash === '#all') return 'all';
  return null;
}

function hashForFilter(filter: CatalogFilter): string {
  if (filter === 'app') return '#apps';
  if (filter === 'extension') return '#extensions';
  return '#all';
}

function CompactPreviewSwitch({ slug }: { slug: AppSlug }) {
  switch (slug) {
    case 'monkey-tools':
      return <MonkeyToolsPreview mode="compact" />;
    case 'pliw-collage':
      return <PliwCollagePreview mode="compact" />;
    case 'pliw-click':
      return <PliwClickPreview mode="compact" />;
    case 'pliw-face':
      return <PliwFacePreview mode="compact" />;
    case 'pliw-scroll':
      return <PliwScrollPreview mode="compact" />;
    case 'pliw-geo':
      return <PliwGeoPreview mode="compact" />;
  }
}

export default function CatalogExplorer({ apps }: CatalogExplorerProps) {
  const [filter, setFilter] = useState<CatalogFilter>('all');
  const tabRefs = useRef<Partial<Record<CatalogFilter, HTMLButtonElement | null>>>({});

  const macApps = apps.filter((a) => a.category === 'app');
  const extensions = apps.filter((a) => a.category === 'extension');

  const selectFilter = (next: CatalogFilter, updateHash: boolean = true) => {
    setFilter(next);
    if (updateHash && typeof window !== 'undefined') {
      const targetHash = hashForFilter(next);
      window.history.replaceState(null, '', targetHash);
    }
  };

  useEffect(() => {
    const syncHash = () => {
      const parsed = filterFromHash(window.location.hash);
      if (parsed) setFilter(parsed);
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);

    const navLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('[data-nav-filter]')
    );
    const handleNavClick = (e: Event) => {
      const anchor = e.currentTarget as HTMLAnchorElement;
      const raw = anchor.dataset.navFilter;
      if (raw !== 'all' && raw !== 'app' && raw !== 'extension') return;
      e.preventDefault();
      selectFilter(raw, true);
      const targetId = raw === 'extension' ? 'extensions' : 'apps';
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
        });
      });
    };

    navLinks.forEach((link) => link.addEventListener('click', handleNavClick));
    return () => {
      window.removeEventListener('hashchange', syncHash);
      navLinks.forEach((link) => link.removeEventListener('click', handleNavClick));
    };
  }, []);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % FILTER_ORDER.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + FILTER_ORDER.length) % FILTER_ORDER.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = FILTER_ORDER.length - 1;
    if (nextIdx === null) return;
    e.preventDefault();
    const nextFilter = FILTER_ORDER[nextIdx];
    selectFilter(nextFilter, true);
    tabRefs.current[nextFilter]?.focus();
  };

  const tabMeta: ReadonlyArray<{ id: CatalogFilter; label: string }> = [
    { id: 'all', label: `All (${apps.length})` },
    { id: 'app', label: `Apps (${macApps.length})` },
    { id: 'extension', label: `Extensions (${extensions.length})` },
  ];

  const renderCard = (app: AppEntry) => (
    <article key={app.slug} className="app-card-featured" data-app={app.slug}>
      <div className="card-ribbon">
        <span
          className="badge-status"
          style={{
            background: app.theme.badgeBg,
            color: app.theme.badgeColor,
            borderColor: app.theme.badgeBorder,
          }}
        >
          {app.versionTag}
        </span>
      </div>

      <div>
        <div className="app-identity">
          <img
            src={app.iconUrl}
            alt={app.category === 'app' ? `${app.name} App Icon` : `${app.name} Icon`}
            width={72}
            height={72}
            className="app-icon"
          />
          <div className="app-meta">
            <h4>{app.name}</h4>
            <p>{app.platformLabel}</p>
          </div>
        </div>

        <p className="app-desc">{app.description}</p>

        <div className="app-actions">
          <a href={app.pageUrl} className="btn btn-primary">
            Details →
          </a>
          <a href={app.downloadUrl} download className="btn btn-secondary">
            Download {app.downloadType} ({app.fileSize})
          </a>
        </div>
      </div>

      <div className="app-card-media-col">
        <CompactPreviewSwitch slug={app.slug} />
      </div>
    </article>
  );

  return (
    <div>
      <div className="category-tabs" role="tablist" aria-label="Filter catalog">
        {tabMeta.map((tab, idx) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              className={`category-tab${isActive ? ' active' : ''}`}
              data-cat={tab.id}
              aria-selected={isActive}
              aria-controls="catalog-panel"
              tabIndex={isActive ? 0 : -1}
              onClick={() => selectFilter(tab.id, true)}
              onKeyDown={(e) => handleTabKeyDown(e, idx)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div id="catalog-panel" role="tabpanel" aria-labelledby={`tab-${filter}`}>
        <div className="category-group" data-group="app" hidden={filter === 'extension'}>
          <div className="category-heading">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.33c.64-.78 1.08-1.86.96-2.94-.93.04-2.05.62-2.71 1.4-.58.68-1.1 1.78-.96 2.84 1.04.08 2.07-.52 2.71-1.3z" />
              </svg>
              Apps
            </h3>
            <span>macOS 13.0+ · {macApps.length} Apps</span>
          </div>
          <div className="apps-grid">{macApps.map(renderCard)}</div>
        </div>

        <div
          className="category-group"
          id="extensions"
          data-group="extension"
          hidden={filter === 'app'}
        >
          <div className="category-heading">
            <h3>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z" />
              </svg>
              Extensions
            </h3>
            <span>Chrome · Brave · Edge · {extensions.length} Extensions</span>
          </div>
          <div className="apps-grid">{extensions.map(renderCard)}</div>
        </div>
      </div>
    </div>
  );
}
