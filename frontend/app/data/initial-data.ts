import { Language } from '@/app/types';

export const TILES = [60, 135, 285, 25, 175, 320, 95, 245];

export const HUES = [285, 175, 60, 25, 320, 135, 95, 245];

export const PXPS = 46; // pixels per second
export const RULER = 28; // ruler height
export const LANE_H = 58; // lane height
export const GAP = 10; // gap between lanes

export const CATALOG: Language[] = [
  { id: 'en', code: 'EN', name: 'English' },
  { id: 'es', code: 'ES', name: 'Español' },
  { id: 'fr', code: 'FR', name: 'Français' },
  { id: 'de', code: 'DE', name: 'Deutsch' },
  { id: 'ja', code: 'JA', name: '日本語' },
  { id: 'pt', code: 'PT', name: 'Portuguese' },
  { id: 'it', code: 'IT', name: 'Italian' },
  { id: 'ko', code: 'KO', name: 'Korean' },
  { id: 'hi', code: 'HI', name: 'Hindi' },
  { id: 'ar', code: 'AR', name: 'Arabic' },
  { id: 'zh', code: 'ZH', name: 'Chinese (Mandarin)' },
  { id: 'ru', code: 'RU', name: 'Russian' },
  { id: 'nl', code: 'NL', name: 'Dutch' },
  { id: 'pl', code: 'PL', name: 'Polish' },
  { id: 'tr', code: 'TR', name: 'Turkish' },
  { id: 'id', code: 'ID', name: 'Indonesian' },
  { id: 'vi', code: 'VI', name: 'Vietnamese' },
  { id: 'sv', code: 'SV', name: 'Swedish' },
  { id: 'uk', code: 'UK', name: 'Ukrainian' },
  { id: 'he', code: 'HE', name: 'Hebrew' },
];

export const STATUSES = [
  { k: 'transcribed', label: 'Transcribed' },
  { k: 'translated', label: 'Translated' },
  { k: 'captioned', label: 'Captioned' },
];

export const SORTS = [
  { k: 'modified', label: 'Recently modified' },
  { k: 'created', label: 'Date created' },
  { k: 'name', label: 'Name (A–Z)' },
];

export const STYLES = [
  { id: 'standard', label: 'Standard', desc: 'Balanced subtitles for most video', dot: 'var(--accent)' },
  { id: 'social', label: 'Social media', desc: 'Short, punchy, high-contrast captions', dot: 'oklch(0.62 0.19 25)' },
  { id: 'cc', label: 'Accessibility (CC)', desc: 'Closed captions with speaker + sound cues', dot: 'oklch(0.62 0.13 150)' },
];

export const SPEEDS = [
  { id: 'slow', label: 'Slow (12)', cps: 12 },
  { id: 'normal', label: 'Normal (15)', cps: 15 },
  { id: 'fast', label: 'Fast (18)', cps: 18 },
  { id: 'custom', label: 'Custom', cps: null },
];

export const LENGTHS = [
  { id: '1', label: '1 line', desc: 'Single line, never wraps' },
  { id: '2', label: '2 lines', desc: 'Up to two lines per caption' },
  { id: 'auto', label: 'Auto', desc: 'Let the engine decide per caption' },
];

export const AI_DEFS = [
  { k: 'aiFiller', label: 'Remove filler words' },
  { k: 'aiPunct', label: 'Fix punctuation' },
  { k: 'aiGrammar', label: 'Clean grammar' },
  { k: 'aiCaps', label: 'Smart capitalization' },
];

export const ADV_DEFS = [
  { k: 'mergeShort', label: 'Merge short captions' },
  { k: 'breakPunct', label: 'Break on punctuation' },
  { k: 'smartBreak', label: 'Smart line breaking' },
  { k: 'spkLabels', label: 'Speaker labels' },
  { k: 'ccMode', label: 'Closed Caption mode' },
  { k: 'sfx', label: 'Sound effect captions' },
];

export const ICON_PATHS = {
  folder: 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
  series: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z',
  lang: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 0 1 8 8h-8V4z',
  video: 'm22 8-6 4 6 4V8Z M2 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z',
  srt: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm3 10h4v-2H6v2zm6 0h6v-2h-6v2z',
  vtt: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm3 6h2V9H6v2zm4 0h2V9h-2v2zm4 0h2V9h-2v2zM6 15h6v-2H6v2z',
  txt: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z M14 2v6h6 M16 13H8 M16 17H8',
};
