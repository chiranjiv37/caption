'use client';

import { Check, Download, Settings2, Users } from 'lucide-react';
import { useAppState } from '@/app/hooks/use-app-state';
import { CaptionSettingsPopover } from './caption-settings-popover';
import { SpeakersPopover } from './speakers-popover';

export function StepperToolbar() {
  const { state, dispatch } = useAppState();
  const { speakers, speakersOpen, csOpen } = state;

  return (
    <div className="flex-shrink-0 z-[39] bg-card border-b border-border px-[18px] py-2.5 flex items-center gap-0">
      <div className="inline-flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-accent text-accent-foreground">
          <Check className="w-3 h-3" strokeWidth={3} />
        </span>
        <span className="text-[13px] font-medium text-muted-foreground">Upload</span>
      </div>
      <span className="w-[30px] h-0.5 bg-accent mx-2.5" />
      <div className="inline-flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-accent text-accent-foreground">
          <Check className="w-3 h-3" strokeWidth={3} />
        </span>
        <span className="text-[13px] font-medium text-muted-foreground">Transcribe</span>
      </div>
      <span className="w-[30px] h-0.5 bg-accent mx-2.5" />
      <div className="inline-flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full border-2 border-accent text-accent text-[11px] font-bold">
          3
        </span>
        <span className="text-[13px] font-semibold text-foreground">Edit captions</span>
      </div>
      <span className="w-[30px] h-0.5 bg-border mx-2.5" />
      <button
        type="button"
        onClick={() => dispatch({ type: 'SET_EXPORT_OPEN', payload: true })}
        className="inline-flex items-center gap-2 border-none bg-transparent cursor-pointer font-inherit"
      >
        <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-secondary text-muted-foreground text-[11px] font-bold">
          4
        </span>
        <span className="text-[13px] font-medium text-muted-foreground">Output</span>
      </button>

      <div className="flex-1" />

      <div className="relative">
        <button
          type="button"
          title="Caption settings"
          onClick={() => {
            if (speakersOpen) dispatch({ type: 'TOGGLE_MENU', payload: 'speakersOpen' });
            dispatch({ type: 'TOGGLE_MENU', payload: 'csOpen' });
          }}
          className="inline-flex items-center gap-1.5 h-8 px-[13px] border border-border rounded-lg bg-card text-foreground text-[12.5px] font-medium cursor-pointer flex-shrink-0 mr-[9px] hover:bg-secondary"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Settings
        </button>
        {csOpen && <CaptionSettingsPopover />}
      </div>

      <div className="relative">
        <button
          type="button"
          title="Manage detected speakers"
          onClick={() => {
            if (csOpen) dispatch({ type: 'TOGGLE_MENU', payload: 'csOpen' });
            dispatch({ type: 'TOGGLE_MENU', payload: 'speakersOpen' });
          }}
          className="inline-flex items-center gap-1.5 h-8 px-[13px] border border-border rounded-lg bg-card text-foreground text-[12.5px] font-medium cursor-pointer flex-shrink-0 mr-[9px] hover:bg-secondary"
        >
          <Users className="w-3.5 h-3.5" />
          Speakers
          <span className="inline-flex items-center justify-center min-w-[17px] h-[17px] px-[5px] rounded-full bg-secondary text-muted-foreground text-[10px] font-bold">
            {speakers.length}
          </span>
        </button>
        {speakersOpen && <SpeakersPopover />}
      </div>

      <button
        type="button"
        onClick={() => dispatch({ type: 'SET_EXPORT_OPEN', payload: true })}
        className="inline-flex items-center gap-1.5 h-8 px-[15px] border-none rounded-lg bg-accent text-accent-foreground text-[12.5px] font-semibold cursor-pointer flex-shrink-0 hover:brightness-105"
      >
        <Download className="w-3.5 h-3.5" />
        Output
      </button>
    </div>
  );
}
