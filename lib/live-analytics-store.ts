import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { COURSE_PLAN_PROFILES } from './course-plan-profiles';
import { beijingDate, type AnalyticsFilter, type LiveAnalyticsData, type LiveCounts } from './live-analytics-types';

export type TrackEvent = { event: 'visit' | 'closing'; course: string; visitor: string; visit: string };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function validEvent(value: unknown): value is TrackEvent {
  if (!value || typeof value !== 'object') return false;
  const e = value as TrackEvent;
  return (e.event === 'visit' || e.event === 'closing') && typeof e.course === 'string' &&
    Object.hasOwn(COURSE_PLAN_PROFILES, e.course) && typeof e.visitor === 'string' && uuid.test(e.visitor) && typeof e.visit === 'string' && uuid.test(e.visit);
}
function open() {
  const filename = process.env.ANALYTICS_DB_FILE || resolve('.data/analytics.sqlite');
  mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY, visitor TEXT NOT NULL, course TEXT NOT NULL,
      started_at TEXT NOT NULL, day TEXT NOT NULL, closing_at TEXT, deleted INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS visits_day_course ON visits(day, course);
    CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  db.prepare('INSERT OR IGNORE INTO metadata VALUES (?, ?)').run('startedAt', new Date().toISOString());
  return db;
}
function validateFilter(filter: AnalyticsFilter) {
  const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
  if (!validDate(filter.start) || !validDate(filter.end) || filter.start > filter.end ||
    (filter.course !== 'all' && !Object.hasOwn(COURSE_PLAN_PROFILES, filter.course))) throw new Error('Invalid analytics filter');
}
export function recordEvent(event: TrackEvent, now = new Date()): 'ok' | 'missing' | 'conflict' {
  if (!validEvent(event)) throw new Error('Invalid event');
  const db = open();
  const visitor = createHash('sha256').update(event.visitor).digest('hex');
  try {
    db.exec('BEGIN IMMEDIATE');
    if (event.event === 'visit') db.prepare('INSERT OR IGNORE INTO visits (id, visitor, course, started_at, day) VALUES (?, ?, ?, ?, ?)')
      .run(event.visit, visitor, event.course, now.toISOString(), beijingDate(now));
    const row = db.prepare('SELECT visitor, course FROM visits WHERE id = ?').get(event.visit);
    let result: 'ok' | 'missing' | 'conflict' = 'ok';
    if (!row) result = 'missing';
    else if (row.visitor !== visitor || row.course !== event.course) result = 'conflict';
    else if (event.event === 'closing') db.prepare('UPDATE visits SET closing_at = ? WHERE id = ? AND closing_at IS NULL AND deleted = 0').run(now.toISOString(), event.visit);
    db.exec('COMMIT');
    return result;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  finally { db.close(); }
}
const where = 'deleted = 0 AND day >= ? AND day <= ? AND (? = \'all\' OR course = ?)';
const selectCounts = 'COUNT(*) AS pv, COUNT(DISTINCT visitor) AS uv, COUNT(closing_at) AS closing';
function counts(row: Record<string, unknown>): LiveCounts {
  const pv = Number(row.pv), uv = Number(row.uv), closing = Number(row.closing);
  return { pv, uv, closing, rate: pv ? closing / pv : 0 };
}
export function getLiveAnalytics(filter: AnalyticsFilter): LiveAnalyticsData {
  validateFilter(filter);
  const db = open();
  const args = [filter.start, filter.end, filter.course, filter.course];
  try {
    db.exec('BEGIN');
    const totals = counts(db.prepare(`SELECT ${selectCounts} FROM visits WHERE ${where}`).get(...args)!);
    const grouped = db.prepare(`SELECT course, ${selectCounts} FROM visits WHERE ${where} GROUP BY course`).all(...args);
    const rows = Object.keys(COURSE_PLAN_PROFILES).filter(c => filter.course === 'all' || filter.course === c).map(course => {
      const row = grouped.find(r => r.course === course);
      return { course, ...counts(row || { pv: 0, uv: 0, closing: 0 }) };
    }).sort((a, b) => b.pv - a.pv);
    const startedAt = String(db.prepare('SELECT value FROM metadata WHERE key = ?').get('startedAt')!.value);
    db.exec('COMMIT');
    return { updatedAt: new Date().toISOString(), startedAt, totals, rows };
  } finally { db.close(); }
}
export function deleteLiveAnalytics(filter: AnalyticsFilter) {
  validateFilter(filter);
  const db = open();
  try {
    // Keep deduplication tombstones so late retries cannot recreate deleted visits.
    return Number(db.prepare(`UPDATE visits SET deleted = 1 WHERE ${where}`).run(filter.start, filter.end, filter.course, filter.course).changes);
  } finally { db.close(); }
}
