/*
 * Facilitator space: portfolio overview of every organisation in the
 * workspace (imported from the files organisations export), common
 * weaknesses, and calculation settings (pillar weights).
 */
(function () {
  'use strict';

  var App = window.App;
  var F = App.F;
  var S = App.S;
  var Plan = App.Plan;
  var Store = App.Store;
  var esc = App.esc;
  var t = App.t;
  var L = App.L;
  var A = App.actions;

  function portfolio() {
    return App.ws.orgs.map(function (org) {
      var a = App.latestAssessment(org);
      var r = App.scores(a);
      var prev = App.previousAssessment(org, a);
      return {
        org: org,
        assessment: a,
        scores: r,
        delta: prev ? S.compareScores(r, App.scores(prev)).index : null,
        plan: Plan.stats(a.plan)
      };
    });
  }

  function heatClass(score) {
    if (score === null || score === undefined) return 'heat-none';
    if (score >= 3.5) return 'heat-4';
    if (score >= 2.5) return 'heat-3';
    if (score >= 1.5) return 'heat-2';
    return 'heat-1';
  }

  function settingsCard() {
    var s = App.settings();
    var eff = S.effectiveWeights(F, s);
    var sum = F.PILLARS.reduce(function (n, p) { return n + (Number(s.weights[p.id]) || 0); }, 0);
    return '<section class="card no-print" id="settings"><h2>' + esc(t('fac.settings')) + '</h2>' +
      '<p class="muted">' + esc(t('fac.weightsExplain')) + '</p>' +
      '<fieldset class="method"><legend>' + esc(t('fac.method')) + '</legend>' +
        '<label><input type="radio" name="index-method" value="components" data-on="index-method"' + (s.indexMethod !== 'weighted' ? ' checked' : '') + '> ' + esc(t('fac.methodComponents')) + '</label>' +
        '<label><input type="radio" name="index-method" value="weighted" data-on="index-method"' + (s.indexMethod === 'weighted' ? ' checked' : '') + '> ' + esc(t('fac.methodWeighted')) + '</label>' +
      '</fieldset>' +
      '<div class="table-wrap"><table class="table weights"><thead><tr><th></th><th>' + esc(t('fac.weight')) + '</th><th>' + esc(t('fac.effective')) + '</th></tr></thead><tbody>' +
      F.PILLARS.map(function (p) {
        return '<tr><td><span class="dot" style="background:' + App.PILLAR_COLORS[p.id] + '"></span>' + esc(L(p.name)) + '</td>' +
          '<td><input type="number" min="0" max="100" step="1" data-on="weight" data-id="' + p.id + '" value="' + esc(s.weights[p.id]) + '"' +
          (s.indexMethod !== 'weighted' ? ' disabled' : '') + '> %</td>' +
          '<td>' + App.fmt(eff[p.id], 1) + ' %</td></tr>';
      }).join('') + '</tbody></table></div>' +
      (s.indexMethod === 'weighted' && sum !== 100 ? '<p class="notice small">' + esc(t('fac.sumWarn', { sum: sum })) + '</p>' : '') +
      '</section>';
  }

  App.views.facilitator = function () {
    var rows = portfolio();
    var withScores = rows.filter(function (x) { return x.scores.index !== null; });
    var complete = rows.filter(function (x) { return x.scores.complete; }).length;
    var avgIndex = S.average(withScores.map(function (x) { return x.scores.index; }));
    var actTotal = rows.reduce(function (n, x) { return n + x.plan.total; }, 0);
    var actDone = rows.reduce(function (n, x) { return n + x.plan.done; }, 0);

    var html = '<div class="page-head"><div><h1>' + esc(t('fac.title')) + '</h1><p class="muted">' + esc(t('fac.intro')) + '</p></div>' +
      '<div class="actions no-print">' +
        '<label class="btn primary">⤒ ' + esc(t('fac.import')) + '<input type="file" accept=".json,application/json" multiple data-on="import-files" hidden></label>' +
        '<button class="btn" data-click="fac-new-org">' + esc(t('fac.newOrg')) + '</button>' +
        '<button class="btn" data-click="fac-export-csv">' + esc(t('fac.exportCsv')) + '</button>' +
        '<button class="btn" data-click="fac-print">' + esc(t('print')) + '</button>' +
      '</div></div>';

    html += '<section class="summary fac-summary">' +
      kpi(t('fac.orgs'), rows.length) +
      kpi(t('fac.assessed'), complete + '<small> / ' + rows.length + '</small>') +
      kpi(t('fac.avgIndex'), App.fmt(avgIndex, 2) + '<small> / 4</small>') +
      kpi(t('fac.activities'), actDone + '<small> / ' + actTotal + '</small>') +
      '</section>';

    // Organisations table
    html += '<section class="card"><h2>' + esc(t('fac.table')) + '</h2><div class="table-wrap"><table class="table portfolio"><thead><tr>' +
      '<th>' + esc(t('profile.org')) + '</th><th>' + esc(t('fac.latest')) + '</th><th>' + esc(t('profile.progress')) + '</th>' +
      '<th>' + esc(t('profile.index')) + '</th>' +
      F.PILLARS.map(function (p) { return '<th class="center" title="' + esc(L(p.name)) + '">' + esc(L(p.shortName)) + '</th>'; }).join('') +
      '<th class="center">▼ ' + esc(t('fac.weak')) + '</th><th>' + esc(t('fac.planProgress')) + '</th><th class="no-print"></th></tr></thead><tbody>' +
      rows.map(function (x) {
        var o = x.org.organization;
        return '<tr' + (x.org.id === App.ws.activeOrgId ? ' class="current"' : '') + '>' +
          '<td><strong>' + esc(App.orgName(x.org)) + '</strong>' + (o.acronym ? ' <span class="muted">(' + esc(o.acronym) + ')</span>' : '') +
            (o.region || o.type ? '<br><span class="muted small">' + esc([o.type, o.region].filter(Boolean).join(' · ')) + '</span>' : '') + '</td>' +
          '<td>' + esc(App.assessmentLabel(x.assessment)) + '</td>' +
          '<td><div class="progress mini"><div style="width:' + Math.round(x.scores.completion * 100) + '%"></div></div><span class="small">' + x.scores.answered + '/' + x.scores.totalComponents + '</span></td>' +
          '<td class="nowrap"><strong>' + App.fmt(x.scores.index, 2) + '</strong>' +
            (x.delta !== null ? ' <span class="delta ' + (x.delta > 0 ? 'up' : x.delta < 0 ? 'down' : 'flat') + '">' + (x.delta > 0 ? '+' : '') + App.fmt(x.delta, 2) + '</span>' : '') + '</td>' +
          x.scores.pillars.map(function (p) { return '<td class="heat ' + heatClass(p.score) + '">' + App.fmt(p.score) + '</td>'; }).join('') +
          '<td class="center">' + x.scores.counts.address + '</td>' +
          '<td><div class="progress mini"><div style="width:' + Math.round(x.plan.progress * 100) + '%"></div></div><span class="small">' + x.plan.done + '/' + x.plan.total + '</span></td>' +
          '<td class="row-actions no-print">' +
            '<button class="btn small" data-click="fac-open" data-id="' + esc(x.org.id) + '" data-route="results">' + esc(t('nav.results')) + '</button> ' +
            '<button class="btn small" data-click="fac-open" data-id="' + esc(x.org.id) + '" data-route="report">' + esc(t('nav.report')) + '</button> ' +
            (rows.length > 1 ? '<button class="btn small ghost danger" data-click="delete-org" data-id="' + esc(x.org.id) + '" title="' + esc(t('delete')) + '">✕</button>' : '') +
          '</td></tr>';
      }).join('') +
      '</tbody></table></div></section>';

    // Pillar averages + common weaknesses
    var pillarAvg = F.PILLARS.map(function (p, i) {
      return { label: L(p.name), value: S.average(withScores.map(function (x) { return x.scores.pillars[i].score; })), color: App.PILLAR_COLORS[p.id] };
    });
    var weakCount = {};
    rows.forEach(function (x) {
      Object.keys(x.assessment.answers).forEach(function (cid) {
        if (S.categoryFor(x.assessment.answers[cid]) === 'address') weakCount[cid] = (weakCount[cid] || 0) + 1;
      });
    });
    var common = Object.keys(weakCount).map(function (cid) { return { entry: App.findComponent(cid), n: weakCount[cid] }; })
      .filter(function (w) { return w.entry; })
      .sort(function (a, b) { return b.n - a.n; }).slice(0, 10);

    html += '<section class="fac-grid">' +
      '<article class="card"><h2>' + esc(t('fac.pillarAvg')) + '</h2><div id="fac-pillars"></div></article>' +
      '<article class="card"><h2>' + esc(t('fac.commonWeak')) + '</h2><p class="muted small">' + esc(t('fac.commonWeakHelp')) + '</p>' +
        (common.length ? '<div id="fac-common"></div>' : '<p class="muted">' + esc(t('fac.empty')) + '</p>') + '</article>' +
      '</section>';

    html += settingsCard();

    html += '<section class="card no-print"><h2>' + esc(t('profile.share')) + '</h2><div class="actions">' +
      '<button class="btn" data-click="fac-backup">' + esc(t('fac.backup')) + '</button>' +
      '<label class="btn">' + esc(t('fac.restore')) + '<input type="file" accept=".json,application/json" data-on="fac-restore" hidden></label>' +
      '<button class="btn danger" data-click="fac-reset">' + esc(t('fac.reset')) + '</button>' +
      '</div></section>';

    App.setView(html);

    document.getElementById('fac-pillars').appendChild(App.Charts.bars(pillarAvg, F.MAX_SCORE));
    var commonSlot = document.getElementById('fac-common');
    if (commonSlot) {
      commonSlot.appendChild(App.Charts.bars(common.map(function (w) {
        return { label: L(w.entry.component.name) + ' (' + L(w.entry.pillar.shortName) + ')', value: w.n, color: '#d9534f' };
      }), Math.max(rows.length, 1), { format: function (v) { return v + ' / ' + rows.length; } }));
    }
  };

  function kpi(label, value) {
    return '<div class="kpi"><span class="kpi-label">' + esc(label) + '</span><span class="kpi-value">' + value + '</span></div>';
  }

  A['fac-open'] = function (el) {
    App.ws.activeOrgId = el.dataset.id;
    var org = App.org();
    org.activeAssessmentId = App.latestAssessment(org).id;
    App.ui.compareWith = null;
    App.persist(true);
    location.hash = '#' + el.dataset.route;
  };

  A['fac-new-org'] = function () {
    var org = Store.newOrg('');
    App.ws.orgs.push(org);
    App.ws.activeOrgId = org.id;
    App.persist(true);
    location.hash = '#profile';
  };

  A['index-method'] = function (el) {
    App.settings().indexMethod = el.value === 'weighted' ? 'weighted' : 'components';
    App.persist(true);
    App.render();
  };

  A.weight = function (el) {
    var v = Number(el.value);
    if (!(v >= 0 && v <= 100)) return;
    App.settings().weights[el.dataset.id] = v;
    App.persist(true);
    App.render();
  };

  A['fac-export-csv'] = function () {
    var header = [t('profile.name'), t('profile.acronym'), t('profile.type'), t('profile.region'), t('fac.latest'),
      t('profile.progress'), t('profile.index')].concat(F.PILLARS.map(function (p) { return L(p.name); }))
      .concat([t('cats.maintain'), t('cats.opportunity'), t('cats.address'), t('plan.activities'), t('status.done')]);
    var rows = [header];
    portfolio().forEach(function (x) {
      var o = x.org.organization;
      rows.push([App.orgName(x.org), o.acronym, o.type, o.region, App.assessmentLabel(x.assessment),
        x.scores.answered + '/' + x.scores.totalComponents, App.num(x.scores.index)]
        .concat(x.scores.pillars.map(function (p) { return App.num(p.score); }))
        .concat([x.scores.counts.maintain, x.scores.counts.opportunity, x.scores.counts.address, x.plan.total, x.plan.done]));
    });
    App.download('portfolio-' + new Date().toISOString().slice(0, 10) + '.csv', App.csv(rows), 'text/csv;charset=utf-8');
  };

  A['fac-print'] = function () { window.print(); };

  A['fac-backup'] = function () {
    App.download('barometer-workspace-' + new Date().toISOString().slice(0, 10) + '.json',
      JSON.stringify(Store.exportWorkspace(App.ws), null, 2), 'application/json');
  };

  A['fac-restore'] = function (el) {
    App.readJsonFiles(el.files, function (results) {
      var r = results[0];
      try {
        if (r.error) throw new Error('invalid');
        var ws = Store.normalizeWorkspace(r.data);
        if (!confirm(t('fac.confirmRestore'))) return;
        App.ws = ws;
        App.persist(true);
        App.render();
      } catch (e) {
        App.flash(t('fac.importError', { msg: App.errMsg(e) }));
        App.render();
      }
    });
    el.value = '';
  };

  A['fac-reset'] = function () {
    if (!confirm(t('fac.confirmReset'))) return;
    var lang = App.settings().lang;
    Store.clear();
    App.ws = Store.newWorkspace();
    App.ws.settings.lang = lang;
    App.persist(true);
    location.hash = '#home';
    App.render();
  };
})();
