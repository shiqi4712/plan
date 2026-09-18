import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import type { HistoryData } from './history-types';
import { COURSE_PLAN_PROFILES } from './course-plan-profiles';

export function getHistory(): HistoryData | null {
  const filename = process.env.ANALYTICS_HISTORY_FILE;
  if (!filename) return null;
  const data = JSON.parse(readFileSync(filename, 'utf8')) as HistoryData;
  if (data.source !== 'nginx-history' || !Array.isArray(data.records)) throw new Error('Invalid historical analytics snapshot');
  const removed = new Set<number>(existsSync(filename + '.deleted') ? JSON.parse(readFileSync(filename + '.deleted', 'utf8')) : []);
  return { ...data, records: data.records.filter((_, index) => !removed.has(index)) };
}

export function deleteHistory(start: string, end: string, course: string) {
  const filename = process.env.ANALYTICS_HISTORY_FILE;
  if (!filename) throw new Error('History is not configured');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end || (course !== 'all' && !Object.hasOwn(COURSE_PLAN_PROFILES, course))) throw new Error('Invalid filter');
  const data = JSON.parse(readFileSync(filename, 'utf8')) as HistoryData;
  const removed = new Set<number>(existsSync(filename + '.deleted') ? JSON.parse(readFileSync(filename + '.deleted', 'utf8')) : []);
  const before = removed.size;
  data.records.forEach((record, index) => {
    if (record.date >= start && record.date <= end && (course === 'all' || record.course === course)) removed.add(index);
  });
  // Single-process synchronous mutation plus atomic rename prevents partial writes.
  writeFileSync(filename + '.deleted.tmp', JSON.stringify([...removed]), { mode: 0o600 });
  renameSync(filename + '.deleted.tmp', filename + '.deleted');
  return removed.size - before;
}
