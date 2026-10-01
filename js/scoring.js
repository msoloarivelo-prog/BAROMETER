/*
 * Moteur de calcul du baromètre.
 *
 * Reproduit la feuille cachée "Fiche de Calculs" du classeur Excel :
 *   - composante : niveau choisi (1 à 4) ;
 *   - aspect     : moyenne des composantes (ex. D19 = AVERAGE(D16:D18)) ;
 *   - pilier     : moyenne des aspects (ex. D81 = AVERAGE(D19,D21,D23,D27)) ;
 *   - total      : somme des 33 composantes (D74) ;
 *   - indice moyen de développement : moyenne des 33 composantes (D76).
 *
 * Différence volontaire avec Excel : les composantes non renseignées sont
 * ignorées dans les moyennes (Excel affichait #DIV/0! ou comptait un zéro).
 */
(function (root) {
  'use strict';

  function average(values) {
    var present = values.filter(function (v) { return typeof v === 'number' && !isNaN(v); });
    if (present.length === 0) return null;
    var sum = present.reduce(function (a, b) { return a + b; }, 0);
    return sum / present.length;
  }

  function isValidLevel(value, maxScore) {
    return typeof value === 'number' && value >= 1 && value <= maxScore && Math.floor(value) === value;
  }

  /**
   * Calcule tous les scores d'un diagnostic.
   * @param {object} framework  cadre (voir framework.js)
   * @param {object} answers    { componentId: niveau 1..4 }
   */
  function computeScores(framework, answers) {
    answers = answers || {};
    var max = framework.MAX_SCORE;
    var allComponentScores = [];
    var answeredCount = 0;
    var totalCount = 0;

    var pillars = framework.PILLARS.map(function (pillar) {
      var pillarAnswered = 0;
      var pillarTotal = 0;

      var aspects = pillar.aspects.map(function (aspect) {
        var components = aspect.components.map(function (component) {
          var raw = answers[component.id];
          var score = isValidLevel(raw, max) ? raw : null;
          totalCount++;
          pillarTotal++;
          if (score !== null) {
            answeredCount++;
            pillarAnswered++;
            allComponentScores.push(score);
          }
          return { id: component.id, name: component.name, score: score };
        });
        var aspectScore = average(components.map(function (c) { return c.score; }));
        return { id: aspect.id, name: aspect.name, score: aspectScore, components: components };
      });

      var pillarScore = average(aspects.map(function (a) { return a.score; }));
      return {
        id: pillar.id,
        name: pillar.name,
        shortName: pillar.shortName,
        score: pillarScore,
        percent: pillarScore === null ? null : (pillarScore / max) * 100,
        answered: pillarAnswered,
        total: pillarTotal,
        aspects: aspects
      };
    });

    var total = allComponentScores.reduce(function (a, b) { return a + b; }, 0);
    var index = average(allComponentScores);

    return {
      maxScore: max,
      pillars: pillars,
      total: total,
      maxTotal: totalCount * max,
      index: index,
      indexPercent: index === null ? null : (index / max) * 100,
      answered: answeredCount,
      totalComponents: totalCount,
      complete: answeredCount === totalCount
    };
  }

  /**
   * Compare deux diagnostics (colonnes "Score 1", "Score 2" et "Changement"
   * de la Fiche de Calculs). Retourne la différence courant - référence.
   */
  function compareScores(current, baseline) {
    function diff(a, b) {
      return a === null || b === null || a === undefined || b === undefined ? null : a - b;
    }
    return {
      index: diff(current.index, baseline.index),
      total: diff(current.total, baseline.total),
      pillars: current.pillars.map(function (p, i) {
        var bp = baseline.pillars[i];
        return {
          id: p.id,
          delta: diff(p.score, bp.score),
          aspects: p.aspects.map(function (a, j) {
            return { id: a.id, delta: diff(a.score, bp.aspects[j].score) };
          })
        };
      })
    };
  }

  /**
   * Liste les composantes triées de la plus faible à la plus forte : aide à
   * prioriser le plan de renforcement.
   */
  function weakestComponents(framework, answers, limit) {
    var list = [];
    framework.PILLARS.forEach(function (pillar) {
      pillar.aspects.forEach(function (aspect) {
        aspect.components.forEach(function (component) {
          var score = answers[component.id];
          if (isValidLevel(score, framework.MAX_SCORE)) {
            list.push({
              pillarId: pillar.id,
              pillarName: pillar.shortName,
              aspectName: aspect.name,
              componentId: component.id,
              componentName: component.name,
              score: score
            });
          }
        });
      });
    });
    list.sort(function (a, b) { return a.score - b.score; });
    return typeof limit === 'number' ? list.slice(0, limit) : list;
  }

  /** Qualifie un score moyen selon les 4 stades de développement. */
  function stageFor(framework, score) {
    if (score === null || score === undefined) return null;
    var idx = Math.min(framework.LEVELS.length, Math.max(1, Math.round(score))) - 1;
    return framework.LEVELS[idx];
  }

  var Scoring = {
    average: average,
    computeScores: computeScores,
    compareScores: compareScores,
    weakestComponents: weakestComponents,
    stageFor: stageFor
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Scoring;
  } else {
    root.BarometerScoring = Scoring;
  }
})(this);
