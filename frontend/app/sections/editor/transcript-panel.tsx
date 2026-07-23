'use client';

import { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAppState } from '@/app/hooks/use-app-state';
import { segmentsApi } from '@/app/lib/api';
import { cn, colFor, fmtTime } from '@/lib/utils';
import { segEnd, segStart } from './helpers';

interface TranscriptPanelProps {
  onSeek: (time: number) => void;
}

export function TranscriptPanel({ onSeek }: TranscriptPanelProps) {
  const { state, dispatch } = useAppState();
  const {
    segments,
    speakers,
    currentTime,
    selectedId,
    editorLoading,
    editorError,
    activeProject,
    playing,
  } = state;
  const listRef = useRef<HTMLDivElement>(null);

  const activeId =
    selectedId ||
    segments.find(s => currentTime >= segStart(s) && currentTime < segEnd(s))?.id ||
    null;

  useEffect(() => {
    if (!playing || !activeId || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-id="${activeId}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeId, playing]);

  const persistText = async (id: string, text: string) => {
    if (!activeProject?.id) return;
    dispatch({ type: 'UPDATE_SEGMENT', payload: { id, updates: { text } } });
    try {
      await segmentsApi.update(activeProject.id, id, { text });
    } catch (err) {
      dispatch({
        type: 'SET_TOAST',
        payload: err instanceof Error ? err.message : 'Failed to save caption',
      });
    }
  };

  return (
    <div className="min-h-0 border border-border bg-card rounded-[14px] shadow-[var(--shadow-sm)] flex flex-col">
      <div className="px-[15px] py-[13px] border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="m-0 text-[15px] font-semibold tracking-tight">Transcript</h3>
          <span className="text-xs text-muted-foreground">
            {segments.length} segments · {speakers.length} speakers
          </span>
        </div>
      </div>

      <div ref={listRef} className="scrolly flex-1 overflow-y-auto p-2">
        {editorLoading && (
          <p className="text-sm text-muted-foreground p-2">Loading captions…</p>
        )}
        {!editorLoading && editorError && (
          <p className="text-sm text-destructive p-2">{editorError}</p>
        )}
        {!editorLoading && !editorError && segments.length === 0 && (
          <p className="text-sm text-muted-foreground p-2">
            No captions yet. Run transcription or wait for the job to finish.
          </p>
        )}
        {!editorLoading &&
          segments.map(s => {
            const sp = speakers.find(x => x.id === s.speaker_id);
            const active = s.id === activeId;
            const color = sp ? colFor(sp.hue) : 'var(--muted-foreground)';
            return (
              <div
                key={s.id}
                data-id={s.id}
                data-active={active ? 'true' : 'false'}
                onClick={() => {
                  onSeek(segStart(s));
                  dispatch({ type: 'SET_SELECTED_ID', payload: s.id });
                }}
                className={cn(
                  'flex gap-[11px] px-2.5 py-[9px] rounded-[10px] cursor-pointer border-l-2',
                  active ? 'bg-accent/[0.08]' : 'bg-transparent hover:bg-secondary/80',
                )}
                style={{ borderLeftColor: active ? color : 'transparent' }}
              >
                <div className="flex flex-col gap-[5px] items-start min-w-[52px] flex-none">
                  <span className="mono text-[11px] font-medium text-muted-foreground">
                    {fmtTime(segStart(s))}
                  </span>
                  <button
                    type="button"
                    title="Reassign speaker"
                    onClick={e => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      dispatch({
                        type: 'SET_SPEAKER_MENU',
                        payload: {
                          segId: s.id,
                          top: rect.bottom + 4,
                          left: rect.left,
                        },
                      });
                    }}
                    className="inline-flex items-center gap-[5px] text-[11px] font-semibold bg-transparent rounded-[7px] px-1.5 py-0.5 cursor-pointer"
                    style={{
                      color,
                      border: `1px solid color-mix(in oklch, ${color} 35%, transparent)`,
                    }}
                  >
                    <span
                      className="w-[7px] h-[7px] rounded-full"
                      style={{ background: color }}
                    />
                    {sp?.name || 'Speaker'}
                    <ChevronDown className="w-[11px] h-[11px] opacity-65" />
                  </button>
                </div>
                <div
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck={false}
                  onFocus={() => {
                    dispatch({ type: 'SET_PLAYING', payload: false });
                  }}
                  onBlur={e => {
                    const next = e.currentTarget.textContent ?? '';
                    if (next !== s.text) void persistText(s.id, next);
                  }}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 min-w-0 text-[13.5px] leading-[1.45] text-foreground outline-none rounded-md px-[5px] py-0.5 cursor-text"
                  ref={el => {
                    if (el && document.activeElement !== el && el.textContent !== s.text) {
                      el.textContent = s.text;
                    }
                  }}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}
