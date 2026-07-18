import { Project, Series, Speaker, Segment, Language } from '@/app/types';

export const TILES = [60, 135, 285, 25, 175, 320, 95, 245];

export const HUES = [285, 175, 60, 25, 320, 135, 95, 245];

export const PXPS = 46; // pixels per second
export const DUR = 23.8; // video duration
export const RULER = 28; // ruler height
export const LANE_H = 58; // lane height
export const GAP = 10; // gap between lanes

export const CATALOG: Language[] = [
  { id: 'en', code: 'EN', name: 'English', pct: '100%' },
  { id: 'es', code: 'ES', name: 'Español', pct: '92%' },
  { id: 'fr', code: 'FR', name: 'Français', pct: '74%' },
  { id: 'de', code: 'DE', name: 'Deutsch', pct: '61%' },
  { id: 'ja', code: 'JA', name: '日本語', pct: '38%' },
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

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Espresso Machine Review',
    initial: 'E',
    tile: 60,
    desc: 'Two-host gadget review with speaker-separated captions across five languages.',
    langs: 5,
    dur: '0:24',
    updated: '2h ago',
    status: 'captioned',
    role: 'owner',
    ts: 6,
  },
  {
    id: 'p2',
    name: 'Lisbon Travel Vlog',
    initial: 'L',
    tile: 175,
    desc: 'Walking-tour voiceover with on-screen captions in three languages.',
    langs: 3,
    dur: '4:12',
    updated: 'Yesterday',
    status: 'translated',
    role: 'owner',
    ts: 5,
  },
  {
    id: 'p3',
    name: 'Q3 Product Keynote',
    initial: 'Q',
    tile: 285,
    desc: 'Stage recording with automatic speaker labels, ready to caption.',
    langs: 2,
    dur: '18:40',
    updated: '2d ago',
    status: 'transcribed',
    role: 'edit',
    ts: 4,
  },
  {
    id: 'p4',
    name: 'Carbonara in 60s',
    initial: 'C',
    tile: 25,
    desc: 'Vertical recipe reel with burned-in captions.',
    langs: 4,
    dur: '1:02',
    updated: '4d ago',
    status: 'captioned',
    role: 'owner',
    ts: 3,
  },
  {
    id: 'p5',
    name: 'Founders Podcast — Ep. 42',
    initial: 'F',
    tile: 320,
    desc: 'Long-form two-speaker interview, transcript in review.',
    langs: 1,
    dur: '52:09',
    updated: '1w ago',
    status: 'transcribed',
    role: 'view',
    ts: 2,
  },
  {
    id: 'p6',
    name: 'Onboarding Walkthrough',
    initial: 'O',
    tile: 135,
    desc: 'Screen recording with narrated step-by-step captions.',
    langs: 2,
    dur: '3:48',
    updated: '2w ago',
    status: 'captioned',
    role: 'edit',
    ts: 1,
  },
];

export const INITIAL_SERIES: Series[] = [
  {
    id: 'sr1',
    name: 'The Founders Playbook',
    hue: 265,
    desc: 'Long-form interview podcast, captioned in five languages.',
    langCodes: ['en', 'es', 'fr', 'de'],
    speakers: [
      { id: 'host', name: 'Host · Neha', meta: 'Narrator · 62% of dialogue', hue: 265 },
      { id: 'guest', name: 'Recurring guest', meta: 'Interviewee · 24%', hue: 25 },
      { id: 'vo', name: 'Voiceover', meta: 'Intro & outro · 9%', hue: 150 },
    ],
    terms: [
      { term: 'Platy Studio', rule: 'kept verbatim · /ˈplæti/' },
      { term: 'series A', rule: 'serie A (ES) · série A (FR)' },
      { term: 'runway', rule: 'pista financiera (ES)' },
    ],
    episodes: [
      { id: 'e1', title: 'From idea to first hire', meta: '48:12 · 4 speakers', status: 'captioned', when: '4d ago', override: false },
      { id: 'e2', title: 'Raising your seed round', meta: '39:02 · 3 speakers', status: 'captioned', when: '4d ago', override: false },
      { id: 'e3', title: 'Finding product–market fit', meta: '44:51 · 4 speakers', status: 'translated', when: '2d ago', override: false },
      { id: 'e4', title: 'Scaling the founding team', meta: '51:20 · 5 speakers', status: 'transcribed', when: '1d ago', override: false },
    ],
    updated: '1d ago',
  },
  {
    id: 'sr2',
    name: 'Design Deep-Dives',
    hue: 25,
    desc: 'Weekly design explainer series with burned-in captions.',
    langCodes: ['en', 'es', 'ja'],
    speakers: [
      { id: 'h2', name: 'Host · Theo', meta: 'Presenter · 88%', hue: 25 },
      { id: 'g2', name: 'Guest expert', meta: 'Interviewee · 12%', hue: 200 },
    ],
    terms: [
      { term: 'kerning', rule: 'interletraje (ES)' },
    ],
    episodes: [
      { id: 'e5', title: 'Color systems', meta: '12:30 · 1 speaker', status: 'captioned', when: '3d ago', override: false },
      { id: 'e6', title: 'Type at scale', meta: '15:02 · 2 speakers', status: 'captioned', when: '5d ago', override: false },
      { id: 'e7', title: 'Motion basics', meta: '11:18 · 1 speaker', status: 'translated', when: '1w ago', override: false },
    ],
    updated: '3d ago',
  },
];

