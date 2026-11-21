# Final Production Readiness Audit Report — Sistemes Operatius (UdL)

**Audit Date**: 2026-11-21  
**Repository**: `SO-UdL-EpS/course-site-igualada` (`main` branch, base commit `af17fe8`)  
**Target Site**: `igualada.os.udl.cat` (Universitat de Lleida · Campus Igualada)

---

## 1. Executive Summary

The **Sistemes Operatius** educational platform has completed its production-readiness audit across content integrity, PDF/ZIP generation, Materials explorer navigation, fixed desktop/mobile navigation, light/dark theming, intelligent grade calculation, professor workflow compatibility, security, accessibility, performance, and documentation.

- **All 36 academic source `.qmd` files** (34 in `blocs/`, 2 in `course-info/`) are preserved, registered in `data/course-catalog.json`, and rendered to HTML with **0 broken links** across **6,522 local references**.
- **All 36 compiled PDFs** and **7 ZIP archives** pass structural, signature, extraction, checksum, and byte-size integrity checks with **0 failures**.
- **All 16 automated Grade Engine unit/integration test suites pass**, verifying empty-vs-zero distinction, reactive required-grade projections, mandatory category/item minimum constraints, recovery replacement, impossible scenarios, and upward rounding.
- **Professor workflow compatibility** was verified end-to-end with a safe reversible test (`sync_course.py sync` → `validate` → PDF compilation → clean restore).
- **One hygiene issue (P2)** was found and fixed during the audit: 14 stale hashed `bootstrap*.min.css` files (`7.49 MiB`) left by prior partial renders were pruned from `docs/site_libs/bootstrap/`, and automatic pruning was added to `scripts/build_pdfs.py`.
- **Two transparent limitations** are documented below: (1) this is a static GitHub Pages site without a backend auth server, so official grading rules are governed by Git repository permissions + CI validation rather than a web admin UI; (2) automated live-browser multi-viewport runs were canceled by user takeover in earlier turns, so visual browser sign-off across all 9 viewports is marked `BLOCKED` pending manual or uninterrupted browser execution.

---

## 2. Architecture Overview

- **Static Site Generator**: Quarto (`_quarto.yml`, custom extension `_extensions/udl-course/`).
- **Presentations**: Reveal.js (`revealjs` format, 16 decks).
- **Styling**: Modular SCSS compiled by Dart Sass into `bootstrap-fa4ab572ea6fcf5c4b1f051a22b03f60.min.css` (543.6 KiB) and `bootstrap-dark-32e259fe5cecc23894efad03af83be41.min.css` (544.0 KiB).
- **Client Runtime**: Vanilla ES6 JavaScript (`assets/js/course-ui.js` 100.5 KiB, `assets/js/grade-engine.js` 44.7 KiB), zero external frontend frameworks or font CDNs.
- **Content Source of Truth**: `blocs/<NN-slug>/{teoria,pralabs,activitats}/*.qmd` + `data/course-catalog.json`.
- **Automation & CI/CD**: `scripts/sync_course.py`, `scripts/audit_content.py`, `scripts/build_pdfs.py` (Pandoc + Typst + `zipfile`), `scripts/test_calculator.js`, `scripts/verify_build.py`, orchestrated by `.github/workflows/publish.yml` → `gh-pages`.

---

## 3. Audit Checklist

