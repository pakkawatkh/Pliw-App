import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './previews.module.css';

export type PreviewMode = 'compact' | 'full';

export interface MonkeyToolsPreviewProps {
  mode?: PreviewMode;
}

type ModuleTab = 'clipboard' | 'emoji' | 'translator';
type ClipboardFilter = 'all' | 'text' | 'image' | 'pinned';
type EmojiCategory = 'recent' | 'smileys' | 'people' | 'animals' | 'food' | 'symbols';

interface ClipboardItem {
  id: string;
  kind: 'text' | 'image';
  title: string;
  content: string;
  source: string;
  relativeTime: string;
  pinned: boolean;
  swatch?: string;
  dimensions?: string;
  ocrText?: string;
}

interface EmojiEntry {
  char: string;
  name: string;
  keywords: string;
  category: Exclude<EmojiCategory, 'recent'>;
}

const MODULE_TABS: ReadonlyArray<{ id: ModuleTab; label: string }> = [
  { id: 'clipboard', label: 'Clipboard' },
  { id: 'emoji', label: 'Emoji' },
  { id: 'translator', label: 'Translator' },
];

const INITIAL_CLIPBOARD_ITEMS: ClipboardItem[] = [
  {
    id: 'clip-color',
    kind: 'text',
    title: '#0284C7',
    content: '#0284C7 — Brand Accent Color',
    source: 'Figma',
    relativeTime: '2m ago',
    pinned: true,
    swatch: '#0284c7',
  },
  {
    id: 'clip-receipt',
    kind: 'image',
    title: 'Screenshot — Receipt',
    content: 'Receipt capture ready for Apple Vision OCR',
    source: 'Preview',
    relativeTime: '6m ago',
    pinned: false,
    dimensions: '1440 × 900',
    ocrText: 'Invoice #2026-04 · Total $148.00 · Paid',
  },
  {
    id: 'clip-url',
    kind: 'text',
    title: 'https://pakkawatkh.github.io/public/',
    content: 'https://pakkawatkh.github.io/public/',
    source: 'Safari',
    relativeTime: '14m ago',
    pinned: false,
  },
  {
    id: 'clip-cmd',
    kind: 'text',
    title: 'swift test --parallel',
    content: 'swift test --parallel',
    source: 'Terminal',
    relativeTime: '1h ago',
    pinned: false,
  },
];

const EMOJI_CATEGORIES: ReadonlyArray<{ id: EmojiCategory; icon: string; label: string }> = [
  { id: 'recent', icon: '🕒', label: 'Recent' },
  { id: 'smileys', icon: '😀', label: 'Smileys' },
  { id: 'people', icon: '👋', label: 'People' },
  { id: 'animals', icon: '🐵', label: 'Animals' },
  { id: 'food', icon: '🍔', label: 'Food' },
  { id: 'symbols', icon: '💡', label: 'Symbols' },
];

