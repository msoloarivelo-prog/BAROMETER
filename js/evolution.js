/*
 * Evolution over time: an organisation runs the assessment regularly
 * (e.g. every 6 or 12 months). This module orders its assessments
 * chronologically and compares them period by period.
 */
(function (root) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports;
  var Scoring = isNode ? require('./scoring.js') : root.BarometerScoring;
  var Plan = isNode ? require('./plan.js') : root.BarometerPlan;

  /** Sort key: period (YYYY-MM) if set, otherwise the year, then the sequence number. */
  function sortKey(a) {
    var p = /^\d{4}-\d{2}$/.test(a.period || '') ? a.period : String(a.year) + '-00';
    return p + '#' + String(1000 + (a.sequence || 0));
  }

  function chronological(assessments) {
    return assessments.slice().sort(function (a, b) { return sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0; });
  }

  /** Scores of every assessment, oldest first. */
  function timeline(framework, assessments, settings) {
    return chronological(assessments).map(function (a) {
      return { assessment: a, scores: Scoring.computeScores(framework, a.answers, settings) };
    });
  }

  /**
   * Component-by-component comparison between two assessments.
   * Returns improved / declined / stable lists plus category transitions:
   * weaknesses resolved (was 1-2, now 3-4) and new weaknesses (now 1-2, was 3-4).
   */
  function componentChanges(framework, fromAnswers, toAnswers) {
    var out = { improved: [], declined: [], stable: [], resolvedWeaknesses: [], newWeaknesses: [], newStrengths: [], lostStrengths: [], notCompared: 0 };
    framework.allComponents().forEach(function (e) {
      var from = fromAnswers[e.component.id];
      var to = toAnswers[e.component.id];
      if (!from || !to) { out.notCompared++; return; }
      var item = {
        pillar: e.pillar,
        aspect: e.aspect,
        component: e.component,
        from: from,
        to: to,
        delta: to - from,
        fromCategory: Scoring.categoryFor(from, framework.MAX_SCORE),
        toCategory: Scoring.categoryFor(to, framework.MAX_SCORE)
      };
      if (item.delta > 0) out.improved.push(item);
      else if (item.delta < 0) out.declined.push(item);
      else out.stable.push(item);
      if (item.fromCategory === 'address' && item.toCategory !== 'address') out.resolvedWeaknesses.push(item);
      if (item.fromCategory !== 'address' && item.toCategory === 'address') out.newWeaknesses.push(item);
      if (item.fromCategory !== 'maintain' && item.toCategory === 'maintain') out.newStrengths.push(item);
      if (item.fromCategory === 'maintain' && item.toCategory !== 'maintain') out.lostStrengths.push(item);
    });
    out.improved.sort(function (a, b) { return b.delta - a.delta; });
    out.declined.sort(function (a, b) { return a.delta - b.delta; });
    return out;
  }

  /** How far the workplan of a period was carried out. */
  function planFollowUp(assessment) {
    var s = Plan.stats(assessment.plan);
    var done = assessment.plan.activities.filter(function (a) { return a.status === 'done'; });
    return { stats: s, done: done, rate: s.total ? s.done / s.total : null };
  }

  var Evolution = {
    sortKey: sortKey,
    chronological: chronological,
    timeline: timeline,
    componentChanges: componentChanges,
    planFollowUp: planFollowUp
  };

  if (isNode) {
    module.exports = Evolution;
  } else {
    root.BarometerEvolution = Evolution;
  }
})(this);
