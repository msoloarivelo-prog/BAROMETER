/*
 * OPI - Organisational Performance Index (performance model).
 *
 * Inspired by the structure of Pact's Organizational Performance Index:
 * 5 domains with 2 sub-domains each, 4 levels of increasing performance,
 * and tangible evidence required for every score. The level descriptions
 * below are our own wording (to be validated); they are not Pact's text.
 *
 * OPI measures PERFORMANCE (results already achieved), unlike ITOCA which
 * measures CAPACITY. It is only relevant for organisations that have
 * already implemented activities (recommended: at least 2 years).
 */
(function (root) {
  'use strict';

  function lv(fr, en) { return { fr: fr, en: en }; }

  var DOMAINS = [
    {
      id: 'opi-effectiveness',
      name: { fr: 'Efficacité', en: 'Effectiveness' },
      shortName: { fr: 'Efficacité', en: 'Effectiveness' },
      items: [
        {
          id: 'opi-eff-results',
          name: { fr: 'Atteinte des résultats', en: 'Achieving results' },
          statement: { fr: "L'organisation atteint les résultats prévus dans ses programmes et peut le démontrer.", en: 'The organisation achieves the results planned in its programmes and can demonstrate it.' },
          levels: [
            lv("Les résultats ne sont pas définis ou ne sont pas suivis ; l'organisation ne peut pas dire ce qu'elle a accompli.", 'Results are not defined or not tracked; the organisation cannot say what it has achieved.'),
            lv('Les résultats sont définis et suivis au niveau des activités (produits), mais moins de la moitié des cibles sont atteintes.', 'Results are defined and tracked at activity (output) level, but fewer than half of targets are met.'),
            lv("La plupart des cibles de produits et certains résultats (effets) sont atteints et documentés par des données de suivi.", 'Most output targets and some outcomes are achieved and documented with monitoring data.'),
            lv("Les cibles de résultats sont atteintes ou dépassées de façon constante ; les effets sur les bénéficiaires sont démontrés par des données vérifiées ou une évaluation.", 'Outcome targets are consistently met or exceeded; effects on beneficiaries are demonstrated by verified data or an evaluation.')
          ],
          actions: {
            address: lv("Définir pour chaque programme des cibles de résultats mesurables et un tableau de suivi trimestriel", 'Set measurable result targets for each programme and a quarterly tracking table'),
            opportunity: lv("Faire réaliser une évaluation des effets d'un programme clé auprès des bénéficiaires", 'Commission an outcome evaluation of a key programme with beneficiaries'),
            maintain: lv('Publier chaque année un rapport de résultats vérifiés', 'Publish a verified results report every year')
          },
          verification: lv('Rapports de suivi, rapport annuel, rapport d’évaluation', 'Monitoring reports, annual report, evaluation report')
        },
        {
          id: 'opi-eff-standards',
          name: { fr: 'Respect des normes', en: 'Meeting standards' },
          statement: { fr: "L'organisation applique des normes de qualité reconnues dans ses services et ses pratiques.", en: 'The organisation applies recognised quality standards in its services and practices.' },
          levels: [
            lv("Aucune norme de qualité n'est identifiée pour les services fournis.", 'No quality standard is identified for the services provided.'),
            lv("Des normes sont connues mais appliquées de manière irrégulière ; pas de contrôle de qualité.", 'Standards are known but applied irregularly; no quality control.'),
            lv("Les normes nationales ou sectorielles sont appliquées et contrôlées périodiquement ; les écarts sont corrigés.", 'National or sector standards are applied and checked periodically; deviations are corrected.'),
            lv("L'organisation respecte et dépasse les normes ; elle est reconnue (certification, agrément, référence) pour la qualité de ses services.", 'The organisation meets and exceeds standards; it is recognised (certification, accreditation, reference) for the quality of its services.')
          ],
          actions: {
            address: lv('Identifier les normes applicables à chaque service et former l’équipe à leur application', 'Identify the standards applicable to each service and train the team to apply them'),
            opportunity: lv('Mettre en place un contrôle qualité périodique avec plan de correction', 'Introduce periodic quality control with a correction plan'),
            maintain: lv('Engager une démarche de certification ou d’agrément', 'Start a certification or accreditation process')
          },
          verification: lv('Référentiel de normes, rapports de contrôle qualité', 'Standards reference, quality control reports')
        }
      ]
    },
    {
      id: 'opi-efficiency',
      name: { fr: 'Efficience', en: 'Efficiency' },
      shortName: { fr: 'Efficience', en: 'Efficiency' },
      items: [
        {
          id: 'opi-effi-delivery',
          name: { fr: 'Prestation de services', en: 'Service delivery' },
          statement: { fr: "L'organisation fournit ses services dans les délais et au coût prévus.", en: 'The organisation delivers its services on time and within the planned cost.' },
          levels: [
            lv("Les délais et les coûts des activités ne sont pas suivis ; des retards et dépassements fréquents sont constatés.", 'Activity timelines and costs are not tracked; frequent delays and overspending occur.'),
            lv('Les délais et les coûts sont suivis, mais moins de la moitié des activités sont réalisées dans les délais et le budget.', 'Timelines and costs are tracked, but fewer than half of activities are delivered on time and on budget.'),
            lv('La plupart des activités sont réalisées dans les délais et le budget ; les écarts sont analysés.', 'Most activities are delivered on time and on budget; variances are analysed.'),
            lv("Les services sont fournis de façon constante dans les délais et le budget ; le coût par bénéficiaire est suivi et optimisé.", 'Services are consistently delivered on time and on budget; cost per beneficiary is tracked and optimised.')
          ],
          actions: {
            address: lv('Mettre en place un suivi mensuel des délais et du budget par activité', 'Introduce monthly tracking of timelines and budget by activity'),
            opportunity: lv('Analyser les écarts trimestriels et ajuster la planification en conséquence', 'Analyse quarterly variances and adjust planning accordingly'),
            maintain: lv('Calculer et suivre le coût par bénéficiaire de chaque service', 'Calculate and track the cost per beneficiary of each service')
          },
          verification: lv('Tableaux de suivi budget/délais, rapports financiers', 'Budget/timeline tracking tables, financial reports')
        },
        {
          id: 'opi-effi-reach',
          name: { fr: 'Portée', en: 'Reach' },
          statement: { fr: "L'organisation élargit la couverture de ses services vers les populations cibles.", en: 'The organisation expands the coverage of its services to target populations.' },
          levels: [
            lv("La couverture des services n'est pas connue.", 'Service coverage is not known.'),
            lv('Le nombre de bénéficiaires est compté, mais la couverture de la population cible n’est pas estimée.', 'The number of beneficiaries is counted, but coverage of the target population is not estimated.'),
            lv('La couverture est estimée et progresse ; les zones ou groupes non couverts sont identifiés.', 'Coverage is estimated and increasing; uncovered areas or groups are identified.'),
            lv("La couverture progresse de façon continue, y compris vers les groupes les plus difficiles à atteindre, grâce à des partenariats ou de nouvelles approches.", 'Coverage grows continuously, including to the hardest-to-reach groups, through partnerships or new approaches.')
          ],
          actions: {
            address: lv('Estimer la population cible et compter les bénéficiaires atteints par zone', 'Estimate the target population and count beneficiaries reached by area'),
            opportunity: lv('Élaborer une stratégie pour atteindre les groupes et zones non couverts', 'Develop a strategy to reach uncovered groups and areas'),
            maintain: lv('Nouer des partenariats pour étendre la couverture', 'Build partnerships to extend coverage')
          },
          verification: lv('Base de données bénéficiaires, carte de couverture', 'Beneficiary database, coverage map')
        }
      ]
    },
    {
      id: 'opi-relevance',
      name: { fr: 'Pertinence', en: 'Relevance' },
      shortName: { fr: 'Pertinence', en: 'Relevance' },
      items: [
        {
          id: 'opi-rel-target',
          name: { fr: 'Populations cibles', en: 'Target population' },
          statement: { fr: "L'organisation implique ses populations cibles et répond à leurs besoins.", en: 'The organisation involves its target populations and responds to their needs.' },
          levels: [
            lv("Les besoins des populations cibles ne sont pas évalués ; les programmes suivent les priorités des bailleurs.", "Target populations' needs are not assessed; programmes follow donors' priorities."),
            lv('Les besoins sont évalués ponctuellement, sans implication des populations dans les décisions.', 'Needs are assessed occasionally, without involving populations in decisions.'),
            lv("Les populations cibles sont consultées régulièrement et leurs avis influencent les programmes.", 'Target populations are consulted regularly and their views shape programmes.'),
            lv("Les populations cibles participent à la conception, au suivi et à l'évaluation ; un mécanisme de retour fonctionne et leur satisfaction est mesurée.", 'Target populations take part in design, monitoring and evaluation; a feedback mechanism works and their satisfaction is measured.')
          ],
          actions: {
            address: lv('Réaliser une évaluation participative des besoins avec les populations cibles', 'Carry out a participatory needs assessment with target populations'),
            opportunity: lv('Mettre en place un mécanisme de retour des bénéficiaires et y répondre', 'Set up a beneficiary feedback mechanism and act on it'),
            maintain: lv('Mesurer chaque année la satisfaction des bénéficiaires', 'Measure beneficiary satisfaction every year')
          },
          verification: lv('Rapport d’évaluation des besoins, registre des retours', 'Needs assessment report, feedback log')
        },
        {
          id: 'opi-rel-learning',
          name: { fr: 'Apprentissage', en: 'Learning' },
          statement: { fr: "L'organisation tire des leçons de son expérience et adapte ses programmes.", en: 'The organisation learns from its experience and adapts its programmes.' },
          levels: [
            lv("Aucune leçon n'est documentée ; les programmes ne changent pas malgré les difficultés.", 'No lessons are documented; programmes do not change despite difficulties.'),
            lv('Des leçons sont parfois discutées, mais rarement documentées ou appliquées.', 'Lessons are sometimes discussed but rarely documented or applied.'),
            lv('Des revues régulières documentent les leçons apprises et conduisent à des ajustements de programmes.', 'Regular reviews document lessons learned and lead to programme adjustments.'),
            lv("L'apprentissage est systématique : les leçons sont partagées avec les partenaires et l'organisation innove à partir de données probantes.", 'Learning is systematic: lessons are shared with partners and the organisation innovates based on evidence.')
          ],
          actions: {
            address: lv('Organiser une revue semestrielle des leçons apprises', 'Hold a six-monthly lessons-learned review'),
            opportunity: lv('Documenter les adaptations de programme décidées à partir des leçons', 'Document programme adaptations decided from lessons learned'),
            maintain: lv('Partager les leçons apprises avec les partenaires et réseaux', 'Share lessons learned with partners and networks')
          },
          verification: lv('Comptes rendus de revues, notes d’apprentissage', 'Review minutes, learning notes')
        }
      ]
    },
    {
      id: 'opi-sustainability',
      name: { fr: 'Durabilité', en: 'Sustainability' },
      shortName: { fr: 'Durabilité', en: 'Sustainability' },
      items: [
        {
          id: 'opi-sus-resources',
          name: { fr: 'Ressources', en: 'Resources' },
          statement: { fr: "L'organisation mobilise des ressources diversifiées qui assurent la continuité de ses activités.", en: 'The organisation mobilises diversified resources that ensure the continuity of its activities.' },
          levels: [
            lv("L'organisation dépend d'une seule source de financement et n'a pas de réserves.", 'The organisation depends on a single funding source and has no reserves.'),
            lv('Plusieurs sources existent, mais une source représente plus de 70 % du budget.', 'Several sources exist, but one provides more than 70% of the budget.'),
            lv('Aucune source ne dépasse 50 % du budget ; des ressources propres sont générées.', 'No source exceeds 50% of the budget; own resources are generated.'),
            lv("Les ressources sont diversifiées (aucune source au-dessus de 40 %), des réserves couvrent au moins 3 mois de fonctionnement et le financement est assuré pour l'année suivante.", 'Resources are diversified (no source above 40%), reserves cover at least 3 months of running costs and funding is secured for the following year.')
          ],
          actions: {
            address: lv('Soumettre des propositions à de nouveaux bailleurs et développer des ressources propres', 'Submit proposals to new donors and develop own resources'),
            opportunity: lv('Constituer un fonds de réserve équivalent à 3 mois de fonctionnement', 'Build a reserve fund equal to 3 months of running costs'),
            maintain: lv('Mettre à jour chaque année le plan de mobilisation des ressources', 'Update the resource mobilisation plan every year')
          },
          verification: lv('États financiers, répartition des sources de financement', 'Financial statements, breakdown of funding sources')
        },
        {
          id: 'opi-sus-social',
          name: { fr: 'Capital social', en: 'Social capital' },
          statement: { fr: "L'organisation entretient des relations de confiance avec les communautés, les autorités et les partenaires.", en: 'The organisation maintains relationships of trust with communities, authorities and partners.' },
          levels: [
            lv("L'organisation est peu connue et n'a pas de partenariats actifs.", 'The organisation is little known and has no active partnerships.'),
            lv('Quelques partenariats informels existent, surtout liés aux projets en cours.', 'A few informal partnerships exist, mostly linked to current projects.'),
            lv('Des partenariats formels et durables existent avec les communautés, les autorités et d’autres organisations.', 'Formal, lasting partnerships exist with communities, authorities and other organisations.'),
            lv("L'organisation est reconnue comme partenaire de référence ; elle mobilise volontaires, membres ou contributions locales.", 'The organisation is recognised as a reference partner; it mobilises volunteers, members or local contributions.')
          ],
          actions: {
            address: lv('Cartographier les parties prenantes et formaliser les partenariats clés', 'Map stakeholders and formalise key partnerships'),
            opportunity: lv('Signer des conventions de partenariat avec les autorités et les communautés', 'Sign partnership agreements with authorities and communities'),
            maintain: lv('Valoriser les contributions des membres et volontaires dans le rapport annuel', "Highlight members' and volunteers' contributions in the annual report")
          },
          verification: lv('Conventions signées, liste des partenaires', 'Signed agreements, list of partners')
        }
      ]
    },
    {
      id: 'opi-resilience',
      name: { fr: 'Résilience', en: 'Resilience' },
      shortName: { fr: 'Résilience', en: 'Resilience' },
      items: [
        {
          id: 'opi-res-adaptive',
          name: { fr: "Capacité d'adaptation", en: 'Adaptive capacity' },
          statement: { fr: "L'organisation anticipe les changements de son environnement et s'y adapte.", en: 'The organisation anticipates changes in its environment and adapts to them.' },
          levels: [
            lv("L'organisation subit les changements (crises, fin de financement) sans les anticiper.", 'The organisation suffers changes (crises, end of funding) without anticipating them.'),
            lv('Les risques principaux sont connus, mais aucune mesure de préparation n’existe.', 'Main risks are known, but no preparedness measures exist.'),
            lv('Un plan de gestion des risques existe et a permis de faire face à au moins une crise.', 'A risk management plan exists and has helped cope with at least one crisis.'),
            lv("L'organisation surveille son environnement, adapte rapidement sa stratégie et a démontré sa capacité à maintenir ses services en période de crise.", 'The organisation monitors its environment, adapts its strategy quickly and has shown it can maintain services during a crisis.')
          ],
          actions: {
            address: lv('Identifier les risques majeurs et élaborer un plan de gestion des risques', 'Identify major risks and develop a risk management plan'),
            opportunity: lv('Tester le plan de continuité par un exercice de simulation', 'Test the continuity plan through a simulation exercise'),
            maintain: lv('Mettre à jour chaque année l’analyse des risques et du contexte', 'Update the risk and context analysis every year')
          },
          verification: lv('Plan de gestion des risques, compte rendu de simulation', 'Risk management plan, simulation report')
        },
        {
          id: 'opi-res-influence',
          name: { fr: 'Influence', en: 'Influence' },
          statement: { fr: "L'organisation influence les politiques, les pratiques ou les décisions qui concernent son domaine.", en: 'The organisation influences policies, practices or decisions affecting its field.' },
          levels: [
            lv("L'organisation n'intervient pas dans les débats ou décisions qui concernent son domaine.", 'The organisation does not take part in debates or decisions affecting its field.'),
            lv("L'organisation participe à des cadres de concertation, sans influence démontrée.", 'The organisation takes part in consultation forums, without demonstrated influence.'),
            lv("Les propositions de l'organisation ont été prises en compte dans au moins une décision ou politique.", "The organisation's proposals have been taken into account in at least one decision or policy."),
            lv("L'organisation est sollicitée comme référence et a contribué à plusieurs changements de politiques ou de pratiques.", 'The organisation is consulted as a reference and has contributed to several policy or practice changes.')
          ],
          actions: {
            address: lv('Participer activement aux cadres de concertation de son secteur', 'Take an active part in sector consultation forums'),
            opportunity: lv('Élaborer une note de position fondée sur les données de terrain', 'Prepare a position paper based on field data'),
            maintain: lv('Documenter les changements de politiques obtenus et les partager', 'Document and share the policy changes achieved')
          },
          verification: lv('Notes de position, comptes rendus de réunions, textes adoptés', 'Position papers, meeting minutes, adopted texts')
        }
      ]
    }
  ];

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMAINS;
  } else {
    root.BarometerOpiData = DOMAINS;
  }
})(this);
