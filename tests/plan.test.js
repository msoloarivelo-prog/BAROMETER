'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Framework = require('../js/framework.js');
const Activities = require('../js/activities.js');
const Storage = require('../js/storage.js');
const Plan = require('../js/plan.js');

function answerAll(level) {
  return Object.fromEntries(Framework.allComponents().map((e) => [e.component.id, level]));
}

test('the library has address, opportunity and maintain activities for every component', () => {
  for (const { component } of Framework.allComponents()) {
    for (const cat of ['address', 'opportunity', 'maintain']) {
      const list = Activities.get(component.id, cat);
      assert.ok(list.length >= 1, `${component.id} ${cat}`);
      for (const a of list) {
        assert.ok(a.title.fr && a.title.en && a.indicator.fr && a.indicator.en, a.key);
        assert.ok(a.months[0] >= 1 && a.months[1] <= Storage.MONTHS && a.months[0] <= a.months[1], a.key);
      }
    }
  }
});

test('standard activities follow the category of each component', () => {
  const a = Storage.newAssessment(1, 2026);
  a.answers = answerAll(4);
  a.answers['gov-mission-statement'] = 1;
  a.answers['hr-skills-match'] = 3;
  const res = Plan.syncStandardActivities(Framework, a);
  assert.equal(res.added, a.plan.activities.length);
  const mission = a.plan.activities.filter((x) => x.componentId === 'gov-mission-statement');
  assert.ok(mission.length === 2 && mission.every((x) => x.category === 'address' && x.priority === 'essential'));
  const skills = a.plan.activities.filter((x) => x.componentId === 'hr-skills-match');
  assert.ok(skills.every((x) => x.category === 'opportunity'));
  const role = a.plan.activities.filter((x) => x.componentId === 'gov-board-role');
  assert.ok(role.every((x) => x.category === 'maintain' && x.start === 1 && x.end === 24));
});

test('sync is idempotent and keeps edited and custom activities', () => {
  const a = Storage.newAssessment(1, 2026);
  a.answers = { 'gov-mission-statement': 1, 'gov-board-role': 2 };
  Plan.syncStandardActivities(Framework, a);
  const n = a.plan.activities.length;
  assert.equal(Plan.syncStandardActivities(Framework, a).added, 0);
  assert.equal(a.plan.activities.length, n);

  const custom = Plan.addCustomActivity(Framework, a, 'gov-mission-statement');
  custom.title = 'Our own idea';
  const edited = a.plan.activities.find((x) => x.componentId === 'gov-board-role');
  edited.lead = 'Chair';
  edited.edited = true;

  // Scores improve: role goes to 4, mission to 3
  a.answers['gov-board-role'] = 4;
  a.answers['gov-mission-statement'] = 3;
  const res = Plan.syncStandardActivities(Framework, a);
  assert.ok(res.removed >= 3);
  assert.ok(a.plan.activities.includes(custom));
  assert.ok(a.plan.activities.includes(edited));
  assert.ok(a.plan.activities.some((x) => x.componentId === 'gov-mission-statement' && x.category === 'opportunity' && x.source === 'standard'));
  assert.ok(a.plan.activities.some((x) => x.componentId === 'gov-board-role' && x.category === 'maintain'));
});

test('standard texts are resolved in the chosen language, overrides win', () => {
  const a = Storage.newAssessment(1, 2026);
  a.answers = { 'fin-management-audit': 1 };
  Plan.syncStandardActivities(Framework, a);
  const act = a.plan.activities[0];
  assert.match(Plan.resolveTexts(act, 'en').title, /audit/i);
  assert.match(Plan.resolveTexts(act, 'fr').title, /audit/i);
  act.title = 'Audit 2027 by firm X';
  assert.equal(Plan.resolveTexts(act, 'en').title, 'Audit 2027 by firm X');
});

test('plan statistics', () => {
  const a = Storage.newAssessment(1, 2026);
  a.answers = { 'fin-management-audit': 1 };
  Plan.syncStandardActivities(Framework, a);
  a.plan.activities[0].status = 'done';
  const s = Plan.stats(a.plan);
  assert.equal(s.total, 2);
  assert.equal(s.done, 1);
  assert.equal(s.progress, 0.5);
});

test('the plan horizon is 24 months', () => {
  assert.equal(Storage.MONTHS, 24);
  const a = Storage.newAssessment(1, 2026);
  a.answers = { 'gov-mission-statement': 1, 'hr-skills-match': 3 };
  Plan.syncStandardActivities(Framework, a);
  const address = a.plan.activities.filter((x) => x.category === 'address');
  assert.ok(address.every((x) => x.end <= 15), 'weaknesses are worked on first');
  const opp = a.plan.activities.find((x) => x.category === 'opportunity');
  assert.ok(opp.end > 12, 'opportunities run into year 2');
});

test('timeline header groups months by year', () => {
  const plain = Plan.timelineHeader('', 24, 'en');
  assert.deepEqual(plain.groups.map((g) => [g.key, g.span]), [['Y1', 12], ['Y2', 12]]);
  assert.equal(plain.labels[23], '24');
  const cal = Plan.timelineHeader('2026-11', 24, 'en');
  assert.deepEqual(cal.groups.map((g) => [g.label, g.span]), [['2026', 2], ['2027', 12], ['2028', 10]]);
  assert.equal(cal.labels.length, 24);
});

test('month labels follow the plan start month', () => {
  assert.equal(Plan.monthLabel('', 3, 'en'), 'M3');
  assert.match(Plan.monthLabel('2026-11', 3, 'en'), /Jan/);
});
