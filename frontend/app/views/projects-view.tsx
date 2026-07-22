'use client';

import { useAppState } from '@/app/hooks/use-app-state';
import { useProjects } from '@/app/hooks/use-projects';
import { useSeries } from '@/app/hooks/use-series';
import { projectsApi } from '@/app/lib/api';
import { CreateProjectDialog } from '@/app/components/create-project-dialog';
import { CreateSeriesDialog } from '@/app/components/create-series-dialog';
import { STATUSES, SORTS, TILES } from '@/app/data/initial-data';
import { colFor, statusColor, statusLabel, roleCfg } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FolderOpen,
  Plus,
  ChevronDown,
  User,
  Star,
  MoreVertical,
  Share2,
  Edit3,
  Archive,
  Trash2,
  X,
  Video,
  Layers,
  Search,
  Globe,
  Loader2,
} from 'lucide-react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function ProjectsView() {
  const { state, dispatch } = useAppState();
  const router = useRouter();
  const {
    search,
    tab,
    status,
    sort,
    inSeries,
    cardMenuFor,
    confirmDelId,
    newMenuOpen,
    dialogOpen,
    seriesDialogOpen,
  } = state;

  const [localSearch, setLocalSearch] = useState(search);
  const [showArchived, setShowArchived] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);
  const [createStatus, setCreateStatus] = useState<string | undefined>(undefined);

  // API integration for projects - memoize options to prevent unnecessary re-fetches
  const projectOptions = useMemo(() => ({
    search: localSearch || undefined,
    status: status || undefined,
    archived: showArchived || undefined,
    sort_by: sort === 'modified' ? 'updated_at' : sort === 'created' ? 'created_at' : 'name',
    sort_order: 'desc',
  }), [localSearch, status, showArchived, sort]);

  const {
    projects: apiProjects,
    total,
    isLoading,
    error,
    refetch,
    toggleFavorite: apiToggleFavorite,
    toggleArchive: apiToggleArchive,
    deleteProject: apiDeleteProject,
    duplicateProject: apiDuplicateProject,
    createProject,
  } = useProjects(projectOptions);

  // API integration for series - memoize options
  const seriesOptions = useMemo(() => ({
    archived: false,
    sort_by: 'updated_at',
    sort_order: 'desc',
  }), []);

  const {
    series: seriesList,
    createSeries,
  } = useSeries(seriesOptions);

  // Transform API projects to match expected format
  const projects = useMemo(() => {
    return apiProjects.map((p, index) => ({
      ...p,
      tile: p.tile || TILES[index % TILES.length],
      desc: p.description || '',
      langs: p.langs || 1,
      dur: p.duration_display || '0:00',
      updated: p.updated || 'Just now',
      ts: new Date(p.updated_at).getTime(),
    }));
  }, [apiProjects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    let list = projects.filter(p => !inSeries[p.id]);

    if (tab === 'mine') list = list.filter(p => p.role === 'owner');
    else if (tab === 'fav') list = list.filter(p => p.is_favorite);

    if (!showArchived) {
      list = list.filter(p => !p.is_archived);
    }

    if (q) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false)
      );
    }

    return list;
  }, [projects, tab, localSearch, inSeries, showArchived]);

  const ownedCount = projects.filter(p => p.role === 'owner' && !p.is_archived && !inSeries[p.id]).length;

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    dispatch({ type: 'SET_SEARCH', payload: e.target.value });
  };

  const handleNewProject = () => {
    dispatch({ type: 'SET_NEW_MENU_OPEN', payload: false });
    dispatch({ type: 'SET_DIALOG_OPEN', payload: true });
  };

  const handleNewSeries = () => {
    dispatch({ type: 'SET_NEW_MENU_OPEN', payload: false });
    dispatch({ type: 'SET_SERIES_DIALOG_OPEN', payload: true });
  };

  // API handlers
  const handleToggleFavorite = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiToggleFavorite(id);
      dispatch({ type: 'SET_TOAST', payload: 'Favorite updated' });
    } catch {
      dispatch({ type: 'SET_TOAST', payload: 'Failed to update favorite' });
    }
  }, [apiToggleFavorite, dispatch]);

  const handleToggleArchive = useCallback(async (id: string) => {
    try {
      await apiToggleArchive(id);
      dispatch({ type: 'SET_TOAST', payload: 'Archive status updated' });
    } catch {
      dispatch({ type: 'SET_TOAST', payload: 'Failed to update archive' });
    }
  }, [apiToggleArchive, dispatch]);

  const handleDelete = useCallback(async (id: string, permanent?: boolean) => {
    try {
      await apiDeleteProject(id, permanent);
      dispatch({ type: 'DELETE_PROJECT', payload: id });
      dispatch({ type: 'SET_TOAST', payload: permanent ? 'Project permanently deleted' : 'Project moved to trash' });
    } catch {
      dispatch({ type: 'SET_TOAST', payload: 'Failed to delete project' });
    }
  }, [apiDeleteProject, dispatch]);

  const handleDuplicate = useCallback(async (id: string) => {
    try {
      await apiDuplicateProject(id);
      dispatch({ type: 'SET_TOAST', payload: 'Project duplicated' });
    } catch {
      dispatch({ type: 'SET_TOAST', payload: 'Failed to duplicate project' });
    }
  }, [apiDuplicateProject, dispatch]);

  const handleOpenProject = (project: typeof projects[0]) => {
    dispatch({ type: 'SET_ACTIVE_PROJECT', payload: project });
  };

  const handleCreateProject = useCallback(async (data: {
    name: string;
    description?: string;
    source_language: string;
    series_id?: string;
    file: File;
  }) => {
    setCreateProgress(0);
    setCreateStatus('uploading');

    try {
      // Create the project and upload the media file
      const project = await createProject(
        {
          name: data.name,
          description: data.description,
          source_language: data.source_language,
          series_id: data.series_id,
          file: data.file,
        },
        (progress) => {
          setCreateProgress(progress);
          setCreateStatus('uploading');
        }
      );

      // Start transcription using the saved file path
      setCreateStatus('transcribing');
      setCreateProgress(100);
      await projectsApi.transcribe(project.id);

      dispatch({ type: 'SET_TOAST', payload: `Project created · ${data.name}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      dispatch({ type: 'SET_TOAST', payload: message });
      throw err;
    } finally {
      setCreateProgress(0);
      setCreateStatus(undefined);
    }
  }, [createProject, dispatch]);

  const handleCreateSeries = useCallback(async (data: {
    name: string;
    description?: string;
  }) => {
    await createSeries(data);
    dispatch({ type: 'SET_TOAST', payload: `Series created · ${data.name}` });
    // Optionally navigate to series view
    // dispatch({ type: 'SET_VIEW', payload: 'series' });
  }, [createSeries, dispatch]);

  // Poll job status for projects with active transcription jobs
  // const activeProjectIdsStr = useMemo(
  //   () =>
  //     projects
  //       .filter(
  //         p =>
  //           p.job_status === "uploading" ||
  //           p.job_status === "transcribing"
  //       )
  //       .map(p => p.id)
  //       .sort()
  //       .join(","),
  //   [projects]
  // );

  // useEffect(() => {
  //   console.log("Polling effect", activeProjectIdsStr);


  //   if (!activeProjectIdsStr) return;

  //   const poll = async () => {
  //     console.log("poll", new Date().toLocaleTimeString());
  //     await refetch();
  //   };

  //   poll();

  //   const interval = setInterval(poll, 3000);

  //   return () => clearInterval(interval);
  // }, [activeProjectIdsStr, refetch]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load projects</p>
          <Button onClick={() => router.refresh()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto scrolly">
      <div className="w-full max-w-[1240px] mx-auto p-6 flex flex-col gap-6">
        {/* Welcome Header */}
        <section className="border rounded-2xl bg-card p-6 shadow-sm">
          <div className="flex flex-wrap gap-5 items-start justify-between">
            <div className="min-w-0">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Home
              </p>
              <h1 className="m-0 text-[30px] font-extrabold tracking-tight leading-tight">
                Welcome back
              </h1>
              <p className="mt-3 text-[15px] text-muted-foreground max-w-[34em]">
                Open a caption project, fine-tune timing on the waveform, or start a new one.
              </p>
            </div>
            <div className="flex gap-2.5 flex-shrink-0 items-start">
              <Button
                variant="outline"
                onClick={() => dispatch({ type: 'SET_VIEW', payload: 'assets' })}
                className="h-11 px-5 gap-2 rounded-[11px]"
              >
                <FolderOpen className="w-4 h-4" />
                Assets
              </Button>
              <DropdownMenu
                open={newMenuOpen}
                onOpenChange={(open) => dispatch(open ? { type: 'TOGGLE_MENU', payload: 'newMenuOpen' } : { type: 'CLOSE_MENUS' })}
              >
                <DropdownMenuTrigger className="h-11 px-5 gap-2 rounded-[11px] inline-flex items-center justify-center bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                  <Plus className="w-4 h-4" />
                  New
                  <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform ${newMenuOpen ? 'rotate-180' : ''}`} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[268px] p-2">
                  <DropdownMenuItem onClick={handleNewProject} className="flex items-center gap-3 p-3 rounded-[10px] cursor-pointer">
                    <span className="flex-shrink-0 inline-flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-accent/12 text-accent">
                      <Video className="w-5 h-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">New project</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">A single video to caption</span>
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleNewSeries} className="flex items-center gap-3 p-3 rounded-[10px] cursor-pointer">
                    <span className="flex-shrink-0 inline-flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-accent/12 text-accent">
                      <Layers className="w-5 h-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">New series</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">Episodes that share a cast</span>
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-5 text-[13.5px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="w-4 h-4 opacity-70" />
              <strong className="text-foreground font-bold">{total}</strong> projects
            </span>
            <span className="opacity-40">·</span>
            <span className="inline-flex items-center gap-1.5">
              <User className="w-4 h-4 opacity-70" />
              <strong className="text-foreground font-bold">{ownedCount}</strong> created by you
            </span>
            <span className="opacity-40">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="w-4 h-4 opacity-70" />
              <strong className="text-foreground font-bold">5</strong> caption languages
            </span>
          </div>
        </section>

        {/* Filter Bar */}
        <section className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px] max-w-[360px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={localSearch}
              onChange={handleSearch}
              className="pl-9 h-10"
            />
          </div>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger className="h-10 px-3 border rounded-lg inline-flex items-center gap-2 bg-background hover:bg-accent/50 transition-colors">
              <span className="text-sm">{status ? STATUSES.find(s => s.k === status)?.label : 'All statuses'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => dispatch({ type: 'SET_STATUS', payload: '' })}>
                All statuses
              </DropdownMenuItem>
              {STATUSES.map(s => (
                <DropdownMenuItem key={s.k} onClick={() => dispatch({ type: 'SET_STATUS', payload: s.k })}>
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger className="h-10 px-3 border rounded-lg inline-flex items-center gap-2 bg-background hover:bg-accent/50 transition-colors">
              <span className="text-sm">{SORTS.find(s => s.k === sort)?.label}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SORTS.map(s => (
                <DropdownMenuItem key={s.k} onClick={() => dispatch({ type: 'SET_SORT', payload: s.k as "modified" | "created" | "name" })}>
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Archived Toggle */}
          <Button
            variant={showArchived ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className="h-10"
          >
            <Archive className="w-4 h-4 mr-2" />
            Archived
          </Button>
        </section>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        )}

        {/* Projects Grid */}
        {!isLoading && (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => {
              const isMenuOpen = cardMenuFor === project.id;
              const isConfirmDelete = confirmDelId === project.id;
              const tileBg = `color-mix(in oklch, ${colFor(project.tile)} 18%, transparent)`;
              const tileColor = colFor(project.tile);

              return (
                <div
                  key={project.id}
                  onClick={() => handleOpenProject(project)}
                  className="group relative border rounded-xl bg-card p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  {/* Card Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <span
                      className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                      style={{ background: tileBg, color: tileColor }}
                    >
                      {project.initial}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">{project.desc || project.description}</p>
                    </div>
                    <DropdownMenu
                      open={isMenuOpen}
                      onOpenChange={(open) => dispatch(open ? { type: 'SET_CARD_MENU', payload: project.id } : { type: 'CLOSE_MENUS' })}
                    >
                      <DropdownMenuTrigger
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-accent/50 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenProject(project); }}>
                          <Edit3 className="w-4 h-4 mr-2" />
                          Open
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(project.id); }}>
                          <Share2 className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleToggleFavorite(project.id, e)}>
                          <Star className={`w-4 h-4 mr-2 ${project.is_favorite ? 'fill-current' : ''}`} />
                          {project.is_favorite ? 'Unfavorite' : 'Favorite'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleArchive(project.id); }}>
                          <Archive className="w-4 h-4 mr-2" />
                          {project.is_archived ? 'Unarchive' : 'Archive'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_CONFIRM_DEL', payload: project.id }); }}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Card Meta */}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: statusColor(project.status), color: 'white' }}
                    >
                      {project.job_status === 'uploading'
                        ? 'Uploading...'
                        : project.job_status === 'transcribing'
                          ? 'Transcribing...'
                          : statusLabel(project.status)}
                    </span>
                    {(project.job_status === 'uploading' || project.job_status === 'transcribing') && (
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden max-w-[80px]">
                        <div
                          className="h-full bg-accent transition-all duration-500"
                          style={{ width: `${Math.max(5, project.job_progress ?? 0)}%` }}
                        />
                      </div>
                    )}
                    <span>{project.langs} languages</span>
                    <span>·</span>
                    <span>{project.dur}</span>
                    <span className="ml-auto">{project.updated}</span>
                  </div>

                  {/* Confirm Delete Overlay */}
                  {isConfirmDelete && (
                    <div className="absolute inset-0 bg-background/95 rounded-xl flex flex-col items-center justify-center gap-3 p-4" onClick={(e) => e.stopPropagation()}>
                      <p className="text-sm font-medium">Delete this project?</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => dispatch({ type: 'SET_CONFIRM_DEL', payload: null })}>
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(project.id)}>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* Empty State */}
        {!isLoading && filteredProjects.length === 0 && (
          <div className="text-center py-20">
            <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-2">No projects found</p>
            <p className="text-sm text-muted-foreground/70">
              {localSearch ? 'Try a different search term' : 'Create your first project to get started'}
            </p>
          </div>
        )}

        {/* Create Project Dialog */}
        <CreateProjectDialog
          open={dialogOpen}
          onOpenChange={(open) => dispatch({ type: 'SET_DIALOG_OPEN', payload: open })}
          onCreate={handleCreateProject}
          series={seriesList.map(s => ({ id: s.id, name: s.name }))}
          progress={createProgress}
          status={createStatus}
        />

        {/* Create Series Dialog */}
        <CreateSeriesDialog
          open={seriesDialogOpen}
          onOpenChange={(open) => dispatch({ type: 'SET_SERIES_DIALOG_OPEN', payload: open })}
          onCreate={handleCreateSeries}
        />
      </div>
    </div>
  );
}
