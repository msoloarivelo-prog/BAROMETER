'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Framework = require('../js/framework.js');
const Scoring = require('../js/scoring.js');

function allComponents() {
  return Framework.PILLARS.flatMap((p) => p.aspects.flatMap((a) => a.components));
}

function answerAll(level) {
  return Object.fromEntries(allComponents().map((c) => [c.id, level]));
}

test('le cadre contient les 33 composantes du classeur Excel', () => {
  assert.equal(allComponents().length, 33);
  const counts = Framework.PILLARS.map((p) => p.aspects.reduce((n, a) => n + a.components.length, 0));
  assert.deepEqual(counts, [7, 13, 5, 8]);
});

test('chaque composante a 4 niveaux et un identifiant unique', () => {
  const ids = new Set();
  for (const c of allComponents()) {
    assert.equal(c.levels.length, 4, c.id);
    assert.ok(!ids.has(c.id), `doublon ${c.id}`);
    ids.add(c.id);
  }
});

// Valeurs mises en cache par Excel dans le fichier fourni (organisation "SAGE") :
// toutes les composantes à 4 sauf "Mission" à 2.
test('reproduit les résultats de la Fiche de Calculs Excel', () => {
  const answers = answerAll(4);
  answers['gov-mission-statement'] = 2;
  const r = Scoring.computeScores(Framework, answers);

  assert.equal(r.total, 130); // D74
  assert.equal(r.maxTotal, 132);
  assert.ok(Math.abs(r.index - 3.9393939393939394) < 1e-12); // D76
  assert.deepEqual(r.pillars.map((p) => p.score), [3.5, 4, 4, 4]); // D81, D83, D85, D87
  assert.equal(r.pillars[0].aspects[1].score, 2); // Table_donnees C4 (Mission)
  assert.ok(r.complete);
});

test('pilier = moyenne des aspects, pas des composantes', () => {
  const answers = answerAll(4);
  // Conseil d'Administration : 1,1,1 -> 1 ; Mission 4 ; Autonomie 4 ; Leadership 4
  answers['gov-board-role'] = 1;
  answers['gov-board-effectiveness'] = 1;
  answers['gov-board-members'] = 1;
  const r = Scoring.computeScores(Framework, answers);
  assert.equal(r.pillars[0].aspects[0].score, 1);
  assert.equal(r.pillars[0].score, (1 + 4 + 4 + 4) / 4);
});

test('les composantes non renseignées sont ignorées', () => {
  const r = Scoring.computeScores(Framework, { 'gov-board-role': 3, 'hr-skills-match': 1 });
  assert.equal(r.answered, 2);
  assert.equal(r.complete, false);
  assert.equal(r.total, 4);
  assert.equal(r.index, 2);
  assert.equal(r.pillars[1].score, null);
  assert.equal(r.pillars[0].score, 3);
});

test('les valeurs invalides sont rejetées', () => {
  const r = Scoring.computeScores(Framework, { 'gov-board-role': 7, 'gov-board-members': '3', 'hr-skills-match': 2.5 });
  assert.equal(r.answered, 0);
  assert.equal(r.index, null);
});

test('comparaison entre deux diagnostics (colonne Changement)', () => {
  const before = Scoring.computeScores(Framework, answerAll(2));
  const after = Scoring.computeScores(Framework, answerAll(3));
  const d = Scoring.compareScores(after, before);
  assert.equal(d.index, 1);
  assert.equal(d.total, 33);
  assert.ok(d.pillars.every((p) => p.delta === 1));
});

test('composantes les plus faibles triées par score croissant', () => {
  const answers = answerAll(3);
  answers['fin-vulnerability-diversity'] = 1;
  answers['hr-development-training'] = 2;
  const weak = Scoring.weakestComponents(Framework, answers, 2);
  assert.deepEqual(weak.map((w) => w.componentId), ['fin-vulnerability-diversity', 'hr-development-training']);
});

test('stade de développement associé à un score moyen', () => {
  assert.equal(Scoring.stageFor(Framework, 1.2).value, 1);
  assert.equal(Scoring.stageFor(Framework, 3.6).value, 4);
  assert.equal(Scoring.stageFor(Framework, null), null);
});