| Area / Requirement | Status | Evidence |
| :--- | :---: | :--- |
| Original `.qmd` academic content preserved (36/36) | **PASS** | `deep_audit.py`: 36 source `.qmd` = 36 catalog items = 36 rendered HTMLs, 0 unregistered, 0 missing |
| Individual PDFs valid (`%PDF-1.`, `%%EOF`, pages > 0, SHA-256) | **PASS** | `deep_audit.py`: 36/36 PDFs verified, 0 failures, exact byte size match with `manifest.json` |
| ZIP archives valid, extractable, clean paths, SHA-256 | **PASS** | `deep_audit.py`: 7/7 ZIPs pass `testzip()`, extraction, path-safety, and SHA-256 checks |
| Expandable 3-level Materials Explorer (`Bloc → Categoria → Recurs`) | **PASS** | `verify_build.py`: `udl-exp-list`, `udl-exp-block-trigger`, `udl-exp-cat-trigger`, `createResourceRow` verified |
| Direct deep-link routes (`?bloc=XX`, `?bloc=XX&sec=YY`, nested HTML) | **PASS** | `verify_build.py`: 40 HTML pages, 6,522 local links checked, 0 broken references |
| Fixed desktop navbar (no `SO`, `Guia docent` last, separate `Recents` & sun/moon toggle) | **PASS** | `_navigation.scss`, `course-ui.js`, `verify_build.py` (0 legacy dark attrs, consistent CSS hash across all 24 doc pages) |
| Full-screen mobile navigation overlay (`100dvh`, scroll lock, focus trap, theme inside menu) | **PASS** | Implemented & statically verified in `_navigation.scss` + `course-ui.js`; live visual check on all 9 viewports marked `BLOCKED` below |
| Intelligent Grade Calculator math & empty-vs-zero semantics | **PASS** | `node scripts/test_calculator.js`: 16/16 test suites passing |
| Web-based Professor Grading Admin UI | **NOT APPLICABLE** | Static GitHub Pages site without backend auth; unprotected client-side modal intentionally removed (`verify_build.py` enforces absence) |
| Professor content addition workflow (`blocs/` + `sync_course.py`) | **PASS** | Reversible end-to-end test added `blocs/07-shell/activitats/01_test_workflow.qmd`, synced, validated, compiled 36 KB PDF, and cleanly restored |
| Interactive activities & `Mostrar solucions` preserved | **PASS** | `initHtmlDocumentViewer()` + `_callouts.scss` preserved across all 20 document HTML pages |
| Automated multi-viewport browser visual pass (9 viewports) | **BLOCKED** | Prior browser subagent runs were canceled by user takeover; manual inspection via `python -m http.server 8000 --directory docs` recommended |
| Security static audit (XSS, path traversal, secrets, `.env`) | **PASS** | `deep_audit.py`: 0 `.env` files, 0 `eval`/`Function`, 2 `innerHTML` uses strictly for hardcoded SVG constants, 0 unsafe ZIP paths |
| Professor & Developer documentation synchronized | **PASS** | `documentation/PROFESSOR_GUIDE.md` & `documentation/DEVELOPER_GUIDE.md` synced to `docs/` |

---

## 4. Content Integrity

- **Source Inventory**: 34 `.qmd` files in `blocs/` (`01-espai-usuari`: 15, `02-proc`: 13, `03-sched`: 4, `07-shell`: 2) + 2 `.qmd` files in `course-info/` = **36 educational documents**.
- **Top-Level Hub Pages**: 4 (`index.qmd`, `materials.qmd`, `calculadora.qmd`, `guia.qmd`) → **40 total rendered HTML pages** in `docs/`.
- **Git Diff Check**: Zero `.qmd` academic files deleted or renamed. One duplicate unreferenced PNG (`blocs/01-espai-usuari/teoria/figures/03_crides_funcions_cpu_registres_stack/complet (còpia).png`) was removed in an earlier iteration; 1 external hotlinked image (`wizardzines.com`) was self-hosted at `blocs/02-proc/teoria/figures/03/wizardzines-signals.png`.

---

## 5. Download Audit (PDFs & ZIPs)

### 5.1 Individual PDFs (36 / 36 PASS)
Every PDF in `docs/downloads/pdf/` was validated for `%PDF-1.` header, `%%EOF` trailer, non-HTML content, page count > 0, exact byte size against `manifest.json`, and SHA-256 digest. Representative sample:

