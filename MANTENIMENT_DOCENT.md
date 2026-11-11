# Guia de Manteniment i Gestió Docent

Aquesta guia explica de manera senzilla com gestionar, ampliar i protegir els materials docents de l'assignatura **Sistemes Operatius (SO)** allotjats en aquest repositori.

---

## 1. Com publicar els canvis a la web oficial (`igualada.os.udl.cat`)

El projecte està configurat amb **GitHub Actions** (`.github/workflows/publish.yml`) i domini personalitzat (`CNAME`: `igualada.os.udl.cat`):

- Cada vegada que es fa un `push` o es fusiona (*merge*) un Pull Request a la branca principal `main`, GitHub Actions executa `quarto-dev/quarto-actions/publish@v2`, compila automàticament tot el lloc web amb Quarto i publica el resultat a la branca `gh-pages` mantenint el fitxer `CNAME`.
- Totes les rutes d'estudi, icones, vídeos i enllaços es calculen amb rutes relatives (`quarto.project.offset`), de manera que funcionen tant sota el domini propi `https://igualada.os.udl.cat` com en previsualització local (`quarto preview`) o en un *fork* de GitHub Pages.
- No cal compilar manualment la carpeta `docs/` ni pujar fitxers HTML a mà.

---

## 2. Funcionalitats d'estudi i accessibilitat integrades automàticament

Totes les millores d'estudi i accessibilitat viuen desacoblades dins l'extensió `_extensions/udl-course/` (`components.lua`, `partials/study-tools.html` i `styles/`) i `styles/slides.scss`:

1. **Doble vista a les presentacions (`Apunts` / `Diapos`)**:
   - L'estudiant pot alternar en qualsevol moment entre la presentació Reveal.js (`Diapos`) i el format de llibre de text continu (`Apunts`) amb índex lateral acoplat, cercador en viu i temps de lectura estimat.
