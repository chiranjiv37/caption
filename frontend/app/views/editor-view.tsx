'use client';

import { useAppState } from '@/app/hooks/use-app-state';
import { Button } from '@/components/ui/button';
import { Play, Pause, Download, Settings } from 'lucide-react';

export function EditorView() {
  const { state, dispatch } = useAppState();
  const { activeProject, segments, speakers, currentTime, playing, lang } = state;

  const activeSeg = segments.find(s => currentTime >= s.start && currentTime < s.end);
  const activeCaption = activeSeg ? activeSeg.text[lang] : '';

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
      <div className="flex-1 grid grid-cols-2 gap-4 p-4">
        {/* Video */}
        <div className="flex flex-col border rounded-xl bg-card overflow-hidden">
          <div className="flex-1 bg-black flex items-center justify-center relative">
            <div className="text-white/50 text-sm">Video Player Placeholder</div>
            {activeCaption && (
              <div className="absolute bottom-8 left-0 right-0 text-center">
                <span className="bg-black/60 text-white px-3 py-1 rounded">{activeCaption}</span>
              </div>
            )}
          </div>
          <div className="p-3 border-t flex items-center gap-2">
            <button onClick={() => dispatch({ type: 'SET_PLAYING', payload: !playing })} className="p-2 rounded-full bg-accent text-white">
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <div className="flex-1 h-1 bg-secondary rounded-full">
              <div className="h-full bg-accent rounded-full" style={{ width: `${(currentTime / 23.8) * 100}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{Math.floor(currentTime)}s / 24s</span>
          </div>
        </div>

        {/* Transcript */}
        <div className="flex flex-col border rounded-xl bg-card overflow-hidden">
          <div className="p-3 border-b">
            <h3 className="font-semibold">Transcript</h3>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {segments.map(s => (
              <div
                key={s.id}
                onClick={() => {
                  dispatch({ type: 'SET_CURRENT_TIME', payload: s.start });
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
        <div className="relative h-16 bg-secondary rounded">
          {segments.map(s => {
            const left = (s.start / 23.8) * 100;
            const width = ((s.end - s.start) / 23.8) * 100;
            return (
              <div
                key={s.id}
                onClick={() => dispatch({ type: 'SET_CURRENT_TIME', payload: s.start })}
                className="absolute h-8 rounded bg-accent/80 text-white text-xs flex items-center px-2 cursor-pointer overflow-hidden"
                style={{ left: `${left}%`, width: `${width}%`, top: '20px' }}
              >
                {s.text[lang].slice(0, 20)}
              </div>
            );
          })}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500"
            style={{ left: `${(currentTime / 23.8) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