| ID | Filename | Size | Pages | SHA-256 (prefix) | Status |
| :--- | :--- | ---: | ---: | :--- | :---: |
| `b1-t01` | `SO-Bloc1-T01-Rols-i-funcions.pdf` | 1.5 MB | 45 | `8b3f4ec41c` | **PASS** |
| `b1-t03` | `SO-Bloc1-T03-Crides-funcions-stack.pdf` | 10.9 MB | 43 | `157c1e7c3e` | **PASS** |
| `b1-p01` | `SO-Bloc1-Pralab01-Del-C-a-la-memoria-I.pdf` | 194 KB | 10+ | Verified | **PASS** |
| `b1-a01` | `SO-Bloc1-Act01-UNIX-Time-Sharing-System.pdf` | 65 KB | 3+ | Verified | **PASS** |
| All 36 PDFs | `docs/downloads/pdf/*.pdf` | 52.0 MB total | All > 0 | 36/36 match | **PASS** |

### 5.2 Complete & Per-Block ZIP Archives (7 / 7 PASS)
All 7 ZIP archives in `docs/downloads/` are pre-generated automatically by `scripts/build_pdfs.py` (and in GitHub Actions CI). Every archive passed `zipfile.testzip()`, full extraction to a temporary directory, duplicate check, path-traversal check, secret-file check, byte-size check, and SHA-256 verification:

| Archive (`docs/downloads/`) | Entries | Size | SHA-256 (prefix) | Status |
| :--- | ---: | ---: | :--- | :---: |
| `SO-Curs-Complet-PDFs.zip` | 37 | 52.0 MB | `f7d402ab30` | **PASS** |
| `SO-Totes-les-Presentacions-PDFs.zip` | 16 | 47.1 MB | `7406ee57e4` | **PASS** |
| `SO-Tots-els-Pralabs-i-Activitats-PDFs.zip` | 21 | 4.8 MB | `21b9ea0b1f` | **PASS** |
| `SO-Bloc1-Espai-Usuari-PDFs.zip` | 15 | 43.6 MB | `908671afc9` | **PASS** |
| `SO-Bloc2-Processos-PDFs.zip` | 13 | 5.9 MB | `455be336db` | **PASS** |
| `SO-Bloc3-Planificacio-PDFs.zip` | 5 | 873 KB | `0cdacf9086` | **PASS** |
| `SO-Bloc7-Shell-Scripting-PDFs.zip` | 2 | 410 KB | `0392993121` | **PASS** |

---

## 6. Professor Workflow Verification

- **Established Workflow**: Add `.qmd` files under `blocs/<NN-slug>/{teoria,pralabs,activitats}/` (or scaffold a new block with `python scripts/sync_course.py add-block`), then run `sync_course.py sync` → `quarto render` → `build_pdfs.py` → `verify_build.py` (or push to `main` for GitHub Actions).
- **Verified Reversible Test**: Added temporary `blocs/07-shell/activitats/01_test_workflow.qmd`. `sync_course.py sync` auto-discovered the new `activitats` subsection inside Bloc 7, extracted title/subtitle, registered `b7-a01`, passed `sync_course.py validate`, and compiled `SO-Bloc7-Act-01-Activitat-de-prova-del-flux-doce.pdf` (36 KB). Temporary files and catalog were cleanly restored afterward.

---

## 7. Calculator Audit

- **Official Configurations Verified**: `2026–2027` (T1 25%, T2 25%, P1 15%, P2 15%, P3 10%, P4 10%, optional Bonus +0.5 capped at 10.0; T1/T2 independent recovery replacement), `2025–2026` (50% Theory with mandatory `3.5` average minimum, 35% Labs, 15% Activities), `2027–2028` (40/40/20 + optional Bonus).
- **Automated Verification (`node scripts/test_calculator.js`)**: **16 / 16 test suites passed**, verifying empty fields ≠ 0, confirmed 0, decimal comma/dot parsing, invalid input warnings, partial weighted averages, single-remaining exact grade, impossible passing detection, grouped category minimum enforcement (`min-pending` when total ≥ 5.0 but Theory min unsatisfied), item minimums, and upward rounding so plugging the suggested example plan back always yields `>= 5.00`.

---

## 8. Responsive Audit

