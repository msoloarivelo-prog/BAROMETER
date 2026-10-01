# Baromètre de gouvernance — application web

Version web de l’outil Excel/VBA **« 17112016 OUTIL ACCOMPAGNEMENT TEFI v1.2.0.xlsm »** : auto-diagnostic de la gouvernance des petites organisations, avec calcul des indices de développement et plan de renforcement.

## Utilisation

Aucune installation n’est nécessaire : ouvrez `index.html` dans un navigateur récent (Chrome, Edge, Firefox, Safari). L’outil fonctionne hors ligne. Pour l’héberger, copiez le dossier sur n’importe quel hébergement statique (GitHub Pages, Netlify, serveur interne…).

Les données sont enregistrées automatiquement dans le navigateur (`localStorage`). La page **Fiche** permet d’exporter et d’importer un dossier complet (`.json`) pour sauvegarder ou transmettre le travail.

## Correspondance avec le classeur Excel

| Excel | Application web |
|---|---|
| `Début`, `1. Processus` | Accueil (étapes 0 à 3) |
| `Fiche` | **Fiche** : identité de l’organisation, séquence et année du diagnostic |
| `1 - DIAG_…` à `4 - DIAG_…` (boutons radio) | **Diagnostic** : un onglet par pilier, une carte cliquable par niveau |
| `Fiche de Calculs`, `Match_scoring`, `Table_donnees` (masquées) | `js/scoring.js` |
| `Dashboard` (anneaux et barres) | **Résultats** : indice global, total, anneau et barres par pilier |
| Colonnes « Score 2 / Changement » | Plusieurs diagnostics par organisation, et comparaison avec un diagnostic de référence |
| `1 - GOUVERNANCE_VISION` … `4 - RESSOURCE_FINANCIERE` (plans) | **Plan** : défis, activités, responsable, ressources, indicateur (base et cible), priorité, source de vérification, chronogramme M1 à M12 |
| `MANUEL` | **Manuel** |
| Macros VBA (écran de démarrage, plein écran) | Pas nécessaires dans un navigateur |

## Méthode de calcul (identique à la `Fiche de Calculs`)

- **Composante** : niveau choisi, de 1 à 4 (33 composantes).
- **Aspect** : moyenne de ses composantes.
- **Pilier** : moyenne de ses aspects (et non de ses composantes).
- **Placement total** : somme des 33 composantes (maximum 132).
- **Indice moyen de développement** : moyenne des 33 composantes.

Les tests vérifient que l’application reproduit exactement les valeurs calculées par Excel dans le fichier fourni (total 130, indice 3,94, piliers 3,5 / 4 / 4 / 4).

### Écarts volontaires par rapport à Excel

- Les composantes non renseignées sont **ignorées** dans les moyennes, et un avertissement indique que le diagnostic est incomplet. Dans Excel, elles produisaient `#DIV/0!` ou étaient comptées comme des zéros.
- Excel calcule la moyenne « Systèmes de gestion » du Score 2 avec `SUM(E41:E43)/4` alors que cet aspect compte 3 composantes. Ce bug n’est pas reproduit.

## Personnaliser le cadre

Les piliers, aspects, composantes et descriptions des niveaux sont définis dans `js/framework.js`. Après une modification de ce fichier, les calculs, les graphiques et les formulaires s’adaptent automatiquement.

## Structure

```
index.html          page unique
css/styles.css      mise en forme (thème clair/sombre, mobile, impression)
js/framework.js     cadre d'évaluation (contenu du questionnaire)
js/scoring.js       moteur de calcul (sans dépendance au navigateur)
js/storage.js       modèle de données, sauvegarde locale, import/export
js/charts.js        graphiques SVG
js/app.js           interface
tests/              tests unitaires du moteur de calcul
```

## Tests

```
npm test
```

(Node.js 18 ou plus, sans dépendance.)
