'use client';

import { Check, Globe, Plus, Search, X } from 'lucide-react';
import { useAppState } from '@/app/hooks/use-app-state';
import { CATALOG } from '@/app/data/initial-data';
import { cn } from '@/lib/utils';

export function AddLanguageModal() {
  const { state, dispatch } = useAppState();
  const { addLangOpen, addLangSearch, addLangSel, activeLangs } = state;

  if (!addLangOpen) return null;

  const q = addLangSearch.trim().toLowerCase();
  const list = CATALOG.filter(
    l =>
      !q ||
      l.name.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q) ||
      l.id.toLowerCase().includes(q),
  );

  const selectedIds = Object.keys(addLangSel).filter(id => addLangSel[id]);
  const chips = selectedIds
    .map(id => CATALOG.find(c => c.id === id))
    .filter(Boolean) as typeof CATALOG;

  const close = () => {
    dispatch({ type: 'SET_ADD_LANG_OPEN', payload: false });
    dispatch({ type: 'SET_ADD_LANG_SEARCH', payload: '' });
  };

  const confirm = () => {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      if (!activeLangs.includes(id)) {
        dispatch({ type: 'ADD_LANG', payload: id });
      }
    }
    // clear selection
    for (const id of selectedIds) {
      dispatch({ type: 'TOGGLE_ADD_LANG_SEL', payload: id });
    }
    close();
    dispatch({
      type: 'SET_TOAST',
      payload:
        selectedIds.length === 1
          ? 'Language added — translation will run when available'
          : `${selectedIds.length} languages added — translation will run when available`,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-[3px] flex items-center justify-center p-6"
      onClick={close}
    >
      <div
        className="w-[460px] max-w-full bg-card border border-border rounded-[18px] shadow-[var(--shadow-lg)] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-[18px] pb-3.5 border-b border-border flex items-start gap-3">
          <span className="flex-shrink-0 inline-flex items-center justify-center w-[34px] h-[34px] rounded-[9px] bg-accent/12 text-accent">
            <Globe className="w-[17px] h-[17px]" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="m-0 text-base font-semibold">Add caption languages</h3>
            <p className="mt-1 mb-0 text-[12.5px] text-muted-foreground leading-snug">
              Pick languages to generate subtitle tracks. We translate the transcript and keep
              timing in sync.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex-shrink-0 w-[30px] h-[30px] border-none rounded-lg bg-secondary text-muted-foreground cursor-pointer inline-flex items-center justify-center hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="relative">
            <Search className="absolute left-[11px] top-3.5 w-[15px] h-[15px] text-muted-foreground" />
            <input
              value={addLangSearch}
              onChange={e =>
                dispatch({ type: 'SET_ADD_LANG_SEARCH', payload: e.target.value })
              }
              placeholder="Search languages…"
              className="w-full h-10 pl-[34px] pr-3 border border-border rounded-[9px] bg-background text-foreground text-[13px] outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--ring)]"
            />
          </div>

          <div className="scrolly mt-2.5 max-h-[230px] overflow-y-auto border border-border rounded-[10px] p-[5px]">
            {list.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No languages match.
              </div>
            ) : (
              list.map(l => {
                const already = activeLangs.includes(l.id);
                const on = !!addLangSel[l.id] || already;
                return (
                  <button
                    key={l.id}
                    type="button"
                    disabled={already}
                    onClick={() =>
                      dispatch({ type: 'TOGGLE_ADD_LANG_SEL', payload: l.id })
                    }
                    className="flex items-center gap-2.5 w-full px-[9px] py-2 border-none rounded-lg bg-transparent cursor-pointer text-left hover:bg-secondary disabled:opacity-60 disabled:cursor-default"
                  >
                    <span
                      className={cn(
                        'w-4 h-4 rounded-[4px] border flex items-center justify-center flex-none',
                        on
                          ? 'bg-accent border-accent text-accent-foreground'
                          : 'border-border bg-card',
                      )}
                    >
                      {on && <Check className="w-[11px] h-[11px]" strokeWidth={3.2} />}
                    </span>
                    <span className="mono text-[10px] font-bold text-muted-foreground w-7 flex-shrink-0">
                      {l.code}
                    </span>
                    <span className="flex-1 text-[13px] font-medium text-foreground">{l.name}</span>
                    {already && (
                      <span className="text-[10.5px] font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                        Added
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-[7px] mt-[11px]">
              {chips.map(l => (
                <span
                  key={l.id}
                  className="inline-flex items-center gap-1.5 h-[30px] pl-[11px] pr-2 border border-accent rounded-full bg-accent/[0.08] text-accent text-[12.5px] font-semibold"
                >
                  <span className="mono text-[9.5px] font-bold opacity-80">{l.code}</span>
                  {l.name}
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: 'TOGGLE_ADD_LANG_SEL', payload: l.id })
                    }
                    className="inline-flex items-center justify-center w-[18px] h-[18px] border-none rounded-full bg-transparent text-accent cursor-pointer p-0 hover:bg-accent/18"
                  >
                    <X className="w-[11px] h-[11px]" strokeWidth={2.5} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-[13px] border-t border-border flex justify-end gap-[9px]">
          <button
            type="button"
            onClick={close}
            className="h-[38px] px-4 border border-border rounded-[9px] bg-card text-foreground text-[13px] font-semibold cursor-pointer hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={confirm}
            className={cn(
              'inline-flex items-center gap-1.5 h-[38px] px-4 border-none rounded-[9px] text-[13px] font-semibold cursor-pointer',
              selectedIds.length === 0
                ? 'bg-secondary text-muted-foreground cursor-not-allowed'
                : 'bg-accent text-accent-foreground',
            )}
          >
            <Plus className="w-[15px] h-[15px]" strokeWidth={2.2} />
            {selectedIds.length === 0
              ? 'Add languages'
              : `Add ${selectedIds.length} language${selectedIds.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
