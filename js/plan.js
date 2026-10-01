/*
 * Workplan logic: generates standard activities from the diagnostic and
 * keeps them in sync when scores change, while preserving the activities
 * proposed or edited by the organisation.
 */
(function (root) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports;
  var Scoring = isNode ? require('./scoring.js') : root.BarometerScoring;
  var Storage = isNode ? require('./storage.js') : root.BarometerStorage;
  var Activities = isNode ? require('./activities.js') : root.BarometerActivities;

  var DEFAULT_PRIORITY = { address: 'essential', opportunity: 'important', maintain: 'neutral', other: '' };

  /**
   * Adds the standard activities matching each component's current category
   * and removes standard activities that no longer match, unless the
   * organisation has edited them.
   * @returns {{added:number, removed:number}}
   */
  function syncStandardActivities(framework, assessment) {
    var plan = assessment.plan;
    var wanted = {};
    framework.allComponents().forEach(function (entry) {
      var score = assessment.answers[entry.component.id];
      var category = Scoring.categoryFor(score, framework.MAX_SCORE);
      if (!category) return;
      Activities.get(entry.component.id, category).forEach(function (std) {
        wanted[std.key] = { std: std, componentId: entry.component.id, category: category };
      });
    });

    var before = plan.activities.length;
    plan.activities = plan.activities.filter(function (act) {
      return act.source !== 'standard' || act.edited || wanted[act.standardKey];
    });
    var removed = before - plan.activities.length;

    var present = {};
    plan.activities.forEach(function (act) { if (act.standardKey) present[act.standardKey] = true; });

    var added = 0;
    Object.keys(wanted).forEach(function (key) {
      if (present[key]) return;
      var w = wanted[key];
      plan.activities.push(Storage.newActivity({
        componentId: w.componentId,
        category: w.category,
        source: 'standard',
        standardKey: key,
        start: w.std.months[0],
        end: w.std.months[1],
        priority: DEFAULT_PRIORITY[w.category]
      }));
      added++;
    });

    sortActivities(framework, plan);
    plan.generatedAt = new Date().toISOString();
    return { added: added, removed: removed };
  }

  /** Order: pillar/component order of the framework, then category, then start month. */
  function sortActivities(framework, plan) {
    var order = {};
    framework.allComponents().forEach(function (e, i) { order[e.component.id] = i; });
    var catOrder = { address: 0, opportunity: 1, maintain: 2, other: 3 };
    plan.activities.sort(function (a, b) {
      var oa = a.componentId in order ? order[a.componentId] : 999;
      var ob = b.componentId in order ? order[b.componentId] : 999;
      return oa - ob || catOrder[a.category] - catOrder[b.category] || a.start - b.start;
    });
  }

  function addCustomActivity(framework, assessment, componentId) {
    var category = 'other';
    if (componentId) {
      category = Scoring.categoryFor(assessment.answers[componentId], framework.MAX_SCORE) || 'other';
    }
    var act = Storage.newActivity({
      componentId: componentId || null,
      category: category,
      source: 'custom',
      start: 1,
      end: 3,
      priority: DEFAULT_PRIORITY[category],
      edited: true
    });
    assessment.plan.activities.push(act);
    return act;
  }

  /** Resolves the display texts of an activity (standard texts come from the library). */
  function resolveTexts(activity, lang) {
    var title = activity.title;
    var indicator = activity.indicator;
    if (activity.source === 'standard' && activity.standardKey) {
      var parts = activity.standardKey.split(':');
      var list = Activities.get(parts[0], parts[1]);
      var std = list[Number(parts[2])];
      if (std) {
        if (!title) title = std.title[lang] || std.title.fr;
        if (!indicator) indicator = std.indicator[lang] || std.indicator.fr;
      }
    }
    return { title: title, indicator: indicator };
  }

  function stats(plan) {
    var s = { total: 0, done: 0, ongoing: 0, planned: 0, custom: 0, standard: 0, byCategory: { address: 0, opportunity: 0, maintain: 0, other: 0 } };
    plan.activities.forEach(function (a) {
      s.total++;
      s[a.status]++;
      s[a.source]++;
      s.byCategory[a.category]++;
    });
    s.progress = s.total ? (s.done + s.ongoing * 0.5) / s.total : 0;
    return s;
  }

  /** Calendar label for month n (1-based) given a plan start 'YYYY-MM'. */
  function monthLabel(startMonth, n, lang) {
    if (!startMonth) return 'M' + n;
    var parts = startMonth.split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1 + (n - 1), 1);
    try {
      return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { month: 'short', year: '2-digit' });
    } catch (e) {
      return (d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(2);
    }
  }

  /**
   * Timeline header for `months` months: year groups plus short month labels.
   * With a start month: calendar years and month initials; otherwise
   * "Year 1 / Year 2" and month numbers.
   */
  function timelineHeader(startMonth, months, lang) {
    var groups = [];
    var labels = [];
    var locale = lang === 'en' ? 'en-GB' : 'fr-FR';
    for (var n = 1; n <= months; n++) {
      var key;
      if (startMonth) {
        var parts = startMonth.split('-');
        var d = new Date(Number(parts[0]), Number(parts[1]) - 1 + (n - 1), 1);
        key = String(d.getFullYear());
        var short;
        try { short = d.toLocaleDateString(locale, { month: 'narrow' }); } catch (e) { short = String(d.getMonth() + 1); }
        labels.push(short);
      } else {
        key = 'Y' + Math.ceil(n / 12);
        labels.push(String(n));
      }
      var last = groups[groups.length - 1];
      if (last && last.key === key) last.span++; else groups.push({ key: key, label: key, span: 1 });
    }
    return { groups: groups, labels: labels };
  }

  var Plan = {
    timelineHeader: timelineHeader,
    DEFAULT_PRIORITY: DEFAULT_PRIORITY,
    syncStandardActivities: syncStandardActivities,
    sortActivities: sortActivities,
    addCustomActivity: addCustomActivity,
    resolveTexts: resolveTexts,
    stats: stats,
    monthLabel: monthLabel
  };

  if (isNode) {
    module.exports = Plan;
  } else {
    root.BarometerPlan = Plan;
  }
})(this);
