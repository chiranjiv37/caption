'use client';

import { useAppState } from '@/app/hooks/use-app-state';
import { assetsApi, type Asset } from '@/app/lib/api';
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
  Layers,
  Loader2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type FolderNode = {
  type: 'folder';
  kind: string;
  name: string;
  meta: string;
  children: Record<string, TreeNode>;
};

type FileNode = {
  type: 'file';
  kind: string;
  name: string;
  meta: string;
  asset: Asset;
};

type TreeNode = FolderNode | FileNode;

function formatBytes(n?: number | null): string {
  if (n == null || !Number.isFinite(n)) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function kindFromAsset(a: Asset): string {
  if (a.kind) return a.kind;
  const mt = (a.mime_type || '').toLowerCase();
  if (mt.startsWith('video/')) return 'video';
  if (mt.includes('srt') || a.name.endsWith('.srt')) return 'srt';
  if (mt.includes('vtt') || a.name.endsWith('.vtt')) return 'vtt';
  if (mt.startsWith('text/') || a.name.endsWith('.txt')) return 'txt';
  return 'file';
}

function buildAssetTree(assets: Asset[]): FolderNode {
  const root: FolderNode = {
    type: 'folder',
    kind: 'root',
    name: 'Library',
    meta: '',
    children: {},
  };

  for (const asset of assets) {
    const parts = (asset.path || '')
      .split('/')
      .map(p => p.trim())
      .filter(Boolean);

    let node: FolderNode = root;
    for (const part of parts) {
      if (!node.children[part] || node.children[part].type !== 'folder') {
        node.children[part] = {
          type: 'folder',
          kind: 'folder',
          name: part,
          meta: 'Folder',
          children: {},
        };
      }
      node = node.children[part] as FolderNode;
    }

    const fileKind = kindFromAsset(asset);
    const size = formatBytes(asset.file_size);
    const metaParts = [
      (asset.mime_type || fileKind).toUpperCase(),
      size,
    ].filter(Boolean);

    // Avoid collisions with folder names
    let key = asset.name;
    let i = 1;
    while (node.children[key]) {
      key = `${asset.name} (${i++})`;
    }

    node.children[key] = {
      type: 'file',
      kind: fileKind,
      name: asset.name,
      meta: metaParts.join(' · ') || 'File',
      asset,
    };
  }

  // Update folder metas with child counts
  const annotate = (folder: FolderNode) => {
    const kids = Object.values(folder.children);
    const folders = kids.filter(k => k.type === 'folder').length;
    const files = kids.filter(k => k.type === 'file').length;
    if (folder.kind !== 'root') {
      const bits = [];
      if (folders) bits.push(`${folders} folder${folders === 1 ? '' : 's'}`);
      if (files) bits.push(`${files} file${files === 1 ? '' : 's'}`);
      folder.meta = bits.join(' · ') || 'Empty';
    }
    kids.forEach(k => {
      if (k.type === 'folder') annotate(k);
    });
  };
  annotate(root);

  return root;
}

export function AssetsView() {
  const { state, dispatch } = useAppState();
  const { assetPath, assetSearch } = state;

  const [localSearch, setLocalSearch] = useState(assetSearch);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await assetsApi.list();
      setAssets(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets');
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const assetModel = useMemo(() => buildAssetTree(assets), [assets]);

  const assetNodeAt = (path: string[]): FolderNode | FileNode | null => {
    let n: TreeNode = assetModel;
    for (let i = 1; i < path.length; i++) {
      if (n.type !== 'folder') return null;
      const folder: FolderNode = n;
      const key: string | undefined = Object.keys(folder.children).find((k) => {
        const child = folder.children[k];
        return child.name === path[i] || k === path[i];
      });
      if (!key) return null;
      n = folder.children[key];
    }
    return n;
  };

  const aNode = (assetNodeAt(assetPath) as FolderNode | null) || assetModel;
  const aq = localSearch.trim().toLowerCase();

  const aFolderNodes = useMemo(() => {
    if (aNode.type !== 'folder' || !aNode.children) return [];
    return Object.values(aNode.children).filter(
      (c): c is FolderNode =>
        c.type === 'folder' && (!aq || c.name.toLowerCase().includes(aq)),
    );
  }, [aNode, aq]);

  const aFileNodes = useMemo(() => {
    if (aNode.type !== 'folder' || !aNode.children) return [];
    return Object.values(aNode.children).filter(
      (c): c is FileNode =>
        c.type === 'file' && (!aq || c.name.toLowerCase().includes(aq)),
    );
  }, [aNode, aq]);

  const rootFolders = useMemo(
    () => Object.values(assetModel.children).filter((c): c is FolderNode => c.type === 'folder'),
    [assetModel],
  );

  const rootFiles = useMemo(
    () => Object.values(assetModel.children).filter((c): c is FileNode => c.type === 'file'),
    [assetModel],
  );

  const handleGoTo = (idx: number) => {
    dispatch({ type: 'SET_ASSET_PATH', payload: assetPath.slice(0, idx + 1) });
  };

  const handleOpenFolder = (name: string) => {
    dispatch({ type: 'SET_ASSET_PATH', payload: [...assetPath, name] });
  };

  const handleDownload = async (asset: Asset) => {
    try {
      const { download_url } = await assetsApi.getDownloadUrl(asset.id);
      window.open(download_url, '_blank');
    } catch {
      dispatch({ type: 'SET_TOAST', payload: `Could not download ${asset.name}` });
    }
  };

  const iconColor = (kind: string) => {
    switch (kind) {
      case 'folder':
      case 'root':
        return 'var(--accent)';
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
      default:
        return <FolderOpen className="w-5 h-5" />;
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-auto scrolly">
      <div className="w-full max-w-[1280px] mx-auto p-6 flex flex-col gap-4">
        <div className="flex flex-wrap gap-3.5 items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <button
                onClick={() => dispatch({ type: 'SET_VIEW', payload: 'projects' })}
                className="hover:text-foreground cursor-pointer"
              >
                Projects
              </button>
              <ChevronLeft className="w-3.5 h-3.5 opacity-50 rotate-180" />
              <span className="text-foreground font-semibold">Asset Library</span>
            </div>
            <h1 className="m-0 text-[26px] font-extrabold tracking-tight">Asset Library</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Uploaded sources and caption files from your library.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0 flex items-center gap-1 flex-wrap">
            {assetPath.map((seg, i) => (
              <span key={`${seg}-${i}`} className="inline-flex items-center gap-1">
                <button
                  onClick={() => handleGoTo(i)}
                  className={`inline-flex items-center gap-1.5 h-[30px] px-2 border-none rounded-lg bg-transparent cursor-pointer font-inherit text-[13px] whitespace-nowrap max-w-[240px] overflow-hidden text-ellipsis ${
                    i === assetPath.length - 1
                      ? 'font-bold text-foreground'
                      : 'font-medium text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {i === 0 && <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />}
                  {seg}
                </button>
                {i < assetPath.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-50 flex-shrink-0" />
                )}
              </span>
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

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading assets…</span>
          </div>
        ) : error ? (
          <div className="border rounded-[14px] bg-card px-5 py-14 text-center">
            <div className="text-sm font-semibold">Could not load assets</div>
            <div className="text-xs text-muted-foreground mt-1 mb-4">{error}</div>
            <Button variant="outline" onClick={fetchAssets}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="flex gap-4 items-stretch min-h-[420px]">
            <div className="w-[236px] flex-shrink-0 border rounded-[14px] bg-card p-2 overflow-y-auto max-h-[560px] scrolly">
              <button
                onClick={() => handleGoTo(0)}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg cursor-pointer text-xs font-semibold ${
                  assetPath.length === 1 ? 'bg-accent/10 text-foreground' : 'text-foreground hover:bg-secondary'
                }`}
              >
                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-55 rotate-90" />
                <Layers className="w-4 h-4 flex-shrink-0 text-accent" />
                <span className="flex-1 min-w-0 text-left whitespace-nowrap overflow-hidden text-ellipsis">
                  Library
                </span>
              </button>

              {rootFolders.map(node => {
                const onPath = assetPath[1] === node.name;
                const c = iconColor(node.kind);
                return (
                  <button
                    key={node.name}
                    onClick={() => dispatch({ type: 'SET_ASSET_PATH', payload: ['Library', node.name] })}
                    className={`flex items-center gap-1.5 w-full px-2 py-1.5 pl-4 rounded-lg cursor-pointer text-xs ${
                      onPath && assetPath.length === 2
                        ? 'bg-accent/10 font-semibold text-foreground'
                        : 'font-medium hover:bg-secondary'
                    } ${onPath ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    <ChevronRight
                      className={`w-3.5 h-3.5 flex-shrink-0 opacity-55 transition-transform ${onPath ? 'rotate-90' : ''}`}
                    />
                    <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color: c }} />
                    <span className="flex-1 min-w-0 text-left whitespace-nowrap overflow-hidden text-ellipsis">
                      {node.name}
                    </span>
                  </button>
                );
              })}

              {rootFolders.length === 0 && rootFiles.length === 0 && (
                <p className="px-2 py-4 text-[11px] text-muted-foreground text-center">No assets yet</p>
              )}
            </div>

            <div className="flex-1 min-w-0 border rounded-[14px] bg-card overflow-y-auto max-h-[560px] scrolly">
              {aFolderNodes.length > 0 && (
                <>
                  <div className="px-4 py-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Folders
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-2.5 px-4 pb-3.5">
                    {aFolderNodes.map(f => (
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
                      </button>
                    ))}
                  </div>
                </>
              )}

              {aFileNodes.length > 0 && (
                <>
                  <div className="px-4 py-3.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground border-t">
                    Files
                  </div>
                  <div className="px-2.5 pb-3.5">
                    {aFileNodes.map(f => (
                      <div
                        key={f.asset.id}
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
                          <div className="text-[13.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                            {f.name}
                          </div>
                          <div className="text-[11.5px] text-muted-foreground mt-0.5">{f.meta}</div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(f.asset)}
                          className="flex-shrink-0 h-8 w-8 p-0 rounded-lg"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {aFolderNodes.length === 0 && aFileNodes.length === 0 && (
                <div className="px-5 py-14 text-center text-muted-foreground text-[13.5px]">
                  {aq
                    ? 'Nothing matches your search.'
                    : assets.length === 0
                      ? 'No assets yet. Uploaded files will appear here.'
                      : 'This folder is empty.'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
