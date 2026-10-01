# Organisational Diagnostic Tool / Outil de Diagnostic Organisationnel

Organisational assessment tool with three models, all bilingual (FR/EN):

| Model | Measures | Structure | Global index |
|---|---|---|---|
| **Governance barometer** | Capacity (governance) | 4 pillars, 33 components | Mean of the 33 components (Excel method) or weighted mean of pillars |
| **ITOCA** (derived from USAID/Pact OCA/OCAT) | Technical and organisational capacity | 10 domains, 94 indicators | Mean of domains (equal weights) |
| **OPI** (organisational performance index) | Performance (results achieved), evidence required | 5 domains, 10 sub-domains | Mean of domains (equal weights) |

All models share the same engine: 1–4 levels, strengths/opportunities/weaknesses, a pre-filled **Change Action Plan (CAP)**, progress over time (within one model), individual and progress reports in PDF, and the facilitator portfolio. OPI is only relevant for organisations with at least 2 years of activity; its level descriptions are our own wording in the spirit of Pact's OPI and should be validated.

### Evidence files (PDF)

Each indicator can have PDF evidence attached (10 MB max per file; the PDF signature is checked).
- The files are stored in the browser's IndexedDB. Assessments keep only the file names and sizes.
- Files open in a built-in viewer with a download button.
- They are embedded in organisation exports and workspace backups, so the facilitator receives them on import.
- The reports list the attached file names.
- For OPI, an indicator counts as evidenced when it has a description or at least one PDF.

### Change Action Plan (CAP)

The CAP follows the CAP template:
- gap identified;
- prioritized actions;
- rank;
- means of verification;
- person responsible;
- time frame;
- comments and follow-up.

It is grouped by domain, with a Gantt timeline over 24 months.

What is pre-filled:
- the gap, from the current level description;
- the target, from the next level;
- one suggested action per gap, with a means of verification.

Everything can be edited, and organisations add their own actions. For ITOCA and OPI only gaps (weaknesses and opportunities) get pre-filled actions.

### ITOCA content

The ITOCA grid was converted from the organisation-specific Excel version:
- the organisation's name was replaced by "the organisation";
- typos were corrected;
- English translations, short titles and one suggested action per indicator were added.

The source is `data/itoca/*.json`. Regenerate `js/models/itoca-data.js` with `npm run build:itoca`.

Web version of the Excel/VBA tool **"17112016 OUTIL ACCOMPAGNEMENT TEFI v1.2.0.xlsm"**: a governance self-assessment for small organisations that computes development indices, identifies strengths, opportunities and weaknesses, generates a workplan, and produces an individual PDF report. A facilitator space gives an overview of all the organisations being supported.

The interface is available in **French and English** (FR / EN switch in the header).

## Getting started

No installation is needed. Open `index.html` in a recent browser (Chrome, Edge, Firefox or Safari). The tool works offline. To host it, copy the folder to any static host (GitHub Pages, Netlify, an internal server…).

## Offline test version (single file)

`dist/barometre-offline.html` is the whole tool in **one file** (about 240 KB). Copy it to a USB key or send it by e-mail, then double-click it. It needs no internet access and no other files.

To test quickly, click **Load demo data** on the Home page or in the Facilitator space. This loads three fictitious organisations:

- one with three half-yearly assessments (to see progress over time), an edited workplan and its own activities;
- one well-established organisation;
- one whose assessment is still in progress.

You can then explore the results, workplans, reports and the facilitator dashboard. Loading the demo again replaces only the demo organisations.

After changing the source files, regenerate the offline file with:

```
npm run build
```

## Workflow for an organisation

| Step | Page | What happens |
|---|---|---|
| 0 | **Profile** | Organisation details (type and field of work chosen from bilingual lists, with *Other* to specify), plus the assessment sequence and year |
| 1 | **Assessment** | 33 components across 4 pillars; click the level (1–4) that matches the situation |
| 2 | **Results** | Global index, total, pillar donuts and aspect bars, comparison with a previous assessment, and **strengths / opportunities / weaknesses** |
| 3 | **Workplan** | Pre-filled with **standard activities**, which the organisation edits; it also adds **its own activities**. Shows a Gantt timeline over 24 months |
| 4 | **Report** | Individual A4 report, with **Export to PDF** |

Each component falls into a category based on its score:

- **4** → ▲ strength to maintain
- **3** → ◆ opportunity to catch (one step from the top level)
- **1–2** → ▼ weakness to address

### Workplan

- **Standard activities** come from `js/activities.js`: 2 activities per weakness, 1 per opportunity and 1 maintenance activity per strength. Each has a suggested indicator, a default period and a default priority (Essential, Important or Neutral).
- Each activity records the lead, start and end month, priority, status (planned, ongoing or done), indicator with baseline and target, available and anticipated resources, and means of verification.
- The organisation can add **its own activities**, either under a component or as general activities.
- **Update standard activities** re-aligns the plan after the assessment changes. Activities the organisation has edited or added are always kept.
- The plan covers **24 months**. By default, weaknesses are worked on in year 1, opportunities run into year 2, and maintenance activities cover the whole period. An optional plan start month turns M1…M24 into calendar months.

### PDF report

