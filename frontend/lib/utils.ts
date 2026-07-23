import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format seconds to MM:SS
export function fmtTime(sec: number): string {
  const t = Math.floor(sec);
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Format seconds to SRT timecode (HH:MM:SS,mmm)
export function srtTime(sec: number): string {
  const ms = Math.floor((sec % 1) * 1000);
  const t = Math.floor(sec);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

// Format seconds to VTT timecode (HH:MM:SS.mmm)
export function vttTime(sec: number): string {
  return srtTime(sec).replace(',', '.');
}

// Build SRT content
export function buildSRT(
  segments: Array<{ start_time?: number; end_time?: number; start?: number; end?: number; text: string }>,
  _lang?: string,
): string {
  return segments
    .map((s, i) => {
      const start = s.start_time ?? s.start ?? 0;
      const end = s.end_time ?? s.end ?? 0;
      return `${i + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${s.text || ''}\n`;
    })
    .join('\n');
}

// Build VTT content
export function buildVTT(
  segments: Array<{ start_time?: number; end_time?: number; start?: number; end?: number; text: string }>,
  _lang?: string,
): string {
  return 'WEBVTT\n\n' + segments
    .map((s, i) => {
      const start = s.start_time ?? s.start ?? 0;
      const end = s.end_time ?? s.end ?? 0;
      return `${i + 1}\n${vttTime(start)} --> ${vttTime(end)}\n${s.text || ''}\n`;
    })
    .join('\n');
}

// Build plain text transcript
export function buildTXT(
  segments: Array<{ speaker_id?: string | null; speaker?: string; text: string }>,
  speakers: Array<{ id: string; name: string }>,
  _lang?: string,
): string {
  const byId = Object.fromEntries(speakers.map(s => [s.id, s.name]));
  return segments
    .map(s => {
      const sid = s.speaker_id ?? s.speaker;
      return `${sid && byId[sid] ? byId[sid] + ':  ' : ''}${s.text || ''}`;
    })
    .join('\n');
}

// Clamp value between min and max
export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

// Get color for speaker based on hue
export function colFor(hue: number): string {
  return `oklch(0.6 0.16 ${hue})`;
}

// Get tile background color for speaker
export function tileFor(hue: number): string {
  return `color-mix(in oklch, ${colFor(hue)} 20%, transparent)`;
}

// Get status color
export function statusColor(status: string): string {
  switch (status) {
    case 'captioned':
      return 'var(--ok)';
    case 'translated':
      return 'var(--accent)';
    default:
      return 'var(--amber)';
  }
}

// Get status label
export function statusLabel(status: string): string {
  switch (status) {
    case 'captioned':
      return 'Captioned';
    case 'translated':
      return 'Translated';
    case 'transcribed':
      return 'Transcribed';
    default:
      return 'Draft';
  }
}

// Get role config
export function roleCfg(role: string): { label: string; c: string } {
  switch (role) {
    case 'owner':
      return { label: 'Admin', c: 'var(--amber)' };
    case 'edit':
      return { label: 'Shared', c: 'var(--accent)' };
    default:
      return { label: 'View only', c: 'var(--muted-foreground)' };
  }
}

// Get episode status config
export function epStatusCfg(status: string): { label: string; c: string } {
  switch (status) {
    case 'captioned':
      return { label: 'Captioned', c: 'var(--ok)' };
    case 'translated':
      return { label: 'Translated', c: 'var(--accent)' };
    default:
      return { label: 'Transcribed', c: 'var(--amber)' };
  }
}

// Generate waveform bars for a speaker
export function buildWaves(
  segments: Array<{ speaker: string; start: number; end: number }>,
  speakers: Array<{ id: string; hue: number }>,
  dur: number,
  pxps: number
): Record<string, Array<{ h: number; color: string }>> {
  const map: Record<string, Array<{ h: number; color: string }>> = {};

  speakers.forEach((sp) => {
    let seed = 0;
    for (let k = 0; k < sp.id.length; k++) seed = (seed * 31 + sp.id.charCodeAt(k)) & 0x7fffffff;
    seed = (seed + sp.hue + 1) * 9173;

    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return ((seed >>> 8) & 0xffff) / 0xffff;
    };

    const n = Math.floor(dur * pxps / 4);
    const color = colFor(sp.hue);
    const wave = `color-mix(in oklch, ${color} 80%, transparent)`;
    const dim = `color-mix(in oklch, ${color} 22%, transparent)`;
    const bars: Array<{ h: number; color: string }> = [];

    for (let i = 0; i < n; i++) {
      const t = (i * 4 + 2) / pxps;
      const active = segments.some(s => s.speaker === sp.id && t >= s.start && t <= s.end);
      const h = active
        ? 10 + Math.floor(rnd() * (58 - 24))
        : 2 + Math.floor(rnd() * 5);
      bars.push({ h, color: active ? wave : dim });
    }

    map[sp.id] = bars;
  });

  return map;
}

// Download blob as file
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