- **Implemented Breakpoints**: Fixed navbar transitions cleanly at `640px` (`> 640px`: 3 floating capsules; `<= 640px`: fixed hamburger button + `100dvh` fixed full-screen overlay with scroll lock and theme switch inside the menu). Materials uses a single centered `920px` column (`_page.scss`) with responsive wrapping on `.udl-exp-block-trigger` and `.udl-clean-row`. Calculator uses a single centered `680px` column with `inputmode="decimal"` and `16px` mobile inputs to prevent iOS zoom.
- **Verification Status**: CSS/DOM responsive invariants verified statically; live browser visual capture across all 9 viewports (`1920×1080` to `320×568`) is marked **BLOCKED** because automated browser sessions were stopped by user takeover.

---

## 9. Security & Accessibility

- **Security**:
  - Static deployment (no server-side secrets, 0 `.env` files, 0 `eval`/`new Function`).
  - All user-visible dynamic DOM nodes are built via `el()` using `textContent`. The only 2 `innerHTML` assignments render hardcoded internal SVG constants (`SVG_ICONS`, `THEME_SUN`, `THEME_MOON`).
  - Unprotected client-side professor grading modal (`#calc-prof-modal`) was removed from `calculadora.html` so students cannot alter official grading rules.
  - All 7 ZIP archives verified free of path traversal or hidden/dev files.
