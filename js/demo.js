/*
 * Demo data for testing the tool: three fictitious organisations with
 * different profiles, one of them with two assessments to show the
 * comparison. Loading the demo again replaces the demo organisations only.
 */
(function (root) {
  'use strict';

  var isNode = typeof module !== 'undefined' && module.exports;
  var F = isNode ? require('./framework.js') : root.BarometerFramework;
  var Store = isNode ? require('./storage.js') : root.BarometerStorage;
  var Plan = isNode ? require('./plan.js') : root.BarometerPlan;

  function answers(fn) {
    var out = {};
    F.allComponents().forEach(function (e, i) { out[e.component.id] = fn(e, i); });
    return out;
  }

  function assessment(seq, year, ans, startMonth) {
    var a = Store.newAssessment(seq, year);
    a.id = 'demo-a-' + seq + '-' + year + '-' + Math.random().toString(36).slice(2, 6);
    a.answers = ans;
    a.plan.startMonth = startMonth || '';
    Plan.syncStandardActivities(F, a);
    return a;
  }

  function org(id, profile, assessments) {
    var o = Store.newOrg(profile.name);
    o.id = id;
    Object.keys(profile).forEach(function (k) { o.organization[k] = profile[k]; });
    o.assessments = assessments;
    o.activeAssessmentId = assessments[assessments.length - 1].id;
    return o;
  }

  function build(lang) {
    var en = lang === 'en';

    // 1. Young network: weak systems and finances, strong mission and team spirit.
    var a1 = assessment(1, 2025, answers(function (e, i) {
      if (e.pillar.id === 'fin') return 1 + (i % 2);
      if (e.pillar.id === 'plan') return [1, 2, 2, 3][i % 4];
      if (e.aspect.id === 'gov-mission') return 3;
      return [2, 3, 2][i % 3];
    }), '2025-07');
    var a2 = assessment(2, 2026, answers(function (e, i) {
      var before = a1.answers[e.component.id];
      return Math.min(4, before + (i % 3 === 0 ? 0 : 1));
    }), '2026-07');
    a2.comments['fin-management-audit'] = en ? 'First external audit completed in March 2026.' : 'Premier audit externe réalisé en mars 2026.';
    a2.plan.challenges['fin-vulnerability-diversity'] = en
      ? 'Reduce dependence on the main donor (currently 75% of the budget).'
      : 'Réduire la dépendance au principal bailleur (75 % du budget actuellement).';
    a2.plan.activities.slice(0, 3).forEach(function (act, i) {
      act.status = ['done', 'ongoing', 'ongoing'][i];
      act.lead = en ? 'Executive director' : 'Directrice exécutive';
      act.edited = true;
    });
    var own = Plan.addCustomActivity(F, a2, 'fin-vulnerability-own');
    own.title = en ? 'Launch a paid training offer for member groups' : 'Lancer une offre de formation payante pour les groupements membres';
    own.lead = en ? 'Training officer' : 'Responsable formation';
    own.start = 4; own.end = 12; own.target = en ? '6 paid sessions per year' : '6 sessions payantes par an';
    var general = Plan.addCustomActivity(F, a2, null);
    general.title = en ? 'Hold the annual general assembly' : 'Tenir l’assemblée générale annuelle';
    general.start = 11; general.end = 11; general.status = 'planned';

    var o1 = org('demo-org-1', {
      name: en ? 'Women Farmers Network (demo)' : 'Réseau des Femmes Agricultrices (démo)',
      acronym: 'RFA', type: en ? 'Network of associations' : 'Réseau d’associations', region: 'Analamanga',
      address: 'Antananarivo', focalPoint: 'Hanta R.', phone: '+261 34 00 000 01', email: 'contact@example.org'
    }, [a1, a2]);

    // 2. Well-established NGO: mostly strong, a few opportunities.
    var o2 = org('demo-org-2', {
      name: en ? 'Green Coast NGO (demo)' : 'ONG Côte Verte (démo)',
      acronym: 'OCV', type: en ? 'NGO' : 'ONG', region: 'Atsinanana', focalPoint: 'Jean-Marc T.'
    }, [assessment(1, 2026, answers(function (e, i) { return [4, 4, 3, 4, 3][i % 5]; }), '2026-09')]);

    // 3. Community association: assessment in progress (partly answered).
    var partial = answers(function (e, i) { return [2, 1, 3, 2][i % 4]; });
    F.allComponents().forEach(function (e) { if (e.pillar.id === 'fin') delete partial[e.component.id]; });
    var o3 = org('demo-org-3', {
      name: en ? 'Youth for Change Association (demo)' : 'Association Jeunes pour le Changement (démo)',
      acronym: 'AJC', type: en ? 'Community association' : 'Association communautaire', region: 'Boeny', focalPoint: 'Fara N.'
    }, [assessment(1, 2026, partial, '')]);

    return [o1, o2, o3];
  }

  var Demo = { build: build };

  if (isNode) {
    module.exports = Demo;
  } else {
    root.BarometerDemo = Demo;
  }
})(this);