The report uses a light colour palette and contains:

1. **Overview**: key figures, pillar donuts, top strengths, opportunities and weaknesses, change since the previous assessment, and a workplan summary.
2. Detailed scores by pillar, aspect and component.
3. **SWOT (FFOM) analysis as a table**: one row per component, grouped into strengths, opportunities and weaknesses, with the current situation, the target level and the challenge or comment.
4. **Action plan**, starting on a new page.
5. **Timeline (Gantt)** on its own **landscape** pages; the year and month header repeats on every page.
6. **Conclusion** generated from the results:
   - overall level and the strongest and weakest pillars;
   - strengths, priorities and quick wins;
   - change since the previous assessment;
   - the action plan and its first actions;
   - next steps.

   It is followed by an editable *facilitator's observations and recommendations* box, the assessment comments and signature blocks.

**Export to PDF** opens the browser's print dialog; choose *Save as PDF*. The PDF keeps selectable text and needs no internet connection.

## Regular assessments and progress over time

The barometer is meant to be repeated regularly, for example every 6 or 12 months:

- **New assessment** numbers assessments without limit and records the period (year, plus an optional month). It can **pre-fill** the answers from the latest assessment so the organisation only updates what changed.
- The **Progress** page shows:
  - the trend of the global index and of each pillar across all periods (line chart);
  - a comparison table of every period: index, pillars, total, number of strengths, opportunities and weaknesses, and workplan completion, with the change from first to last;
  - a comparison between **any two periods**: components that improved, declined or stayed stable, weaknesses resolved and new weaknesses;
  - the follow-up of the earlier period's workplan: completion rate and activities done.
- The **Report** page offers two modes:
  - *Assessment report*, for a single period;
  - *Progress report*, a comparative PDF over the chosen periods.

## Facilitator space

- Each organisation exports **its own file** (`.json`) from its Profile page.
- The facilitator **imports several files at once**. Re-importing a file updates the matching organisation.
- The dashboard shows:
  - the number of organisations, completed assessments, the portfolio mean index and workplan progress;
  - a table with every organisation's index, change, pillar heat-map, number of weaknesses and plan progress;
  - the portfolio average for each pillar;
  - the **most common weaknesses**, which are candidates for group training.
- The portfolio exports to CSV, and the whole workspace can be backed up or restored.

Data is stored in the browser (`localStorage`). Nothing is sent to a server.

## Calculation (identical to the Excel "Fiche de Calculs")

- **Component**: the level chosen, from 1 to 4.
- **Aspect**: the mean of its components.
- **Pillar**: the mean of its aspects.
- **Total**: the sum of the 33 components (maximum 132).
- **Mean development index**: the mean of the 33 components.

The tests check that the app reproduces the values Excel computed in the supplied file: total 130, index 3.94, pillars 3.5 / 4 / 4 / 4.

### About pillar weights

The Excel file has no weights to enter. However, because the global index is the mean of the 33 components, pillars with more components implicitly weigh more:

| Pillar | Components | Effective weight |
|---|---|---|
| Governance / Vision | 7 | 21.2 % |
| Resource management and evaluation | 13 | 39.4 % |
| Human resources | 5 | 15.2 % |
| Financial resources | 8 | 24.2 % |

The **Facilitator space → Calculation settings** offers two methods:

- **As in Excel** (default): the mean of the 33 components.
- **Weighted mean of the 4 pillars**: you set each pillar's weight, for example 25 % each.

Only the global index changes. Component, aspect and pillar scores stay the same.

### Deliberate differences from Excel

- Unanswered components are **ignored** in averages, and the app warns that the assessment is incomplete. Excel showed `#DIV/0!` or counted them as zeros.
- Excel computes the "Systèmes de gestion" score 2 as `SUM(E41:E43)/4` although that aspect has 3 components. The app does not reproduce this bug.

## Customising

- `js/framework.js`: pillars, aspects, components and level descriptions (FR/EN).
- `js/activities.js`: the standard activity library (FR/EN).
- `js/i18n.js`: interface texts.

## Structure

```
index.html               single page
css/styles.css           layout (light/dark, mobile, A4 report, print)
js/i18n.js               interface translations
js/framework.js          Barometer framework (bilingual)
js/models.js             model registry (Barometer, ITOCA, OPI)
js/models/itoca-data.js  ITOCA content (generated from data/itoca)
js/models/opi-data.js    OPI content
js/activities.js         standard activity library (bilingual)
js/scoring.js            scoring, categories, pillar weights (no browser dependency)
js/storage.js            workspace model, migration, import/export
js/plan.js               workplan generation and sync
js/evolution.js          chronology and period-to-period comparison
js/demo.js               demo organisations for testing
js/charts.js             SVG charts and Gantt timeline
js/app.js                core, Profile / Assessment / Results / Help views
js/views-plan.js         Workplan view
js/views-report.js       Report view and PDF export
js/views-facilitator.js  Facilitator space
js/views-evolution.js    Progress page and comparative report
tests/                   unit tests
scripts/build-offline.js builds the single-file offline version
dist/                    offline single-file build (generated)
```

## Tests

```
npm test
```

Requires Node.js 18 or later; there are no dependencies.
