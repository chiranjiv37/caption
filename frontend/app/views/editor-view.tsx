'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppState } from '@/app/hooks/use-app-state';
import { useEditorData } from '@/app/hooks/use-editor-data';
import { projectsApi } from '@/app/lib/api';
import { StepperToolbar } from '@/app/sections/editor/stepper-toolbar';
import { VideoStage } from '@/app/sections/editor/video-stage';
import { TranscriptPanel } from '@/app/sections/editor/transcript-panel';
import { Timeline } from '@/app/sections/editor/timeline';
import { ExportModal } from '@/app/sections/editor/export-modal';
import { AddLanguageModal } from '@/app/sections/editor/add-language-modal';
import { SpeakerAssignMenu } from '@/app/sections/editor/speaker-assign-menu';
import { segEnd, segStart } from '@/app/sections/editor/helpers';

export function EditorView() {
  const { state, dispatch } = useAppState();
  const {
    activeProject,
    segments,
    currentTime,
    lang,
  } = state;

  const { persistDurationIfNeeded } = useEditorData();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  const activeSeg = segments.find(
    s => currentTime >= segStart(s) && currentTime < segEnd(s),
  );
  const activeCaption = activeSeg?.text ?? '';

  useEffect(() => {
    if (!activeProject?.id) {
      setMediaUrl(null);
      setDuration(0);
      setMediaError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoadingMedia(true);
      setMediaError(null);

      try {
        const detail = await projectsApi.get(activeProject.id);
        if (cancelled) return;

        if (detail.duration_seconds && detail.duration_seconds > 0) {
          setDuration(detail.duration_seconds);
        }

        if (!detail.storage_key) {
          setMediaUrl(null);
          setMediaError('No media file uploaded for this project');
          return;
        }

        const url = projectsApi.getMediaUrl(activeProject.id);
        if (!url) {
          setMediaUrl(null);
          setMediaError('Not authenticated');
          return;
        }

        setMediaUrl(url);
      } catch (err) {
        if (!cancelled) {
          setMediaUrl(null);
          setMediaError(
            err instanceof Error ? err.message : 'Failed to load project media',
          );
        }
      } finally {
        if (!cancelled) setIsLoadingMedia(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [activeProject?.id]);

  const seekTo = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (video && Number.isFinite(time)) {
        video.currentTime = time;
      }
      dispatch({ type: 'SET_CURRENT_TIME', payload: time });
    },
    [dispatch],
  );

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    dispatch({ type: 'SET_CURRENT_TIME', payload: video.currentTime });
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    if (Number.isFinite(video.duration) && video.duration > 0) {
      setDuration(video.duration);
      void persistDurationIfNeeded(video.duration);
    }
  };

  const handleEnded = () => {
    dispatch({ type: 'SET_PLAYING', payload: false });
  };

  if (!activeProject) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No project selected
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <StepperToolbar />

      <div className="flex-1 min-h-0 flex flex-col gap-3.5 px-[18px] py-3.5 overflow-hidden">
        <div
          className="flex-1 min-h-0 grid gap-3.5 items-stretch"
          style={{
            gridTemplateColumns: 'minmax(0, 1.55fr) minmax(440px, 1fr)',
          }}
        >
          <VideoStage
            videoRef={videoRef}
            mediaUrl={mediaUrl}
            isLoadingMedia={isLoadingMedia}
            mediaError={mediaError}
            activeCaption={activeCaption}
            lang={lang}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onPlay={() => dispatch({ type: 'SET_PLAYING', payload: true })}
            onPause={() => dispatch({ type: 'SET_PLAYING', payload: false })}
            onMediaError={() => setMediaError('Failed to play media file')}
          />
          <TranscriptPanel onSeek={seekTo} />
        </div>

        <Timeline duration={duration} onSeek={seekTo} />
      </div>

      <ExportModal />
      <AddLanguageModal />
      <SpeakerAssignMenu />
    </div>
  );
}
