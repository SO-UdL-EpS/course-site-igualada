# Guia del Professorat — Sistemes Operatius (UdL)

## 1. Introducció

El web docent de **Sistemes Operatius** (Grau en Enginyeria Informàtica · Campus Igualada · Universitat de Lleida) és un lloc estàtic generat amb **Quarto** i publicat automàticament a GitHub Pages.

Conté quatre seccions principals accessibles des de la barra superior:
- **Inici** (`index.qmd`): portada de l'assignatura i historial dels darrers materials consultats per l'estudiant.
- **Materials** (`materials.qmd`): explorador desplegable per blocs temàtics (`Bloc → Categoria → Recurs`) amb accés directe a presentacions, laboratoris, activitats, PDFs individuals i paquets `.zip`.
- **Calculadora** (`calculadora.qmd`): simulador de qualificacions que calcula la nota final i què necessita l'estudiant a les avaluacions pendents per aprovar.
- **Guia docent** (`guia.qmd`): resum del temari, calendari, metodologia i criteris d'avaluació.

No cal editar codi HTML, CSS ni JavaScript per afegir o actualitzar materials docents: tot el contingut es gestiona mitjançant fitxers `.qmd` dins de `blocs/` i el catàleg declaratiu `data/course-catalog.json`.

---

## 2. Estructura dels materials

Els materials s'organitzen en **blocs temàtics**, i cada bloc es divideix en fins a tres categories:
- **Teoria** (`teoria/`): presentacions interactives de classe (`Reveal.js`).
- **Pralabs** (`pralabs/`): guions de laboratori pràctic guiats.
- **Activitats** (`activitats/`): exercicis, lectures i problemes resolts.

Estructura real del repositori:

```text
course-site-igualada/
├── blocs/
│   ├── 01-espai-usuari/
│   │   ├── teoria/          # Presentacions .qmd (T01..T07)
│   │   ├── pralabs/         # Guions de laboratori .qmd (Pralab 01..04)
│   │   └── activitats/      # Activitats .qmd (Act 01..04)
│   ├── 02-proc/
│   │   ├── teoria/
│   │   ├── pralabs/
│   │   └── activitats/
│   ├── 03-sched/
│   │   ├── teoria/
│   │   └── activitats/      # Inclou src/template.xlsx
│   └── 07-shell/
│       ├── teoria/
│       └── pralabs/
├── course-info/
│   ├── presentation-slides.qmd
│   └── contributions/contribute.qmd
├── data/
│   └── course-catalog.json  # Catàleg mestre (blocs, recursos i cursos acadèmics)
└── docs/
    └── downloads/
        ├── pdf/             # PDFs generats automàticament (un per recurs)
        ├── data/            # Fitxers JSON per bloc i cursos acadèmics
        ├── manifest.json    # Índex generat automàticament amb mides de fitxers
        └── SO-*.zip         # Paquets ZIP generats automàticament
```

> Només es mostren a la web les categories que contenen almenys un recurs. Si un bloc encara no té `pralabs/` o `activitats/`, aquella categoria no apareix.

---

## 3. Com afegir una presentació nova

1. **Ubicació i nom del fitxer**: creeu un fitxer `.qmd` dins de `blocs/<slug-del-bloc>/teoria/`, seguint la numeració correlativa amb dos dígits (per exemple, `blocs/07-shell/teoria/02-shell-funcions.qmd`).
2. **Format i metadades (encapçalament YAML)**: incloeu el títol, subtítol i format `revealjs` al principi del fitxer:

```yaml
---
title: "Shell scripting (II): Funcions i senyals"
subtitle: "Bloc 7 · Definició de funcions, àmbit de variables i trap"
author: "Jordi Mateo Fornés"
format:
  revealjs:
    theme: [simple, ../../../_extensions/udl-course/styles/revealjs.scss, ../../../styles/slides.scss]
    filters: [../../../_extensions/udl-course/components.lua]
    transition: fade
    slide-number: false
    controls: false
    menu: false
    incremental: true
    chalkboard: false
    slide-level: 2
    width: 1600
    height: 900
    margin: 0.08
    center: false
---
```

3. **Contingut**: cada secció principal comença amb `# Títol` i cada diapositiva amb `## Títol de la diapositiva`. Si hi incloeu imatges, deseu-les a `blocs/<slug-del-bloc>/teoria/figures/`.
4. **Registre al catàleg**: executeu:

```bash
python scripts/sync_course.py sync
```

L'script detecta automàticament el nou `.qmd`, n'extreu `title` i `subtitle` i l'afegeix a `data/course-catalog.json`. (Si voleu ajustar el codi o el subtítol visible a l'explorador, podeu editar aquella entrada a `data/course-catalog.json`.)
5. **Compilació i verificació**: executeu `quarto render`, `python scripts/build_pdfs.py` i `python scripts/verify_build.py`. La presentació apareixerà automàticament dins del bloc i la categoria **Teoria** a `materials.html`, juntament amb el seu PDF compilat.

