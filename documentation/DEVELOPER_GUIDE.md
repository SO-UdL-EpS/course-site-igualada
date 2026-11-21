# Developer & Architecture Guide — Sistemes Operatius (UdL)

This guide documents the actual production architecture of the **Sistemes Operatius** course platform (`course-site-igualada`) for future maintainers.

---

## 1. Tech Stack & Dependencies

- **Static Site Generator**: Quarto (`_quarto.yml`, custom extension `_extensions/udl-course/`).
- **Presentations**: Reveal.js (built into Quarto via `revealjs` format + `_extensions/udl-course/styles/revealjs.scss` + `styles/slides.scss`).
- **Styling**: Modular SCSS compiled by Quarto's built-in Dart Sass into `docs/site_libs/bootstrap/bootstrap-<hash>.min.css` and `bootstrap-dark-<hash>.min.css`. Zero external font CDN imports.
- **Client-Side Interactivity**: Vanilla ES6 JavaScript (`assets/js/grade-engine.js`, `assets/js/course-ui.js`). Zero frontend framework dependencies (no React/Vue/jQuery/Tailwind).
- **PDF & ZIP Pipeline**: Python 3.12 (`scripts/sync_course.py`, `scripts/build_pdfs.py`) invoking Pandoc + Typst (bundled with Quarto) and Python's `zipfile`.
- **Testing & QA**: Node.js (`scripts/test_calculator.js`) and Python (`scripts/audit_content.py`, `scripts/verify_build.py`).
- **CI/CD Deployment**: GitHub Actions (`.github/workflows/publish.yml`) publishing `docs/` to `gh-pages`.

---

## 2. Directory Structure

```text
course-site-igualada/
├── _quarto.yml                       # Site config, navbar links, footer, resources
├── index.qmd                         # Minimalist hero homepage + recently visited resources
├── materials.qmd                     # Zero-friction expandable Materials Explorer
├── calculadora.qmd                   # Compact intelligent grade calculator
├── guia.qmd                          # Course syllabus, schedule & evaluation rules
├── blocs/                            # Academic content (01-espai-usuari, 02-proc, 03-sched, 07-shell)
│   └── <NN-slug>/{teoria,pralabs,activitats}/*.qmd
├── course-info/                      # Presentation slides & contribution guide
├── data/
│   └── course-catalog.json           # Single source of truth: blocks, items, academicYears
├── assets/
│   ├── js/
│   │   ├── grade-engine.js           # Pure UMD grade calculation & feasibility engine
│   │   └── course-ui.js              # Global nav, Materials explorer, doc/slide viewers, calculator UI
│   └── vendor/asciinema/             # Self-hosted Asciinema player assets
├── _extensions/udl-course/
│   ├── _extension.yml                # Custom Quarto format `udl-course-html`
│   ├── components.lua                # Lua filter for pedagogical callouts (.objectius, .exercici, etc.)
│   └── styles/
│       ├── styles.scss               # Main SCSS entrypoint
│       ├── dark.scss                 # Dark theme entrypoint
│       ├── revealjs.scss             # Reveal.js presentation entrypoint
│       ├── tokens/                   # _colors.scss, _spacing.scss, _typography.scss, _variables.scss
│       ├── layouts/                  # _page.scss, _navigation.scss, _sidebar.scss, _dashboard.scss, _footer.scss, _darkmode.scss
│       └── components/               # _tables.scss, _figures.scss, _code.scss, _callouts.scss
├── documentation/
│   ├── PROFESSOR_GUIDE.md            # Source of truth (copied to docs/PROFESSOR_GUIDE.md by build_pdfs.py)
│   └── DEVELOPER_GUIDE.md            # Source of truth (copied to docs/DEVELOPER_GUIDE.md by build_pdfs.py)
├── scripts/
│   ├── sync_course.py                # Auto-discovery & validation CLI (status, sync, validate, add-block)
│   ├── build_pdfs.py                 # PDF/ZIP compiler, manifest/JSON splitter & nested chrome synchronizer
│   ├── audit_content.py              # Static image/asset/link audit
│   ├── test_calculator.js            # 16 automated unit/integration tests for grade-engine.js
│   └── verify_build.py               # End-to-end HTML/DOM/link/PDF/ZIP verification suite
└── docs/                             # Built static website output (deployed to GitHub Pages)
```

---

## 3. Routing & Shared Layout Architecture

- **Top-level routes**: `/index.html`, `/materials.html`, `/calculadora.html`, `/guia.html`.
- **Materials SPA deep-link routes**:
  - `/materials.html` — 3-level expandable resource explorer (`Bloc → Categoria → Recurs`).
  - `/materials.html?bloc=01` — Direct block view (existing categories via `CategoryRow`).
  - `/materials.html?bloc=01&sec=teoria` — Direct category view (existing resources via `ResourceRow`).
- **Document routes (20 HTML pages)**: `/blocs/<slug>/{pralabs,activitats}/*.html` and `/course-info/contributions/contribute.html`, rendered with `udl-course-html` and enhanced by `initHtmlDocumentViewer()` (breadcrumbs, solution toggle, PDF button, sequential prev/next footer).
- **Presentation routes (16 RevealJS decks)**: `/blocs/<slug>/teoria/*.html` and `/course-info/presentation-slides.html`, enhanced by `initRevealPresentation()` (42px floating top bar, slide outline drawer, direct PDF download).
- **Chrome Synchronization**: When rendering a subset of `.qmd` files locally, `scripts/build_pdfs.py` runs `sync_nested_html_chrome()` so all 20 nested HTML pages inherit the exact compiled Bootstrap CSS hash, `<header id="quarto-header">`, and `<footer class="footer">` from `docs/index.html`.

