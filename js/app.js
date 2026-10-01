/*
 * Application core: state, routing, header, and the Profile, Assessment,
 * Results and Help views. The Workplan, Report and Facilitator views live in
 * views-*.js and register themselves on window.App.
 *
 * Event handling is delegated: elements carry data-on="action" (inputs) or
 * data-click="action" (buttons); handlers live in App.actions.
 */
(function () {
  'use strict';

  var F = window.BarometerFramework;
  var S = window.BarometerScoring;
  var Store = window.BarometerStorage;
  var I18n = window.BarometerI18n;
  var Charts = window.BarometerCharts;

  var App = {
    F: F,
    S: S,
    Store: Store,
    I18n: I18n,
    Charts: Charts,
    Plan: window.BarometerPlan,
    Activities: window.BarometerActivities,
    Models: window.BarometerModels,
    CAT_ICONS: { maintain: '▲', opportunity: '◆', address: '▼', other: '●' },
    ws: Store.load(),
    ui: { compareWith: null, planFilter: 'all', flash: null },
    views: {},
    actions: {}
  };
  window.App = App;

  var view = document.getElementById('view');
  var saveTimer = null;

  // ------------------------------------------------------------------ helpers

  App.t = I18n.t;
  App.L = I18n.L;

  App.esc = function (value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  App.fmt = Charts.fmt;

  App.settings = function () { return App.ws.settings; };

  App.org = function () {
    return App.ws.orgs.filter(function (o) { return o.id === App.ws.activeOrgId; })[0] || App.ws.orgs[0];
  };

  App.assessment = function (org) {
    org = org || App.org();
    return org.assessments.filter(function (a) { return a.id === org.activeAssessmentId; })[0] || org.assessments[0];
  };

  /** Assessment model (Barometer, ITOCA, OPI) of an assessment. */
  App.fw = function (a) { return App.Models.get((a || App.assessment()).model); };

  /**
   * Assessments of an organisation, oldest first (period, year, then sequence).
   * With `model`, only assessments of that model (comparisons stay within one model).
   */
  App.chronological = function (org, model) {
    var list = model ? org.assessments.filter(function (a) { return a.model === model; }) : org.assessments;
    return window.BarometerEvolution.chronological(list);
  };

  /** Most recent assessment (of a given model if specified). */
  App.latestAssessment = function (org, model) {
    var list = App.chronological(org, model);
    return list[list.length - 1] || null;
  };

  /** Assessment of the same model just before `a` in time, used as default comparison. */
  App.previousAssessment = function (org, a) {
    var list = App.chronological(org, a.model);
    var i = list.indexOf(a);
    return i > 0 ? list[i - 1] : null;
  };

  App.scores = function (a) {
    var fw = App.fw(a);
    return S.computeScores(fw, a.answers, App.Models.scoringSettings(fw, App.settings()));
  };

  App.orgName = function (org) {
    var o = (org || App.org()).organization;
    return o.name || App.t('unnamedOrg');
  };

  App.sequenceLabel = function (seq) {
    var s = F.SEQUENCES.filter(function (x) { return x.value === seq; })[0];
    return s ? App.L(s.label) : App.t('seq.n', { n: seq });
  };

  /** "mars 2027" when a month is set, otherwise the year. */
  App.periodLabel = function (a) {
    if (a.period) {
      var d = new Date(Number(a.period.slice(0, 4)), Number(a.period.slice(5, 7)) - 1, 1);
      try { return d.toLocaleDateString(I18n.getLang() === 'en' ? 'en-GB' : 'fr-FR', { month: 'long', year: 'numeric' }); }
      catch (e) { return a.period; }
    }
    return String(a.year);
  };

  /** Short period label for chart axes. */
  App.periodShort = function (a) {
    if (a.period) {
      var d = new Date(Number(a.period.slice(0, 4)), Number(a.period.slice(5, 7)) - 1, 1);
      try { return d.toLocaleDateString(I18n.getLang() === 'en' ? 'en-GB' : 'fr-FR', { month: 'short', year: 'numeric' }); }
      catch (e) { return a.period; }
    }
    return String(a.year);
  };

  App.assessmentLabel = function (a) {
    return App.L(App.fw(a).shortName) + ' · ' + App.sequenceLabel(a.sequence) + ' — ' + App.periodLabel(a);
  };

  App.levelBadge = function (score) {
    return score ? '<span class="level-badge level-' + score + '">' + score + '</span>' : '<span class="tag">' + App.esc(App.t('notAnswered')) + '</span>';
  };

  App.catTag = function (cat) {
    if (!cat) return '';
    return '<span class="cat-tag cat-' + cat + '">' + App.CAT_ICONS[cat] + ' ' + App.esc(App.t('cat.' + cat)) + '</span>';
  };

  App.findComponent = function (id) { return App.Models.findComponent(id); };

  App.pillarById = function (id, fw) {
    fw = fw || App.fw();
    return fw.PILLARS.filter(function (p) { return p.id === id; })[0] || fw.PILLARS[0];
  };

  /** Title of a component: its name, prefixed by the aspect in the barometer when they differ. */
  App.componentTitle = function (fw, aspect, c) {
    if (fw.flat || App.L(c.name) === App.L(aspect.name)) return App.L(c.name);
    return App.L(aspect.name) + ' — ' + App.L(c.name);
  };

  /** "Pillar · aspect" context line (just the pillar for flat models). */
  App.componentContext = function (fw, pillar, aspect) {
    return fw.flat ? App.L(pillar.shortName) : App.L(pillar.shortName) + ' · ' + App.L(aspect.name);
  };

  App.dateStr = function (d) {
    try {
      return (d || new Date()).toLocaleDateString(I18n.getLang() === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return (d || new Date()).toISOString().slice(0, 10);
    }
  };

  App.touch = function (org) { (org || App.org()).updatedAt = new Date().toISOString(); };

  App.persist = function (immediate) {
    clearTimeout(saveTimer);
    var run = function () {
      var ok = Store.save(App.ws);
      var badge = document.getElementById('save-status');
      if (badge) {
        badge.textContent = ok ? App.t('saved') : App.t('saveFailed');
        badge.className = 'save-status ' + (ok ? 'ok' : 'err');
      }
    };
    if (immediate) run(); else saveTimer = setTimeout(run, 400);
  };

  App.download = function (filename, content, type) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };

  App.slug = function (s) {
    return (s || 'organisation').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'organisation';
  };

  App.csv = function (rows) {
    return '﻿' + rows.map(function (r) {
      return r.map(function (cell) {
        var s = cell === null || cell === undefined ? '' : String(cell);
        return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(';');
    }).join('\r\n');
  };

  App.num = function (v, d) { return v === null || v === undefined ? '' : App.fmt(v, d === undefined ? 2 : d); };

  App.readJsonFiles = function (files, done) {
    var list = Array.prototype.slice.call(files || []);
    var results = [];
    var pending = list.length;
    if (!pending) return;
    list.forEach(function (file, i) {
      var reader = new FileReader();
      reader.onload = function () {
        try { results[i] = { file: file, data: JSON.parse(reader.result) }; }
        catch (e) { results[i] = { file: file, error: e }; }
        if (--pending === 0) done(results);
      };
      reader.readAsText(file);
    });
  };

  App.errMsg = function (e) {
    var key = 'err.' + (e && e.message);
    var msg = App.t(key);
    return msg === key ? App.t('err.invalid') : msg;
  };

  App.flash = function (msg) { App.ui.flash = msg; };

  // ------------------------------------------------------------------ header

  App.renderHeader = function () {
    var lang = I18n.getLang();
    document.documentElement.lang = lang;
    document.title = App.t('app.title');
    document.querySelectorAll('[data-i18n]').forEach(function (node) {
      node.textContent = App.t(node.getAttribute('data-i18n'));
    });

    var orgSel = document.getElementById('org-select');
    orgSel.innerHTML = App.ws.orgs.map(function (o) {
      return '<option value="' + App.esc(o.id) + '"' + (o.id === App.ws.activeOrgId ? ' selected' : '') + '>' + App.esc(App.orgName(o)) + '</option>';
    }).join('');

    var org = App.org();
    var aSel = document.getElementById('assessment-select');
    aSel.innerHTML = org.assessments.map(function (a) {
      return '<option value="' + App.esc(a.id) + '"' + (a.id === org.activeAssessmentId ? ' selected' : '') + '>' + App.esc(App.assessmentLabel(a)) + '</option>';
    }).join('');

    document.querySelectorAll('.lang-switch button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
      b.setAttribute('aria-pressed', b.getAttribute('data-lang') === lang ? 'true' : 'false');
    });

    var route = App.route();
    document.querySelectorAll('.main-nav a').forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('data-route') === route.name);
    });
    document.body.classList.toggle('mode-facilitator', route.name === 'facilitator');
  };

  // ------------------------------------------------------------------ routing

  App.route = function () {
    var hash = (location.hash || '#home').slice(1).split('/');
    return { name: hash[0] || 'home', param: hash[1] || null };
  };

  App.render = function () {
    I18n.setLang(App.settings().lang);
    var route = App.route();
    App.renderHeader();
    var fn = App.views[route.name] || App.views.home;
    fn(route.param);
    if (App.ui.flash) {
      var note = document.createElement('div');
      note.className = 'flash';
      note.setAttribute('role', 'status');
      note.textContent = App.ui.flash;
      view.prepend(note);
      App.ui.flash = null;
    }
  };

  App.setView = function (html) { view.innerHTML = html; };
  App.viewEl = view;

  App.pillarTabs = function (routeName, activeId, scores, fw) {
    fw = fw || App.fw();
    return '<div class="pillar-tabs" role="tablist">' + fw.PILLARS.map(function (p, i) {
      var ps = scores.pillars[i];
      return '<a role="tab" href="#' + routeName + '/' + p.id + '" class="pillar-tab' + (p.id === activeId ? ' active' : '') +
        '" style="--pillar:' + p.color + '"' + (p.id === activeId ? ' aria-selected="true"' : '') + '>' +
        '<span>' + App.esc(App.L(p.shortName)) + '</span>' +
        '<small data-pillar-progress="' + p.id + '">' + ps.answered + '/' + ps.total + '</small></a>';
    }).join('') + '</div>';
  };

  // ------------------------------------------------------------------ home

  App.views.home = function () {
    var a = App.assessment();
    var r = App.scores(a);
    var steps = [
      { n: 0, route: '#profile', title: 'nav.profile', text: 'step.profile' },
      { n: 1, route: '#assessment/gov', title: 'nav.assessment', text: 'step.assessment' },
      { n: 2, route: '#results', title: 'nav.results', text: 'step.results' },
      { n: 3, route: '#plan', title: 'nav.plan', text: 'step.plan' },
      { n: 4, route: '#report', title: 'nav.report', text: 'step.report' }
    ];
    App.setView(
      '<section class="hero">' +
        '<h1>' + App.esc(App.t('home.title')) + '</h1>' +
        '<p>' + App.esc(App.t('home.intro')) + '</p>' +
        '<div class="hero-status">' +
          '<span><strong>' + App.esc(App.orgName()) + '</strong> — ' + App.esc(App.assessmentLabel(a)) + '</span>' +
          '<span>' + r.answered + ' / ' + r.totalComponents + ' ' + App.esc(App.t('home.components')) + '</span>' +
          (r.index !== null ? '<span>' + App.esc(App.t('home.index')) + ' : <strong>' + App.fmt(r.index, 2) + ' / 4</strong></span>' : '') +
        '</div>' +
      '</section>' +
      '<ol class="process">' + steps.map(function (s) {
        return '<li><a href="' + s.route + '" class="process-step">' +
          '<span class="step-n">' + s.n + '</span>' +
          '<span class="step-body"><strong>' + App.esc(App.t(s.title)) + '</strong><span>' + App.esc(App.t(s.text)) + '</span></span></a></li>';
      }).join('') + '</ol>' +
      '<a href="#facilitator" class="process-step facilitator-link"><span class="step-n">★</span><span class="step-body"><strong>' +
        App.esc(App.t('nav.facilitator')) + '</strong><span>' + App.esc(App.t('step.facilitator')) + '</span></span></a>' +
      '<section class="card demo-card"><p>' + App.esc(App.t('demo.help')) + '</p>' +
        '<button class="btn" data-click="load-demo">▶ ' + App.esc(App.t('demo.load')) + '</button></section>' +
      '<section class="card"><h2>' + App.esc(App.t('home.levels')) + '</h2><ol class="levels-legend">' +
      F.LEVELS.map(function (l) {
        return '<li><span class="level-badge level-' + l.value + '">' + l.value + '</span>' + App.esc(App.L(l.label)) + '</li>';
      }).join('') + '</ol></section>'
    );
  };

  // ------------------------------------------------------------------ profile

  /** Age of the organisation computed from its year founded. */
  App.orgAge = function (o) {
    var y = Number(o.founded);
    return y ? new Date().getFullYear() - y : null;
  };

  App.orgAgeText = function (o) {
    var age = App.orgAge(o);
    return age === null ? '' : App.t('profile.age', { n: age });
  };

  /** Evidence summary for reports: description and attached PDF names. */
  App.evidenceText = function (a, cid) {
    var files = (a.evidenceFiles[cid] || []).map(function (f) { return f.name; });
    return [a.evidence[cid], files.length ? files.join(', ') : ''].filter(Boolean).join(' — ');
  };

  /** "Name, Title" for the focal point. */
  App.focalText = function (o) { return [o.focalPoint, o.focalTitle].filter(Boolean).join(', '); };

  function optionLabel(list, value, other) {
    if (!value) return '';
    if (value === 'other') return other || App.L(list[list.length - 1].label);
    for (var i = 0; i < list.length; i++) if (list[i].value === value) return App.L(list[i].label);
    return value;
  }

  /** Organisation type and domain in the current language ("Other" shows the detail typed). */
  App.orgTypeLabel = function (o) { return optionLabel(Store.ORG_TYPES, o.type, o.typeOther); };
  App.domainLabel = function (o) { return optionLabel(Store.DOMAINS, o.domain, o.domainOther); };

  /** "Region, Country". */
  App.locationText = function (o) { return [o.region, o.country].filter(Boolean).join(', '); };

  var COUNTRY_CODES = ('AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ ' +
    'DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KW KG LA LV LB LS LR LY LI LT LU ' +
    'MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG KP MK NO OM PK PW PS PA PG PY PE PH PL PT QA RE RO RU RW KN LC VC WS SM ST SA SN RS SC ' +
    'SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE YT ZM ZW').split(' ');

  function countryDatalist() {
    var names = [];
    try {
      var dn = new Intl.DisplayNames([I18n.getLang()], { type: 'region' });
      names = COUNTRY_CODES.map(function (c) { return dn.of(c); });
    } catch (e) { names = []; }
    names.sort(function (x, y) { return x.localeCompare(y); });
    return '<datalist id="country-list">' + names.map(function (n) { return '<option value="' + App.esc(n) + '">'; }).join('') + '</datalist>';
  }

  App.views.profile = function () {
    var org = App.org();
    var o = org.organization;
    var a = App.assessment();
    function field(id, type, extra) {
      return '<label class="field"><span>' + App.esc(App.t('profile.' + id)) + '</span>' +
        '<input type="' + (type || 'text') + '" data-on="org-field" data-field="' + id + '" value="' + App.esc(o[id]) + '"' + (extra || '') + '></label>';
    }
    function choice(id, list) {
      var opts = '<option value="">—</option>' + list.map(function (x) {
        return '<option value="' + x.value + '"' + (x.value === o[id] ? ' selected' : '') + '>' + App.esc(App.L(x.label)) + '</option>';
      }).join('');
      return '<label class="field"><span>' + App.esc(App.t('profile.' + id)) + '</span>' +
        '<select data-on="org-field" data-field="' + id + '">' + opts + '</select></label>' +
        (o[id] === 'other' ? field(id + 'Other') : '');
    }
    var thisYear = new Date().getFullYear();
    var years = '<option value="">—</option>';
    for (var y = thisYear; y >= 1900; y--) years += '<option value="' + y + '"' + (String(y) === String(o.founded) ? ' selected' : '') + '>' + y + '</option>';
    var fw = App.fw(a);
    App.setView(
      '<h1>' + App.esc(App.t('profile.title')) + '</h1>' +
      '<section class="card"><h2>' + App.esc(App.t('profile.org')) + '</h2><div class="form-grid">' +
        field('name') + field('acronym') + choice('type', Store.ORG_TYPES) + choice('domain', Store.DOMAINS) +
        '<label class="field"><span>' + App.esc(App.t('profile.founded')) + '</span><select data-on="org-field" data-field="founded">' + years + '</select>' +
          '<small class="muted" id="org-age">' + App.esc(App.orgAgeText(o)) + '</small></label>' +
      '</div><h3>' + App.esc(App.t('profile.location')) + '</h3><div class="form-grid">' +
        field('country', 'text', ' list="country-list" autocomplete="country-name"') + field('region') + field('address') +
      '</div>' + countryDatalist() +
      '<h3>' + App.esc(App.t('profile.contact')) + '</h3><div class="form-grid">' +
        field('focalPoint') + field('focalTitle') + field('phone', 'tel') + field('email', 'email') +
      '</div></section>' +
      '<section class="card"><h2>' + App.esc(App.t('profile.current')) + '</h2><div class="form-grid">' +
        '<label class="field"><span>' + App.esc(App.t('profile.sequence')) + '</span><select data-on="assess-sequence">' +
          seqOptions(org, a) +
        '</select></label>' +
        '<label class="field"><span>' + App.esc(App.t('profile.year')) + '</span>' +
          '<input type="number" min="2000" max="2100" data-on="assess-year" value="' + App.esc(a.year) + '"></label>' +
        '<label class="field"><span>' + App.esc(App.t('profile.month')) + '</span><select data-on="assess-month">' +
          monthOptions(a) + '</select></label>' +
      '</div></section>' +
      '<nav class="pager profile-next"><span></span><a class="btn primary" href="#assessment/' + fw.PILLARS[0].id + '">' +
        App.esc(App.t('profile.next', { model: App.L(fw.shortName) })) + ' →</a></nav>' +
      '<section class="card"><h2>' + App.esc(App.t('profile.history')) + '</h2>' +
        '<p class="muted">' + App.esc(App.t('profile.historyHelp')) + '</p>' +
        '<div class="table-wrap"><table class="table"><thead><tr><th>' + App.esc(App.t('header.assessment')) + '</th><th>' + App.esc(App.t('profile.progress')) +
        '</th><th>' + App.esc(App.t('profile.index')) + '</th><th></th></tr></thead><tbody>' +
        App.chronological(org).map(function (x) {
          var r = App.scores(x);
          return '<tr' + (x.id === a.id ? ' class="current"' : '') + '><td>' + App.esc(App.assessmentLabel(x)) + '</td>' +
            '<td>' + r.answered + ' / ' + r.totalComponents + '</td>' +
            '<td>' + App.fmt(r.index, 2) + '</td>' +
            '<td class="row-actions">' +
              (x.id === a.id ? '<span class="tag">' + App.esc(App.t('active')) + '</span>' : '<button class="btn small" data-click="activate-assessment" data-id="' + App.esc(x.id) + '">' + App.esc(App.t('open')) + '</button>') +
              (org.assessments.length > 1 ? ' <button class="btn small danger" data-click="delete-assessment" data-id="' + App.esc(x.id) + '">' + App.esc(App.t('delete')) + '</button>' : '') +
            '</td></tr>';
        }).join('') +
        '</tbody></table></div>' +
        '<div class="actions"><button class="btn primary" data-click="new-assessment">' + App.esc(App.t('header.newAssessment')) + '</button></div>' +
      '</section>' +
      '<section class="card"><h2>' + App.esc(App.t('profile.share')) + '</h2>' +
        '<p class="muted">' + App.esc(App.t('profile.shareHelp')) + '</p>' +
        '<div class="actions">' +
          '<button class="btn primary" data-click="export-org">' + App.esc(App.t('profile.export')) + '</button>' +
          '<label class="btn">' + App.esc(App.t('profile.import')) + '<input type="file" accept=".json,application/json" multiple data-on="import-files" hidden></label>' +
          (App.ws.orgs.length > 1 ? '<button class="btn danger" data-click="delete-org" data-id="' + App.esc(org.id) + '">' + App.esc(App.t('profile.deleteOrg')) + '</button>' : '') +
        '</div>' +
      '</section>'
    );
  };

  function seqOptions(org, a) {
    var maxSeq = org.assessments.reduce(function (m, x) { return Math.max(m, x.sequence); }, 0);
    var out = '';
    for (var s = 1; s <= Math.max(maxSeq + 1, 4); s++) {
      out += '<option value="' + s + '"' + (s === a.sequence ? ' selected' : '') + '>' + App.esc(App.sequenceLabel(s)) + '</option>';
    }
    return out;
  }

  function monthOptions(a) {
    var current = a.period ? Number(a.period.slice(5, 7)) : 0;
    var out = '<option value="">—</option>';
    for (var m = 1; m <= 12; m++) {
      var name;
      try { name = new Date(2000, m - 1, 1).toLocaleDateString(I18n.getLang() === 'en' ? 'en-GB' : 'fr-FR', { month: 'long' }); }
      catch (e) { name = String(m); }
      out += '<option value="' + m + '"' + (m === current ? ' selected' : '') + '>' + App.esc(name) + '</option>';
    }
    return out;
  }

  // ------------------------------------------------------------------ assessment

  App.views.assessment = function (pillarId) {
    var a = App.assessment();
    var F = App.fw(a);
    var pillar = App.pillarById(pillarId, F);
    var r = App.scores(a);
    var idx = F.PILLARS.indexOf(pillar);
    var prev = F.PILLARS[idx - 1];
    var next = F.PILLARS[idx + 1];

    var html = '<h1>' + App.esc(App.t('diag.title')) + ' — ' + App.esc(App.L(pillar.name)) + '</h1>' +
      App.modelBanner(F) +
      App.pillarTabs('assessment', pillar.id, r, F) +
      '<p class="muted">' + App.esc(App.t('diag.help')) + '</p>' +
      '<div class="level-header" aria-hidden="true">' +
        F.LEVELS.map(function (l) { return '<span><b>' + l.value + '</b> ' + App.esc(App.L(l.label)) + '</span>'; }).join('') +
      '</div>';

    pillar.aspects.forEach(function (aspect) {
      if (!F.flat) html += '<section class="aspect card"><h2>' + App.esc(App.L(aspect.name)) + '</h2>';
      aspect.components.forEach(function (c, ci) {
        var selected = a.answers[c.id];
        var title = App.L(c.name) === App.L(aspect.name) ? App.L(aspect.name) : App.L(c.name);
        if (F.flat) html += '<section class="aspect card">';
        html += '<fieldset class="component" data-component="' + App.esc(c.id) + '">' +
          '<legend>' + (F.flat ? '<span class="item-n">' + (ci + 1) + '</span>' : '') + App.esc(title) + '<span class="component-score">' + componentScoreText(selected) + '</span></legend>' +
          (c.statement ? '<p class="statement">' + App.esc(App.L(c.statement)) + '</p>' : '') +
          '<div class="levels">' +
          c.levels.map(function (text, i) {
            var v = i + 1;
            return '<label class="level-option level-' + v + '">' +
              '<input type="radio" name="' + App.esc(c.id) + '" value="' + v + '" data-on="answer"' + (selected === v ? ' checked' : '') + '>' +
              '<span class="level-n">' + v + '</span><span class="level-text">' + App.esc(App.L(text)) + '</span></label>';
          }).join('') +
          '</div>' +
          evidenceBlock(F, a, c) +
          '<details class="comment"' + (a.comments[c.id] ? ' open' : '') + '><summary>' + App.esc(App.t('diag.comment')) + '</summary>' +
          '<textarea data-on="comment" data-id="' + App.esc(c.id) + '" rows="2" placeholder="' + App.esc(App.t('diag.commentPh')) + '">' + App.esc(a.comments[c.id] || '') + '</textarea></details>' +
          '</fieldset>';
        if (F.flat) html += '</section>';
      });
      if (!F.flat) html += '</section>';
    });

    html += '<nav class="pager">' +
      (prev ? '<a class="btn" href="#assessment/' + prev.id + '">← ' + App.esc(App.L(prev.shortName)) + '</a>' : '<span></span>') +
      (next ? '<a class="btn primary" href="#assessment/' + next.id + '">' + App.esc(App.L(next.shortName)) + ' →</a>'
            : '<a class="btn primary" href="#results">' + App.esc(App.t('diag.next')) + ' →</a>') +
      '</nav>';
    App.setView(html);
  };

  /** Evidence (mandatory for OPI, optional otherwise) and facilitator verification. */
  function evidenceFilesHtml(a, cid) {
    var files = a.evidenceFiles[cid] || [];
    return '<ul class="evidence-files" data-files="' + App.esc(cid) + '">' + files.map(function (f) {
      return '<li><span class="pdf-icon">PDF</span><button type="button" class="link" data-click="evidence-open" data-file="' + App.esc(f.id) + '">' + App.esc(f.name) + '</button>' +
        '<span class="muted small">' + App.esc(window.BarometerFiles.formatSize(f.size)) + '</span>' +
        '<button type="button" class="btn small ghost danger" data-click="evidence-remove" data-id="' + App.esc(cid) + '" data-file="' + App.esc(f.id) + '" title="' + App.esc(App.t('delete')) + '">✕</button></li>';
    }).join('') + '</ul>';
  }

  function hasEvidence(a, cid) { return !!(a.evidence[cid] || (a.evidenceFiles[cid] || []).length); }

  /** Evidence: uploaded PDF files plus a short description; mandatory for OPI, optional otherwise. */
  function evidenceBlock(F, a, c) {
    var required = F.evidence === 'required';
    var val = a.evidence[c.id] || '';
    var missing = required && a.answers[c.id] && !hasEvidence(a, c.id);
    var inner = evidenceFilesHtml(a, c.id) +
      '<label class="btn small upload-btn">⤒ ' + App.esc(App.t('evidence.upload')) +
        '<input type="file" accept=".pdf,application/pdf" multiple hidden data-on="evidence-upload" data-id="' + App.esc(c.id) + '"></label>' +
      '<span class="muted small"> ' + App.esc(App.t('evidence.uploadHelp')) + '</span>' +
      '<textarea data-on="evidence" data-id="' + App.esc(c.id) + '" rows="2" placeholder="' + App.esc(App.t('evidence.ph')) + '">' + App.esc(val) + '</textarea>' +
      '<label class="verified"><input type="checkbox" data-on="verified" data-id="' + App.esc(c.id) + '"' + (a.verified[c.id] ? ' checked' : '') + '> ' + App.esc(App.t('evidence.verified')) + '</label>';
    if (required) {
      return '<div class="evidence required' + (missing ? ' missing' : '') + '" data-evidence="' + App.esc(c.id) + '"><span class="evidence-label">' + App.esc(App.t('evidence.labelRequired')) + '</span>' + inner + '</div>';
    }
    var count = (a.evidenceFiles[c.id] || []).length;
    return '<details class="evidence" data-evidence="' + App.esc(c.id) + '"' + (hasEvidence(a, c.id) || a.verified[c.id] ? ' open' : '') + '><summary>' + App.esc(App.t('evidence.label')) +
      (count ? ' (' + count + ' PDF)' : '') + '</summary>' + inner + '</details>';
  }

  function refreshEvidence(cid) {
    var a = App.assessment();
    var box = view.querySelector('[data-evidence="' + cid + '"]');
    if (!box) return;
    var list = box.querySelector('[data-files="' + cid + '"]');
    if (list) list.outerHTML = evidenceFilesHtml(a, cid);
    if (box.classList.contains('required')) box.classList.toggle('missing', !!a.answers[cid] && !hasEvidence(a, cid));
  }

  /** Name and description of the model, plus the OPI relevance warning. */
  App.modelBanner = function (F) {
    var html = '<div class="model-banner kind-' + F.kind + '"><strong>' + App.esc(App.L(F.name)) + '</strong> — ' + App.esc(App.L(F.description)) + '</div>';
    if (F.minYears) {
      var age = App.orgAge(App.org().organization);
      html += '<div class="notice">' + App.esc(App.t('opi.notice')) +
        (age !== null && age < F.minYears ? ' <strong>' + App.esc(App.t('opi.tooYoung', { years: age })) + '</strong>' : '') +
        (age === null ? ' ' + App.esc(App.t('opi.noFounded')) : '') + '</div>';
    }
    return html;
  };

  function componentScoreText(selected) {
    if (!selected) return App.esc(App.t('notAnswered'));
    return App.esc(App.t('score')) + ' : ' + selected + ' / 4 · ' + App.catTag(S.categoryFor(selected));
  }

  // ------------------------------------------------------------------ results

  App.views.results = function () {
    var org = App.org();
    var a = App.assessment();
    var r = App.scores(a);
    var others = org.assessments.filter(function (x) { return x.id !== a.id && x.model === a.model; });
    if (App.ui.compareWith === null) {
      var prev = App.previousAssessment(org, a);
      App.ui.compareWith = prev ? prev.id : '';
    }
    if (App.ui.compareWith && !others.some(function (x) { return x.id === App.ui.compareWith; })) App.ui.compareWith = '';
    var baseline = others.filter(function (x) { return x.id === App.ui.compareWith; })[0];
    var cmp = baseline ? S.compareScores(r, App.scores(baseline)) : null;
    var F = App.fw(a);
    var stage = S.stageFor(F, r.index);
    var groups = S.classify(F, a.answers);

    var html = '<div class="page-head"><div><h1>' + App.esc(App.t('results.title')) + '</h1>' +
      '<p class="muted">' + App.esc(App.orgName()) + ' — ' + App.esc(App.assessmentLabel(a)) + '</p></div>' +
      '<div class="actions no-print">' +
        (others.length ? '<label class="inline-field">' + App.esc(App.t('results.compare')) + ' <select data-on="compare"><option value="">—</option>' +
          others.map(function (x) {
            return '<option value="' + App.esc(x.id) + '"' + (x.id === App.ui.compareWith ? ' selected' : '') + '>' + App.esc(App.assessmentLabel(x)) + '</option>';
          }).join('') + '</select></label>' : '') +
        '<button class="btn" data-click="export-results">' + App.esc(App.t('exportCsv')) + '</button>' +
        '<a class="btn primary" href="#report">' + App.esc(App.t('results.toReport')) + '</a>' +
      '</div></div>';

    if (!r.complete) {
      html += '<div class="notice">' + App.esc(App.t('results.incomplete', { n: r.answered, total: r.totalComponents })) +
        ' <a href="#assessment/' + firstIncompletePillar(r) + '">' + App.esc(App.t('results.complete')) + '</a></div>';
    }

    html += '<section class="summary">' +
      '<div class="kpi"><span class="kpi-label">' + App.esc(App.t('results.index')) + '</span><span class="kpi-value">' + App.fmt(r.index, 2) + '<small> / 4</small></span>' +
        (cmp && cmp.index !== null ? deltaTag(cmp.index) : '') +
        (stage ? '<span class="kpi-sub">' + App.esc(App.t('results.stage')) + ' : ' + App.esc(App.L(stage.label)) + '</span>' : '') +
        '<span class="kpi-sub small">' + App.esc(App.t(F.indexMethod === 'pillars' ? 'results.method.pillars' : 'results.method.' + r.indexMethod)) + '</span></div>' +
      '<div class="kpi"><span class="kpi-label">' + App.esc(App.t('results.total')) + '</span><span class="kpi-value">' + r.total + '<small> / ' + r.maxTotal + '</small></span>' +
        (cmp && cmp.total !== null ? deltaTag(cmp.total, 0) : '') +
        '<span class="kpi-sub">' + (r.total ? App.fmt((r.total / r.maxTotal) * 100, 0) + ' ' + App.esc(App.t('results.ofMax')) : '—') + '</span></div>' +
      '<div class="kpi kpi-wide"><span class="kpi-label">' + App.esc(App.t('results.pillars')) + '</span><div id="pillar-overview"></div></div>' +
      '</section>';

    html += '<section class="swot-grid">' + ['maintain', 'opportunity', 'address'].map(function (cat) {
      var items = groups[cat];
      return '<article class="card swot cat-' + cat + '"><header><h2>' + App.CAT_ICONS[cat] + ' ' + App.esc(App.t('cats.' + cat)) +
        '</h2><span class="swot-count">' + items.length + '</span></header>' +
        '<p class="muted small">' + App.esc(App.t('catHelp.' + cat)) + '</p>' +
        (items.length ? '<ul class="swot-list">' + items.map(function (it) {
          return '<li>' + App.levelBadge(it.score) + '<span><strong>' + App.esc(App.L(it.component.name)) + '</strong><small>' +
            App.esc(App.componentContext(F, it.pillar, it.aspect)) + '</small></span></li>';
        }).join('') + '</ul>' : '<p class="muted">' + App.esc(App.t('results.noItems')) + '</p>') +
        '</article>';
    }).join('') + '</section>';

    html += '<section class="pillar-grid">' + F.PILLARS.map(function (p) {
      return '<article class="pillar-card card" style="--pillar:' + p.color + '">' +
        '<h2>' + App.esc(App.L(p.name)) + '</h2>' +
        '<div class="pillar-body"><div class="donut-slot" data-donut="' + p.id + '"></div><div class="bars-slot" data-bars="' + p.id + '"></div></div>' +
        '<p class="muted small">' + App.esc(App.t('results.weightNote')) + '</p></article>';
    }).join('') + '</section>' +
    '<div class="actions no-print"><a class="btn primary" href="#plan">' + App.esc(App.t('results.toPlan')) + ' →</a></div>';

    App.setView(html);

    document.getElementById('pillar-overview').appendChild(Charts.bars(r.pillars.map(function (p, i) {
      return { label: App.L(p.shortName), value: p.score, delta: cmp ? cmp.pillars[i].delta : undefined, color: p.color };
    }), F.MAX_SCORE));

    r.pillars.forEach(function (p, i) {
      var color = p.color;
      view.querySelector('[data-donut="' + p.id + '"]').appendChild(Charts.donut(p.score, F.MAX_SCORE, { color: color, label: App.L(p.name) }));
      var rows = F.flat
        ? p.aspects[0].components.map(function (c) {
          var b = baseline ? baseline.answers[c.id] : undefined;
          return { label: App.L(c.name), value: c.score, delta: cmp && c.score && b ? c.score - b : undefined };
        })
        : p.aspects.map(function (asp, j) {
          return { label: App.L(asp.name), value: asp.score, delta: cmp ? cmp.pillars[i].aspects[j].delta : undefined };
        });
      view.querySelector('[data-bars="' + p.id + '"]').appendChild(Charts.bars(rows, F.MAX_SCORE, { color: color }));
    });
  };

  function deltaTag(value, digits) {
    var cls = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
    return '<span class="delta ' + cls + '">' + (value > 0 ? '+' : '') + App.fmt(value, digits === undefined ? 2 : digits) + ' ' + App.esc(App.t('results.vsRef')) + '</span>';
  }
  App.deltaTag = deltaTag;

  function firstIncompletePillar(r) {
    var p = r.pillars.filter(function (x) { return x.answered < x.total; })[0];
    return p ? p.id : r.pillars[0].id;
  }

  // ------------------------------------------------------------------ help

  App.views.help = function () {
    var F = App.Models.get('barometer');
    var w = S.effectiveWeights(F, { indexMethod: 'components' });
    var weights = F.PILLARS.map(function (p) {
      var n = p.aspects.reduce(function (s, a) { return s + a.components.length; }, 0);
      return '<li>' + App.esc(App.L(p.name)) + ' : ' + n + ' / 33 → ' + App.fmt(w[p.id], 1) + ' %</li>';
    }).join('');
    var fr = I18n.getLang() === 'fr';
    App.setView('<h1>' + App.esc(App.t('help.title')) + '</h1>' + (fr ? helpFr(weights) : helpEn(weights)));
  };

  function helpFr(weights) {
    return '<section class="card"><h2>Modèles d’évaluation</h2><ul>' +
      '<li><strong>Baromètre de gouvernance</strong> : 4 piliers, 33 composantes (outil Excel d’origine). Indice global = moyenne des 33 composantes, ou moyenne pondérée des piliers (Espace facilitateur).</li>' +
      '<li><strong>ITOCA</strong> (évaluation intégrée des capacités techniques et organisationnelles, dérivée de l’OCA/OCAT de USAID/Pact) : 10 domaines, 94 indicateurs. Indice global = moyenne des domaines.</li>' +
      '<li><strong>OPI</strong> (indice de performance organisationnelle) : 5 domaines, 10 sous-domaines. Mesure les résultats déjà obtenus ; chaque niveau doit être justifié par des preuves vérifiées. Réservé aux organisations ayant au moins 2 ans d’activités.</li></ul>' +
      '<p>Le bouton « Nouveau diagnostic » permet de choisir le modèle. Les comparaisons dans le temps se font entre diagnostics du même modèle. L’ITOCA mesure les capacités, l’OPI la performance : les deux se complètent.</p></section>' +
      '<section class="card"><h2>1. Déroulement</h2><ol>' +
      '<li><strong>Fiche</strong> : identité de l’organisation, séquence et année du diagnostic. À remplir en premier.</li>' +
      '<li><strong>Diagnostic</strong> : pour chacune des 33 composantes, cliquez sur la description qui correspond le mieux à la situation actuelle (stades 1 à 4).</li>' +
      '<li><strong>Résultats</strong> : indice global, scores par pilier et par aspect, forces, opportunités et faiblesses.</li>' +
      '<li><strong>Plan d’action pour le changement (CAP)</strong> : pour chaque écart identifié, actions prioritaires pré-remplies (modifiables), rang, moyen de vérification, responsable, échéance, commentaires et suivi, avec un chronogramme.</li>' +
      '<li><strong>Rapport</strong> : rapport individuel de l’organisation, à exporter en PDF.</li></ol></section>' +
      '<section class="card"><h2>2. Forces, opportunités et faiblesses</h2><ul>' +
      '<li><strong>▲ Force à maintenir</strong> : composante notée 4.</li>' +
      '<li><strong>◆ Opportunité à saisir</strong> : composante notée 3, à un pas du niveau maximal.</li>' +
      '<li><strong>▼ Faiblesse à corriger</strong> : composante notée 1 ou 2.</li></ul></section>' +
      '<section class="card"><h2>3. Méthode de calcul</h2><ul>' +
      '<li>Composante : note du niveau choisi (1 à 4).</li><li>Aspect : moyenne de ses composantes.</li>' +
      '<li>Pilier : moyenne de ses aspects.</li><li>Placement total : somme des 33 composantes (maximum 132).</li>' +
      '<li>Indice moyen de développement : moyenne des 33 composantes (méthode Excel, par défaut).</li></ul>' +
      '<h3>Le poids des piliers</h3>' +
      '<p>Dans le fichier Excel, aucun poids n’est saisi : l’indice global est la simple moyenne des 33 composantes. Mais comme les piliers n’ont pas le même nombre de composantes, ils ne pèsent pas autant dans l’indice :</p><ul>' + weights + '</ul>' +
      '<p>La gestion des ressources et l’évaluation compte donc presque deux fois plus que la gouvernance. Si vous souhaitez que chaque pilier compte autant (25 % chacun) ou fixer vos propres poids, choisissez « Moyenne pondérée des 4 piliers » dans l’Espace facilitateur → Paramètres de calcul. Les scores des composantes, aspects et piliers ne changent pas : seul l’indice global change.</p></section>' +
      '<section class="card"><h2>4. Plan d’action pour le changement (CAP)</h2><ol>' +
      '<li>Le plan est pré-rempli : Baromètre — 2 actions par faiblesse, 1 par opportunité, 1 action de maintien par force ; ITOCA et OPI — 1 action ciblée par écart (faiblesse ou opportunité). L’écart identifié reprend la situation actuelle et peut être reformulé.</li>' +
      '<li>Modifiez le texte, le responsable, la période (mois de début et de fin), la priorité et le statut. Les activités modifiées sont conservées lors des mises à jour.</li>' +
      '<li>Ajoutez vos propres activités sous chaque composante, ou des activités générales.</li>' +
      '<li>Formulez des indicateurs clairs, avec valeur de base, valeur cible et source de vérification.</li>' +
      '<li>Si le diagnostic change, cliquez sur « Mettre à jour les activités standard ».</li></ol></section>' +
      '<section class="card"><h2>Diagnostic régulier et évolution</h2><p>Refaites le diagnostic à intervalle régulier (par exemple tous les 6 ou 12 mois) avec « Nouveau diagnostic » : vous pouvez partir des réponses précédentes puis les ajuster. La page <strong>Évolution</strong> montre la courbe de l’indice et des piliers, le tableau comparatif de toutes les périodes, les composantes en progrès ou en recul entre deux périodes au choix, et le taux de réalisation du plan de travail. Le <strong>Rapport d’évolution</strong> (page Rapport) reprend ces éléments en PDF.</p></section>' +
      '<section class="card"><h2>5. Rapport PDF</h2><p>La page Rapport présente le rapport individuel : vue d’ensemble, scores détaillés, forces / opportunités / faiblesses, plan et chronogramme. Cliquez sur « Exporter en PDF » puis choisissez « Enregistrer au format PDF » dans la fenêtre d’impression.</p></section>' +
      '<section class="card"><h2>6. Espace facilitateur</h2><p>Chaque organisation exporte son fichier (.json) depuis sa Fiche et l’envoie au facilitateur. Dans l’Espace facilitateur, importez plusieurs fichiers à la fois : le tableau de bord compare toutes les organisations, calcule les moyennes du portefeuille et liste les faiblesses les plus fréquentes. Un fichier ré-importé met à jour l’organisation correspondante.</p>' +
      '<p>Les données sont enregistrées dans ce navigateur uniquement : sauvegardez régulièrement l’espace.</p></section>';
  }

  function helpEn(weights) {
    return '<section class="card"><h2>Assessment models</h2><ul>' +
      '<li><strong>Governance barometer</strong>: 4 pillars, 33 components (the original Excel tool). Global index = mean of the 33 components, or weighted mean of pillars (Facilitator space).</li>' +
      '<li><strong>ITOCA</strong> (integrated technical and organisational capacity assessment, derived from USAID/Pact OCA/OCAT): 10 domains, 94 indicators. Global index = mean of domains.</li>' +
      '<li><strong>OPI</strong> (organisational performance index): 5 domains, 10 sub-domains. Measures results already achieved; every level must be backed by verified evidence. Only for organisations with at least 2 years of activity.</li></ul>' +
      '<p>The “New assessment” button lets you choose the model. Comparisons over time are made between assessments of the same model. ITOCA measures capacity and OPI performance: they complement each other.</p></section>' +
      '<section class="card"><h2>1. Steps</h2><ol>' +
      '<li><strong>Profile</strong>: organisation details, assessment sequence and year. Fill this in first.</li>' +
      '<li><strong>Assessment</strong>: for each of the 33 components, click the description that best matches the current situation (stages 1 to 4).</li>' +
      '<li><strong>Results</strong>: global index, scores by pillar and aspect, strengths, opportunities and weaknesses.</li>' +
      '<li><strong>Change action plan (CAP)</strong>: for each gap identified, pre-filled prioritized actions (editable), rank, means of verification, person responsible, time frame, comments and follow-up, with a timeline.</li>' +
      '<li><strong>Report</strong>: the organisation’s individual report, to export to PDF.</li></ol></section>' +
      '<section class="card"><h2>2. Strengths, opportunities and weaknesses</h2><ul>' +
      '<li><strong>▲ Strength to maintain</strong>: component scored 4.</li>' +
      '<li><strong>◆ Opportunity to catch</strong>: component scored 3, one step from the top level.</li>' +
      '<li><strong>▼ Weakness to address</strong>: component scored 1 or 2.</li></ul></section>' +
      '<section class="card"><h2>3. How scores are calculated</h2><ul>' +
      '<li>Component: score of the chosen level (1 to 4).</li><li>Aspect: mean of its components.</li>' +
      '<li>Pillar: mean of its aspects.</li><li>Total score: sum of the 33 components (maximum 132).</li>' +
      '<li>Mean development index: mean of the 33 components (Excel method, default).</li></ul>' +
      '<h3>Pillar weights</h3>' +
      '<p>The Excel file has no weights to enter: the global index is the simple mean of the 33 components. But because pillars have different numbers of components, they do not weigh the same in the index:</p><ul>' + weights + '</ul>' +
      '<p>Resource management and evaluation therefore counts almost twice as much as governance. If you want each pillar to count equally (25% each) or set your own weights, choose “Weighted mean of the 4 pillars” in Facilitator space → Calculation settings. Component, aspect and pillar scores do not change: only the global index does.</p></section>' +
      '<section class="card"><h2>4. Change action plan (CAP)</h2><ol>' +
      '<li>The plan is pre-filled: Barometer — 2 actions per weakness, 1 per opportunity, 1 maintenance action per strength; ITOCA and OPI — 1 targeted action per gap (weakness or opportunity). The gap identified repeats the current situation and can be reworded.</li>' +
      '<li>Edit the text, lead, period (start and end month), priority and status. Edited activities are kept when the plan is updated.</li>' +
      '<li>Add your own activities under each component, or general activities.</li>' +
      '<li>Write clear indicators with a baseline, a target and a means of verification.</li>' +
      '<li>If the assessment changes, click “Update standard activities”.</li></ol></section>' +
      '<section class="card"><h2>Regular assessments and progress</h2><p>Repeat the assessment at regular intervals (for example every 6 or 12 months) with “New assessment”: you can start from the previous answers and adjust them. The <strong>Progress</strong> page shows the trend of the index and pillars, a comparison table of all periods, the components that improved or declined between any two periods, and how much of the workplan was completed. The <strong>Progress report</strong> (Report page) puts this into a PDF.</p></section>' +
      '<section class="card"><h2>5. PDF report</h2><p>The Report page shows the individual report: overview, detailed scores, strengths / opportunities / weaknesses, workplan and timeline. Click “Export to PDF” and choose “Save as PDF” in the print dialog.</p></section>' +
      '<section class="card"><h2>6. Facilitator space</h2><p>Each organisation exports its file (.json) from its Profile page and sends it to the facilitator. In the Facilitator space, import several files at once: the dashboard compares all organisations, computes portfolio averages and lists the most common weaknesses. Re-importing a file updates the matching organisation.</p>' +
      '<p>Data is stored in this browser only: back up the space regularly.</p></section>';
  }

  // ------------------------------------------------------------------ actions

  var A = App.actions;

  A['org-field'] = function (el) {
    App.org().organization[el.dataset.field] = el.value;
    if (el.dataset.field === 'founded') {
      var age = document.getElementById('org-age');
      if (age) age.textContent = App.orgAgeText(App.org().organization);
    }
    // Choosing "Other" shows (or hides) the field to specify it.
    if (el.dataset.field === 'type' || el.dataset.field === 'domain') {
      App.touch();
      App.persist();
      App.render();
      return;
    }
    App.touch();
    if (el.dataset.field === 'name') App.renderHeader();
    App.persist();
  };

  A['assess-sequence'] = function (el) {
    App.assessment().sequence = Number(el.value);
    App.touch();
    App.persist(true);
    App.render();
  };

  A['assess-year'] = function (el) {
    var y = Number(el.value);
    if (y >= 2000 && y <= 2100) {
      var a = App.assessment();
      a.year = y;
      if (a.period) a.period = y + a.period.slice(4);
      App.touch();
      App.persist(true);
      App.renderHeader();
    }
  };

  A['assess-month'] = function (el) {
    var a = App.assessment();
    var m = Number(el.value);
    a.period = m >= 1 && m <= 12 ? a.year + '-' + (m < 10 ? '0' : '') + m : '';
    App.touch();
    App.persist(true);
    App.renderHeader();
  };

  A.answer = function (el) {
    var a = App.assessment();
    a.answers[el.name] = Number(el.value);
    App.touch();
    var fs = el.closest('.component');
    fs.querySelector('.component-score').innerHTML = componentScoreText(Number(el.value));
    App.scores(a).pillars.forEach(function (p) {
      var badge = view.querySelector('[data-pillar-progress="' + p.id + '"]');
      if (badge) badge.textContent = p.answered + '/' + p.total;
    });
    App.persist(true);
  };

  A.evidence = function (el) {
    App.assessment().evidence[el.dataset.id] = el.value;
    refreshEvidence(el.dataset.id);
    App.touch();
    App.persist();
  };

  A['evidence-upload'] = function (el) {
    var a = App.assessment();
    var cid = el.dataset.id;
    var files = Array.prototype.slice.call(el.files || []);
    el.value = '';
    var errors = [];
    Promise.all(files.map(function (file) {
      return window.BarometerFiles.add(file).then(function (meta) {
        (a.evidenceFiles[cid] = a.evidenceFiles[cid] || []).push(meta);
      })['catch'](function (e) { errors.push(file.name + ' : ' + App.t('evidence.err.' + (e.message === 'too-large' ? 'size' : e.message === 'not-pdf' ? 'pdf' : 'store'))); });
    })).then(function () {
      App.touch();
      App.persist(true);
      refreshEvidence(cid);
      if (errors.length) alert(errors.join('\n'));
    });
  };

  A['evidence-open'] = function (el) {
    window.BarometerFiles.view(el.dataset.file, { download: App.t('evidence.download'), close: App.t('evidence.close') })['catch'](function () { alert(App.t('evidence.err.missing')); });
  };

  A['evidence-remove'] = function (el) {
    if (!confirm(App.t('evidence.confirmRemove'))) return;
    var a = App.assessment();
    var cid = el.dataset.id;
    a.evidenceFiles[cid] = (a.evidenceFiles[cid] || []).filter(function (f) { return f.id !== el.dataset.file; });
    if (!a.evidenceFiles[cid].length) delete a.evidenceFiles[cid];
    window.BarometerFiles.remove(el.dataset.file)['catch'](function () {});
    App.touch();
    App.persist(true);
    refreshEvidence(cid);
  };

  A.verified = function (el) {
    var a = App.assessment();
    if (el.checked) a.verified[el.dataset.id] = true; else delete a.verified[el.dataset.id];
    App.touch();
    App.persist(true);
  };

  A.comment = function (el) {
    App.assessment().comments[el.dataset.id] = el.value;
    App.touch();
    App.persist();
  };

  A.compare = function (el) {
    App.ui.compareWith = el.value;
    App.render();
  };

  A['activate-assessment'] = function (el) {
    App.org().activeAssessmentId = el.dataset.id;
    App.ui.compareWith = null;
    App.persist(true);
    App.render();
  };

  A['delete-assessment'] = function (el) {
    var org = App.org();
    var a = org.assessments.filter(function (x) { return x.id === el.dataset.id; })[0];
    if (!a || org.assessments.length <= 1) return;
    if (!confirm(App.t('confirm.deleteAssessment', { name: App.assessmentLabel(a) }))) return;
    org.assessments = org.assessments.filter(function (x) { return x.id !== a.id; });
    if (org.activeAssessmentId === a.id) org.activeAssessmentId = org.assessments[org.assessments.length - 1].id;
    App.touch();
    App.persist(true);
    App.render();
  };

  A['new-assessment'] = function () {
    if (location.hash === '#new') App.render(); else location.hash = '#new';
  };

  /** Creates an assessment of the chosen model, optionally pre-filled from the latest one of that model. */
  A['create-assessment'] = function (el) {
    var org = App.org();
    var model = el.dataset.model;
    var last = App.latestAssessment(org, model);
    var seq = App.chronological(org, model).reduce(function (m, x) { return Math.max(m, x.sequence); }, 0) + 1;
    var a = Store.newAssessment(seq, new Date().getFullYear(), model);
    var now = new Date();
    a.period = now.getFullYear() + '-' + (now.getMonth() < 9 ? '0' : '') + (now.getMonth() + 1);
    var prefill = document.querySelector('[data-prefill="' + model + '"]');
    if (last && prefill && prefill.checked) {
      Object.keys(last.answers).forEach(function (k) { a.answers[k] = last.answers[k]; });
      Object.keys(last.evidence).forEach(function (k) { a.evidence[k] = last.evidence[k]; });
    }
    org.assessments.push(a);
    org.activeAssessmentId = a.id;
    App.ui.compareWith = null;
    App.touch();
    App.persist(true);
    location.hash = '#profile';
  };

  App.views['new'] = function () {
    var org = App.org();
    var founded = Number(org.organization.founded);
    App.setView('<h1>' + App.esc(App.t('new.title')) + '</h1><p class="muted">' + App.esc(App.t('new.intro', { org: App.orgName(org) })) + '</p>' +
      '<div class="model-cards">' + App.Models.list().map(function (m) {
        var last = App.latestAssessment(org, m.id);
        var young = m.minYears && founded && new Date().getFullYear() - founded < m.minYears;
        return '<article class="card model-card kind-' + m.kind + '">' +
          '<span class="tag">' + App.esc(App.t('kind.' + m.kind)) + '</span>' +
          '<h2>' + App.esc(App.L(m.name)) + '</h2><p>' + App.esc(App.L(m.description)) + '</p>' +
          (young ? '<p class="notice small">' + App.esc(App.t('opi.tooYoung', { years: new Date().getFullYear() - founded })) + '</p>' : '') +
          (last ? '<label class="inline-field"><input type="checkbox" data-prefill="' + m.id + '" checked> ' + App.esc(App.t('new.prefill', { name: App.assessmentLabel(last) })) + '</label>' : '') +
          '<div class="actions"><button class="btn primary" data-click="create-assessment" data-model="' + m.id + '">' + App.esc(App.t('new.start')) + '</button></div>' +
          '</article>';
      }).join('') + '</div>');
  };

  A['export-org'] = function () {
    var org = App.org();
    var date = new Date().toISOString().slice(0, 10);
    window.BarometerFiles.exportFiles([org])['catch'](function () { return []; }).then(function (files) {
      var data = Store.exportOrg(org);
      data.files = files;
      App.download('barometer-' + App.slug(org.organization.acronym || org.organization.name) + '-' + date + '.json',
        JSON.stringify(data, null, 2), 'application/json');
    });
  };

  A['import-files'] = function (el) {
    App.readJsonFiles(el.files, function (results) {
      var orgs = [];
      var files = [];
      var errors = [];
      results.forEach(function (r) {
        if (r.error) { errors.push(r.file.name + ': ' + App.t('err.invalid')); return; }
        try {
          var parsed = Store.parseImport(r.data);
          orgs = orgs.concat(parsed.orgs);
          files = files.concat(parsed.files || []);
        } catch (e) { errors.push(r.file.name + ': ' + App.errMsg(e)); }
      });
      if (files.length) window.BarometerFiles.importFiles(files)['catch'](function () { errors.push(App.t('evidence.err.store')); });
      if (orgs.length) {
        var res = Store.mergeOrgs(App.ws, orgs);
        App.ws.activeOrgId = orgs[orgs.length - 1].id;
        App.persist(true);
        App.flash(App.t('fac.imported', res) + (errors.length ? ' — ' + errors.join(' ; ') : ''));
      } else if (errors.length) {
        App.flash(App.t('fac.importError', { msg: errors.join(' ; ') }));
      }
      App.render();
    });
    el.value = '';
  };

  A['delete-org'] = function (el) {
    var org = App.ws.orgs.filter(function (o) { return o.id === el.dataset.id; })[0];
    if (!org || App.ws.orgs.length <= 1) return;
    if (!confirm(App.t('fac.confirmDelete', { name: App.orgName(org) }))) return;
    App.ws.orgs = App.ws.orgs.filter(function (o) { return o.id !== org.id; });
    if (App.ws.activeOrgId === org.id) App.ws.activeOrgId = App.ws.orgs[0].id;
    App.persist(true);
    App.render();
  };

  A['load-demo'] = function () {
    var orgs = window.BarometerDemo.build(I18n.getLang());
    Store.mergeOrgs(App.ws, orgs);
    App.ws.activeOrgId = orgs[0].id;
    App.ui.compareWith = null;
    App.persist(true);
    App.flash(App.t('demo.loaded', { n: orgs.length }));
    if (location.hash === '#facilitator') App.render(); else location.hash = '#facilitator';
  };

  A['export-results'] = function () {
    var a = App.assessment();
    var r = App.scores(a);
    var F = App.fw(a);
    var rows = [[App.t('profile.name'), App.orgName()], [App.t('header.assessment'), App.assessmentLabel(a)], [],
      ['Pillar / Pilier', App.t('report.aspect'), App.t('report.component'), App.t('score'), App.t('report.currentLevel'), 'Category', App.t('diag.comment')]];
    F.allComponents().forEach(function (e) {
      var s = a.answers[e.component.id];
      rows.push([App.L(e.pillar.name), App.L(e.aspect.name), App.L(e.component.name), s || '',
        s ? App.L(F.LEVELS[s - 1].label) : '', s ? App.t('cat.' + S.categoryFor(s)) : '', a.comments[e.component.id] || '']);
    });
    rows.push([]);
    r.pillars.forEach(function (p) {
      p.aspects.forEach(function (asp) { rows.push([App.L(p.name), App.L(asp.name), '', App.num(asp.score)]); });
      rows.push([App.L(p.name), '', '', App.num(p.score)]);
    });
    rows.push([]);
    rows.push([App.t('results.total'), '', '', r.total + ' / ' + r.maxTotal]);
    rows.push([App.t('results.index'), '', '', App.num(r.index)]);
    App.download('results-' + App.slug(App.orgName()) + '-' + a.year + '.csv', App.csv(rows), 'text/csv;charset=utf-8');
  };

  // ------------------------------------------------------------------ events

  function dispatch(el, e) {
    var fn = A[el.dataset.on];
    if (fn) fn(el, e);
  }

  var TEXT_INPUTS = 'textarea, input[type=text], input[type=email], input[type=tel]';

  view.addEventListener('input', function (e) {
    var el = e.target;
    if (el.dataset && el.dataset.on && el.matches(TEXT_INPUTS)) dispatch(el, e);
  });

  view.addEventListener('change', function (e) {
    var el = e.target;
    if (el.dataset && el.dataset.on && !el.matches(TEXT_INPUTS)) dispatch(el, e);
  });

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-click]');
    if (!el) return;
    var fn = A[el.dataset.click];
    if (fn) { e.preventDefault(); fn(el, e); }
  });

  App.start = function () {
    document.getElementById('org-select').addEventListener('change', function (e) {
      App.ws.activeOrgId = e.target.value;
      App.ui.compareWith = null;
      App.persist(true);
      App.render();
    });
    document.getElementById('assessment-select').addEventListener('change', function (e) {
      App.org().activeAssessmentId = e.target.value;
      App.ui.compareWith = null;
      App.persist(true);
      App.render();
    });
    document.querySelectorAll('.lang-switch button').forEach(function (b) {
      b.addEventListener('click', function () {
        App.settings().lang = b.getAttribute('data-lang');
        App.persist(true);
        App.render();
      });
    });
    window.addEventListener('hashchange', function () { App.render(); window.scrollTo(0, 0); });
    App.render();
  };
})();
