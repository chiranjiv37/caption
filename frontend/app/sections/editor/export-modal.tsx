'use client';

import { useMemo, type ReactNode } from 'react';
import { Check, Download, FileText, Subtitles, Video, X } from 'lucide-react';
import { useAppState } from '@/app/hooks/use-app-state';
import { CATALOG } from '@/app/data/initial-data';
import {
  buildSRT,
  buildTXT,
  buildVTT,
  cn,
  downloadBlob,
} from '@/lib/utils';

export function ExportModal() {
  const { state, dispatch } = useAppState();
  const {
    exportOpen,
    exportTab,
    exportSel,
    exporting,
    exportProgress,
    segments,
    speakers,
    lang,
    activeProject,
    capSize,
    capPos,
    capColor,
    capBox,
  } = state;

  const activeLangName =
    CATALOG.find(l => l.id === lang)?.name || lang?.toUpperCase() || 'Language';
  const baseName = (activeProject?.name || 'captions').replace(/\s+/g, '_');

  const setSetting = (key: string, value: unknown) =>
    dispatch({ type: 'SET_CAPTION_SETTING', payload: { key, value } });

  const exportText = useMemo(() => {
    if (exportTab === 'srt') return buildSRT(segments, lang);
    if (exportTab === 'vtt') return buildVTT(segments, lang);
    if (exportTab === 'txt') return buildTXT(segments, speakers, lang);
    return '';
  }, [exportTab, segments, speakers, lang]);

  const exportFileName =
    exportTab === 'srt'
      ? `${baseName}.${lang}.srt`
      : exportTab === 'vtt'
        ? `${baseName}.${lang}.vtt`
        : exportTab === 'txt'
          ? `${baseName}.${lang}.txt`
          : `${baseName}.${lang}.mp4`;

  const exportFormatDesc =
    exportTab === 'srt'
      ? 'SubRip subtitles'
      : exportTab === 'vtt'
        ? 'WebVTT captions'
        : exportTab === 'txt'
          ? 'Plain transcript'
          : 'Burned-in video';

  const selectedCount = Object.values(exportSel).filter(Boolean).length;

  const capFontPx = capSize === 'sm' ? 11 : capSize === 'lg' ? 16 : 13;
  const capColorVal =
    capColor === 'yellow' ? '#ffe14d' : capColor === 'accent' ? 'var(--accent)' : '#fff';
  const capPreviewText =
    segments.find(s => s.text)?.text?.slice(0, 48) || 'Sample caption preview';

  if (!exportOpen) return null;

  const tabBtn = (
    id: string,
    selKey: keyof typeof exportSel,
    label: string,
    sub: string,
    icon: ReactNode,
  ) => {
    const active = exportTab === id;
    const selected = exportSel[selKey];
    return (
      <button
        type="button"
        onClick={() => dispatch({ type: 'SET_EXPORT_TAB', payload: id })}
        className={cn(
          'relative flex-1 flex flex-col items-start gap-0.5 p-2.5 rounded-[10px] border cursor-pointer text-left transition-colors',
          active ? 'border-accent bg-accent/8' : 'border-border bg-background hover:bg-secondary',
        )}
      >
        <span
          role="checkbox"
          aria-checked={selected}
          onClick={e => {
            e.stopPropagation();
            dispatch({ type: 'TOGGLE_EXPORT_SEL', payload: selKey });
          }}
          className={cn(
            'absolute top-2 right-2 w-[16px] h-[16px] rounded-[4px] border flex items-center justify-center',
            selected ? 'bg-accent border-accent text-accent-foreground' : 'border-border bg-card',
          )}
        >
          {selected && <Check className="w-2.5 h-2.5" strokeWidth={3.5} />}
        </span>
        <span
          className={cn(
            'inline-flex items-center justify-center w-7 h-7 rounded-lg mb-1',
            active ? 'bg-accent/15 text-accent' : 'bg-secondary text-muted-foreground',
          )}
        >
          {icon}
        </span>
        <span className={cn('text-[12.5px] font-semibold', active ? 'text-accent' : 'text-foreground')}>
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground">{sub}</span>
      </button>
    );
  };

  const downloadSelected = async () => {
    if (selectedCount === 0) {
      dispatch({ type: 'SET_TOAST', payload: 'Select at least one format' });
      return;
    }

    if (exportSel.srt) {
      downloadBlob(new Blob([buildSRT(segments, lang)], { type: 'text/plain' }), `${baseName}.${lang}.srt`);
    }
    if (exportSel.vtt) {
      downloadBlob(new Blob([buildVTT(segments, lang)], { type: 'text/vtt' }), `${baseName}.${lang}.vtt`);
    }
    if (exportSel.txt) {
      downloadBlob(
        new Blob([buildTXT(segments, speakers, lang)], { type: 'text/plain' }),
        `${baseName}.${lang}.txt`,
      );
    }

    if (exportSel.video) {
      dispatch({ type: 'SET_EXPORTING', payload: true });
      dispatch({ type: 'SET_EXPORT_PROGRESS', payload: 0 });
      for (let p = 8; p <= 100; p += 12) {
        await new Promise(r => setTimeout(r, 80));
        dispatch({ type: 'SET_EXPORT_PROGRESS', payload: Math.min(p, 100) });
      }
      dispatch({ type: 'SET_EXPORTING', payload: false });
      dispatch({ type: 'SET_EXPORT_PROGRESS', payload: 0 });
      dispatch({
        type: 'SET_TOAST',
        payload: 'Video burn-in export is not available yet — text formats downloaded',
      });
      return;
    }

    dispatch({ type: 'SET_TOAST', payload: 'Download started' });
  };

  const segBtn = (
    active: boolean,
    label: string,
    onClick: () => void,
  ) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 h-8 rounded-[7px] text-xs font-semibold cursor-pointer border-none',
        active ? 'bg-card text-foreground shadow-sm' : 'bg-transparent text-muted-foreground',
      )}
    >
      {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/45 backdrop-blur-[3px]"
      onClick={() => dispatch({ type: 'SET_EXPORT_OPEN', payload: false })}
    >
      <div
        className="w-full max-w-[640px] bg-card rounded-2xl border border-border shadow-[var(--shadow-lg)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5">
          <h2 className="m-0 text-[19px] font-bold tracking-tight">Output & export</h2>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_EXPORT_OPEN', payload: false })}
            className="flex w-[30px] h-[30px] items-center justify-center border-none bg-transparent rounded-lg text-muted-foreground cursor-pointer hover:bg-secondary"
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className="px-6 pt-4 flex gap-2">
          {tabBtn('burn', 'video', 'Video', 'Burned-in', <Video className="w-4 h-4" />)}
          {tabBtn('srt', 'srt', 'SRT', 'Subtitles', <Subtitles className="w-4 h-4" />)}
          {tabBtn('vtt', 'vtt', 'VTT', 'WebVTT', <FileText className="w-4 h-4" />)}
          {tabBtn('txt', 'txt', 'Transcript', 'Plain text', <FileText className="w-4 h-4" />)}
        </div>

        {exportTab === 'burn' ? (
          <div className="px-6 py-[18px]">
            <div className="grid grid-cols-[1fr_220px] gap-5 items-start">
              <div className="flex flex-col gap-3.5">
                <div>
                  <div className="text-xs font-semibold mb-2">Text size</div>
                  <div className="flex gap-0.5 p-[3px] bg-secondary rounded-[9px]">
                    {segBtn(capSize === 'sm', 'Small', () => setSetting('capSize', 'sm'))}
                    {segBtn(capSize === 'md', 'Medium', () => setSetting('capSize', 'md'))}
                    {segBtn(capSize === 'lg', 'Large', () => setSetting('capSize', 'lg'))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold mb-2">Position</div>
                  <div className="flex gap-0.5 p-[3px] bg-secondary rounded-[9px]">
                    {segBtn(capPos === 'bottom', 'Bottom', () => setSetting('capPos', 'bottom'))}
                    {segBtn(capPos === 'top', 'Top', () => setSetting('capPos', 'top'))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold mb-2">Text color</div>
                  <div className="flex gap-2">
                    {(
                      [
                        ['white', '#fff'],
                        ['yellow', '#ffe14d'],
                        ['accent', 'var(--accent)'],
                      ] as const
                    ).map(([id, bg]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSetting('capColor', id)}
                        className="w-[34px] h-[34px] rounded-lg cursor-pointer"
                        style={{
                          background: bg,
                          border: `2px solid ${capColor === id ? 'var(--accent)' : 'var(--border)'}`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-medium">Caption background box</div>
                  <button
                    type="button"
                    role="switch"
                    onClick={() => setSetting('capBox', !capBox)}
                    className={cn(
                      'relative w-11 h-6 rounded-full border-none cursor-pointer',
                      capBox ? 'bg-accent' : 'bg-muted-foreground/30',
                    )}
                  >
                    <span
                      className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow"
                      style={{ left: capBox ? '22px' : '3px' }}
                    />
                  </button>
                </div>
                <div className="text-xs font-semibold">
                  Language: <span className="text-accent">{activeLangName}</span>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-2">
                  Preview
                </div>
                <div className="relative w-full aspect-video rounded-[10px] overflow-hidden bg-gradient-to-br from-[#1f2433] to-[#0c0e16]">
                  <div
                    className={cn(
                      'absolute left-0 right-0 flex justify-center px-[8%]',
                      capPos === 'top' ? 'top-[12%]' : 'bottom-[14%]',
                    )}
                  >
                    <span
                      className="text-center font-semibold leading-[1.3] rounded-[5px]"
                      style={{
                        fontSize: capFontPx,
                        color: capColorVal,
                        background: capBox ? 'rgba(0,0,0,0.62)' : 'transparent',
                        padding: capBox ? '4px 8px' : '0',
                      }}
                    >
                      {capPreviewText}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 py-[18px]">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[13px] text-muted-foreground">
                {exportFormatDesc} · <b className="text-foreground">{activeLangName}</b> ·{' '}
                {segments.length} segments
              </div>
              <span className="mono text-xs text-muted-foreground">{exportFileName}</span>
            </div>
            <div className="scrolly h-[236px] overflow-auto border border-border rounded-[10px] bg-background px-4 py-3.5">
              <pre className="mono m-0 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                {exportText || 'No captions to export.'}
              </pre>
            </div>
          </div>
        )}

        <div className="px-6 py-[13px] border-t border-border flex items-center justify-between gap-4">
          {exporting ? (
            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Rendering video…</span>
              <div className="flex-1 h-[7px] rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-100"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <span className="mono text-xs text-muted-foreground min-w-[42px] text-right">
                {exportProgress}%
              </span>
            </div>
          ) : (
            <div className="text-[12.5px] text-muted-foreground">
              {selectedCount === 0
                ? 'Select formats to download'
                : `${selectedCount} format${selectedCount === 1 ? '' : 's'} selected`}
            </div>
          )}
          <button
            type="button"
            disabled={exporting}
            onClick={() => void downloadSelected()}
            className="inline-flex items-center gap-2 h-10 px-4 border-none rounded-[10px] bg-accent text-accent-foreground text-sm font-semibold cursor-pointer disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
