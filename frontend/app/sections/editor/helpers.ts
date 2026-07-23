import type { Segment } from '@/app/types';

export function segStart(s: Pick<Segment, 'start_time' | 'start'>): number {
  return s.start_time ?? s.start ?? 0;
}

export function segEnd(s: Pick<Segment, 'end_time' | 'end'>): number {
  return s.end_time ?? s.end ?? 0;
}
