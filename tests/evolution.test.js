'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Framework = require('../js/framework.js');
const Storage = require('../js/storage.js');
const Evolution = require('../js/evolution.js');

function answerAll(level) {
  return Object.fromEntries(Framework.allComponents().map((e) => [e.component.id, level]));
}

function assessment(seq, year, period, answers) {
  const a = Storage.newAssessment(seq, year);
  a.period = period;
  a.answers = answers;
  return a;
}

test('assessments are ordered by period, then year, then sequence', () => {
  const a = assessment(1, 2025, '2025-06', {});
  const b = assessment(2, 2026, '', {});
  const c = assessment(3, 2025, '2025-12', {});
  const order = Evolution.chronological([b, c, a]).map((x) => x.sequence);
  assert.deepEqual(order, [1, 3, 2]);
});

test('timeline returns scores oldest first', () => {
  const t = Evolution.timeline(Framework, [assessment(2, 2026, '', answerAll(3)), assessment(1, 2025, '', answerAll(2))]);
  assert.deepEqual(t.map((x) => x.scores.index), [2, 3]);
});

test('component changes and category transitions', () => {
  const from = answerAll(3);
  from['gov-mission-statement'] = 1; // weakness
  from['fin-management-audit'] = 4; // strength
  const to = answerAll(3);
  to['gov-mission-statement'] = 3; // weakness resolved
  to['fin-management-audit'] = 2; // strength lost, new weakness
  to['hr-skills-match'] = 4; // new strength
  delete to['plan-me-feedback'];
  const ch = Evolution.componentChanges(Framework, from, to);
  assert.deepEqual(ch.improved.map((x) => x.component.id), ['gov-mission-statement', 'hr-skills-match']);
  assert.deepEqual(ch.declined.map((x) => x.component.id), ['fin-management-audit']);
  assert.deepEqual(ch.resolvedWeaknesses.map((x) => x.component.id), ['gov-mission-statement']);
  assert.deepEqual(ch.newWeaknesses.map((x) => x.component.id), ['fin-management-audit']);
  assert.deepEqual(ch.newStrengths.map((x) => x.component.id), ['hr-skills-match']);
  assert.deepEqual(ch.lostStrengths.map((x) => x.component.id), ['fin-management-audit']);
  assert.equal(ch.notCompared, 1);
  assert.equal(ch.stable.length, 33 - 3 - 1);
});

test('plan follow-up rate', () => {
  const a = Storage.newAssessment(1, 2026);
  assert.equal(Evolution.planFollowUp(a).rate, null);
  a.plan.activities = [Storage.newActivity({ status: 'done' }), Storage.newActivity({}), Storage.newActivity({ status: 'done' }), Storage.newActivity({})];
  const f = Evolution.planFollowUp(a);
  assert.equal(f.rate, 0.5);
  assert.equal(f.done.length, 2);
});

test('assessment period is kept and validated', () => {
  const ws = Storage.normalizeWorkspace({ orgs: [{ id: 'o', organization: {}, assessments: [
    { id: 'a', sequence: 6, year: 2028, period: '2028-03' },
    { id: 'b', sequence: 1, year: 2025, period: 'bad' }
  ] }] });
  const [a, b] = ws.orgs[0].assessments;
  assert.equal(a.period, '2028-03');
  assert.equal(a.sequence, 6);
  assert.equal(b.period, '');
});