---

## 4. Com afegir un PDF

Hi ha dos casos habituals:

### Cas A — PDF generat automàticament a partir d'un `.qmd` (Flux recomanat)
Qualsevol presentació, pralab o activitat en format `.qmd` registrada a `data/course-catalog.json` genera automàticament el seu PDF a `docs/downloads/pdf/` mitjançant Pandoc + Typst quan s'executa:

```bash
python scripts/build_pdfs.py
```

### Cas B — Substituir o publicar un PDF extern ja maquetat
Actualment, el catàleg i l'script `scripts/build_pdfs.py` esperen que cada recurs tingui un fitxer `.qmd` associat. Si voleu que l'enllaç de descàrrega PDF d'un recurs existent serveixi un PDF extern ja maquetat:
1. Consulteu el nom de fitxer definit al camp `"pdf"` del recurs dins de `data/course-catalog.json` (per exemple, `SO-Bloc1-Act01-UNIX-Time-Sharing-System.pdf`).
2. Col·loqueu el vostre PDF a `docs/downloads/pdf/` amb exactament aquest nom.
3. Si no executeu `--force`, `scripts/build_pdfs.py` respecta els PDFs existents més recents que el `.qmd` font i els inclou automàticament als paquets `.zip` i a `manifest.json`.

> **Limitació actual**: si voleu publicar un PDF sol sense fitxer `.qmd` associat, cal crear-li una pàgina `.qmd` mínima de resum/enunciat dins del bloc o bé enllaçar-lo com a `extraDownload` (com es fa amb `blocs/03-sched/activitats/src/template.xlsx`).

---

## 5. Com afegir un Pralab o una Activitat

1. Creeu un fitxer `.qmd` dins de:
   - `blocs/<slug-del-bloc>/pralabs/` per a un laboratori (p. ex. `02_pipes_shell.qmd`), o
   - `blocs/<slug-del-bloc>/activitats/` per a una activitat (p. ex. `01_exercicis_bash.qmd`).
2. Utilitzeu l'encapçalament YAML de document HTML:

```yaml
---
title: "Exercicis de Shell Scripting"
subtitle: "Variables, redireccions, bucles i codis de retorn"
format: udl-course-html
---
```

3. **Solucions desplegables**: qualsevol bloc `<details><summary>Mostra la solució</summary>...</details>` del document quedarà connectat automàticament al botó **Mostrar solucions** de la barra superior del visor.
4. **Fitxers adjunts opcionals** (p. ex. plantilles `.xlsx` o codi font): deseu-los dins de `src/` de la subsecció i, si voleu un botó de descàrrega dedicat, afegiu el camp `"extraDownload"` a l'entrada corresponent de `data/course-catalog.json`.
5. Executeu `python scripts/sync_course.py sync`, `quarto render` i `python scripts/build_pdfs.py`.

---

## 6. Com afegir un bloc temàtic nou

Podeu crear un bloc nou (per exemple, **Bloc 4 — Gestió de Memòria**) de dues maneres:

### Opció A — Amb l'eina CLI (recomanat)
```bash
python scripts/sync_course.py add-block \
  --id 04 \
  --slug 04-memoria \
  --title "Gestió de Memòria" \
  --short-title "Memòria" \
  --description "Paginació, memòria virtual, taules de pàgines i substitució de pàgines."
```

Aquesta ordre crea `blocs/04-memoria/{teoria,pralabs,activitats}`, afegeix una presentació inicial d'exemple i registra el bloc a `data/course-catalog.json`.

### Opció B — Manualment
1. Creeu `blocs/04-memoria/` amb les subcarpetes necessàries (`teoria/`, `pralabs/`, `activitats/`).
2. Afegiu-hi els fitxers `.qmd`.
3. Executeu `python scripts/sync_course.py sync` i ajusteu `"title"`, `"shortTitle"` i `"description"` a `data/course-catalog.json`.

Un cop executat `quarto render` i `python scripts/build_pdfs.py`, el bloc nou apareixerà ordenat automàticament a l'explorador desplegable de **Materials** (`materials.html`), tindrà la seva ruta directa (`materials.html?bloc=04`) i generarà el seu paquet `.zip` (`SO-Bloc-4-Memoria-PDFs.zip`).

---

## 7. Com actualitzar o substituir material

- **Actualitzar contingut sense trencar enllaços**: editeu directament el fitxer `.qmd` existent mantenint el mateix nom de fitxer i la mateixa ruta. D'aquesta manera, la URL pública (`.html`), l'`id` al catàleg, l'historial de *Recents* dels estudiants i els enllaços externs (p. ex. des del Campus Virtual) continuen funcionant sense canvis.
- **Regenerar el PDF després d'editar**: `python scripts/build_pdfs.py` detecta automàticament que el `.qmd` és més recent que el PDF i el recompila. Si voleu forçar la recompilació de tots els PDFs, executeu `python scripts/build_pdfs.py --force`.
- **Reordenar blocs o recursos**: canvieu l'ordre dels elements dins de `"blocks"` o `"items"` a `data/course-catalog.json`. Aquest ordre determina la visualització a **Materials** i la navegació `Anterior / Següent` dins dels documents.

