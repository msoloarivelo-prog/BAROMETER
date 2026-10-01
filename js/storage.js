/*
 * Data model and local persistence (browser localStorage).
 *
 * Workspace (one per browser):
 *   { schemaVersion, settings, orgs: [Organisation], activeOrgId }
 * Organisation:
 *   { id, organization: {...profile}, assessments: [Assessment], activeAssessmentId, updatedAt }
 * Assessment:
 *   { id, sequence, year, createdAt, answers, comments, plan }
 * Plan:
 *   { startMonth: 'YYYY-MM' | '', challenges: {componentId: text}, activities: [Activity], generatedAt }
 *
 * An organisation exports its own file (.json); the facilitator imports
 * several of these files to get a portfolio overview.
 */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'barometre-gouvernance:v2';
  var LEGACY_KEY = 'barometre-gouvernance:v1';
  var SCHEMA_VERSION = 2;
  var MONTHS = 24;
  var STATUSES = ['planned', 'ongoing', 'done'];
  var PLAN_CATEGORIES = ['address', 'opportunity', 'maintain', 'other'];
  var PROFILE_FIELDS = ['name', 'acronym', 'type', 'region', 'address', 'focalPoint', 'phone', 'email'];
  var PRIORITY_VALUES = ['essential', 'important', 'neutral'];

  function uid(prefix) {
    return (prefix || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function str(v) { return typeof v === 'string' ? v : ''; }

  function clampMonth(v, fallback) {
    var n = Number(v);
    if (!(n >= 1 && n <= MONTHS)) return fallback;
    return Math.round(n);
  }

  function defaultSettings() {
    return { lang: 'fr', indexMethod: 'components', weights: { gov: 25, plan: 25, hr: 25, fin: 25 } };
  }

  function emptyPlan() {
    return { startMonth: '', challenges: {}, activities: [], generatedAt: null };
  }

  function newActivity(fields) {
    fields = fields || {};
    return {
      id: fields.id || uid('t'),
      componentId: fields.componentId || null,
      category: PLAN_CATEGORIES.indexOf(fields.category) >= 0 ? fields.category : 'other',
      source: fields.source === 'standard' ? 'standard' : 'custom',
      standardKey: fields.standardKey || null,
      title: str(fields.title),
      indicator: str(fields.indicator),
      lead: str(fields.lead),
      start: clampMonth(fields.start, 1),
      end: clampMonth(fields.end, MONTHS),
      resourcesAvailable: str(fields.resourcesAvailable),
      resourcesAnticipated: str(fields.resourcesAnticipated),
      baseline: str(fields.baseline),
      target: str(fields.target),
      priority: PRIORITY_VALUES.indexOf(fields.priority) >= 0 ? fields.priority : '',
      verification: str(fields.verification),
      status: STATUSES.indexOf(fields.status) >= 0 ? fields.status : 'planned',
      edited: !!fields.edited
    };
  }

  function newAssessment(sequence, year) {
    return {
      id: uid('a'),
      sequence: sequence || 1,
      year: year || new Date().getFullYear(),
      period: '',
      createdAt: new Date().toISOString(),
      answers: {},
      comments: {},
      plan: emptyPlan()
    };
  }

  function newOrg(name) {
    var first = newAssessment(1);
    var profile = {};
    PROFILE_FIELDS.forEach(function (f) { profile[f] = ''; });
    profile.name = name || '';
    return {
      id: uid('o'),
      organization: profile,
      assessments: [first],
      activeAssessmentId: first.id,
      updatedAt: new Date().toISOString()
    };
  }

  function newWorkspace() {
    var org = newOrg('');
    return { schemaVersion: SCHEMA_VERSION, settings: defaultSettings(), orgs: [org], activeOrgId: org.id };
  }

  // ------------------------------------------------------------ normalisation

  function normalizeSettings(s) {
    var out = defaultSettings();
    s = s || {};
    if (s.lang === 'en' || s.lang === 'fr') out.lang = s.lang;
    if (s.indexMethod === 'weighted') out.indexMethod = 'weighted';
    if (s.weights) {
      Object.keys(out.weights).forEach(function (k) {
        var v = Number(s.weights[k]);
        if (v >= 0 && v <= 100) out.weights[k] = v;
      });
    }
    return out;
  }

  /** Converts a version-1 per-component plan into challenges + custom activities. */
  function migrateLegacyPlan(legacy) {
    var plan = emptyPlan();
    Object.keys(legacy || {}).forEach(function (cid) {
      var item = legacy[cid] || {};
      if (str(item.challenge)) plan.challenges[cid] = item.challenge;
      var months = Array.isArray(item.months) ? item.months : [];
      var first = months.indexOf(true);
      var last = months.lastIndexOf(true);
      var hasContent = ['activities', 'lead', 'indicator', 'target', 'verification'].some(function (f) { return str(item[f]); });
      if (!hasContent && first < 0) return;
      var priorityMap = { Essentiel: 'essential', Important: 'important', Neutre: 'neutral' };
      plan.activities.push(newActivity({
        componentId: cid,
        category: 'other',
        source: 'custom',
        title: str(item.activities),
        indicator: str(item.indicator),
        lead: str(item.lead),
        start: first >= 0 ? first + 1 : 1,
        end: last >= 0 ? last + 1 : MONTHS,
        resourcesAvailable: str(item.resourcesAvailable),
        resourcesAnticipated: str(item.resourcesAnticipated),
        baseline: str(item.baseline),
        target: str(item.target),
        priority: priorityMap[item.priority] || item.priority,
        verification: str(item.verification),
        edited: true
      }));
    });
    return plan;
  }

  function normalizePlan(p) {
    if (!p) return emptyPlan();
    if (!Array.isArray(p.activities)) return migrateLegacyPlan(p);
    var plan = emptyPlan();
    plan.startMonth = /^\d{4}-\d{2}$/.test(p.startMonth) ? p.startMonth : '';
    plan.generatedAt = p.generatedAt || null;
    Object.keys(p.challenges || {}).forEach(function (k) {
      if (typeof p.challenges[k] === 'string') plan.challenges[k] = p.challenges[k];
    });
    plan.activities = p.activities.map(function (a) {
      var act = newActivity(a);
      if (act.end < act.start) act.end = act.start;
      return act;
    });
    return plan;
  }

  function normalizeAssessment(a) {
    var base = newAssessment(Number(a.sequence) || 1, Number(a.year) || new Date().getFullYear());
    if (typeof a.id === 'string' && a.id) base.id = a.id;
    base.createdAt = a.createdAt || base.createdAt;
    base.period = /^\d{4}-(0[1-9]|1[0-2])$/.test(a.period || '') ? a.period : '';
    if (base.period) base.year = Number(base.period.slice(0, 4));
    Object.keys(a.answers || {}).forEach(function (k) {
      var v = Number(a.answers[k]);
      if (v >= 1 && v <= 4 && Math.floor(v) === v) base.answers[k] = v;
    });
    Object.keys(a.comments || {}).forEach(function (k) {
      if (typeof a.comments[k] === 'string') base.comments[k] = a.comments[k];
    });
    base.plan = normalizePlan(a.plan);
    return base;
  }

  function normalizeOrg(o) {
    if (!o || typeof o !== 'object') throw new Error('invalid');
    if (!Array.isArray(o.assessments) || o.assessments.length === 0) throw new Error('no-assessment');
    var org = newOrg('');
    if (typeof o.id === 'string' && o.id) org.id = o.id;
    var profile = o.organization || {};
    PROFILE_FIELDS.forEach(function (f) { org.organization[f] = str(profile[f]); });
    org.assessments = o.assessments.map(normalizeAssessment);
    var ids = org.assessments.map(function (a) { return a.id; });
    org.activeAssessmentId = ids.indexOf(o.activeAssessmentId) >= 0 ? o.activeAssessmentId : ids[ids.length - 1];
    org.updatedAt = o.updatedAt || org.updatedAt;
    return org;
  }

  function normalizeWorkspace(data) {
    if (!data || typeof data !== 'object') throw new Error('invalid');
    // Version-1 file: a single organisation at the top level.
    if (!Array.isArray(data.orgs)) {
      var ws = newWorkspace();
      ws.orgs = [normalizeOrg(data)];
      ws.activeOrgId = ws.orgs[0].id;
      return ws;
    }
    if (data.orgs.length === 0) throw new Error('no-org');
    var out = { schemaVersion: SCHEMA_VERSION, settings: normalizeSettings(data.settings), orgs: data.orgs.map(normalizeOrg) };
    var ids = out.orgs.map(function (o) { return o.id; });
    out.activeOrgId = ids.indexOf(data.activeOrgId) >= 0 ? data.activeOrgId : ids[0];
    return out;
  }

  /**
   * Reads an imported file and returns the organisations it contains:
   * an organisation export, a workspace backup or a version-1 file.
   */
  function parseImport(data) {
    if (!data || typeof data !== 'object') throw new Error('invalid');
    if (data.type === 'barometer-organization' && data.org) return { orgs: [normalizeOrg(data.org)], settings: null };
    if (Array.isArray(data.orgs)) {
      var ws = normalizeWorkspace(data);
      return { orgs: ws.orgs, settings: ws.settings };
    }
    return { orgs: [normalizeOrg(data)], settings: null };
  }

  /** Adds or replaces (same id) organisations in the workspace. */
  function mergeOrgs(workspace, orgs) {
    var added = 0;
    var replaced = 0;
    orgs.forEach(function (org) {
      var idx = -1;
      workspace.orgs.forEach(function (o, i) { if (o.id === org.id) idx = i; });
      if (idx >= 0) { workspace.orgs[idx] = org; replaced++; } else { workspace.orgs.push(org); added++; }
    });
    // Drop the initial blank organisation once real data has been imported.
    workspace.orgs = workspace.orgs.filter(function (o) { return !isBlankOrg(o) || workspace.orgs.length === 1; });
    if (!workspace.orgs.some(function (o) { return o.id === workspace.activeOrgId; })) workspace.activeOrgId = workspace.orgs[0].id;
    return { added: added, replaced: replaced };
  }

  function isBlankOrg(o) {
    return !o.organization.name && o.assessments.length === 1 &&
      Object.keys(o.assessments[0].answers).length === 0 && o.assessments[0].plan.activities.length === 0;
  }

  function exportOrg(org) {
    return { type: 'barometer-organization', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), org: org };
  }

  function exportWorkspace(ws) {
    return {
      type: 'barometer-workspace',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      settings: ws.settings,
      orgs: ws.orgs,
      activeOrgId: ws.activeOrgId
    };
  }

  // ------------------------------------------------------------ persistence

  function load() {
    try {
      var ls = root.localStorage;
      var raw = ls && ls.getItem(STORAGE_KEY);
      if (raw) return normalizeWorkspace(JSON.parse(raw));
      var legacy = ls && ls.getItem(LEGACY_KEY);
      if (legacy) return normalizeWorkspace(JSON.parse(legacy));
    } catch (e) { /* fall through */ }
    return newWorkspace();
  }

  function save(ws) {
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(ws));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clear() {
    try {
      root.localStorage.removeItem(STORAGE_KEY);
      root.localStorage.removeItem(LEGACY_KEY);
    } catch (e) { /* ignored */ }
  }

  var Storage = {
    MONTHS: MONTHS,
    STATUSES: STATUSES,
    PLAN_CATEGORIES: PLAN_CATEGORIES,
    PROFILE_FIELDS: PROFILE_FIELDS,
    uid: uid,
    defaultSettings: defaultSettings,
    newWorkspace: newWorkspace,
    newOrg: newOrg,
    newAssessment: newAssessment,
    newActivity: newActivity,
    emptyPlan: emptyPlan,
    normalizeWorkspace: normalizeWorkspace,
    normalizeOrg: normalizeOrg,
    parseImport: parseImport,
    mergeOrgs: mergeOrgs,
    exportOrg: exportOrg,
    exportWorkspace: exportWorkspace,
    load: load,
    save: save,
    clear: clear
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
  } else {
    root.BarometerStorage = Storage;
  }
})(this);
