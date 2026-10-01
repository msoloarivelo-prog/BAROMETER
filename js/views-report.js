/*
 * Individual organisation report, laid out as A4 pages:
 *   1. Overview (key figures, pillar scores, strengths / opportunities /
 *      weaknesses at a glance, change since previous assessment, plan summary)
 *   2. Detailed scores
 *   3. Strengths to maintain, opportunities to catch, weaknesses to address
 *   4. Workplan and timeline
 *   5. Comments and validation
 * "Export to PDF" uses the browser's print dialog (Save as PDF), which keeps
 * the text selectable and works offline.
 */
(function () {
  'use strict';

  var App = window.App;
  var F = App.F;
  var S = App.S;
  var Plan = App.Plan;
  var esc = App.esc;
  var t = App.t;
  var L = App.L;
  var A = App.actions;

  function header(org, a, title) {
    var o = org.organization;
    return '<header class="report-header"><div><div class="report-kicker">' + esc(t('app.title')) + '</div>' +
      '<h2>' + esc(title) + '</h2></div>' +
      '<div class="report-meta">' + esc(App.orgName(org)) + (o.acronym ? ' (' + esc(o.acronym) + ')' : '') + '<br>' + esc(App.assessmentLabel(a)) + '</div></header>';
  }

  function topList(items, n) {
    if (!items.length) return '<p class="muted small">' + esc(t('results.noItems')) + '</p>';
    return '<ul class="report-top">' + items.slice(0, n).map(function (it) {
      return '<li>' + App.levelBadge(it.score) + '<span>' + esc(L(it.component.name)) + '<small>' + esc(L(it.pillar.shortName)) + '</small></span></li>';
    }).join('') + (items.length > n ? '<li class="muted small">+ ' + (items.length - n) + '</li>' : '') + '</ul>';
  }

  function reportHead() {
    var mode = App.ui.reportMode === 'evolution' ? 'evolution' : 'single';
    return '<div class="page-head no-print"><div><h1>' + esc(t('nav.report')) + '</h1>' +
      '<p class="muted">' + esc(t('report.exportHelp')) + '</p></div>' +
      '<div class="actions">' +
        '<div class="segmented" role="group">' +
          '<button class="' + (mode === 'single' ? 'active' : '') + '" data-click="report-mode" data-mode="single">' + esc(t('report.modeSingle')) + '</button>' +
          '<button class="' + (mode === 'evolution' ? 'active' : '') + '" data-click="report-mode" data-mode="evolution">' + esc(t('report.modeEvolution')) + '</button>' +
        '</div>' +
        '<button class="btn primary" data-click="report-pdf">⤓ ' + esc(t('report.export')) + '</button></div></div>';
  }

  App.views.report = function () {
    if (App.ui.reportMode === 'evolution') {
      App.renderEvolutionReport(reportHead());
      return;
    }
    var org = App.org();
    var o = org.organization;
    var a = App.assessment();
    var r = App.scores(a);
    var groups = S.classify(F, a.answers);
    var stage = S.stageFor(F, r.index);
    var prev = App.previousAssessment(org, a);
    var cmp = prev ? S.compareScores(r, App.scores(prev)) : null;
    var prevScores = prev ? App.scores(prev) : null;
    var lang = App.I18n.getLang();
    if (!a.plan.generatedAt && Object.keys(a.answers).length) {
      Plan.syncStandardActivities(F, a);
      App.persist(true);
    }
    var st = Plan.stats(a.plan);
    var labels = App.monthLabels(a.plan);

    var html = reportHead();

    if (!r.complete) {
      html += '<div class="notice no-print">' + esc(t('results.incomplete', { n: r.answered, total: r.totalComponents })) +
        ' <a href="#assessment/gov">' + esc(t('results.complete')) + '</a></div>';
    }

    html += '<div class="report">';

    // ---------------------------------------------------------------- page 1
    html += '<section class="report-page">' +
      '<div class="report-cover">' +
        '<div class="report-kicker">' + esc(t('app.title')) + '</div>' +
        '<h1>' + esc(t('report.title')) + '</h1>' +
        '<div class="report-org">' + esc(App.orgName(org)) + (o.acronym ? ' <span>(' + esc(o.acronym) + ')</span>' : '') + '</div>' +
        '<dl class="report-facts">' +
          '<div><dt>' + esc(t('header.assessment')) + '</dt><dd>' + esc(App.assessmentLabel(a)) + '</dd></div>' +
          '<div><dt>' + esc(t('report.date')) + '</dt><dd>' + esc(App.dateStr()) + '</dd></div>' +
          (o.region ? '<div><dt>' + esc(t('profile.region')) + '</dt><dd>' + esc(o.region) + '</dd></div>' : '') +
          (o.focalPoint ? '<div><dt>' + esc(t('profile.focalPoint')) + '</dt><dd>' + esc(o.focalPoint) + '</dd></div>' : '') +
        '</dl>' +
      '</div>' +
      '<h2 class="report-h">' + esc(t('report.overview')) + '</h2>' +
      '<div class="report-kpis">' +
        '<div class="report-kpi main"><span>' + esc(t('results.index')) + '</span><strong>' + App.fmt(r.index, 2) + '<small> / 4</small></strong>' +
          (stage ? '<em>' + esc(L(stage.label)) + '</em>' : '') +
          (cmp && cmp.index !== null ? App.deltaTag(cmp.index) : '') + '</div>' +
        '<div class="report-kpi"><span>' + esc(t('results.total')) + '</span><strong>' + r.total + '<small> / ' + r.maxTotal + '</small></strong></div>' +
        '<div class="report-kpi"><span>' + esc(t('profile.progress')) + '</span><strong>' + r.answered + '<small> / ' + r.totalComponents + '</small></strong></div>' +
      '</div>' +
      '<p class="report-lead">' + esc(t('report.summarySentence', {
        org: App.orgName(org), index: App.fmt(r.index, 2), stage: stage ? L(stage.label).toLowerCase() : '—',
        m: groups.maintain.length, o: groups.opportunity.length, a: groups.address.length
      })) + '</p>' +
      '<div class="report-donuts">' + F.PILLARS.map(function (p) {
        return '<div class="report-donut" style="--pillar:' + App.PILLAR_COLORS[p.id] + '"><div data-rdonut="' + p.id + '"></div><span>' + esc(L(p.shortName)) + '</span></div>';
      }).join('') + '</div>' +
      '<h3 class="report-h3">' + esc(t('report.keyFindings')) + '</h3>' +
      '<div class="report-swot">' + ['maintain', 'opportunity', 'address'].map(function (cat) {
        return '<div class="report-swot-col cat-' + cat + '"><h4>' + App.CAT_ICONS[cat] + ' ' + esc(t('cats.' + cat)) + ' <b>' + groups[cat].length + '</b></h4>' +
          topList(groups[cat], 4) + '</div>';
      }).join('') + '</div>';

    if (cmp && prevScores) {
      html += '<h3 class="report-h3">' + esc(t('report.evolution')) + ' (' + esc(App.assessmentLabel(prev)) + ')</h3>' +
        '<table class="report-table compact"><thead><tr><th></th><th>' + esc(App.assessmentLabel(prev)) + '</th><th>' + esc(App.assessmentLabel(a)) + '</th><th>Δ</th></tr></thead><tbody>' +
        r.pillars.map(function (p, i) {
          var d = cmp.pillars[i].delta;
          return '<tr><td>' + esc(L(p.name)) + '</td><td>' + App.fmt(prevScores.pillars[i].score) + '</td><td>' + App.fmt(p.score) + '</td>' +
            '<td class="delta ' + (d > 0 ? 'up' : d < 0 ? 'down' : 'flat') + '">' + (d === null ? '—' : (d > 0 ? '+' : '') + App.fmt(d)) + '</td></tr>';
        }).join('') +
        '<tr class="total"><td>' + esc(t('results.index')) + '</td><td>' + App.fmt(prevScores.index, 2) + '</td><td>' + App.fmt(r.index, 2) + '</td>' +
        '<td class="delta ' + (cmp.index > 0 ? 'up' : cmp.index < 0 ? 'down' : 'flat') + '">' + (cmp.index === null ? '—' : (cmp.index > 0 ? '+' : '') + App.fmt(cmp.index, 2)) + '</td></tr>' +
        '</tbody></table>';
    }

    html += '<h3 class="report-h3">' + esc(t('report.planSummary')) + '</h3>' +
      '<p>' + esc(t('report.planSentence', { n: st.total, own: st.custom })) + '</p>' +
      '<div class="report-plan-counts">' + ['address', 'opportunity', 'maintain', 'other'].map(function (c) {
        return '<span class="cat-tag cat-' + c + '">' + App.CAT_ICONS[c] + ' ' + esc(t('cat.' + c)) + ' : ' + st.byCategory[c] + '</span>';
      }).join('') + '</div>' +
      '</section>';

    // ---------------------------------------------------------------- page 2
    html += '<section class="report-page">' + header(org, a, t('report.scores')) +
      '<div class="report-pillar-bars" id="report-pillar-bars"></div>';
    r.pillars.forEach(function (p) {
      html += '<h3 class="report-h3 pillar" style="--pillar:' + App.PILLAR_COLORS[p.id] + '">' + esc(L(p.name)) + ' <span>' + App.fmt(p.score) + ' / 4</span></h3>' +
        '<table class="report-table"><thead><tr><th>' + esc(t('report.aspect')) + '</th><th>' + esc(t('report.component')) + '</th><th>' + esc(t('score')) + '</th><th></th></tr></thead><tbody>';
      p.aspects.forEach(function (asp) {
        asp.components.forEach(function (c, j) {
          html += '<tr>' + (j === 0 ? '<td rowspan="' + asp.components.length + '" class="aspect-cell"><strong>' + esc(L(asp.name)) + '</strong><br><span class="muted">' + App.fmt(asp.score) + ' / 4</span></td>' : '') +
            '<td>' + esc(L(c.name)) + '</td><td class="center">' + App.levelBadge(c.score) + '</td><td>' + (c.category ? App.catTag(c.category) : '') + '</td></tr>';
        });
      });
      html += '</tbody></table>';
    });
    html += '<p class="muted small">' + esc(t('results.method.' + r.indexMethod)) + '</p></section>';

    // ---------------------------------------------------------------- page 3
    html += '<section class="report-page">' + header(org, a, t('report.analysis'));
    ['maintain', 'opportunity', 'address'].forEach(function (cat) {
      html += '<h3 class="report-h3 cat-' + cat + '">' + App.CAT_ICONS[cat] + ' ' + esc(t('cats.' + cat)) + ' (' + groups[cat].length + ')</h3>' +
        '<p class="muted small">' + esc(t('catHelp.' + cat)) + '</p>';
      if (!groups[cat].length) { html += '<p class="muted">' + esc(t('results.noItems')) + '</p>'; return; }
      html += '<div class="report-items">' + groups[cat].map(function (it) {
        var c = it.component;
        var challenge = a.plan.challenges[c.id];
        return '<div class="report-item cat-' + cat + '"><div class="report-item-head">' + App.levelBadge(it.score) +
          '<strong>' + esc(L(c.name)) + '</strong><span class="muted small">' + esc(L(it.pillar.shortName)) + ' · ' + esc(L(it.aspect.name)) + '</span></div>' +
          '<p><em>' + esc(t('report.currentLevel')) + ' :</em> ' + esc(L(c.levels[it.score - 1])) + '</p>' +
          (it.score < 4 ? '<p><em>' + esc(t('report.nextLevel')) + ' :</em> ' + esc(L(c.levels[it.score])) + '</p>' : '') +
          (challenge ? '<p><em>' + esc(t('plan.challenge')) + ' :</em> ' + esc(challenge) + '</p>' : '') +
          (a.comments[c.id] ? '<p class="muted"><em>' + esc(t('diag.comment')) + ' :</em> ' + esc(a.comments[c.id]) + '</p>' : '') +
          '</div>';
      }).join('') + '</div>';
    });
    html += '</section>';

    // ---------------------------------------------------------------- page 4
    html += '<section class="report-page">' + header(org, a, t('report.workplan'));
    if (!a.plan.activities.length) {
      html += '<p class="muted">' + esc(t('plan.empty')) + '</p>';
    } else {
      html += '<table class="report-table plan-table"><thead><tr><th>' + esc(t('report.component')) + '</th><th>' + esc(t('plan.activity')) + '</th><th>' +
        esc(t('plan.lead')) + '</th><th>' + esc(t('report.period')) + '</th><th>' + esc(t('plan.priority')) + '</th><th>' + esc(t('plan.indicator')) + '</th></tr></thead><tbody>';
      a.plan.activities.forEach(function (act) {
        var e = act.componentId ? App.findComponent(act.componentId) : null;
        var texts = Plan.resolveTexts(act, lang);
        var pr = F.PRIORITIES.filter(function (p) { return p.value === act.priority; })[0];
        var ind = texts.indicator + (act.baseline || act.target ? ' (' + (act.baseline ? t('plan.baseline') + ' : ' + act.baseline : '') +
          (act.baseline && act.target ? ' → ' : '') + (act.target ? t('plan.target') + ' : ' + act.target : '') + ')' : '');
        html += '<tr class="cat-' + act.category + '"><td><span class="cat-dot cat-' + act.category + '">' + App.CAT_ICONS[act.category] + '</span> ' +
          esc(e ? L(e.component.name) : t('plan.general')) + '</td>' +
          '<td>' + esc(texts.title) + (act.source === 'custom' ? ' <span class="own-mark">' + esc(t('cat.other')) + '</span>' : '') + '</td>' +
          '<td>' + esc(act.lead) + '</td><td class="nowrap">' + esc(labels[act.start - 1]) + (act.end !== act.start ? ' – ' + esc(labels[act.end - 1]) : '') + '</td>' +
          '<td>' + esc(pr ? L(pr.label) : '') + '</td><td>' + esc(ind) + '</td></tr>';
      });
      html += '</tbody></table>' +
        '<h3 class="report-h3 report-gantt-title">' + esc(t('plan.timeline')) + '</h3>' +
        App.Charts.gantt(App.activityRows(a), App.timelineHeader(a.plan), esc);
    }
    html += '</section>';

    // ---------------------------------------------------------------- page 5
    html += '<section class="report-page report-last">' + header(org, a, t('report.validation'));
    var commented = F.allComponents().filter(function (e) { return a.comments[e.component.id]; });
    if (commented.length) {
      html += '<h3 class="report-h3">' + esc(t('report.comments')) + '</h3><table class="report-table compact"><tbody>' +
        commented.map(function (e) {
          return '<tr><td><strong>' + esc(L(e.component.name)) + '</strong><br><span class="muted small">' + esc(L(e.pillar.shortName)) + '</span></td><td>' + esc(a.comments[e.component.id]) + '</td></tr>';
        }).join('') + '</tbody></table>';
    }
    html += '<div class="signatures">' +
      ['report.preparedBy', 'report.validatedBy'].map(function (k) {
        return '<div class="signature"><span>' + esc(t(k)) + '</span><div class="sig-line"></div><small>' + esc(t('report.signature')) + '</small></div>';
      }).join('') + '</div></section>';

    html += '</div>';
    App.setView(html);

    r.pillars.forEach(function (p) {
      var slot = App.viewEl.querySelector('[data-rdonut="' + p.id + '"]');
      slot.appendChild(App.Charts.donut(p.score, F.MAX_SCORE, { color: App.PILLAR_COLORS[p.id], size: 110, stroke: 13, label: L(p.name) }));
    });
    document.getElementById('report-pillar-bars').appendChild(App.Charts.bars(r.pillars.map(function (p) {
      return { label: L(p.name), value: p.score, color: App.PILLAR_COLORS[p.id] };
    }), F.MAX_SCORE));
  };

  A['report-mode'] = function (el) {
    App.ui.reportMode = el.dataset.mode === 'evolution' ? 'evolution' : 'single';
    if (location.hash === '#report') App.render(); else location.hash = '#report';
  };

  A['report-pdf'] = function () {
    var a = App.assessment();
    var previous = document.title;
    var kind = App.ui.reportMode === 'evolution' ? t('report.modeEvolution') : t('nav.report');
    document.title = (kind + '-' + App.slug(App.org().organization.acronym || App.orgName()) + '-' + a.year).replace(/\s+/g, '-');
    var restore = function () { document.title = previous; window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    window.print();
  };
})();