- **Accessibility (WCAG 2.2 AA targets)**:
  - `<html lang="ca">` verified on all 40 pages.
  - Semantic landmarks (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`), `aria-expanded` & `aria-controls` on expandable Materials blocks/categories and mobile menu, `role="dialog" aria-modal="true"` + focus trap + `Escape` + focus restoration on mobile overlay, `aria-live="polite"` on calculator results and Materials stage, dynamic `"Activar mode clar"` / `"Activar mode fosc"` labels on sun/moon toggles, and `prefers-reduced-motion` respected.

---

## 10. Code Quality & Performance

- **Dead Code Removed**: Deleted unused `_cards.scss` (98 lines) and `_buttons.scss` (41 lines), pruned 454 dead lines from `_dashboard.scss`, 15 lines from `_footer.scss`, and 14 stale hashed Bootstrap CSS bundles (`7.49 MiB`) from `docs/site_libs/bootstrap/`.
- **Bundle Sizes**: Active light CSS `543.6 KiB`, dark CSS `544.0 KiB`, `course-ui.js` `100.5 KiB`, `grade-engine.js` `44.7 KiB` (loaded only on `calculadora.html`), `manifest.json` `79.0 KiB` (cached in `sessionStorage` once per session). Zero PDFs or slide decks are eagerly fetched on homepage or Materials load.

---

## 11. Test Results Summary

| Command | Outcome |
| :--- | :--- |
| `python scripts/sync_course.py validate` | **PASS** — `VALID: All catalog entries, IDs, PDFs, and .qmd paths are valid.` |
| `python scripts/audit_content.py` | **PASS** — `0 error(s), 20 warning(s)` (pre-existing large/unreferenced educational media preserved) |
| `node scripts/test_calculator.js` | **PASS** — `Completed 16 test suites successfully.` |
| `python scripts/verify_build.py` | **PASS** — `40 HTML pages, 6522 local references, 36 PDFs, 7 ZIP archives — 0 error(s), 0 warning(s)` |
| `python scratch/deep_audit.py` | **PASS** — `36/36 PDFs PASS, 7/7 ZIPs PASS, 0 security findings` |
| `python scratch/test_workflow.py` | **PASS** — Reversible professor workflow verified end-to-end |

---

## 12. Remaining Issues

| Severity | Issue | Notes |
| :---: | :--- | :--- |
| **P2 (Limitation)** | Automated live-browser visual check across all 9 viewports was interrupted by user takeover | Recommend quick manual spot-check at `1440×900`, `768×1024`, `390×844`, and `320×568` on `http://127.0.0.1:8000/`. |
| **P3 (Limitation)** | No server-side authenticated web admin for grading rules | Expected for static GitHub Pages; official rules are managed safely via Git PRs + CI validation. |
| **P3 (Info)** | 8 pre-existing PNG figures > 500 KiB and 12 unreferenced `.cast`/`.png` assets in `blocs/` | Preserved intentionally to avoid touching original educational assets. |

---

## 13. Pull Request Readiness (Descripció en Català)

### Què he canviat?
- **Explorador desplegable de Materials (`materials.qmd`, `course-ui.js`)**: accés directe en 3 nivells (`Bloc → Categoria → Recurs`) des d'una sola pàgina centrada, mantenint totes les rutes directes existents (`?bloc=XX`, `?bloc=XX&sec=YY`, presentacions i documents).
- **Descàrregues automàtiques en PDF i ZIP (`scripts/build_pdfs.py`, `scripts/sync_course.py`)**: compilació automatitzada de tots els 36 recursos en PDF (Pandoc + Typst) i generació de 7 paquets `.zip` (curs complet, teoria, pràctica i per bloc) integrats al flux de GitHub Actions.
- **Calculadora intel·ligent de qualificacions (`calculadora.qmd`, `assets/js/grade-engine.js`)**: interfície compacta i reactiva que distingeix notes pendents (caselles buides) de zeros confirmats, calcula la mitjana ponderada necessària a les avaluacions pendents, proposa combinacions vàlides arrodonides a l'alça, detecta escenaris impossibles i respecta mínims obligatoris per bloc/activitat i recuperacions.
- **Navegació fixa i responsive (`_navigation.scss`, `_page.scss`, `course-ui.js`)**: barra flotant fixa a escriptori amb càpsula `Recents` i selector sol/lluna de tema clar/fosc; menú mòbil a pantalla completa (`100dvh`) amb bloqueig de desplaçament i gestió de focus sense desplaçar el contingut.
- **Neteja de codi i documentació**: eliminació de CSS obsolet (`_cards.scss`, `_buttons.scss`, ~470 línies no utilitzades) i creació de `docs/PROFESSOR_GUIDE.md` (en català) i `docs/DEVELOPER_GUIDE.md`.

### Per què ho he canviat?
- Accedir a una presentació o activitat requeria massa passos intermedis i el menú mòbil anterior desplaçava el contingut de la pàgina cap avall.
- Els estudiants no disposaven de descàrregues directes en PDF ni paquets `.zip` per estudiar fora de línia.
- La calculadora anterior no responia de manera clara quant necessitava un estudiant a les proves pendents per aprovar.

### Quin valor aporta?
- **Per als estudiants**: descobriment ràpid dels materials en qualsevol dispositiu, estudi fora de línia amb PDF/ZIP verificats, mode fosc consistent i càlcul fiable del que cal treure per aprovar.
- **Per al professorat**: preserva el flux original d'afegir `.qmd` a `blocs/` mitjançant `scripts/sync_course.py sync`, automatitza PDFs i ZIPs a CI, i inclou una guia pràctica pas a pas en català (`docs/PROFESSOR_GUIDE.md`).

### Com ho he comprovat?
- `python scripts/sync_course.py validate` → **VALID** (36 recursos, pesos 100%).
- `python scripts/audit_content.py` → **0 errors**.
- `node scripts/test_calculator.js` → **16 / 16 suites passades**.
- `python scripts/verify_build.py` → **0 errors, 0 avisos** (40 pàgines HTML, 6.522 enllaços locals, 36 PDFs, 7 ZIPs).
- Prova reversible d'addició d'un nou `.qmd` a Bloc 7 (`sync_course.py sync` + compilació PDF + restauració neta) → **PASS**.

*(Recomanació de revisió: com que el diff inclou millores en 4 àrees independents — estil/navegació, explorador de materials, calculadora i pipeline PDF/ZIP — es pot presentar com un únic PR ben documentat o dividir-lo en 2 PRs: (1) UX/navegació + Materials + Calculadora, i (2) Pipeline PDF/ZIP + documentació.)*

---

## 14. Final Recommendation

**READY WITH NON-BLOCKING ISSUES**

**Justification**: Every automated integrity, link, PDF, ZIP, calculator math, security, and professor-workflow check passed with **0 errors**, and all 36 original academic `.qmd` resources are intact and verified. The only non-blocking item is performing a quick final visual spot-check in a local browser across mobile and desktop widths (`python -m http.server 8000 --directory docs`) before opening the Pull Request on GitHub.
