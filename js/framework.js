/*
 * Governance barometer framework (bilingual FR / EN).
 *
 * Faithfully reproduces sheets "1 - DIAG_GOUVERNANCE_VISION" to
 * "4 - DIAG_RESSOURCE_FINANCIERE" of the original Excel workbook
 * (17112016 OUTIL ACCOMPAGNEMENT TEFI_v1.2.0.xlsm).
 *
 * Structure: pillar -> aspect -> component -> 4 level descriptions.
 * Grouping of components into aspects follows the hidden
 * "Fiche de Calculs" sheet, which drives the averages.
 *
 * Every text is an object { fr, en }. Edit this file to adapt the tool:
 * scoring, charts, forms and reports adapt automatically.
 */
(function (root) {
  'use strict';

  var LEVELS = [
    { value: 1, label: { fr: 'Début / fondement', en: 'Start-up / foundation' } },
    { value: 2, label: { fr: 'Développement en cours', en: 'Development under way' } },
    { value: 3, label: { fr: "Expansion / consolidation de l'organisation", en: 'Expansion / consolidation' } },
    { value: 4, label: { fr: 'Développement soutenu et pérennité assurée', en: 'Sustained development and sustainability' } }
  ];

  var MAX_SCORE = 4;

  var PRIORITIES = [
    { value: 'essential', label: { fr: 'Essentiel', en: 'Essential' } },
    { value: 'important', label: { fr: 'Important', en: 'Important' } },
    { value: 'neutral', label: { fr: 'Neutre', en: 'Neutral' } }
  ];

  var SEQUENCES = [
    { value: 1, label: { fr: 'Premier diagnostic', en: 'First assessment' } },
    { value: 2, label: { fr: 'Deuxième diagnostic', en: 'Second assessment' } },
    { value: 3, label: { fr: 'Troisième diagnostic', en: 'Third assessment' } },
    { value: 4, label: { fr: 'Quatrième diagnostic', en: 'Fourth assessment' } }
  ];

  function c(id, name, levels) {
    return { id: id, name: name, levels: levels };
  }

  var PILLARS = [
    {
      id: 'gov',
      name: { fr: 'Gouvernance / Vision', en: 'Governance / Vision' },
      shortName: { fr: 'Gouvernance', en: 'Governance' },
      aspects: [
        {
          id: 'gov-board',
          name: { fr: "Conseil d'Administration", en: 'Board of Directors' },
          components: [
            c('gov-board-role', { fr: 'Rôle', en: 'Role' }, [
              { fr: 'Les rôles des membres du conseil et leur relation aux membres de la Direction Exécutive ne sont pas clairs.', en: "Board members' roles and their relationship with the Executive Management are unclear." },
              { fr: "Les membres du conseil comprennent leur rôle et comment se rapporter au directeur exécutif. Mais les contraintes interpersonnelles ou organisationnelles peuvent réduire l'efficacité du Conseil.", en: "Board members understand their role and how to relate to the executive director, but interpersonal or organisational constraints may reduce the Board's effectiveness." },
              { fr: 'Les membres du Conseil travaillent en étroite collaboration avec le directeur exécutif à formuler des politiques et un plan stratégique pour le développement.', en: 'Board members work closely with the executive director to formulate policies and a strategic development plan.' },
              { fr: "Les membres du conseil d'administration soutiennent l'organisation en faisant du lobbying et en établissant des liens avec d'autres organisations.", en: 'Board members support the organisation through advocacy and by building links with other organisations.' }
            ]),
            c('gov-board-effectiveness', { fr: 'Effectivité', en: 'Effectiveness' }, [
              { fr: 'Le Conseil est officiellement constitué, mais pas encore une force active.', en: 'The Board is formally constituted but is not yet an active force.' },
              { fr: 'Le Conseil devient actif. Un ou deux membres contribuent et / ou recherchent des ressources.', en: 'The Board is becoming active. One or two members contribute and/or seek resources.' },
              { fr: "Un momentum à bord. Des comités ont été formés, mais dans l'ensemble peu de membres sont actifs. Le Conseil arrive à réunir une quantité de ressources modérée.", en: 'Momentum on the Board. Committees have been formed but overall few members are active. The Board raises a moderate amount of resources.' },
              { fr: "Ressources importantes mobilisées par le Conseil. La plupart des membres du conseil d'administration sont suffisamment actifs.", en: 'Significant resources are mobilised by the Board. Most board members are sufficiently active.' }
            ]),
            c('gov-board-members', { fr: 'Organisation des membres', en: 'Board composition' }, [
              { fr: "Un pool de conseillers sélectionné en fonction de l'enthousiasme initial de l'organisation, pas nécessairement sur ses besoins en développement à long terme.", en: "Board members were chosen out of the organisation's initial enthusiasm, not necessarily for its long-term development needs." },
              { fr: "Les membres du Conseil sont choisis de manière plus stratégique, mais la plupart de leurs compétences ne correspondent toujours pas aux besoins croissants de l'organisation.", en: "Board members are chosen more strategically, but most of their skills still do not match the organisation's growing needs." },
              { fr: "Les compétences du Conseil correspondent aux besoins de l'organisation en développement et l'aident à avancer.", en: "The Board's skills match the needs of the developing organisation and help it move forward." },
              { fr: "Les membres du conseil d'administration sont déterminés, ont la volonté et les compétences pour le développement à long terme de l'organisation.", en: "Board members are committed and have the will and the skills for the organisation's long-term development." }
            ])
          ]
        },
        {
          id: 'gov-mission',
          name: { fr: 'Mission', en: 'Mission' },
          components: [
            c('gov-mission-statement', { fr: 'Mission', en: 'Mission' }, [
              { fr: "Pas d'énoncé de mission. Le groupe s'unit autour d'objectifs généraux, tels que l'engagement envers l'environnement, la santé ou la paix.", en: 'No mission statement. The group unites around general goals such as commitment to the environment, health or peace.' },
              { fr: "L'énoncé de mission existe, mais n'est pas ciblé. Un portefeuille diversifié de projets acquis mais pas toujours conforme à l'énoncé de mission.", en: 'A mission statement exists but is not focused. A diverse portfolio of projects, not always consistent with the mission.' },
              { fr: "L'énoncé de mission est clair et généralement conforme au portefeuille. Cependant, le personnel n'est pas uniformément capable de l'articuler et les observateurs extérieurs ne peuvent pas l'identifier.", en: 'The mission statement is clear and generally consistent with the portfolio. However, staff cannot all articulate it and outside observers cannot identify it.' },
              { fr: "Déclaration de mission claire. Elle peut être articulée par le Conseil et le personnel et est conforme au portefeuille. Les observateurs identifient toujours la même mission avec l'organisation.", en: 'Clear mission statement, articulated by Board and staff and consistent with the portfolio. Observers consistently associate the same mission with the organisation.' }
            ])
          ]
        },
        {
          id: 'gov-autonomy',
          name: { fr: 'Autonomie', en: 'Autonomy' },
          components: [
            c('gov-autonomy-level', { fr: 'Autonomie', en: 'Autonomy' }, [
              { fr: "L'organisation est un agent d'exécution d'un donateur.", en: 'The organisation is an implementing agent for one donor.' },
              { fr: "L'organisation est en mesure de répondre à plus d'un donateur et aux demandes du Conseil.", en: 'The organisation is able to respond to more than one donor and to Board requests.' },
              { fr: "L'organisation est en mesure d'obtenir des fonds pour soutenir son programme, en consultation avec le Conseil.", en: 'The organisation is able to raise funds for its own programme, in consultation with the Board.' },
              { fr: "Outre l'autonomie managériale et financière, l'organisation est capable de défendre et de recueillir des fonds en tant que représentante d'une plus vaste constituency. Les fonds sont d'origine multiple : gouvernement, donateurs et secteur privé.", en: 'Beyond managerial and financial autonomy, the organisation successfully advocates and raises funds on behalf of a wider constituency. Funds come from multiple sources: government, donors and private sector.' }
            ])
          ]
        },
        {
          id: 'gov-leadership',
          name: { fr: 'Style de leadership', en: 'Leadership style' },
          components: [
            c('gov-leadership-board', { fr: "Rôle du Conseil d'Administration ou des fondateurs", en: 'Role of the Board or founders' }, [
              { fr: 'Tout le leadership émane du ou des fondateurs de base.', en: 'All leadership comes from the founder(s).' },
              { fr: 'Le leadership vient du ou des fondateurs et d’un ou deux membres du Conseil.', en: 'Leadership comes from the founder(s) and one or two Board members.' },
              { fr: "La vision et la gestion des idées viennent de plus en plus du Conseil, ses membres travaillant plus étroitement avec l'organisation.", en: 'Vision and ideas increasingly come from the Board as its members work more closely with the organisation.' },
              { fr: "Pratiquement tous les membres contribuent au leadership et au développement de l'organisation.", en: "Virtually all members contribute to the organisation's leadership and development." }
            ]),
            c('gov-leadership-team', { fr: "Importance du travail d'équipe et du personnel", en: 'Importance of teamwork and staff' }, [
              { fr: 'Le personnel fournit uniquement une contribution technique. Les décisions sont prises par le ou les fondateurs.', en: 'Staff provide only technical input. Decisions are made by the founder(s).' },
              { fr: 'Un ou deux employés fournissent une impulsion organisationnelle, en plus du Directeur Exécutif.', en: 'One or two employees provide organisational drive in addition to the Executive Director.' },
              { fr: "La contribution du personnel est de plus en plus vitale. Le personnel et le directeur exécutif travaillent de plus en plus comme une équipe.", en: 'Staff contribution is increasingly vital. Staff and the executive director increasingly work as a team.' },
              { fr: "L'organisation survivrait sans l'actuel directeur ou le président du conseil d'administration.", en: 'The organisation would survive without its current director or board chair.' }
            ])
          ]
        }
      ]
    },
    {
      id: 'plan',
      name: { fr: 'Gestion des ressources et évaluation', en: 'Resource management and evaluation' },
      shortName: { fr: 'Planification', en: 'Planning & management' },
      aspects: [
        {
          id: 'plan-planning',
          name: { fr: 'Planification', en: 'Planning' },
          components: [
            c('plan-planning-clarity', { fr: "Clarté de la mission / identité stratégique", en: 'Mission clarity / strategic identity' }, [
              { fr: 'La planification est uniquement basée sur des aspects opportunistes.', en: 'Planning is purely opportunistic.' },
              { fr: "Les plans annuels sont élaborés et examinés au cours de l'année, souvent sans lien avec un plan stratégique à plus long terme.", en: 'Annual plans are prepared and reviewed during the year, often not linked to a longer-term strategic plan.' },
              { fr: "La planification est élargie, orientée sur le long terme (nature stratégique) et structurée autour d'une mission claire.", en: 'Planning is broader, long-term (strategic) and structured around a clear mission.' },
              { fr: "Sur la base de la mission, le plan stratégique et les plans annuels deviennent des instruments de coopération, avec un examen régulier des plans à long terme.", en: 'Based on the mission, the strategic plan and annual plans become cooperation tools, with regular review of long-term plans.' }
            ]),
            c('plan-planning-participation', { fr: 'Participation à la planification', en: 'Participation in planning' }, [
              { fr: 'La planification est top-down : Direction Exécutive, sur la base des idées du Conseil.', en: 'Planning is top-down: Executive Management, based on Board ideas.' },
              { fr: 'La participation du personnel à la planification est élargie, y compris à la planification stratégique.', en: 'Staff participation in planning is broadened, including input to strategic planning decisions.' },
              { fr: 'Les membres fournissent les informations pour la planification mais les bénéficiaires sont toujours exclus de la prise de décision.', en: 'Members provide input to planning, but beneficiaries are still excluded from decision-making.' },
              { fr: "Le personnel et/ou les membres contribuent aux décisions de planification sur le même plan que le directeur exécutif et le Conseil.", en: 'Staff and/or members contribute to planning decisions on an equal footing with the executive director and the Board.' }
            ]),
            c('plan-planning-resources', { fr: 'Utilisation efficiente des ressources', en: 'Efficient use of resources' }, [
              { fr: 'Objectifs fixés sans évaluation des besoins en ressources, ni prise en compte de facteurs externes importants.', en: 'Objectives set without assessing resource needs or considering important external factors.' },
              { fr: 'Objectifs liés aux ressources, mais des facteurs externes importants encore négligés.', en: 'Objectives linked to resources, but important external factors still overlooked.' },
              { fr: "Les plans sont basés sur les ressources et l'examen des facteurs externes, mais l'organisation ne révise pas le plan durant l'exécution.", en: 'Plans are based on resources and external factors, but the organisation does not revise them during implementation.' },
              { fr: "Les plans annuels et stratégiques sont complets, assez précis pour allouer les ressources, et assez souples pour être modifiés au besoin.", en: 'Annual and strategic plans are complete, precise enough to allocate resources and flexible enough to be adjusted when needed.' }
            ]),
            c('plan-planning-workplan', { fr: 'Plan de travail comme outil', en: 'Workplan as a tool' }, [
              { fr: "L'organisation ne produit pas de plans de travail.", en: 'The organisation does not produce workplans.' },
              { fr: "Les plans de travail sont rédigés, mais rarement utilisés par le personnel.", en: 'Workplans are written but rarely used by staff.' },
              { fr: 'Les plans de travail sont utilisés, mais pas considérés comme des instruments dynamiques à modifier au besoin.', en: 'Workplans are used but not seen as dynamic tools to be adjusted when needed.' },
              { fr: 'Les plans de travail sont considérés comme des outils utiles et sont modifiés au besoin.', en: 'Workplans are seen as useful tools and are adjusted as needed.' }
            ])
          ]
        },
        {
          id: 'plan-participative',
          name: { fr: 'Gestion participative', en: 'Participatory management' },
          components: [
            c('plan-participative-delegation', { fr: 'Délégation appropriée', en: 'Appropriate delegation' }, [
              { fr: "Les décisions viennent de la Direction Exécutive et/ou du Président, avec peu ou pas de prise en compte des retours des membres.", en: 'Decisions come from Executive Management and/or the Chair with little or no regard for members’ feedback.' },
              { fr: "La plupart des décisions de gestion sont prises par le directeur exécutif et des membres du Conseil, avec quelques apports d'un ou deux employés.", en: 'Most management decisions are made by the executive director and Board members, with some input from one or two staff.' },
              { fr: "Les décisions de gestion sont de plus en plus déléguées aux responsables hiérarchiques et d'activité.", en: 'Management decisions are increasingly delegated to line and activity managers.' },
              { fr: "Les décisions de gestion sont déléguées au niveau approprié de l'organisation.", en: 'Management decisions are delegated to the appropriate level of the organisation.' }
            ]),
            c('plan-participative-transparency', { fr: 'Prise de décision transparente', en: 'Transparent decision-making' }, [
              { fr: 'Les décisions sont imposées sans critères clairs et avec peu ou pas de retour.', en: 'Decisions are imposed without clear criteria and with little or no feedback.' },
              { fr: 'Les critères de décision sont partagés avec le Conseil, mais le personnel n’est pas inclus.', en: 'Decision criteria are shared with the Board, but staff are not included.' },
              { fr: 'La prise de décision devient transparente pour le personnel ; une certaine participation du personnel aux décisions.', en: 'Decision-making is becoming transparent to staff; some staff participation in actual decisions.' },
              { fr: 'Processus de décision transparent, avec participation complète du personnel aux décisions pertinentes.', en: 'Transparent decision-making with full staff participation in relevant decisions.' }
            ]),
            c('plan-participative-staff', { fr: 'Participation du personnel à la gestion', en: 'Staff participation in management' }, [
              { fr: 'Rôles et responsabilités du personnel peu clairs et changeants.', en: 'Staff roles and responsibilities are unclear and changing.' },
              { fr: "Rôles mieux compris, mais les modalités de participation ne sont pas toujours claires.", en: 'Roles are better understood, but ways of participating are not always clear.' },
              { fr: "Le personnel comprend clairement son rôle et la façon de participer à la gestion.", en: 'Staff clearly understand their role and how to take part in management.' },
              { fr: 'Le personnel façonne de plus en plus la manière dont il participe à la gestion.', en: 'Staff increasingly shape the way they participate in management.' }
            ]),
            c('plan-participative-communication', { fr: 'Flux de communication', en: 'Communication flows' }, [
              { fr: 'Communications internes principalement par des canaux informels.', en: 'Internal communication mainly through informal channels.' },
              { fr: 'Émergence de canaux formels pour le dialogue et la décision (réunions du personnel).', en: 'Formal channels for dialogue and decision-making are emerging (staff meetings).' },
              { fr: 'Communication verticale et horizontale ouverte. Canaux formels et informels établis et utilisés.', en: 'Open vertical and horizontal communication. Formal and informal channels established and used.' },
              { fr: "L'organisation examine périodiquement ses flux de communication pour assurer la libre circulation de l'information.", en: 'The organisation periodically reviews its communication flows to ensure free circulation of information.' }
            ])
          ]
        },
        {
          id: 'plan-systems',
          name: { fr: 'Systèmes / outils de gestion', en: 'Management systems / tools' },
          components: [
            c('plan-systems-hr', { fr: 'Gestion du personnel', en: 'Personnel management systems' }, [
              { fr: "Aucun système formel de gestion du personnel (descriptions de postes, procédures de recrutement, etc.).", en: 'No formal personnel management system (job descriptions, recruitment procedures, etc.).' },
              { fr: "Certains systèmes existent, mais des pratiques d'emploi informelles persistent.", en: 'Some systems exist, but informal employment practices persist.' },
              { fr: 'Pratiquement tous les systèmes nécessaires sont institutionnalisés.', en: 'Virtually all necessary systems are institutionalised.' },
              { fr: 'Systèmes formels et institutionnalisés, assimilés et compris par les employés.', en: 'Formal, institutionalised systems that staff understand and apply.' }
            ]),
            c('plan-systems-files', { fr: 'Gestion des fichiers et archives', en: 'Filing and records' }, [
              { fr: "Aucun système de classement formel n'existe.", en: 'No formal filing system exists.' },
              { fr: 'Les fichiers sont conservés, mais incomplets ou non sauvegardés systématiquement.', en: 'Files are kept but incomplete or not systematically backed up.' },
              { fr: 'Les fichiers sont systématiques et accessibles, mais des lacunes importantes subsistent.', en: 'Files are systematic and accessible, but significant gaps remain.' },
              { fr: 'Les fichiers sont complets, systématiques et accessibles.', en: 'Files are complete, systematic and accessible.' }
            ]),
            c('plan-systems-procedures', { fr: 'Procédures administratives', en: 'Administrative procedures' }, [
              { fr: 'Peu de procédures formalisées, ou non suivies.', en: 'Few formalised procedures, or not followed.' },
              { fr: "Procédures de plus en plus formalisées et suivies, mais pas de manuel pratique.", en: 'Procedures increasingly formalised and followed, but no practical manual.' },
              { fr: 'Manuel administratif en place, mais rangé dans un dossier plutôt qu’utilisé.', en: 'Administrative manual in place, but filed away rather than used.' },
              { fr: "Manuel mis à jour au besoin et utilisé comme instrument opérationnel.", en: 'Manual updated as needed and used as an operational tool.' }
            ])
          ]
        },
        {
          id: 'plan-me',
          name: { fr: 'Suivi et évaluation', en: 'Monitoring and evaluation' },
          components: [
            c('plan-me-decisions', { fr: 'Données de S&E dans la prise de décision', en: 'M&E data used in decision-making' }, [
              { fr: "Aucun mécanisme d'évaluation officiel n'existe.", en: 'No formal evaluation mechanism exists.' },
              { fr: "Évaluations ponctuelles, à la demande des bailleurs, menées par des personnes extérieures.", en: 'Ad hoc evaluations at donors’ request, carried out by outsiders.' },
              { fr: 'Évaluations initiées par le personnel ; certaines décisions basées sur ces données, mais la fonction S&E reste isolée.', en: 'Staff-initiated evaluations; some decisions are based on the data, but M&E remains isolated from management.' },
              { fr: "Les données d'une évaluation complète et fonctionnelle sont intégrées dans la prise de décision.", en: 'Data from a complete, functional evaluation system feed into decision-making.' }
            ]),
            c('plan-me-feedback', { fr: 'Retour des membres sur l’évaluation', en: 'Member feedback' }, [
              { fr: 'Aucun retour de la part des membres.', en: 'No feedback from members.' },
              { fr: 'Des canaux informels de retour existent.', en: 'Informal feedback channels exist.' },
              { fr: 'Des mécanismes officiels existent, mais seulement via enquêtes et évaluations.', en: 'Formal mechanisms exist, but only through surveys and evaluations.' },
              { fr: "Retour continu ; la contribution des membres est effective et tangible.", en: 'Continuous feedback; member contribution is effective and tangible.' }
            ])
          ]
        }
      ]
    },
    {
      id: 'hr',
      name: { fr: 'Ressources humaines', en: 'Human resources' },
      shortName: { fr: 'Ressources humaines', en: 'Human resources' },
      aspects: [
        {
          id: 'hr-skills',
          name: { fr: 'Compétences du personnel', en: 'Staff skills' },
          components: [
            c('hr-skills-match', { fr: 'Compétences', en: 'Skills' }, [
              { fr: 'Trop peu de personnel couvre un éventail trop vaste de compétences.', en: 'Too few staff cover too wide a range of skills.' },
              { fr: 'Des spécialistes sont recrutés pour les compétences de base (comptabilité, collecte de fonds). Des lacunes subsistent.', en: 'Specialists are hired for core skills (accounting, fundraising). Gaps remain.' },
              { fr: 'Toutes les compétences de base sont couvertes par le personnel et des experts externes.', en: 'All core skills are covered by staff and external experts.' },
              { fr: "Toutes les compétences sont couvertes et reconnues pour leur excellence ; l'organisation peut offrir son expertise à d'autres.", en: 'All skills are covered and recognised for excellence; the organisation can offer expertise to others.' }
            ])
          ]
        },
        {
          id: 'hr-development',
          name: { fr: "Développement de l'équipe", en: 'Team development' },
          components: [
            c('hr-development-strategy', { fr: 'Stratégie', en: 'Strategy' }, [
              { fr: 'Le développement des RH est opportuniste.', en: 'HR development is opportunistic.' },
              { fr: 'Le développement du personnel est prévu mais à court terme et lié aux projets.', en: 'Staff development is planned but short-term and project-driven.' },
              { fr: "Le développement du personnel repose sur une évaluation des besoins et un plan d'action cohérent avec la mission.", en: 'Staff development is based on a needs assessment and an action plan consistent with the mission.' },
              { fr: "Le perfectionnement professionnel fait partie du développement global, soutenu par des plans de carrière individuels.", en: 'Professional development is part of overall organisational development, supported by individual career plans.' }
            ]),
            c('hr-development-training', { fr: 'Formations', en: 'Training' }, [
              { fr: 'Peu ou pas de formation.', en: 'Little or no training.' },
              { fr: 'La formation est importante mais opportuniste.', en: 'Training is significant but opportunistic.' },
              { fr: "La formation suit généralement le plan, sans être encore systématique ou suffisante.", en: 'Training generally follows the plan but is not yet systematic or sufficient.' },
              { fr: 'La formation atteint ou dépasse ce que prévoient les plans de carrière individuels.', en: 'Training meets or exceeds what individual career plans require.' }
            ]),
            c('hr-development-mentoring', { fr: 'Mentorat / coaching', en: 'Mentoring / coaching' }, [
              { fr: "Peu ou pas d'encadrement ou de conseils.", en: 'Little or no supervision or advice.' },
              { fr: 'Un certain encadrement et des conseils sont fournis.', en: 'Some supervision and advice is provided.' },
              { fr: "Encadrement, coaching et mentorat adéquats, mais pas encore intégrés dans l'organisation.", en: 'Adequate supervision, coaching and mentoring, but not yet embedded in the organisation.' },
              { fr: 'Le soutien professionnel interne fait partie du travail de chacun.', en: 'Internal professional support is part of everyone’s job.' }
            ]),
            c('hr-development-motivation', { fr: 'Motivation', en: 'Motivation' }, [
              { fr: 'Peu ou pas de reconnaissance de la performance. Le « burn-out » est courant.', en: 'Little or no recognition of performance. Burn-out is common.' },
              { fr: "Performance reconnue de façon informelle, sans mécanisme formel.", en: 'Performance recognised informally, with no formal mechanism.' },
              { fr: "Système formel d'évaluation du rendement établi.", en: 'Formal performance appraisal system in place.' },
              { fr: "Les employés participent à la fixation des objectifs et savent ce qu'on attend d'eux.", en: 'Staff take part in setting objectives and know what is expected of them.' }
            ])
          ]
        }
      ]
    },
    {
      id: 'fin',
      name: { fr: 'Ressources financières', en: 'Financial resources' },
      shortName: { fr: 'Ressources financières', en: 'Financial resources' },
      aspects: [
        {
          id: 'fin-management',
          name: { fr: 'Gestion financière', en: 'Financial management' },
          components: [
            c('fin-management-planning', { fr: 'Planification budgétaire', en: 'Budget planning' }, [
              { fr: 'Budgets établis de manière incrémentielle, projet par projet, surtout pour les bailleurs.', en: 'Budgets prepared incrementally, project by project, mostly for donors.' },
              { fr: 'Budgets par projet, non utilisés pour les décisions organisationnelles. Une vision financière annuelle globale émerge.', en: 'Project budgets not used for organisational decisions. An overall annual financial picture is emerging.' },
              { fr: "Un budget « maître » pluriannuel existe, mais les finances ne sont pas encore gérées en conséquence.", en: 'A multi-year master budget exists, but finances are not yet managed accordingly.' },
              { fr: 'La planification financière repose sur un budget « maître » intégré à la gestion à long terme.', en: 'Financial planning is based on a master budget integrated into long-term management.' }
            ]),
            c('fin-management-control', { fr: 'Contrôle', en: 'Control' }, [
              { fr: 'Ressources contrôlées principalement par les bailleurs. Contrôles internes faibles.', en: 'Resources mainly controlled by donors. Weak internal controls.' },
              { fr: 'Procédures financières établies mais pas entièrement systématiques.', en: 'Financial procedures established but not fully systematic.' },
              { fr: 'Procédures systématiques et documentées, facilitant un contrôle permanent.', en: 'Systematic, documented procedures enabling ongoing control.' },
              { fr: "Le contrôle est une fonction de gestion interne, non perçue comme excessive.", en: 'Control is an internal management function, not perceived as excessive.' }
            ]),
            c('fin-management-reporting', { fr: 'Rapports financiers', en: 'Financial reporting' }, [
              { fr: "Rapports incomplets et difficiles à comprendre, produits sous pression.", en: 'Reports are incomplete, hard to understand and produced under pressure.' },
              { fr: 'Rapports plus clairs mais incomplets, produits à temps projet par projet.', en: 'Clearer but incomplete reports, produced on time project by project.' },
              { fr: 'Rapports clairs et complets, utilisés régulièrement dans la gestion.', en: 'Clear and complete reports, regularly used in management.' },
              { fr: 'Les rapports donnent rapidement une image de la santé financière globale, à temps et accessibles au public.', en: 'Reports quickly show overall financial health, are timely and publicly available.' }
            ]),
            c('fin-management-audit', { fr: 'Audits', en: 'Audits' }, [
              { fr: 'Aucun audit n’est réalisé.', en: 'No audits are carried out.' },
              { fr: 'Les audits externes sont rares.', en: 'External audits are rare.' },
              { fr: 'Audits externes fréquents mais irréguliers.', en: 'Frequent but irregular external audits.' },
              { fr: 'Audits externes réguliers et à une fréquence appropriée.', en: 'Regular external audits at an appropriate frequency.' }
            ]),
            c('fin-management-segregation', { fr: 'Séparation des comptes', en: 'Separation of accounts' }, [
              { fr: "Les fonds des différents projets ne sont pas séparés.", en: 'Funds of different projects are not separated.' },
              { fr: 'Les fonds sont séparés seulement quand les bailleurs l’exigent.', en: 'Funds are separated only when donors require it.' },
              { fr: "Tous les fonds sont séparés, mais des financements croisés entre projets se produisent parfois.", en: 'All funds are separated, but cross-financing between projects sometimes occurs.' },
              { fr: 'Tous les fonds sont séparés et des contrôles empêchent les financements croisés.', en: 'All funds are separated and controls prevent cross-financing.' }
            ])
          ]
        },
        {
          id: 'fin-vulnerability',
          name: { fr: 'Vulnérabilité financière', en: 'Financial vulnerability' },
          components: [
            c('fin-vulnerability-diversity', { fr: 'Diversité du financement', en: 'Funding diversity' }, [
              { fr: "Le financement provient d'une seule source.", en: 'Funding comes from a single source.' },
              { fr: 'Sources multiples, mais 70 % ou plus d’une seule source.', en: 'Multiple sources, but 70% or more from a single one.' },
              { fr: 'Aucune source ne fournit plus de 60 % du financement.', en: 'No source provides more than 60% of funding.' },
              { fr: 'Aucune source ne fournit plus de 40 % du financement.', en: 'No source provides more than 40% of funding.' }
            ]),
            c('fin-vulnerability-own', { fr: 'Mobilisation de ressources propres', en: 'Own resource mobilisation' }, [
              { fr: "La mobilisation de ressources propres (cotisations, main-d'œuvre, services) n'est ni prouvée ni réussie.", en: 'Own resource mobilisation (fees, labour, services) is neither proven nor successful.' },
              { fr: 'Ressources propres mobilisées de façon ponctuelle.', en: 'Own resources mobilised on an ad hoc basis.' },
              { fr: 'Une stratégie de mobilisation des ressources propres existe et est opérationnelle.', en: 'An own-resource mobilisation strategy exists and is operational.' },
              { fr: 'Stratégie opérationnelle ; une part significative des dépenses annuelles est couverte par des ressources locales.', en: 'Operational strategy; a significant share of annual expenditure is covered by local resources.' }
            ])
          ]
        },
        {
          id: 'fin-sustainability',
          name: { fr: 'Pérennité financière', en: 'Financial sustainability' },
          components: [
            c('fin-sustainability-level', { fr: 'Viabilité financière', en: 'Financial viability' }, [
              { fr: 'Le financement ne couvre pas les activités immédiates et dépend des opportunités locales.', en: 'Funding does not cover immediate activities and depends on local opportunities.' },
              { fr: 'Le financement couvre seulement les activités immédiates des projets.', en: 'Funding covers only immediate project activities.' },
              { fr: 'Le financement couvre le court terme ; une stratégie à moyen terme existe.', en: 'Funding covers the short term; a medium-term funding strategy exists.' },
              { fr: 'Tous les projets ont un plan de financement à long terme et les fonds couvrent les besoins du plan de gestion.', en: 'All projects have long-term funding plans and current funds meet management plan needs.' }
            ])
          ]
        }
      ]
    }
  ];

  function allComponents() {
    var list = [];
    PILLARS.forEach(function (p) {
      p.aspects.forEach(function (a) {
        a.components.forEach(function (comp) {
          list.push({ pillar: p, aspect: a, component: comp });
        });
      });
    });
    return list;
  }

  var Framework = {
    LEVELS: LEVELS,
    MAX_SCORE: MAX_SCORE,
    PRIORITIES: PRIORITIES,
    SEQUENCES: SEQUENCES,
    PILLARS: PILLARS,
    allComponents: allComponents
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Framework;
  } else {
    root.BarometerFramework = Framework;
  }
})(this);
