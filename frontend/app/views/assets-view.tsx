'use client';

import { useAppState } from '@/app/hooks/use-app-state';
import { CATALOG } from '@/app/data/initial-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft,
  FolderOpen,
  Download,
  Search,
  ChevronRight,
  Video,
  FileText,
  Globe,
  Layers,
} from 'lucide-react';
import { useMemo, useState } from 'react';

export function AssetsView() {
  const { state, dispatch } = useAppState();
  const { assetPath, assetSearch, projects, series } = state;

  const [localSearch, setLocalSearch] = useState(assetSearch);

  // Build asset model
  const assetModel = useMemo(() => {
    const langName = (c: string) => (CATALOG.find(x => x.id === c) || { name: c }).name;

    const originalFolder = () => ({
      type: 'folder' as const,
      kind: 'original',
      name: 'Source',
      meta: 'Uploaded files',
      children: {
        video: { type: 'file' as const, kind: 'video', name: 'source.mp4', meta: 'MP4 · 412 MB · 48:12' },
        transcript: { type: 'file' as const, kind: 'txt', name: 'transcript.txt', meta: 'TXT · 1,284 words' },
      },
    });

    const capLangFolder = (c: string, outdated: boolean) => ({
      type: 'folder' as const,
      kind: 'lang',
      name: langName(c),
      meta: 'Caption tracks',
      flagged: outdated,
      children: {
        srt: { type: 'file' as const, kind: 'srt', name: `captions.${c}.srt`, meta: 'SRT · 544 cues', badge: outdated ? 'outdated' : 'fresh' },
        vtt: { type: 'file' as const, kind: 'vtt', name: `captions.${c}.vtt`, meta: 'WebVTT · 544 cues' },
        txt: { type: 'file' as const, kind: 'txt', name: `transcript.${c}.txt`, meta: 'TXT · translated' },
        burned: { type: 'file' as const, kind: 'video', name: `burned-in.${c}.mp4`, meta: 'MP4 · 1080p · 1.2 GB' },
      },
    });

    const captionsFolder = (codes: string[]) => {
      const kids: Record<string, unknown> = {};
      codes.forEach((c, i) => {
        kids[langName(c)] = capLangFolder(c, i === codes.length - 1 && codes.length > 2);
      });
      return { type: 'folder' as const, kind: 'generated', name: 'Captions', meta: `${codes.length} languages`, children: kids };
    };

    const projFolder = (name: string, codes: string[]) => ({
      type: 'folder' as const,
      kind: 'project',
      name,
      meta: 'Source + captions',
      children: { Source: originalFolder(), Captions: captionsFolder(codes) },
    });

    const epFolder = (name: string, codes: string[]) => ({
      type: 'folder' as const,
      kind: 'episode',
      name,
      meta: 'Source + captions',
      children: { Source: originalFolder(), Captions: captionsFolder(codes) },
    });

    const seriesFolder = (sr: typeof series[0]) => {
      const kids: Record<string, unknown> = {};
      sr.episodes.forEach((e, i) => {
        const label = `E${String(i + 1).padStart(2, '0')} · ${e.title}`;
        kids[label] = epFolder(label, sr.langCodes);
      });
      return { type: 'folder' as const, kind: 'series', name: sr.name, meta: `Series · ${sr.episodes.length} episodes`, children: kids };
    };

    const children: Record<string, unknown> = {};
    series.forEach(sr => { children[sr.name] = seriesFolder(sr); });
    projects.slice(0, 4).forEach(p => {
      const codes = ['en', 'es', 'fr', 'de', 'ja'].slice(0, p.langs || 1);
      children[p.name] = projFolder(p.name, codes);
    });

    return { type: 'folder' as const, kind: 'root', name: 'Library', meta: '', children };
  }, [projects, series]);

  // Navigate to node at path
  const assetNodeAt = (path: string[]) => {
    let n: unknown = assetModel;
    for (let i = 1; i < path.length; i++) {
      if (!n || typeof n !== 'object' || !('children' in n)) return null;
      const node = n as { children: Record<string, unknown> };
      const key = Object.keys(node.children).find(k => {
        const child = node.children[k] as { name: string };
        return child.name === path[i];
      });
      if (!key) return null;
      n = node.children[key];
    }
    return n as { type: string; kind: string; name: string; meta: string; flagged?: boolean; children?: Record<string, unknown> } | null;
  };

  const aNode = assetNodeAt(assetPath) || assetModel;
  const aq = localSearch.trim().toLowerCase();

  // Get folders and files at current level
  const aFolderNodes = useMemo(() => {
    if (!aNode.children) return [];
    const folders = Object.values(aNode.children).filter((c: unknown) => {
      const node = c as { type: string; name: string };
      return node.type === 'folder' && (!aq || node.name.toLowerCase().includes(aq));
    });
    return folders as Array<{ type: string; kind: string; name: string; meta: string; flagged?: boolean; children?: Record<string, unknown> }>;
  }, [aNode, aq]);

  const aFileNodes = useMemo(() => {
    if (!aNode.children) return [];
    const files = Object.values(aNode.children).filter((c: unknown) => {
      const node = c as { type: string; name: string };
      return node.type === 'file' && (!aq || node.name.toLowerCase().includes(aq));
    });
    return files as Array<{ type: string; kind: string; name: string; meta: string; badge?: string }>;
  }, [aNode, aq]);

  const handleGoTo = (idx: number) => {
    dispatch({ type: 'SET_ASSET_PATH', payload: assetPath.slice(0, idx + 1) });
  };

  const handleOpenFolder = (name: string) => {
    dispatch({ type: 'SET_ASSET_PATH', payload: [...assetPath, name] });
  };

  const iconColor = (kind: string) => {
    switch (kind) {
      case 'series':
      case 'project':
      case 'episode':
      case 'lang':
        return 'var(--accent)';
      case 'original':
        return 'var(--amber)';
      case 'video':
        return 'var(--accent)';
      default:
        return 'var(--muted-foreground)';
    }
  };

  const FileIcon = ({ kind }: { kind: string }) => {
    switch (kind) {
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'srt':
      case 'vtt':
      case 'txt':
        return <FileText className="w-5 h-5" />;
      case 'lang':
        return <Globe className="w-5 h-5" />;
      default:
        return <FolderOpen className="w-5 h-5" />;
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-auto scrolly">
      <div className="w-full max-w-[1280px] mx-auto p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-wrap gap-3.5 items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <button onClick={() => dispatch({ type: 'SET_VIEW', payload: 'projects' })} className="hover:text-foreground cursor-pointer">
                Projects
              </button>
              <ChevronLeft className="w-3.5 h-3.5 opacity-50 rotate-180" />
              <span className="text-foreground font-semibold">Asset Library</span>
            </div>
            <h1 className="m-0 text-[26px] font-extrabold tracking-tight">Asset Library</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Every uploaded source and generated caption track, organized by project, series & language.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => dispatch({ type: 'SET_TOAST', payload: `Preparing "${assetPath[assetPath.length - 1]}" as a .zip…` })}
            className="h-10 px-4 gap-1.5 rounded-[10px]"
          >
            <Download className="w-4 h-4" />
            Download folder
          </Button>
        </div>

        {/* Breadcrumb + Search */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0 flex items-center gap-1 flex-wrap">
            {assetPath.map((seg, i) => (
              <>
                <button
                  key={i}
                  onClick={() => handleGoTo(i)}
                  className={`inline-flex items-center gap-1.5 h-[30px] px-2 border-none rounded-lg bg-transparent cursor-pointer font-inherit text-[13px] whitespace-nowrap max-w-[240px] overflow-hidden text-ellipsis ${
                    i === assetPath.length - 1 ? 'font-bold text-foreground' : 'font-medium text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {i === 0 && <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />}
                  {seg}
                </button>
                {i < assetPath.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-50 flex-shrink-0" />
                )}
              </>
            ))}
          </div>

          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                dispatch({ type: 'SET_ASSET_SEARCH', payload: e.target.value });
              }}
              placeholder="Search this folder…"
              className="h-9 w-[220px] max-w-[46vw] pl-9 pr-3 rounded-full text-xs"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-4 items-stretch min-h-[420px]">
          {/* Tree Sidebar */}
          <div className="w-[236px] flex-shrink-0 border rounded-[14px] bg-card p-2 overflow-y-auto max-h-[560px] scrolly">
            <button
              onClick={() => handleGoTo(0)}
              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg cursor-pointer text-xs font-semibold ${
                assetPath.length === 1 ? 'bg-accent/10 text-foreground' : 'text-foreground hover:bg-secondary'
              }`}
            >
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-55 rotate-90" />
              <Layers className="w-4 h-4 flex-shrink-0 text-accent" />
              <span className="flex-1 min-w-0 text-left whitespace-nowrap overflow-hidden text-ellipsis">Library</span>
            </button>

            {Object.entries(assetModel.children).map(([k, v]) => {
              const node = v as { name: string; kind: string };
              const onPath = assetPath[1] === k;
              const c = iconColor(node.kind);
              return (
                <button
                  key={k}
                  onClick={() => dispatch({ type: 'SET_ASSET_PATH', payload: ['Library', k] })}
                  className={`flex items-center gap-1.5 w-full px-2 py-1.5 pl-4 rounded-lg cursor-pointer text-xs ${
                    onPath && assetPath.length === 2 ? 'bg-accent/10 font-semibold text-foreground' : 'font-medium hover:bg-secondary'
                  } ${onPath ? 'text-foreground' : 'text-muted-foreground'}`}
                >
                  <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 opacity-55 transition-transform ${onPath ? 'rotate-90' : ''}`} />
                  <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color: c }} />
                  <span className="flex-1 min-w-0 text-left whitespace-nowrap overflow-hidden text-ellipsis">{node.name}</span>
                </button>
              );
            })}
          </div>

          {/* File Browser */}
          <div className="flex-1 min-w-0 border rounded-[14px] bg-card overflow-y-auto max-h-[560px] scrolly">
            {aFolderNodes.length > 0 && (
              <>
                <div className="px-4 py-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Folders
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-2.5 px-4 pb-3.5">
                  {aFolderNodes.map((f) => (
                    <button
                      key={f.name}
                      onClick={() => handleOpenFolder(f.name)}
                      className="flex items-center gap-3 p-3 border rounded-xl bg-card cursor-pointer text-left hover:border-accent hover:bg-[color-mix(in_oklch,var(--accent)_4%,var(--card))] transition-colors"
                    >
                      <span
                        className="inline-flex items-center justify-center w-10 h-10 rounded-[10px] flex-shrink-0"
                        style={{
                          background: `color-mix(in oklch, ${iconColor(f.kind)} 12%, transparent)`,
                          color: iconColor(f.kind),
                        }}
                      >
                        <FolderOpen className="w-5 h-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                          {f.name}
                        </span>
                        <span className="block text-[11.5px] text-muted-foreground mt-0.5">{f.meta}</span>
                      </span>
                      {f.flagged && <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--warn)]" title="Needs update" />}
                    </button>
                  ))}
                </div>
              </>
            )}

            {aFileNodes.length > 0 && (
              <>
                <div className="px-4 py-3.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground border-t">
                  {aNode.kind === 'lang' ? 'Caption files' : aNode.kind === 'original' ? 'Source files' : 'Files'}
                </div>
                <div className="px-2.5 pb-3.5">
                  {aFileNodes.map((f) => {
                    const outdated = f.badge === 'outdated';
                    return (
                      <div
                        key={f.name}
                        className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-secondary/45 transition-colors"
                      >
                        <span
                          className="inline-flex items-center justify-center w-[34px] h-[34px] rounded-lg flex-shrink-0"
                          style={{
                            background: `color-mix(in oklch, ${iconColor(f.kind)} 12%, transparent)`,
                            color: iconColor(f.kind),
                          }}
                        >
                          <FileIcon kind={f.kind} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                              {f.name}
                            </span>
                            {f.badge && (
                              <span
                                className="flex-shrink-0 text-[9.5px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                                style={{
                                  color: outdated ? 'var(--warn)' : 'var(--ok)',
                                  background: outdated ? 'color-mix(in oklch, var(--warn) 14%, transparent)' : 'color-mix(in oklch, var(--ok) 14%, transparent)',
                                }}
                              >
                                {outdated ? 'Outdated' : 'Fresh'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11.5px] text-muted-foreground mt-0.5">{f.meta}</div>
                        </div>
                        {f.kind === 'video' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => dispatch({ type: 'SET_TOAST', payload: `Previewing ${f.name}` })}
                            className="flex-shrink-0 h-8 w-8 p-0 rounded-lg"
                          >
                            <Video className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => dispatch({ type: 'SET_TOAST', payload: `Downloading ${f.name}` })}
                          className="flex-shrink-0 h-8 w-8 p-0 rounded-lg"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {aFolderNodes.length === 0 && aFileNodes.length === 0 && (
              <div className="px-5 py-14 text-center text-muted-foreground text-[13.5px]">
                {aq ? 'Nothing matches your search.' : 'This folder is empty.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
