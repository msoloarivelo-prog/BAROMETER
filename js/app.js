/*
 * Application : navigation, formulaires, tableau de bord et plan.
 * Correspondance avec le classeur Excel :
 *   Fiche            -> #fiche
 *   1 - DIAG_*       -> #diagnostic/<pilier>
 *   Dashboard        -> #resultats
 *   1 - GOUVERNANCE_VISION ... (plans) -> #plan/<pilier>
 *   MANUEL           -> #manuel
 */
(function () {
  'use strict';

  var F = window.BarometerFramework;
  var S = window.BarometerScoring;
  var Store = window.BarometerStorage;
  var Charts = window.BarometerCharts;

  var PILLAR_COLORS = { gov: '#2f6f9f', plan: '#3f8f5f', hr: '#c9822b', fin: '#8a4f9e' };

  var state = Store.load();
  var view = document.getElementById('view');
  var saveTimer = null;
  var ui = { planFilterWeak: true, compareWith: null };

  // ---------------------------------------------------------------- helpers

  function esc(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmt(v, d) { return Charts.fmt(v, d); }

  function activeAssessment() {
    return state.assessments.filter(function (a) { return a.id === state.activeAssessmentId; })[0] || state.assessments[0];
  }

  function sequenceLabel(seq) {
    var s = F.SEQUENCES.filter(function (x) { return x.value === seq; })[0];
    return s ? s.label : 'Diagnostic n°' + seq;
  }

  function assessmentLabel(a) {
    return sequenceLabel(a.sequence) + ' — ' + a.year;
  }

  function persist(immediate) {
    clearTimeout(saveTimer);
    var run = function () {
      var ok = Store.save(state);
      var badge = document.getElementById('save-status');
      if (badge) {
        badge.textContent = ok ? 'Enregistré localement' : 'Échec de l’enregistrement';
        badge.className = 'save-status ' + (ok ? 'ok' : 'err');
      }
    };
    if (immediate) run(); else saveTimer = setTimeout(run, 400);
  }

  function findComponent(id) {
    var found = null;
    F.PILLARS.forEach(function (p) {
      p.aspects.forEach(function (a) {
        a.components.forEach(function (c) {
          if (c.id === id) found = { pillar: p, aspect: a, component: c };
        });
      });
    });
    return found;
  }

  function pillarById(id) {
    return F.PILLARS.filter(function (p) { return p.id === id; })[0] || F.PILLARS[0];
  }

  function download(filename, content, type) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function slug(s) {
    return (s || 'organisation').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'organisation';
  }

  function csv(rows) {
    return '﻿' + rows.map(function (r) {
      return r.map(function (cell) {
        var s = cell === null || cell === undefined ? '' : String(cell);
        return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(';');
    }).join('\r\n');
  }

  // ---------------------------------------------------------------- header

  function renderHeader() {
    document.getElementById('org-name').textContent = state.organization.name || 'Organisation sans nom';
    var select = document.getElementById('assessment-select');
    select.innerHTML = state.assessments.map(function (a) {
      return '<option value="' + esc(a.id) + '"' + (a.id === state.activeAssessmentId ? ' selected' : '') + '>' +
        esc(assessmentLabel(a)) + '</option>';
    }).join('');

    var route = currentRoute();
    document.querySelectorAll('.main-nav a').forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('data-route') === route.name);
    });
  }

  // ---------------------------------------------------------------- routing

  function currentRoute() {
    var hash = (location.hash || '#accueil').slice(1).split('/');
    return { name: hash[0] || 'accueil', param: hash[1] || null };
  }

  function render() {
    var route = currentRoute();
    renderHeader();
    switch (route.name) {
      case 'fiche': renderFiche(); break;
      case 'diagnostic': renderDiagnostic(route.param); break;
      case 'resultats': renderResults(); break;
      case 'plan': renderPlan(route.param); break;
      case 'manuel': renderManual(); break;
      default: renderHome();
    }
    view.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------- accueil

  function renderHome() {
    var a = activeAssessment();
    var r = S.computeScores(F, a.answers);
    var steps = [
      { n: 0, route: '#fiche', title: 'Fiche synoptique', text: "Renseignez l'identité de l'organisation et la séquence du diagnostic. À remplir en premier lieu." },
      { n: 1, route: '#diagnostic/gov', title: 'Diagnostic', text: 'Choisissez, pour chacune des 33 composantes, la description qui correspond le mieux à votre situation.' },
      { n: 2, route: '#resultats', title: 'Résultats', text: "Visualisez l'indice de développement organisationnel global et par pilier." },
      { n: 3, route: '#plan/gov', title: 'Plan de renforcement', text: 'Traduisez les faiblesses identifiées en défis, activités, indicateurs et chronogramme.' }
    ];
    view.innerHTML =
      '<section class="hero">' +
        '<h1>Baromètre de gouvernance organisationnelle</h1>' +
        '<p>Outil d’auto-diagnostic et d’accompagnement destiné aux petites organisations. ' +
        'Il mesure le niveau de développement de quatre piliers — gouvernance, gestion des ressources et évaluation, ' +
        'ressources humaines, ressources financières — sur une échelle de 1 à 4, puis aide à bâtir un plan de renforcement.</p>' +
        '<div class="hero-status">' +
          '<span><strong>' + esc(assessmentLabel(a)) + '</strong></span>' +
          '<span>' + r.answered + ' / ' + r.totalComponents + ' composantes renseignées</span>' +
          (r.index !== null ? '<span>Indice moyen : <strong>' + fmt(r.index, 2) + ' / 4</strong></span>' : '') +
        '</div>' +
      '</section>' +
      '<ol class="process">' + steps.map(function (s) {
        return '<li><a href="' + s.route + '" class="process-step">' +
          '<span class="step-n">' + s.n + '</span>' +
          '<span class="step-body"><strong>' + esc(s.title) + '</strong><span>' + esc(s.text) + '</span></span>' +
          '</a></li>';
      }).join('') + '</ol>' +
      '<section class="card"><h2>Les quatre stades de développement</h2><ol class="levels-legend">' +
      F.LEVELS.map(function (l) {
        return '<li><span class="level-badge level-' + l.value + '">' + l.value + '</span>' + esc(l.label) + '</li>';
      }).join('') + '</ol></section>';
  }

  // ---------------------------------------------------------------- fiche

  function renderFiche() {
    var o = state.organization;
    var a = activeAssessment();
    function field(id, label, value, type) {
      return '<label class="field"><span>' + esc(label) + '</span>' +
        '<input type="' + (type || 'text') + '" data-org="' + id + '" value="' + esc(value) + '"></label>';
    }
    view.innerHTML =
      '<h1>Fiche synoptique de votre organisation</h1>' +
      '<section class="card"><h2>Organisation</h2><div class="form-grid">' +
        field('name', "Nom de l'organisation", o.name) +
        field('address', 'Adresse', o.address) +
        field('focalPoint', 'Point focal', o.focalPoint) +
        field('phone', 'Téléphone', o.phone, 'tel') +
        field('email', 'E-mail', o.email, 'email') +
      '</div></section>' +
      '<section class="card"><h2>Diagnostic en cours</h2><div class="form-grid">' +
        '<label class="field"><span>Séquence de diagnostic</span><select data-assess="sequence">' +
          F.SEQUENCES.map(function (s) {
            return '<option value="' + s.value + '"' + (s.value === a.sequence ? ' selected' : '') + '>' + esc(s.label) + '</option>';
          }).join('') +
        '</select></label>' +
        '<label class="field"><span>Année de mise en œuvre du diagnostic</span>' +
          '<input type="number" min="2000" max="2100" data-assess="year" value="' + esc(a.year) + '"></label>' +
      '</div></section>' +
      '<section class="card"><h2>Historique des diagnostics</h2>' +
        '<p class="muted">Chaque diagnostic conserve ses propres réponses et son propre plan, ce qui permet de suivre l’évolution de l’organisation dans le temps.</p>' +
        '<table class="table"><thead><tr><th>Diagnostic</th><th>Avancement</th><th>Indice</th><th></th></tr></thead><tbody>' +
        state.assessments.map(function (x) {
          var r = S.computeScores(F, x.answers);
          return '<tr' + (x.id === a.id ? ' class="current"' : '') + '><td>' + esc(assessmentLabel(x)) + '</td>' +
            '<td>' + r.answered + ' / ' + r.totalComponents + '</td>' +
            '<td>' + (r.index === null ? '—' : fmt(r.index, 2)) + '</td>' +
            '<td class="row-actions">' +
              (x.id === a.id ? '<span class="tag">actif</span>' : '<button class="btn small" data-activate="' + esc(x.id) + '">Ouvrir</button>') +
              (state.assessments.length > 1 ? ' <button class="btn small danger" data-delete="' + esc(x.id) + '">Supprimer</button>' : '') +
            '</td></tr>';
        }).join('') +
        '</tbody></table>' +
        '<div class="actions"><button class="btn primary" data-action="new-assessment">Nouveau diagnostic</button></div>' +
      '</section>' +
      '<section class="card"><h2>Sauvegarde et partage</h2>' +
        '<p class="muted">Les données sont enregistrées dans ce navigateur uniquement. Exportez régulièrement un fichier de sauvegarde (.json) pour l’archiver ou le transmettre.</p>' +
        '<div class="actions">' +
          '<button class="btn" data-action="export-json">Exporter le dossier (.json)</button>' +
          '<label class="btn">Importer un dossier<input type="file" accept=".json,application/json" data-action="import-json" hidden></label>' +
          '<button class="btn danger" data-action="reset">Tout effacer</button>' +
        '</div>' +
      '</section>';
  }

  // ---------------------------------------------------------------- diagnostic

  function renderDiagnostic(pillarId) {
    var pillar = pillarById(pillarId);
    var a = activeAssessment();
    var r = S.computeScores(F, a.answers);
    var idx = F.PILLARS.indexOf(pillar);
    var prev = F.PILLARS[idx - 1];
    var next = F.PILLARS[idx + 1];

    var html = '<h1>Diagnostic — ' + esc(pillar.name) + '</h1>' + pillarTabs('diagnostic', pillar.id, r) +
      '<p class="muted">Cliquez, pour chaque composante, sur la description qui correspond le mieux à la situation actuelle de l’organisation. Les notes se calculent automatiquement.</p>' +
      '<div class="level-header" aria-hidden="true"><span></span>' +
        F.LEVELS.map(function (l) { return '<span><b>' + l.value + '</b> ' + esc(l.label) + '</span>'; }).join('') +
      '</div>';

    pillar.aspects.forEach(function (aspect) {
      html += '<section class="aspect card"><h2>' + esc(aspect.name) + '</h2>';
      aspect.components.forEach(function (c) {
        var selected = a.answers[c.id];
        var title = c.name === aspect.name ? aspect.name : c.name;
        html += '<fieldset class="component" data-component="' + esc(c.id) + '">' +
          '<legend>' + esc(title) + '<span class="component-score">' + (selected ? 'Note : ' + selected + ' / 4' : 'Non renseigné') + '</span></legend>' +
          '<div class="levels">' +
          c.levels.map(function (text, i) {
            var v = i + 1;
            return '<label class="level-option level-' + v + '">' +
              '<input type="radio" name="' + esc(c.id) + '" value="' + v + '"' + (selected === v ? ' checked' : '') + '>' +
              '<span class="level-n">' + v + '</span><span class="level-text">' + esc(text) + '</span></label>';
          }).join('') +
          '</div>' +
          '<details class="comment"' + (a.comments[c.id] ? ' open' : '') + '><summary>Commentaire / justification</summary>' +
          '<textarea data-comment="' + esc(c.id) + '" rows="2" placeholder="Éléments de preuve, observations…">' + esc(a.comments[c.id] || '') + '</textarea></details>' +
          '</fieldset>';
      });
      html += '</section>';
    });

    html += '<nav class="pager">' +
      (prev ? '<a class="btn" href="#diagnostic/' + prev.id + '">← ' + esc(prev.shortName) + '</a>' : '<span></span>') +
      (next ? '<a class="btn primary" href="#diagnostic/' + next.id + '">' + esc(next.shortName) + ' →</a>'
            : '<a class="btn primary" href="#resultats">Voir les résultats →</a>') +
      '</nav>';
    view.innerHTML = html;
  }

  function pillarTabs(routeName, activeId, scores) {
    return '<div class="pillar-tabs" role="tablist">' + F.PILLARS.map(function (p, i) {
      var ps = scores.pillars[i];
      return '<a role="tab" href="#' + routeName + '/' + p.id + '" class="pillar-tab' + (p.id === activeId ? ' active' : '') +
        '" style="--pillar:' + PILLAR_COLORS[p.id] + '"' + (p.id === activeId ? ' aria-selected="true"' : '') + '>' +
        '<span>' + esc(p.shortName) + '</span>' +
        '<small data-pillar-progress="' + p.id + '">' + ps.answered + '/' + ps.total + '</small></a>';
    }).join('') + '</div>';
  }

  // ---------------------------------------------------------------- résultats

  function renderResults() {
    var a = activeAssessment();
    var r = S.computeScores(F, a.answers);
    var others = state.assessments.filter(function (x) { return x.id !== a.id; });
    if (ui.compareWith && !others.some(function (x) { return x.id === ui.compareWith; })) ui.compareWith = null;
    var baseline = ui.compareWith ? others.filter(function (x) { return x.id === ui.compareWith; })[0] : null;
    var cmp = baseline ? S.compareScores(r, S.computeScores(F, baseline.answers)) : null;
    var stage = S.stageFor(F, r.index);

    var html = '<div class="results-head"><div><h1>Résultat d’évaluation</h1>' +
      '<p class="muted">' + esc(state.organization.name || 'Organisation sans nom') + ' — ' + esc(assessmentLabel(a)) + '</p></div>' +
      '<div class="actions no-print">' +
        (others.length ? '<label class="inline-field">Comparer avec <select data-action="compare"><option value="">—</option>' +
          others.map(function (x) {
            return '<option value="' + esc(x.id) + '"' + (x.id === ui.compareWith ? ' selected' : '') + '>' + esc(assessmentLabel(x)) + '</option>';
          }).join('') + '</select></label>' : '') +
        '<button class="btn" data-action="export-results">Exporter (CSV)</button>' +
        '<button class="btn" data-action="print">Imprimer</button>' +
      '</div></div>';

    if (!r.complete) {
      html += '<div class="notice">Diagnostic incomplet : ' + r.answered + ' composante(s) sur ' + r.totalComponents +
        ' renseignée(s). Les moyennes ne portent que sur les réponses fournies. <a href="#diagnostic/' + firstIncompletePillar(r) + '">Compléter le diagnostic</a></div>';
    }

    html += '<section class="summary">' +
      '<div class="kpi"><span class="kpi-label">Indice moyen de développement</span><span class="kpi-value">' + fmt(r.index, 2) + '<small> / 4</small></span>' +
        (cmp && cmp.index !== null ? deltaTag(cmp.index) : '') +
        (stage ? '<span class="kpi-sub">Stade : ' + esc(stage.label) + '</span>' : '') + '</div>' +
      '<div class="kpi"><span class="kpi-label">Placement total</span><span class="kpi-value">' + r.total + '<small> / ' + r.maxTotal + '</small></span>' +
        (cmp && cmp.total !== null ? deltaTag(cmp.total, 0) : '') +
        '<span class="kpi-sub">' + (r.indexPercent === null ? '—' : fmt(r.indexPercent, 0) + ' % du maximum') + '</span></div>' +
      '<div class="kpi kpi-wide"><span class="kpi-label">Moyenne par pilier</span><div id="pillar-overview"></div></div>' +
      '</section>';

    html += '<section class="pillar-grid">' + F.PILLARS.map(function (p) {
      return '<article class="pillar-card card" style="--pillar:' + PILLAR_COLORS[p.id] + '">' +
        '<h2>' + esc(p.name) + '</h2>' +
        '<div class="pillar-body"><div class="donut-slot" data-donut="' + p.id + '"></div><div class="bars-slot" data-bars="' + p.id + '"></div></div>' +
        '<p class="muted small">Chaque champ d’évaluation a une pondération maximum de 4.</p></article>';
    }).join('') + '</section>';

    var weak = S.weakestComponents(F, a.answers).filter(function (w) { return w.score <= 2; });
    html += '<section class="card"><h2>Points à renforcer en priorité</h2>' +
      (weak.length
        ? '<table class="table"><thead><tr><th>Pilier</th><th>Aspect</th><th>Composante</th><th>Note</th></tr></thead><tbody>' +
          weak.map(function (w) {
            return '<tr><td>' + esc(w.pillarName) + '</td><td>' + esc(w.aspectName) + '</td><td>' + esc(w.componentName) +
              '</td><td><span class="level-badge level-' + w.score + '">' + w.score + '</span></td></tr>';
          }).join('') + '</tbody></table>' +
          '<div class="actions no-print"><a class="btn primary" href="#plan/' + weak[0].pillarId + '">Construire le plan de renforcement →</a></div>'
        : '<p class="muted">Aucune composante notée 1 ou 2.</p>') +
      '</section>';

    view.innerHTML = html;

    document.getElementById('pillar-overview').appendChild(Charts.bars(r.pillars.map(function (p, i) {
      return { label: p.shortName, value: p.score, delta: cmp ? cmp.pillars[i].delta : undefined };
    }), F.MAX_SCORE));

    r.pillars.forEach(function (p, i) {
      var color = PILLAR_COLORS[p.id];
      view.querySelector('[data-donut="' + p.id + '"]').appendChild(Charts.donut(p.score, F.MAX_SCORE, { color: color, label: p.name }));
      view.querySelector('[data-bars="' + p.id + '"]').appendChild(Charts.bars(p.aspects.map(function (asp, j) {
        return { label: asp.name, value: asp.score, delta: cmp ? cmp.pillars[i].aspects[j].delta : undefined };
      }), F.MAX_SCORE, { color: color }));
    });
  }

  function deltaTag(value, digits) {
    var cls = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
    return '<span class="delta ' + cls + '">' + (value > 0 ? '+' : '') + fmt(value, digits === undefined ? 2 : digits) + ' vs référence</span>';
  }

  function firstIncompletePillar(r) {
    var p = r.pillars.filter(function (x) { return x.answered < x.total; })[0];
    return p ? p.id : F.PILLARS[0].id;
  }

  // ---------------------------------------------------------------- plan

  function renderPlan(pillarId) {
    var pillar = pillarById(pillarId);
    var a = activeAssessment();
    var r = S.computeScores(F, a.answers);

    var html = '<div class="results-head"><div><h1>Plan de renforcement — ' + esc(pillar.name) + '</h1>' +
      '<p class="muted">' + esc(assessmentLabel(a)) + '</p></div>' +
      '<div class="actions no-print">' +
        '<label class="inline-field"><input type="checkbox" data-action="plan-filter"' + (ui.planFilterWeak ? ' checked' : '') + '> Seulement les composantes à renforcer (note &lt; 4)</label>' +
        '<button class="btn" data-action="export-plan">Exporter le plan (CSV)</button>' +
        '<button class="btn" data-action="print">Imprimer</button>' +
      '</div></div>' +
      pillarTabs('plan', pillar.id, r);

    var shown = 0;
    pillar.aspects.forEach(function (aspect) {
      aspect.components.forEach(function (c) {
        var score = a.answers[c.id];
        if (ui.planFilterWeak && score === 4) return;
        shown++;
        var item = a.plan[c.id] || Store.emptyPlanItem();
        var current = score ? c.levels[score - 1] : null;
        var nextLevel = score && score < 4 ? c.levels[score] : null;
        var title = c.name === aspect.name ? aspect.name : aspect.name + ' — ' + c.name;
        function input(field, label, ph) {
          return '<label class="field"><span>' + esc(label) + '</span><input type="text" data-plan="' + esc(c.id) + '" data-field="' + field + '" value="' + esc(item[field]) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '></label>';
        }
        function area(field, label, ph) {
          return '<label class="field wide"><span>' + esc(label) + '</span><textarea rows="2" data-plan="' + esc(c.id) + '" data-field="' + field + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '>' + esc(item[field]) + '</textarea></label>';
        }
        html += '<article class="plan-item card" style="--pillar:' + PILLAR_COLORS[pillar.id] + '">' +
          '<header><h2>' + esc(title) + '</h2>' +
            (score ? '<span class="level-badge level-' + score + '">' + score + '</span>' : '<span class="tag">non évalué</span>') + '</header>' +
          (current ? '<p class="context"><strong>Situation actuelle :</strong> ' + esc(current) + '</p>' : '') +
          (nextLevel ? '<p class="context next"><strong>Niveau suivant visé :</strong> ' + esc(nextLevel) + '</p>' : '') +
          '<div class="form-grid">' +
            area('challenge', 'Défis identifiés lors du diagnostic', 'Reformulez la réponse au diagnostic sous forme de défi à relever.') +
            area('activities', 'Activités de redressement proposées', 'Ex. : Augmenter les jetons de présence des membres du CA de 15 % pour chaque réunion ordinaire.') +
            input('lead', 'Responsable (lead)') +
            '<label class="field"><span>Priorité</span><select data-plan="' + esc(c.id) + '" data-field="priority"><option value="">—</option>' +
              F.PRIORITIES.map(function (p) { return '<option' + (item.priority === p ? ' selected' : '') + '>' + p + '</option>'; }).join('') +
            '</select></label>' +
            input('resourcesAvailable', 'Ressources disponibles') +
            input('resourcesAnticipated', 'Ressources anticipées') +
            area('indicator', 'Indicateur (formulation)', 'Ex. : Jeton de présence à 23 000 Ariary validé.') +
            input('baseline', 'Valeur de base') +
            input('target', 'Valeur cible') +
            area('verification', 'Source de vérification', 'Ex. : Note de service n°XX portant amendement du jeton de présence.') +
          '</div>' +
          '<div class="gantt"><span class="gantt-label">Chronogramme</span><div class="gantt-cells">' +
            item.months.map(function (on, m) {
              return '<label class="gantt-cell' + (on ? ' on' : '') + '" title="Mois ' + (m + 1) + '">' +
                '<input type="checkbox" data-plan="' + esc(c.id) + '" data-month="' + m + '"' + (on ? ' checked' : '') + '>M' + (m + 1) + '</label>';
            }).join('') +
          '</div></div>' +
          '</article>';
      });
    });
    if (!shown) {
      html += '<div class="notice">Toutes les composantes de ce pilier ont atteint la note maximale (4). Décochez le filtre pour afficher toutes les composantes.</div>';
    }
    view.innerHTML = html;
  }

  function planItem(a, componentId) {
    if (!a.plan[componentId]) a.plan[componentId] = Store.emptyPlanItem();
    return a.plan[componentId];
  }

  // ---------------------------------------------------------------- manuel

  function renderManual() {
    view.innerHTML =
      '<h1>Manuel d’utilisation</h1>' +
      '<section class="card"><h2>I — Navigation</h2><p>Le menu en haut de page permet d’aller d’une étape à l’autre à tout moment. Le sélecteur de diagnostic (à droite) indique sur quel diagnostic vous travaillez.</p>' +
      '<ol><li><strong>Fiche</strong> : informations sur votre organisme. À remplir en premier lieu.</li>' +
      '<li><strong>Diagnostic</strong> : les tableaux-questionnaires, un par pilier (domaine d’étude).</li>' +
      '<li><strong>Résultats</strong> : visualisation des indices de développement organisationnel.</li>' +
      '<li><strong>Plan</strong> : canevas de planification des actions de renforcement, en relation avec les résultats du diagnostic. Le remplissage du plan est impératif.</li></ol></section>' +
      '<section class="card"><h2>II — Remplissage des tableaux de diagnostic</h2>' +
      '<p>Pour chaque composante d’évaluation, cliquez sur la description qui correspond le mieux à la situation actuelle. Les quatre colonnes correspondent aux quatre stades de développement : ' +
      F.LEVELS.map(function (l) { return '<strong>' + l.value + '</strong> ' + esc(l.label); }).join(' ; ') + '.</p>' +
      '<p>Les notes d’évaluation se complètent automatiquement.</p></section>' +
      '<section class="card"><h2>III — Méthode de calcul</h2><ul>' +
      '<li>Chaque composante reçoit la note du niveau choisi (1 à 4).</li>' +
      '<li>La note d’un <em>aspect</em> est la moyenne de ses composantes.</li>' +
      '<li>La note d’un <em>pilier</em> est la moyenne de ses aspects.</li>' +
      '<li>Le <em>placement total</em> est la somme des 33 composantes (maximum 132).</li>' +
      '<li>L’<em>indice moyen de développement</em> est la moyenne des 33 composantes.</li>' +
      '<li>Lorsque plusieurs diagnostics existent, la page Résultats permet d’afficher l’évolution par rapport à un diagnostic de référence.</li></ul></section>' +
      '<section class="card"><h2>IV — Remplissage du plan de renforcement</h2><ol>' +
      '<li>Reformuler les réponses au diagnostic sous forme de défis / challenges à pallier.</li>' +
      '<li>Formuler des activités concrètes pour pallier ces défis. Exemple — Activité 1 : augmenter les jetons de présence des membres du CA de 15 % pour chaque réunion ordinaire.</li>' +
      '<li>Mentionner la personne ou le responsable direct qui supervisera et conduira ce changement.</li>' +
      '<li>Mentionner les ressources disponibles (notamment le financement de l’action). Disponibles si déjà en main, anticipées si prévues dans les financements futurs.</li>' +
      '<li>Formuler des indicateurs d’output clairs. Exemple : « Jeton de présence à 23 000 Ariary validé » au lieu de « Augmentation de la présence effective des membres du CA aux réunions ».</li>' +
      '<li>Ne pas oublier de spécifier la valeur cible et la valeur de base de l’indicateur.</li>' +
      '<li>Trois niveaux de priorité : Essentiel — Important — Neutre.</li>' +
      '<li>Spécifier les sources de vérification des indicateurs. Exemple : note de service n°XX portant amendement du montant alloué au jeton de présence du CA.</li>' +
      '<li>Cocher les mois concernés dans le chronogramme : les cellules se colorent comme dans un diagramme de Gantt.</li></ol></section>' +
      '<section class="card"><h2>V — Sauvegarde</h2><p>Les données sont enregistrées automatiquement dans ce navigateur. Utilisez « Exporter le dossier » (page Fiche) pour créer une copie de sauvegarde ou la transmettre à un accompagnateur, qui pourra l’importer sur son propre poste.</p></section>';
  }

  // ---------------------------------------------------------------- events

  view.addEventListener('change', function (e) {
    var t = e.target;
    var a = activeAssessment();

    if (t.type === 'radio' && t.closest('.component')) {
      var cid = t.name;
      a.answers[cid] = Number(t.value);
      var fs = t.closest('.component');
      fs.querySelector('.component-score').textContent = 'Note : ' + t.value + ' / 4';
      var r = S.computeScores(F, a.answers);
      r.pillars.forEach(function (p) {
        var badge = view.querySelector('[data-pillar-progress="' + p.id + '"]');
        if (badge) badge.textContent = p.answered + '/' + p.total;
      });
      persist(true);
      return;
    }
    if (t.dataset.assess === 'sequence') { a.sequence = Number(t.value); persist(true); render(); return; }
    if (t.dataset.assess === 'year') { a.year = Number(t.value) || a.year; persist(true); renderHeader(); return; }
    if (t.dataset.plan !== undefined && t.dataset.month !== undefined) {
      var item = planItem(a, t.dataset.plan);
      item.months[Number(t.dataset.month)] = t.checked;
      t.parentElement.classList.toggle('on', t.checked);
      persist(true);
      return;
    }
    if (t.dataset.plan !== undefined && t.tagName === 'SELECT') {
      planItem(a, t.dataset.plan)[t.dataset.field] = t.value;
      persist(true);
      return;
    }
    if (t.dataset.action === 'compare') { ui.compareWith = t.value || null; renderResults(); return; }
    if (t.dataset.action === 'plan-filter') { ui.planFilterWeak = t.checked; render(); return; }
    if (t.dataset.action === 'import-json') { importJson(t.files[0]); t.value = ''; return; }
  });

  view.addEventListener('input', function (e) {
    var t = e.target;
    var a = activeAssessment();
    if (t.dataset.org) {
      state.organization[t.dataset.org] = t.value;
      if (t.dataset.org === 'name') renderHeader();
      persist();
    } else if (t.dataset.comment) {
      a.comments[t.dataset.comment] = t.value;
      persist();
    } else if (t.dataset.plan !== undefined && t.dataset.field && t.tagName !== 'SELECT') {
      planItem(a, t.dataset.plan)[t.dataset.field] = t.value;
      persist();
    }
  });

  view.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.activate) { setActive(t.dataset.activate); return; }
    if (t.dataset.delete) { deleteAssessment(t.dataset.delete); return; }
    switch (t.dataset.action) {
      case 'new-assessment': createAssessment(); break;
      case 'export-json': exportJson(); break;
      case 'export-results': exportResults(); break;
      case 'export-plan': exportPlan(); break;
      case 'print': window.print(); break;
      case 'reset':
        if (confirm('Effacer toutes les données de ce navigateur ? Pensez à exporter une sauvegarde avant.')) {
          Store.clear();
          state = Store.newState();
          persist(true);
          location.hash = '#fiche';
          render();
        }
        break;
    }
  });

  document.getElementById('assessment-select').addEventListener('change', function (e) {
    setActive(e.target.value);
  });

  document.getElementById('new-assessment').addEventListener('click', createAssessment);

  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });

  // ---------------------------------------------------------------- actions

  function setActive(id) {
    state.activeAssessmentId = id;
    ui.compareWith = null;
    persist(true);
    render();
  }

  function createAssessment() {
    var maxSeq = state.assessments.reduce(function (m, a) { return Math.max(m, a.sequence); }, 0);
    var prev = activeAssessment();
    var a = Store.newAssessment(Math.min(maxSeq + 1, F.SEQUENCES.length), new Date().getFullYear());
    state.assessments.push(a);
    state.activeAssessmentId = a.id;
    ui.compareWith = prev.id;
    persist(true);
    location.hash = '#fiche';
    render();
  }

  function deleteAssessment(id) {
    var a = state.assessments.filter(function (x) { return x.id === id; })[0];
    if (!a || state.assessments.length <= 1) return;
    if (!confirm('Supprimer définitivement « ' + assessmentLabel(a) + ' » ?')) return;
    state.assessments = state.assessments.filter(function (x) { return x.id !== id; });
    if (state.activeAssessmentId === id) state.activeAssessmentId = state.assessments[0].id;
    persist(true);
    render();
  }

  function exportJson() {
    var date = new Date().toISOString().slice(0, 10);
    download('barometre-' + slug(state.organization.name) + '-' + date + '.json', JSON.stringify(state, null, 2), 'application/json');
  }

  function importJson(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var imported = Store.normalize(JSON.parse(reader.result));
        if (!confirm('Remplacer les données actuelles par celles de « ' + (imported.organization.name || file.name) + ' » ?')) return;
        state = imported;
        ui.compareWith = null;
        persist(true);
        render();
      } catch (err) {
        alert('Import impossible : ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function exportResults() {
    var a = activeAssessment();
    var r = S.computeScores(F, a.answers);
    var rows = [['Organisation', state.organization.name], ['Diagnostic', assessmentLabel(a)], [],
      ['Pilier', 'Aspect', 'Composante', 'Note', 'Niveau', 'Commentaire']];
    F.PILLARS.forEach(function (p) {
      p.aspects.forEach(function (asp) {
        asp.components.forEach(function (c) {
          var s = a.answers[c.id];
          rows.push([p.name, asp.name, c.name, s || '', s ? F.LEVELS[s - 1].label : '', a.comments[c.id] || '']);
        });
      });
    });
    rows.push([]);
    rows.push(['Pilier', 'Aspect', '', 'Moyenne']);
    r.pillars.forEach(function (p) {
      p.aspects.forEach(function (asp) { rows.push([p.name, asp.name, '', num(asp.score)]); });
      rows.push([p.name, '(moyenne du pilier)', '', num(p.score)]);
    });
    rows.push([]);
    rows.push(['Placement total', '', '', r.total + ' / ' + r.maxTotal]);
    rows.push(['Indice moyen de développement', '', '', num(r.index)]);
    download('resultats-' + slug(state.organization.name) + '-' + a.year + '.csv', csv(rows), 'text/csv;charset=utf-8');
  }

  function exportPlan() {
    var a = activeAssessment();
    var header = ['Pilier', 'Aspect', 'Composante', 'Note', 'Défis', 'Activités', 'Responsable', 'Ressources disponibles',
      'Ressources anticipées', 'Indicateur', 'Base', 'Cible', 'Priorité', 'Source de vérification'];
    for (var m = 1; m <= Store.MONTHS; m++) header.push('M' + m);
    var rows = [header];
    F.PILLARS.forEach(function (p) {
      p.aspects.forEach(function (asp) {
        asp.components.forEach(function (c) {
          var it = a.plan[c.id];
          if (!it) return;
          rows.push([p.name, asp.name, c.name, a.answers[c.id] || '', it.challenge, it.activities, it.lead,
            it.resourcesAvailable, it.resourcesAnticipated, it.indicator, it.baseline, it.target, it.priority, it.verification]
            .concat(it.months.map(function (on) { return on ? 'x' : ''; })));
        });
      });
    });
    download('plan-renforcement-' + slug(state.organization.name) + '-' + a.year + '.csv', csv(rows), 'text/csv;charset=utf-8');
  }

  function num(v) { return v === null ? '' : v.toFixed(2).replace('.', ','); }

  render();
})();
