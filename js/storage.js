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
  var PROFILE_FIELDS = ['name', 'acronym', 'type', 'typeOther', 'domain', 'domainOther', 'country', 'region', 'founded', 'address', 'focalPoint', 'focalTitle', 'phone', 'email'];
  var MODEL_IDS = ['barometer', 'itoca', 'opi'];
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
      followUp: str(fields.followUp),
      status: STATUSES.indexOf(fields.status) >= 0 ? fields.status : 'planned',
      edited: !!fields.edited
    };
  }

  function newAssessment(sequence, year, model) {
    return {
      id: uid('a'),
      model: MODEL_IDS.indexOf(model) >= 0 ? model : 'barometer',
      sequence: sequence || 1,
      year: year || new Date().getFullYear(),
      period: '',
      createdAt: new Date().toISOString(),
      answers: {},
      comments: {},
      evidence: {},
      evidenceFiles: {},
      verified: {},
      conclusionNote: '',
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
    var base = newAssessment(Number(a.sequence) || 1, Number(a.year) || new Date().getFullYear(), a.model);
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
    base.conclusionNote = str(a.conclusionNote);
    Object.keys(a.evidence || {}).forEach(function (k) {
      if (typeof a.evidence[k] === 'string') base.evidence[k] = a.evidence[k];
    });
    Object.keys(a.evidenceFiles || {}).forEach(function (k) {
      var list = Array.isArray(a.evidenceFiles[k]) ? a.evidenceFiles[k] : [];
      var clean = list.filter(function (f) { return f && typeof f.id === 'string' && f.id; }).map(function (f) {
        return { id: f.id, name: str(f.name) || 'evidence.pdf', size: Number(f.size) || 0, uploadedAt: str(f.uploadedAt) };
      });
      if (clean.length) base.evidenceFiles[k] = clean;
    });
    Object.keys(a.verified || {}).forEach(function (k) {
      if (a.verified[k] === true) base.verified[k] = true;
    });
    base.plan = normalizePlan(a.plan);
    return base;
  }

  // Organisation types and domains (stored as codes, shown in FR/EN).
  // `aliases` map older free-text values to a code.
  var ORG_TYPES = [
    { value: 'ngo', label: { fr: 'ONG', en: 'NGO' }, aliases: ['ong', 'ngo', 'organisation non gouvernementale', 'non-governmental organisation', 'non-governmental organization'] },
    { value: 'association', label: { fr: 'Association', en: 'Association' }, aliases: ['association communautaire', 'community association'] },
    { value: 'cso', label: { fr: 'Société civile (OSC)', en: 'Civil society organisation (CSO)' }, aliases: ['osc', 'cso', 'société civile', 'societe civile', 'civil society'] },
    { value: 'cbo', label: { fr: 'Organisation communautaire de base (OCB)', en: 'Community-based organisation (CBO)' }, aliases: ['ocb', 'cbo'] },
    { value: 'network', label: { fr: 'Réseau / plateforme', en: 'Network / platform' }, aliases: ['réseau', 'reseau', 'plateforme', 'network', 'platform', 'réseau d’associations', "réseau d'associations", 'network of associations'] },
    { value: 'federation', label: { fr: 'Fédération / union', en: 'Federation / union' }, aliases: ['fédération', 'federation', 'union'] },
    { value: 'cooperative', label: { fr: 'Coopérative / groupement', en: 'Cooperative / producer group' }, aliases: ['coopérative', 'cooperative', 'groupement'] },
    { value: 'foundation', label: { fr: 'Fondation', en: 'Foundation' }, aliases: ['fondation', 'foundation'] },
    { value: 'faith', label: { fr: 'Organisation confessionnelle', en: 'Faith-based organisation' }, aliases: [] },
    { value: 'social-enterprise', label: { fr: 'Entreprise sociale', en: 'Social enterprise' }, aliases: [] },
    { value: 'public', label: { fr: 'Institution publique / collectivité', en: 'Public institution / local authority' }, aliases: [] },
    { value: 'other', label: { fr: 'Autre', en: 'Other' }, aliases: ['autre', 'other'] }
  ];
  var DOMAINS = [
    { value: 'agriculture', label: { fr: 'Agriculture / sécurité alimentaire', en: 'Agriculture / food security' }, aliases: ['agriculture'] },
    { value: 'environment', label: { fr: 'Environnement / ressources naturelles', en: 'Environment / natural resources' }, aliases: ['environnement', 'environment'] },
    { value: 'climate', label: { fr: 'Climat / gestion des risques de catastrophes', en: 'Climate / disaster risk management' }, aliases: ['climat', 'climate'] },
    { value: 'education', label: { fr: 'Éducation / formation', en: 'Education / training' }, aliases: ['éducation', 'education', 'formation', 'training'] },
    { value: 'health', label: { fr: 'Santé / nutrition', en: 'Health / nutrition' }, aliases: ['santé', 'sante', 'health', 'nutrition'] },
    { value: 'wash', label: { fr: 'Eau, hygiène et assainissement', en: 'Water, sanitation and hygiene (WASH)' }, aliases: ['eha', 'wash', 'eau'] },
    { value: 'governance', label: { fr: 'Gouvernance / droits humains / citoyenneté', en: 'Governance / human rights / citizenship' }, aliases: ['gouvernance', 'governance', 'droits humains', 'human rights'] },
    { value: 'gender', label: { fr: 'Genre / droits des femmes', en: 'Gender / women’s rights' }, aliases: ['genre', 'gender'] },
    { value: 'youth', label: { fr: 'Jeunesse / enfance', en: 'Youth / children' }, aliases: ['jeunesse', 'youth', 'enfance', 'children'] },
    { value: 'economic', label: { fr: 'Développement économique / microfinance / emploi', en: 'Economic development / microfinance / jobs' }, aliases: ['microfinance', 'emploi'] },
    { value: 'social', label: { fr: 'Protection sociale / inclusion', en: 'Social protection / inclusion' }, aliases: [] },
    { value: 'humanitarian', label: { fr: 'Humanitaire / urgence', en: 'Humanitarian / emergency' }, aliases: ['humanitaire', 'humanitarian', 'urgence'] },
    { value: 'culture', label: { fr: 'Culture / sport', en: 'Culture / sport' }, aliases: ['culture', 'sport'] },
    { value: 'multi', label: { fr: 'Multisectoriel', en: 'Multi-sector' }, aliases: ['multisectoriel', 'multi-sector', 'multisector'] },
    { value: 'other', label: { fr: 'Autre', en: 'Other' }, aliases: ['autre', 'other'] }
  ];

  /**
   * Turns a stored value into an option code. Older files held free text:
   * known labels and aliases map to their code, anything else becomes
   * "other" with the text kept as the detail.
   */
  function matchOption(list, value, other) {
    var v = str(value).trim();
    if (!v) return { value: '', other: str(other) };
    var low = v.toLowerCase();
    for (var i = 0; i < list.length; i++) {
      var opt = list[i];
      if (opt.value === v) return { value: v, other: v === 'other' ? str(other) : '' };
      if (opt.label.fr.toLowerCase() === low || opt.label.en.toLowerCase() === low || opt.aliases.indexOf(low) >= 0) {
        return { value: opt.value, other: opt.value === 'other' ? str(other) : '' };
      }
    }
    return { value: 'other', other: str(other) || v };
  }

  function normalizeProfile(p) {
    var t = matchOption(ORG_TYPES, p.type, p.typeOther);
    p.type = t.value; p.typeOther = t.other;
    var d = matchOption(DOMAINS, p.domain, p.domainOther);
    p.domain = d.value; p.domainOther = d.other;
    return p;
  }

  function normalizeOrg(o) {
    if (!o || typeof o !== 'object') throw new Error('invalid');
    if (!Array.isArray(o.assessments) || o.assessments.length === 0) throw new Error('no-assessment');
    var org = newOrg('');
    if (typeof o.id === 'string' && o.id) org.id = o.id;
    var profile = o.organization || {};
    PROFILE_FIELDS.forEach(function (f) { org.organization[f] = str(profile[f]); });
    normalizeProfile(org.organization);
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
    var files = Array.isArray(data.files) ? data.files : [];
    if (data.type === 'barometer-organization' && data.org) return { orgs: [normalizeOrg(data.org)], settings: null, files: files };
    if (Array.isArray(data.orgs)) {
      var ws = normalizeWorkspace(data);
      return { orgs: ws.orgs, settings: ws.settings, files: files };
    }
    return { orgs: [normalizeOrg(data)], settings: null, files: files };
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
    MODEL_IDS: MODEL_IDS,
    uid: uid,
    defaultSettings: defaultSettings,
    newWorkspace: newWorkspace,
    ORG_TYPES: ORG_TYPES,
    DOMAINS: DOMAINS,
    matchOption: matchOption,
    normalizeProfile: normalizeProfile,
    newOrg: newOrg,
    newAssessment: newAssessment,
    newActivity: newActivity,
    emptyPlan: emptyPlan,
    normalizeWorkspace: normalizeWorkspace,
    normalizeSettings: normalizeSettings,
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
