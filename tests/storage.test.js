'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Storage = require('../js/storage.js');

const legacyV1 = {
  schemaVersion: 1,
  organization: { name: 'SAGE', address: 'Antananarivo', focalPoint: 'Rasoa', phone: '', email: '' },
  assessments: [{
    id: 'a1', sequence: 1, year: 2016,
    answers: { 'gov-board-role': 2, 'bad': 9 },
    comments: { 'gov-board-role': 'PV 2016' },
    plan: {
      'gov-board-role': {
        challenge: 'Roles unclear', activities: 'Board charter', lead: 'Chair', priority: 'Essentiel',
        months: [false, true, true, false, false, false, false, false, false, false, false, false]
      }
    }
  }],
  activeAssessmentId: 'a1'
};

test('migrates a version-1 file into a workspace', () => {
  const ws = Storage.normalizeWorkspace(legacyV1);
  assert.equal(ws.orgs.length, 1);
  const org = ws.orgs[0];
  assert.equal(org.organization.name, 'SAGE');
  const a = org.assessments[0];
  assert.deepEqual(a.answers, { 'gov-board-role': 2 });
  assert.equal(a.plan.challenges['gov-board-role'], 'Roles unclear');
  assert.equal(a.plan.activities.length, 1);
  const act = a.plan.activities[0];
  assert.equal(act.title, 'Board charter');
  assert.equal(act.priority, 'essential');
  assert.equal(act.start, 2);
  assert.equal(act.end, 3);
  assert.equal(act.source, 'custom');
});

test('organisation export round-trips through import', () => {
  const org = Storage.newOrg('Alpha');
  org.assessments[0].answers['fin-management-audit'] = 3;
  const file = JSON.parse(JSON.stringify(Storage.exportOrg(org)));
  const parsed = Storage.parseImport(file);
  assert.equal(parsed.orgs.length, 1);
  assert.equal(parsed.orgs[0].id, org.id);
  assert.equal(parsed.orgs[0].assessments[0].answers['fin-management-audit'], 3);
});

test('merge adds new organisations, replaces same id and drops the blank one', () => {
  const ws = Storage.newWorkspace();
  const a = Storage.newOrg('Alpha');
  const b = Storage.newOrg('Beta');
  let res = Storage.mergeOrgs(ws, [a, b]);
  assert.deepEqual(res, { added: 2, replaced: 0 });
  assert.deepEqual(ws.orgs.map((o) => o.organization.name), ['Alpha', 'Beta']);
  const a2 = JSON.parse(JSON.stringify(a));
  a2.organization.name = 'Alpha v2';
  res = Storage.mergeOrgs(ws, [Storage.normalizeOrg(a2)]);
  assert.deepEqual(res, { added: 0, replaced: 1 });
  assert.equal(ws.orgs[0].organization.name, 'Alpha v2');
});

test('workspace backup keeps settings', () => {
  const ws = Storage.newWorkspace();
  ws.settings.lang = 'en';
  ws.settings.indexMethod = 'weighted';
  ws.settings.weights.gov = 40;
  const parsed = Storage.parseImport(JSON.parse(JSON.stringify(Storage.exportWorkspace(ws))));
  assert.equal(parsed.settings.lang, 'en');
  assert.equal(parsed.settings.indexMethod, 'weighted');
  assert.equal(parsed.settings.weights.gov, 40);
});

test('invalid files are rejected', () => {
  assert.throws(() => Storage.parseImport(null));
  assert.throws(() => Storage.parseImport({ foo: 1 }));
  assert.throws(() => Storage.parseImport({ assessments: [] }));
});

test('activity months are clamped and ordered', () => {
  const ws = Storage.normalizeWorkspace({
    orgs: [{ id: 'o1', organization: { name: 'X' }, assessments: [{ id: 'a', plan: { activities: [{ start: 9, end: 3 }, { start: 0, end: 40 }] } }] }]
  });
  const acts = ws.orgs[0].assessments[0].plan.activities;
  assert.deepEqual([acts[0].start, acts[0].end], [9, 9]);
  assert.deepEqual([acts[1].start, acts[1].end], [1, 24]);
});
