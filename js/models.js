/*
 * Assessment models.
 *
 * The same engine (1-4 levels, scoring, strengths/opportunities/weaknesses,
 * change action plan, progress over time, reports) runs several models:
 *
 *   barometer : the original governance barometer (4 pillars, 33 components)
 *   itoca     : ITOCA / OCA capacity assessment (10 domains, 94 indicators)
 *   opi       : Organisational Performance Index (5 domains, 10 sub-domains)
 *
 * Each model exposes the same shape as framework.js
 * ({ LEVELS, MAX_SCORE, PRIORITIES, SEQUENCES, PILLARS, allComponents }) plus
 * metadata. An assessment records its model in `assessment.model`.
 */
(function (root) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports;
  var Base = isNode ? require('./framework.js') : root.BarometerFramework;
  var Activities = isNode ? require('./activities.js') : root.BarometerActivities;
  var ItocaData = isNode ? require('./models/itoca-data.js') : root.BarometerItocaData;
  var OpiData = isNode ? require('./models/opi-data.js') : root.BarometerOpiData;

  var DEFAULT_MODEL = 'barometer';

  // Ten distinguishable colours (strong for the screen, light for printed reports).
  var PALETTE = ['#2f6f9f', '#3f8f5f', '#c9822b', '#8a4f9e', '#b5473f', '#2a8c8c', '#7a6a2f', '#5b5fb0', '#b0477f', '#4f7d2a'];
  var PALETTE_LIGHT = ['#7fb0d6', '#86c49c', '#ecb877', '#b99ad0', '#e39a94', '#86c9c9', '#cbb978', '#a3a6de', '#dd98bc', '#a2c77e'];
  var BAROMETER_COLORS = { gov: ['#2f6f9f', '#7fb0d6'], plan: ['#3f8f5f', '#86c49c'], hr: ['#c9822b', '#ecb877'], fin: ['#8a4f9e', '#b99ad0'] };

  function model(def) {
    var fw = {
      id: def.id,
      name: def.name,
      shortName: def.shortName,
      description: def.description,
      kind: def.kind,
      flat: !!def.flat,
      indexMethod: def.indexMethod,
      evidence: def.evidence || 'optional',
      minYears: def.minYears || 0,
      autoCategories: def.autoCategories || null,
      LEVELS: Base.LEVELS,
      MAX_SCORE: Base.MAX_SCORE,
      PRIORITIES: Base.PRIORITIES,
      SEQUENCES: Base.SEQUENCES,
      PILLARS: def.pillars
    };
    fw.allComponents = function () {
      var list = [];
      fw.PILLARS.forEach(function (p) {
        p.aspects.forEach(function (a) {
          a.components.forEach(function (c) { list.push({ pillar: p, aspect: a, component: c }); });
        });
      });
      return list;
    };
    return fw;
  }

  /** Turns flat domain data ({ id, name, shortName, items[] }) into pillars with a single aspect. */
  function domainsToPillars(domains, registerActions) {
    return domains.map(function (d, i) {
      var components = d.items.map(function (it) {
        registerActions(it);
        return { id: it.id, name: it.name, statement: it.statement, levels: it.levels };
      });
      return {
        id: d.id,
        name: d.name,
        shortName: d.shortName,
        color: PALETTE[i % PALETTE.length],
        reportColor: PALETTE_LIGHT[i % PALETTE_LIGHT.length],
        aspects: [{ id: d.id + '-items', name: d.name, components: components }]
      };
    });
  }

  function fill(str, name) { return { fr: str.fr.replace('{name}', name.fr), en: str.en.replace('{name}', name.en) }; }

  var GENERIC = {
    maintain: { fr: 'Maintenir et documenter la bonne pratique, avec une revue annuelle : {name}', en: 'Maintain and document the good practice, with an annual review: {name}' },
    upIndicator: { fr: 'Au moins un niveau de plus sur « {name} » au prochain diagnostic', en: 'At least one level higher on “{name}” at the next assessment' },
    keepIndicator: { fr: 'Niveau 4 maintenu sur « {name} »', en: 'Level 4 kept on “{name}”' },
    reviewVerification: { fr: 'Compte rendu de la revue annuelle', en: 'Annual review minutes' }
  };

  /** ITOCA: one specific action per indicator, plus generic coaching and maintenance actions. */
  function itocaActions(it) {
    var up = fill(GENERIC.upIndicator, it.name);
    var specific = { title: it.action, indicator: up, verification: it.verification };
    Activities.register(it.id, {
      address: [specific],
      opportunity: [specific],
      maintain: [{ title: fill(GENERIC.maintain, it.name), indicator: fill(GENERIC.keepIndicator, it.name), verification: GENERIC.reviewVerification }]
    });
  }

  /** OPI: one specific action per category. */
  function opiActions(it) {
    var up = fill(GENERIC.upIndicator, it.name);
    Activities.register(it.id, {
      address: [{ title: it.actions.address, indicator: up, verification: it.verification }],
      opportunity: [{ title: it.actions.opportunity, indicator: up, verification: it.verification }],
      maintain: [{ title: it.actions.maintain, indicator: fill(GENERIC.keepIndicator, it.name), verification: it.verification }]
    });
  }

  var registry = {};

  Base.PILLARS.forEach(function (p) {
    p.color = BAROMETER_COLORS[p.id][0];
    p.reportColor = BAROMETER_COLORS[p.id][1];
  });

  registry.barometer = model({
    id: 'barometer',
    name: { fr: 'Baromètre de gouvernance', en: 'Governance barometer' },
    shortName: { fr: 'Baromètre', en: 'Barometer' },
    description: { fr: 'Diagnostic de gouvernance : 4 piliers, 33 composantes.', en: 'Governance assessment: 4 pillars, 33 components.' },
    kind: 'capacity',
    indexMethod: 'components',
    pillars: Base.PILLARS
  });

  registry.itoca = model({
    id: 'itoca',
    name: { fr: 'ITOCA – Évaluation intégrée des capacités techniques et organisationnelles', en: 'ITOCA – Integrated technical and organisational capacity assessment' },
    shortName: { fr: 'ITOCA', en: 'ITOCA' },
    description: {
      fr: 'Capacités (dérivé de l’OCA/OCAT) : 10 domaines, 94 indicateurs. Indice global = moyenne des domaines.',
      en: 'Capacity (derived from OCA/OCAT): 10 domains, 94 indicators. Global index = mean of domains.'
    },
    kind: 'capacity',
    flat: true,
    indexMethod: 'pillars',
    autoCategories: ['address', 'opportunity'],
    pillars: domainsToPillars(ItocaData || [], itocaActions)
  });

  registry.opi = model({
    id: 'opi',
    name: { fr: 'OPI – Indice de performance organisationnelle', en: 'OPI – Organisational performance index' },
    shortName: { fr: 'OPI', en: 'OPI' },
    description: {
      fr: 'Performance (résultats obtenus) : 5 domaines, 10 sous-domaines, preuves obligatoires. Pour les organisations ayant au moins 2 ans d’activités.',
      en: 'Performance (results achieved): 5 domains, 10 sub-domains, evidence required. For organisations with at least 2 years of activity.'
    },
    kind: 'performance',
    flat: true,
    indexMethod: 'pillars',
    evidence: 'required',
    minYears: 2,
    autoCategories: ['address', 'opportunity'],
    pillars: domainsToPillars(OpiData || [], opiActions)
  });

  var ORDER = ['barometer', 'itoca', 'opi'];

  function get(id) { return registry[id] || registry[DEFAULT_MODEL]; }
  function list() { return ORDER.map(function (id) { return registry[id]; }); }
  function exists(id) { return !!registry[id]; }

  /** Finds a component in any model (ids are unique across models). */
  function findComponent(id) {
    for (var i = 0; i < ORDER.length; i++) {
      var hit = registry[ORDER[i]].allComponents().filter(function (e) { return e.component.id === id; })[0];
      if (hit) return hit;
    }
    return null;
  }

  /** Scoring settings for a model: user weights only apply to the barometer. */
  function scoringSettings(fw, settings) {
    if (fw.indexMethod === 'pillars') return { indexMethod: 'weighted', weights: {} };
    return settings;
  }

  var Models = {
    DEFAULT_MODEL: DEFAULT_MODEL,
    get: get,
    list: list,
    exists: exists,
    findComponent: findComponent,
    scoringSettings: scoringSettings
  };

  if (isNode) {
    module.exports = Models;
  } else {
    root.BarometerModels = Models;
  }
})(this);
