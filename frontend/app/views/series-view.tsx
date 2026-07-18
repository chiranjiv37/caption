'use client';

import { useAppState } from '@/app/hooks/use-app-state';
import { CATALOG } from '@/app/data/initial-data';
import { colFor, epStatusCfg } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft,
  Layers,
  Users,
  Globe,
  Plus,
  MoreVertical,
  Archive,
  Trash2,
  Check,
  X,
  Search,
  GripVertical,
  FolderOpen,
  Link as LinkIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

export function SeriesView() {
  const { state, dispatch } = useAppState();
  const {
    series,
    activeSeriesId,
    epOrder,
    epArchived,
    epDeleted,
    epConfirmDel,
    dragEp,
    dragOverEp,
    editingSeriesTitle,
    seriesTitleDraft,
    seriesLangMenuOpen,
    seriesLangSearch,
  } = state;

  const sr = useMemo(() => series.find(s => s.id === activeSeriesId) || series[0], [series, activeSeriesId]);

  const [localLangSearch, setLocalLangSearch] = useState(seriesLangSearch);

  // Episode ordering
  const epOrderList = useMemo(() => {
    const base = sr.episodes.map(e => e.id);
    let order = epOrder[sr.id] || [...base];
    order = order.filter(id => base.includes(id));
    base.forEach(id => { if (!order.includes(id)) order.push(id); });
    return order;
  }, [sr, epOrder]);

  const epById = useMemo(() => Object.fromEntries(sr.episodes.map(e => [e.id, e])), [sr]);
  const visEpIds = epOrderList.filter(id => !epArchived[id] && !epDeleted[id]);

  const seriesLangChips = sr.langCodes.map(code => {
    const L = CATALOG.find(c => c.id === code);
    return { code: L?.code || code.toUpperCase(), name: L?.name || code };
  });

  const slq = localLangSearch.trim().toLowerCase();
  const seriesLangMenu = CATALOG
    .filter(L => !slq || L.name.toLowerCase().includes(slq) || L.code.toLowerCase().includes(slq))
    .map(L => {
      const on = sr.langCodes.includes(L.id);
      return {
        ...L,
        on,
        checkStyle: `flex-shrink-0 w-4 h-4 rounded-[5px] inline-flex items-center justify-center border-[1.5px] ${on ? 'border-accent bg-accent text-accent-foreground' : 'border-border bg-transparent'}`,
      };
    });

  const handleBackToProjects = () => {
    dispatch({ type: 'SET_VIEW', payload: 'projects' });
  };

  const handleToggleSeriesLang = (code: string) => {
    dispatch({
      type: 'UPDATE_SERIES',
      payload: {
        id: sr.id,
        updates: {
          langCodes: sr.langCodes.includes(code)
            ? sr.langCodes.filter(c => c !== code)
            : [...sr.langCodes, code],
        },
      },
    });
  };

  const handleCommitSeriesTitle = () => {
    const v = seriesTitleDraft.trim();
    if (v) {
      dispatch({
        type: 'UPDATE_SERIES',
        payload: { id: sr.id, updates: { name: v } },
      });
      dispatch({ type: 'SET_TOAST', payload: 'Series renamed' });
    }
    dispatch({ type: 'SET_EDITING_SERIES_TITLE', payload: false });
  };

  const handleEpDragStart = (id: string) => {
    dispatch({ type: 'SET_DRAG_EP', payload: id });
    dispatch({ type: 'SET_EP_CONFIRM_DEL', payload: null });
  };

  const handleEpDragEnd = () => {
    dispatch({ type: 'SET_DRAG_EP', payload: null });
    dispatch({ type: 'SET_DRAG_OVER_EP', payload: null });
  };

  const handleEpDragOver = (id: string) => {
    if (!dragEp || dragOverEp === id || id === dragEp) return;
    dispatch({ type: 'SET_DRAG_OVER_EP', payload: id });
  };

  const handleEpDrop = (id: string) => {
    if (!dragEp || dragEp === id) {
      dispatch({ type: 'SET_DRAG_EP', payload: null });
      dispatch({ type: 'SET_DRAG_OVER_EP', payload: null });
      return;
    }
    const order = [...epOrderList];
    const fi = order.indexOf(dragEp);
    if (fi < 0) return;
    order.splice(fi, 1);
    const ti = order.indexOf(id);
    order.splice(ti, 0, dragEp);
    dispatch({ type: 'SET_EP_ORDER', payload: { seriesId: sr.id, order } });
    dispatch({ type: 'SET_DRAG_EP', payload: null });
    dispatch({ type: 'SET_DRAG_OVER_EP', payload: null });
  };

  return (
    <div className="flex-1 min-h-0 overflow-auto scrolly">
      <div className="w-full max-w-[1180px] mx-auto p-6 flex flex-col gap-5">
        {/* Breadcrumb + Header */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <button onClick={handleBackToProjects} className="hover:text-foreground cursor-pointer">
              Projects
            </button>
            <ChevronLeft className="w-3.5 h-3.5 opacity-50 rotate-180" />
            <span className="text-foreground font-semibold">{sr.name}</span>
          </div>

          <div className="flex flex-wrap gap-4 items-start justify-between">
            <div className="flex gap-4 min-w-0">
              <span
                className="flex-shrink-0 w-14 h-14 rounded-[14px] text-[22px] font-bold inline-flex items-center justify-center"
                style={{
                  color: `oklch(0.45 0.13 ${sr.hue})`,
                  background: `oklch(0.93 0.06 ${sr.hue})`,
                }}
              >
                {(sr.name.trim()[0] || 'S').toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {!editingSeriesTitle ? (
                    <h1
                      onClick={() => {
                        dispatch({ type: 'SET_EDITING_SERIES_TITLE', payload: true });
                        dispatch({ type: 'SET_SERIES_TITLE_DRAFT', payload: sr.name });
                      }}
                      title="Click to rename series"
                      className="m-0 text-[25px] font-extrabold tracking-tight cursor-text rounded-lg px-1 -ml-1 hover:bg-secondary"
                    >
                      {sr.name}
                    </h1>
                  ) : (
                    <Input
                      value={seriesTitleDraft}
                      onChange={(e) => dispatch({ type: 'SET_SERIES_TITLE_DRAFT', payload: e.target.value })}
                      onBlur={handleCommitSeriesTitle}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCommitSeriesTitle();
                        if (e.key === 'Escape') dispatch({ type: 'SET_EDITING_SERIES_TITLE', payload: false });
                      }}
                      autoFocus
                      className="text-[25px] font-extrabold tracking-tight h-auto px-2 py-0.5 w-[420px] max-w-full"
                    />
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent bg-accent/12 px-2 py-0.5 rounded-full">
                    <Layers className="w-3 h-3" />
                    Series
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground max-w-[42em]">
                  Shared cast, languages & glossary below apply to every episode. Caption settings stay in sync across the series.
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[13px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 opacity-65" />
                    <strong className="text-foreground font-bold">{visEpIds.length}</strong> episodes
                  </span>
                  <span className="opacity-40">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 opacity-65" />
                    <strong className="text-foreground font-bold">{sr.speakers.length}</strong> speakers
                  </span>
                  <span className="opacity-40">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 opacity-65" />
                    <strong className="text-foreground font-bold">{seriesLangChips.length}</strong> languages
                  </span>
                </div>
              </div>
            </div>

            <Button onClick={() => {}} className="h-[42px] px-5 gap-2 rounded-[11px] flex-shrink-0">
              <Plus className="w-4 h-4" />
              New episode
            </Button>
          </div>
        </div>

        {/* Shared Speakers */}
        <section className="border rounded-2xl bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b">
            <span className="flex-shrink-0 inline-flex items-center justify-center w-[34px] h-[34px] rounded-[9px] bg-accent/12 text-accent">
              <Users className="w-[17px] h-[17px]" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[15.5px] font-semibold">Series speakers</div>
              <div className="text-xs text-muted-foreground mt-0.5">Shared speaker profiles applied to every episode in the series</div>
            </div>
            <Button
              variant="outline"
              onClick={() => dispatch({ type: 'SET_TOAST', payload: 'New speaker added to the series cast · available in every episode' })}
              className="h-[34px] px-3 gap-1.5 text-xs rounded-lg flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add speaker
            </Button>
          </div>

          {sr.speakers.length > 0 ? (
            sr.speakers.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center gap-3.5 px-5 py-3 border-b last:border-b-0 hover:bg-secondary/40 transition-colors"
                style={{ borderColor: 'color-mix(in oklch, var(--border) 55%, transparent)' }}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: colFor(c.hue) }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="text-[11.5px] text-muted-foreground mt-0.5">{c.meta}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-8 text-center">
              <div className="text-[13.5px] font-semibold">No speakers yet</div>
              <div className="text-xs text-muted-foreground mt-1">Add the first episode — its detected speakers become the shared cast.</div>
            </div>
          )}
        </section>

        {/* Languages + Glossary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Languages */}
          <section className="border rounded-2xl bg-card shadow-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[15px] font-semibold">Series languages</div>
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => dispatch({ type: 'SET_SERIES_LANG_MENU_OPEN', payload: !seriesLangMenuOpen })}
                  className="h-[30px] px-2.5 gap-1 text-xs rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>

                {seriesLangMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[240px] bg-card border rounded-[11px] shadow-lg p-2 animate-[pop_0.12s_ease-out]">
                    <div className="relative mb-1.5">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        value={localLangSearch}
                        onChange={(e) => setLocalLangSearch(e.target.value)}
                        placeholder="Search languages…"
                        className="h-[34px] pl-8 pr-2.5 text-xs rounded-lg"
                      />
                    </div>
                    <div className="max-h-[220px] overflow-y-auto flex flex-col gap-px">
                      {seriesLangMenu.map(L => (
                        <button
                          key={L.id}
                          onClick={() => handleToggleSeriesLang(L.id)}
                          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg cursor-pointer hover:bg-secondary text-left"
                        >
                          <span className={L.checkStyle}>
                            {L.on && <Check className="w-3 h-3" strokeWidth={3} />}
                          </span>
                          <span className="mono text-[9.5px] font-bold text-muted-foreground w-6 flex-shrink-0">
                            {L.code}
                          </span>
                          <span className="text-xs font-medium">{L.name}</span>
                        </button>
                      ))}
                      {seriesLangMenu.length === 0 && (
                        <div className="px-3.5 py-3.5 text-center text-xs text-muted-foreground">No languages match.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="m-0 mb-3 text-[11.5px] text-muted-foreground leading-relaxed">
              New languages become available for every episode to caption on demand.
            </p>
            <div className="flex flex-wrap gap-2">
              {seriesLangChips.map(l => (
                <span
                  key={l.code}
                  className="inline-flex items-center gap-1.5 h-8 px-3 border rounded-full bg-secondary text-xs font-medium"
                >
                  <span className="mono text-[9.5px] font-bold text-muted-foreground">{l.code}</span>
                  {l.name}
                </span>
              ))}
            </div>
          </section>

          {/* Glossary */}
          <section className="border rounded-2xl bg-card shadow-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[15px] font-semibold">Glossary & pronunciation</div>
              <Button
                variant="outline"
                onClick={() => dispatch({ type: 'SET_TOAST', payload: 'Glossary term added · applies across all episodes' })}
                className="h-[30px] px-2.5 gap-1 text-xs rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </Button>
            </div>
            <p className="m-0 mb-3 text-[11.5px] text-muted-foreground leading-relaxed">
              Recurring terms are spelled & translated consistently in every episode's captions.
            </p>
            <div className="flex flex-col gap-1.5">
              {sr.terms.length > 0 ? (
                sr.terms.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-2 border rounded-lg text-xs">
                    <span className="font-semibold">{t.term}</span>
                    <ChevronLeft className="w-3 h-3 text-muted-foreground opacity-60 flex-shrink-0 rotate-180" />
                    <span className="text-muted-foreground min-w-0 whitespace-nowrap overflow-hidden text-ellipsis">
                      {t.rule}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-3.5 py-3.5 text-center text-xs text-muted-foreground">No glossary terms yet.</div>
              )}
            </div>
          </section>
        </div>

        {/* Episodes */}
        <section className="border rounded-2xl bg-card shadow-sm overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b">
            <div className="text-[15.5px] font-semibold">Episodes</div>
            <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {visEpIds.length}
            </span>
            <span className="ml-auto text-[11.5px] text-muted-foreground">Drag to reorder</span>
          </div>

          {visEpIds.length > 0 ? (
            visEpIds.map((id, i) => {
              const e = epById[id];
              if (!e) return null;
              const sc = epStatusCfg(e.status);
              const isOver = dragOverEp === id && !!dragEp && dragEp !== id;

              return (
                <div
                  key={id}
                  draggable
                  onDragStart={() => handleEpDragStart(id)}
                  onDragEnd={handleEpDragEnd}
                  onDragOver={() => handleEpDragOver(id)}
                  onDrop={() => handleEpDrop(id)}
                  className="flex items-center gap-3 px-5 py-3 border-b last:border-b-0 transition-all"
                  style={{
                    background: dragEp === id ? 'color-mix(in oklch, var(--accent) 7%, var(--card))' : 'transparent',
                    boxShadow: isOver ? 'inset 0 2px 0 0 var(--accent)' : 'none',
                  }}
                >
                  <span
                    title="Drag to reorder"
                    className="flex-shrink-0 inline-flex items-center justify-center w-4 text-muted-foreground cursor-grab opacity-55"
                  >
                    <GripVertical className="w-4 h-4" />
                  </span>

                  <div
                    onClick={() => dispatch({ type: 'SET_TOAST', payload: `Opening "${e.title}" in the editor` })}
                    className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer"
                  >
                    <span className="mono flex-shrink-0 w-[34px] text-xs font-semibold text-muted-foreground">
                      E{String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                        {e.title}
                      </div>
                      <div className="text-[11.5px] text-muted-foreground mt-0.5">{e.meta}</div>
                    </div>
                  </div>

                  <span
                    title="Cast inherited from series"
                    className={`inline-flex items-center gap-1 flex-shrink-0 text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
                      e.override
                        ? 'text-[var(--amber)] bg-[var(--amber)]/13'
                        : 'text-muted-foreground bg-secondary'
                    }`}
                  >
                    <LinkIcon className="w-3 h-3" />
                    {e.override ? 'Custom cast' : 'From series'}
                  </span>

                  <span
                    className="inline-flex items-center gap-1 flex-shrink-0 text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ color: sc.c, background: `color-mix(in oklch, ${sc.c} 13%, transparent)` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.c }} />
                    {sc.label}
                  </span>

                  <span className="text-[11.5px] text-muted-foreground w-14 text-right flex-shrink-0">
                    {e.when}
                  </span>

                  {!epConfirmDel ? (
                    <div className="flex items-center gap-px flex-shrink-0">
                      <button
                        onClick={() => {
                          dispatch({ type: 'ARCHIVE_EP', payload: id });
                          dispatch({ type: 'SET_TOAST', payload: `"${e.title}" archived` });
                        }}
                        title="Archive episode"
                        className="inline-flex items-center justify-center w-7 h-7 border-none rounded-md bg-transparent text-muted-foreground cursor-pointer hover:bg-secondary hover:text-foreground"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          dispatch({ type: 'SET_EP_CONFIRM_DEL', payload: id });
                        }}
                        title="Remove from series"
                        className="inline-flex items-center justify-center w-7 h-7 border-none rounded-md bg-transparent text-muted-foreground cursor-pointer hover:bg-[var(--bad)]/12 hover:text-[var(--bad)]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[11px] font-semibold text-[var(--bad)] whitespace-nowrap">Remove?</span>
                      <button
                        onClick={() => {
                          dispatch({ type: 'DELETE_EP', payload: id });
                          dispatch({ type: 'SET_TOAST', payload: `"${e.title}" removed from series` });
                        }}
                        title="Confirm"
                        className="inline-flex items-center justify-center w-7 h-7 border-none rounded-md bg-[var(--bad)] text-white cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => dispatch({ type: 'SET_EP_CONFIRM_DEL', payload: null })}
                        title="Cancel"
                        className="inline-flex items-center justify-center w-7 h-7 border rounded-md bg-card text-muted-foreground cursor-pointer hover:bg-secondary hover:text-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center px-5 py-11 text-center">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl border bg-card mb-3">
                <Layers className="w-5 h-5 text-muted-foreground" />
              </span>
              <div className="text-sm font-semibold">No episodes yet</div>
              <div className="text-xs text-muted-foreground mt-1">Add an episode, or drag a project onto this series from the projects page.</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
