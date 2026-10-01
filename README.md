# Governance Barometer — web app / Baromètre de gouvernance

Web version of the Excel/VBA tool **"17112016 OUTIL ACCOMPAGNEMENT TEFI v1.2.0.xlsm"**: a governance self-assessment for small organisations that computes development indices, identifies strengths, opportunities and weaknesses, generates a workplan, and produces an individual PDF report. A facilitator space gives an overview of all the organisations being supported.

The interface is available in **French and English** (FR / EN switch in the header).

## Getting started

No installation is needed. Open `index.html` in a recent browser (Chrome, Edge, Firefox or Safari). The tool works offline. To host it, copy the folder to any static host (GitHub Pages, Netlify, an internal server…).

## Workflow for an organisation

| Step | Page | What happens |
|---|---|---|
| 0 | **Profile** | Organisation details, plus the assessment sequence and year |
| 1 | **Assessment** | 33 components across 4 pillars; click the level (1–4) that matches the situation |
| 2 | **Results** | Global index, total, pillar donuts and aspect bars, comparison with a previous assessment, and **strengths / opportunities / weaknesses** |
| 3 | **Workplan** | Pre-filled with **standard activities**, which the organisation edits; it also adds **its own activities**. Shows a Gantt timeline over 12 months |
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
- An optional plan start month turns M1…M12 into calendar months.

### PDF report

The report contains:

1. **Overview**: key figures, pillar donuts, top strengths, opportunities and weaknesses, change since the previous assessment, and a workplan summary.
2. Detailed scores by pillar, aspect and component.
3. Strengths, opportunities and weaknesses, each with its current level, target level and the organisation's challenge.
4. The workplan table and the Gantt timeline.
5. Assessment comments and signature blocks.

**Export to PDF** opens the browser's print dialog; choose *Save as PDF*. The PDF keeps selectable text and needs no internet connection.

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
js/framework.js          assessment framework (bilingual)
js/activities.js         standard activity library (bilingual)
js/scoring.js            scoring, categories, pillar weights (no browser dependency)
js/storage.js            workspace model, migration, import/export
js/plan.js               workplan generation and sync
js/charts.js             SVG charts and Gantt timeline
js/app.js                core, Profile / Assessment / Results / Help views
js/views-plan.js         Workplan view
js/views-report.js       Report view and PDF export
js/views-facilitator.js  Facilitator space
tests/                   unit tests
```

## Tests

```
npm test
```

Requires Node.js 18 or later; there are no dependencies.
