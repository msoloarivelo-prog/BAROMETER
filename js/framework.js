/*
 * Cadre d'évaluation du baromètre de gouvernance.
 *
 * Reproduit fidèlement les feuilles "1 - DIAG_GOUVERNANCE_VISION" à
 * "4 - DIAG_RESSOURCE_FINANCIERE" du classeur Excel d'origine
 * (17112016 OUTIL ACCOMPAGNEMENT TEFI_v1.2.0.xlsm).
 *
 * Structure : pilier -> aspect -> composante -> 4 niveaux de description.
 * Le regroupement des composantes en aspects suit la feuille cachée
 * "Fiche de Calculs", qui sert de base aux moyennes.
 *
 * Pour adapter l'outil à un autre contexte, il suffit de modifier ce fichier :
 * le moteur de calcul et l'interface s'adaptent automatiquement.
 */
(function (root) {
  'use strict';

  var LEVELS = [
    { value: 1, label: 'Début / fondement' },
    { value: 2, label: 'Développement en cours' },
    { value: 3, label: "Expansion / Consolidation de l'organisation" },
    { value: 4, label: 'Développement soutenu et pérennité assurée' }
  ];

  var MAX_SCORE = 4;

  var PRIORITIES = ['Essentiel', 'Important', 'Neutre'];

  var SEQUENCES = [
    { value: 1, label: 'Premier diagnostic' },
    { value: 2, label: 'Deuxième diagnostic' },
    { value: 3, label: 'Troisième diagnostic' },
    { value: 4, label: 'Quatrième diagnostic' }
  ];

  var PILLARS = [
    {
      id: 'gov',
      name: 'Gouvernance / Vision',
      shortName: 'Gouvernance',
      aspects: [
        {
          id: 'gov-board',
          name: "Conseil d'Administration",
          components: [
            {
              id: 'gov-board-role',
              name: 'Rôle',
              levels: [
                'Les rôles des membres du conseil et leur relation aux membres de la Direction Exécutive ne sont pas claires.',
                "Les membres du conseil comprennent leur rôle et comment se rapporter au directeur exécutif. Mais, les contraintes interpersonnelles ou organisationnelles peuvent réduire l'efficacité du Conseil.",
                'Les membres du Conseil travaillent en étroite collaboration avec le directeur exécutif et les membres du Conseil à formuler des politiques et un plan stratégique pour le développement.',
                "Les membres du conseil d'administration soutiennent l'organisation en faisant du lobbying et en établissant des liens avec d'autres organisations."
              ]
            },
            {
              id: 'gov-board-effectiveness',
              name: 'Effectivité',
              levels: [
                'Le Conseil est officiellement constitué, mais pas encore une force active.',
                'Le Conseil devient actif. Un ou deux membres contribuent et / ou recherchent des ressources.',
                "Un momentum à bord. Des comités ont été formés, mais, dans l'ensemble, peu de membres sont actifs. Le Conseil arrive à réunir (obtenir) une quantité de ressources modérée.",
                "Ressources importantes mobilisées par le Conseil. La plupart des membres du conseil d'administration sont suffisamment actifs."
              ]
            },
            {
              id: 'gov-board-members',
              name: 'Organisation des membres',
              levels: [
                "Un pool de conseillers sélectionné en fonction de l'enthousiasme initial de l'organisation, pas nécessairement sur ses besoins en développement à long terme.",
                "Les membres du Conseil « choisis » de manière plus stratégique, mais la plupart de leurs compétences ne correspondent toujours pas aux besoins croissants de l'organisation.",
                "Les compétences du Conseil correspondent aux besoins de l'organisation en développement et l'aident à avancer.",
                "Les membres du conseil d'administration sont déterminés, ont la volonté et les compétences pour le développement à long terme de l'organisation."
              ]
            }
          ]
        },
        {
          id: 'gov-mission',
          name: 'Mission',
          components: [
            {
              id: 'gov-mission-statement',
              name: 'Mission',
              levels: [
                "Pas d'énoncé de mission. Le groupe s'unit autour d'objectifs généraux, tels que l'engagement envers l'environnement, la santé ou la paix.",
                "L'énoncé de mission existe, mais n'est pas ciblé. Un portefeuille diversifié de projets acquis mais pas toujours conforme à l'énoncé de mission.",
                "L'énoncé de mission est clair et est généralement conforme au portefeuille. Cependant, le personnel n'est pas uniformément capable d'articuler l'énoncé de mission. Les observateurs de l'extérieur ne peuvent pas identifier l'énoncé de mission de l'organisation.",
                "Déclaration de mission claire. Elle peut être articulée par le Conseil et le personnel et est conforme au portefeuille. Les observateurs identifient toujours la même mission avec l'organisation."
              ]
            }
          ]
        },
        {
          id: 'gov-autonomy',
          name: 'Autonomie',
          components: [
            {
              id: 'gov-autonomy-level',
              name: 'Autonomie',
              levels: [
                "L'organisation est un agent d'exécution d'un donateur.",
                "L'organisation est en mesure de répondre à plus d'un donateur et aux demandes du Conseil.",
                "L'organisation est en mesure d'obtenir des fonds pour soutenir son programme, en consultation avec le Conseil.",
                "Outre l'autonomie managériale et financière, l'organisation est capable de défendre et de recueillir des fonds, en tant que représentation d'une plus vaste organisation (constituency) et avec succès. Les fonds sont d'origine multiple : gouvernement, donateurs et secteur privé."
              ]
            }
          ]
        },
        {
          id: 'gov-leadership',
          name: 'Style de leadership',
          components: [
            {
              id: 'gov-leadership-board',
              name: "Rôle du Conseil d'Administration ou des fondateurs",
              levels: [
                'Tout le leadership émane du ou des fondateurs de base.',
                'Le leadership vient du ou des fondateurs de base et d’un ou deux membres du Conseil.',
                "La vision et la gestion des idées viennent de plus en plus du Conseil, les membres du Conseil travaillant plus étroitement avec l'organisation.",
                "Pratiquement tous les membres contribuent au leadership et au développement de l'organisation."
              ]
            },
            {
              id: 'gov-leadership-team',
              name: "Importance du travail d'équipe et du personnel",
              levels: [
                'Le personnel fournit uniquement une contribution technique. Les décisions sont prises par le ou les fondateurs.',
                'Un ou deux employés fournissent une impulsion organisationnelle, en plus du Directeur Exécutif.',
                "La contribution du personnel est de plus en plus vitale pour l'organisation. Le personnel et le directeur exécutif travaillent de plus en plus comme une équipe.",
                "L'organisation survivrait sans l'actuel directeur ou le président du conseil d'administration."
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'plan',
      name: 'Gestion des ressources et évaluation',
      shortName: 'Planification',
      aspects: [
        {
          id: 'plan-planning',
          name: 'Planification',
          components: [
            {
              id: 'plan-planning-clarity',
              name: "Clarté de la mission / identité stratégique de l'entité",
              levels: [
                'La planification est uniquement basée sur des aspects opportunistes.',
                "Les plans annuels sont élaborés et examinés au cours de l'année. Souvent pas intégrés dans le plan stratégique à plus long terme.",
                "La planification est élargie, plus avancée, orientée sur le long terme (nature stratégique) et structurée autour d'une mission claire.",
                "Sur la base de la formulation de la mission, l'élaboration du plan stratégique et les plans annuels deviennent des instruments de coopération avec un examen régulier des plans à long terme."
              ]
            },
            {
              id: 'plan-planning-participation',
              name: 'Effectivité de la participation dans la planification',
              levels: [
                'La planification est top-down : Direction Exécutive, sur la base des idées du Conseil.',
                'La participation du personnel à la planification est élargie, y compris les contributions du personnel à la décision de planification stratégique.',
                'Les membres constitutifs fournissent les informations pour la planification mais les bénéficiaires sont toujours exclus de la prise de décision.',
                "Le personnel et/ou les membres de l'organisation contribuent aux décisions de planification sur le même plan que le directeur exécutif et le Conseil."
              ]
            },
            {
              id: 'plan-planning-resources',
              name: 'Implication et utilisation efficiente des ressources',
              levels: [
                'Objectifs fixés sans évaluation des besoins en ressources, ni prise en compte de facteurs externes importants.',
                'Accomplissement des objectifs liés aux ressources, mais des facteurs externes importants encore négligés.',
                "Les plans sont basés sur les ressources et l'examen des facteurs externes importants. Mais l'organisation ne révise pas le plan durant l'exécution.",
                "Les plans annuels et stratégiques sont complets et suffisamment précis pour permettre l'allocation des ressources précises, et suffisamment souples pour être modifiés au besoin."
              ]
            },
            {
              id: 'plan-planning-workplan',
              name: 'Intégration du plan de travail comme outil',
              levels: [
                "L'organisation ne produit pas de plans de travail.",
                "Les plans de travail sont rédigés, mais rarement utilisés par le personnel de gestion et d'exploitation.",
                'Les plans de travail sont utilisés par la direction et le staff des opérations, mais pas considérés comme des instruments dynamiques à modifier au besoin.',
                'Les plans de travail sont considérés par la direction et le personnel comme des outils utiles, et sont modifiés au besoin.'
              ]
            }
          ]
        },
        {
          id: 'plan-participative',
          name: 'Gestion participative',
          components: [
            {
              id: 'plan-participative-delegation',
              name: 'Délégation de la gestion appropriée',
              levels: [
                "Les décisions sont rendues à l'organisation par la Direction Exécutive et/ou le Président, avec peu ou pas de prise en compte des rétroactions des membres.",
                "La plupart des décisions de gestion sont prises par le directeur exécutif et des membres du Conseil. Certains inputs de la part d'un ou deux membres du personnel.",
                "Les décisions de gestion sont de plus en plus déléguées aux gestionnaires hiérarchiques et d'activité, selon le cas.",
                "Les décisions de gestion sont déléguées à un niveau approprié de l'organisation."
              ]
            },
            {
              id: 'plan-participative-transparency',
              name: 'Prise de décision transparente',
              levels: [
                "Les décisions sont rendues à l'organisation par la Direction Exécutive et/ou le Président, sans critères de décision clairs et avec peu ou pas de rétroaction.",
                'Les critères de décision de gestion utilisés par le directeur exécutif sont généralement partagés avec le Conseil, mais les autres membres du personnel ne sont pas inclus dans le processus.',
                'La prise de décision est de plus en plus opérationnalisée pour devenir transparente pour le personnel ; une certaine participation du personnel aux décisions réelles.',
                'Processus de prise de décision transparent ; on voit aussi une participation complète du personnel dans les décisions pertinentes.'
              ]
            },
            {
              id: 'plan-participative-staff',
              name: 'Effectivité de la participation du personnel dans la gestion',
              levels: [
                'Rôles et responsabilités du personnel peu clairs et changeants.',
                "Rôles du personnel mieux compris, mais les manières d'appropriation et de participation ne sont pas toujours claires.",
                "Le personnel comprend plus clairement son rôle dans l'organisation et la façon de participer à la gestion.",
                'Le personnel est de plus en plus en mesure de façonner la manière dont il participe à la gestion.'
              ]
            },
            {
              id: 'plan-participative-communication',
              name: 'Efficacité des flux de communication',
              levels: [
                'Communications intra-personnel principalement par le biais de canaux informels.',
                'Émergence de canaux formels pour le dialogue et la prise de décision (comme les réunions du personnel).',
                'Communication verticale et horizontale ouverte. Canaux formels et informels établis et utilisés.',
                "L'organisation examine périodiquement le flux de communication pour assurer la libre circulation de l'information à travers les canaux formels et informels."
              ]
            }
          ]
        },
        {
          id: 'plan-systems',
          name: 'Systèmes / outils de gestion des ressources',
          components: [
            {
              id: 'plan-systems-hr',
              name: 'Efficience des systèmes de gestion du personnel',
              levels: [
                "Aucun système de gestion formel du personnel et RH n'existe (descriptions de postes, procédures de recrutement et d'embauche, etc.).",
                "Certains, mais pas tous les systèmes de gestion du personnel nécessaires existent. Des pratiques d'emploi informelles persistent.",
                'Pratiquement tous les systèmes de gestion du personnel nécessaires sont institutionnalisés.',
                'Systèmes de gestion du personnel formels et institutionnalisés, assimilés et compris par les employés.'
              ]
            },
            {
              id: 'plan-systems-files',
              name: 'Efficience des systèmes de gestion des fichiers',
              levels: [
                "Aucun système de fichiers formel n'existe.",
                'Les fichiers sont conservés, mais ne sont pas complets ou systématiquement sauvegardés.',
                'Les copies des fichiers sont systématiques et accessibles, mais des lacunes importantes subsistent.',
                'Les copies des fichiers sont complètes, systématiques et accessibles.'
              ]
            },
            {
              id: 'plan-systems-procedures',
              name: 'Solidité et appropriation des procédures administratives',
              levels: [
                'Peu de procédures administratives formalisées, ou, si formalisées, non suivies.',
                "Les procédures administratives sont de plus en plus formalisées et suivies, mais le manuel d'exploitation pratique n'existe pas.",
                'Manuel administratif interne en place, plutôt comme un document dans un fichier, mais pas comme un instrument opérationnel.',
                "Manuel administratif mis à jour au besoin. Considéré comme un instrument opérationnel. Les gens le citent ou l'utilisent lors de l'examen des procédures."
              ]
            }
          ]
        },
        {
          id: 'plan-me',
          name: 'Suivi et évaluation',
          components: [
            {
              id: 'plan-me-decisions',
              name: 'Données du système de S&E intégrées dans la prise de décision',
              levels: [
                "Aucun mécanisme d'évaluation officiel n'existe.",
                "Des évaluations ponctuelles sont effectuées, généralement à la demande des bailleurs de fonds, et mises en œuvre par des personnes extérieures ou du personnel temporaire.",
                'Les évaluations sont initiées par le personnel ; le personnel est de plus en plus impliqué (360°) ; certaines décisions de gestion sont prises sur la base de ces données recoupées. Toutefois, la fonction S&E reste isolée de la gestion.',
                "Les données analysées à partir d'une évaluation complète et fonctionnelle sont intégrées dans la prise de décision."
              ]
            },
            {
              id: 'plan-me-feedback',
              name: "Prise en compte de l'évaluation par les membres",
              levels: [
                'Aucune rétroaction de la part des membres.',
                'Des canaux informels de rétroaction existent.',
                'Des mécanismes officiels existent pour les rétroactions de la part des membres, mais seulement par le biais des résultats d’enquêtes et des évaluations.',
                "Rétroaction continue ; contribution des organismes membres effective et tangible dans le maintien de la pérennité de l'organisme."
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'hr',
      name: 'Ressources humaines',
      shortName: 'Ressources humaines',
      aspects: [
        {
          id: 'hr-skills',
          name: 'Compétences du personnel',
          components: [
            {
              id: 'hr-skills-match',
              name: 'Compétences',
              levels: [
                'Trop peu de personnel remplissent un éventail trop vaste de compétences professionnelles.',
                'Des spécialistes sont recrutés pour les domaines de compétences de base, comme la comptabilité et la collecte de fonds. Il subsiste des lacunes.',
                'Tous les domaines de compétences de base sont couverts avec le personnel et les experts externes.',
                "Tous les domaines de compétences sont couverts et le personnel / les experts externes sont reconnus pour l'excellence. L'organisation peut fournir de l'expertise et de l'aide à des organisations extérieures."
              ]
            }
          ]
        },
        {
          id: 'hr-development',
          name: "Développement de l'équipe",
          components: [
            {
              id: 'hr-development-strategy',
              name: 'Stratégie',
              levels: [
                'Le développement des ressources humaines est opportuniste et fonction des opportunités émergentes.',
                'La direction générale prévoit le développement du personnel, mais il est à court terme et basé sur les opportunités offertes par les projets.',
                "Le développement du personnel est basé sur l'évaluation des besoins et un plan d'action existe. Le plan est cohérent avec la mission de l'organisation.",
                "Le perfectionnement professionnel est considéré comme faisant partie du développement global de l'organisation. Il est soutenu par des plans de développement de carrière individuels."
              ]
            },
            {
              id: 'hr-development-training',
              name: 'Formations',
              levels: [
                'Peu ou pas de formation fournie.',
                'La formation est importante, mais elle est de nature opportuniste.',
                "La formation est généralement conforme au plan, mais elle n'est pas encore entièrement systématique ou suffisante.",
                'La formation réelle rencontre ou dépasse les spécifications des plans de développement de carrière individuels.'
              ]
            },
            {
              id: 'hr-development-mentoring',
              name: 'Mentorat / coaching',
              levels: [
                "Peu ou pas d'encadrement ou de conseils.",
                'Un encadrement et des conseils sont fournis.',
                "Le personnel reçoit un enseignement adéquat, du conseil, du coaching et du mentorat, mais le développement du personnel n'est toujours pas intégré dans l'organisation.",
                'Le soutien professionnel interne est considéré comme une partie importante du travail de chaque membre du personnel.'
              ]
            },
            {
              id: 'hr-development-motivation',
              name: 'Motivation',
              levels: [
                'Peu ou pas de reconnaissance de la performance des employés. Le « burn-out » est commun.',
                "Performance reconnue de façon informelle, mais il n'existe aucun mécanisme formel.",
                "Système d'évaluation formelle du rendement établi.",
                "Les employés participent à l'établissement d'objectifs et savent ce qu'on attend d'eux."
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'fin',
      name: 'Ressources financières',
      shortName: 'Ressources financières',
      aspects: [
        {
          id: 'fin-management',
          name: 'Gestion financière',
          components: [
            {
              id: 'fin-management-planning',
              name: 'Planification',
              levels: [
                'Les budgets sont établis déraisonnablement. Ils sont élaborés de manière incrémentielle, projet par projet, en général seulement pour le financement des donateurs.',
                'Les budgets sont maintenus projet par projet, mais ne sont pas utilisés comme instrument de prise de décision organisationnelle. La conscience d’une situation financière annuelle globale émerge.',
                "L'organisation maintient un budget d'organisation « maître » pluriannuel, mais ne gère pas encore les finances en conséquence.",
                'La planification financière est basée sur un budget organisationnel « maître » et intègre la situation financière globale dans la planification et la gestion organisationnelle à long terme.'
              ]
            },
            {
              id: 'fin-management-control',
              name: 'Contrôle',
              levels: [
                'Les ressources financières sont principalement contrôlées par les donateurs. Les contrôles internes sont faibles.',
                'Les procédures financières sont établies, mais ne sont toujours pas entièrement systématiques.',
                'Les procédures financières sont systématiques et établies pour soutenir la gestion opérationnelle. Les procédures documentées facilitent les contrôles permanents.',
                "Le contrôle est une fonction de gestion interne. L'organisation ne perçoit pas les contrôles comme excessifs."
              ]
            },
            {
              id: 'fin-management-reporting',
              name: 'Rapports',
              levels: [
                "Les rapports financiers sont incomplets et difficiles à comprendre. L'organisation a souvent besoin d'être poussée pour les produire.",
                'Les rapports financiers sont plus clairs mais incomplets. Les rapports sont généralement soumis sur une base cyclique, en temps opportun pour chaque projet spécifique.',
                'Les rapports financiers sont clairs et complets, même si le portefeuille de gestion devient plus complexe. Les rapports officiels sont régulièrement utilisés dans la gestion opérationnelle.',
                'Les rapports et systèmes de gestion des données peuvent rapidement donner une idée de la santé financière globale. Les rapports sont toujours produits en temps opportun, de façon fidèle, et mis à la disposition du public.'
              ]
            },
            {
              id: 'fin-management-audit',
              name: 'Audits',
              levels: [
                'Les vérifications ne sont pas effectuées.',
                'Les audits externes sont rarement effectués.',
                'Les audits externes sont effectués fréquemment, mais de manière apériodique.',
                'Les audits externes sont effectués avec une fréquence régulière et appropriée.'
              ]
            },
            {
              id: 'fin-management-segregation',
              name: 'Séparation des comptes',
              levels: [
                "Les fonds ne sont pas séparés pour les différents projets au sein de l'organisation.",
                'Les fonds des projets ne sont séparés que lorsque les donateurs l’exigent.',
                "La procédure standard est d'éviter le financement croisé entre projets. Tous les fonds sont séparés, mais il se produit parfois un financement entre projets.",
                'Tous les fonds des projets sont séparés et des contrôles adéquats existent pour éviter le financement entre projets.'
              ]
            }
          ]
        },
        {
          id: 'fin-vulnerability',
          name: 'Vulnérabilité financière',
          components: [
            {
              id: 'fin-vulnerability-diversity',
              name: 'Diversité du financement',
              levels: [
                "Le financement provient d'une seule source.",
                'Le financement provient de sources multiples, mais 70 % ou plus à partir d’une source unique.',
                'Aucune source de financement ne fournit plus de 60 % du financement.',
                'Aucune source unique ne fournit plus de 40 % du financement.'
              ]
            },
            {
              id: 'fin-vulnerability-own',
              name: 'Mobilisation de ressources propres',
              levels: [
                "La mobilisation des ressources propres (y compris les cotisations, la main-d'œuvre et les services) pour le revenu d'exploitation n'est ni prouvée ni réussie.",
                'La mobilisation des ressources propres se fait sur une base ad hoc.',
                'La stratégie de mobilisation des ressources propres existe et est opérationnelle.',
                'La stratégie de mobilisation des ressources propres est opérationnelle. Une part significative des dépenses annuelles est générée par les ressources locales.'
              ]
            }
          ]
        },
        {
          id: 'fin-sustainability',
          name: 'Pérennité des ressources financières',
          components: [
            {
              id: 'fin-sustainability-level',
              name: 'Viabilité financière',
              levels: [
                'Le financement des projets est insuffisant pour couvrir les activités immédiates et dépend des possibilités locales.',
                'Le financement disponible couvre uniquement les activités immédiates des projets, conformément à la mission.',
                'Le financement est disponible pour les coûts à court terme. Une stratégie de financement à moyen terme existe.',
                'Tous les projets, conformément à la mission, ont des plans de financement à long terme et les fonds actuels sont suffisants pour répondre aux besoins du plan de gestion.'
              ]
            }
          ]
        }
      ]
    }
  ];

  var Framework = {
    LEVELS: LEVELS,
    MAX_SCORE: MAX_SCORE,
    PRIORITIES: PRIORITIES,
    SEQUENCES: SEQUENCES,
    PILLARS: PILLARS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Framework;
  } else {
    root.BarometerFramework = Framework;
  }
})(this);
