'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Storage = require('../js/storage.js');
const Sync = require('../js/sync.js');

const clone = (x) => JSON.parse(JSON.stringify(x));

function baseOrg() {
  const org = Storage.newOrg('Org');
  org.assessments.push(Storage.newAssessment(2, 2026));
  return Storage.normalizeOrg(org);
}

test('normalizing an organisation twice gives the same copy (no false changes)', () => {
  const once = Storage.normalizeOrg(baseOrg());
  assert.equal(JSON.stringify(Storage.normalizeOrg(clone(once))), JSON.stringify(once));
});

test('three-way merge keeps the changes of both sides', () => {
  const base = baseOrg();
  const [a1, a2] = base.assessments;
  const local = clone(base);
  const remote = clone(base);
  local.organization.region = 'Analamanga';
  local.assessments[0].answers.x = 3;
  remote.organization.phone = '+261';
  remote.assessments[1].answers.y = 2;
  remote.assessments.push(Storage.newAssessment(3, 2026));
  const m = Sync.merge(local, remote, base);
  assert.equal(m.organization.region, 'Analamanga');
  assert.equal(m.organization.phone, '+261');
  assert.equal(m.assessments.find((a) => a.id === a1.id).answers.x, 3);
  assert.equal(m.assessments.find((a) => a.id === a2.id).answers.y, 2);
  assert.equal(m.assessments.length, 3);
});

test('a stale local copy does not overwrite newer remote changes', () => {
  const base = baseOrg();
  const local = clone(base);
  local.activeAssessmentId = base.assessments[0].id; // only the selection changed here
  const remote = clone(base);
  remote.organization.region = 'Vakinankaratra';
  remote.assessments[0].comments.c = 'new';
  const m = Sync.merge(local, remote, base);
  assert.equal(m.organization.region, 'Vakinankaratra');
  assert.equal(m.assessments[0].comments.c, 'new');
  assert.equal(m.activeAssessmentId, base.assessments[0].id);
});

test('deletions on one side are kept unless the other side changed the assessment', () => {
  const base = baseOrg();
  const local = clone(base);
  local.assessments = [local.assessments[0]];
  const remote = clone(base);
  assert.equal(Sync.merge(local, remote, base).assessments.length, 1);
  remote.assessments[1].answers.z = 4;
  assert.equal(Sync.merge(local, remote, base).assessments.length, 2, 'changed elsewhere: kept');
});

test('without a base, nothing is lost', () => {
  const local = baseOrg();
  const remote = clone(local);
  remote.assessments.push(Storage.newAssessment(3, 2026));
  local.organization.region = 'Boeny';
  const m = Sync.merge(local, remote, null);
  assert.equal(m.assessments.length, 3);
  assert.equal(m.organization.region, 'Boeny');
});
