'use client';

import { RefObject } from 'react';
import { CATALOG } from '@/app/data/initial-data';

interface VideoStageProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  mediaUrl: string | null;
  isLoadingMedia: boolean;
  mediaError: string | null;
  activeCaption: string;
  lang: string;
  onTimeUpdate: () => void;
  onLoadedMetadata: () => void;
  onEnded: () => void;
  onPlay: () => void;
  onPause: () => void;
  onMediaError: () => void;
}

export function VideoStage({
  videoRef,
  mediaUrl,
  isLoadingMedia,
  mediaError,
  activeCaption,
  lang,
  onTimeUpdate,
  onLoadedMetadata,
  onEnded,
  onPlay,
  onPause,
  onMediaError,
}: VideoStageProps) {
  const activeLangName =
    CATALOG.find(l => l.id === lang)?.name || lang?.toUpperCase() || 'Language';

  return (
    <div className="min-h-0 flex flex-col border border-border bg-card rounded-[14px] overflow-hidden shadow-[var(--shadow-sm)]">
      <div className="flex-1 min-h-0 flex items-center justify-center bg-[#07070c]">
        <div className="relative h-full aspect-video max-w-full">
          {isLoadingMedia && (
            <div className="absolute inset-0 flex items-center justify-center text-white/50 text-sm z-10">
              Loading media…
            </div>
          )}
          {!isLoadingMedia && mediaError && (
            <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm px-4 text-center z-10">
              {mediaError}
            </div>
          )}
          {!isLoadingMedia && mediaUrl && (
            <video
              ref={videoRef}
              src={mediaUrl}
              controls
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full bg-[#07070c] block"
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onLoadedMetadata}
              onEnded={onEnded}
              onPlay={onPlay}
              onPause={onPause}
              onError={onMediaError}
            />
          )}
          {activeCaption && (
            <div className="absolute left-0 right-0 bottom-[14%] flex justify-center pointer-events-none z-[6] px-[10%]">
              <span className="text-center text-[19px] font-semibold text-white bg-black/62 px-[13px] py-[5px] rounded-md leading-[1.3] [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
                {activeCaption}
              </span>
            </div>
          )}
          <div className="absolute top-3 left-3 z-[6] flex items-center gap-1.5 bg-black/45 backdrop-blur-md px-2.5 py-[5px] rounded-full text-[11px] font-medium text-white/92 pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ok)]" />
            Preview · {activeLangName}
          </div>
        </div>
      </div>
    </div>
  );
}