export const INITIAL_SPEAKERS: Speaker[] = [
  { id: 'sp0', name: 'Maya', hue: 285 },
  { id: 'sp1', name: 'Liam', hue: 175 },
];

function S(speaker: string, start: number, end: number, en: string, es: string, fr: string, de: string, ja: string, id: string): Segment {
  return { id, speaker, start, end, text: { en, es, fr, de, ja } };
}

export const INITIAL_SEGMENTS: Segment[] = [
  S('sp0', 0.0, 2.7, 'Welcome back to the channel, everyone.', 'Bienvenidos de nuevo al canal, a todos.', 'Bon retour sur la chaîne, tout le monde.', 'Willkommen zurück auf dem Kanal, alle zusammen.', '皆さん、チャンネルへおかえりなさい。', 's1'),
  S('sp1', 3.0, 5.6, "Today we're testing the new espresso machine.", 'Hoy probamos la nueva máquina de espresso.', "Aujourd'hui, on teste la nouvelle machine à espresso.", 'Heute testen wir die neue Espressomaschine.', '今日は新しいエスプレッソマシンを試します。', 's2'),
  S('sp0', 5.9, 8.4, "I've been waiting weeks for this one.", 'Llevo semanas esperando esta.', "J'attends celle-ci depuis des semaines.", 'Ich warte schon seit Wochen darauf.', 'これを何週間も待っていました。', 's3'),
  S('sp1', 8.7, 11.1, "Let's start with the build quality.", 'Empecemos por la calidad de fabricación.', 'Commençons par la qualité de fabrication.', 'Beginnen wir mit der Verarbeitungsqualität.', 'まずは作りの良さから見ていきましょう。', 's4'),
  S('sp0', 11.4, 14.3, 'The brushed steel finish feels premium.', 'El acabado de acero cepillado se siente premium.', 'La finition en acier brossé fait haut de gamme.', 'Das gebürstete Stahlfinish wirkt hochwertig.', 'ヘアライン仕上げのスチールが高級感あります。', 's5'),
  S('sp1', 14.6, 16.9, "And it's surprisingly compact.", 'Y es sorprendentemente compacta.', 'Et elle est étonnamment compacte.', 'Und sie ist überraschend kompakt.', 'しかも驚くほどコンパクトです。', 's6'),
  S('sp0', 17.2, 20.0, 'Perfect for a small kitchen counter.', 'Perfecta para una encimera pequeña.', 'Parfaite pour un petit plan de travail.', 'Perfekt für eine kleine Küchenarbeitsplatte.', '小さなキッチンカウンターにぴったり。', 's7'),
  S('sp1', 20.3, 23.6, "Alright, let's pull our first shot.", 'Muy bien, hagamos nuestro primer café.', 'Très bien, tirons notre premier espresso.', 'Also gut, ziehen wir unseren ersten Shot.', 'それでは、最初の一杯を淹れましょう。', 's8'),
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
