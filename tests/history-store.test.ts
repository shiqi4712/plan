import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getHistory, deleteHistory } from '../lib/history-store';

test('historical deletion is scoped, persistent and does not erase the source snapshot', () => {
  const directory = mkdtempSync(join(tmpdir(), 'history-test-'));
  const previous = process.env.ANALYTICS_HISTORY_FILE;
  try {
    process.env.ANALYTICS_HISTORY_FILE = join(directory, 'snapshot.json');
    const records = [{visitor:'a',date:'2026-09-11',course:'kete-moon'}, {visitor:'b',date:'2026-09-12',course:'kete-moon'}, {visitor:'a',date:'2026-09-11',course:'kete-python'}];
    writeFileSync(process.env.ANALYTICS_HISTORY_FILE, JSON.stringify({source:'nginx-history',records}));
    assert.equal(getHistory()?.records.length, 3);
    assert.equal(deleteHistory('2026-09-11','2026-09-11','kete-moon'), 1);
    assert.deepEqual(getHistory()?.records, records.slice(1));
    assert.equal(deleteHistory('2026-09-11','2026-09-11','kete-moon'), 0);
    assert.throws(()=>deleteHistory('2026-09-11','2026-09-11','invalid'));
    assert.throws(()=>deleteHistory('2026-09-12','2026-09-11','all'));
  } finally {
    if (previous === undefined) delete process.env.ANALYTICS_HISTORY_FILE;
    else process.env.ANALYTICS_HISTORY_FILE = previous;
    rmSync(directory,{recursive:true,force:true});
  }
});
