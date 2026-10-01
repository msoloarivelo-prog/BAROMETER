/*
 * Scoring engine.
 *
 * Reproduces the hidden "Fiche de Calculs" sheet of the Excel workbook:
 *   - component : level chosen (1 to 4);
 *   - aspect    : mean of its components (e.g. D19 = AVERAGE(D16:D18));
 *   - pillar    : mean of its aspects (e.g. D81 = AVERAGE(D19,D21,D23,D27));
 *   - total     : sum of the 33 components (D74);
 *   - mean development index: mean of the 33 components (D76).
 *
 * Global index method (workspace setting):
 *   'components' (default, as in Excel): mean of all components. Pillars with
 *     more components weigh more (Governance 7/33, Planning 13/33, HR 5/33,
 *     Finance 8/33).
 *   'weighted': weighted mean of pillar scores using explicit weights
 *     (e.g. 25 % each).
 *
 * Deliberate difference from Excel: unanswered components are ignored in the
 * means (Excel showed #DIV/0! or counted zeros).
 */
(function (root) {
  'use strict';

  var CATEGORIES = ['maintain', 'opportunity', 'address'];

  function average(values) {
    var present = values.filter(function (v) { return typeof v === 'number' && !isNaN(v); });
    if (present.length === 0) return null;
    return present.reduce(function (a, b) { return a + b; }, 0) / present.length;
  }

  function isValidLevel(value, maxScore) {
    return typeof value === 'number' && value >= 1 && value <= maxScore && Math.floor(value) === value;
  }

  /** Strength to maintain (4), opportunity to catch (3), weakness to address (1-2). */
  function categoryFor(score, maxScore) {
    maxScore = maxScore || 4;
    if (score === null || score === undefined) return null;
    if (score >= maxScore) return 'maintain';
    if (score >= maxScore - 1) return 'opportunity';
    return 'address';
  }

  /** Effective share of each pillar in the global index, in percent. */
  function effectiveWeights(framework, settings) {
    var method = settings && settings.indexMethod === 'weighted' ? 'weighted' : 'components';
    var out = {};
    if (method === 'components') {
      var counts = framework.PILLARS.map(function (p) {
        return p.aspects.reduce(function (n, a) { return n + a.components.length; }, 0);
      });
      var total = counts.reduce(function (a, b) { return a + b; }, 0);
      framework.PILLARS.forEach(function (p, i) { out[p.id] = (counts[i] / total) * 100; });
    } else {
      var w = normalizedWeights(framework, settings.weights);
      framework.PILLARS.forEach(function (p) { out[p.id] = w[p.id] * 100; });
    }
    return out;
  }

  function normalizedWeights(framework, weights) {
    var raw = {};
    var sum = 0;
    framework.PILLARS.forEach(function (p) {
      var v = weights && Number(weights[p.id]);
      raw[p.id] = v > 0 ? v : 0;
      sum += raw[p.id];
    });
    framework.PILLARS.forEach(function (p) {
      raw[p.id] = sum > 0 ? raw[p.id] / sum : 1 / framework.PILLARS.length;
    });
    return raw;
  }

  /**
   * Computes every score of an assessment.
   * @param {object} framework  see framework.js
   * @param {object} answers    { componentId: level 1..4 }
   * @param {object} [settings] { indexMethod: 'components'|'weighted', weights: {pillarId: number} }
   */
  function computeScores(framework, answers, settings) {
    answers = answers || {};
    var max = framework.MAX_SCORE;
    var allScores = [];
    var answeredCount = 0;
    var totalCount = 0;
    var counts = { maintain: 0, opportunity: 0, address: 0 };

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
            allScores.push(score);
            counts[categoryFor(score, max)]++;
          }
          return { id: component.id, name: component.name, score: score, category: categoryFor(score, max) };
        });
        var aspectScore = average(components.map(function (c) { return c.score; }));
        return { id: aspect.id, name: aspect.name, score: aspectScore, components: components };
      });
      var pillarScore = average(aspects.map(function (a) { return a.score; }));
      return {
        id: pillar.id,
        name: pillar.name,
        shortName: pillar.shortName,
        color: pillar.color,
        reportColor: pillar.reportColor,
        score: pillarScore,
        percent: pillarScore === null ? null : (pillarScore / max) * 100,
        answered: pillarAnswered,
        total: pillarTotal,
        aspects: aspects
      };
    });

    var componentIndex = average(allScores);

    // Weighted mean of pillar scores, re-normalised over pillars that have a score.
    var weights = normalizedWeights(framework, settings && settings.weights);
    var wSum = 0;
    var wTotal = 0;
    pillars.forEach(function (p) {
      if (p.score !== null) { wSum += p.score * weights[p.id]; wTotal += weights[p.id]; }
    });
    var weightedIndex = wTotal > 0 ? wSum / wTotal : null;

    var method = settings && settings.indexMethod === 'weighted' ? 'weighted' : 'components';
    var index = method === 'weighted' ? weightedIndex : componentIndex;

    return {
      maxScore: max,
      pillars: pillars,
      total: allScores.reduce(function (a, b) { return a + b; }, 0),
      maxTotal: totalCount * max,
      index: index,
      indexMethod: method,
      componentIndex: componentIndex,
      weightedIndex: weightedIndex,
      indexPercent: index === null ? null : (index / max) * 100,
      answered: answeredCount,
      totalComponents: totalCount,
      completion: totalCount ? answeredCount / totalCount : 0,
      complete: answeredCount === totalCount,
      counts: counts
    };
  }

  /** Compares two assessments (Excel "Score 1 / Score 2 / Changement"). */
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
   * Groups answered components into strengths to maintain, opportunities to
   * catch and weaknesses to address. Each list is sorted (weakest first for
   * weaknesses).
   */
  function classify(framework, answers) {
    var groups = { maintain: [], opportunity: [], address: [] };
    framework.PILLARS.forEach(function (pillar) {
      pillar.aspects.forEach(function (aspect) {
        aspect.components.forEach(function (component) {
          var score = answers[component.id];
          if (!isValidLevel(score, framework.MAX_SCORE)) return;
          groups[categoryFor(score, framework.MAX_SCORE)].push({
            pillar: pillar,
            aspect: aspect,
            component: component,
            score: score
          });
        });
      });
    });
    groups.address.sort(function (a, b) { return a.score - b.score; });
    return groups;
  }

  /** Development stage for a mean score. */
  function stageFor(framework, score) {
    if (score === null || score === undefined) return null;
    var idx = Math.min(framework.LEVELS.length, Math.max(1, Math.round(score))) - 1;
    return framework.LEVELS[idx];
  }

  var Scoring = {
    CATEGORIES: CATEGORIES,
    average: average,
    categoryFor: categoryFor,
    effectiveWeights: effectiveWeights,
    computeScores: computeScores,
    compareScores: compareScores,
    classify: classify,
    stageFor: stageFor
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Scoring;
  } else {
    root.BarometerScoring = Scoring;
  }
})(this);
