import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { recordEvent, getLiveAnalytics, deleteLiveAnalytics, type TrackEvent } from '../lib/live-analytics-store';
import { POST } from '../app/api/analytics/track/route';

test('persistent visits: retry deduplication, browser UV, course binding, closing attribution, scoped deletion', () => {
  const dir = mkdtempSync(join(tmpdir(), 'plan-live-'));
  process.env.ANALYTICS_DB_FILE = join(dir, 'test.sqlite');
  const event: TrackEvent = { event: 'visit', course: 'kete-moon', visitor: randomUUID(), visit: randomUUID() };
  const date = new Date('2026-09-18T15:59:59Z');
  const filter = { start: '2026-09-18', end: '2026-09-18', course: 'all' };
  try {
    assert.equal(recordEvent({ ...event, event: 'closing' }, date), 'missing');
    recordEvent(event, date); recordEvent(event, date);
    assert.equal(recordEvent({ ...event, course: 'kete-python' }, date), 'conflict');
    assert.equal(recordEvent({ ...event, visitor: randomUUID(), event: 'closing' }, date), 'conflict');
    recordEvent({ ...event, event: 'closing' }, new Date('2026-09-18T16:01:00Z'));
    recordEvent({ ...event, event: 'closing' }, date);
    assert.deepEqual(getLiveAnalytics(filter).totals, { pv: 1, uv: 1, closing: 1, rate: 1 });
    recordEvent({ ...event, visit: randomUUID(), course: 'kete-python' }, date);
    recordEvent({ ...event, visit: randomUUID(), visitor: randomUUID() }, date);
    assert.deepEqual(getLiveAnalytics(filter).totals, { pv: 3, uv: 2, closing: 1, rate: 1 / 3 });
    recordEvent({ ...event, visit: randomUUID() }, new Date('2026-09-18T16:01:00Z'));
    assert.equal(getLiveAnalytics({ ...filter, start: '2026-09-19', end: '2026-09-19' }).totals.pv, 1);
    assert.equal(deleteLiveAnalytics({ ...filter, course: 'kete-moon' }), 2);
    recordEvent(event, date); recordEvent({ ...event, event: 'closing' }, date);
    assert.deepEqual(getLiveAnalytics(filter).totals, { pv: 1, uv: 1, closing: 0, rate: 0 });
    assert.equal(deleteLiveAnalytics({ ...filter, course: 'kete-moon' }), 0);
    assert.throws(() => getLiveAnalytics({ ...filter, start: '2026-02-31' }));
    assert.throws(() => getLiveAnalytics({ ...filter, course: 'invalid' }));
  } finally { delete process.env.ANALYTICS_DB_FILE; rmSync(dir, { recursive: true, force: true }); }
});

test('tracking API validates origin, type, size, course and event identifiers', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'plan-api-'));
  process.env.ANALYTICS_DB_FILE = join(dir, 'api.sqlite');
  process.env.ANALYTICS_ORIGIN = 'https://plan.bcmty.cn';
  const event = { event: 'visit', course: 'yucai-rocket', visitor: randomUUID(), visit: randomUUID() };
  const request = (body: unknown, origin = 'https://plan.bcmty.cn', type = 'application/json') => new Request('https://plan.bcmty.cn/api/analytics/track', { method: 'POST', headers: { origin, 'content-type': type }, body: JSON.stringify(body) });
  try {
    assert.equal((await POST(request(event, 'https://evil.test'))).status, 403);
    assert.equal((await POST(request(event, '', 'text/plain'))).status, 403);
    assert.equal((await POST(request(event, undefined, 'text/plain'))).status, 415);
    assert.equal((await POST(request({ ...event, course: 'demo2' }))).status, 400);
    assert.equal((await POST(request({ ...event, visit: 'bad' }))).status, 400);
    assert.equal((await POST(request('x'.repeat(1025)))).status, 413);
    assert.equal((await POST(request({ ...event, event: 'closing' }))).status, 409);
    assert.equal((await POST(request(event))).status, 204);
    assert.equal((await POST(request(event))).status, 204);
    assert.equal((await POST(request({ ...event, event: 'closing' }))).status, 204);
  } finally { delete process.env.ANALYTICS_DB_FILE; delete process.env.ANALYTICS_ORIGIN; rmSync(dir, { recursive: true, force: true }); }
});
