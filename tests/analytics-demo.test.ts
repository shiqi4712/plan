import assert from 'node:assert/strict';
import test from 'node:test';
import { summarize, selectVisits, daysBetween, type DemoVisit } from '../lib/analytics-demo';

test('UV deduplicates across dates and courses while page views and closing entries accumulate', () => {
  const visits: DemoVisit[] = [
    {id:'1',visitor:'a',course:'first',date:'2026-09-16',closing:2},
    {id:'2',visitor:'a',course:'second',date:'2026-09-17',closing:1},
    {id:'3',visitor:'b',course:'first',date:'2026-09-17',closing:0},
  ];
  assert.deepEqual(summarize(visits), {pv:3,uv:2,closing:3,closingUV:1,rate:50});
  assert.deepEqual(summarize([]), {pv:0,uv:0,closing:0,closingUV:0,rate:0});
});
test('date and course filtering isolate the selected population', () => {
  const visits=selectVisits('2026-09-17','2026-09-17','yucai-preschool');
  assert.ok(visits.length>0);
  assert.ok(visits.every(v=>v.date==='2026-09-17' && v.course==='yucai-preschool'));
  assert.deepEqual(daysBetween('2026-09-16','2026-09-17'),['2026-09-16','2026-09-17']);
  assert.deepEqual(selectVisits('2026-09-18','2026-09-19'),[]);
});
