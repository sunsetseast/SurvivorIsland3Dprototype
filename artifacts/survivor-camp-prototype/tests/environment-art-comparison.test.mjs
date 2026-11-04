import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Use a real complete report: guards must still reject draw/resource regressions
// after the capture contract changes. No renderer tolerances are widened.
const saved = JSON.parse(readFileSync(new URL('../../../docs/tonsai-art/evidence/before/report.json', import.meta.url)));
function compare(change = () => {}) {
  const root = mkdtempSync(join(tmpdir(), 'art-comparison-'));
  const before = structuredClone(saved);
  before.captureContract = 'static-camp-v1';
  before.samples.forEach(s => { s.npcSnapshot = [{id:11,x:0,y:0,z:0,animation:'sit'}]; });
  const after = structuredClone(before);
  change(after);
  for (const [phase, report] of [['before',before],['after',after]]) {
    mkdirSync(join(root,phase));
    writeFileSync(join(root,phase,'report.json'), JSON.stringify(report));
  }
  try {
    return spawnSync(process.execPath, ['scripts/environment-art-compare.mjs'], {encoding:'utf8', env:{...process.env, ART_EVIDENCE_ROOT:root}});
  } finally { rmSync(root,{recursive:true,force:true}); }
}
test('paired comparison accepts identical captures', () => assert.equal(compare().status, 0));
test('paired comparison still rejects a three-draw regression', () => {
  const result = compare(r => { r.poses.find(p => p.render).render.calls += 3; });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /draw-call budget/);
});
test('paired comparison rejects changed NPC staging and renderer conditions', () => {
  for (const change of [r => { r.samples[0].npcSnapshot[0].x++; }, r => { r.browser += '-other'; }]) {
    const result = compare(change);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /NPC staging|same browser/);
  }
});
