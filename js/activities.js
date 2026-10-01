/*
 * Standard activity library used to pre-fill the strengthening workplan.
 *
 * For each component, three kinds of activities:
 *   address     - weakness to address (component scored 1 or 2)
 *   opportunity - opportunity to catch (scored 3: one step from the top)
 *   maintain    - strength to maintain (scored 4)
 *
 * Each activity: { title: {fr,en}, indicator: {fr,en}, months: [start, end] }.
 * `months` is optional; defaults come from DEFAULT_MONTHS.
 * Organisations can edit, remove or add their own activities in the app.
 */
(function (root) {
  'use strict';

  var DEFAULT_MONTHS = {
    address: [[1, 6], [3, 9], [6, 12]],
    opportunity: [[4, 10], [6, 12]],
    maintain: [[1, 12]]
  };

  function a(fr, en, ifr, ien, months) {
    return { title: { fr: fr, en: en }, indicator: { fr: ifr, en: ien }, months: months };
  }

  var LIBRARY = {
    'gov-board-role': {
      address: [
        a("Rédiger et adopter une charte du Conseil précisant les rôles du CA et de la Direction Exécutive",
          'Draft and adopt a Board charter defining the roles of the Board and the Executive Management',
          'Charte du Conseil adoptée en réunion du CA', 'Board charter adopted at a Board meeting'),
        a("Organiser une session d'orientation des administrateurs sur la gouvernance associative",
          'Hold an induction session for board members on non-profit governance',
          "Nombre d'administrateurs formés", 'Number of board members trained')
      ],
      opportunity: [
        a("Impliquer le Conseil dans le plaidoyer et la construction de partenariats externes",
          'Involve the Board in advocacy and in building external partnerships',
          'Nombre de partenariats initiés par des administrateurs', 'Number of partnerships initiated by board members')
      ],
      maintain: [
        a("Revoir annuellement la charte du Conseil et l'auto-évaluation du CA",
          'Review the Board charter and Board self-assessment every year',
          'Revue annuelle réalisée', 'Annual review completed')
      ]
    },
    'gov-board-effectiveness': {
      address: [
        a("Établir un calendrier de réunions statutaires et en assurer le suivi (PV, décisions)",
          'Set a calendar of statutory meetings and track it (minutes, decisions)',
          'Nombre de réunions tenues avec PV', 'Number of meetings held with minutes'),
        a("Créer des comités du Conseil (finances, collecte de fonds) avec des termes de référence",
          'Set up Board committees (finance, fundraising) with terms of reference',
          'Comités créés avec TDR', 'Committees set up with ToR')
      ],
      opportunity: [
        a("Fixer à chaque administrateur un objectif de mobilisation de ressources",
          'Give each board member a resource mobilisation target',
          'Montant mobilisé par le Conseil', 'Amount raised by the Board')
      ],
      maintain: [
        a("Suivre la participation et les contributions des administrateurs dans le rapport annuel",
          "Report board members' attendance and contributions in the annual report",
          'Taux de participation aux réunions', 'Meeting attendance rate')
      ]
    },
    'gov-board-members': {
      address: [
        a("Réaliser une cartographie des compétences du Conseil et identifier les manques",
          'Map Board skills and identify gaps',
          'Matrice des compétences du CA disponible', 'Board skills matrix available'),
        a("Définir une procédure de sélection et de renouvellement des administrateurs",
          'Define a procedure for selecting and renewing board members',
          'Procédure adoptée', 'Procedure adopted')
      ],
      opportunity: [
        a("Recruter de nouveaux administrateurs selon les compétences manquantes",
          'Recruit new board members to fill skill gaps',
          'Nombre de nouveaux administrateurs recrutés', 'Number of new board members recruited')
      ],
      maintain: [
        a("Mettre à jour la matrice des compétences à chaque renouvellement du Conseil",
          'Update the skills matrix at each Board renewal',
          'Matrice mise à jour', 'Matrix updated')
      ]
    },
    'gov-mission-statement': {
      address: [
        a("Organiser un atelier participatif de formulation de la vision et de la mission",
          'Hold a participatory workshop to formulate the vision and mission',
          'Énoncé de mission validé par le CA', 'Mission statement validated by the Board'),
        a("Vérifier la cohérence du portefeuille de projets avec la mission",
          'Check the consistency of the project portfolio with the mission',
          '% de projets alignés sur la mission', '% of projects aligned with the mission')
      ],
      opportunity: [
        a("Diffuser la mission auprès du personnel et des partenaires (affichage, site, documents)",
          'Communicate the mission to staff and partners (posters, website, documents)',
          '% du personnel capable d’énoncer la mission', '% of staff able to state the mission')
      ],
      maintain: [
        a("Réexaminer la mission lors de chaque cycle de planification stratégique",
          'Review the mission at each strategic planning cycle',
          'Mission revue dans le plan stratégique', 'Mission reviewed in the strategic plan')
      ]
    },
    'gov-autonomy-level': {
      address: [
        a("Identifier et approcher au moins deux nouveaux bailleurs ou partenaires",
          'Identify and approach at least two new donors or partners',
          'Nombre de nouveaux contacts / propositions soumises', 'Number of new contacts / proposals submitted'),
        a("Élaborer une stratégie de mobilisation de ressources validée par le Conseil",
          'Develop a resource mobilisation strategy validated by the Board',
          'Stratégie validée', 'Strategy validated')
      ],
      opportunity: [
        a("Développer des financements du secteur privé ou publics nationaux",
          'Develop private-sector or national public funding',
          'Part des fonds hors bailleurs internationaux', 'Share of funds outside international donors')
      ],
      maintain: [
        a("Suivre chaque année la répartition des sources de financement",
          'Monitor the breakdown of funding sources every year',
          'Tableau des sources de financement à jour', 'Funding source table up to date')
      ]
    },
    'gov-leadership-board': {
      address: [
        a("Partager les responsabilités de leadership entre fondateurs et administrateurs (délégations écrites)",
          'Share leadership responsibilities between founders and board members (written delegations)',
          'Délégations formalisées', 'Delegations formalised'),
        a("Associer les administrateurs à la préparation des orientations annuelles",
          'Involve board members in preparing annual orientations',
          'Nombre d’administrateurs impliqués', 'Number of board members involved')
      ],
      opportunity: [
        a("Mettre en place un plan de relève pour les postes clés du Conseil",
          'Put in place a succession plan for key Board positions',
          'Plan de relève adopté', 'Succession plan adopted')
      ],
      maintain: [
        a("Organiser une retraite annuelle du Conseil sur la vision",
          'Hold an annual Board retreat on the vision',
          'Retraite tenue', 'Retreat held')
      ]
    },
    'gov-leadership-team': {
      address: [
        a("Instaurer des réunions d'équipe régulières associant le personnel aux décisions",
          'Introduce regular team meetings involving staff in decisions',
          'Nombre de réunions d’équipe tenues', 'Number of team meetings held'),
        a("Documenter les fonctions clés pour réduire la dépendance à une seule personne",
          'Document key functions to reduce dependence on a single person',
          'Fiches de fonctions clés disponibles', 'Key function sheets available')
      ],
      opportunity: [
        a("Préparer un plan de succession pour la direction exécutive",
          'Prepare a succession plan for the executive management',
          'Plan de succession validé', 'Succession plan validated')
      ],
      maintain: [
        a("Faire tourner l'animation des réunions et des projets au sein de l'équipe",
          'Rotate meeting and project leadership within the team',
          'Nombre de membres ayant piloté un projet', 'Number of staff who led a project')
      ]
    },
    'plan-planning-clarity': {
      address: [
        a("Élaborer un plan stratégique de 3 à 5 ans basé sur la mission",
          'Develop a 3-5 year strategic plan based on the mission',
          'Plan stratégique adopté', 'Strategic plan adopted'),
        a("Aligner le plan annuel sur les axes du plan stratégique",
          'Align the annual plan with the strategic plan priorities',
          'Plan annuel structuré selon les axes stratégiques', 'Annual plan structured by strategic priorities')
      ],
      opportunity: [
        a("Instituer une revue à mi-parcours du plan stratégique",
          'Introduce a mid-term review of the strategic plan',
          'Revue à mi-parcours réalisée', 'Mid-term review completed')
      ],
      maintain: [
        a("Réviser annuellement le plan stratégique avec les partenaires",
          'Review the strategic plan with partners every year',
          'Revue annuelle réalisée', 'Annual review completed')
      ]
    },
    'plan-planning-participation': {
      address: [
        a("Organiser des ateliers de planification avec le personnel",
          'Hold planning workshops with staff',
          '% du personnel ayant participé', '% of staff who took part'),
        a("Collecter les attentes des membres avant chaque planification",
          'Collect members’ expectations before each planning exercise',
          'Synthèse des consultations disponible', 'Consultation summary available')
      ],
      opportunity: [
        a("Associer des représentants des bénéficiaires aux décisions de planification",
          'Involve beneficiary representatives in planning decisions',
          'Nombre de bénéficiaires impliqués', 'Number of beneficiaries involved')
      ],
      maintain: [
        a("Restituer le plan adopté aux membres et au personnel",
          'Share the adopted plan with members and staff',
          'Restitution réalisée', 'Feedback session held')
      ]
    },
    'plan-planning-resources': {
      address: [
        a("Chiffrer les besoins en ressources (humaines, financières, matérielles) de chaque objectif",
          'Cost the resource needs (human, financial, material) of each objective',
          'Plan budgétisé par objectif', 'Plan budgeted by objective'),
        a("Réaliser une analyse du contexte et des risques (FFOM / SWOT)",
          'Carry out a context and risk analysis (SWOT)',
          'Analyse FFOM réalisée', 'SWOT analysis completed')
      ],
      opportunity: [
        a("Prévoir une révision semestrielle du plan selon l'exécution",
          'Schedule a six-monthly plan revision based on implementation',
          'Révision semestrielle effectuée', 'Six-monthly revision done')
      ],
      maintain: [
        a("Mettre à jour le registre des risques à chaque révision du plan",
          'Update the risk register at each plan revision',
          'Registre des risques à jour', 'Risk register up to date')
      ]
    },
    'plan-planning-workplan': {
      address: [
        a("Introduire un modèle standard de plan de travail trimestriel",
          'Introduce a standard quarterly workplan template',
          'Plans de travail trimestriels produits', 'Quarterly workplans produced'),
        a("Former le personnel à l'utilisation du plan de travail",
          'Train staff to use the workplan',
          'Nombre d’employés formés', 'Number of staff trained')
      ],
      opportunity: [
        a("Faire le point mensuel sur l'avancement du plan de travail et l'ajuster",
          'Review workplan progress monthly and adjust it',
          'Nombre de revues mensuelles', 'Number of monthly reviews')
      ],
      maintain: [
        a("Archiver et capitaliser les plans de travail et leur taux d'exécution",
          'Archive workplans and track their completion rate',
          "Taux d'exécution du plan de travail", 'Workplan completion rate')
      ]
    },
    'plan-participative-delegation': {
      address: [
        a("Établir une matrice de délégation des décisions (qui décide quoi)",
          'Establish a decision delegation matrix (who decides what)',
          'Matrice de délégation adoptée', 'Delegation matrix adopted'),
        a("Mettre en place un mécanisme de recueil des avis des membres",
          'Set up a mechanism to collect members’ views',
          'Mécanisme opérationnel', 'Mechanism operational')
      ],
      opportunity: [
        a("Déléguer la gestion budgétaire des activités aux responsables de projets",
          'Delegate activity budget management to project managers',
          'Nombre de responsables avec délégation budgétaire', 'Number of managers with budget delegation')
      ],
      maintain: [
        a("Revoir la matrice de délégation lors des changements d'organigramme",
          'Review the delegation matrix whenever the organisation chart changes',
          'Matrice à jour', 'Matrix up to date')
      ]
    },
    'plan-participative-transparency': {
      address: [
        a("Définir et publier les critères de décision pour les sujets clés",
          'Define and publish decision criteria for key topics',
          'Critères publiés', 'Criteria published'),
        a("Diffuser les comptes rendus de décisions au personnel",
          'Share decision minutes with staff',
          '% des décisions communiquées', '% of decisions communicated')
      ],
      opportunity: [
        a("Associer le personnel aux comités de décision pertinents",
          'Include staff in relevant decision committees',
          'Nombre de comités incluant du personnel', 'Number of committees including staff')
      ],
      maintain: [
        a("Évaluer annuellement la perception de transparence par le personnel",
          'Survey staff perception of transparency every year',
          'Score de l’enquête interne', 'Internal survey score')
      ]
    },
    'plan-participative-staff': {
      address: [
        a("Rédiger ou actualiser les descriptions de poste de tout le personnel",
          'Write or update job descriptions for all staff',
          '% de postes avec description à jour', '% of positions with an up-to-date job description'),
        a("Diffuser un organigramme clair et à jour",
          'Share a clear and current organisation chart',
          'Organigramme diffusé', 'Organisation chart shared')
      ],
      opportunity: [
        a("Mettre en place des groupes de travail internes animés par le personnel",
          'Set up internal working groups led by staff',
          'Nombre de groupes actifs', 'Number of active groups')
      ],
      maintain: [
        a("Revoir les descriptions de poste lors des évaluations annuelles",
          'Review job descriptions during annual appraisals',
          'Descriptions revues', 'Job descriptions reviewed')
      ]
    },
    'plan-participative-communication': {
      address: [
        a("Instaurer une réunion d'équipe hebdomadaire ou mensuelle avec compte rendu",
          'Introduce a weekly or monthly team meeting with minutes',
          'Nombre de réunions avec compte rendu', 'Number of meetings with minutes'),
        a("Mettre en place des outils de partage d'information (tableau, messagerie, dossier partagé)",
          'Set up information-sharing tools (board, messaging, shared folder)',
          'Outils en place et utilisés', 'Tools in place and used')
      ],
      opportunity: [
        a("Élaborer un plan de communication interne",
          'Develop an internal communication plan',
          'Plan de communication interne adopté', 'Internal communication plan adopted')
      ],
      maintain: [
        a("Évaluer périodiquement la circulation de l'information",
          'Periodically assess the flow of information',
          'Évaluation réalisée', 'Assessment completed')
      ]
    },
    'plan-systems-hr': {
      address: [
        a("Élaborer un manuel de gestion du personnel (recrutement, contrats, congés, évaluation)",
          'Develop a personnel manual (recruitment, contracts, leave, appraisal)',
          'Manuel RH adopté', 'HR manual adopted'),
        a("Constituer un dossier individuel complet pour chaque employé",
          'Build a complete personnel file for each employee',
          '% de dossiers complets', '% of complete files')
      ],
      opportunity: [
        a("Former les responsables à l'application des procédures RH",
          'Train managers to apply HR procedures',
          'Nombre de responsables formés', 'Number of managers trained')
      ],
      maintain: [
        a("Mettre à jour le manuel RH selon la législation du travail",
          'Update the HR manual in line with labour law',
          'Manuel mis à jour', 'Manual updated')
      ]
    },
    'plan-systems-files': {
      address: [
        a("Définir un plan de classement (physique et numérique) commun",
          'Define a common filing plan (paper and digital)',
          'Plan de classement adopté', 'Filing plan adopted'),
        a("Mettre en place une sauvegarde régulière des fichiers numériques",
          'Set up regular backups of digital files',
          'Fréquence des sauvegardes', 'Backup frequency')
      ],
      opportunity: [
        a("Combler les lacunes d’archivage identifiées (contrats, rapports, pièces comptables)",
          'Fill identified archiving gaps (contracts, reports, accounting records)',
          '% de dossiers complets', '% of complete records')
      ],
      maintain: [
        a("Contrôler annuellement l'état des archives",
          'Check the state of archives every year',
          'Contrôle réalisé', 'Check completed')
      ]
    },
    'plan-systems-procedures': {
      address: [
        a("Formaliser les procédures administratives clés (achats, déplacements, logistique)",
          'Formalise key administrative procedures (procurement, travel, logistics)',
          'Procédures validées', 'Procedures validated'),
        a("Compiler les procédures dans un manuel administratif",
          'Compile procedures into an administrative manual',
          'Manuel disponible', 'Manual available')
      ],
      opportunity: [
        a("Former le personnel au manuel et l'utiliser lors des contrôles",
          'Train staff on the manual and use it during checks',
          'Nombre d’employés formés', 'Number of staff trained')
      ],
      maintain: [
        a("Réviser le manuel administratif tous les deux ans",
          'Revise the administrative manual every two years',
          'Version révisée', 'Revised version')
      ]
    },
    'plan-me-decisions': {
      address: [
        a("Élaborer un cadre de suivi-évaluation (indicateurs, outils de collecte, responsabilités)",
          'Develop an M&E framework (indicators, data collection tools, responsibilities)',
          'Cadre de S&E adopté', 'M&E framework adopted'),
        a("Désigner un point focal suivi-évaluation",
          'Appoint an M&E focal point',
          'Point focal désigné', 'Focal point appointed')
      ],
      opportunity: [
        a("Présenter les données de suivi lors des réunions de direction",
          'Present monitoring data at management meetings',
          'Nombre de décisions basées sur les données', 'Number of data-informed decisions')
      ],
      maintain: [
        a("Réaliser une évaluation externe à chaque fin de cycle stratégique",
          'Commission an external evaluation at the end of each strategic cycle',
          'Évaluation réalisée', 'Evaluation completed')
      ]
    },
    'plan-me-feedback': {
      address: [
        a("Mettre en place un mécanisme simple de retour des membres (enquête, boîte à suggestions)",
          'Set up a simple member feedback mechanism (survey, suggestion box)',
          'Nombre de retours reçus', 'Number of feedback items received'),
        a("Restituer les résultats des évaluations aux membres",
          'Share evaluation results with members',
          'Restitution organisée', 'Feedback session held')
      ],
      opportunity: [
        a("Organiser une consultation annuelle des membres",
          'Organise an annual member consultation',
          'Consultation tenue', 'Consultation held')
      ],
      maintain: [
        a("Publier les actions prises suite aux retours des membres",
          'Publish actions taken in response to member feedback',
          'Rapport publié', 'Report published')
      ]
    },
    'hr-skills-match': {
      address: [
        a("Réaliser un diagnostic des compétences nécessaires vs disponibles",
          'Assess required versus available skills',
          'Diagnostic des compétences réalisé', 'Skills assessment completed'),
        a("Recruter ou mobiliser des expertises externes sur les compétences critiques",
          'Recruit or mobilise external expertise for critical skills',
          'Nombre de compétences critiques couvertes', 'Number of critical skills covered')
      ],
      opportunity: [
        a("Constituer un fichier d'experts externes de référence",
          'Build a roster of reference external experts',
          'Fichier d’experts disponible', 'Expert roster available')
      ],
      maintain: [
        a("Valoriser l'expertise de l'organisation auprès d'autres organisations",
          "Offer the organisation's expertise to other organisations",
          "Nombre d'appuis fournis à d'autres organisations", 'Number of support missions to other organisations')
      ]
    },
    'hr-development-strategy': {
      address: [
        a("Réaliser une évaluation des besoins en renforcement des capacités du personnel",
          'Carry out a staff capacity-building needs assessment',
          'Évaluation des besoins disponible', 'Needs assessment available'),
        a("Élaborer un plan de développement du personnel lié à la mission",
          'Develop a staff development plan linked to the mission',
          'Plan adopté', 'Plan adopted')
      ],
      opportunity: [
        a("Introduire des plans de carrière individuels",
          'Introduce individual career plans',
          '% du personnel avec plan de carrière', '% of staff with a career plan')
      ],
      maintain: [
        a("Actualiser annuellement le plan de développement du personnel",
          'Update the staff development plan every year',
          'Plan actualisé', 'Plan updated')
      ]
    },
    'hr-development-training': {
      address: [
        a("Élaborer un plan de formation annuel budgétisé",
          'Develop a budgeted annual training plan',
          'Plan de formation adopté', 'Training plan adopted'),
        a("Organiser des formations sur les besoins prioritaires",
          'Deliver training on priority needs',
          'Nombre de personnes formées', 'Number of people trained')
      ],
      opportunity: [
        a("Évaluer l'effet des formations sur la performance",
          'Assess the effect of training on performance',
          'Évaluation post-formation réalisée', 'Post-training assessment completed')
      ],
      maintain: [
        a("Réserver une ligne budgétaire formation dans chaque projet",
          'Reserve a training budget line in every project',
          '% des projets avec ligne formation', '% of projects with a training line')
      ]
    },
    'hr-development-mentoring': {
      address: [
        a("Organiser des entretiens réguliers de suivi entre responsables et employés",
          'Hold regular follow-up meetings between managers and staff',
          'Nombre d’entretiens réalisés', 'Number of meetings held'),
        a("Identifier des personnes ressources pour l'accompagnement des nouveaux employés",
          'Identify resource persons to support new staff',
          'Binômes constitués', 'Pairs set up')
      ],
      opportunity: [
        a("Mettre en place un programme de mentorat interne formalisé",
          'Set up a formal internal mentoring programme',
          'Nombre de binômes de mentorat', 'Number of mentoring pairs')
      ],
      maintain: [
        a("Inclure l'appui aux collègues dans les objectifs individuels",
          'Include peer support in individual objectives',
          '% des objectifs incluant l’appui', '% of objectives including peer support')
      ]
    },
    'hr-development-motivation': {
      address: [
        a("Mettre en place un système formel d'évaluation annuelle du personnel",
          'Introduce a formal annual staff appraisal system',
          '% du personnel évalué', '% of staff appraised'),
        a("Définir des mesures de reconnaissance et de prévention du surmenage",
          'Define recognition and burn-out prevention measures',
          'Mesures adoptées', 'Measures adopted')
      ],
      opportunity: [
        a("Fixer les objectifs individuels de façon participative",
          'Set individual objectives in a participatory way',
          '% d’objectifs co-construits', '% of jointly set objectives')
      ],
      maintain: [
        a("Mesurer annuellement la satisfaction du personnel",
          'Measure staff satisfaction every year',
          'Taux de satisfaction', 'Satisfaction rate')
      ]
    },
    'fin-management-planning': {
      address: [
        a("Élaborer un budget annuel global de l'organisation (tous projets confondus)",
          'Prepare an overall annual organisational budget (all projects)',
          'Budget global adopté par le CA', 'Overall budget adopted by the Board'),
        a("Former l'équipe à l'élaboration et au suivi budgétaire",
          'Train the team in budgeting and budget monitoring',
          'Nombre de personnes formées', 'Number of people trained')
      ],
      opportunity: [
        a("Piloter la gestion à partir d'un budget pluriannuel et de suivis trimestriels",
          'Manage from a multi-year budget with quarterly monitoring',
          'Suivis budgétaires trimestriels produits', 'Quarterly budget reports produced')
      ],
      maintain: [
        a("Réviser le budget maître à mi-année",
          'Revise the master budget at mid-year',
          'Révision réalisée', 'Revision completed')
      ]
    },
    'fin-management-control': {
      address: [
        a("Rédiger un manuel de procédures financières (séparation des tâches, autorisations)",
          'Write a financial procedures manual (segregation of duties, approvals)',
          'Manuel financier adopté', 'Financial manual adopted'),
        a("Mettre en place les rapprochements bancaires mensuels",
          'Introduce monthly bank reconciliations',
          'Rapprochements mensuels réalisés', 'Monthly reconciliations done')
      ],
      opportunity: [
        a("Organiser des contrôles internes périodiques",
          'Organise periodic internal checks',
          'Nombre de contrôles réalisés', 'Number of checks carried out')
      ],
      maintain: [
        a("Mettre à jour le manuel financier et former les nouveaux arrivants",
          'Update the financial manual and train newcomers',
          'Manuel à jour', 'Manual up to date')
      ]
    },
    'fin-management-reporting': {
      address: [
        a("Adopter des modèles standard de rapports financiers",
          'Adopt standard financial report templates',
          'Modèles adoptés', 'Templates adopted'),
        a("Établir un calendrier de production des rapports financiers",
          'Set a calendar for producing financial reports',
          '% de rapports remis à temps', '% of reports submitted on time')
      ],
      opportunity: [
        a("Produire un tableau de bord financier consolidé pour la direction",
          'Produce a consolidated financial dashboard for management',
          'Tableau de bord mensuel produit', 'Monthly dashboard produced')
      ],
      maintain: [
        a("Publier un rapport financier annuel",
          'Publish an annual financial report',
          'Rapport publié', 'Report published')
      ]
    },
    'fin-management-audit': {
      address: [
        a("Faire réaliser un audit externe des comptes",
          'Commission an external audit of the accounts',
          'Rapport d’audit disponible', 'Audit report available'),
        a("Budgétiser l'audit annuel dans les projets",
          'Budget the annual audit in projects',
          'Ligne audit budgétisée', 'Audit line budgeted')
      ],
      opportunity: [
        a("Fixer une périodicité annuelle et un plan de suivi des recommandations d'audit",
          'Set an annual audit cycle and a follow-up plan for audit recommendations',
          '% de recommandations mises en œuvre', '% of recommendations implemented')
      ],
      maintain: [
        a("Suivre la mise en œuvre des recommandations d'audit au CA",
          'Report progress on audit recommendations to the Board',
          'Point au CA réalisé', 'Board update done')
      ]
    },
    'fin-management-segregation': {
      address: [
        a("Ouvrir des codes analytiques (ou comptes) séparés par projet",
          'Open separate analytical codes (or accounts) per project',
          'Codes analytiques en place', 'Analytical codes in place'),
        a("Former le comptable à la comptabilité analytique par projet",
          'Train the accountant in project-based cost accounting',
          'Formation réalisée', 'Training completed')
      ],
      opportunity: [
        a("Mettre en place des contrôles empêchant les financements croisés entre projets",
          'Introduce controls preventing cross-financing between projects',
          'Nombre de financements croisés détectés', 'Number of cross-financing cases detected')
      ],
      maintain: [
        a("Vérifier trimestriellement les soldes par projet",
          'Check balances by project every quarter',
          'Vérifications trimestrielles faites', 'Quarterly checks done')
      ]
    },
    'fin-vulnerability-diversity': {
      address: [
        a("Cartographier les bailleurs et partenaires financiers potentiels",
          'Map potential donors and funding partners',
          'Cartographie disponible', 'Mapping available'),
        a("Soumettre des propositions de projet à de nouveaux bailleurs",
          'Submit project proposals to new donors',
          'Nombre de propositions soumises', 'Number of proposals submitted')
      ],
      opportunity: [
        a("Fixer un objectif de part maximale par bailleur et le suivre",
          'Set and monitor a maximum share per donor',
          'Part du premier bailleur', 'Share of the largest donor')
      ],
      maintain: [
        a("Mettre à jour annuellement la stratégie de diversification",
          'Update the diversification strategy every year',
          'Stratégie mise à jour', 'Strategy updated')
      ]
    },
    'fin-vulnerability-own': {
      address: [
        a("Mettre en place ou réactiver les cotisations des membres",
          'Introduce or revive member fees',
          'Montant des cotisations collectées', 'Amount of fees collected'),
        a("Identifier des services ou prestations génératrices de revenus",
          'Identify income-generating services',
          'Nombre de services identifiés', 'Number of services identified')
      ],
      opportunity: [
        a("Élaborer et mettre en œuvre une stratégie de ressources propres",
          'Develop and implement an own-resources strategy',
          '% des dépenses couvertes par les ressources propres', '% of expenditure covered by own resources')
      ],
      maintain: [
        a("Rendre compte annuellement des ressources propres mobilisées",
          'Report annually on own resources mobilised',
          'Rapport annuel', 'Annual report')
      ]
    },
    'fin-sustainability-level': {
      address: [
        a("Calculer les coûts de fonctionnement minimum de l'organisation",
          "Calculate the organisation's minimum running costs",
          'Coûts de fonctionnement chiffrés', 'Running costs calculated'),
        a("Intégrer une part de frais de structure dans chaque budget de projet",
          'Include an overhead share in every project budget',
          '% de projets avec frais de structure', '% of projects with overheads')
      ],
      opportunity: [
        a("Élaborer un plan de financement à moyen et long terme",
          'Develop a medium- and long-term funding plan',
          'Plan de financement adopté', 'Funding plan adopted')
      ],
      maintain: [
        a("Constituer et suivre un fonds de réserve",
          'Build and monitor a reserve fund',
          'Nombre de mois de fonctionnement couverts', 'Number of months of running costs covered')
      ]
    }
  };

  function get(componentId, category) {
    var entry = LIBRARY[componentId];
    var list = (entry && entry[category]) || [];
    return list.map(function (item, i) {
      var months = item.months || DEFAULT_MONTHS[category][Math.min(i, DEFAULT_MONTHS[category].length - 1)];
      return {
        key: componentId + ':' + category + ':' + i,
        title: item.title,
        indicator: item.indicator,
        months: months
      };
    });
  }

  var Activities = { LIBRARY: LIBRARY, DEFAULT_MONTHS: DEFAULT_MONTHS, get: get };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Activities;
  } else {
    root.BarometerActivities = Activities;
  }
})(this);
