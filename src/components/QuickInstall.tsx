import { useEffect, useRef, useState } from 'react';
import type { AppCategory, AppQuickInstall, QuickInstallStep } from '../data/types';

export interface QuickInstallProps {
  appName: string;
  category: AppCategory;
  quickInstall: AppQuickInstall;
}

function renderStepText(step: QuickInstallStep) {
  const highlight = step.codeHighlight;
  if (!highlight) {
    return step.text;
  }
  const idx = step.text.indexOf(highlight);
  if (idx === -1) {
    return step.text;
  }
  const before = step.text.slice(0, idx);
  const after = step.text.slice(idx + highlight.length);
  return (
    <>
      {before}
      <code>{highlight}</code>
      {after}
    </>
  );
}

export default function QuickInstall({
  appName,
  category,
  quickInstall,
}: QuickInstallProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const markCopied = (idx: number) => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    setCopiedIdx(idx);
    timeoutRef.current = window.setTimeout(() => {
      setCopiedIdx(null);
      timeoutRef.current = null;
    }, 1500);
  };

  const handleCopy = (idx: number, cmd: string) => {
    const fallbackCopy = () => {
      const ta = document.createElement('textarea');
      ta.value = cmd;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.pointerEvents = 'none';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(ta);
      }
      markCopied(idx);
    };

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(cmd).then(() => markCopied(idx)).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
  };

  return (
    <div data-app-name={appName} data-app-category={category}>
      <h2>Quick Install</h2>
      <div className="steps">
        {quickInstall.steps.map((step, idx) => {
          const copyText = step.terminalCommand ?? step.copyValue;
          const isCopied = copiedIdx === idx;
          return (
            <div className="step" key={`${idx}-${step.text.slice(0, 24)}`}>
              <div className="step-num">{idx + 1}</div>
              <div className="step-body">
                <div>{renderStepText(step)}</div>
                {copyText && (
                  <div className="cmd-bar">
                    <code>{copyText}</code>
                    <button
                      type="button"
                      className="copy-btn"
                      data-copy-cmd={copyText}
                      data-copied={isCopied ? 'true' : undefined}
                      aria-label={`Copy ${copyText}`}
                      onClick={() => handleCopy(idx, copyText)}
                    >
                      {isCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
