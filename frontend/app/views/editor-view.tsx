'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppState } from '@/app/hooks/use-app-state';
import { projectsApi, type Project as ApiProject } from '@/app/lib/api';
import { Button } from '@/components/ui/button';
import { Play, Pause, Download, Settings } from 'lucide-react';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function EditorView() {
  const { state, dispatch } = useAppState();
  const { activeProject, segments, speakers, currentTime, playing, lang } = state;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  const activeSeg = segments.find(s => currentTime >= s.start && currentTime < s.end);
  const activeCaption = activeSeg ? activeSeg.text[lang] : '';
  const safeDuration = duration > 0 ? duration : 1;

  // Load project detail + media URL when active project changes
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
        const detail: ApiProject = await projectsApi.get(activeProject.id);
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
          setMediaError(err instanceof Error ? err.message : 'Failed to load project media');
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

  // Sync play/pause state to the video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mediaUrl) return;

    if (playing) {
      video.play().catch(() => {
        dispatch({ type: 'SET_PLAYING', payload: false });
      });
    } else {
      video.pause();
    }
  }, [playing, mediaUrl, dispatch]);

  // Seek video when currentTime is set from transcript/timeline (not from timeupdate)
  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (video && Number.isFinite(time)) {
      video.currentTime = time;
    }
    dispatch({ type: 'SET_CURRENT_TIME', payload: time });
  }, [dispatch]);

  const handleTogglePlay = () => {
    dispatch({ type: 'SET_PLAYING', payload: !playing });
  };

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
    }
  };

  const handleEnded = () => {
    dispatch({ type: 'SET_PLAYING', payload: false });
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    seekTo(ratio * safeDuration);
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
      {/* Stepper */}
      <div className="flex items-center gap-4 px-4 py-2 border-b bg-card">
        <span className="text-sm text-muted-foreground">Upload ✓</span>
        <span className="text-sm text-muted-foreground">Transcribe ✓</span>
        <span className="text-sm font-semibold">Edit captions (3)</span>
        <span className="text-sm text-muted-foreground">Output (4)</span>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'SET_EXPORT_OPEN', payload: true })} className="gap-1">
          <Settings className="w-4 h-4" />
          Settings
        </Button>
        <Button size="sm" onClick={() => dispatch({ type: 'SET_EXPORT_OPEN', payload: true })} className="gap-1">
          <Download className="w-4 h-4" />
          Output
        </Button>
      </div>

      {/* Main Editor */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-4 min-h-0">
        {/* Video */}
        <div className="flex flex-col border rounded-xl bg-card overflow-hidden min-h-0">
          <div className="flex-1 bg-black flex items-center justify-center relative min-h-[240px]">
            {isLoadingMedia && (
              <div className="text-white/50 text-sm">Loading media…</div>
            )}
            {!isLoadingMedia && mediaError && (
              <div className="text-white/70 text-sm px-4 text-center">{mediaError}</div>
            )}
            {!isLoadingMedia && mediaUrl && (
              <video
                ref={videoRef}
                src={mediaUrl}
                className="absolute inset-0 w-full h-full object-contain"
                playsInline
                preload="metadata"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                onError={() => setMediaError('Failed to play media file')}
              />
            )}
            {activeCaption && (
              <div className="absolute bottom-8 left-0 right-0 text-center z-10 pointer-events-none">
                <span className="bg-black/60 text-white px-3 py-1 rounded">{activeCaption}</span>
              </div>
            )}
          </div>
          <div className="p-3 border-t flex items-center gap-2">
            <button
              onClick={handleTogglePlay}
              disabled={!mediaUrl}
              className="p-2 rounded-full bg-accent text-white disabled:opacity-50"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <div
              className="flex-1 h-1 bg-secondary rounded-full cursor-pointer"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-accent rounded-full"
                style={{ width: `${(currentTime / safeDuration) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Transcript */}
        <div className="flex flex-col border rounded-xl bg-card overflow-hidden min-h-0">
          <div className="p-3 border-b">
            <h3 className="font-semibold">Transcript</h3>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {segments.map(s => (
              <div
                key={s.id}
                onClick={() => {
                  seekTo(s.start);
                  dispatch({ type: 'SET_SELECTED_ID', payload: s.id });
                }}
                className="p-2 rounded cursor-pointer hover:bg-secondary"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{Math.floor(s.start)}s</span>
                  <span className="text-xs font-medium">{speakers.find(sp => sp.id === s.speaker)?.name}</span>
                </div>
                <p className="text-sm mt-1">{s.text[lang]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="h-32 border-t bg-card p-4">
        <div className="text-sm font-semibold mb-2">Timeline</div>
        <div
          className="relative h-16 bg-secondary rounded cursor-pointer"
          onClick={handleProgressClick}
        >
          {segments.map(s => {
            const left = (s.start / safeDuration) * 100;
            const width = ((s.end - s.start) / safeDuration) * 100;
            return (
              <div
                key={s.id}
                onClick={(e) => {
                  e.stopPropagation();
                  seekTo(s.start);
                }}
                className="absolute h-8 rounded bg-accent/80 text-white text-xs flex items-center px-2 cursor-pointer overflow-hidden"
                style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%`, top: '20px' }}
              >
                {s.text[lang]?.slice(0, 20)}
              </div>
            );
          })}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
            style={{ left: `${(currentTime / safeDuration) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
