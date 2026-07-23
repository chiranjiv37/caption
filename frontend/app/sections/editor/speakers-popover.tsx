'use client';

import { useState } from 'react';
import {
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useAppState } from '@/app/hooks/use-app-state';
import { HUES } from '@/app/data/initial-data';
import { projectSpeakersApi, segmentsApi } from '@/app/lib/api';
import { mapApiSpeaker } from '@/app/lib/mappers';
import { cn, colFor, tileFor } from '@/lib/utils';

export function SpeakersPopover() {
  const { state, dispatch } = useAppState();
  const {
    speakers,
    segments,
    activeProject,
    diarizing,
    editingSpeakerId,
    speakerNameDraft,
    chipMenuFor,
    dragSpeaker,
    dragOverSpeaker,
  } = state;
  const [busy, setBusy] = useState(false);
  const projectId = activeProject?.id;

  const segCount = (id: string) =>
    segments.filter(s => s.speaker_id === id).length;

  const persistSpeaker = async (
    speakerId: string,
    data: Partial<{ name: string; hue: number }>,
  ) => {
    if (!projectId) return;
    try {
      const updated = await projectSpeakersApi.update(projectId, speakerId, data);
      dispatch({
        type: 'UPDATE_SPEAKER',
        payload: { id: speakerId, updates: mapApiSpeaker(updated) },
      });
    } catch (err) {
      dispatch({
        type: 'SET_TOAST',
        payload: err instanceof Error ? err.message : 'Failed to update speaker',
      });
    }
  };

  const handleAdd = async () => {
    if (!projectId || busy) return;
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!projectId || speakers.length <= 1) return;
    const others = speakers.filter(s => s.id !== id);
    const target = others[0].id;
    const affected = segments.filter(s => s.speaker_id === id);
    try {
      await Promise.all(
        affected.map(s =>
          segmentsApi.update(projectId, s.id, { speaker_id: target }),
        ),
      );
      await projectSpeakersApi.delete(projectId, id);
      dispatch({ type: 'REMOVE_SPEAKER', payload: id });
      dispatch({ type: 'SET_CHIP_MENU', payload: null });
    } catch (err) {
      dispatch({
        type: 'SET_TOAST',
        payload: err instanceof Error ? err.message : 'Failed to remove speaker',
      });
    }
  };

  const handleMerge = async (srcId: string, dstId: string) => {
    if (!projectId || srcId === dstId) return;
    const affected = segments.filter(s => s.speaker_id === srcId);
    try {
      await Promise.all(
        affected.map(s =>
          segmentsApi.update(projectId, s.id, { speaker_id: dstId }),
        ),
      );
      await projectSpeakersApi.delete(projectId, srcId);
      dispatch({ type: 'MERGE_SPEAKERS', payload: { srcId, dstId } });
      dispatch({ type: 'SET_CHIP_MENU', payload: null });
      dispatch({ type: 'SET_TOAST', payload: 'Speakers merged' });
    } catch (err) {
      dispatch({
        type: 'SET_TOAST',
        payload: err instanceof Error ? err.message : 'Failed to merge speakers',
      });
    }
  };

  const commitName = async () => {
    if (!editingSpeakerId) return;
    const name = speakerNameDraft.trim() || 'Speaker';
    dispatch({ type: 'SET_EDITING_SPEAKER', payload: { id: null, draft: '' } });
    await persistSpeaker(editingSpeakerId, { name });
  };

  const handleReDiarize = () => {
    dispatch({ type: 'SET_DIARIZING', payload: true });
    setTimeout(() => {
      dispatch({ type: 'SET_DIARIZING', payload: false });
      dispatch({
        type: 'SET_TOAST',
        payload: 'Re-diarization is not available yet',
      });
    }, 900);
  };

  const onDropReorder = (targetId: string) => {
    if (!dragSpeaker || dragSpeaker === targetId) {
      dispatch({ type: 'SET_DRAG_SPEAKER', payload: null });
      dispatch({ type: 'SET_DRAG_OVER_SPEAKER', payload: null });
      return;
    }
    const from = speakers.findIndex(s => s.id === dragSpeaker);
    const to = speakers.findIndex(s => s.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...speakers];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    dispatch({ type: 'REORDER_SPEAKERS', payload: next });
    dispatch({ type: 'SET_DRAG_SPEAKER', payload: null });
    dispatch({ type: 'SET_DRAG_OVER_SPEAKER', payload: null });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[52]"
        onClick={() => dispatch({ type: 'CLOSE_MENUS' })}
      />
      <div className="absolute top-[calc(100%+6px)] right-[9px] z-[53] w-[340px] bg-card border border-border rounded-[13px] shadow-[var(--shadow-lg)] p-[9px] animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between px-1.5 pt-1 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold">Speakers</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-accent">
              <Sparkles className="w-[11px] h-[11px]" />
              Diarized
            </span>
          </div>
          <button
            type="button"
            title="Re-run diarization"
            onClick={handleReDiarize}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 border border-border rounded-lg bg-card text-muted-foreground text-xs font-medium cursor-pointer hover:bg-secondary"
          >
            <RefreshCw className={cn('w-[13px] h-[13px]', diarizing && 'animate-spin')} />
            {diarizing ? 'Running…' : 'Re-run'}
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          {speakers.map(s => {
            const isEditing = editingSpeakerId === s.id;
            const menuOpen = chipMenuFor === s.id;
            const dropHint =
              dragOverSpeaker === s.id && dragSpeaker !== s.id
                ? 'ring-2 ring-accent/40'
                : '';
            return (
              <div
                key={s.id}
                draggable
                onDragStart={() => dispatch({ type: 'SET_DRAG_SPEAKER', payload: s.id })}
                onDragOver={e => {
                  e.preventDefault();
                  dispatch({ type: 'SET_DRAG_OVER_SPEAKER', payload: s.id });
                }}
                onDrop={() => onDropReorder(s.id)}
                onDragEnd={() => {
                  dispatch({ type: 'SET_DRAG_SPEAKER', payload: null });
                  dispatch({ type: 'SET_DRAG_OVER_SPEAKER', payload: null });
                }}
                className={cn('relative rounded-[10px]', dropHint)}
              >
                <div className="flex items-center gap-2 border border-border rounded-[10px] py-[7px] pr-2 pl-[7px] bg-background">
                  <span
                    title="Drag to reorder"
                    className="flex items-center justify-center w-[18px] flex-none text-muted-foreground cursor-grab"
                  >
                    <GripVertical className="w-[15px] h-[15px]" />
                  </span>
                  <span
                    className="flex items-center justify-center w-7 h-7 rounded-lg flex-none text-xs font-bold"
                    style={{ background: tileFor(s.hue), color: colFor(s.hue) }}
                  >
                    {(s.name?.[0] || 'S').toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    {!isEditing ? (
                      <div className="text-[13px] font-semibold leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                        {s.name}
                      </div>
                    ) : (
                      <input
                        value={speakerNameDraft}
                        autoFocus
                        onChange={e =>
                          dispatch({
                            type: 'SET_EDITING_SPEAKER',
                            payload: { id: s.id, draft: e.target.value },
                          })
                        }
                        onBlur={() => void commitName()}
                        onKeyDown={e => {
                          if (e.key === 'Enter') void commitName();
                          if (e.key === 'Escape') {
                            dispatch({
                              type: 'SET_EDITING_SPEAKER',
                              payload: { id: null, draft: '' },
                            });
                          }
                        }}
                        className="w-[140px] h-6 px-[7px] text-[13px] font-semibold text-foreground bg-card border border-accent rounded-md outline-none shadow-[0_0_0_3px_var(--ring)]"
                      />
                    )}
                    <div className="text-[11px] text-muted-foreground mt-px">
                      {segCount(s.id)} segments
                    </div>
                  </div>
                  <button
                    type="button"
                    title="Options"
                    onClick={e => {
                      e.stopPropagation();
                      dispatch({
                        type: 'SET_CHIP_MENU',
                        payload: menuOpen ? null : s.id,
                      });
                    }}
                    className="flex items-center justify-center w-[26px] h-[26px] border-none bg-transparent rounded-[7px] text-muted-foreground cursor-pointer flex-none hover:bg-secondary"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {menuOpen && (
                  <div className="absolute top-[calc(100%+5px)] right-0 z-30 w-[212px] bg-card border border-border rounded-[11px] shadow-[var(--shadow-lg)] p-1.5 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        dispatch({
                          type: 'SET_EDITING_SPEAKER',
                          payload: { id: s.id, draft: s.name },
                        });
                        dispatch({ type: 'SET_CHIP_MENU', payload: null });
                      }}
                      className="flex items-center gap-[9px] w-full px-[9px] py-2 border-none bg-transparent rounded-lg text-[13px] font-medium text-foreground cursor-pointer text-left hover:bg-secondary"
                    >
                      <Pencil className="w-[15px] h-[15px] text-muted-foreground" />
                      Rename
                    </button>
                    <div className="px-[9px] py-1.5">
                      <div className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground mb-1.5">
                        Color
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {HUES.map(h => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => {
                              void persistSpeaker(s.id, { hue: h });
                              dispatch({ type: 'SET_CHIP_MENU', payload: null });
                            }}
                            className="w-5 h-5 rounded-md cursor-pointer p-0"
                            style={{
                              background: colFor(h),
                              border: `2px solid ${s.hue === h ? 'var(--accent)' : 'transparent'}`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    {speakers.length > 1 && (
                      <>
                        <div className="h-px bg-border my-[5px] mx-1" />
                        <div className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground px-[9px] pb-[5px] pt-0.5">
                          Merge into
                        </div>
                        {speakers
                          .filter(m => m.id !== s.id)
                          .map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => void handleMerge(s.id, m.id)}
                              className="flex items-center gap-[9px] w-full px-[9px] py-[7px] border-none bg-transparent rounded-lg text-[13px] font-medium text-foreground cursor-pointer text-left hover:bg-secondary"
                            >
                              <span
                                className="w-[9px] h-[9px] rounded-[3px] flex-none"
                                style={{ background: colFor(m.hue) }}
                              />
                              <span className="flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">
                                {m.name}
                              </span>
                            </button>
                          ))}
                        <div className="h-px bg-border my-[5px] mx-1" />
                        <button
                          type="button"
                          onClick={() => void handleRemove(s.id)}
                          className="flex items-center gap-[9px] w-full px-[9px] py-2 border-none bg-transparent rounded-lg text-[13px] font-medium text-[var(--bad)] cursor-pointer text-left hover:bg-secondary"
                        >
                          <Trash2 className="w-[15px] h-[15px]" />
                          Remove speaker
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={busy}
          className="flex items-center justify-center gap-[7px] w-full mt-2 h-[34px] border border-dashed border-accent/45 rounded-[9px] bg-accent/[0.06] text-accent text-[12.5px] font-semibold cursor-pointer hover:bg-accent/[0.11] disabled:opacity-50"
        >
          <Plus className="w-[15px] h-[15px]" strokeWidth={2.2} />
          Add speaker
        </button>
      </div>
    </>
  );
}
