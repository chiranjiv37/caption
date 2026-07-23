'use client';

import { useAppState } from '@/app/hooks/use-app-state';
import { useAuth } from '@/app/hooks/use-auth';
import { useProjects } from '@/app/hooks/use-projects';
import { CATALOG } from '@/app/data/initial-data';
import { colFor } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  FolderOpen,
  Globe,
  ChevronDown,
  Link as LinkIcon,
  Moon,
  Settings,
  LogOut,
  LayoutGrid,
  Check,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect } from 'react';

export function TopBar() {
  const { state, dispatch } = useAppState();
  const { user, logout } = useAuth();
  const router = useRouter();
  const { view, theme, tier, activeProject, activeLangs, lang, segments, transcripts } = state;
  const { projects } = useProjects({ per_page: 50, sort_by: 'updated_at', sort_order: 'desc' });

  const activeLangName = CATALOG.find(l => l.id === lang)?.name || lang?.toUpperCase() || 'Language';
  const activeLangObjs = activeLangs
    .map(id => CATALOG.find(c => c.id === id) || { id, code: id.toUpperCase(), name: id.toUpperCase() });

  const langProgress = (langId: string): number => {
    const t = transcripts.find(
      tr => tr.language_code === langId && (tr.type === 'original' || tr.type === 'translated'),
    ) || transcripts.find(tr => tr.language_code === langId);
    if (!t) return 0;
    if (t.status === 'ready' || t.status === 'completed' || t.status === 'captioned') return 100;
    if (langId === lang && segments.length > 0) return 100;
    if (t.status === 'processing' || t.status === 'pending') return 45;
    return segments.length > 0 && langId === lang ? 100 : 70;
  };

  // Get user initials
  const userInitials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'AR';

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Close menus on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch({ type: 'CLOSE_MENUS' });
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [dispatch]);

  const handleBackToProjects = () => {
    dispatch({ type: 'SET_PLAYING', payload: false });
    dispatch({ type: 'SET_VIEW', payload: 'projects' });
    dispatch({ type: 'CLOSE_MENUS' });
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      dispatch({ type: 'SET_TOAST', payload: 'Shareable link copied' });
    } catch {
      dispatch({ type: 'SET_TOAST', payload: 'Could not copy link' });
    }
  };

  const handleToggleTheme = () => {
    dispatch({ type: 'SET_THEME', payload: theme === 'dark' ? 'light' : 'dark' });
  };

  const handlePickProject = (project: typeof projects[0]) => {
    dispatch({ type: 'SET_ACTIVE_PROJECT', payload: project });
    dispatch({ type: 'CLOSE_MENUS' });
  };

  const handlePickLang = (langId: string) => {
    dispatch({ type: 'SET_LANG', payload: langId });
  };

  const projItems = projects.map(p => ({
    ...p,
    active: p.id === activeProject?.id,
    rowBg: p.id === activeProject?.id ? 'bg-accent/10' : 'transparent',
    tileBg: `color-mix(in oklch, ${colFor(p.tile)} 18%, transparent)`,
    tileColor: colFor(p.tile),
  }));

  const langRows = activeLangObjs.map(l => {
    const pct = langProgress(l.id);
    return {
      ...l,
      active: l.id === lang,
      rowBg: l.id === lang ? 'bg-accent/10' : 'transparent',
      pct,
      pctLabel: `${pct}%`,
    };
  });

  return (
    <header
      className={`flex-shrink-0 z-40 border-b ${
        view === 'editor' ? 'bg-card' : 'bg-[var(--topbar)]'
      }`}
    >
      <div
        className={
          view === 'editor'
            ? 'px-4 py-2 flex items-center gap-0'
            : 'max-w-[1240px] mx-auto w-full px-6 py-3 flex items-center gap-0'
        }
      >
        {/* Logo */}
        <button
          onClick={handleBackToProjects}
          className="flex flex-col items-end leading-tight no-underline flex-shrink-0 cursor-pointer"
          title="All projects"
        >
          {/* <span className="text-sm font-semibold tracking-wide">Platy Studio</span>
          <span className="flex items-baseline -mt-0.5 mr-[3px] italic text-accent text-sm tracking-wide">
            Caption
            <span className="not-italic opacity-80 ml-1.5 self-center flex items-center gap-1">
              <span className="text-[9px]">·</span>
              <span className="text-[7px] font-semibold uppercase tracking-wider">beta</span>
            </span>
          </span> */}
          <a href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/logo-text.png`} alt="Platy Studio" height={24} className="h-6 w-auto invert dark:invert-0" />
            <span className="hidden text-[22px] font-normal italic tracking-[0.035em] text-accent sm:inline">Caption</span>
          </a>
        </button>

        {/* Editor Navigation */}
        {view === 'editor' && activeProject && (
          <>
            <span className="mx-2.5 text-border text-xl font-light">/</span>

            {/* Project Name + Switcher */}
            <div className="relative min-w-0 flex-shrink flex items-center gap-0">
              <span className="inline-flex items-center gap-1.5 flex-shrink-0 h-8 px-2 py-0 rounded-lg max-w-[230px]">
                <FolderOpen className="w-4 h-4 text-accent flex-shrink-0" />
                <span className="text-[13.5px] font-medium text-accent whitespace-nowrap">Captions</span>
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-50 flex-shrink-0 mx-0.5" />

              <DropdownMenu open={state.projMenuOpen} onOpenChange={(open) => dispatch(open ? { type: 'TOGGLE_MENU', payload: 'projMenuOpen' } : { type: 'CLOSE_MENUS' })}>
                <DropdownMenuTrigger>
                  <div className="inline-flex items-center gap-1.5 h-8 px-2 border-none rounded-lg bg-transparent cursor-pointer min-w-0 max-w-[320px] hover:bg-secondary">
                    <span className="text-[13.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis text-foreground">
                      {activeProject.name}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[336px] p-2">
                  <p className="mx-2 my-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Switch project
                  </p>
                  <div className="max-h-[300px] overflow-auto">
                    {projItems.map(p => (
                      <DropdownMenuItem
                        key={p.id}
                        onClick={() => handlePickProject(p)}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer ${p.rowBg}`}
                      >
                        <span
                          className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 text-xs font-bold"
                          style={{ background: p.tileBg, color: p.tileColor }}
                        >
                          {p.initial}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                            {p.name}
                          </span>
                          <span className="block text-[11px] text-muted-foreground mt-0.5">
                            {p.langs} languages · {p.dur}
                          </span>
                        </span>
                        {p.active && <Check className="w-4 h-4 text-accent flex-shrink-0" />}
                      </DropdownMenuItem>
                    ))}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleBackToProjects} className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer">
                    <LayoutGrid className="w-4 h-4" />
                    Browse all projects
                    <ChevronDown className="w-3.5 h-3.5 ml-auto text-muted-foreground rotate-[-90deg]" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Language Switcher */}
            <div className="relative flex-shrink-0">
              <DropdownMenu open={state.topLangOpen} onOpenChange={(open) => dispatch(open ? { type: 'TOGGLE_MENU', payload: 'topLangOpen' } : { type: 'CLOSE_MENUS' })}>
                <DropdownMenuTrigger>
                  <div className="inline-flex items-center gap-1.5 h-8 px-2.5 border-none rounded-lg bg-transparent cursor-pointer font-inherit hover:bg-secondary">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-[13px] font-medium text-foreground">{activeLangName}</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[300px] p-2">
                  <p className="mx-2 my-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Working language
                  </p>
                  <div className="max-h-[380px] overflow-auto flex flex-col gap-0.5">
                    {langRows.length === 0 ? (
                      <p className="px-2 py-3 text-[12px] text-muted-foreground">No languages yet</p>
                    ) : (
                      langRows.map(l => (
                        <DropdownMenuItem
                          key={l.id}
                          onClick={() => handlePickLang(l.id)}
                          className={`flex items-center gap-2.5 w-full px-2 py-2 rounded-lg cursor-pointer ${l.rowBg}`}
                        >
                          <span className="mono text-[10px] font-bold text-muted-foreground w-5">
                            {l.code}
                          </span>
                          <span className="flex-1 text-left min-w-0 text-[13px] font-semibold text-foreground">
                            {l.name}
                          </span>
                          <span className="w-[46px] h-1 rounded-full overflow-hidden flex-shrink-0 bg-muted-foreground/20">
                            <span
                              className="block h-full rounded-full bg-[var(--ok)]"
                              style={{ width: `${l.pct}%` }}
                            />
                          </span>
                          <span className="mono text-[10.5px] text-muted-foreground w-[38px] text-right">
                            {l.pctLabel}
                          </span>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      dispatch({ type: 'CLOSE_MENUS' });
                      dispatch({ type: 'SET_ADD_LANG_OPEN', payload: true });
                    }}
                    className="flex items-center gap-2 w-full px-2 py-2 rounded-lg cursor-pointer text-accent font-semibold"
                  >
                    <span className="w-4 h-4 flex items-center justify-center">+</span>
                    Add another language
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Copy URL */}
            <button
              onClick={handleCopyUrl}
              title="Copy shareable URL"
              className="inline-flex items-center justify-center w-6 h-6 border-none rounded-md bg-transparent text-muted-foreground cursor-pointer flex-shrink-0 hover:bg-secondary hover:text-foreground"
            >
              <LinkIcon className="w-3 h-3" />
            </button>
          </>
        )}

        <div className="flex-1" />

        {/* Tier Toggle + User Menu */}
        <div className="relative flex-shrink-0 flex items-center gap-2.5">
          {/* Tier Toggle */}
          <div
            className="flex gap-0.5 p-0.5 rounded-lg"
            style={{ background: 'color-mix(in oklch, var(--foreground) 5%, transparent)' }}
            title="Preview the experience for each plan tier"
          >
            <button
              onClick={() => dispatch({ type: 'SET_TIER', payload: 'lite' })}
              className={`h-[26px] px-3 border-none rounded-md font-inherit text-xs font-semibold cursor-pointer transition-all ${
                tier === 'lite'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'bg-transparent text-muted-foreground'
              }`}
            >
              Lite
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_TIER', payload: 'pro' })}
              className={`h-[26px] px-3 border-none rounded-md font-inherit text-xs font-semibold cursor-pointer transition-all ${
                tier === 'pro'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'bg-transparent text-muted-foreground'
              }`}
            >
              Pro
            </button>
          </div>

          {/* User Menu */}
          <DropdownMenu open={state.userMenuOpen} onOpenChange={(open) => dispatch(open ? { type: 'TOGGLE_MENU', payload: 'userMenuOpen' } : { type: 'CLOSE_MENUS' })}>
            <DropdownMenuTrigger>
              <div
                title={`${user?.credits_remaining || 0} of ${user?.credits_total || 0} credits remaining`}
                className="flex items-center gap-1 border-none bg-none cursor-pointer p-0.5 rounded-full"
              >
                <span className="relative w-9 h-9 flex-shrink-0 inline-flex items-center justify-center">
                  <svg width="36" height="36" viewBox="0 0 38 38" className="absolute inset-0 block">
                    <circle
                      cx="19"
                      cy="19"
                      r="17"
                      fill="none"
                      stroke="color-mix(in oklch, var(--muted-foreground) 18%, transparent)"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="19"
                      cy="19"
                      r="17"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="45.9 106.8"
                      transform="rotate(-90 19 19)"
                    />
                  </svg>
                  <span className="w-[27px] h-[27px] rounded-full bg-accent/20 text-accent inline-flex items-center justify-center text-[10.5px] font-semibold">
                    {userInitials}
                  </span>
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[286px] p-0 overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center gap-3">
                <span className="w-[38px] h-[38px] rounded-full bg-accent/20 border border-accent/30 text-accent inline-flex items-center justify-center text-[13px] font-semibold flex-shrink-0">
                  {userInitials}
                </span>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    {user?.email || 'user@example.com'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{user?.organization || 'Personal Account'}</div>
                </div>
              </div>
              <div className="p-2">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="flex items-center gap-2.5 text-[13px] font-medium text-foreground">
                    <Moon className="w-4 h-4 text-muted-foreground" />
                    Dark mode
                  </span>
                  <button
                    onClick={handleToggleTheme}
                    role="switch"
                    className={`relative w-10 h-6 rounded-full border-none cursor-pointer transition-colors ${
                      theme === 'dark' ? 'bg-accent' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span
                      className="absolute top-[3px] w-[17px] h-[17px] rounded-full bg-white shadow-sm transition-all"
                      style={{ left: theme === 'dark' ? '20px' : '3px' }}
                    />
                  </button>
                </div>
                <DropdownMenuItem className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  Workspace settings
                </DropdownMenuItem>
              </div>
              <div className="border-t p-1">
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-[var(--bad)]"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
