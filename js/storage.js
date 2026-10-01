/*
 * Modèle de données et persistance locale (navigateur).
 *
 * Toutes les données restent sur le poste de l'utilisateur (localStorage).
 * L'export / import JSON permet de sauvegarder, transmettre ou archiver un
 * dossier complet, à la manière du fichier Excel d'origine.
 */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'barometre-gouvernance:v1';
  var SCHEMA_VERSION = 1;
  var MONTHS = 12;

  function uid() {
    return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function emptyPlanItem() {
    return {
      challenge: '',
      activities: '',
      lead: '',
      resourcesAvailable: '',
      resourcesAnticipated: '',
      indicator: '',
      baseline: '',
      target: '',
      priority: '',
      verification: '',
      months: new Array(MONTHS).fill(false)
    };
  }

  function newAssessment(sequence, year) {
    return {
      id: uid(),
      sequence: sequence || 1,
      year: year || new Date().getFullYear(),
      createdAt: new Date().toISOString(),
      answers: {},
      comments: {},
      plan: {}
    };
  }

  function newState() {
    var first = newAssessment(1);
    return {
      schemaVersion: SCHEMA_VERSION,
      organization: {
        name: '',
        address: '',
        focalPoint: '',
        phone: '',
        email: ''
      },
      assessments: [first],
      activeAssessmentId: first.id,
      updatedAt: new Date().toISOString()
    };
  }

  /** Valide et complète un état importé ou rechargé. */
  function normalize(data) {
    if (!data || typeof data !== 'object') throw new Error('Fichier invalide.');
    if (!Array.isArray(data.assessments) || data.assessments.length === 0) {
      throw new Error('Aucun diagnostic trouvé dans le fichier.');
    }
    var state = newState();
    var org = data.organization || {};
    Object.keys(state.organization).forEach(function (k) {
      if (typeof org[k] === 'string') state.organization[k] = org[k];
    });
    state.assessments = data.assessments.map(function (a) {
      var base = newAssessment(Number(a.sequence) || 1, Number(a.year) || new Date().getFullYear());
      base.id = typeof a.id === 'string' && a.id ? a.id : base.id;
      base.createdAt = a.createdAt || base.createdAt;
      var answers = a.answers || {};
      Object.keys(answers).forEach(function (k) {
        var v = Number(answers[k]);
        if (v >= 1 && v <= 4 && Math.floor(v) === v) base.answers[k] = v;
      });
      var comments = a.comments || {};
      Object.keys(comments).forEach(function (k) {
        if (typeof comments[k] === 'string') base.comments[k] = comments[k];
      });
      var plan = a.plan || {};
      Object.keys(plan).forEach(function (k) {
        var item = emptyPlanItem();
        var src = plan[k] || {};
        Object.keys(item).forEach(function (f) {
          if (f === 'months') {
            if (Array.isArray(src.months)) {
              item.months = item.months.map(function (_, i) { return !!src.months[i]; });
            }
          } else if (typeof src[f] === 'string') {
            item[f] = src[f];
          }
        });
        base.plan[k] = item;
      });
      return base;
    });
    var ids = state.assessments.map(function (a) { return a.id; });
    state.activeAssessmentId = ids.indexOf(data.activeAssessmentId) >= 0 ? data.activeAssessmentId : ids[0];
    state.updatedAt = data.updatedAt || state.updatedAt;
    return state;
  }

  function load() {
    try {
      var raw = root.localStorage && root.localStorage.getItem(STORAGE_KEY);
      if (!raw) return newState();
      return normalize(JSON.parse(raw));
    } catch (e) {
      return newState();
    }
  }

  function save(state) {
    state.updatedAt = new Date().toISOString();
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clear() {
    try { root.localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignoré */ }
  }

  var Storage = {
    MONTHS: MONTHS,
    newState: newState,
    newAssessment: newAssessment,
    emptyPlanItem: emptyPlanItem,
    normalize: normalize,
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
