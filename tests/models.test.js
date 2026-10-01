'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Models = require('../js/models.js');
const Scoring = require('../js/scoring.js');
const Activities = require('../js/activities.js');
const Storage = require('../js/storage.js');
const Plan = require('../js/plan.js');
const Evolution = require('../js/evolution.js');

test('three models with the expected structure', () => {
  assert.deepEqual(Models.list().map((m) => m.id), ['barometer', 'itoca', 'opi']);
  const counts = Models.list().map((m) => [m.PILLARS.length, m.allComponents().length]);
  assert.deepEqual(counts, [[4, 33], [10, 94], [5, 10]]);
  assert.equal(Models.get('unknown').id, 'barometer');
  assert.equal(Models.get('opi').evidence, 'required');
  assert.equal(Models.get('opi').kind, 'performance');
});

test('every component of every model is bilingual, has 4 levels and a unique id', () => {
  const ids = new Set();
  for (const m of Models.list()) {
    for (const { component: c, pillar: p } of m.allComponents()) {
      assert.ok(!ids.has(c.id), 'duplicate ' + c.id);
      ids.add(c.id);
      assert.ok(c.name.fr && c.name.en, c.id);
      assert.equal(c.levels.length, 4, c.id);
      for (const l of c.levels) assert.ok(l.fr && l.en, c.id);
      assert.ok(p.color && p.reportColor, p.id);
      if (m.id !== 'barometer') assert.ok(c.statement.fr && c.statement.en, c.id);
    }
  }
});

test('the generic template contains no organisation-specific name', () => {
  const text = JSON.stringify(Models.get('itoca').PILLARS);
  assert.doesNotMatch(text, /\bAVG\b|\bSIF\b/);
});

test('every ITOCA and OPI indicator has suggested actions for each category', () => {
  for (const id of ['itoca', 'opi']) {
    for (const { component: c } of Models.get(id).allComponents()) {
      for (const cat of ['address', 'opportunity', 'maintain']) {
        const list = Activities.get(c.id, cat);
        assert.ok(list.length >= 1, c.id + ' ' + cat);
        assert.ok(list[0].title.fr && list[0].title.en && list[0].verification.fr, c.id);
      }
    }
  }
});

test('ITOCA and OPI global index = mean of domains (equal weights)', () => {
  const fw = Models.get('itoca');
  const answers = {};
  // Finance (18 items) at 1, every other domain at 4
  for (const { component: c, pillar: p } of fw.allComponents()) answers[c.id] = p.id === 'itoca-finance' ? 1 : 4;
  const r = Scoring.computeScores(fw, answers, Models.scoringSettings(fw, { indexMethod: 'components' }));
  assert.ok(Math.abs(r.index - (9 * 4 + 1) / 10) < 1e-12);
  assert.ok(r.index > r.componentIndex, 'equal domain weights, not item weights');
  assert.ok(Math.abs(r.componentIndex - (76 * 4 + 18) / 94) < 1e-12);
});

test('the barometer keeps the Excel method by default', () => {
  const fw = Models.get('barometer');
  assert.deepEqual(Models.scoringSettings(fw, { indexMethod: 'components' }), { indexMethod: 'components' });
});

test('CAP pre-fill: suggested actions with means of verification for an ITOCA assessment', () => {
  const fw = Models.get('itoca');
  const a = Storage.newAssessment(1, 2026, 'itoca');
  a.answers = { 'itoca-gov-conflict-of-interest-policy': 1 };
  const id = fw.allComponents().find((e) => /conflict/.test(e.component.id)).component.id;
  a.answers = { [id]: 1 };
  Plan.syncStandardActivities(fw, a);
  assert.equal(a.plan.activities.length, 1);
  const texts = Plan.resolveTexts(a.plan.activities[0], 'en');
  assert.match(texts.title, /conflict of interest/i);
  assert.ok(texts.verification);
});

test('progress over time stays within one model', () => {
  const b = Storage.newAssessment(1, 2025, 'barometer');
  const i1 = Storage.newAssessment(1, 2024, 'itoca');
  const i2 = Storage.newAssessment(2, 2026, 'itoca');
  const list = Evolution.chronological([b, i1, i2].filter((a) => a.model === 'itoca'));
  assert.deepEqual(list.map((a) => a.year), [2024, 2026]);
});

test('gap-focused models only pre-fill actions for weaknesses and opportunities', () => {
  const fw = Models.get('itoca');
  const a = Storage.newAssessment(1, 2026, 'itoca');
  fw.allComponents().forEach((e, i) => { a.answers[e.component.id] = [1, 3, 4, 4][i % 4]; });
  Plan.syncStandardActivities(fw, a);
  assert.ok(a.plan.activities.every((x) => x.category === 'address' || x.category === 'opportunity'));
  assert.equal(a.plan.activities.length, fw.allComponents().filter((e, i) => i % 4 < 2).length);
  // The barometer still pre-fills maintenance actions
  const b = Storage.newAssessment(1, 2026, 'barometer');
  b.answers = { 'gov-board-role': 4 };
  Plan.syncStandardActivities(Models.get('barometer'), b);
  assert.equal(b.plan.activities[0].category, 'maintain');
});