2. **Agrupació intel·ligent d'apartats i filtre `Resum`**:
   - Les diapositives de continuació (`(I)`, `(II)`, títols amb el mateix prefix temàtic o parelles d'exercici + solució) s'agrupen automàticament sota un mateix apartat lògic.
   - Els botons `✓ Marca com a clar` i `+ Guarda al resum` permeten fer seguiment del progrés i filtrar només els apartats seleccionats per repassar o imprimir.
3. **Mode `Practica` interactiu (a Teoria i Activitats)**:
   - Tant als temes de teoria (botó `Practica`) com a les pàgines d'activitats (`Activa mode pràctica`), l'estudiant pot ocultar les solucions, escriure la seva resposta per pensar-la abans de mirar-la, revelar cada solució individualment i autoavaluar-se (`✓ Ho he encertat` / `↻ Per repassar`) amb marcador en viu.
4. **Exportació neta a PDF (`Desa PDF`)**:
   - Genera un document DIN A4 d'estudi amb fons clar d'alt contrast (fins i tot si l'usuari tenia el tema fosc activat), sense URL ni capçaleres automàtiques del navegador (`@page` amb marge vertical 0 i `box-decoration-break: clone`) i amb totes les caixes de codi i *callouts* alineades.
5. **Preferències de lectura i accessibilitat (WCAG AA)**:
   - Selector de tipografia (Atkinson Hyperlegible, Lexend, OpenDyslexic), lectura fàcil, mida de lletra (100%–130%), guia de lectura (línia o màscara), lectura en veu alta en català i mode concentració (`Focus`).

---

## 3. Com afegir, moure o modificar continguts

Tota l'estructura dels continguts està desacoblada del motor de presentació:

### Afegir un tema nou o pràctica
1. **Crear el document Quarto (`.qmd`)**:
   - Si és una sessió de teoria (presentació + apunts): crear el fitxer a la carpeta de teoria corresponent (ex: `blocs/02-proc/teoria/06-nou-tema.qmd`).
   - Si és una pràctica o activitat: crear-lo a `pralabs/` o `activitats/`.
2. **Registrar-lo a la navegació (`_quarto.yml`)**:
   - Obre `_quarto.yml` i afegeix una línia amb la ruta sota la secció corresponent:
     ```yaml
     - href: blocs/02-proc/teoria/06-nou-tema.qmd
     ```

> **Automàtic i resilient:** No cal tocar cap script JavaScript ni filtre Lua. El sistema detecta automàticament els encapçalaments, calcula el temps estimat de lectura sobre el text real, genera els botons d'estudi i connecta l'alternança entre format d'apunts continus i diapositives.

### Afegir demostracions interactives de terminal (`.cast`)
Per incloure una gravació de consola (amb Asciinema) en qualsevol diapositiva:
1. Deixa el fitxer `.cast` a la carpeta `cast/` del tema (per exemple `cast/01/demo.cast`).
2. A la capçalera YAML del `.qmd`, assegura't que el recurs s'inclogui:
   ```yaml
   resources:
     - cast/01/*.cast
   ```
3. A la diapositiva desitjada, afegeix el contenidor i la crida estàndard:
   ```html
   <div id="demo-exemple"></div>
   <script>
   AsciinemaPlayer.create('cast/01/demo.cast', document.getElementById('demo-exemple'), {
     autoPlay: false,
     speed: 1,
     cols: 120,
     rows: 20
   });
   </script>
   ```
> **Protecció automàtica:** El motor d'accessibilitat aïlla automàticament els esdeveniments de teclat (perquè escriure o prémer espai no passi de diapositiva), permet controls complets de reproducció amb el ratolí/pantalla tàctil, i a l'exportació a PDF substitueix automàticament el reproductor per una targeta acadèmica neta per no generar requadres buits ni trencar el format d'estudi en paper.

---

## 4. Com personalitzar el disseny i colors

Si es vol canviar la paleta de colors o la identitat visual de l'assignatura, tots els valors estan centralitzats en un únic punt:

- **Colors de marca i categories pedagògiques**:
  Fitxer: `_extensions/udl-course/styles/tokens/_colors.scss`
  - `$os-maroon`: color principal (accents, botons, laboratoris).
  - `$os-navy`: color secundari (teoria, capçaleres).
  - `$color-exam`: color d'avaluació i exàmens (contrast WCAG AA garantit).
- **Tipografia**:
  Fitxer: `_extensions/udl-course/styles/tokens/_typography.scss`
- **Dades de l'assignatura i enllaços**:
  Fitxer: `_quarto.yml` (títol, peu de pàgina, enllaç a la guia docent oficial de la UdL).

---

## 5. Com protegir el web i evitar modificacions no autoritzades

La web està dissenyada amb una arquitectura d'alta seguretat:

### 1. Integritat del web públic (GitHub Pages)
- El lloc web generat és **100% estàtic (HTML, CSS i JS pur)**.
- No hi ha bases de dades ni servidors dinàmics que puguin ser modificats o atacats per usuaris externs.
- Totes les accions dels estudiants (marcar apartats com a clars, desar resums, respondre qüestionaris o fer exercicis interactius) es desen exclusivament al `localStorage` del navegador privat de l'estudiant. Cap acció d'un alumne pot alterar el contingut que veuen els altres.

### 2. Protecció del repositori a GitHub (Control d'escriptura)
Per garantir que només el professorat pugui aprovar canvis i que cap estudiant ni usuari pugui modificar directament els fitxers del curs:

1. Vés a la pestanya **Settings** del repositori a GitHub.
2. Al menú de l'esquerra, fes clic a **Branches** (o **Rulesets**).
3. Afegeix una regla de protecció per a la branca `main` (**Branch protection rule**):
   - **Branch name pattern**: `main`
   - Marca l'opció: **Require a pull request before merging** (obliga a passar per Pull Request).
   - Marca l'opció: **Require approvals** (defineix que cal com a mínim 1 aprovació del professor abans de fusionar).
   - Desmarca l'opció *Allow force pushes* i *Allow deletions*.
4. Fes clic a **Save changes**.

Amb aquesta configuració:
- Els estudiants poden proposar millores, errates o nous exercicis mitjançant un *fork* i un *Pull Request* (seguint la filosofia docent d'Open Source).
- **El professor té el control absolut**: Cap canvi s'incorpora als materials oficials ni es publica a la web sense la revisió i aprovació expressa del professor.

---

## 6. Proves locals abans de publicar

Per provar la web en local abans de pujar canvis a GitHub:
```powershell
# Compilar tot el lloc web
quarto render

# Iniciar el servidor de previsualització amb recàrrega en viu
quarto preview
```
