'use client';

import { Plus } from 'lucide-react';
import { useAppState } from '@/app/hooks/use-app-state';
import { HUES } from '@/app/data/initial-data';
import { projectSpeakersApi, segmentsApi } from '@/app/lib/api';
import { mapApiSpeaker } from '@/app/lib/mappers';
import { colFor } from '@/lib/utils';

export function SpeakerAssignMenu() {
  const { state, dispatch } = useAppState();
  const { speakerMenu, speakers, activeProject } = state;
  const projectId = activeProject?.id;

  if (!speakerMenu) return null;

  const assign = async (speakerId: string) => {
    if (!projectId) return;
    dispatch({
      type: 'UPDATE_SEGMENT',
      payload: { id: speakerMenu.segId, updates: { speaker_id: speakerId } },
    });
    dispatch({ type: 'SET_SPEAKER_MENU', payload: null });
    try {
      await segmentsApi.update(projectId, speakerMenu.segId, {
        speaker_id: speakerId,
      });
    } catch (err) {
      dispatch({
        type: 'SET_TOAST',
        payload: err instanceof Error ? err.message : 'Failed to reassign speaker',
      });
    }
  };

  const addNew = async () => {
    if (!projectId) return;
    try {
      const hue = HUES[speakers.length % HUES.length];
      const created = await projectSpeakersApi.create(projectId, {
        name: `Speaker ${speakers.length + 1}`,
        hue,
      });
      const mapped = mapApiSpeaker(created);
      dispatch({ type: 'ADD_SPEAKER', payload: mapped });
      await assign(mapped.id);
    } catch (err) {
      dispatch({
        type: 'SET_TOAST',
        payload: err instanceof Error ? err.message : 'Failed to create speaker',
      });
    }
  };

  const currentSeg = state.segments.find(s => s.id === speakerMenu.segId);

  return (
    <div
      className="fixed inset-0 z-[66]"
      onClick={() => dispatch({ type: 'SET_SPEAKER_MENU', payload: null })}
    >
      <div
        className="fixed w-[216px] bg-card border border-border rounded-xl shadow-[var(--shadow-lg)] p-1.5 animate-in fade-in zoom-in-95 duration-100"
        style={{ top: speakerMenu.top, left: speakerMenu.left }}
        onClick={e => e.stopPropagation()}
      >
        <p className="mx-2 mt-1 mb-1.5 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
          Assign speaker
        </p>
        {speakers.map(m => {
          const active = currentSeg?.speaker_id === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => void assign(m.id)}
              className="flex items-center gap-[9px] w-full px-[9px] py-2 border-none bg-transparent rounded-lg text-[13px] font-medium text-foreground cursor-pointer text-left hover:bg-secondary"
            >
              <span
                className="w-[9px] h-[9px] rounded-[3px] flex-none"
                style={{ background: colFor(m.hue) }}
              />
              <span className="flex-1 min-w-0">{m.name}</span>
              {active && (
                <span className="text-accent text-xs font-bold">✓</span>
              )}
            </button>
          );
        })}
        <div className="h-px bg-border my-[5px] mx-1" />
        <button
          type="button"
          onClick={() => void addNew()}
          className="flex items-center gap-[9px] w-full px-[9px] py-2 border-none bg-transparent rounded-lg text-[13px] font-semibold text-accent cursor-pointer text-left hover:bg-secondary"
        >
          <Plus className="w-[15px] h-[15px]" strokeWidth={2.2} />
          New speaker
        </button>
      </div>
    </div>
  );
}
