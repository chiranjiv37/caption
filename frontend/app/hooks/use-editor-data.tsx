'use client';

import { useEffect, useRef } from 'react';
import { useAppState } from '@/app/hooks/use-app-state';
import {
  projectsApi,
  transcriptsApi,
  segmentsApi,
  projectSpeakersApi,
} from '@/app/lib/api';
import {
  mapApiProject,
  mapApiSegment,
  mapApiSpeaker,
  pickDefaultLanguage,
  uniqueLanguageCodes,
} from '@/app/lib/mappers';

/**
 * Loads speakers, transcripts, and segments for the active project.
 * Reloads segments when `lang` changes.
 */
export function useEditorData() {
  const { state, dispatch } = useAppState();
  const { activeProject, lang } = state;
  const projectId = activeProject?.id ?? null;
  const durationPatched = useRef<string | null>(null);

  // Load project detail + speakers + transcripts when project changes
  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    const load = async () => {
      dispatch({ type: 'SET_EDITOR_LOADING', payload: true });
      dispatch({ type: 'SET_EDITOR_ERROR', payload: null });

      try {
        const [detail, speakers, transcripts] = await Promise.all([
          projectsApi.get(projectId),
          projectSpeakersApi.list(projectId),
          transcriptsApi.list(projectId),
        ]);

        if (cancelled) return;

        const mappedProject = mapApiProject(detail);
        dispatch({
          type: 'SET_ACTIVE_PROJECT',
          payload: mappedProject,
        });
        dispatch({ type: 'SET_SPEAKERS', payload: speakers.map(mapApiSpeaker) });
        dispatch({ type: 'SET_TRANSCRIPTS', payload: transcripts });

        const langs = uniqueLanguageCodes(transcripts);
        dispatch({ type: 'SET_ACTIVE_LANGS', payload: langs });

        const defaultLang = pickDefaultLanguage(
          transcripts,
          detail.source_language,
        );
        dispatch({ type: 'SET_LANG', payload: defaultLang });

        const activeTranscript =
          transcripts.find(
            t => t.language_code === defaultLang && t.type === 'original',
          ) ||
          transcripts.find(t => t.language_code === defaultLang) ||
          null;
        dispatch({
          type: 'SET_ACTIVE_TRANSCRIPT',
          payload: activeTranscript?.id ?? null,
        });
      } catch (err) {
        if (!cancelled) {
          dispatch({
            type: 'SET_EDITOR_ERROR',
            payload:
              err instanceof Error ? err.message : 'Failed to load editor data',
          });
          dispatch({ type: 'SET_SEGMENTS', payload: [] });
          dispatch({ type: 'SET_SPEAKERS', payload: [] });
          dispatch({ type: 'SET_TRANSCRIPTS', payload: [] });
          dispatch({ type: 'SET_ACTIVE_LANGS', payload: [] });
        }
      } finally {
        if (!cancelled) {
          dispatch({ type: 'SET_EDITOR_LOADING', payload: false });
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // Only re-run when project id changes — lang handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, dispatch]);

  // Load segments when language changes (or after transcripts load sets lang)
  useEffect(() => {
    if (!projectId || !lang) return;

    let cancelled = false;

    const loadSegments = async () => {
      try {
        const segments = await segmentsApi.listByLanguage(projectId, lang);
        if (cancelled) return;
        dispatch({ type: 'SET_SEGMENTS', payload: segments.map(mapApiSegment) });

        const transcript =
          state.transcripts.find(
            t => t.language_code === lang && t.type === 'original',
          ) || state.transcripts.find(t => t.language_code === lang);
        dispatch({
          type: 'SET_ACTIVE_TRANSCRIPT',
          payload: transcript?.id ?? null,
        });
      } catch (err) {
        if (!cancelled) {
          // No transcript for language → empty, not fatal if still loading project
          const message =
            err instanceof Error ? err.message : 'Failed to load segments';
          if (!message.toLowerCase().includes('not found')) {
            dispatch({ type: 'SET_EDITOR_ERROR', payload: message });
          }
          dispatch({ type: 'SET_SEGMENTS', payload: [] });
        }
      }
    };

    loadSegments();
    return () => {
      cancelled = true;
    };
  }, [projectId, lang, dispatch, state.transcripts]);

  /** Persist measured video duration to the project once if missing. */
  const persistDurationIfNeeded = async (seconds: number) => {
    if (!projectId || !Number.isFinite(seconds) || seconds <= 0) return;
    if (durationPatched.current === projectId) return;
    if (activeProject?.duration_seconds && activeProject.duration_seconds > 0) {
      return;
    }
    durationPatched.current = projectId;
    try {
      await projectsApi.update(projectId, {
        // backend ProjectUpdate may not include duration — try anyway via cast
        duration_seconds: Math.round(seconds),
      } as Parameters<typeof projectsApi.update>[1]);
    } catch {
      // non-fatal
    }
  };

  return { persistDurationIfNeeded };
}
