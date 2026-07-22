// Types for Captions Studio

export interface Project {
  id: string;
  name: string;
  initial: string;
  tile: number;
  desc: string;
  langs: number;
  dur: string;
  updated: string;
  status: 'transcribed' | 'translated' | 'captioned';
  role: 'owner' | 'edit' | 'view';
  ts: number;
  storage_key?: string;
  duration_seconds?: number;

  // Job tracking for transcription
  job_status?: 'pending' | 'uploading' | 'transcribing' | 'completed' | 'failed';
  job_progress?: number;
  job_id?: string;
  job_message?: string;
}

export interface Episode {
  id: string;
  title: string;
  meta: string;
  status: 'transcribed' | 'translated' | 'captioned';
  when: string;
  override: boolean;
  srcProj?: string;
}

export interface Series {
  id: string;
  name: string;
  hue: number;
  desc: string;
  langCodes: string[];
  speakers: SeriesSpeaker[];
  terms: GlossaryTerm[];
  episodes: Episode[];
  updated?: string;
}

export interface SeriesSpeaker {
  id: string;
  name: string;
  meta: string;
  hue: number;
}

export interface GlossaryTerm {
  term: string;
  rule: string;
}

export interface Speaker {
  id: string;
  name: string;
  hue: number;
}

export interface Segment {
  id: string;
  speaker: string;
  start: number;
  end: number;
  text: Record<string, string>;
}

export interface Language {
  id: string;
  code: string;
  name: string;
  pct?: string;
}

export interface ExportSelection {
  video: boolean;
  srt: boolean;
  vtt: boolean;
  txt: boolean;
}

export interface AssetNode {
  type: 'folder' | 'file';
  kind: string;
  name: string;
  meta: string;
  flagged?: boolean;
  children?: Record<string, AssetNode>;
  file?: AssetFile;
}

export interface AssetFile {
  name: string;
  kind: string;
  meta: string;
  badge?: string;
}

export interface AppState {
  // View
  view: 'projects' | 'editor' | 'series' | 'assets';
  theme: 'light' | 'dark';
  tier: 'lite' | 'pro';

  // Projects
  projects: Project[];
  search: string;
  tab: 'all' | 'mine' | 'fav';
  kindTab: 'all' | 'series';
  status: string;
  sort: 'modified' | 'created' | 'name';
  favs: Record<string, boolean>;
  archived: Record<string, boolean>;
  deleted: Record<string, boolean>;
  inSeries: Record<string, string>;

  // Series
  series: Series[];
  activeSeriesId: string | null;
  epOrder: Record<string, string[]>;
  epArchived: Record<string, boolean>;
  epDeleted: Record<string, boolean>;
  epConfirmDel: string | null;

  // Editor
  activeProject: Project | null;
  segments: Segment[];
  speakers: Speaker[];
  currentTime: number;
  playing: boolean;
  selectedId: string | null;
  lang: string;
  activeLangs: string[];

  // Settings
  capStyle: string;
  readSpeed: string;
  customCps: number;
  capLen: string;
  aiFiller: boolean;
  aiPunct: boolean;
  aiGrammar: boolean;
  aiCaps: boolean;
  advOpen: boolean;
  minDur: number;
  maxDur: number;
  silenceMs: number;
  mergeShort: boolean;
  breakPunct: boolean;
  smartBreak: boolean;
  spkLabels: boolean;
  ccMode: boolean;
  sfx: boolean;

  // Export
  exportOpen: boolean;
  exportTab: string;
  exporting: boolean;
  exportProgress: number;
  exportDone: boolean;
  exportSel: ExportSelection;
  capSize: string;
  capPos: string;
  capColor: string;
  capBox: boolean;

  // UI State
  dialogOpen: boolean;
  creating: boolean;
  createProgress: number;
  newName: string;
  uploadName: string;
  srcLang: string;
  newSeriesName: string;
  seriesDialogOpen: boolean;
  addLangOpen: boolean;
  addLangSearch: string;
  addLangSel: Record<string, boolean>;
  editingSeriesTitle: boolean;
  seriesTitleDraft: string;
  seriesLangMenuOpen: boolean;
  seriesLangSearch: string;
  editingSpeakerId: string | null;
  speakerNameDraft: string;
  diarizing: boolean;

  // Menu State
  userMenuOpen: boolean;
  projMenuOpen: boolean;
  topLangOpen: boolean;
  panelLangOpen: boolean;
  speakersOpen: boolean;
  csOpen: boolean;
  styleMenuOpen: boolean;
  newMenuOpen: boolean;
  statusMenuOpen: boolean;
  sortMenuOpen: boolean;
  cardMenuFor: string | null;
  confirmDelId: string | null;
  chipMenuFor: string | null;
  speakerMenu: { segId: string; top: number; left: number } | null;

  // Drag State
  dragProj: string | null;
  dropSeries: string | null;
  dragEp: string | null;
  dragOverEp: string | null;
  dragSpeaker: string | null;
  dragOverSpeaker: string | null;

  // Assets
  assetPath: string[];
  assetSearch: string;

  // Toast
  toast: string | null;
}

