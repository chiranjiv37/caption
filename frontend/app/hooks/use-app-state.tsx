'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, AppAction, Project, Series, Speaker, Segment, Episode } from '@/app/types';
import {
  INITIAL_PROJECTS,
  INITIAL_SERIES,
  INITIAL_SPEAKERS,
  INITIAL_SEGMENTS,
  TILES,
} from '@/app/data/initial-data';

const initialState: AppState = {
  // View
  view: 'projects',
  theme: 'light',
  tier: 'pro',

  // Projects
  projects: INITIAL_PROJECTS,
  search: '',
  tab: 'all',
  kindTab: 'all',
  status: '',
  sort: 'modified',
  favs: { p1: true },
  archived: {},
  deleted: {},
  inSeries: {},

  // Series
  series: INITIAL_SERIES,
  activeSeriesId: null,
  epOrder: {},
  epArchived: {},
  epDeleted: {},
  epConfirmDel: null,

  // Editor
  activeProject: INITIAL_PROJECTS[0],
  segments: INITIAL_SEGMENTS,
  speakers: INITIAL_SPEAKERS,
  currentTime: 0,
  playing: false,
  selectedId: 's1',
  lang: 'en',
  activeLangs: ['en', 'es', 'fr', 'de', 'ja'],

  // Settings
  capStyle: 'standard',
  readSpeed: 'normal',
  customCps: 15,
  capLen: '2',
  aiFiller: true,
  aiPunct: true,
  aiGrammar: false,
  aiCaps: true,
  advOpen: false,
  minDur: 1.0,
  maxDur: 6.0,
  silenceMs: 300,
  mergeShort: true,
  breakPunct: true,
  smartBreak: true,
  spkLabels: false,
  ccMode: false,
  sfx: false,

  // Export
  exportOpen: false,
  exportTab: 'burn',
  exporting: false,
  exportProgress: 0,
  exportDone: false,
  exportSel: { video: true, srt: false, vtt: false, txt: false },
  capSize: 'md',
  capPos: 'bottom',
  capColor: 'white',
  capBox: true,

  // UI State
  dialogOpen: false,
  creating: false,
  createProgress: 0,
  newName: '',
  uploadName: '',
  srcLang: 'en',
  newSeriesName: '',
  seriesDialogOpen: false,
  addLangOpen: false,
  addLangSearch: '',
  addLangSel: {},
  editingSeriesTitle: false,
  seriesTitleDraft: '',
  seriesLangMenuOpen: false,
  seriesLangSearch: '',
  editingSpeakerId: null,
  speakerNameDraft: '',
  diarizing: false,

  // Menu State
  userMenuOpen: false,
  projMenuOpen: false,
  topLangOpen: false,
  panelLangOpen: false,
  speakersOpen: false,
  csOpen: false,
  styleMenuOpen: false,
  newMenuOpen: false,
  statusMenuOpen: false,
  sortMenuOpen: false,
  cardMenuFor: null,
  confirmDelId: null,
  chipMenuFor: null,
  speakerMenu: null,

  // Drag State
  dragProj: null,
  dropSeries: null,
  dragEp: null,
  dragOverEp: null,
  dragSpeaker: null,
  dragOverSpeaker: null,

  // Assets
  assetPath: ['Library'],
  assetSearch: '',

  // Toast
  toast: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_TIER':
      return { ...state, tier: action.payload };
    case 'SET_SEARCH':
      return { ...state, search: action.payload };
    case 'SET_TAB':
      return { ...state, tab: action.payload };
    case 'SET_KIND_TAB':
      return { ...state, kindTab: action.payload };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_SORT':
      return { ...state, sort: action.payload };
    case 'TOGGLE_FAV': {
      const newFavs = { ...state.favs };
      if (newFavs[action.payload]) delete newFavs[action.payload];
      else newFavs[action.payload] = true;
      return { ...state, favs: newFavs };
    }
    case 'ARCHIVE_PROJECT':
      return { ...state, archived: { ...state.archived, [action.payload]: true }, cardMenuFor: null };
    case 'DELETE_PROJECT':
      return { ...state, deleted: { ...state.deleted, [action.payload]: true }, cardMenuFor: null, confirmDelId: null };
    case 'SET_ACTIVE_PROJECT':
      return { ...state, activeProject: action.payload, view: 'editor', currentTime: 0, playing: false };
    case 'ADD_PROJECT':
      return { ...state, projects: [action.payload, ...state.projects], activeProject: action.payload };
    case 'SET_ACTIVE_SERIES':
      return { ...state, activeSeriesId: action.payload, view: 'series' };
    case 'ADD_SERIES':
      return { ...state, series: [action.payload, ...state.series], activeSeriesId: action.payload.id };
    case 'UPDATE_SERIES':
      return {
        ...state,
        series: state.series.map(s => s.id === action.payload.id ? { ...s, ...action.payload.updates } : s),
      };
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };
    case 'SET_PLAYING':
      return { ...state, playing: action.payload };
    case 'SET_SELECTED_ID':
      return { ...state, selectedId: action.payload };
    case 'SET_LANG':
      return { ...state, lang: action.payload, topLangOpen: false, panelLangOpen: false };
    case 'ADD_LANG': {
      if (state.activeLangs.includes(action.payload)) return state;
      const newSegments = state.segments.map(seg => ({
        ...seg,
        text: { ...seg.text, [action.payload]: seg.text.en },
      }));
      return {
        ...state,
        activeLangs: [...state.activeLangs, action.payload],
        segments: newSegments,
        lang: action.payload,
      };
    }
    case 'REMOVE_LANG':
      return {
        ...state,
        activeLangs: state.activeLangs.filter(l => l !== action.payload),
      };
    case 'UPDATE_SEGMENT':
      return {
        ...state,
        segments: state.segments.map(s => s.id === action.payload.id ? { ...s, ...action.payload.updates } : s),
      };
    case 'ADD_SPEAKER':
      return { ...state, speakers: [...state.speakers, action.payload], chipMenuFor: null };
    case 'UPDATE_SPEAKER':
      return {
        ...state,
        speakers: state.speakers.map(s => s.id === action.payload.id ? { ...s, ...action.payload.updates } : s),
      };
    case 'REMOVE_SPEAKER': {
      if (state.speakers.length <= 1) return state;
      const others = state.speakers.filter(s => s.id !== action.payload);
      const target = others[0].id;
      return {
        ...state,
        speakers: others,
        segments: state.segments.map(s => s.speaker === action.payload ? { ...s, speaker: target } : s),
        chipMenuFor: null,
      };
    }
    case 'REORDER_SPEAKERS':
      return { ...state, speakers: action.payload };
    case 'MERGE_SPEAKERS': {
      const { srcId, dstId } = action.payload;
      if (srcId === dstId) return state;
      const dst = state.speakers.find(s => s.id === dstId);
      return {
        ...state,
        speakers: state.speakers.filter(s => s.id !== srcId),
        segments: state.segments.map(seg => seg.speaker === srcId ? { ...seg, speaker: dstId } : seg),
        chipMenuFor: null,
      };
    }
    case 'SET_CAPTION_SETTING':
      return { ...state, [action.payload.key]: action.payload.value };
    case 'RESET_CAPTION_SETTINGS':
      return {
        ...state,
        capStyle: 'standard',
        readSpeed: 'normal',
        customCps: 15,
        capLen: '2',
        aiFiller: true,
        aiPunct: true,
        aiGrammar: false,
        aiCaps: true,
        minDur: 1.0,
        maxDur: 6.0,
        silenceMs: 300,
        mergeShort: true,
        breakPunct: true,
        smartBreak: true,
        spkLabels: false,
        ccMode: false,
        sfx: false,
      };
    case 'SET_EXPORT_OPEN':
      return { ...state, exportOpen: action.payload };
    case 'SET_EXPORT_TAB':
      return { ...state, exportTab: action.payload };
    case 'SET_EXPORTING':
      return { ...state, exporting: action.payload };
    case 'SET_EXPORT_PROGRESS':
      return { ...state, exportProgress: action.payload };
    case 'TOGGLE_EXPORT_SEL': {
      const key = action.payload;
      return { ...state, exportSel: { ...state.exportSel, [key]: !state.exportSel[key] } };
    }
    case 'SET_DIALOG_OPEN':
      return { ...state, dialogOpen: action.payload };
    case 'SET_CREATING':
      return { ...state, creating: action.payload };
    case 'SET_CREATE_PROGRESS':
      return { ...state, createProgress: action.payload };
    case 'SET_NEW_NAME':
      return { ...state, newName: action.payload };
    case 'SET_UPLOAD_NAME':
      return { ...state, uploadName: action.payload };
    case 'SET_SRC_LANG':
      return { ...state, srcLang: action.payload };
    case 'SET_NEW_MENU_OPEN':
      return { ...state, newMenuOpen: action.payload };
    case 'TOGGLE_MENU':
      return { ...state, [action.payload]: !state[action.payload] };
    case 'SET_TOAST':
      return { ...state, toast: action.payload };
    case 'CLOSE_MENUS':
      return {
        ...state,
        userMenuOpen: false,
        projMenuOpen: false,
        topLangOpen: false,
        panelLangOpen: false,
        speakersOpen: false,
        chipMenuFor: null,
        statusMenuOpen: false,
        sortMenuOpen: false,
        cardMenuFor: null,
        confirmDelId: null,
        csOpen: false,
        styleMenuOpen: false,
        newMenuOpen: false,
        seriesLangMenuOpen: false,
      };
    case 'TOGGLE_MENU':
      return { ...state, [action.payload]: !state[action.payload] };
    case 'SET_CARD_MENU':
      return { ...state, cardMenuFor: action.payload };
    case 'SET_CONFIRM_DEL':
      return { ...state, confirmDelId: action.payload };
    case 'SET_SPEAKER_MENU':
      return { ...state, speakerMenu: action.payload };
    case 'SET_CHIP_MENU':
      return { ...state, chipMenuFor: action.payload };
    case 'SET_EDITING_SPEAKER':
      return { ...state, editingSpeakerId: action.payload.id, speakerNameDraft: action.payload.draft };
    case 'SET_DIARIZING':
      return { ...state, diarizing: action.payload };
    case 'SET_DRAG_PROJ':
      return { ...state, dragProj: action.payload };
    case 'SET_DROP_SERIES':
      return { ...state, dropSeries: action.payload };
    case 'SET_DRAG_EP':
      return { ...state, dragEp: action.payload };
    case 'SET_DRAG_OVER_EP':
      return { ...state, dragOverEp: action.payload };
    case 'SET_DRAG_SPEAKER':
      return { ...state, dragSpeaker: action.payload };
    case 'SET_DRAG_OVER_SPEAKER':
      return { ...state, dragOverSpeaker: action.payload };
    case 'SET_EP_ORDER':
      return { ...state, epOrder: { ...state.epOrder, [action.payload.seriesId]: action.payload.order } };
    case 'ARCHIVE_EP':
      return { ...state, epArchived: { ...state.epArchived, [action.payload]: true }, epConfirmDel: null };
    case 'DELETE_EP':
      return { ...state, epDeleted: { ...state.epDeleted, [action.payload]: true }, epConfirmDel: null };
    case 'SET_EP_CONFIRM_DEL':
      return { ...state, epConfirmDel: action.payload };
    case 'ADD_EP_TO_SERIES':
      return {
        ...state,
        series: state.series.map(s => s.id === action.payload.seriesId
          ? { ...s, episodes: [...s.episodes, action.payload.episode] }
          : s
        ),
        inSeries: { ...state.inSeries, [action.payload.episode.srcProj!]: action.payload.seriesId },
      };
    case 'SET_ASSET_PATH':
      return { ...state, assetPath: action.payload };
    case 'SET_ASSET_SEARCH':
      return { ...state, assetSearch: action.payload };
    case 'SET_SERIES_DIALOG_OPEN':
      return { ...state, seriesDialogOpen: action.payload };
    case 'SET_NEW_SERIES_NAME':
      return { ...state, newSeriesName: action.payload };
    case 'SET_ADD_LANG_OPEN':
      return { ...state, addLangOpen: action.payload };
    case 'SET_ADD_LANG_SEARCH':
      return { ...state, addLangSearch: action.payload };
    case 'TOGGLE_ADD_LANG_SEL': {
      const newSel = { ...state.addLangSel };
      if (newSel[action.payload]) delete newSel[action.payload];
      else newSel[action.payload] = true;
      return { ...state, addLangSel: newSel };
    }
    case 'SET_EDITING_SERIES_TITLE':
      return { ...state, editingSeriesTitle: action.payload };
    case 'SET_SERIES_TITLE_DRAFT':
      return { ...state, seriesTitleDraft: action.payload };
    case 'SET_SERIES_LANG_MENU_OPEN':
      return { ...state, seriesLangMenuOpen: action.payload };
    case 'SET_SERIES_LANG_SEARCH':
      return { ...state, seriesLangSearch: action.payload };
    case 'LOAD_STATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load theme and tier from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('dub-theme') as 'light' | 'dark' | null;
      const savedTier = localStorage.getItem('dub-tier') as 'lite' | 'pro' | null;
      if (savedTheme) dispatch({ type: 'SET_THEME', payload: savedTheme });
      if (savedTier) dispatch({ type: 'SET_TIER', payload: savedTier });
    } catch (e) {
      // Ignore localStorage errors
    }
  }, []);

  // Save theme and tier to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('dub-theme', state.theme);
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [state.theme]);

  useEffect(() => {
    try {
      localStorage.setItem('dub-tier', state.tier);
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [state.tier]);

  // Apply theme class to document
  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.theme]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
}