const EMOJI_DATA: EmojiEntry[] = [
  { char: '😀', name: 'Grinning Face', keywords: 'happy smile face', category: 'smileys' },
  { char: '😄', name: 'Smiling Eyes', keywords: 'joy laugh glad', category: 'smileys' },
  { char: '🥹', name: 'Holding Back Tears', keywords: 'touched emotional', category: 'smileys' },
  { char: '😎', name: 'Sunglasses', keywords: 'cool chill sun', category: 'smileys' },
  { char: '🤔', name: 'Thinking Face', keywords: 'wonder idea question', category: 'smileys' },
  { char: '🥳', name: 'Partying Face', keywords: 'celebrate birthday party', category: 'smileys' },
  { char: '👋', name: 'Waving Hand', keywords: 'hello hi bye wave', category: 'people' },
  { char: '👍', name: 'Thumbs Up', keywords: 'approve ok good like', category: 'people' },
  { char: '🙌', name: 'Raising Hands', keywords: 'hooray cheer praise', category: 'people' },
  { char: '👏', name: 'Clapping Hands', keywords: 'applause bravo', category: 'people' },
  { char: '🙏', name: 'Folded Hands', keywords: 'thanks please gratitude', category: 'people' },
  { char: '💪', name: 'Flexed Biceps', keywords: 'strong work power', category: 'people' },
  { char: '🐵', name: 'Monkey Face', keywords: 'monkey ape mascot', category: 'animals' },
  { char: '🦊', name: 'Fox', keywords: 'fox animal cute', category: 'animals' },
  { char: '🐱', name: 'Cat Face', keywords: 'cat kitty pet', category: 'animals' },
  { char: '🐶', name: 'Dog Face', keywords: 'dog puppy pet', category: 'animals' },
  { char: '🦉', name: 'Owl', keywords: 'bird night wise', category: 'animals' },
  { char: '🐝', name: 'Honeybee', keywords: 'bee insect buzz', category: 'animals' },
  { char: '🍔', name: 'Hamburger', keywords: 'burger lunch food', category: 'food' },
  { char: '🍕', name: 'Pizza', keywords: 'slice cheese dinner', category: 'food' },
  { char: '🍜', name: 'Steaming Bowl', keywords: 'noodles ramen soup', category: 'food' },
  { char: '☕', name: 'Hot Beverage', keywords: 'coffee tea espresso', category: 'food' },
  { char: '🥐', name: 'Croissant', keywords: 'bakery breakfast bread', category: 'food' },
  { char: '🍓', name: 'Strawberry', keywords: 'fruit berry sweet', category: 'food' },
  { char: '💡', name: 'Light Bulb', keywords: 'idea bright smart', category: 'symbols' },
  { char: '🚀', name: 'Rocket', keywords: 'launch ship fast release', category: 'symbols' },
  { char: '✨', name: 'Sparkles', keywords: 'clean shine magic', category: 'symbols' },
  { char: '📌', name: 'Pushpin', keywords: 'pin save note', category: 'symbols' },
  { char: '🔍', name: 'Magnifying Glass', keywords: 'search find ocr', category: 'symbols' },
  { char: '✅', name: 'Check Mark', keywords: 'done pass verified', category: 'symbols' },
];

