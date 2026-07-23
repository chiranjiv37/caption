'use client';

import { Check, ChevronDown, Clock, Globe, Settings2 } from 'lucide-react';
import { useAppState } from '@/app/hooks/use-app-state';
import { ADV_DEFS, AI_DEFS, LENGTHS, SPEEDS, STYLES } from '@/app/data/initial-data';
import { cn } from '@/lib/utils';

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={cn(
        'relative w-10 h-[23px] rounded-full border-none cursor-pointer flex-shrink-0 transition-colors',
        on ? 'bg-accent' : 'bg-muted-foreground/30',
      )}
    >
      <span
        className="absolute top-[2.5px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all"
        style={{ left: on ? '19px' : '2.5px' }}
      />
    </button>
  );
}

export function CaptionSettingsPopover() {
  const { state, dispatch } = useAppState();
  const {
    capStyle,
    readSpeed,
    customCps,
    capLen,
    aiFiller,
    aiPunct,
    aiGrammar,
    aiCaps,
    advOpen,
    minDur,
    maxDur,
    silenceMs,
    mergeShort,
    breakPunct,
    smartBreak,
    spkLabels,
    ccMode,
    sfx,
    styleMenuOpen,
  } = state;

  const setSetting = (key: string, value: unknown) =>
    dispatch({ type: 'SET_CAPTION_SETTING', payload: { key, value } });

  const activeStyle = STYLES.find(s => s.id === capStyle) || STYLES[0];
  const speedIsCustom = readSpeed === 'custom';
  const activeCps =
    speedIsCustom
      ? customCps
      : SPEEDS.find(s => s.id === readSpeed)?.cps ?? 15;
  const wpmLabel = Math.round(activeCps * 10);

  const aiState: Record<string, boolean> = {
    aiFiller,
    aiPunct,
    aiGrammar,
    aiCaps,
  };
  const advState: Record<string, boolean> = {
    mergeShort,
    breakPunct,
    smartBreak,
    spkLabels,
    ccMode,
    sfx,
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[52]"
        onClick={() => dispatch({ type: 'CLOSE_MENUS' })}
      />
      <div className="scrolly absolute top-[calc(100%+6px)] right-[9px] z-[53] w-[376px] max-h-[74vh] overflow-y-auto bg-card border border-border rounded-[13px] shadow-[var(--shadow-lg)] animate-in fade-in zoom-in-95 duration-100">
        <div className="sticky top-0 z-[2] px-4 pt-3 pb-2.5 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold">Caption settings</span>
            </div>
            <button
              type="button"
              onClick={() => dispatch({ type: 'RESET_CAPTION_SETTINGS' })}
              className="h-[26px] px-2.5 border border-border rounded-[7px] bg-card text-muted-foreground text-[11.5px] font-medium cursor-pointer hover:bg-secondary"
            >
              Reset
            </button>
          </div>
          <div className="flex items-center gap-[7px] mt-[9px] px-[9px] py-[7px] rounded-lg bg-accent/[0.07] border border-accent/22">
            <Globe className="w-3.5 h-3.5 text-accent flex-none" />
            <span className="text-[11.5px] leading-[1.35] text-muted-foreground">
              Applies to <b className="text-foreground font-semibold">all caption languages</b> in this
              project.
            </span>
          </div>
        </div>

        {/* Caption Style */}
        <div className="px-4 py-3.5 border-b border-border">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mb-[9px]">
            Caption style
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'TOGGLE_MENU', payload: 'styleMenuOpen' })}
            className="flex items-center justify-between gap-2 w-full h-[38px] px-3 border border-border rounded-[9px] bg-background text-foreground text-[13px] font-medium cursor-pointer hover:border-accent/40"
          >
            <span className="flex items-center gap-2">
              <span
                className="w-[9px] h-[9px] rounded-[3px] flex-none"
                style={{ background: activeStyle.dot }}
              />
              {activeStyle.label}
            </span>
            <ChevronDown
              className={cn(
                'w-[13px] h-[13px] text-muted-foreground transition-transform',
                styleMenuOpen && 'rotate-180',
              )}
            />
          </button>
          {styleMenuOpen && (
            <div className="mt-1.5 border border-border rounded-[9px] overflow-hidden">
              {STYLES.map(o => {
                const active = o.id === capStyle;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setSetting('capStyle', o.id);
                      dispatch({ type: 'TOGGLE_MENU', payload: 'styleMenuOpen' });
                    }}
                    className={cn(
                      'flex items-start gap-2.5 w-full px-[11px] py-[9px] border-none cursor-pointer text-left hover:bg-secondary',
                      active ? 'bg-accent/10' : 'bg-transparent',
                    )}
                  >
                    <span
                      className="mt-0.5 w-[9px] h-[9px] rounded-[3px] flex-none"
                      style={{ background: o.dot }}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold text-foreground">{o.label}</span>
                      <span className="block text-[11px] text-muted-foreground mt-px">{o.desc}</span>
                    </span>
                    {active && <Check className="w-[15px] h-[15px] text-accent flex-none" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Reading Speed */}
        <div className="px-4 py-3.5 border-b border-border">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mb-[9px]">
            Reading speed
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {SPEEDS.map(c => {
              const active = c.id === readSpeed;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSetting('readSpeed', c.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[12.5px] font-semibold cursor-pointer',
                    active
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border bg-card text-foreground hover:bg-secondary',
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          {speedIsCustom && (
            <div className="mt-[11px]">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Characters per second
              </label>
              <div className="flex items-center gap-2.5">
                <input
                  type="number"
                  min={4}
                  max={40}
                  value={customCps}
                  onChange={e => setSetting('customCps', Number(e.target.value) || 15)}
                  className="w-[90px] h-9 px-[11px] border border-border rounded-[9px] bg-background text-foreground text-[13px] outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ring)]"
                />
                <span className="mono text-xs text-muted-foreground">CPS</span>
              </div>
            </div>
          )}
          <div className="mt-[9px] text-[11.5px] text-muted-foreground">
            Target: <b className="text-foreground font-semibold">{activeCps} CPS</b> · ~{wpmLabel} wpm
          </div>
        </div>

        {/* Caption Length */}
        <div className="px-4 py-3.5 border-b border-border">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mb-[9px]">
            Caption length
          </div>
          <div className="flex flex-col gap-0.5">
            {LENGTHS.map(o => {
              const on = o.id === capLen;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSetting('capLen', o.id)}
                  className="flex items-center gap-2.5 w-full p-2 border-none bg-transparent rounded-lg cursor-pointer text-left hover:bg-secondary"
                >
                  <span
                    className={cn(
                      'w-[16px] h-[16px] rounded-full border-2 flex items-center justify-center flex-none',
                      on ? 'border-accent' : 'border-border',
                    )}
                  >
                    {on && <span className="w-2 h-2 rounded-full bg-accent" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-medium text-foreground">{o.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{o.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Cleanup */}
        <div className="px-4 py-3.5 border-b border-border">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mb-1">
            AI cleanup
          </div>
          {AI_DEFS.map(g => (
            <div key={g.k} className="flex items-center justify-between gap-3 py-2">
              <span className="text-[13px] font-medium text-foreground">{g.label}</span>
              <Toggle
                on={!!aiState[g.k]}
                onToggle={() => setSetting(g.k, !aiState[g.k])}
              />
            </div>
          ))}
        </div>

        {/* Advanced */}
        <div className="px-4 pt-1 pb-3.5">
          <button
            type="button"
            onClick={() => setSetting('advOpen', !advOpen)}
            className="flex items-center justify-between w-full pt-[11px] pb-[9px] border-none bg-transparent cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                Advanced settings
              </span>
            </span>
            <ChevronDown
              className={cn(
                'w-[15px] h-[15px] text-muted-foreground transition-transform',
                advOpen && 'rotate-180',
              )}
            />
          </button>
          {advOpen && (
            <div className="pt-1.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11.5px] font-medium text-muted-foreground mb-[5px]">
                    Min duration (s)
                  </label>
                  <input
                    type="number"
                    min={0.3}
                    max={5}
                    step={0.1}
                    value={minDur}
                    onChange={e => setSetting('minDur', Number(e.target.value) || 1)}
                    className="w-full h-[34px] px-2.5 border border-border rounded-lg bg-background text-foreground text-[13px] outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ring)]"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-medium text-muted-foreground mb-[5px]">
                    Max duration (s)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    step={0.1}
                    value={maxDur}
                    onChange={e => setSetting('maxDur', Number(e.target.value) || 6)}
                    className="w-full h-[34px] px-2.5 border border-border rounded-lg bg-background text-foreground text-[13px] outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ring)]"
                  />
                </div>
              </div>
              <div className="mt-2.5">
                <label className="block text-[11.5px] font-medium text-muted-foreground mb-[5px]">
                  Silence threshold (ms)
                </label>
                <input
                  type="number"
                  min={50}
                  max={2000}
                  step={50}
                  value={silenceMs}
                  onChange={e => setSetting('silenceMs', Number(e.target.value) || 300)}
                  className="w-[120px] h-[34px] px-2.5 border border-border rounded-lg bg-background text-foreground text-[13px] outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ring)]"
                />
              </div>
              <div className="mt-1.5">
                {ADV_DEFS.map(g => (
                  <div
                    key={g.k}
                    className="flex items-center justify-between gap-3 py-2 border-t border-border/60"
                  >
                    <span className="text-[13px] font-medium text-foreground">{g.label}</span>
                    <Toggle
                      on={!!advState[g.k]}
                      onToggle={() => setSetting(g.k, !advState[g.k])}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