---

## 8. Paquets ZIP

Els paquets `.zip` es generen automàticament mitjançant `scripts/build_pdfs.py` i es desen a `docs/downloads/`:
- `SO-Curs-Complet-PDFs.zip`: tots els PDFs del curs i la plantilla Excel, organitzats per carpetes.
- `SO-Totes-les-Presentacions-PDFs.zip`: totes les presentacions de teoria.
- `SO-Tots-els-Pralabs-i-Activitats-PDFs.zip`: tots els pralabs, activitats i guies.
- Un paquet `.zip` individual per a cada bloc temàtic (`SO-Bloc1-...zip`, `SO-Bloc2-...zip`, etc.).

No cal crear ni comprimir cap `.zip` manualment: cada vegada que s'executa `python scripts/build_pdfs.py` (o es fa `git push` a `main` amb GitHub Actions), tots els `.zip` i les seves mides visibles a la web s'actualitzen automàticament.

---

## 9. Com comprovar que funciona

Abans o després de publicar canvis, executeu el flux complet:

```bash
python scripts/sync_course.py sync
quarto render
python scripts/build_pdfs.py
python scripts/verify_build.py
```

I comproveu en local (`python -m http.server 8000 --directory docs` → `http://127.0.0.1:8000/`):
- [ ] El nou recurs apareix dins del bloc i categoria esperats a `materials.html`.
- [ ] El títol i el subtítol són correctes.
- [ ] En clicar-lo s'obre correctament (presentació o document HTML).
- [ ] El botó **PDF** descarrega el fitxer correcte i el paquet `.zip` inclou el document.
- [ ] Es visualitza correctament en pantalla mòbil (sense desbordament horitzontal).
- [ ] `python scripts/verify_build.py` acaba amb **0 errors**.

---

## 10. Errors habituals

- **Fitxer col·locat fora de `teoria/`, `pralabs/` o `activitats/`**: `sync_course.py` només escaneja aquestes tres subcarpetes dins de `blocs/<slug>/`.
- **Format de fitxer incorrecte**: els materials han de ser `.qmd`. Els fitxers `.md` o `.pptx` no es compilen automàticament.
- **Falta el títol al YAML**: sense `title: "..."` a l'encapçalament YAML, `sync_course.py` generarà un títol automàtic a partir del nom del fitxer.
- **Imatges o fitxers adjunts amb rutes trencades**: executeu `python scripts/audit_content.py` i `python scripts/verify_build.py` per detectar qualsevol enllaç local trencat abans de publicar.
- **Canvis no visibles al navegador local**: feu un refresc forçat (`Ctrl + Shift + R`) per evitar la memòria cau de JS/CSS del navegador.

---

## 11. Actualització dels cursos acadèmics

Cal distingir entre **continguts docents** i **configuració d'avaluació**:
- **Continguts docents** (`blocs/`, `guia.qmd`): actualitzeu les dates del calendari a `guia.qmd` i els materials corresponents a `blocs/`.
- **Curs acadèmic actiu**: actualitzeu `"academicYear"` a `data/course-catalog.json` (secció `"course"`) i `"activeAcademicYear"` si afegiu una nova normativa d'avaluació.

---

## 12. Configuració de les notes

Les regles d'avaluació de cada curs acadèmic (`2026–2027`, `2025–2026`, `2027–2028`, etc.) es defineixen a l'array `"academicYears"` dins de `data/course-catalog.json`.

Per afegir o modificar un curs acadèmic:
1. Editeu `data/course-catalog.json` (categories, pesos `%`, notes mínimes `minGrade`, activitats recuperables `recoverable` i bonificacions `isBonus`).
2. Verifiqueu la coherència matemàtica i que la suma de pesos ordinaris sigui exactament del **100%**:
   ```bash
   python scripts/sync_course.py validate
   node scripts/test_calculator.js
   ```
3. Executeu `python scripts/build_pdfs.py` (que publica `docs/downloads/data/academic-years.json`) i pugeu el canvi al repositori Git.

> **Seguretat i limitació coneguda**: com que aquesta web és un lloc estàtic allotjat a GitHub Pages sense servidor backend ni sistema d'autenticació propi, **no hi ha cap panell d'edició web exposat a `calculadora.html`**. Això evita que els estudiants puguin alterar els pesos oficials. L'autorització per modificar les regles oficials es controla exclusivament mitjançant els permisos d'escriptura al repositori Git/GitHub i la validació automàtica de GitHub Actions.