export type AppAction =
  | { type: 'SET_VIEW'; payload: AppState['view'] }
  | { type: 'SET_THEME'; payload: AppState['theme'] }
  | { type: 'SET_TIER'; payload: AppState['tier'] }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_TAB'; payload: AppState['tab'] }
  | { type: 'SET_KIND_TAB'; payload: AppState['kindTab'] }
  | { type: 'SET_STATUS'; payload: string }
  | { type: 'SET_SORT'; payload: AppState['sort'] }
  | { type: 'TOGGLE_FAV'; payload: string }
  | { type: 'ARCHIVE_PROJECT'; payload: string }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'SET_ACTIVE_PROJECT'; payload: Project }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'SET_ACTIVE_SERIES'; payload: string | null }
  | { type: 'ADD_SERIES'; payload: Series }
  | { type: 'UPDATE_SERIES'; payload: { id: string; updates: Partial<Series> } }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_SELECTED_ID'; payload: string | null }
  | { type: 'SET_LANG'; payload: string }
  | { type: 'ADD_LANG'; payload: string }
  | { type: 'REMOVE_LANG'; payload: string }
  | { type: 'UPDATE_SEGMENT'; payload: { id: string; updates: Partial<Segment> } }
  | { type: 'ADD_SPEAKER'; payload: Speaker }
  | { type: 'UPDATE_SPEAKER'; payload: { id: string; updates: Partial<Speaker> } }
  | { type: 'REMOVE_SPEAKER'; payload: string }
  | { type: 'REORDER_SPEAKERS'; payload: Speaker[] }
  | { type: 'MERGE_SPEAKERS'; payload: { srcId: string; dstId: string } }
  | { type: 'SET_CAPTION_SETTING'; payload: { key: string; value: unknown } }
  | { type: 'RESET_CAPTION_SETTINGS' }
  | { type: 'SET_EXPORT_OPEN'; payload: boolean }
  | { type: 'SET_EXPORT_TAB'; payload: string }
  | { type: 'SET_EXPORTING'; payload: boolean }
  | { type: 'SET_EXPORT_PROGRESS'; payload: number }
  | { type: 'TOGGLE_EXPORT_SEL'; payload: keyof ExportSelection }
  | { type: 'SET_DIALOG_OPEN'; payload: boolean }
  | { type: 'SET_CREATING'; payload: boolean }
  | { type: 'SET_CREATE_PROGRESS'; payload: number }
  | { type: 'SET_NEW_NAME'; payload: string }
  | { type: 'SET_UPLOAD_NAME'; payload: string }
  | { type: 'SET_SRC_LANG'; payload: string }
  | { type: 'SET_NEW_MENU_OPEN'; payload: boolean }
  | { type: 'TOGGLE_MENU'; payload: 'userMenuOpen' | 'projMenuOpen' | 'topLangOpen' | 'speakersOpen' | 'csOpen' | 'styleMenuOpen' | 'newMenuOpen' | 'statusMenuOpen' | 'sortMenuOpen' }
  | { type: 'SET_TOAST'; payload: string | null }
  | { type: 'CLOSE_MENUS' }
  | { type: 'TOGGLE_MENU'; payload: keyof Pick<AppState, 'userMenuOpen' | 'projMenuOpen' | 'topLangOpen' | 'speakersOpen' | 'csOpen' | 'styleMenuOpen' | 'newMenuOpen' | 'statusMenuOpen' | 'sortMenuOpen'> }
  | { type: 'SET_CARD_MENU'; payload: string | null }
  | { type: 'SET_CONFIRM_DEL'; payload: string | null }
  | { type: 'SET_SPEAKER_MENU'; payload: AppState['speakerMenu'] }
  | { type: 'SET_CHIP_MENU'; payload: string | null }
  | { type: 'SET_EDITING_SPEAKER'; payload: { id: string | null; draft: string } }
  | { type: 'SET_DIARIZING'; payload: boolean }
  | { type: 'SET_DRAG_PROJ'; payload: string | null }
  | { type: 'SET_DROP_SERIES'; payload: string | null }
  | { type: 'SET_DRAG_EP'; payload: string | null }
  | { type: 'SET_DRAG_OVER_EP'; payload: string | null }
  | { type: 'SET_DRAG_SPEAKER'; payload: string | null }
  | { type: 'SET_DRAG_OVER_SPEAKER'; payload: string | null }
  | { type: 'SET_EP_ORDER'; payload: { seriesId: string; order: string[] } }
  | { type: 'ARCHIVE_EP'; payload: string }
  | { type: 'DELETE_EP'; payload: string }
  | { type: 'SET_EP_CONFIRM_DEL'; payload: string | null }
  | { type: 'ADD_EP_TO_SERIES'; payload: { seriesId: string; episode: Episode } }
  | { type: 'SET_ASSET_PATH'; payload: string[] }
  | { type: 'SET_ASSET_SEARCH'; payload: string }
  | { type: 'SET_SERIES_DIALOG_OPEN'; payload: boolean }
  | { type: 'SET_NEW_SERIES_NAME'; payload: string }
  | { type: 'SET_ADD_LANG_OPEN'; payload: boolean }
  | { type: 'SET_ADD_LANG_SEARCH'; payload: string }
  | { type: 'TOGGLE_ADD_LANG_SEL'; payload: string }
  | { type: 'SET_EDITING_SERIES_TITLE'; payload: boolean }
  | { type: 'SET_SERIES_TITLE_DRAFT'; payload: string }
  | { type: 'SET_SERIES_LANG_MENU_OPEN'; payload: boolean }
  | { type: 'SET_SERIES_LANG_SEARCH'; payload: string }
  | { type: 'LOAD_STATE'; payload: Partial<AppState> };