const LANGUAGES = [
  { code: 'auto', label: 'Auto Detect' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'ja', label: 'Japanese' },
  { code: 'th', label: 'Thai' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ko', label: 'Korean' },
] as const;

const SAMPLE_TRANSLATIONS: Record<string, string> = {
  es: 'Selecciona cualquier texto en pantalla o escribe para traducir.',
  ja: '画面上のテキストを選択するか、入力してすぐ翻訳できます。',
  th: 'Lueak khokhwam bon na jo rue phim phuea plae dai thanthi.',
  fr: 'Sélectionnez du texte à l’écran ou saisissez pour traduire.',
  de: 'Markieren Sie beliebigen Text oder tippen Sie zum Übersetzen.',
  ko: '화면의 텍스트를 선택하거나 입력해 바로 번역하세요.',
  en: 'Select any text on screen or type to translate.',
};

export function MonkeyToolsPreview({ mode = 'full' }: MonkeyToolsPreviewProps) {
  const isCompact = mode === 'compact';
  const [activeTab, setActiveTab] = useState<ModuleTab>('clipboard');
  const tabRefs = useRef<Partial<Record<ModuleTab, HTMLButtonElement | null>>>({});

  // Clipboard state
  const [clipItems, setClipItems] = useState<ClipboardItem[]>(INITIAL_CLIPBOARD_ITEMS);
  const [clipFilter, setClipFilter] = useState<ClipboardFilter>('all');
  const [clipQuery, setClipQuery] = useState('');
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const ocrTimerRef = useRef<number | null>(null);

  // Emoji state
  const [emojiCategory, setEmojiCategory] = useState<EmojiCategory>('smileys');
  const [emojiQuery, setEmojiQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(['🚀', '📌', '💡', '✨']);
  const [lastInserted, setLastInserted] = useState<string | null>(null);

  // Translator state
  const [sourceLang, setSourceLang] = useState<string>('en');
  const [targetLang, setTargetLang] = useState<string>('es');
  const [engine, setEngine] = useState<'Apple Native' | 'Google'>('Apple Native');
  const [transInput, setTransInput] = useState('Select any text on screen or type to translate.');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [replacedNotice, setReplacedNotice] = useState(false);
  const speakTimerRef = useRef<number | null>(null);
  const replaceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (ocrTimerRef.current !== null) window.clearTimeout(ocrTimerRef.current);
      if (speakTimerRef.current !== null) window.clearTimeout(speakTimerRef.current);
      if (replaceTimerRef.current !== null) window.clearTimeout(replaceTimerRef.current);
    };
  }, []);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % MODULE_TABS.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + MODULE_TABS.length) % MODULE_TABS.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = MODULE_TABS.length - 1;
    if (nextIdx === null) return;
    e.preventDefault();
    const nextTab = MODULE_TABS[nextIdx].id;
    setActiveTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  const filteredClips = useMemo(() => {
    const q = clipQuery.trim().toLowerCase();
    return [...clipItems]
      .sort((a, b) => Number(b.pinned) - Number(a.pinned))
      .filter((item) => {
        if (clipFilter === 'text' && item.kind !== 'text') return false;
        if (clipFilter === 'image' && item.kind !== 'image') return false;
        if (clipFilter === 'pinned' && !item.pinned) return false;
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q) ||
          (item.ocrText?.toLowerCase().includes(q) ?? false)
        );
      });
  }, [clipItems, clipFilter, clipQuery]);

  const visibleClips = isCompact ? filteredClips.slice(0, 3) : filteredClips;

  const togglePin = (id: string) => {
    setClipItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item))
    );
  };

  const runOcr = () => {
    if (ocrStatus === 'done') {
      setOcrStatus('idle');
      return;
    }
    if (ocrTimerRef.current !== null) window.clearTimeout(ocrTimerRef.current);
    setOcrStatus('running');
    ocrTimerRef.current = window.setTimeout(() => {
      setOcrStatus('done');
      ocrTimerRef.current = null;
    }, 350);
  };

  const visibleEmojis = useMemo(() => {
    const q = emojiQuery.trim().toLowerCase();
    if (q) {
      return EMOJI_DATA.filter(
        (e) => e.name.toLowerCase().includes(q) || e.keywords.toLowerCase().includes(q)
      );
    }
    if (emojiCategory === 'recent') {
      return recentEmojis
        .map((ch) => EMOJI_DATA.find((item) => item.char === ch))
        .filter((item): item is EmojiEntry => Boolean(item));
    }
    return EMOJI_DATA.filter((e) => e.category === emojiCategory);
  }, [emojiCategory, emojiQuery, recentEmojis]);

  const handleEmojiInsert = (entry: EmojiEntry) => {
    setLastInserted(`Inserted ${entry.char} (${entry.name}) into active app`);
    setRecentEmojis((prev) => [entry.char, ...prev.filter((c) => c !== entry.char)].slice(0, 14));
  };

  const handleSwapLanguages = () => {
    if (sourceLang === 'auto') {
      setSourceLang(targetLang);
      setTargetLang(targetLang === 'en' ? 'th' : 'en');
      return;
    }
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const translatedOutput = useMemo(() => {
    const trimmed = transInput.trim();
    if (!trimmed) return 'Type text above to preview translation.';
    if (trimmed === 'Select any text on screen or type to translate.') {
      return SAMPLE_TRANSLATIONS[targetLang] ?? SAMPLE_TRANSLATIONS.es;
    }
    const label = LANGUAGES.find((l) => l.code === targetLang)?.label ?? targetLang;
    return `[${label}] ${trimmed}`;
  }, [transInput, targetLang]);

  const triggerSpeak = () => {
    if (speakTimerRef.current !== null) window.clearTimeout(speakTimerRef.current);
    setIsSpeaking(true);
    speakTimerRef.current = window.setTimeout(() => {
      setIsSpeaking(false);
      speakTimerRef.current = null;
    }, 1800);
  };

  const triggerReplace = () => {
    if (replaceTimerRef.current !== null) window.clearTimeout(replaceTimerRef.current);
    setReplacedNotice(true);
    replaceTimerRef.current = window.setTimeout(() => {
      setReplacedNotice(false);
      replaceTimerRef.current = null;
    }, 1800);
  };


  return (
    <div
      className={`${styles.pvWindow} ${isCompact ? styles.pvCompact : styles.pvFull} ${styles.mtSurface}`}
    >
      <div className={styles.pvBar}>
        <div className={styles.pvDots} aria-hidden="true">
          <span className={`${styles.pvDot} ${styles.pvDotClose}`} />
          <span className={`${styles.pvDot} ${styles.pvDotMin}`} />
          <span className={`${styles.pvDot} ${styles.pvDotMax}`} />
        </div>
        <span className={styles.pvBarTitle}>Monkey Tools</span>
        <span className={styles.statusBadge}>Menu Bar</span>
      </div>

      <div className={styles.pvBody}>
        <div className={styles.mtTabs} role="tablist" aria-label="Monkey Tools features">
          {MODULE_TABS.map((tab, idx) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                id={`mt-tab-${mode}-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`mt-panel-${mode}-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                className={`${styles.mtTab} ${selected ? styles.mtTabActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          id={`mt-panel-${mode}-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`mt-tab-${mode}-${activeTab}`}
          tabIndex={0}
          className={styles.mtPanel}
        >
          {activeTab === 'clipboard' && (
            <>
              <div className={styles.mtSearchWrap}>
                <input
                  type="search"
                  className={styles.pvInput}
                  aria-label="Search clipboard history"
                  placeholder="Search clipboard history..."
                  value={clipQuery}
                  onChange={(e) => setClipQuery(e.target.value)}
                />
                {clipQuery && (
                  <button
                    type="button"
                    className={styles.mtClearBtn}
                    onClick={() => setClipQuery('')}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className={styles.pillRow}>
                {(['all', 'text', 'image', 'pinned'] as const).map((filterKey) => {
                  const label =
                    filterKey === 'all'
                      ? 'All'
                      : filterKey === 'text'
                        ? 'Text'
                        : filterKey === 'image'
                          ? 'Images'
                          : 'Pinned';
                  const active = clipFilter === filterKey;
                  return (
                    <button
                      key={filterKey}
                      type="button"
                      aria-pressed={active}
                      className={`${styles.pillBtn} ${active ? styles.pillBtnActive : ''}`}
                      onClick={() => setClipFilter(filterKey)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className={styles.mtList}>
                {visibleClips.length === 0 ? (
                  <div className={styles.mtClipRow}>
                    <span className={styles.mtClipMeta}>No matching items</span>
                  </div>
                ) : (
                  visibleClips.map((item) => (
                    <div key={item.id} className={styles.mtClipRow}>
                      <div className={styles.mtClipMain}>
                        <div className={styles.mtClipTitle}>
                          {item.swatch && (
                            <span
                              className={styles.mtSwatch}
                              style={{ backgroundColor: item.swatch, marginRight: 6 }}
                              aria-hidden="true"
                            />
                          )}
                          {item.title}
                        </div>
                        <div className={styles.mtClipMeta}>
                          <span>{item.source}</span>
                          <span>·</span>
                          <span>{item.relativeTime}</span>
                          {!isCompact && item.dimensions && <span>· {item.dimensions}</span>}
                        </div>
                        {item.kind === 'image' && ocrStatus === 'done' && item.ocrText && (
                          <div className={styles.mtOcrBox}>
                            <strong>Vision OCR · Copied text</strong>
                            <span>{item.ocrText}</span>
                          </div>
                        )}
                      </div>
                      <div className={styles.mtClipActions}>
                        {item.kind === 'image' && (
                          <button
                            type="button"
                            className={`${styles.mtIconBtn} ${ocrStatus === 'done' ? styles.mtIconBtnActive : ''}`}
                            onClick={runOcr}
                          >
                            {ocrStatus === 'running'
                              ? 'Extracting text...'
                              : ocrStatus === 'done'
                                ? 'Hide OCR'
                                : 'Extract Text (OCR)'}
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={item.pinned ? 'Unpin item' : 'Pin item'}
                          aria-pressed={item.pinned}
                          className={`${styles.mtIconBtn} ${item.pinned ? styles.mtIconBtnActive : ''}`}
                          onClick={() => togglePin(item.id)}
                        >
                          {item.pinned ? 'Pinned' : 'Pin'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === 'emoji' && (
            <>
              <div className={styles.mtSearchWrap}>
                <input
                  type="search"
                  className={styles.pvInput}
                  aria-label="Search emojis"
                  placeholder="Search emojis..."
                  value={emojiQuery}
                  onChange={(e) => setEmojiQuery(e.target.value)}
                />
                {emojiQuery && (
                  <button
                    type="button"
                    className={styles.mtClearBtn}
                    onClick={() => setEmojiQuery('')}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className={styles.pillRow}>
                {EMOJI_CATEGORIES.map((cat) => {
                  const active = !emojiQuery && emojiCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      title={cat.label}
                      aria-label={cat.label}
                      aria-pressed={active}
                      className={`${styles.pillBtn} ${active ? styles.pillBtnActive : ''}`}
                      onClick={() => {
                        setEmojiQuery('');
                        setEmojiCategory(cat.id);
                      }}
                    >
                      <span aria-hidden="true">{cat.icon}</span>
                      {!isCompact && <span>{cat.label}</span>}
                    </button>
                  );
                })}
              </div>

              <div className={styles.mtEmojiGrid}>
                {visibleEmojis.length === 0 ? (
                  <span className={styles.mtClipMeta}>No matching emojis</span>
                ) : (
                  visibleEmojis.map((entry) => (
                    <button
                      key={entry.char}
                      type="button"
                      className={styles.mtEmojiCell}
                      title={entry.name}
                      aria-label={`Insert ${entry.name}`}
                      onClick={() => handleEmojiInsert(entry)}
                    >
                      {entry.char}
                    </button>
                  ))
                )}
              </div>

              <div className={styles.mtClipMeta} role="status" aria-live="polite">
                {lastInserted ?? 'Click any emoji to insert and keep typing.'}
              </div>
            </>
          )}

          {activeTab === 'translator' && (
            <>
              <div className={styles.mtLangRow}>
                <select
                  className={styles.pvSelect}
                  aria-label="Source language"
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className={styles.mtSwapBtn}
                  aria-label="Swap languages"
                  onClick={handleSwapLanguages}
                >
                  ⇄
                </button>

                <select
                  className={styles.pvSelect}
                  aria-label="Target language"
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                >
                  {LANGUAGES.filter((l) => l.code !== 'auto').map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {!isCompact && (
                <div className={styles.pillRow}>
                  {(['Apple Native', 'Google'] as const).map((eng) => (
                    <button
                      key={eng}
                      type="button"
                      aria-pressed={engine === eng}
                      className={`${styles.pillBtn} ${engine === eng ? styles.pillBtnActive : ''}`}
                      onClick={() => setEngine(eng)}
                    >
                      {eng}
                    </button>
                  ))}
                </div>
              )}

              <textarea
                className={styles.pvTextarea}
                aria-label="Text to translate"
                value={transInput}
                onChange={(e) => setTransInput(e.target.value)}
                rows={isCompact ? 2 : 3}
              />

              <div className={styles.mtTransOut} aria-live="polite">
                {translatedOutput}
              </div>

              <div className={styles.pillRow}>
                <button
                  type="button"
                  className={`${styles.pillBtn} ${isSpeaking ? styles.pillBtnActive : ''}`}
                  onClick={triggerSpeak}
                >
                  {isSpeaking ? 'Reading...' : 'Speak'}
                </button>
                <button
                  type="button"
                  className={`${styles.pillBtn} ${replacedNotice ? styles.pillBtnActive : ''}`}
                  onClick={triggerReplace}
                >
                  {replacedNotice ? 'Replaced in active field' : 'Replace In-Place'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MonkeyToolsPreview;
