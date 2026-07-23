/** Map API responses to UI-friendly shapes. */
import type {
  ApiSegment,
  Project as ApiProject,
  ProjectSpeaker,
  Transcript,
} from '@/app/lib/api';
import type { Project, Segment, Speaker } from '@/app/types';

export function formatDurationSeconds(seconds?: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null;
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatRelativeTime(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

/** Map list/detail project API → UI Project used in cards/editor. */
export function mapApiProject(p: ApiProject): Project {
  const dur =
    p.duration_display ||
    formatDurationSeconds(p.duration_seconds) ||
    null;

  return {
    id: p.id,
    name: p.name,
    initial: p.initial || (p.name?.[0]?.toUpperCase() ?? 'P'),
    tile: p.tile ?? 0,
    desc: p.description || '',
    description: p.description,
    langs: typeof p.langs === 'number' ? p.langs : 0,
    dur: dur ?? '—',
    duration_seconds: p.duration_seconds,
    duration_display: p.duration_display,
    updated: formatRelativeTime(p.updated_at),
    updated_at: p.updated_at,
    created_at: p.created_at,
    status: p.status,
    role: p.role,
    source_language: p.source_language,
    is_archived: p.is_archived,
    is_favorite: p.is_favorite,
    is_deleted: p.is_deleted,
    owner_id: p.owner_id,
    series_id: p.series_id,
    storage_key: p.storage_key,
    job_id: p.job_id,
    job_status: p.job_status,
    job_progress: p.job_progress,
    job_message: p.job_message,
    ts: p.updated_at ? new Date(p.updated_at).getTime() : 0,
  };
}

export function mapApiSegment(s: ApiSegment): Segment {
  return {
    id: s.id,
    transcript_id: s.transcript_id,
    speaker_id: s.speaker_id ?? null,
    start_time: s.start_time,
    end_time: s.end_time,
    sort_order: s.sort_order,
    text: s.text ?? '',
    confidence: s.confidence ?? null,
    // aliases used by some UI helpers
    start: s.start_time,
    end: s.end_time,
  };
}

export function mapApiSpeaker(s: ProjectSpeaker): Speaker {
  return {
    id: s.id,
    name: s.name,
    hue: s.hue,
    project_id: s.project_id,
    voice_clone_id: s.voice_clone_id ?? null,
    segment_count: s.segment_count ?? 0,
  };
}

export function uniqueLanguageCodes(transcripts: Transcript[]): string[] {
  const codes: string[] = [];
  for (const t of transcripts) {
    if (t.language_code && !codes.includes(t.language_code)) {
      codes.push(t.language_code);
    }
  }
  return codes;
}

export function pickDefaultLanguage(
  transcripts: Transcript[],
  sourceLanguage?: string,
): string {
  const original = transcripts.find(t => t.type === 'original');
  if (original?.language_code) return original.language_code;
  if (sourceLanguage && transcripts.some(t => t.language_code === sourceLanguage)) {
    return sourceLanguage;
  }
  return transcripts[0]?.language_code || sourceLanguage || 'en';
}
