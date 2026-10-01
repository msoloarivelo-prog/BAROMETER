'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Framework = require('../js/framework.js');
const Scoring = require('../js/scoring.js');

function allComponents() {
  return Framework.allComponents().map((e) => e.component);
}

function answerAll(level) {
  return Object.fromEntries(allComponents().map((c) => [c.id, level]));
}

test('framework has the 33 components of the Excel workbook', () => {
  assert.equal(allComponents().length, 33);
  const counts = Framework.PILLARS.map((p) => p.aspects.reduce((n, a) => n + a.components.length, 0));
  assert.deepEqual(counts, [7, 13, 5, 8]);
});

test('every component has 4 bilingual levels and a unique id', () => {
  const ids = new Set();
  for (const c of allComponents()) {
    assert.equal(c.levels.length, 4, c.id);
    assert.ok(c.name.fr && c.name.en, c.id);
    for (const l of c.levels) assert.ok(l.fr && l.en, c.id);
    assert.ok(!ids.has(c.id), `duplicate ${c.id}`);
    ids.add(c.id);
  }
});

// Values cached by Excel in the supplied file (organisation "SAGE"):
// every component at 4 except "Mission" at 2.
test('reproduces the Excel "Fiche de Calculs" results', () => {
  const answers = answerAll(4);
  answers['gov-mission-statement'] = 2;
  const r = Scoring.computeScores(Framework, answers);
  assert.equal(r.total, 130); // D74
  assert.equal(r.maxTotal, 132);
  assert.ok(Math.abs(r.index - 3.9393939393939394) < 1e-12); // D76
  assert.deepEqual(r.pillars.map((p) => p.score), [3.5, 4, 4, 4]); // D81..D87
  assert.equal(r.pillars[0].aspects[1].score, 2);
  assert.equal(r.indexMethod, 'components');
  assert.ok(r.complete);
});

test('pillar = mean of aspects, not of components', () => {
  const answers = answerAll(4);
  answers['gov-board-role'] = 1;
  answers['gov-board-effectiveness'] = 1;
  answers['gov-board-members'] = 1;
  const r = Scoring.computeScores(Framework, answers);
  assert.equal(r.pillars[0].aspects[0].score, 1);
  assert.equal(r.pillars[0].score, (1 + 4 + 4 + 4) / 4);
});

test('unanswered components are ignored', () => {
  const r = Scoring.computeScores(Framework, { 'gov-board-role': 3, 'hr-skills-match': 1 });
  assert.equal(r.answered, 2);
  assert.equal(r.complete, false);
  assert.equal(r.total, 4);
  assert.equal(r.index, 2);
  assert.equal(r.pillars[1].score, null);
});

test('invalid values are rejected', () => {
  const r = Scoring.computeScores(Framework, { 'gov-board-role': 7, 'gov-board-members': '3', 'hr-skills-match': 2.5 });
  assert.equal(r.answered, 0);
  assert.equal(r.index, null);
});

test('comparison between two assessments', () => {
  const d = Scoring.compareScores(
    Scoring.computeScores(Framework, answerAll(3)),
    Scoring.computeScores(Framework, answerAll(2))
  );
  assert.equal(d.index, 1);
  assert.equal(d.total, 33);
  assert.ok(d.pillars.every((p) => p.delta === 1));
});

test('categories: 4 = maintain, 3 = opportunity, 1-2 = address', () => {
  assert.equal(Scoring.categoryFor(4), 'maintain');
  assert.equal(Scoring.categoryFor(3), 'opportunity');
  assert.equal(Scoring.categoryFor(2), 'address');
  assert.equal(Scoring.categoryFor(1), 'address');
  assert.equal(Scoring.categoryFor(null), null);
});

test('classify groups components and sorts weaknesses weakest first', () => {
  const answers = answerAll(4);
  answers['fin-vulnerability-diversity'] = 2;
  answers['hr-development-training'] = 1;
  answers['gov-mission-statement'] = 3;
  const g = Scoring.classify(Framework, answers);
  assert.equal(g.maintain.length, 30);
  assert.deepEqual(g.opportunity.map((x) => x.component.id), ['gov-mission-statement']);
  assert.deepEqual(g.address.map((x) => x.component.id), ['hr-development-training', 'fin-vulnerability-diversity']);
  const r = Scoring.computeScores(Framework, answers);
  assert.deepEqual(r.counts, { maintain: 30, opportunity: 1, address: 2 });
});

test('Excel method gives implicit pillar weights proportional to component counts', () => {
  const w = Scoring.effectiveWeights(Framework, { indexMethod: 'components' });
  assert.ok(Math.abs(w.gov - (7 / 33) * 100) < 1e-9);
  assert.ok(Math.abs(w.plan - (13 / 33) * 100) < 1e-9);
  assert.ok(Math.abs(w.hr - (5 / 33) * 100) < 1e-9);
  assert.ok(Math.abs(w.fin - (8 / 33) * 100) < 1e-9);
});

test('weighted method uses explicit pillar weights', () => {
  const answers = answerAll(4);
  for (const a of Framework.PILLARS[1].aspects) for (const c of a.components) answers[c.id] = 2; // Planning = 2
  const equal = Scoring.computeScores(Framework, answers, { indexMethod: 'weighted', weights: { gov: 25, plan: 25, hr: 25, fin: 25 } });
  assert.equal(equal.index, 3.5);
  const custom = Scoring.computeScores(Framework, answers, { indexMethod: 'weighted', weights: { gov: 40, plan: 10, hr: 25, fin: 25 } });
  assert.ok(Math.abs(custom.index - 3.8) < 1e-12);
  // Excel method: 13 components at 2, 20 at 4
  const excel = Scoring.computeScores(Framework, answers);
  assert.ok(Math.abs(excel.index - (13 * 2 + 20 * 4) / 33) < 1e-12);
});

test('weighted method re-normalises when a pillar has no answers', () => {
  const r = Scoring.computeScores(Framework, { 'gov-board-role': 4, 'hr-skills-match': 2 }, { indexMethod: 'weighted', weights: { gov: 25, plan: 25, hr: 25, fin: 25 } });
  assert.equal(r.index, 3);
});

test('development stage for a mean score', () => {
  assert.equal(Scoring.stageFor(Framework, 1.2).value, 1);
  assert.equal(Scoring.stageFor(Framework, 3.6).value, 4);
  assert.equal(Scoring.stageFor(Framework, null), null);
});
