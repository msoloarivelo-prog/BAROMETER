/*
 * Change Action Plan (CAP) view.
 *
 * For each indicator, the gap identified is pre-filled from the current
 * level and the target from the next level; prioritized actions are
 * pre-filled from the model's suggested actions and remain fully editable.
 * CAP columns: gap identified, prioritized actions, rank, means of
 * verification, person responsible, time frame, comments and follow-up.
 */
(function () {
  'use strict';

  var App = window.App;
  var S = App.S;
  var Plan = App.Plan;
  var Store = App.Store;
  var esc = App.esc;
  var t = App.t;
  var L = App.L;
  var A = App.actions;

  var CATS = ['address', 'opportunity', 'maintain', 'other'];

  /** Gap identified: the organisation's own wording, or the current level description by default. */
  App.gapText = function (a, c) {
    if (typeof a.plan.challenges[c.id] === 'string') return a.plan.challenges[c.id];
    var score = a.answers[c.id];
    return score && score < 4 ? L(c.levels[score - 1]) : '';
  };

  /** Rank labels: 1 – Essential, 2 – Important, 3 – Neutral. */
  App.rankLabel = function (value) {
    var i = -1;
    App.F.PRIORITIES.forEach(function (p, k) { if (p.value === value) i = k; });
    return i < 0 ? '' : (i + 1) + ' – ' + L(App.F.PRIORITIES[i].label);
  };

  function monthLabels(plan) {
    var out = [];
    for (var m = 1; m <= Store.MONTHS; m++) out.push(Plan.monthLabel(plan.startMonth, m, App.I18n.getLang()));
    return out;
  }
  App.monthLabels = monthLabels;

  function timelineHeader(plan) {
    var h = Plan.timelineHeader(plan.startMonth, Store.MONTHS, App.I18n.getLang());
    h.groups.forEach(function (g) {
      if (/^Y\d+$/.test(g.key)) g.label = t('plan.year', { n: g.key.slice(1) });
    });
    return h;
  }
  App.timelineHeader = timelineHeader;

  function activityRows(a, filterFn) {
    var lang = App.I18n.getLang();
    return a.plan.activities.filter(filterFn || function () { return true; }).map(function (act) {
      var entry = act.componentId ? App.findComponent(act.componentId) : null;
      return {
        act: act,
        label: Plan.resolveTexts(act, lang).title || t('plan.activityPh'),
        sub: entry ? L(entry.component.name) : t('plan.general'),
        start: act.start,
        end: act.end,
        category: act.category,
        status: act.status
      };
    });
  }
  App.activityRows = activityRows;

  function filterFn() {
    var f = App.ui.planFilter;
    return function (act) { return f === 'all' || act.category === f; };
  }

  function renderTimeline() {
    var a = App.assessment();
    var slot = document.getElementById('plan-timeline');
    if (!slot) return;
    var rows = activityRows(a, filterFn());
    slot.innerHTML = rows.length ? App.Charts.gantt(rows, timelineHeader(a.plan), esc) : '<p class="muted">' + esc(t('plan.empty')) + '</p>';
  }

  function select(field, actId, options, value) {
    return '<select data-on="act-field" data-id="' + esc(actId) + '" data-field="' + field + '">' + options.map(function (o) {
      return '<option value="' + esc(o.value) + '"' + (String(o.value) === String(value) ? ' selected' : '') + '>' + esc(o.label) + '</option>';
    }).join('') + '</select>';
  }

  function activityCard(act, plan) {
    var lang = App.I18n.getLang();
    var texts = Plan.resolveTexts(act, lang);
    var months = monthLabels(plan).map(function (m, i) { return { value: i + 1, label: m }; });
    var ranks = [{ value: '', label: '—' }].concat(App.F.PRIORITIES.map(function (p) { return { value: p.value, label: App.rankLabel(p.value) }; }));
    var statuses = Store.STATUSES.map(function (s) { return { value: s, label: t('status.' + s) }; });
    function input(field, value, label) {
      return '<label class="field"><span>' + esc(t(label)) + '</span><input type="text" data-on="act-field" data-id="' + esc(act.id) + '" data-field="' + field + '" value="' + esc(value) + '"></label>';
    }
    return '<div class="activity cat-' + act.category + ' status-' + act.status + '" data-activity="' + esc(act.id) + '">' +
      '<div class="activity-top">' +
        '<span class="source-tag ' + act.source + '">' + esc(t('source.' + act.source)) + '</span>' +
        App.catTag(act.category) +
        '<button class="btn small ghost danger" data-click="act-remove" data-id="' + esc(act.id) + '" title="' + esc(t('plan.remove')) + '">✕ ' + esc(t('plan.remove')) + '</button>' +
      '</div>' +
      '<label class="field wide"><span>' + esc(t('cap.action')) + '</span><textarea rows="2" data-on="act-field" data-id="' + esc(act.id) + '" data-field="title" placeholder="' + esc(t('plan.activityPh')) + '">' + esc(texts.title) + '</textarea></label>' +
      '<div class="activity-grid cap-grid">' +
        '<label class="field"><span>' + esc(t('cap.rank')) + '</span>' + select('priority', act.id, ranks, act.priority) + '</label>' +
        '<label class="field"><span>' + esc(t('cap.verification')) + '</span><input type="text" data-on="act-field" data-id="' + esc(act.id) + '" data-field="verification" value="' + esc(texts.verification) + '"></label>' +
        input('lead', act.lead, 'cap.responsible') +
        '<label class="field"><span>' + esc(t('plan.from')) + '</span>' + select('start', act.id, months, act.start) + '</label>' +
        '<label class="field"><span>' + esc(t('plan.to')) + '</span>' + select('end', act.id, months, act.end) + '</label>' +
        '<label class="field"><span>' + esc(t('plan.status')) + '</span>' + select('status', act.id, statuses, act.status) + '</label>' +
      '</div>' +
      '<label class="field wide follow-up"><span>' + esc(t('cap.followUp')) + '</span><textarea rows="2" data-on="act-field" data-id="' + esc(act.id) + '" data-field="followUp" placeholder="' + esc(t('cap.followUpPh')) + '">' + esc(act.followUp) + '</textarea></label>' +
      '<details class="activity-more"><summary>' + esc(t('plan.more')) + '</summary><div class="activity-grid">' +
        '<label class="field wide"><span>' + esc(t('plan.indicator')) + '</span><input type="text" data-on="act-field" data-id="' + esc(act.id) + '" data-field="indicator" value="' + esc(texts.indicator) + '"></label>' +
        input('baseline', act.baseline, 'plan.baseline') +
        input('target', act.target, 'plan.target') +
        input('resourcesAvailable', act.resourcesAvailable, 'plan.resAvailable') +
        input('resourcesAnticipated', act.resourcesAnticipated, 'plan.resAnticipated') +
      '</div></details>' +
      '</div>';
  }

  App.views.plan = function () {
    var org = App.org();
    var a = App.assessment();
    var F = App.fw(a);
    var plan = a.plan;
    var answered = Object.keys(a.answers).length;

    if (!plan.generatedAt && answered) {
      Plan.syncStandardActivities(F, a);
      App.persist(true);
    }

    var st = Plan.stats(plan);
    var f = App.ui.planFilter;

    var html = '<div class="page-head"><div><h1>' + esc(t('plan.title')) + '</h1>' +
      '<p class="muted">' + esc(App.orgName(org)) + ' — ' + esc(App.assessmentLabel(a)) + '</p></div>' +
      '<div class="actions no-print">' +
        '<label class="inline-field">' + esc(t('plan.start')) + ' <input type="month" data-on="plan-start" value="' + esc(plan.startMonth) + '"></label>' +
        '<button class="btn" data-click="plan-sync">↻ ' + esc(t('plan.sync')) + '</button>' +
        '<button class="btn" data-click="plan-export">' + esc(t('plan.export')) + '</button>' +
        '<a class="btn primary" href="#report">' + esc(t('results.toReport')) + '</a>' +
      '</div></div>' +
      '<p class="muted">' + esc(t('plan.intro')) + '</p>';

    html += '<div class="plan-summary">' +
      '<div class="chips" role="group">' +
        '<button class="chip' + (f === 'all' ? ' active' : '') + '" data-click="plan-filter" data-cat="all">' + esc(t('plan.filterAll')) + ' <b>' + st.total + '</b></button>' +
        CATS.map(function (c) {
          return '<button class="chip cat-' + c + (f === c ? ' active' : '') + '" data-click="plan-filter" data-cat="' + c + '">' +
            App.CAT_ICONS[c] + ' ' + esc(t('cat.' + c)) + ' <b>' + st.byCategory[c] + '</b></button>';
        }).join('') +
      '</div>' +
      '<div class="progress-line"><span>' + esc(t('plan.progress')) + '</span><div class="progress"><div style="width:' + Math.round(st.progress * 100) + '%"></div></div>' +
        '<span>' + st.done + ' ' + esc(t('status.done').toLowerCase()) + ' · ' + st.ongoing + ' ' + esc(t('status.ongoing').toLowerCase()) + '</span></div>' +
      '</div>';

    html += '<section class="card"><h2>' + esc(t('plan.timeline')) + '</h2><div id="plan-timeline" class="timeline-wrap"></div></section>';

    var ff = filterFn();
    F.PILLARS.forEach(function (pillar) {
      var block = '';
      pillar.aspects.forEach(function (aspect) {
        aspect.components.forEach(function (c) {
          var score = a.answers[c.id];
          var cat = S.categoryFor(score);
          var acts = plan.activities.filter(function (x) { return x.componentId === c.id && ff(x); });
          if (!acts.length && (f !== 'all' && f !== cat)) return;
          if (!acts.length && !score) return;
          var title = App.componentTitle(F, aspect, c);
          block += '<article class="plan-component card" style="--pillar:' + pillar.color + '">' +
            '<header><h3>' + esc(title) + '</h3><div class="plan-component-tags">' + App.levelBadge(score) + App.catTag(cat) + '</div></header>' +
            (score ? '<p class="context"><strong>' + esc(t('plan.current')) + ' :</strong> ' + esc(L(c.levels[score - 1])) + '</p>' : '') +
            (score && score < 4 ? '<p class="context next"><strong>' + esc(t('plan.next')) + ' :</strong> ' + esc(L(c.levels[score])) + '</p>' : '') +
            (cat === 'address' || cat === 'opportunity'
              ? '<label class="field wide challenge"><span>' + esc(t('cap.gap')) + '</span><textarea rows="2" data-on="challenge" data-id="' + esc(c.id) + '" placeholder="' + esc(t('plan.challengePh')) + '">' + esc(App.gapText(a, c)) + '</textarea></label>'
              : '') +
            '<div class="activity-list">' + acts.map(function (x) { return activityCard(x, plan); }).join('') + '</div>' +
            '<button class="btn small" data-click="act-add" data-component="' + esc(c.id) + '">' + esc(t('plan.addOwn')) + '</button>' +
            '</article>';
        });
      });
      if (block) html += '<h2 class="pillar-heading" style="--pillar:' + pillar.color + '">' + esc(L(pillar.name)) + '</h2>' + block;
    });

    var general = plan.activities.filter(function (x) { return !x.componentId && ff(x); });
    if (f === 'all' || f === 'other') {
      html += '<h2 class="pillar-heading">' + esc(t('plan.general')) + '</h2>' +
        '<article class="plan-component card"><div class="activity-list">' + general.map(function (x) { return activityCard(x, plan); }).join('') + '</div>' +
        '<button class="btn small" data-click="act-add" data-component="">' + esc(t('plan.addGeneral')) + '</button></article>';
    }

    if (!answered && !plan.activities.length) html += '<div class="notice">' + esc(t('plan.empty')) + ' <a href="#assessment/' + F.PILLARS[0].id + '">' + esc(t('results.complete')) + '</a></div>';

    App.setView(html);
    renderTimeline();
  };

  function findAct(id) {
    return App.assessment().plan.activities.filter(function (x) { return x.id === id; })[0];
  }

  A['plan-filter'] = function (el) {
    App.ui.planFilter = el.dataset.cat;
    App.render();
  };

  A['plan-start'] = function (el) {
    App.assessment().plan.startMonth = /^\d{4}-\d{2}$/.test(el.value) ? el.value : '';
    App.touch();
    App.persist(true);
    App.render();
  };

  A['plan-sync'] = function () {
    var res = Plan.syncStandardActivities(App.fw(), App.assessment());
    App.touch();
    App.persist(true);
    App.flash(t('plan.syncDone', res));
    App.render();
  };

  A.challenge = function (el) {
    App.assessment().plan.challenges[el.dataset.id] = el.value;
    App.touch();
    App.persist();
  };

  A['act-field'] = function (el) {
    var act = findAct(el.dataset.id);
    if (!act) return;
    var field = el.dataset.field;
    if (field === 'start' || field === 'end') {
      act[field] = Number(el.value);
      if (act.end < act.start) {
        if (field === 'start') act.end = act.start; else act.start = act.end;
        var card = el.closest('.activity');
        card.querySelector('[data-field="start"]').value = act.start;
        card.querySelector('[data-field="end"]').value = act.end;
      }
    } else {
      act[field] = el.value;
    }
    if (field === 'status') {
      var c = el.closest('.activity');
      c.className = c.className.replace(/status-\w+/, 'status-' + act.status);
    }
    act.edited = true;
    App.touch();
    App.persist(field !== 'title' && field !== 'indicator');
    renderTimeline();
  };

  A['act-add'] = function (el) {
    var act = Plan.addCustomActivity(App.fw(), App.assessment(), el.dataset.component || null);
    if (App.ui.planFilter !== 'all' && App.ui.planFilter !== act.category) App.ui.planFilter = 'all';
    App.touch();
    App.persist(true);
    App.render();
    var node = document.querySelector('[data-activity="' + act.id + '"] textarea');
    if (node) { node.focus(); node.scrollIntoView({ block: 'center' }); }
  };

  A['act-remove'] = function (el) {
    if (!confirm(t('plan.confirmRemove'))) return;
    var plan = App.assessment().plan;
    plan.activities = plan.activities.filter(function (x) { return x.id !== el.dataset.id; });
    App.touch();
    App.persist(true);
    App.render();
  };

  A['plan-export'] = function () {
    var a = App.assessment();
    var lang = App.I18n.getLang();
    var labels = monthLabels(a.plan);
    var header = [t('cap.domain'), t('report.component'), t('score'), 'Category', t('cap.gap'), t('cap.target'), t('cap.action'), t('cap.rank'),
      t('cap.verification'), t('cap.responsible'), t('plan.from'), t('plan.to'), t('plan.status'), t('cap.followUp'), 'Source',
      t('plan.indicator'), t('plan.baseline'), t('plan.target'), t('plan.resAvailable'), t('plan.resAnticipated')].concat(labels);
    var rows = [header];
    a.plan.activities.forEach(function (act) {
      var e = act.componentId ? App.findComponent(act.componentId) : null;
      var texts = Plan.resolveTexts(act, lang);
      var score = e ? a.answers[act.componentId] : null;
      var row = [e ? L(e.pillar.name) : '', e ? L(e.component.name) : t('plan.general'), score || '',
        t('cat.' + act.category), e ? App.gapText(a, e.component) : '', e && score && score < 4 ? L(e.component.levels[score]) : '',
        texts.title, App.rankLabel(act.priority), texts.verification, act.lead, labels[act.start - 1], labels[act.end - 1],
        t('status.' + act.status), act.followUp, t('source.' + act.source),
        texts.indicator, act.baseline, act.target, act.resourcesAvailable, act.resourcesAnticipated];
      for (var m = 1; m <= labels.length; m++) row.push(m >= act.start && m <= act.end ? 'x' : '');
      rows.push(row);
    });
    App.download('CAP-' + App.slug(App.org().organization.acronym || App.orgName()) + '-' + a.year + '.csv', App.csv(rows), 'text/csv;charset=utf-8');
  };
})();
