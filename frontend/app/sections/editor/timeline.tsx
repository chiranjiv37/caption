'use client';

import { useCallback, useMemo, useRef } from 'react';
import { AudioLines, Plus } from 'lucide-react';
import { useAppState } from '@/app/hooks/use-app-state';
import { HUES, LANE_H, PXPS, RULER } from '@/app/data/initial-data';
import { projectSpeakersApi, segmentsApi } from '@/app/lib/api';
import { mapApiSpeaker } from '@/app/lib/mappers';
import { buildWaves, clamp, colFor, fmtTime, tileFor } from '@/lib/utils';
import { segEnd, segStart } from './helpers';

interface TimelineProps {
  duration: number;
  onSeek: (time: number) => void;
}

type DragMode = 'move' | 'l' | 'r' | 'playhead';

interface DragState {
  mode: DragMode;
  id: string | null;
  startX: number;
  origStart: number;
  origEnd: number;
  lastStart?: number;
  lastEnd?: number;
}

export function Timeline({ duration, onSeek }: TimelineProps) {
  const { state, dispatch } = useAppState();
  const { segments, speakers, currentTime, selectedId, activeProject } = state;
  const projectId = activeProject?.id;
  const dragRef = useRef<DragState | null>(null);

  const safeDur = duration > 0 ? duration : Math.max(...segments.map(s => segEnd(s)), 1);
  const totalWidth = Math.max(safeDur * PXPS, 400);
  const tracksHeight = RULER + Math.max(speakers.length, 1) * LANE_H;

  const speakerRows = useMemo(() => {
    const list = speakers.length > 0 ? speakers : [{ id: '_', name: 'Speaker', hue: HUES[0] }];
    const waveSegs = segments.map(s => ({
      speaker: s.speaker_id || '_',
      start: segStart(s),
      end: segEnd(s),
    }));
    const waves = buildWaves(waveSegs, list, safeDur, PXPS);

    return list.map((r, i) => ({
      ...r,
      top: RULER + i * LANE_H,
      count: segments.filter(s => (s.speaker_id || '_') === r.id).length,
      tileBg: tileFor(r.hue),
      color: colFor(r.hue),
      initial: (r.name?.[0] || 'S').toUpperCase(),
      laneBg:
        i % 2 === 0
          ? 'transparent'
          : 'color-mix(in oklch, var(--secondary) 55%, transparent)',
      bars: waves[r.id] || [],
    }));
  }, [speakers, segments, safeDur]);

  const blocks = useMemo(
    () =>
      segments.map(s => {
        const sp = speakers.find(x => x.id === s.speaker_id) || speakers[0];
        const laneIdx = Math.max(
          0,
          speakers.findIndex(x => x.id === (s.speaker_id || speakers[0]?.id)),
        );
        const start = segStart(s);
        const end = segEnd(s);
        const selected = s.id === selectedId;
        const bg = sp ? colFor(sp.hue) : 'var(--accent)';
        return {
          id: s.id,
          left: start * PXPS,
          width: Math.max((end - start) * PXPS, 12),
          top: RULER + laneIdx * LANE_H + 6,
          label: s.text?.slice(0, 40) || '',
          bg,
          ring: selected ? '0 0 0 2px var(--accent)' : 'none',
        };
      }),
    [segments, speakers, selectedId],
  );

  const rulerTicks = useMemo(() => {
    const ticks: Array<{ left: number; label: string }> = [];
    for (let t = 0; t <= safeDur + 0.01; t += 2) {
      ticks.push({ left: t * PXPS, label: fmtTime(t) });
    }
    return ticks;
  }, [safeDur]);

  const persistTiming = useCallback(
    async (id: string, start: number, end: number) => {
      if (!projectId) return;
      try {
        await segmentsApi.update(projectId, id, {
          start_time: start,
          end_time: end,
        });
      } catch (err) {
        dispatch({
          type: 'SET_TOAST',
          payload: err instanceof Error ? err.message : 'Failed to update timing',
        });
      }
    },
    [projectId, dispatch],
  );

  const onPointerMoveTracked = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dt = dx / PXPS;

      if (drag.mode === 'playhead') {
        onSeek(clamp(drag.origStart + dt, 0, safeDur));
        return;
      }

      if (!drag.id) return;
      let nextStart = drag.origStart;
      let nextEnd = drag.origEnd;

      if (drag.mode === 'move') {
        const len = drag.origEnd - drag.origStart;
        nextStart = clamp(drag.origStart + dt, 0, safeDur - len);
        nextEnd = nextStart + len;
      } else if (drag.mode === 'l') {
        nextStart = clamp(drag.origStart + dt, 0, drag.origEnd - 0.2);
      } else if (drag.mode === 'r') {
        nextEnd = clamp(drag.origEnd + dt, drag.origStart + 0.2, safeDur);
      }

      drag.lastStart = nextStart;
      drag.lastEnd = nextEnd;

      dispatch({
        type: 'UPDATE_SEGMENT',
        payload: {
          id: drag.id,
          updates: {
            start_time: nextStart,
            end_time: nextEnd,
            start: nextStart,
            end: nextEnd,
          },
        },
      });
    },
    [dispatch, onSeek, safeDur],
  );

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    window.removeEventListener('pointermove', onPointerMoveTracked);
    window.removeEventListener('pointerup', endDrag);
    if (drag?.id && drag.mode !== 'playhead') {
      void persistTiming(
        drag.id,
        drag.lastStart ?? drag.origStart,
        drag.lastEnd ?? drag.origEnd,
      );
    }
    dragRef.current = null;
  }, [onPointerMoveTracked, persistTiming]);

  const beginDrag = (
    mode: DragMode,
    id: string | null,
    e: React.PointerEvent,
    origStart: number,
    origEnd: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { mode, id, startX: e.clientX, origStart, origEnd };
    if (id) dispatch({ type: 'SET_SELECTED_ID', payload: id });
    window.addEventListener('pointermove', onPointerMoveTracked);
    window.addEventListener('pointerup', endDrag);
  };

  const handleTrackSeek = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = e.currentTarget;
    const x = e.clientX - track.getBoundingClientRect().left;
    onSeek(clamp(x / PXPS, 0, safeDur));
  };

  const handleAddSpeaker = async () => {
    if (!projectId) return;
    try {
      const hue = HUES[speakers.length % HUES.length];
      const created = await projectSpeakersApi.create(projectId, {
        name: `Speaker ${speakers.length + 1}`,
        hue,
      });
      dispatch({ type: 'ADD_SPEAKER', payload: mapApiSpeaker(created) });
    } catch (err) {
      dispatch({
        type: 'SET_TOAST',
        payload: err instanceof Error ? err.message : 'Failed to add speaker',
      });
    }
  };

  return (
    <div className="flex-shrink-0 border border-border bg-card rounded-[14px] shadow-[var(--shadow-sm)] overflow-hidden">
      <div className="flex items-center justify-between px-[15px] py-[11px] border-b border-border">
        <div className="flex items-center gap-[9px]">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <AudioLines className="w-4 h-4 text-accent" />
            Timeline
          </span>
          <span className="text-xs text-muted-foreground">
            Drag a caption block to move it · drag the edges to retime
          </span>
        </div>
        <div className="flex items-center gap-[13px] flex-wrap">
          {speakerRows.map(r => (
            <span
              key={r.id}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
            >
              <span className="w-[9px] h-[9px] rounded-[3px]" style={{ background: r.color }} />
              {r.name}
            </span>
          ))}
        </div>
      </div>

      <div className="scrolly flex max-h-[224px] overflow-auto">
        <div
          className="flex-none w-[132px] border-r border-border bg-background sticky left-0 z-[6]"
          style={{ height: tracksHeight }}
        >
          <button
            type="button"
            title="Add a speaker track"
            onClick={() => void handleAddSpeaker()}
            className="absolute left-0 right-0 top-0 h-7 flex items-center gap-[5px] px-3 border-none bg-secondary text-accent text-[11px] font-semibold cursor-pointer z-[2] hover:bg-accent/10"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <Plus className="w-[13px] h-[13px]" strokeWidth={2.4} />
            Speaker
          </button>
          {speakerRows.map(r => (
            <div
              key={r.id}
              className="absolute left-0 right-0 flex items-center pl-[13px] gap-[9px]"
              style={{ top: r.top, height: LANE_H }}
            >
              <span
                className="flex items-center justify-center w-6 h-6 rounded-[7px] flex-none text-[11px] font-bold"
                style={{ background: r.tileBg, color: r.color }}
              >
                {r.initial}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                  {r.name}
                </div>
                <div className="text-[10px] text-muted-foreground">{r.count} segs</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-none">
          <div className="relative" style={{ width: totalWidth, height: tracksHeight }}>
            <div
              onPointerDown={handleTrackSeek}
              className="sticky top-0 w-full border-b border-border bg-secondary cursor-pointer z-[7]"
              style={{ height: RULER }}
            >
              {rulerTicks.map(tk => (
                <div
                  key={tk.left}
                  className="absolute top-0 h-full border-l border-border pl-[5px] flex items-center"
                  style={{ left: tk.left }}
                >
                  <span className="mono text-[10px] text-muted-foreground">{tk.label}</span>
                </div>
              ))}
            </div>

            {speakerRows.map(r => (
              <div
                key={r.id}
                className="absolute left-0 w-full flex items-center gap-0.5 px-px"
                style={{ top: r.top, height: LANE_H, background: r.laneBg }}
              >
                {r.bars.map((bar, i) => (
                  <div
                    key={i}
                    className="w-0.5 flex-none rounded-sm"
                    style={{ height: bar.h, background: bar.color }}
                  />
                ))}
              </div>
            ))}

            {blocks.map(b => {
              const seg = segments.find(s => s.id === b.id);
              if (!seg) return null;
              return (
                <div
                  key={b.id}
                  onPointerDown={e =>
                    beginDrag('move', b.id, e, segStart(seg), segEnd(seg))
                  }
                  className="absolute h-[46px] text-white rounded-[7px] cursor-grab overflow-hidden flex items-center px-2.5 select-none z-[5]"
                  style={{
                    left: b.left,
                    top: b.top,
                    width: b.width,
                    background: b.bg,
                    boxShadow: b.ring,
                  }}
                >
                  <span className="text-[11px] leading-tight font-medium overflow-hidden text-ellipsis whitespace-nowrap opacity-95">
                    {b.label}
                  </span>
                  <div
                    onPointerDown={e =>
                      beginDrag('l', b.id, e, segStart(seg), segEnd(seg))
                    }
                    className="absolute left-0 top-0 w-2 h-full cursor-ew-resize bg-white/22"
                  />
                  <div
                    onPointerDown={e =>
                      beginDrag('r', b.id, e, segStart(seg), segEnd(seg))
                    }
                    className="absolute right-0 top-0 w-2 h-full cursor-ew-resize bg-white/22"
                  />
                </div>
              );
            })}

            <div
              onPointerDown={e => beginDrag('playhead', null, e, currentTime, currentTime)}
              className="absolute top-0 left-0 h-full w-0.5 bg-accent z-[8] cursor-ew-resize"
              style={{ transform: `translateX(${currentTime * PXPS}px)` }}
            >
              <div className="absolute -top-0.5 -left-[7px] w-4 h-4 rounded-[5px] bg-accent shadow-[var(--shadow-sm)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