---

## 4. Responsive Fixed Navigation & Theme Management

- **Single source of truth**: Navigation links (`Inici`, `Materials`, `Calculadora`, `Guia docent`) are defined once in `_quarto.yml` (`website.navbar.left`) and read at runtime by `initTopNavbar()` in `assets/js/course-ui.js`.
- **Fixed header (`_navigation.scss` & `_page.scss`)**: `#quarto-header` uses `position: fixed; top: 0; left: 0; right: 0; z-index: 1050;` with `env(safe-area-inset-top)`. `body:has(#quarto-header)` reserves matching `padding-top` so content is never obscured.
- **Desktop (`> 640px`)**: Three centered floating capsules (`40px` tall, `9999px` radius): `[ Inici | Materials | Calculadora | Guia docent ]  [ Recents ]  [ ☀ / ☾ ]`.
- **Mobile (`<= 640px`)**: Only the fixed hamburger button (`#udl-nav-menu-btn`) appears in the header. Pressing it opens `#udl-nav-overlay` (`position: fixed; height: 100dvh; z-index: 1040;`) with scroll locking (`html.udl-nav-locked`), keyboard focus trapping, `Escape` closing, secondary `Consultats recentment` list, and the `Aparença` sun/moon theme switch at the bottom.
- **Single Theme State**: Both desktop and mobile sun/moon switches (`.udl-theme-switch`) invoke Quarto's native `window.quartoToggleColorScheme()` and stay synchronized via a `MutationObserver` on `document.body`'s `class` attribute (`quarto-dark` / `quarto-light`).

---

## 5. Materials Data Model & Content Discovery

1. **Authoritative Source**: `data/course-catalog.json`.
2. **Auto-Discovery**: `python scripts/sync_course.py sync` scans `blocs/<NN-slug>/{teoria,pralabs,activitats}/*.qmd`, extracts YAML frontmatter, and registers new blocks/subsections/items in `data/course-catalog.json`.
3. **Static Data Endpoints**: `scripts/build_pdfs.py` publishes:
   - `docs/downloads/manifest.json` (full catalog + live PDF/ZIP byte sizes; fetched once per browser session and cached in `sessionStorage`).
   - `docs/downloads/data/blocks-overview.json` and `docs/downloads/data/block-<id>.json` (per-block lazy hydration).
   - `docs/downloads/data/academic-years.json` (validated grading configurations).
4. **Reusable Components in `course-ui.js`**:
   - `createResourceRow(item, opts)` — shared across Homepage Recents, Materials Explorer Level 3, Materials Search, and direct category views.
   - `el(tag, attrs, children)` — safe DOM builder using `textContent` and `setAttribute` (prevents DOM-based XSS).

---

## 6. Grade Calculator Architecture & Security

- **Engine (`assets/js/grade-engine.js`)**: Pure UMD module with zero DOM dependencies.
  - `sanitizeGradeInput(rawVal, maxScore)` strictly distinguishes empty (`""`/`null`/`undefined` → `empty: true`) from confirmed zero (`0`/`"0"` → `empty: false, value: 0`).
  - `calculateGrade(config, userInputs)` evaluates known contribution, remaining regular weight, mandatory item/category `minGrade` constraints, recovery replacements (`replace` or `max`), optional bonus caps, passing feasibility, required weighted average on pending assessments, and upward-rounded (`roundUp`) passing example plans.
  - `validateYearConfig(config)` enforces 100% regular weight sums and valid ranges.
- **Student UI (`calculadora.qmd` + `initGradeCalculatorPage()`)**: Read-only with respect to official weights; persists only the student's own entered grades in `localStorage` (`so_udl_calc_inputs_v4`).
- **Professor Authorization Boundary**: Because this is a static Quarto site without a backend server, no client-side grading editor or unprotected admin URL exists in `calculadora.html`. Official grading schemas are updated in `data/course-catalog.json` via Git repository permissions and validated in CI by `scripts/sync_course.py validate` and `scripts/test_calculator.js`. Adding web-based professor editing in the future would require a backend API with server-side authentication (e.g. UdL SSO/OAuth2 + role authorization) and persistent storage.

---

## 7. Build, Test & Development Commands

```bash
# Discover new .qmd materials and validate data/course-catalog.json
python scripts/sync_course.py sync
python scripts/sync_course.py validate

# Static asset & link audit
python scripts/audit_content.py

# Render full Quarto website to docs/
quarto render

# Compile PDFs, build ZIP archives, split JSONs, sync docs guides & nested HTML chrome
python scripts/build_pdfs.py

# Run all 16 Grade Engine unit tests
node scripts/test_calculator.js

# Run end-to-end HTML, DOM invariant, link, PDF & ZIP verification
python scripts/verify_build.py

# Serve locally for manual testing
python -m http.server 8000 --directory docs
```

**Environment Variables (optional)**:
- `PANDOC_BIN`, `TYPST_BIN`: Override auto-detected Pandoc/Typst binaries in `scripts/build_pdfs.py`.
- `GITHUB_TOKEN`: Used automatically by `.github/workflows/publish.yml` for GitHub Pages deployment.

---

## 8. Extending Without Duplicating Code

- **New styles**: Add tokens to `_extensions/udl-course/styles/tokens/` and reuse existing classes (`.udl-btn`, `.udl-clean-row`, `.udl-code-pill`, `.udl-breadcrumb`). Never re-introduce duplicate button or card systems.
- **New interactive tool**: Implement pure logic in `assets/js/<tool>-engine.js` (UMD), add Node.js unit tests under `scripts/test_<tool>.js`, hook it into `scripts/verify_build.py`, and load the script with `defer` only on the `.qmd` page that needs it.
