/*
 * Evolution over time (regular assessments) and the comparative report.
 *
 * #evolution : trend of the global index and pillars across every period,
 *              table of all periods, and a detailed comparison between two
 *              chosen periods (improved / declined components, weaknesses
 *              resolved, new weaknesses, workplan follow-up).
 * #report in "evolution" mode : the same content as printable A4 pages.
 */
(function () {
  'use strict';

  var App = window.App;
  var F = App.F;
  var Evo = window.BarometerEvolution;
  var esc = App.esc;
  var t = App.t;
  var L = App.L;
  var A = App.actions;

  /** Selected periods, defaulting to the previous and the latest assessment. */
  function periods(org) {
    var list = App.chronological(org);
    var ids = list.map(function (a) { return a.id; });
    if (ids.indexOf(App.ui.evoTo) < 0) App.ui.evoTo = ids[ids.length - 1];
    if (ids.indexOf(App.ui.evoFrom) < 0 || App.ui.evoFrom === App.ui.evoTo) {
      var toIdx = ids.indexOf(App.ui.evoTo);
      App.ui.evoFrom = ids[toIdx > 0 ? toIdx - 1 : (ids.length > 1 ? 1 : 0)];
    }
    return {
      list: list,
      from: list[ids.indexOf(App.ui.evoFrom)],
      to: list[ids.indexOf(App.ui.evoTo)]
    };
  }

  function deltaCell(d, digits) {
    if (d === null || d === undefined) return '<td class="center muted">—</td>';
    var cls = d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
    return '<td class="center delta ' + cls + '">' + (d > 0 ? '+' : '') + App.fmt(d, digits === undefined ? 1 : digits) + '</td>';
  }

  /** Table: one column per period, last column = change first -> last. */
  function periodTable(tl, cls) {
    var first = tl[0].scores;
    var last = tl[tl.length - 1].scores;
    function row(label, get, digits, strong) {
      var vals = tl.map(function (x) { return get(x); });
      var d = vals[0] === null || vals[vals.length - 1] === null ? null : vals[vals.length - 1] - vals[0];
      return '<tr' + (strong ? ' class="total"' : '') + '><td>' + label + '</td>' +
        vals.map(function (v) { return '<td class="center">' + (v === null ? '—' : App.fmt(v, digits)) + '</td>'; }).join('') +
        deltaCell(d, digits) + '</tr>';
    }
    var html = '<div class="table-wrap"><table class="' + cls + ' period-table"><thead><tr><th></th>' +
      tl.map(function (x) { return '<th class="center">' + esc(App.sequenceLabel(x.assessment.sequence)) + '<br><span class="muted">' + esc(App.periodShort(x.assessment)) + '</span></th>'; }).join('') +
      '<th class="center">Δ</th></tr></thead><tbody>';
    html += row('<strong>' + esc(t('results.index')) + '</strong>', function (x) { return x.scores.index; }, 2, true);
    F.PILLARS.forEach(function (p, i) {
      html += row('<span class="dot" style="background:' + App.PILLAR_COLORS[p.id] + '"></span>' + esc(L(p.name)), function (x) { return x.scores.pillars[i].score; }, 1);
    });
    html += row(esc(t('results.total')), function (x) { return x.scores.answered ? x.scores.total : null; }, 0);
    ['maintain', 'opportunity', 'address'].forEach(function (c) {
      html += row(App.CAT_ICONS[c] + ' ' + esc(t('cats.' + c)), function (x) { return x.scores.answered ? x.scores.counts[c] : null; }, 0);
    });
    html += row(esc(t('evo.planDone')), function (x) {
      var f = Evo.planFollowUp(x.assessment);
      return f.rate === null ? null : f.rate * 100;
    }, 0);
    html += '</tbody></table></div>';
    void first; void last;
    return html;
  }

  function chart(tl) {
    var labels = tl.map(function (x) { return App.periodShort(x.assessment); });
    var series = [{ label: t('results.index'), color: '#1d2733', width: 3.5, showValues: true, values: tl.map(function (x) { return x.scores.index; }) }];
    F.PILLARS.forEach(function (p, i) {
      series.push({ label: L(p.shortName), color: App.PILLAR_COLORS[p.id], width: 2, values: tl.map(function (x) { return x.scores.pillars[i].score; }) });
    });
    return App.Charts.lines(series, labels, F.MAX_SCORE, { label: t('evo.chart') });
  }

  function itemRow(it) {
    return '<tr><td>' + esc(L(it.component.name)) + '<br><span class="muted small">' + esc(L(it.pillar.shortName)) + ' · ' + esc(L(it.aspect.name)) + '</span></td>' +
      '<td class="center nowrap">' + App.levelBadge(it.from) + ' → ' + App.levelBadge(it.to) + '</td>' +
      deltaCell(it.delta, 0) + '</tr>';
  }

  function changeList(title, items, cls, tableCls) {
    return '<div class="evo-list ' + cls + '"><h3>' + title + ' <b>' + items.length + '</b></h3>' +
      (items.length
        ? '<table class="' + tableCls + '"><tbody>' + items.map(itemRow).join('') + '</tbody></table>'
        : '<p class="muted small">' + esc(t('results.noItems')) + '</p>') + '</div>';
  }

  function changesSection(ch, tableCls) {
    var kpis = [
      ['improved', ch.improved.length, 'up'],
      ['declined', ch.declined.length, 'down'],
      ['stable', ch.stable.length, 'flat'],
      ['resolved', ch.resolvedWeaknesses.length, 'up'],
      ['newWeak', ch.newWeaknesses.length, 'down']
    ];
    return '<div class="evo-kpis">' + kpis.map(function (k) {
      return '<div class="evo-kpi ' + k[2] + '"><strong>' + k[1] + '</strong><span>' + esc(t('evo.' + k[0])) + '</span></div>';
    }).join('') + '</div>' +
      (ch.notCompared ? '<p class="muted small">' + esc(t('evo.notCompared', { n: ch.notCompared })) + '</p>' : '') +
      '<div class="evo-columns">' +
        changeList('▲ ' + esc(t('evo.improvedList')), ch.improved, 'up', tableCls) +
        changeList('▼ ' + esc(t('evo.declinedList')), ch.declined, 'down', tableCls) +
      '</div>' +
      '<div class="evo-columns">' +
        changeList('✓ ' + esc(t('evo.resolvedList')), ch.resolvedWeaknesses, 'up', tableCls) +
        changeList('! ' + esc(t('evo.newWeakList')), ch.newWeaknesses, 'down', tableCls) +
      '</div>';
  }

  function followUpSection(a) {
    var f = Evo.planFollowUp(a);
    var lang = App.I18n.getLang();
    if (!f.stats.total) return '<p class="muted">' + esc(t('evo.noPlan')) + '</p>';
    return '<p>' + esc(t('evo.followUpSentence', {
      period: App.assessmentLabel(a), total: f.stats.total, done: f.stats.done, ongoing: f.stats.ongoing, rate: App.fmt(f.rate * 100, 0)
    })) + '</p>' +
      '<div class="progress-line"><div class="progress"><div style="width:' + Math.round(f.stats.progress * 100) + '%"></div></div></div>' +
      (f.done.length ? '<h3>' + esc(t('evo.doneList')) + '</h3><ul class="done-list">' + f.done.map(function (act) {
        var e = act.componentId ? App.findComponent(act.componentId) : null;
        return '<li>✓ ' + esc(App.Plan.resolveTexts(act, lang).title) + ' <span class="muted small">— ' + esc(e ? L(e.component.name) : t('plan.general')) + '</span></li>';
      }).join('') + '</ul>' : '');
  }

  function selectors(p) {
    function sel(action, current) {
      return '<select data-on="' + action + '">' + p.list.map(function (a) {
        return '<option value="' + esc(a.id) + '"' + (a.id === current.id ? ' selected' : '') + '>' + esc(App.assessmentLabel(a)) + '</option>';
      }).join('') + '</select>';
    }
    return '<div class="evo-selectors"><label class="inline-field">' + esc(t('evo.from')) + ' ' + sel('evo-from', p.from) + '</label>' +
      '<label class="inline-field">' + esc(t('evo.to')) + ' ' + sel('evo-to', p.to) + '</label></div>';
  }

  // ------------------------------------------------------------------ page

  App.views.evolution = function () {
    var org = App.org();
    var p = periods(org);
    var html = '<div class="page-head"><div><h1>' + esc(t('evo.title')) + '</h1><p class="muted">' + esc(App.orgName(org)) + ' — ' +
      esc(t('evo.count', { n: p.list.length })) + '</p></div>' +
      '<div class="actions no-print"><button class="btn" data-click="new-assessment">' + esc(t('header.newAssessment')) + '</button>' +
      (p.list.length > 1 ? '<button class="btn primary" data-click="report-mode" data-mode="evolution">' + esc(t('evo.toReport')) + '</button>' : '') +
      '</div></div><p class="muted">' + esc(t('evo.intro')) + '</p>';

    if (p.list.length < 2) {
      App.setView(html + '<div class="notice">' + esc(t('evo.needTwo')) + '</div>');
      return;
    }

    var tl = Evo.timeline(F, p.list, App.settings());
    var first = tl[0].scores.index;
    var last = tl[tl.length - 1].scores.index;
    html += '<section class="summary evo-summary">' +
      kpi(t('evo.first') + ' (' + App.periodShort(p.list[0]) + ')', App.fmt(first, 2) + '<small> / 4</small>') +
      kpi(t('evo.latest') + ' (' + App.periodShort(p.list[p.list.length - 1]) + ')', App.fmt(last, 2) + '<small> / 4</small>') +
      kpi(t('evo.change'), first === null || last === null ? '—' : (last - first > 0 ? '+' : '') + App.fmt(last - first, 2)) +
      kpi(t('evo.assessments'), String(p.list.length)) +
      '</section>' +
      '<section class="card"><h2>' + esc(t('evo.chart')) + '</h2><div id="evo-chart"></div></section>' +
      '<section class="card"><h2>' + esc(t('evo.table')) + '</h2>' + periodTable(tl, 'table') + '</section>';

    var ch = Evo.componentChanges(F, p.from.answers, p.to.answers);
    html += '<section class="card"><div class="page-head"><h2>' + esc(t('evo.compare')) + '</h2>' + selectors(p) + '</div>' +
      changesSection(ch, 'table compact') + '</section>' +
      '<section class="card"><h2>' + esc(t('evo.followUp')) + ' — ' + esc(App.assessmentLabel(p.from)) + '</h2>' + followUpSection(p.from) + '</section>';

    App.setView(html);
    document.getElementById('evo-chart').appendChild(chart(tl));
  };

  function kpi(label, value) {
    return '<div class="kpi"><span class="kpi-label">' + esc(label) + '</span><span class="kpi-value">' + value + '</span></div>';
  }

  // ------------------------------------------------------------------ comparative report

  App.renderEvolutionReport = function (headHtml) {
    var org = App.org();
    var o = org.organization;
    var p = periods(org);
    if (p.list.length < 2) {
      App.setView(headHtml + '<div class="notice">' + esc(t('evo.needTwo')) + '</div>');
      return;
    }
    var tl = Evo.timeline(F, p.list, App.settings());
    var first = tl[0].scores.index;
    var last = tl[tl.length - 1].scores.index;
    var ch = Evo.componentChanges(F, p.from.answers, p.to.answers);
    var range = App.periodLabel(p.list[0]) + ' – ' + App.periodLabel(p.list[p.list.length - 1]);

    function header(title) {
      return '<header class="report-header"><div><div class="report-kicker">' + esc(t('app.title')) + '</div><h2>' + esc(title) + '</h2></div>' +
        '<div class="report-meta">' + esc(App.orgName(org)) + (o.acronym ? ' (' + esc(o.acronym) + ')' : '') + '<br>' + esc(range) + '</div></header>';
    }

    var html = headHtml + '<div class="no-print">' + selectors(p) + '</div><div class="report">';

    html += '<section class="report-page">' +
      '<div class="report-cover"><div class="report-kicker">' + esc(t('app.title')) + '</div>' +
        '<h1>' + esc(t('evo.reportTitle')) + '</h1>' +
        '<div class="report-org">' + esc(App.orgName(org)) + (o.acronym ? ' <span>(' + esc(o.acronym) + ')</span>' : '') + '</div>' +
        '<dl class="report-facts">' +
          '<div><dt>' + esc(t('evo.period')) + '</dt><dd>' + esc(range) + '</dd></div>' +
          '<div><dt>' + esc(t('evo.assessments')) + '</dt><dd>' + p.list.length + '</dd></div>' +
          '<div><dt>' + esc(t('report.date')) + '</dt><dd>' + esc(App.dateStr()) + '</dd></div>' +
          (o.focalPoint ? '<div><dt>' + esc(t('profile.focalPoint')) + '</dt><dd>' + esc(o.focalPoint) + '</dd></div>' : '') +
        '</dl></div>' +
      '<div class="report-kpis">' +
        '<div class="report-kpi"><span>' + esc(t('evo.first')) + '</span><strong>' + App.fmt(first, 2) + '<small> / 4</small></strong><em>' + esc(App.periodLabel(p.list[0])) + '</em></div>' +
        '<div class="report-kpi main"><span>' + esc(t('evo.latest')) + '</span><strong>' + App.fmt(last, 2) + '<small> / 4</small></strong><em>' + esc(App.periodLabel(p.list[p.list.length - 1])) + '</em></div>' +
        '<div class="report-kpi"><span>' + esc(t('evo.change')) + '</span><strong>' + (first === null || last === null ? '—' : (last - first > 0 ? '+' : '') + App.fmt(last - first, 2)) + '</strong></div>' +
      '</div>' +
      '<p class="report-lead">' + esc(t('evo.summarySentence', {
        org: App.orgName(org), first: App.fmt(first, 2), last: App.fmt(last, 2), from: App.periodLabel(p.list[0]), to: App.periodLabel(p.list[p.list.length - 1]),
        resolved: ch.resolvedWeaknesses.length, newWeak: ch.newWeaknesses.length
      })) + '</p>' +
      '<h3 class="report-h3">' + esc(t('evo.chart')) + '</h3><div id="evo-report-chart"></div>' +
      '<h3 class="report-h3">' + esc(t('evo.table')) + '</h3>' + periodTable(tl, 'report-table compact') +
      '</section>';

    html += '<section class="report-page">' + header(t('evo.compare')) +
      '<p><strong>' + esc(App.assessmentLabel(p.from)) + '</strong> → <strong>' + esc(App.assessmentLabel(p.to)) + '</strong></p>' +
      changesSection(ch, 'report-table compact') + '</section>';

    html += '<section class="report-page report-last">' + header(t('evo.followUp')) +
      '<h3 class="report-h3">' + esc(App.assessmentLabel(p.from)) + '</h3>' + followUpSection(p.from) +
      '<div class="signatures">' + ['report.preparedBy', 'report.validatedBy'].map(function (k) {
        return '<div class="signature"><span>' + esc(t(k)) + '</span><div class="sig-line"></div><small>' + esc(t('report.signature')) + '</small></div>';
      }).join('') + '</div></section>';

    html += '</div>';
    App.setView(html);
    document.getElementById('evo-report-chart').appendChild(chart(tl));
  };

  A['evo-from'] = function (el) { App.ui.evoFrom = el.value; App.render(); };
  A['evo-to'] = function (el) { App.ui.evoTo = el.value; App.render(); };
})();
