/**
 * Sistemes Operatius (UdL) — Unified Course UX, Floating Navigation,
 * Structured Materials Explorer, Presentation Viewer & Dynamic Calculator Controller (Iteration 3)
 *
 * Principles:
 * - Zero emojis anywhere in UI chrome; restrained, minimal inline SVG stroke icons.
 * - Floating Navigation Bar with contextual "Materials" dropdown and "Recents" popover.
 * - Minimalist Homepage: single hero section + recently visited materials list.
 * - Zero Mosaic / Card Grids: clean vertical lists and grouped hierarchical rows.
 * - Multi-Year Configurable Grade Calculator powered by `window.UDLGradeEngine` (`assets/js/grade-engine.js`)
 *   with a separated Professor Configuration Interface (`#calc-prof-modal`).
 * - Pre-computed PDF/ZIP sizes + sessionStorage caching for zero extra network requests on navigation.
 */
(function () {
  "use strict";

  const STORAGE_RECENT = "so_udl_recent_v2";
  const STORAGE_CALC_INPUTS = "so_udl_calc_inputs_v4";
  const STORAGE_CALC_ACTIVE_YEAR = "so_udl_active_year_v4";
  const SESSION_MANIFEST_CACHE = "so_udl_manifest_session_v3";

  // Minimalist 16x16 stroke SVG icon set (zero emojis)
  const SVG_ICONS = {
    chevronDown: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>',
    chevronRight: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4l4 4-4 4"/></svg>',
    chevronLeft: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 12L6 8l4-4"/></svg>',
    arrowLeft: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4"/></svg>',
    download: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2.5v7.5M5 7.5L8 10.5l3-3M3 13h10"/></svg>',
    outline: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4h11M2.5 8h7.5M2.5 12h9.5"/></svg>',
    clock: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/></svg>',
    eye: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></svg>',
    close: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>'
  };

  const DEFAULT_BUNDLES = {
    "zip-all": { id: "zip-all", filename: "SO-Curs-Complet-PDFs.zip", sizeHuman: "52.0 MB" },
    "zip-slides": { id: "zip-slides", filename: "SO-Totes-les-Presentacions-PDFs.zip", sizeHuman: "47.1 MB" },
    "zip-labs": { id: "zip-labs", filename: "SO-Tots-els-Pralabs-i-Activitats-PDFs.zip", sizeHuman: "4.8 MB" },
    "zip-bloc1": { id: "zip-bloc1", filename: "SO-Bloc1-Espai-Usuari-PDFs.zip", sizeHuman: "43.6 MB" },
    "zip-bloc2": { id: "zip-bloc2", filename: "SO-Bloc2-Processos-PDFs.zip", sizeHuman: "5.9 MB" },
    "zip-bloc3": { id: "zip-bloc3", filename: "SO-Bloc3-Planificacio-PDFs.zip", sizeHuman: "873 KB" },
    "zip-bloc7": { id: "zip-bloc7", filename: "SO-Bloc7-Shell-Scripting-PDFs.zip", sizeHuman: "410 KB" }
  };

  // Pre-populated catalog with exact PDF/ZIP sizes for instant zero-CLS rendering
  const DEFAULT_BLOCKS = [
    {
      id: "01",
      slug: "01-espai-usuari",
      number: "Bloc 1",
      title: "Desenvolupament de Programari en Espai d'Usuari",
      shortTitle: "Espai d'Usuari",
      description: "Arquitectura del sistema operatiu, espai d'adreces d'un procés, pila d'execució, compilació i enllaçat en C, estructures de dades, punters, memòria dinàmica i frontera amb el nucli mitjançant crides al sistema.",
      zipId: "zip-bloc1",
      zipFilename: "SO-Bloc1-Espai-Usuari-PDFs.zip",
      zipSizeHuman: "43.6 MB",
      subsections: [
        {
          id: "teoria",
          title: "Teoria",
          description: "Presentacions de classe sobre els fonaments del sistema operatiu, l'espai de memòria, l'ABI de crides de funció, la construcció d'executables i el camí de les crides al sistema.",
          items: [
            { id: "b1-t01", code: "T01", kind: "slide", typeLabel: "Presentació", title: "Rols i funcions d'un sistema operatiu", subtitle: "Il·lusionista, àrbitre i pega · abstraccions, virtualització i protecció de recursos", href: "blocs/01-espai-usuari/teoria/01_rols_funcions.html", pdf: "SO-Bloc1-T01-Rols-i-funcions.pdf", sizeHuman: "1.5 MB" },
            { id: "b1-t02", code: "T02", kind: "slide", typeLabel: "Presentació", title: "L'espai de memòria d'un procés", subtitle: "Segments de memòria (text, data, bss, heap, stack), adreces virtuals i temps de vida", href: "blocs/01-espai-usuari/teoria/02_espai_memoria_proces.html", pdf: "SO-Bloc1-T02-Espai-de-memoria.pdf", sizeHuman: "4.4 MB" },
            { id: "b1-t03", code: "T03", kind: "slide", typeLabel: "Presentació", title: "Crides de funció: CPU, registres i stack", subtitle: "Marcs d'activació (stack frames), registres RSP/RBP/RIP, convencions de crida (ABI) i GDB", href: "blocs/01-espai-usuari/teoria/03_crides_funcions_cpu_registres_stack.html", pdf: "SO-Bloc1-T03-Crides-funcions-stack.pdf", sizeHuman: "10.9 MB" },
            { id: "b1-t04", code: "T04", kind: "slide", typeLabel: "Presentació", title: "Com es construeix un programa C?", subtitle: "Preprocessament, compilació, assemblat, enllaçat (.o, biblioteques estàtiques/dinàmiques) i Make", href: "blocs/01-espai-usuari/teoria/04_construccio_progama_c.html", pdf: "SO-Bloc1-T04-Construccio-programa-C.pdf", sizeHuman: "9.0 MB" },
            { id: "b1-t05", code: "T05", kind: "slide", typeLabel: "Presentació", title: "De variables a estructures de dades", subtitle: "Punters, estructures (struct), alineament de memòria, punters a estructures i llistes enllaçades", href: "blocs/01-espai-usuari/teoria/05_variables_estructures.html", pdf: "SO-Bloc1-T05-Variables-i-estructures.pdf", sizeHuman: "2.8 MB" },
            { id: "b1-t06", code: "T06", kind: "slide", typeLabel: "Presentació", title: "System calls: del programa C al kernel", subtitle: "Frontera usuari/nucli, wrappers de libc, instrucció syscall, ABI x86-64/ARM64 i strace", href: "blocs/01-espai-usuari/teoria/06_syscalls_del_c_al_kernel.html", pdf: "SO-Bloc1-T06-Syscalls-del-C-al-kernel.pdf", sizeHuman: "6.0 MB" },
            { id: "b1-t07", code: "T07", kind: "slide", typeLabel: "Presentació", title: "System calls: dins del kernel", subtitle: "Pila de nucli, pt_regs, sys_call_table, copy_from_user, page faults i taula d'excepcions (EFAULT)", href: "blocs/01-espai-usuari/teoria/07_syscalls_kernel.html", pdf: "SO-Bloc1-T07-Syscalls-dins-del-kernel.pdf", sizeHuman: "9.0 MB" }
          ]
        },
        {
          id: "pralabs",
          title: "Pralabs",
          description: "Guions de laboratori pràctic sobre representació en memòria, punters, aritmètica d'adreces, gestió del heap amb malloc/free i punters dobles.",
          items: [
            { id: "b1-p01", code: "Pralab 01", kind: "pralab", typeLabel: "Laboratori", title: "Del C a la memòria (I)", subtitle: "On viuen les variables, sizeof, adreces (&x), desreferència (*p) i representació d'arrays", href: "blocs/01-espai-usuari/pralabs/01_c_mem.html", pdf: "SO-Bloc1-Pralab01-Del-C-a-la-memoria-I.pdf", sizeHuman: "194 KB" },
            { id: "b1-p02", code: "Pralab 02", kind: "pralab", typeLabel: "Laboratori", title: "Del v[i] al punter", subtitle: "Decaïment d'arrays a punter, aritmètica de punters, cadenes de caràcters i implementació de strlen", href: "blocs/01-espai-usuari/pralabs/02_c_mem.html", pdf: "SO-Bloc1-Pralab02-Del-vi-al-punter.pdf", sizeHuman: "145 KB" },
            { id: "b1-p03", code: "Pralab 03", kind: "pralab", typeLabel: "Laboratori", title: "Memòria dinàmica (I): malloc, free i lifetime", subtitle: "Reserva al heap, temps de vida de variables, punters penjants, fuites i detecció amb Valgrind", href: "blocs/01-espai-usuari/pralabs/03_c_heap.html", pdf: "SO-Bloc1-Pralab03-Memoria-dinamica-I.pdf", sizeHuman: "302 KB" },
            { id: "b1-p04", code: "Pralab 04", kind: "pralab", typeLabel: "Laboratori", title: "Memòria dinàmica (II): Punters a punters", subtitle: "Doble indirecció (**pp), argv/argc, paràmetres d'eixida i taules dinàmiques de cadenes", href: "blocs/01-espai-usuari/pralabs/04_c_ptrptr.html", pdf: "SO-Bloc1-Pralab04-Punters-a-punters.pdf", sizeHuman: "282 KB" }
          ]
        },
        {
          id: "activitats",
          title: "Activitats",
          description: "Lectures tècniques, inspecció de la pila amb GDB i projectes de programació modular en C.",
          items: [
            { id: "b1-a01", code: "Act 01", kind: "activitat", typeLabel: "Activitat", title: "Lectura: The UNIX Time-Sharing System", subtitle: "Lectura guiada de l'article clàssic de Ritchie i Thompson (1974) sobre el disseny d'UNIX", href: "blocs/01-espai-usuari/activitats/01_rols_funcions.html", pdf: "SO-Bloc1-Act01-UNIX-Time-Sharing-System.pdf", sizeHuman: "65 KB" },
            { id: "b1-a02", code: "Act 02", kind: "activitat", typeLabel: "Activitat", title: "Què passa quan faig foo()?", subtitle: "Predicció i verificació amb GDB dels registres, la pila i els marcs d'activació", href: "blocs/01-espai-usuari/activitats/02_espai_funcions.html", pdf: "SO-Bloc1-Act02-Que-passa-quan-faig-foo.pdf", sizeHuman: "142 KB" },
            { id: "b1-a03", code: "Act 03", kind: "activitat", typeLabel: "Activitat", title: "Exercicis amb C · Apuntadors i arrays", subtitle: "9 exercicis progressius de consolidació, ampliació i reptes sobre punters i cadenes", href: "blocs/01-espai-usuari/activitats/01_c_punters_arrays.html", pdf: "SO-Bloc1-Act03-Apuntadors-i-arrays.pdf", sizeHuman: "180 KB" },
            { id: "b1-a04", code: "Act 04", kind: "activitat", typeLabel: "Activitat", title: "Exercicis amb C · Pokémon", subtitle: "Projecte guiat amb struct, typedef, memòria dinàmica, tipus opacs, modularitat (.h/.c) i Makefile", href: "blocs/01-espai-usuari/activitats/03_pokemon.html", pdf: "SO-Bloc1-Act04-Exercicis-C-Pokemon.pdf", sizeHuman: "274 KB" }
          ]
        }
      ]
    },
    {
      id: "02",
      slug: "02-proc",
      number: "Bloc 2",
      title: "Execució i Comunicació de Processos",
      shortTitle: "Processos",
      description: "Model d'execució de processos a Linux, estats i PCB, creació i control amb fork/exec/wait, notificacions asíncrones amb senyals POSIX, redirecció d'E/S i comunicació per canonades (pipes i FIFOs).",
      zipId: "zip-bloc2",
      zipFilename: "SO-Bloc2-Processos-PDFs.zip",
      zipSizeHuman: "5.9 MB",
      subsections: [
        {
          id: "teoria",
          title: "Teoria",
          description: "Presentacions sobre l'abstracció de procés, cicle de vida, primitiva fork/exec, senyals i comunicació entre processos (IPC).",
          items: [
            { id: "b2-t01", code: "T01", kind: "slide", typeLabel: "Presentació", title: "Processos: concepte, estats i PCB", subtitle: "Model de 5 estats, estats reals a Linux (R, S, D, T, Z), PCB (task_struct), /proc i jerarquia", href: "blocs/02-proc/teoria/01-procs.html", pdf: "SO-Bloc2-T01-Processos-estats-PCB.pdf", sizeHuman: "2.4 MB" },
            { id: "b2-t02", code: "T02", kind: "slide", typeLabel: "Presentació", title: "Processos: Creació", subtitle: "Mecanisme fork(), copy-on-write, família exec(), wait()/waitpid(), processos zombis i orfes", href: "blocs/02-proc/teoria/02-create.html", pdf: "SO-Bloc2-T02-Processos-Creacio.pdf", sizeHuman: "861 KB" },
            { id: "b2-t03", code: "T03", kind: "slide", typeLabel: "Presentació", title: "Processos: Senyals", subtitle: "Notificacions asíncrones, senyals POSIX, kill(), signal(), sigaction(), màscares i temporitzadors", href: "blocs/02-proc/teoria/03-signals.html", pdf: "SO-Bloc2-T03-Processos-Senyals.pdf", sizeHuman: "532 KB" },
            { id: "b2-t04", code: "T04", kind: "slide", typeLabel: "Presentació", title: "Processos: Pipes i redirecció d'E/S", subtitle: "Taula de descriptors de fitxer, dup() i dup2(), canonades anònimes amb pipe() i pipelines", href: "blocs/02-proc/teoria/04-pipes.html", pdf: "SO-Bloc2-T04-Processos-Pipes-i-redireccio.pdf", sizeHuman: "416 KB" },
            { id: "b2-t05", code: "T05", kind: "slide", typeLabel: "Presentació", title: "Processos: Pipes amb nom (FIFO)", subtitle: "Fitxers especials FIFO al sistema de fitxers, mkfifo(), semàntica de bloqueig i client-servidor", href: "blocs/02-proc/teoria/05-fifos.html", pdf: "SO-Bloc2-T05-Processos-FIFOs.pdf", sizeHuman: "178 KB" }
          ]
        },
        {
          id: "pralabs",
          title: "Pralabs",
          description: "Desenvolupament incremental d'un intèrpret d'ordres propi (Minishell) en C al llarg de tres sessions de laboratori.",
          items: [
            { id: "b2-p01", code: "Pralab 05·I", kind: "pralab", typeLabel: "Laboratori", title: "Minishell (I): getline, fork, exec i wait", subtitle: "Lectura segura de línies amb getline(), creació de processos fills i recol·lecció d'estat amb macros WIF*", href: "blocs/02-proc/pralabs/01_minishell.html", pdf: "SO-Bloc2-Pralab05-I-Minishell.pdf", sizeHuman: "1.2 MB" },
            { id: "b2-p02", code: "Pralab 05·II", kind: "pralab", typeLabel: "Laboratori", title: "Minishell (II): strtok, cd, exit i senyals", subtitle: "Tokenització d'arguments, ordres internes (built-ins), seqüències (;, &&, ||) i tractament de SIGINT", href: "blocs/02-proc/pralabs/02_minishell.html", pdf: "SO-Bloc2-Pralab05-II-Minishell.pdf", sizeHuman: "476 KB" },
            { id: "b2-p03", code: "Pralab 05·III", kind: "pralab", typeLabel: "Laboratori", title: "Minishell (III): redireccions i pipes", subtitle: "Implementació de redireccions (<, >, >>) amb open+dup2 i connexió de processos amb pipe()", href: "blocs/02-proc/pralabs/03_minishell.html", pdf: "SO-Bloc2-Pralab05-III-Minishell.pdf", sizeHuman: "253 KB" }
          ]
        },
        {
          id: "activitats",
          title: "Activitats",
          description: "Col·leccions de problemes resolts pas a pas sobre arbres de processos, zombis, recobriment d'imatge, pipes i sincronització.",
          items: [
            { id: "b2-a01", code: "Act 01", kind: "activitat", typeLabel: "Activitat", title: "Problemes de classe · fork() i wait()", subtitle: "9 exercicis amb solució raonada i diagrames de seqüència sobre arbres de processos i sincronització", href: "blocs/02-proc/activitats/01-fork-wait.html", pdf: "SO-Bloc2-Act01-Problemes-fork-wait.pdf", sizeHuman: "207 KB" },
            { id: "b2-a02", code: "Act 02", kind: "activitat", typeLabel: "Activitat", title: "Exercicis de creació de processos en C", subtitle: "8 problemes sobre clonació d'espai de memòria, buffers d'stdio, bucles de fork i codis de retorn", href: "blocs/02-proc/activitats/02-create.html", pdf: "SO-Bloc2-Act02-Exercicis-creacio-processos.pdf", sizeHuman: "223 KB" },
            { id: "b2-a03", code: "Act 03", kind: "activitat", typeLabel: "Activitat", title: "Problemes de classe · zombis, orfes i exec()", subtitle: "10 exercicis resolts sobre recobriment d'imatge amb execl/execvp, estats Z i adopció per init/systemd", href: "blocs/02-proc/activitats/03-exec.html", pdf: "SO-Bloc2-Act03-Problemes-zombis-orfes-exec.pdf", sizeHuman: "202 KB" },
            { id: "b2-a04", code: "Act 04", kind: "activitat", typeLabel: "Activitat", title: "Exercicis de Pipes, FIFOs i dup en C", subtitle: "15 problemes resolts en 4 blocs: descriptors, EOF/SIGPIPE, pipelines multiprocés i FIFOs", href: "blocs/02-proc/activitats/04-pipes.html", pdf: "SO-Bloc2-Act04-Exercicis-Pipes-FIFOs-dup.pdf", sizeHuman: "460 KB" },
            { id: "b2-a05", code: "Act 05", kind: "activitat", typeLabel: "Activitat", title: "Exercici progressiu · Generador de loteria", subtitle: "Cas pràctic complet que evoluciona des de waitpid() fins a sincronització amb senyals i pipes", href: "blocs/02-proc/activitats/05-loteria.html", pdf: "SO-Bloc2-Act05-Exercici-Loteria.pdf", sizeHuman: "360 KB" }
          ]
        }
      ]
    },
    {
      id: "03",
      slug: "03-sched",
      number: "Bloc 3",
      title: "Planificació de Processos",
      shortTitle: "Planificació",
      description: "Criteris i mètriques de planificació de CPU, polítiques apropiatives i no apropiatives (FCFS, Round Robin, SJF/SRTF, Prioritats), cues multinivell (MLQ/MLFQ) i planificació a Linux.",
      zipId: "zip-bloc3",
      zipFilename: "SO-Bloc3-Planificacio-PDFs.zip",
      zipSizeHuman: "873 KB",
      subsections: [
        {
          id: "teoria",
          title: "Teoria",
          description: "Presentacions sobre mètriques de rendiment, algorismes clàssics de planificació i cues multinivell.",
          items: [
            { id: "b3-t01", code: "T01", kind: "slide", typeLabel: "Presentació", title: "Planificació de processos (I)", subtitle: "Ràfegues CPU-E/S, planificació apropiativa vs. no apropiativa, mètriques, FCFS i Round Robin", href: "blocs/03-sched/teoria/01-sched.html", pdf: "SO-Bloc3-T01-Planificacio-I.pdf", sizeHuman: "429 KB" },
            { id: "b3-t02", code: "T02", kind: "slide", typeLabel: "Presentació", title: "Planificació de processos (II)", subtitle: "Prioritats, fam i envelliment (aging), SJF/SRTF, cues multinivell (MLQ/MLFQ) i CFS/EEVDF a Linux", href: "blocs/03-sched/teoria/02-sched.html", pdf: "SO-Bloc3-T02-Planificacio-II.pdf", sizeHuman: "370 KB" }
          ]
        },
        {
          id: "activitats",
          title: "Activitats",
          description: "Problemes resolts amb diagrames de Gantt per a 1 i 2 CPU, càlcul de temps de retorn i d'espera, i plantilla de full de càlcul.",
          items: [
            {
              id: "b3-a01", code: "Act 01", kind: "activitat", typeLabel: "Activitat", title: "Problemes de planificació · FCFS i Round Robin", subtitle: "Convenis de resolució, diagrames de Gantt per a 1 i 2 CPU i comparativa de quantum", href: "blocs/03-sched/activitats/01-sched.html", pdf: "SO-Bloc3-Act01-FCFS-i-Round-Robin.pdf", sizeHuman: "353 KB",
              extraDownload: { label: "Plantilla .xlsx", href: "blocs/03-sched/activitats/src/template.xlsx", downloadName: "SO-Bloc3-Plantilla-Planificacio.xlsx" }
            },
            {
              id: "b3-a02", code: "Act 02", kind: "activitat", typeLabel: "Activitat", title: "Problemes de planificació · Prioritats, SJF/SRTF i cues multinivell", subtitle: "9 problemes complets (28 apartats resolts) amb cues multinivell amb i sense retroalimentació", href: "blocs/03-sched/activitats/02-sched.html", pdf: "SO-Bloc3-Act02-Prioritats-SJF-MLFQ.pdf", sizeHuman: "966 KB",
              extraDownload: { label: "Plantilla .xlsx", href: "blocs/03-sched/activitats/src/template.xlsx", downloadName: "SO-Bloc3-Plantilla-Planificacio.xlsx" }
            }
          ]
        }
      ]
    },
    {
      id: "07",
      slug: "07-shell",
      number: "Bloc 7",
      title: "Shell Scripting en Bash",
      shortTitle: "Shell Scripting",
      description: "Automatització de tasques d'administració i desenvolupament en Bash: variables d'entorn, expansions, estructures de control, codis de retorn i validació d'arguments.",
      zipId: "zip-bloc7",
      zipFilename: "SO-Bloc7-Shell-Scripting-PDFs.zip",
      zipSizeHuman: "410 KB",
      subsections: [
        {
          id: "teoria",
          title: "Teoria",
          description: "Presentació dels fonaments de l'intèrpret d'ordres Bash, sintaxi d'expansió i construcció d'scripts.",
          items: [
            { id: "b7-t01", code: "T01", kind: "slide", typeLabel: "Presentació", title: "Shell scripting (I)", subtitle: "Intèrpret d'ordres, variables d'entorn, cometes, expansions de paràmetres, aritmètica i arrays", href: "blocs/07-shell/teoria/01-shell.html", pdf: "SO-Bloc7-T01-Shell-Scripting-I.pdf", sizeHuman: "427 KB" }
          ]
        },
        {
          id: "pralabs",
          title: "Pralabs",
          description: "Laboratori pràctic per escriure, depurar i executar els primers scripts d'automatització en Bash.",
          items: [
            { id: "b7-p01", code: "Pralab 01", kind: "pralab", typeLabel: "Laboratori", title: "Primers scripts en Bash", subtitle: "Shebang, permisos, codis de retorn ($?), test i [ ], validació d'arguments, PATH i perfil.sh", href: "blocs/07-shell/pralabs/01-shell.html", pdf: "SO-Bloc7-Pralab01-Primers-scripts-Bash.pdf", sizeHuman: "326 KB" }
          ]
        }
      ]
    },
    {
      id: "00",
      slug: "course-info",
      number: "Informació General",
      title: "Presentació i Guia de Contribució",
      shortTitle: "Informació General",
      description: "Presentació inicial de l'assignatura (objectius, metodologia, calendari i normativa d'avaluació) i guia pas a pas per contribuir als materials oberts amb Git i GitHub.",
      zipId: "zip-all",
      zipFilename: "SO-Curs-Complet-PDFs.zip",
      zipSizeHuman: "52.0 MB",
      subsections: [
        {
          id: "general",
          title: "Documents generals",
          description: "Diapositives de presentació del curs i guia d'aportacions Open Source (+0,5 punts).",
          items: [
            { id: "info-pres", code: "Info 01", kind: "slide", typeLabel: "Presentació", title: "Presentació del curs", subtitle: "Metodologia, temari, criteris d'avaluació, calendari d'exàmens i eines de treball", href: "course-info/presentation-slides.html", pdf: "SO-Info-Presentacio-del-curs.pdf", sizeHuman: "278 KB" },
            { id: "info-contrib", code: "Info 02", kind: "guide", typeLabel: "Guia", title: "Contribuir als materials (fins a +0,5 punts)", subtitle: "Flux de treball amb Git, Fork i Pull Request al repositori obert de l'assignatura", href: "course-info/contributions/contribute.html", pdf: "SO-Info-Contribuir-als-materials.pdf", sizeHuman: "1.1 MB" }
          ]
        }
      ]
    }
  ];

  let activeBlocks = DEFAULT_BLOCKS;
  let activeBundles = DEFAULT_BUNDLES;
  let flatCatalog = [];

  function rebuildFlatCatalog() {
    flatCatalog = [];
    activeBlocks.forEach(block => {
      (block.subsections || []).forEach(sub => {
        (sub.items || []).forEach(it => {
          flatCatalog.push({
            id: it.id,
            bloc: block.id,
            blocNumber: block.number,
            blocTitle: block.title,
            blocShortTitle: block.shortTitle || block.title,
            subsectionId: sub.id,
            subsectionTitle: sub.title,
            code: it.code,
            kind: it.kind,
            typeLabel: it.typeLabel || (it.kind === "slide" ? "Presentació" : "Document"),
            title: it.title,
            subtitle: it.subtitle,
            href: it.href,
            pdfHref: it.pdfHref || ("downloads/pdf/" + it.pdf),
            pdfName: it.pdf,
            sizeHuman: it.sizeHuman || "PDF",
            extraDownload: it.extraDownload || null
          });
        });
      });
    });
    window.SO_COURSE_CATALOG = flatCatalog;
    window.SO_COURSE_BLOCKS = activeBlocks;
  }

  rebuildFlatCatalog();

  function getSiteRootOffset() {
    const meta = document.querySelector('meta[name="quarto:offset"]');
    if (meta && meta.content) {
      return meta.content.endsWith("/") ? meta.content : meta.content + "/";
    }
    const path = window.location.pathname.replace(/\\/g, "/");
    for (const item of flatCatalog) {
      const idx = path.indexOf(item.href);
      if (idx !== -1) {
        const sub = item.href.split("/").slice(0, -1);
        return sub.length === 0 ? "./" : sub.map(() => "..").join("/") + "/";
      }
    }
    return "./";
  }

  function resolveUrl(relPath) {
    if (!relPath) return "#";
    if (/^(https?:|mailto:|tel:|#)/i.test(relPath)) return relPath;
    const offset = getSiteRootOffset();
    return offset + relPath.replace(/^\.?\//, "");
  }

  function findCurrentCatalogItem() {
    const path = window.location.pathname.replace(/\\/g, "/");
    for (const item of flatCatalog) {
      if (path.endsWith("/" + item.href) || path.endsWith(item.href)) {
        return item;
      }
    }
    return null;
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null) continue;
        if (k === "className") node.className = v;
        else if (k === "textContent") node.textContent = v;
        else if (k === "hidden") node.hidden = Boolean(v);
        else if (k.startsWith("on") && typeof v === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), v);
        } else {
          node.setAttribute(k, String(v));
        }
      }
    }
    if (children) {
      for (const c of children) {
        if (c === null || c === undefined) continue;
        node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      }
    }
    return node;
  }

  function iconSpan(name, extraClass) {
    const span = document.createElement("span");
    span.className = "udl-svg-icon" + (extraClass ? " " + extraClass : "");
    span.setAttribute("aria-hidden", "true");
    span.innerHTML = SVG_ICONS[name] || "";
    return span;
  }

  // ---------------------------------------------------------------------------
  // Storage & Recent Files Helpers
  // ---------------------------------------------------------------------------
  function readJsonStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJsonStorage(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {
      // Ignore private browsing / storage quota errors
    }
  }

  function getValidRecentEntries() {
    const raw = readJsonStorage(STORAGE_RECENT, []);
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    const valid = [];
    raw.forEach(entry => {
      const id = typeof entry === "string" ? entry : (entry && entry.id);
      const ts = (entry && typeof entry.ts === "number") ? entry.ts : Date.now();
      if (!id || seen.has(id)) return;
      const item = flatCatalog.find(x => x.id === id);
      if (!item) return;
      seen.add(id);
      valid.push({ id, ts, item });
    });
    valid.sort((a, b) => b.ts - a.ts);
    return valid.slice(0, 8);
  }

  function recordRecentVisit(item) {
    if (!item || !item.id) return;
    const now = Date.now();
    const existing = getValidRecentEntries()
      .filter(e => e.id !== item.id)
      .map(e => ({ id: e.id, ts: e.ts }));
    existing.unshift({ id: item.id, ts: now });
    writeJsonStorage(STORAGE_RECENT, existing.slice(0, 8));
  }

  function clearRecentVisits() {
    writeJsonStorage(STORAGE_RECENT, []);
  }

  function formatRelativeTime(ts) {
    const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 60) return "Fa uns segons";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return "Fa " + diffMin + (diffMin === 1 ? " minut" : " minuts");
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return "Fa " + diffHours + (diffHours === 1 ? " hora" : " hores");
    const diffDays = Math.floor(diffHours / 24);
    return "Fa " + diffDays + (diffDays === 1 ? " dia" : " dies");
  }

  // ---------------------------------------------------------------------------
  // 1. Responsive Navigation Controller
  //    Single source of truth: the links Quarto renders from `_quarto.yml`.
  //    Desktop (> 640px): [ Inici | Materials | Calculadora | Guia docent ] [ Recents ] [ Theme ]
  //    Mobile (<= 640px): [ Menu ] [ Theme ]  +  full-screen overlay (fixed, no layout shift)
  // ---------------------------------------------------------------------------
  const MOBILE_NAV_QUERY = "(max-width: 640px)";

  function renderRecentsInto(container, onNavigate) {
    container.textContent = "";
    const entries = getValidRecentEntries();
    const headerRow = el("div", { className: "udl-popover-header" }, [
      el("span", { className: "udl-popover-title", textContent: "Consultats recentment" })
    ]);
    if (entries.length > 0) {
      headerRow.appendChild(el("button", {
        type: "button",
        className: "udl-popover-clear",
        textContent: "Neteja",
        onClick: () => {
          clearRecentVisits();
          renderRecentsInto(container, onNavigate);
          renderHomeRecentSection();
        }
      }));
    }
    container.appendChild(headerRow);

    if (entries.length === 0) {
      container.appendChild(el("div", {
        className: "udl-popover-empty",
        textContent: "Encara no has obert cap material en aquesta sessió."
      }));
      return;
    }
    const list = el("div", { className: "udl-popover-list" });
    entries.forEach(({ ts, item }) => {
      list.appendChild(el("div", { className: "udl-popover-item" }, [
        el("a", { className: "udl-popover-item-link", href: resolveUrl(item.href), onClick: onNavigate }, [
          el("span", { className: "udl-popover-item-title", textContent: item.title }),
          el("span", {
            className: "udl-popover-item-meta",
            textContent: item.blocNumber + " · " + item.subsectionTitle + " · " + formatRelativeTime(ts)
          })
        ]),
        el("a", {
          className: "udl-popover-item-pdf",
          href: resolveUrl(item.pdfHref),
          download: item.pdfName,
          title: "Descarrega PDF (" + item.pdfName + ")"
        }, [iconSpan("download"), "PDF"])
      ]));
    });
    container.appendChild(list);
  }

  // Theme switch (sun / moon). Visual only: state lives in Quarto (`quartoToggleColorScheme`,
  // `quarto-dark` body class, localStorage + system preference). Both the desktop button and the
  // mobile-menu button call the same Quarto function and are re-synced from the body class.
  const THEME_SVG_ATTRS = 'width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
  const THEME_SUN = '<svg ' + THEME_SVG_ATTRS + '><circle cx="8" cy="8" r="2.7"/><path d="M8 1.6v1.5M8 12.9v1.5M1.6 8h1.5M12.9 8h1.5M3.5 3.5l1.05 1.05M11.45 11.45l1.05 1.05M3.5 12.5l1.05-1.05M11.45 4.55l1.05-1.05"/></svg>';
  const THEME_MOON = '<svg ' + THEME_SVG_ATTRS + '><path d="M13.3 9.7A5.7 5.7 0 0 1 6.3 2.7a5.7 5.7 0 1 0 7 7z"/></svg>';

  function fillThemeSwitch(btn) {
    btn.textContent = "";
    ["sun", "moon"].forEach(kind => {
      const opt = el("span", { className: "udl-theme-opt is-" + kind, "aria-hidden": "true" });
      opt.innerHTML = kind === "sun" ? THEME_SUN : THEME_MOON;
      btn.appendChild(opt);
    });
    btn.classList.add("udl-theme-switch");
  }

  function syncThemeSwitches() {
    const dark = document.body.classList.contains("quarto-dark");
    const label = dark ? "Activar mode clar" : "Activar mode fosc";
    document.querySelectorAll(".udl-theme-switch").forEach(b => {
      b.dataset.theme = dark ? "dark" : "light";
      b.setAttribute("role", "switch");
      b.setAttribute("aria-checked", dark ? "true" : "false");
      b.setAttribute("aria-label", label);
      b.setAttribute("title", label);
    });
  }

  function toggleTheme() {
    if (typeof window.quartoToggleColorScheme === "function") window.quartoToggleColorScheme();
  }

  function initTopNavbar(currentItem) {
    const header = document.getElementById("quarto-header");
    if (!header || header.dataset.udlNav === "ready") return;
    header.dataset.udlNav = "ready";

    const navEl = header.querySelector("nav.navbar");
    if (navEl) navEl.removeAttribute("data-bs-theme");

    // Remove branding and Bootstrap's in-flow collapse machinery completely
    header.querySelectorAll(".navbar-brand-container, .navbar-toggler").forEach(n => n.remove());

    // Shared nav configuration (rendered by Quarto from _quarto.yml)
    const navLinkEls = Array.from(header.querySelectorAll(".navbar-nav .nav-link"));
    const rank = (txt) => {
      const s = txt.toLowerCase();
      return s.includes("inici") ? 1 : s.includes("materials") ? 2 : s.includes("calculadora") ? 3 : s.includes("guia") ? 4 : 5;
    };
    const navItems = navLinkEls
      .map(a => ({ label: (a.textContent || "").trim(), href: a.getAttribute("href") || "#", el: a }))
      .sort((x, y) => rank(x.label) - rank(y.label));

    // Canonical order in the desktop list
    const navList = header.querySelector(".navbar-nav");
    if (navList) {
      navItems.forEach(n => {
        const li = n.el.closest(".nav-item");
        if (li) navList.appendChild(li);
      });
    }

    // Active state shared by desktop + mobile (Materials stays active for any material page)
    const hrefFile = (h) => (h || "").split("#")[0].split("?")[0].split("/").pop();
    const pageFile = hrefFile(window.location.pathname) || "index.html";
    navItems.forEach(n => {
      const f = hrefFile(n.href);
      n.active = currentItem ? f === "materials.html" : (f === pageFile || (f === "index.html" && pageFile === ""));
    });
    navItems.forEach(n => {
      n.el.classList.toggle("active", n.active);
      if (n.active) n.el.setAttribute("aria-current", "page"); else n.el.removeAttribute("aria-current");
    });

    // Theme toggle: move the SAME Quarto element out of the main capsule (single theme state)
    const themeBtn = header.querySelector(".quarto-color-scheme-toggle");
    const toolsBox = header.querySelector(".quarto-navbar-tools");
    const searchBox = header.querySelector("#quarto-search");
    if (searchBox) searchBox.remove(); // compact navbar has no search; Materials has its own filter

    // Recents capsule (desktop)
    const recentsWrap = el("div", { id: "udl-nav-recents-wrap", className: "udl-nav-recents-capsule udl-nav-recents-wrap" });
    const recentsBtn = el("button", {
      type: "button",
      className: "udl-nav-recents-btn",
      "aria-expanded": "false",
      "aria-controls": "udl-nav-recents-popover",
      title: "Materials consultats recentment"
    }, [el("span", { textContent: "Recents" })]);
    const popover = el("div", {
      id: "udl-nav-recents-popover",
      className: "udl-nav-recents-popover",
      role: "dialog",
      "aria-label": "Materials consultats recentment",
      hidden: true
    });
    const closePopover = () => { popover.hidden = true; recentsBtn.setAttribute("aria-expanded", "false"); };
    recentsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!popover.hidden) { closePopover(); return; }
      renderRecentsInto(popover);
      popover.hidden = false;
      recentsBtn.setAttribute("aria-expanded", "true");
    });
    document.addEventListener("click", (e) => { if (!recentsWrap.contains(e.target)) closePopover(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !popover.hidden) { closePopover(); recentsBtn.focus(); } });
    recentsWrap.append(recentsBtn, popover);
    header.appendChild(recentsWrap);

    // Theme control as its own capsule to the right of Recents
    if (themeBtn) {
      const themeWrap = el("div", { className: "udl-nav-theme-capsule" });
      fillThemeSwitch(themeBtn);
      themeBtn.classList.remove("px-1");
      themeWrap.appendChild(themeBtn);
      header.appendChild(themeWrap);
    }
    if (toolsBox) toolsBox.remove();

    // Mobile menu button + full-screen overlay (fixed; never in document flow)
    const menuBtn = el("button", {
      type: "button",
      id: "udl-nav-menu-btn",
      className: "udl-nav-menu-btn",
      "aria-expanded": "false",
      "aria-controls": "udl-nav-overlay",
      "aria-label": "Obre el menú de navegació"
    }, [el("span", { className: "udl-nav-menu-icon", "aria-hidden": "true" })]);
    const menuWrap = el("div", { className: "udl-nav-menu-capsule" }, [menuBtn]);
    header.insertBefore(menuWrap, header.firstChild);

    const overlay = el("div", {
      id: "udl-nav-overlay",
      className: "udl-nav-overlay",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Menú de navegació",
      hidden: true
    });
    const primaryNav = el("nav", { className: "udl-nav-overlay-nav", "aria-label": "Navegació principal" });
    const primaryList = el("ul", { className: "udl-nav-overlay-list" });
    navItems.forEach(n => {
      const a = el("a", { className: "udl-nav-overlay-link" + (n.active ? " is-active" : ""), href: n.href, textContent: n.label });
      if (n.active) a.setAttribute("aria-current", "page");
      a.addEventListener("click", () => closeMenu(false));
      primaryList.appendChild(el("li", {}, [a]));
    });
    primaryNav.appendChild(primaryList);
    const recentsSection = el("section", { className: "udl-nav-overlay-recents", "aria-label": "Consultats recentment" });
    const themeSection = el("section", { className: "udl-nav-overlay-theme", "aria-label": "Aparença" });
    const overlayThemeBtn = el("button", { type: "button", className: "udl-nav-overlay-theme-btn" });
    fillThemeSwitch(overlayThemeBtn);
    overlayThemeBtn.addEventListener("click", toggleTheme);
    themeSection.append(el("span", { className: "udl-nav-overlay-theme-label", textContent: "Aparença" }), overlayThemeBtn);
    overlay.append(primaryNav, recentsSection, themeSection);
    document.body.appendChild(overlay);
    syncThemeSwitches();
    new MutationObserver(syncThemeSwitches).observe(document.body, { attributes: true, attributeFilter: ["class"] });

    let lastFocus = null;
    let savedScrollY = 0;
    const mq = window.matchMedia(MOBILE_NAV_QUERY);

    function focusables() {
      const inHeader = [menuBtn];
      const inOverlay = Array.from(overlay.querySelectorAll("a[href], button:not([disabled])"));
      return inHeader.concat(inOverlay).filter(n => n === menuBtn || n.offsetParent !== null);
    }

    function openMenu() {
      if (!overlay.hidden) return;
      lastFocus = document.activeElement;
      renderRecentsInto(recentsSection, () => closeMenu(false));
      savedScrollY = window.scrollY;
      const sbw = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.classList.add("udl-nav-locked");
      document.body.style.top = "-" + savedScrollY + "px";
      if (sbw > 0) document.body.style.paddingRight = sbw + "px";
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add("is-open"));
      menuBtn.setAttribute("aria-expanded", "true");
      menuBtn.setAttribute("aria-label", "Tanca el menú de navegació");
      const first = overlay.querySelector(".udl-nav-overlay-link");
      if (first) first.focus();
    }

    function closeMenu(restoreFocus) {
      if (overlay.hidden) return;
      overlay.classList.remove("is-open");
      overlay.hidden = true;
      document.documentElement.classList.remove("udl-nav-locked");
      document.body.style.top = "";
      document.body.style.paddingRight = "";
      window.scrollTo(0, savedScrollY);
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.setAttribute("aria-label", "Obre el menú de navegació");
      if (restoreFocus !== false) (lastFocus && document.contains(lastFocus) ? lastFocus : menuBtn).focus({ preventScroll: true });
    }

    menuBtn.addEventListener("click", () => (overlay.hidden ? openMenu() : closeMenu(true)));
    document.addEventListener("keydown", (e) => {
      if (overlay.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); closeMenu(true); return; }
      if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        else if (!f.includes(document.activeElement)) { e.preventDefault(); first.focus(); }
      }
    });
    // Leaving the mobile range while open: close cleanly so nothing stays locked
    const onBreakpoint = () => { if (!mq.matches) closeMenu(false); };
    if (mq.addEventListener) mq.addEventListener("change", onBreakpoint); else mq.addListener(onBreakpoint);
  }

  // ---------------------------------------------------------------------------
  // Shared Unified `ResourceRow` Component (`createResourceRow`)
  // Used across Homepage Recents, Materials Subsections (Teoria, Pralabs, Activitats),
  // and Global Materials Search.
  // ---------------------------------------------------------------------------
  function createResourceRow(item, options) {
    const opts = options || {};
    const typeLabel = item.typeLabel || (item.kind === "slide" ? "Presentació" : (item.kind === "pralab" ? "Laboratori" : "Activitat"));
    const sizeText = item.sizeHuman || "PDF";
    const metaTagText = typeLabel + " · PDF " + sizeText;

    let subText = item.subtitle || "";
    if (opts.showContext && item.blocNumber && item.subsectionTitle) {
      subText = item.blocNumber + " · " + item.subsectionTitle + (subText ? " · " + subText : "");
    }
    if (opts.relativeTime) {
      subText = (item.blocNumber ? item.blocNumber + " · " + item.subsectionTitle + " · " : "") + opts.relativeTime + (item.subtitle ? " · " + item.subtitle : "");
    }

    const actions = [
      el("a", {
        className: "udl-btn udl-btn-ghost udl-btn-sm",
        href: resolveUrl(item.href),
        title: "Obre el recurs"
      }, ["Obre"])
    ];

    if (item.extraDownload) {
      actions.push(el("a", {
        className: "udl-btn udl-btn-secondary udl-btn-sm",
        href: resolveUrl(item.extraDownload.href),
        download: item.extraDownload.downloadName
      }, [iconSpan("download"), item.extraDownload.label]));
    }

    actions.push(el("a", {
      className: "udl-btn udl-btn-secondary udl-btn-sm",
      href: resolveUrl(item.pdfHref),
      download: item.pdfName,
      title: "Descarrega " + item.pdfName
    }, [
      iconSpan("download"),
      el("span", { textContent: "PDF" }),
      el("span", { className: "udl-btn-size", "data-pdf-size": item.id, textContent: item.sizeHuman || "" })
    ]));

    return el("div", { className: "udl-clean-row" }, [
      el("div", { className: "udl-clean-row-main" }, [
        el("span", { className: "udl-code-pill", textContent: item.code }),
        el("div", { className: "udl-clean-row-text" }, [
          el("div", { className: "udl-clean-row-title-line" }, [
            el("a", { className: "udl-clean-row-title", href: resolveUrl(item.href), textContent: item.title }),
            el("span", { className: "udl-clean-row-meta-tag", textContent: metaTagText })
          ]),
          el("span", { className: "udl-clean-row-sub", textContent: subText })
        ])
      ]),
      el("div", { className: "udl-clean-row-actions" }, actions)
    ]);
  }

  // ---------------------------------------------------------------------------
  // 2. Minimalist Homepage (`index.html`) — Recently Visited Materials
  // ---------------------------------------------------------------------------
  function renderHomeRecentSection() {
    const section = document.getElementById("udl-home-recent");
    const listEl = document.getElementById("udl-home-recent-list");
    const clearBtn = document.getElementById("udl-home-clear-recent");
    if (!section || !listEl) return;

    const entries = getValidRecentEntries().slice(0, 5);
    listEl.textContent = "";

    if (entries.length === 0) {
      if (clearBtn) clearBtn.hidden = true;
      listEl.appendChild(el("div", { className: "udl-recent-empty" }, [
        el("span", { textContent: "Encara no has obert cap document en aquesta sessió." }),
        el("a", { href: resolveUrl("materials.html?bloc=01"), textContent: "Comença pel Bloc 1 →" })
      ]));
      return;
    }

    if (clearBtn) {
      clearBtn.hidden = false;
      if (!clearBtn.dataset.bound) {
        clearBtn.dataset.bound = "true";
        clearBtn.addEventListener("click", () => {
          clearRecentVisits();
          renderHomeRecentSection();
        });
      }
    }

    entries.forEach(({ ts, item }) => {
      listEl.appendChild(createResourceRow(item, { relativeTime: formatRelativeTime(ts) }));
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Scalable Hierarchical Materials Workspace (`materials.html`)
  //    - Contextual Left Index Rail (Scales to 30+ blocks)
  //    - Level 1: Overview of Thematic Blocks
  //    - Level 2: Individual Thematic Block (Existing Subsections Only)
  //    - Level 3: Subsection Educational Materials (Clean Document Rows)
  //    - On-Demand Block JSON Hydration
  // ---------------------------------------------------------------------------
  const loadedBlockCache = {};

  function ensureBlockLoaded(blocId, callback) {
    if (!blocId || loadedBlockCache[blocId]) {
      if (callback) callback();
      return;
    }
    const cacheKey = "udl_so_block_v4_" + blocId;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const idx = activeBlocks.findIndex(b => b.id === blocId);
        if (idx !== -1 && parsed && Array.isArray(parsed.subsections)) {
          activeBlocks[idx] = parsed;
          rebuildFlatCatalog();
        }
        loadedBlockCache[blocId] = true;
        if (callback) callback();
        return;
      }
    } catch {
      // Ignore storage error
    }

    fetch(resolveUrl("downloads/data/block-" + encodeURIComponent(blocId) + ".json"))
      .then(r => (r.ok ? r.json() : null))
      .then(blockData => {
        loadedBlockCache[blocId] = true;
        if (blockData && Array.isArray(blockData.subsections)) {
          const idx = activeBlocks.findIndex(b => b.id === blocId);
          if (idx !== -1) {
            activeBlocks[idx] = blockData;
            rebuildFlatCatalog();
          }
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(blockData));
          } catch {
            // Ignore quota
          }
        }
        if (callback) callback();
      })
      .catch(() => {
        loadedBlockCache[blocId] = true;
        if (callback) callback();
      });
  }

  function initMaterialsExplorer() {
    const root = document.getElementById("udl-materials-explorer");
    if (!root) return;

    const bcNav = document.getElementById("udl-materials-breadcrumb");
    const stage = document.getElementById("udl-materials-stage");
    const searchInput = document.getElementById("udl-materials-search");
    const bundlesToggle = document.getElementById("udl-bundles-toggle");
    const bundlesClose = document.getElementById("udl-bundles-close");
    const bundlesDrawer = document.getElementById("udl-bundles-drawer");
    const bundlesList = document.getElementById("udl-bundles-list");
    const expandedBlocks = new Set();
    const expandedCategories = new Set();

    function navigateMaterials(blocId, secId, replaceState) {
      const params = new URLSearchParams();
      if (blocId) params.set("bloc", blocId);
      if (blocId && secId) params.set("sec", secId);
      const qs = params.toString();
      const newUrl = window.location.pathname + (qs ? "?" + qs : "");
      if (replaceState) {
        window.history.replaceState({ bloc: blocId || null, sec: secId || null }, "", newUrl);
      } else {
        window.history.pushState({ bloc: blocId || null, sec: secId || null }, "", newUrl);
      }
      if (searchInput) searchInput.value = "";
      if (blocId && !loadedBlockCache[blocId]) {
        renderExplorerStage();
        ensureBlockLoaded(blocId, renderExplorerStage);
      } else {
        renderExplorerStage();
      }
    }

    function renderBundlesDrawer() {
      if (!bundlesList) return;
      bundlesList.textContent = "";
      const bundleSpecs = [
        { id: "zip-all", code: "ZIP", filename: "SO-Curs-Complet-PDFs.zip", title: "Curs complet (Tots els blocs)", desc: "36 documents PDF + Plantilla Excel organitzats per carpetes" },
        { id: "zip-slides", code: "ZIP", filename: "SO-Totes-les-Presentacions-PDFs.zip", title: "Totes les presentacions de teoria", desc: "16 presentacions en format apaïsat 16:9" },
        { id: "zip-labs", code: "ZIP", filename: "SO-Tots-els-Pralabs-i-Activitats-PDFs.zip", title: "Tots els pralabs i activitats", desc: "20 guions A4 amb solucions desplegades" }
      ];
      activeBlocks.forEach(b => {
        if (b.id === "00") return;
        const count = (b.subsections || []).reduce((acc, s) => acc + (s.items ? s.items.length : 0), 0);
        bundleSpecs.push({
          id: b.zipId,
          code: b.number,
          filename: b.zipFilename,
          title: b.number + " — " + b.title,
          desc: count + " documents PDF del bloc"
        });
      });

      bundleSpecs.forEach(b => {
        const live = activeBundles[b.id];
        const sizeLabel = (live && live.sizeHuman) ? live.sizeHuman : "ZIP";
        const row = el("div", { className: "udl-clean-row" }, [
          el("div", { className: "udl-clean-row-main" }, [
            el("span", { className: "udl-code-pill", textContent: b.code }),
            el("div", { className: "udl-clean-row-text" }, [
              el("span", { className: "udl-clean-row-title", textContent: b.title }),
              el("span", { className: "udl-clean-row-sub", textContent: b.desc })
            ])
          ]),
          el("div", { className: "udl-clean-row-actions" }, [
            el("a", {
              className: "udl-btn udl-btn-secondary udl-btn-sm",
              href: resolveUrl("downloads/" + b.filename),
              download: b.filename
            }, [
              iconSpan("download"),
              el("span", { textContent: "Descarrega" }),
              el("span", { className: "udl-btn-size", "data-zip-size": b.id, textContent: sizeLabel })
            ])
          ])
        ]);
        bundlesList.appendChild(row);
      });
    }

    if (bundlesToggle && bundlesDrawer) {
      bundlesToggle.addEventListener("click", () => {
        const isHidden = bundlesDrawer.hidden;
        bundlesDrawer.hidden = !isHidden;
        bundlesToggle.setAttribute("aria-expanded", String(isHidden));
      });
    }
    if (bundlesClose && bundlesDrawer) {
      bundlesClose.addEventListener("click", () => {
        bundlesDrawer.hidden = true;
        if (bundlesToggle) bundlesToggle.setAttribute("aria-expanded", "false");
      });
    }

    function createMaterialRow(item, showContext) {
      return createResourceRow(item, { showContext: Boolean(showContext) });
    }

    function renderBreadcrumb(blockObj, subObj, isSearching) {
      if (!bcNav) return;
      bcNav.textContent = "";

      if (!blockObj && !isSearching) {
        bcNav.appendChild(el("span", { className: "current", "aria-current": "page", textContent: "Materials · Visió general" }));
        return;
      }

      const rootLink = el("a", {
        href: resolveUrl("materials.html"),
        textContent: "Materials",
        onClick: (e) => {
          e.preventDefault();
          navigateMaterials(null, null, false);
        }
      });
      bcNav.appendChild(rootLink);

      if (isSearching) {
        bcNav.appendChild(el("span", { className: "sep", "aria-hidden": "true", textContent: "/" }));
        bcNav.appendChild(el("span", { className: "current", "aria-current": "page", textContent: "Cerca" }));
        return;
      }

      bcNav.appendChild(el("span", { className: "sep", "aria-hidden": "true", textContent: "/" }));
      if (!subObj) {
        bcNav.appendChild(el("span", {
          className: "current",
          "aria-current": "page",
          textContent: blockObj.number + " — " + blockObj.title
        }));
      } else {
        const blockLink = el("a", {
          href: resolveUrl("materials.html?bloc=" + encodeURIComponent(blockObj.id)),
          textContent: blockObj.number + " · " + (blockObj.shortTitle || blockObj.title),
          onClick: (e) => {
            e.preventDefault();
            navigateMaterials(blockObj.id, null, false);
          }
        });
        bcNav.appendChild(blockLink);
        bcNav.appendChild(el("span", { className: "sep", "aria-hidden": "true", textContent: "/" }));
        bcNav.appendChild(el("span", {
          className: "current",
          "aria-current": "page",
          textContent: subObj.title
        }));
      }
    }

    function renderExplorerStage() {
      if (!stage) return;
      stage.textContent = "";

      const params = new URLSearchParams(window.location.search);
      const rawBloc = params.get("bloc");
      const rawSec = params.get("sec");
      const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

      const normalizedBloc = rawBloc ? (rawBloc.length === 1 && /^\d$/.test(rawBloc) ? "0" + rawBloc : rawBloc) : null;
      const blockObj = normalizedBloc ? activeBlocks.find(b => b.id === normalizedBloc || b.slug === rawBloc) : null;
      const existingSubs = blockObj
        ? (blockObj.subsections || []).filter(s => (s.items && s.items.length > 0) || (s.itemCount && s.itemCount > 0))
        : [];
      const subObj = (blockObj && rawSec)
        ? existingSubs.find(s => s.id === rawSec.toLowerCase())
        : null;

      // Search mode across all materials
      if (query.length > 0) {
        renderBreadcrumb(null, null, true);
        const matches = flatCatalog.filter(it =>
          it.title.toLowerCase().includes(query) ||
          it.subtitle.toLowerCase().includes(query) ||
          it.code.toLowerCase().includes(query) ||
          it.blocTitle.toLowerCase().includes(query) ||
          it.pdfName.toLowerCase().includes(query)
        );

        stage.appendChild(el("div", { className: "udl-stage-header" }, [
          el("div", {}, [
            el("div", { className: "udl-stage-eyebrow", textContent: "Cerca directa" }),
            el("h2", { className: "udl-stage-title", textContent: matches.length + (matches.length === 1 ? " resultat per a «" : " resultats per a «") + searchInput.value.trim() + "»" })
          ]),
          el("button", {
            type: "button",
            className: "udl-btn udl-btn-secondary udl-btn-sm",
            textContent: "Esborra",
            onClick: () => {
              searchInput.value = "";
              renderExplorerStage();
            }
          })
        ]));

        if (matches.length === 0) {
          stage.appendChild(el("div", {
            className: "udl-empty-state",
            textContent: "No s'ha trobat cap document que coincideixi amb la cerca."
          }));
        } else {
          const list = el("div", { className: "udl-clean-list" });
          matches.forEach(m => list.appendChild(createMaterialRow(m, true)));
          stage.appendChild(list);
        }
        return;
      }

      renderBreadcrumb(blockObj, subObj, false);

      // LEVEL 1: Zero-Friction Expandable Resource Explorer (Bloc -> Categoria -> Recurs)
      if (!blockObj) {
        const expList = el("div", { className: "udl-exp-list", role: "list" });

        activeBlocks.forEach(b => {
          const validSubs = (b.subsections || []).filter(s => (s.items && s.items.length > 0) || (s.itemCount && s.itemCount > 0));
          const totalItems = validSubs.reduce((acc, s) => acc + (s.items ? s.items.length : (s.itemCount || 0)), 0);
          const isBlockOpen = expandedBlocks.has(b.id);
          const blockPanelId = "udl-exp-block-panel-" + b.id;

          const blockPanel = el("div", {
            id: blockPanelId,
            className: "udl-exp-block-panel",
            hidden: !isBlockOpen
          });

          function renderBlockPanelContent() {
            blockPanel.textContent = "";
            if (b.description) {
              blockPanel.appendChild(el("p", { className: "udl-exp-block-desc", textContent: b.description }));
            }

            const catList = el("div", { className: "udl-exp-cat-list" });
            const liveBlock = activeBlocks.find(x => x.id === b.id) || b;
            const liveSubs = (liveBlock.subsections || []).filter(s => (s.items && s.items.length > 0) || (s.itemCount && s.itemCount > 0));

            liveSubs.forEach(sub => {
              const catKey = b.id + ":" + sub.id;
              const isCatOpen = expandedCategories.has(catKey);
              const catPanelId = "udl-exp-cat-panel-" + b.id + "-" + sub.id;
              const itemCount = sub.items ? sub.items.length : (sub.itemCount || 0);

              const catPanel = el("div", {
                id: catPanelId,
                className: "udl-exp-cat-panel",
                hidden: !isCatOpen
              });

              function populateCatResources() {
                if (catPanel.dataset.populated === "true") return;
                catPanel.textContent = "";
                const itemsWrap = el("div", { className: "udl-exp-items" });
                (sub.items || []).forEach(rawItem => {
                  const enriched = flatCatalog.find(x => x.id === rawItem.id) || rawItem;
                  itemsWrap.appendChild(createMaterialRow(enriched, false));
                });
                catPanel.appendChild(itemsWrap);
                catPanel.dataset.populated = "true";
              }

              if (isCatOpen) {
                populateCatResources();
              }

              const catTrigger = el("button", {
                type: "button",
                className: "udl-exp-cat-trigger",
                "aria-expanded": String(isCatOpen),
                "aria-controls": catPanelId,
                onClick: () => {
                  const nextOpen = catPanel.hidden;
                  if (nextOpen) {
                    expandedCategories.add(catKey);
                    populateCatResources();
                  } else {
                    expandedCategories.delete(catKey);
                  }
                  catPanel.hidden = !nextOpen;
                  catTrigger.setAttribute("aria-expanded", String(nextOpen));
                }
              }, [
                iconSpan("chevronRight", "udl-exp-chevron"),
                el("span", { className: "udl-exp-cat-title", textContent: sub.title }),
                el("span", { className: "udl-exp-cat-count", textContent: itemCount + (itemCount === 1 ? " recurs" : " recursos") })
              ]);

              const catWrap = el("div", { className: "udl-exp-cat" }, [catTrigger, catPanel]);
              catList.appendChild(catWrap);
            });

            blockPanel.appendChild(catList);
          }

          if (isBlockOpen) {
            renderBlockPanelContent();
          }

          const blockTrigger = el("button", {
            type: "button",
            className: "udl-exp-block-trigger",
            "aria-expanded": String(isBlockOpen),
            "aria-controls": blockPanelId,
            onClick: () => {
              const nextOpen = blockPanel.hidden;
              if (nextOpen) {
                expandedBlocks.add(b.id);
                if (!loadedBlockCache[b.id]) {
                  renderBlockPanelContent();
                  ensureBlockLoaded(b.id, () => {
                    if (expandedBlocks.has(b.id)) renderBlockPanelContent();
                  });
                } else {
                  renderBlockPanelContent();
                }
              } else {
                expandedBlocks.delete(b.id);
              }
              blockPanel.hidden = !nextOpen;
              blockTrigger.setAttribute("aria-expanded", String(nextOpen));
            }
          }, [
            iconSpan("chevronRight", "udl-exp-chevron"),
            el("span", { className: "udl-block-num", textContent: b.number }),
            el("span", { className: "udl-exp-block-title", textContent: b.title }),
            el("span", { className: "udl-exp-count", textContent: totalItems + (totalItems === 1 ? " recurs" : " recursos") })
          ]);

          const blockHeadChildren = [blockTrigger];
          if (b.zipFilename) {
            blockHeadChildren.push(el("a", {
              className: "udl-btn udl-btn-ghost udl-btn-sm udl-exp-zip-btn",
              href: resolveUrl("downloads/" + b.zipFilename),
              download: b.zipFilename,
              title: "Descarrega tots els PDFs del bloc (.zip)"
            }, [
              iconSpan("download"),
              el("span", { textContent: "ZIP" }),
              el("span", { className: "udl-btn-size", "data-zip-size": b.zipId, textContent: b.zipSizeHuman || "" })
            ]));
          }

          const blockArticle = el("article", { className: "udl-exp-block", role: "listitem" }, [
            el("div", { className: "udl-exp-block-head" }, blockHeadChildren),
            blockPanel
          ]);

          expList.appendChild(blockArticle);
        });

        stage.appendChild(expList);
        return;
      }

      // Ensure block JSON is hydrated on demand when viewing Level 2 or Level 3
      if (!loadedBlockCache[blockObj.id]) {
        ensureBlockLoaded(blockObj.id, renderExplorerStage);
      }

      const headerActions = [];
      if (blockObj.zipFilename) {
        headerActions.push(el("a", {
          className: "udl-btn udl-btn-ghost udl-btn-sm",
          href: resolveUrl("downloads/" + blockObj.zipFilename),
          download: blockObj.zipFilename
        }, [
          iconSpan("download"),
          el("span", { textContent: "Bloc (.zip)" }),
          el("span", { className: "udl-btn-size", "data-zip-size": blockObj.zipId, textContent: blockObj.zipSizeHuman || "" })
        ]));
      }

      stage.appendChild(el("div", { className: "udl-stage-header" }, [
        el("div", {}, [
          el("div", { className: "udl-stage-eyebrow", textContent: subObj ? (blockObj.number + " · " + blockObj.shortTitle) : blockObj.number }),
          el("h2", { className: "udl-stage-title", textContent: subObj ? subObj.title : blockObj.title }),
          el("p", { className: "udl-stage-desc", textContent: subObj ? subObj.description : blockObj.description })
        ]),
        el("div", { className: "udl-stage-actions" }, headerActions)
      ]));

      // LEVEL 2: Individual Thematic Block — Clean Category Navigation Only (Teoria, Pralabs, Activitats)
      if (!subObj) {
        const subList = el("div", { className: "udl-subsections-vertical-list" });
        existingSubs.forEach(s => {
          const count = s.items ? s.items.length : (s.itemCount || 0);
          const row = el("a", {
            className: "udl-sub-row",
            href: resolveUrl("materials.html?bloc=" + encodeURIComponent(blockObj.id) + "&sec=" + encodeURIComponent(s.id)),
            onClick: (e) => {
              e.preventDefault();
              navigateMaterials(blockObj.id, s.id, false);
            }
          }, [
            el("div", { className: "udl-sub-row-main" }, [
              el("span", { className: "udl-sub-row-title", textContent: s.title }),
              el("span", { className: "udl-sub-row-desc", textContent: s.description })
            ]),
            el("div", { className: "udl-sub-row-right" }, [
              el("span", { className: "udl-code-pill", textContent: count + (count === 1 ? " recurs" : " recursos") }),
              iconSpan("chevronRight")
            ])
          ]);
          subList.appendChild(row);
        });
        stage.appendChild(subList);
        return;
      }

      // LEVEL 3: Subsection — Sibling Subsection Pills + Clean Document Rows
      const subTabs = el("div", { className: "udl-sub-tabs", role: "tablist", "aria-label": "Subseccions del bloc" });
      subTabs.appendChild(el("a", {
        className: "udl-sub-tab",
        href: resolveUrl("materials.html?bloc=" + encodeURIComponent(blockObj.id)),
        onClick: (e) => {
          e.preventDefault();
          navigateMaterials(blockObj.id, null, false);
        }
      }, [
        iconSpan("arrowLeft"),
        el("span", { textContent: blockObj.number })
      ]));

      existingSubs.forEach(s => {
        const isCurrent = Boolean(subObj && s.id === subObj.id);
        subTabs.appendChild(el("a", {
          className: "udl-sub-tab" + (isCurrent ? " is-active" : ""),
          href: resolveUrl("materials.html?bloc=" + encodeURIComponent(blockObj.id) + "&sec=" + encodeURIComponent(s.id)),
          role: "tab",
          "aria-selected": String(isCurrent),
          onClick: (e) => {
            e.preventDefault();
            navigateMaterials(blockObj.id, s.id, false);
          }
        }, [
          el("span", { textContent: s.title }),
          el("span", { className: "udl-sub-tab-count", textContent: String(s.items ? s.items.length : 0) })
        ]));
      });
      stage.appendChild(subTabs);

      const list = el("div", { className: "udl-clean-list" });
      (subObj.items || []).forEach(rawItem => {
        const enriched = flatCatalog.find(x => x.id === rawItem.id) || rawItem;
        list.appendChild(createMaterialRow(enriched, false));
      });
      stage.appendChild(list);
    }

    renderBundlesDrawer();
    renderExplorerStage();

    if (searchInput) {
      searchInput.addEventListener("input", renderExplorerStage);
    }
    window.addEventListener("popstate", renderExplorerStage);
    window.addEventListener("udl:catalog-updated", () => {
      renderBundlesDrawer();
      renderExplorerStage();
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Minimalist Document Viewer (`udl-course-html` Labs, Activities, Contribute)
  // ---------------------------------------------------------------------------
  function initHtmlDocumentViewer(currentItem) {
    const main = document.querySelector("main.content");
    if (!main || !currentItem) return;

    const blocUrl = resolveUrl("materials.html?bloc=" + encodeURIComponent(currentItem.bloc));
    const secUrl = resolveUrl(
      "materials.html?bloc=" + encodeURIComponent(currentItem.bloc) +
      "&sec=" + encodeURIComponent(currentItem.subsectionId)
    );

    const contextBar = el("div", {
      className: "udl-doc-contextbar",
      role: "region",
      "aria-label": "Ubicació i accions del document"
    });

    const breadcrumb = el("nav", {
      className: "udl-breadcrumb",
      "aria-label": "Ubicació dins dels materials"
    }, [
      el("a", { href: resolveUrl("materials.html"), textContent: "Materials" }),
      el("span", { className: "sep", "aria-hidden": "true", textContent: "/" }),
      el("a", { href: blocUrl, textContent: currentItem.blocNumber }),
      el("span", { className: "sep", "aria-hidden": "true", textContent: "/" }),
      el("a", { href: secUrl, textContent: currentItem.subsectionTitle }),
      el("span", { className: "sep", "aria-hidden": "true", textContent: "/" }),
      el("span", { className: "current", "aria-current": "page", textContent: currentItem.code })
    ]);

    const actionsGroup = el("div", { className: "udl-doc-actions" });

    const detailsList = Array.from(main.querySelectorAll("details"));
    if (detailsList.length > 0) {
      let allOpen = false;
      const solLabel = el("span", { textContent: "Mostrar solucions (" + detailsList.length + ")" });
      const solBtn = el("button", {
        type: "button",
        className: "udl-btn udl-btn-secondary udl-btn-sm",
        "aria-pressed": "false",
        onClick: function () {
          allOpen = !allOpen;
          detailsList.forEach(d => { d.open = allOpen; });
          solBtn.setAttribute("aria-pressed", String(allOpen));
          solLabel.textContent = allOpen
            ? "Ocultar solucions (" + detailsList.length + ")"
            : "Mostrar solucions (" + detailsList.length + ")";
        }
      }, [iconSpan("eye"), solLabel]);
      actionsGroup.appendChild(solBtn);
    }

    if (currentItem.extraDownload) {
      const ex = currentItem.extraDownload;
      actionsGroup.appendChild(el("a", {
        className: "udl-btn udl-btn-secondary udl-btn-sm",
        href: resolveUrl(ex.href),
        download: ex.downloadName
      }, [iconSpan("download"), ex.label]));
    }

    actionsGroup.appendChild(el("a", {
      className: "udl-btn udl-btn-primary udl-btn-sm",
      href: resolveUrl(currentItem.pdfHref),
      download: currentItem.pdfName,
      title: "Descarrega aquest document en PDF (" + currentItem.pdfName + ")"
    }, [
      iconSpan("download"),
      el("span", { textContent: "PDF" }),
      el("span", { className: "udl-btn-size", "data-pdf-size": currentItem.id, textContent: currentItem.sizeHuman || "" })
    ]));

    contextBar.append(breadcrumb, actionsGroup);
    main.insertBefore(contextBar, main.firstChild);

    // Sequential Subsection Footer (Prev / Back to Subsection / Next)
    const siblings = flatCatalog.filter(
      x => x.bloc === currentItem.bloc && x.subsectionId === currentItem.subsectionId
    );
    const idx = siblings.findIndex(x => x.id === currentItem.id);
    const prevItem = idx > 0 ? siblings[idx - 1] : null;
    const nextItem = (idx !== -1 && idx < siblings.length - 1) ? siblings[idx + 1] : null;

    const seqFooter = el("nav", {
      className: "udl-doc-seq-nav",
      "aria-label": "Navegació entre documents de la subsecció"
    }, [
      prevItem ? el("a", {
        className: "udl-seq-link udl-seq-prev",
        href: resolveUrl(prevItem.href)
      }, [
        el("span", { className: "udl-seq-dir" }, [iconSpan("arrowLeft"), "Anterior"]),
        el("strong", { textContent: prevItem.code + " · " + prevItem.title })
      ]) : el("div"),
      el("a", {
        className: "udl-seq-up",
        href: secUrl,
        textContent: currentItem.blocNumber + " · " + currentItem.subsectionTitle
      }),
      nextItem ? el("a", {
        className: "udl-seq-link udl-seq-next",
        href: resolveUrl(nextItem.href)
      }, [
        el("span", { className: "udl-seq-dir" }, ["Següent", iconSpan("chevronRight")]),
        el("strong", { textContent: nextItem.code + " · " + nextItem.title })
      ]) : el("div")
    ]);
    main.appendChild(seqFooter);
  }

  // ---------------------------------------------------------------------------
  // 5. Minimalist Presentation Viewer (`revealjs`)
  // ---------------------------------------------------------------------------
  function initRevealPresentation(currentItem) {
    if (window.location.search.includes("print-pdf")) return;

    document.querySelectorAll(".slide-menu-button, .slide-menu-wrapper, .reveal .footer .home-link").forEach(n => n.remove());

    const returnHref = currentItem
      ? resolveUrl("materials.html?bloc=" + encodeURIComponent(currentItem.bloc) + "&sec=" + encodeURIComponent(currentItem.subsectionId))
      : resolveUrl("materials.html");
    const returnLabel = currentItem
      ? (currentItem.blocNumber + " · " + currentItem.subsectionTitle)
      : "Materials";

    const presTitle = currentItem
      ? currentItem.title
      : ((document.querySelector(".reveal h1") || document.title || "Presentació").textContent || "").trim();

    const pdfHref = currentItem ? resolveUrl(currentItem.pdfHref) : resolveUrl("materials.html");
    const pdfName = currentItem ? currentItem.pdfName : "presentacio.pdf";

    const bar = el("header", {
      className: "udl-pres-bar",
      role: "navigation",
      "aria-label": "Controls de la presentació"
    });

    const leftZone = el("div", { className: "udl-pres-zone udl-pres-left" }, [
      el("a", {
        className: "udl-pres-back",
        href: returnHref,
        title: "Torna a " + returnLabel
      }, [
        iconSpan("arrowLeft"),
        el("span", { textContent: returnLabel })
      ]),
      el("span", { className: "udl-pres-divider", "aria-hidden": "true" }),
      el("span", { className: "udl-pres-title", textContent: presTitle })
    ]);

    const prevBtn = el("button", {
      type: "button",
      className: "udl-pres-icon-btn",
      "aria-label": "Diapositiva anterior",
      title: "Diapositiva anterior (←)",
      onClick: () => { if (window.Reveal) window.Reveal.prev(); }
    }, [iconSpan("chevronLeft")]);

    const counterBtn = el("button", {
      type: "button",
      className: "udl-pres-counter",
      "aria-label": "Obre l'índex de diapositives",
      title: "Obre l'índex de diapositives"
    }, ["1 / 1"]);

    const nextBtn = el("button", {
      type: "button",
      className: "udl-pres-icon-btn",
      "aria-label": "Diapositiva següent",
      title: "Diapositiva següent (→)",
      onClick: () => { if (window.Reveal) window.Reveal.next(); }
    }, [iconSpan("chevronRight")]);

    const centerZone = el("div", { className: "udl-pres-zone udl-pres-center" }, [
      prevBtn,
      counterBtn,
      nextBtn
    ]);

    const outlineBtn = el("button", {
      type: "button",
      className: "udl-pres-btn",
      "aria-expanded": "false",
      "aria-controls": "udl-pres-outline-backdrop",
      title: "Mostra l'índex de seccions i diapositives"
    }, [iconSpan("outline"), el("span", { textContent: "Índex" })]);

    const dlBtn = el("a", {
      className: "udl-pres-btn udl-pres-btn-primary",
      href: pdfHref,
      download: pdfName,
      title: "Descarrega la presentació en PDF (" + pdfName + ")"
    }, [iconSpan("download"), el("span", { textContent: "PDF" })]);

    const rightZone = el("div", { className: "udl-pres-zone udl-pres-right" }, [
      outlineBtn,
      dlBtn
    ]);

    bar.append(leftZone, centerZone, rightZone);
    document.body.appendChild(bar);

    const backdrop = el("div", {
      id: "udl-pres-outline-backdrop",
      className: "udl-pres-outline-backdrop",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": "Índex de seccions i diapositives",
      hidden: true
    });

    const panel = el("aside", { className: "udl-pres-outline-panel" });
    const closeBtn = el("button", {
      type: "button",
      className: "udl-pres-icon-btn",
      "aria-label": "Tanca l'índex",
      title: "Tanca (Esc)"
    }, [iconSpan("close")]);

    const panelHeader = el("div", { className: "udl-pres-outline-header" }, [
      el("div", {}, [
        el("div", { className: "udl-pres-outline-eyebrow", textContent: returnLabel }),
        el("div", { className: "udl-pres-outline-title", textContent: presTitle })
      ]),
      closeBtn
    ]);

    const filterInput = el("input", {
      type: "search",
      className: "udl-pres-outline-search",
      placeholder: "Filtra diapositives per títol o concepte...",
      "aria-label": "Filtra diapositives"
    });

    const panelBody = el("div", { className: "udl-pres-outline-body" });
    panel.append(panelHeader, filterInput, panelBody);
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);

    function getLeafSlides() {
      const allSections = Array.from(document.querySelectorAll(".reveal .slides section"));
      const leaves = [];
      let currentPartTitle = "Introducció";

      allSections.forEach(sec => {
        if (sec.querySelector("section")) {
          const topH1 = sec.querySelector(":scope > h1");
          if (topH1 && topH1.textContent.trim()) {
            currentPartTitle = topH1.textContent.trim();
          }
          return;
        }
        const h1 = sec.querySelector("h1");
        const h2 = sec.querySelector("h2, h3");
        const isSectionDivider = Boolean(h1 && !h2) || sec.classList.contains("title-slide");
        if (h1 && h1.textContent.trim()) {
          currentPartTitle = h1.textContent.trim();
        }
        const title = (h2 && h2.textContent.trim()) || (h1 && h1.textContent.trim()) || ("Diapositiva " + (leaves.length + 1));
        leaves.push({
          index: leaves.length + 1,
          element: sec,
          partTitle: currentPartTitle,
          title,
          isSectionDivider,
          text: (sec.textContent || "").toLowerCase()
        });
      });
      return leaves;
    }

    function updateSlideCounter() {
      const leaves = getLeafSlides();
      const total = Math.max(1, leaves.length);
      let currentNum = 1;
      if (window.Reveal && window.Reveal.getCurrentSlide) {
        const curSlide = window.Reveal.getCurrentSlide();
        const found = leaves.find(l => l.element === curSlide);
        if (found) currentNum = found.index;
      }
      counterBtn.textContent = currentNum + " / " + total;
      prevBtn.disabled = currentNum <= 1;
      nextBtn.disabled = currentNum >= total;
    }

    function populateOutline(filterText) {
      panelBody.textContent = "";
      const q = (filterText || "").trim().toLowerCase();
      const leaves = getLeafSlides();
      const curSlide = (window.Reveal && window.Reveal.getCurrentSlide) ? window.Reveal.getCurrentSlide() : null;

      let lastGroup = null;
      let activeRow = null;

      leaves.forEach(slide => {
        if (q && !slide.title.toLowerCase().includes(q) && !slide.text.includes(q)) return;

        if (slide.partTitle !== lastGroup) {
          lastGroup = slide.partTitle;
          panelBody.appendChild(el("div", {
            className: "udl-pres-outline-group",
            textContent: lastGroup
          }));
        }

        const isCurrent = curSlide === slide.element;
        const row = el("button", {
          type: "button",
          className: "udl-pres-outline-item" +
            (isCurrent ? " is-current" : "") +
            (slide.isSectionDivider ? " is-divider" : ""),
          onClick: () => {
            if (window.Reveal && window.Reveal.getIndices) {
              const idx = window.Reveal.getIndices(slide.element);
              if (idx) window.Reveal.slide(idx.h, idx.v || 0);
            }
            closeOutline();
          }
        }, [
          el("span", { className: "udl-pres-outline-num", textContent: String(slide.index) }),
          el("span", { className: "udl-pres-outline-label", textContent: slide.title })
        ]);

        if (isCurrent) activeRow = row;
        panelBody.appendChild(row);
      });

      if (activeRow && typeof activeRow.scrollIntoView === "function") {
        setTimeout(() => activeRow.scrollIntoView({ block: "nearest" }), 20);
      }
    }

    function openOutline() {
      populateOutline(filterInput.value);
      backdrop.hidden = false;
      outlineBtn.setAttribute("aria-expanded", "true");
      setTimeout(() => filterInput.focus(), 40);
    }

    function closeOutline() {
      backdrop.hidden = true;
      outlineBtn.setAttribute("aria-expanded", "false");
    }

    outlineBtn.addEventListener("click", () => {
      if (backdrop.hidden) openOutline();
      else closeOutline();
    });
    counterBtn.addEventListener("click", openOutline);
    closeBtn.addEventListener("click", closeOutline);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeOutline();
    });
    filterInput.addEventListener("input", () => populateOutline(filterInput.value));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !backdrop.hidden) {
        e.stopPropagation();
        closeOutline();
      }
    });

    const bindRevealEvents = () => {
      if (window.Reveal && window.Reveal.on) {
        window.Reveal.on("ready", updateSlideCounter);
        window.Reveal.on("slidechanged", updateSlideCounter);
        updateSlideCounter();
      } else {
        setTimeout(updateSlideCounter, 250);
      }
    };
    bindRevealEvents();
    window.addEventListener("load", bindRevealEvents);
  }

  // ---------------------------------------------------------------------------
  // 6. Compact Intelligent Grade Calculator (`calculadora.html`)
  //    Powered by `window.UDLGradeEngine` (`assets/js/grade-engine.js`)
  //    - Empty fields are pending (never silently treated as 0).
  //    - Reactive required-grade calculation & passing feasibility.
  //    - Official academic-year configs loaded from repository data (read-only for students).
  // ---------------------------------------------------------------------------
  function initGradeCalculatorPage() {
    const page = document.getElementById("udl-calculator-page");
    if (!page) return;

    const engine = window.UDLGradeEngine;
    if (!engine) return;

    const yearSelect = document.getElementById("calc-year-select");
    const yearSummaryPill = document.getElementById("calc-year-summary-pill");
    const categoriesContainer = document.getElementById("calc-categories-container");
    const inputAlert = document.getElementById("calc-input-alert");
    const goalLabelEl = document.getElementById("calc-goal-label");
    const enteredCountEl = document.getElementById("calc-entered-count");
    const finalStatusEl = document.getElementById("calc-final-status");
    const reqHeadlineEl = document.getElementById("calc-req-headline");
    const reqDetailEl = document.getElementById("calc-req-detail");
    const exampleBoxEl = document.getElementById("calc-example-box");
    const exampleTitleEl = document.getElementById("calc-example-title");
    const exampleListEl = document.getElementById("calc-example-list");
    const metricKnownEl = document.getElementById("calc-metric-known");
    const metricPendingEl = document.getElementById("calc-metric-pending");
    const metricThirdLabelEl = document.getElementById("calc-metric-third-label");
    const metricThirdValEl = document.getElementById("calc-metric-third-val");
    const breakdownListEl = document.getElementById("calc-breakdown-list");
    const formulaCodeEl = document.getElementById("calc-formula-code");
    const policyNoteEl = document.getElementById("calc-policy-note");
    const resetBtn = document.getElementById("calc-reset-btn");

    let academicYears = JSON.parse(JSON.stringify(engine.DEFAULT_ACADEMIC_YEARS));
    let allSavedInputs = readJsonStorage(STORAGE_CALC_INPUTS, {});

    function getDefaultYearId() {
      const savedActive = readJsonStorage(STORAGE_CALC_ACTIVE_YEAR, null);
      if (savedActive && academicYears.some(y => y.year === savedActive)) {
        return savedActive;
      }
      const def = academicYears.find(y => y.isDefault) || academicYears[0];
      return def ? def.year : "2026–2027";
    }

    let currentYearId = getDefaultYearId();

    function getCurrentYearConfig() {
      return academicYears.find(y => y.year === currentYearId) || academicYears[0];
    }

    function buildYearSummaryPillText(config) {
      const parts = [];
      (config.categories || []).forEach(cat => {
        if (cat.isBonus) {
          parts.push("+" + engine.fmtDecimal(cat.maxPoints || 0.5, 1) + "p opcional");
        } else {
          parts.push(cat.title + " " + cat.weight + "%");
        }
      });
      return parts.join(" · ");
    }

    function renderYearSelector() {
      if (!yearSelect) return;
      yearSelect.textContent = "";
      academicYears.forEach(yr => {
        const opt = el("option", {
          value: yr.year,
          textContent: yr.label || ("Curs " + yr.year)
        });
        if (yr.year === currentYearId) opt.selected = true;
        yearSelect.appendChild(opt);
      });
      yearSelect.hidden = academicYears.length <= 1;
    }

    function renderCalculatorDOM() {
      const config = getCurrentYearConfig();
      if (!config || !categoriesContainer) return;

      if (yearSummaryPill) {
        yearSummaryPill.textContent = buildYearSummaryPillText(config);
      }
      if (policyNoteEl) {
        policyNoteEl.textContent = config.recoveryPolicy || "";
      }

      const yearInputs = allSavedInputs[config.year] || {};
      categoriesContainer.textContent = "";

      (config.categories || []).forEach(cat => {
        const isBonus = Boolean(cat.isBonus);
        const catMaxPts = isBonus
          ? Number(cat.maxPoints ?? 0.5)
          : (Number(cat.weight || 0) / 100) * Number(config.maxGrade ?? 10);

        const groupHeaderText = isBonus
          ? (cat.title + " · fins a +" + engine.fmtDecimal(catMaxPts, 1) + " p")
          : (cat.title + " · " + cat.weight + "%");

        const subtotalBadge = el("span", {
          className: "udl-code-pill",
          id: "calc-sub-" + cat.id,
          textContent: "—"
        });

        let descText = "";
        if (!isBonus && cat.minGrade !== null && cat.minGrade !== undefined && cat.minGrade !== "") {
          descText = "Mínim obligatori al bloc: " + engine.fmtDecimal(cat.minGrade, 1) + " / 10";
        }

        const sectionEl = el("section", {
          className: "udl-calc-group",
          "aria-labelledby": "calc-heading-" + cat.id
        }, [
          el("div", { className: "udl-calc-group-header" }, [
            el("div", {}, [
              el("h2", { id: "calc-heading-" + cat.id, className: "udl-section-title", textContent: groupHeaderText }),
              descText ? el("p", { className: "udl-section-desc", textContent: descText }) : null
            ]),
            subtotalBadge
          ])
        ]);

        (cat.items || []).forEach(item => {
          const itemId = item.id || item.code;
          const savedItem = yearInputs[itemId] || {};
          const initialScore = savedItem.score !== undefined && savedItem.score !== null ? String(savedItem.score) : "";
          const initialRecEnabled = Boolean(item.recoverable && savedItem.recEnabled);
          const initialRecScore = savedItem.recScore !== undefined && savedItem.recScore !== null ? String(savedItem.recScore) : "";
          const maxScore = Number(item.maxScore ?? (isBonus ? 0.5 : 10));

          const weightLabel = isBonus
            ? ("Opcional · màx +" + engine.fmtDecimal(maxScore, 1))
            : (item.weight + "%");

          const mainInputId = "calc-input-" + itemId;
          const mainInput = el("input", {
            type: "text",
            className: "udl-calc-num-input",
            id: mainInputId,
            inputmode: "decimal",
            autocomplete: "off",
            placeholder: "—",
            value: initialScore,
            "aria-label": item.code + " · " + item.title + " (" + weightLabel + ")",
            "data-item-id": itemId,
            "data-field": "score",
            onInput: evaluateAndRender
          });

          const rowInputs = [];
          let recDrawer = null;

          if (item.recoverable) {
            const recToggleInput = el("input", {
              type: "checkbox",
              id: "calc-rec-toggle-" + itemId,
              "data-item-id": itemId,
              "data-field": "recEnabled"
            });
            recToggleInput.checked = initialRecEnabled;

            const recPillLabel = el("label", {
              className: "udl-rec-pill-toggle" + (initialRecEnabled ? " is-active" : ""),
              title: "Activa si tens nota de recuperació"
            }, [
              recToggleInput,
              el("span", { textContent: "Rec." })
            ]);

            const recScoreInput = el("input", {
              type: "text",
              className: "udl-calc-num-input",
              id: "calc-rec-score-" + itemId,
              inputmode: "decimal",
              autocomplete: "off",
              placeholder: "—",
              value: initialRecScore,
              "aria-label": "Nota de recuperació " + item.code,
              "data-item-id": itemId,
              "data-field": "recScore",
              onInput: evaluateAndRender
            });

            recDrawer = el("div", {
              className: "udl-calc-rec-drawer",
              id: "calc-rec-wrap-" + itemId,
              hidden: !initialRecEnabled
            }, [
              el("label", {
                for: "calc-rec-score-" + itemId,
                textContent: "Recuperació " + item.code + " (substitueix la nota ordinària)"
              }),
              recScoreInput
            ]);

            recToggleInput.addEventListener("change", () => {
              const active = recToggleInput.checked;
              recPillLabel.classList.toggle("is-active", active);
              recDrawer.hidden = !active;
              if (active) {
                recScoreInput.focus();
              }
              evaluateAndRender();
            });

            rowInputs.push(recPillLabel);
          }

          rowInputs.push(mainInput);

          let metaLine = "";
          if (item.minGrade !== null && item.minGrade !== undefined && item.minGrade !== "") {
            metaLine = "Mínim obligatori: " + engine.fmtDecimal(item.minGrade, 1) + " / 10";
          }

          const rowChildren = [
            el("div", { className: "udl-calc-line-main" }, [
              el("div", { className: "udl-calc-row-info" }, [
                el("label", { for: mainInputId }, [
                  el("strong", { textContent: item.code + " · " + item.title }),
                  el("span", { className: "udl-calc-weight", textContent: weightLabel })
                ]),
                metaLine ? el("span", { className: "udl-calc-meta", textContent: metaLine }) : null
              ]),
              el("div", { className: "udl-calc-row-inputs" }, rowInputs)
            ])
          ];
          if (recDrawer) rowChildren.push(recDrawer);

          sectionEl.appendChild(el("div", { className: "udl-calc-row" }, rowChildren));
        });

        categoriesContainer.appendChild(sectionEl);
      });

      evaluateAndRender();
    }

    function collectCurrentDOMInputs(config) {
      const currentMap = {};
      (config.categories || []).forEach(cat => {
        (cat.items || []).forEach(item => {
          const itemId = item.id || item.code;
          const mainEl = document.getElementById("calc-input-" + itemId);
          const recToggleEl = document.getElementById("calc-rec-toggle-" + itemId);
          const recScoreEl = document.getElementById("calc-rec-score-" + itemId);

          currentMap[itemId] = {
            score: mainEl ? mainEl.value.trim() : "",
            recEnabled: Boolean(recToggleEl && recToggleEl.checked),
            recScore: recScoreEl ? recScoreEl.value.trim() : ""
          };
        });
      });
      return currentMap;
    }

    function evaluateAndRender() {
      const config = getCurrentYearConfig();
      if (!config) return;

      const userInputs = collectCurrentDOMInputs(config);
      const result = engine.calculateGrade(config, userInputs);

      allSavedInputs[config.year] = userInputs;
      writeJsonStorage(STORAGE_CALC_INPUTS, allSavedInputs);

      if (inputAlert) {
        if (result.warnings && result.warnings.length > 0) {
          inputAlert.hidden = false;
          inputAlert.textContent = result.warnings.map(w => w.message).join(" · ");
        } else {
          inputAlert.hidden = true;
          inputAlert.textContent = "";
        }
      }

      // Category subtotals & collapsible breakdown
      if (breakdownListEl) breakdownListEl.textContent = "";
      result.categories.forEach(catRes => {
        const subEl = document.getElementById("calc-sub-" + catRes.id);
        const hasAnyEntered = catRes.items.some(it => it.entered);
        if (subEl) {
          if (!hasAnyEntered) {
            subEl.textContent = "—";
          } else {
            subEl.textContent = catRes.isBonus
              ? ("+" + engine.fmtDecimal(catRes.earnedPoints) + " p")
              : (engine.fmtDecimal(catRes.earnedPoints) + " / " + engine.fmtDecimal(catRes.maxPoints) + " p");
          }
        }

        if (breakdownListEl) {
          const dtText = catRes.isBonus
            ? catRes.title
            : (catRes.title + " (" + catRes.weight + "%)");
          const ddText = !hasAnyEntered
            ? "Pendent"
            : ((catRes.isBonus ? "+" : "") + engine.fmtDecimal(catRes.earnedPoints) + " p");
          breakdownListEl.appendChild(el("div", {}, [
            el("dt", { textContent: dtText }),
            el("dd", { textContent: ddText })
          ]));
        }
      });

      // Result header & status badge
      if (goalLabelEl) {
        goalLabelEl.textContent = result.allRegularEntered
          ? ("Resultat final · " + config.year)
          : ("Objectiu: Aprovar (" + engine.fmtDecimal(result.passThreshold) + ")");
      }
      if (enteredCountEl) {
        enteredCountEl.textContent =
          "Notes introduïdes: " + result.enteredRegularCount + " de " + result.totalRegularCount;
      }
      if (finalStatusEl) {
        finalStatusEl.textContent = result.statusLabel;
        finalStatusEl.className = "udl-calc-status-badge";
        if (result.statusKind === "pass" || result.statusKind === "guaranteed") {
          finalStatusEl.classList.add("is-pass");
        } else if (result.statusKind === "fail" || result.statusKind === "impossible") {
          finalStatusEl.classList.add("is-fail");
        } else if (result.statusKind === "min-pending") {
          finalStatusEl.classList.add("is-warn");
        } else {
          finalStatusEl.classList.add("is-neutral");
        }
      }

      // Main required-grade headline & detail
      if (reqHeadlineEl) reqHeadlineEl.textContent = result.required.headline;
      if (reqDetailEl) reqDetailEl.textContent = result.required.detail || "";

      // Concrete passing combination example (when 2+ pending items or pending minimum)
      if (exampleBoxEl && exampleListEl) {
        const plan = result.required.examplePlan || [];
        const showPlan =
          result.required.canPass &&
          !result.allRegularEntered &&
          (plan.length >= 2 || result.statusKind === "min-pending");
        if (showPlan) {
          exampleBoxEl.hidden = false;
          if (exampleTitleEl) {
            exampleTitleEl.textContent =
              result.statusKind === "min-pending"
                ? "Mínim obligatori pendent"
                : "Exemple de combinació per aprovar (pots provar altres notes a dalt)";
          }
          exampleListEl.textContent = "";
          plan.forEach(step => {
            exampleListEl.appendChild(el("li", { className: "udl-calc-example-item" }, [
              el("span", { className: "udl-calc-example-name", textContent: step.code + " · " + step.title + " (" + step.weight + "%)" }),
              el("strong", { className: "udl-calc-example-val", textContent: "≥ " + engine.fmtDecimal(step.requiredGrade) })
            ]));
          });
        } else {
          exampleBoxEl.hidden = true;
          exampleListEl.textContent = "";
        }
      }

      // Compact metrics strip
      if (metricKnownEl) {
        metricKnownEl.textContent = engine.fmtDecimal(result.knownTotalPoints) + " p";
      }
      if (metricPendingEl) {
        metricPendingEl.textContent = result.pendingRegularWeight + "%";
      }
      if (metricThirdLabelEl && metricThirdValEl) {
        if (result.allRegularEntered && result.finalGrade !== null) {
          metricThirdLabelEl.textContent = "Nota final";
          metricThirdValEl.textContent = engine.fmtDecimal(result.finalGrade) + " / " + engine.fmtDecimal(result.maxGrade, 0);
        } else {
          metricThirdLabelEl.textContent = "Màxim possible";
          metricThirdValEl.textContent = engine.fmtDecimal(result.maxPossibleFinalGrade) + " / " + engine.fmtDecimal(result.maxGrade, 0);
        }
      }

      if (formulaCodeEl) {
        formulaCodeEl.textContent = result.formulaText;
      }
    }

    if (yearSelect) {
      yearSelect.addEventListener("change", () => {
        currentYearId = yearSelect.value;
        writeJsonStorage(STORAGE_CALC_ACTIVE_YEAR, currentYearId);
        renderCalculatorDOM();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const config = getCurrentYearConfig();
        if (!config) return;
        delete allSavedInputs[config.year];
        writeJsonStorage(STORAGE_CALC_INPUTS, allSavedInputs);
        renderCalculatorDOM();
      });
    }

    renderYearSelector();
    renderCalculatorDOM();

    // Hydrate official academic-year configurations from repository JSON if available
    fetch(resolveUrl("downloads/data/academic-years.json"))
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data && Array.isArray(data.academicYears) && data.academicYears.length > 0) {
          const validYears = data.academicYears.filter(yr => engine.validateYearConfig(yr).valid);
          if (validYears.length > 0) {
            academicYears = validYears;
            if (!academicYears.some(y => y.year === currentYearId)) {
              currentYearId = getDefaultYearId();
            }
            renderYearSelector();
            renderCalculatorDOM();
          }
        }
      })
      .catch(() => {
        // Offline / file:// fallback: uses embedded engine.DEFAULT_ACADEMIC_YEARS
      });
  }

  // ---------------------------------------------------------------------------
  // 7. Hydrate Dynamic Catalog & File Sizes with Session Caching
  // ---------------------------------------------------------------------------
  function applyManifestData(manifest) {
    if (!manifest) return;
    if (Array.isArray(manifest.blocks) && manifest.blocks.length > 0) {
      activeBlocks = manifest.blocks;
      rebuildFlatCatalog();
    }
    if (manifest.bundles) {
      activeBundles = manifest.bundles;
    }
    if (manifest.items) {
      document.querySelectorAll("[data-pdf-size]").forEach(node => {
        const id = node.getAttribute("data-pdf-size");
        const info = manifest.items[id];
        if (info && info.sizeHuman) {
          node.textContent = info.sizeHuman;
        }
      });
    }
    if (manifest.bundles) {
      document.querySelectorAll("[data-zip-size]").forEach(node => {
        const id = node.getAttribute("data-zip-size");
        const info = manifest.bundles[id];
        if (info && info.sizeHuman) {
          node.textContent = info.sizeHuman;
        }
      });
    }
    renderHomeRecentSection();
    window.dispatchEvent(new CustomEvent("udl:catalog-updated"));
  }

  function hydrateFromManifest() {
    try {
      const cached = sessionStorage.getItem(SESSION_MANIFEST_CACHE);
      if (cached) {
        applyManifestData(JSON.parse(cached));
        return;
      }
    } catch {
      // Ignore sessionStorage errors
    }

    // Only fetch manifest.json once per browser session (or when on materials explorer)
    fetch(resolveUrl("downloads/manifest.json"))
      .then(r => (r.ok ? r.json() : null))
      .then(manifest => {
        if (!manifest) return;
        try {
          sessionStorage.setItem(SESSION_MANIFEST_CACHE, JSON.stringify(manifest));
        } catch {
          // Ignore storage quota
        }
        applyManifestData(manifest);
      })
      .catch(() => {
        // Offline / file:// fallback: uses embedded pre-sized DEFAULT_BLOCKS cleanly
      });
  }

  function boot() {
    const currentItem = findCurrentCatalogItem();
    if (currentItem) {
      recordRecentVisit(currentItem);
    }

    if (document.querySelector(".reveal")) {
      initRevealPresentation(currentItem);
    } else {
      initTopNavbar(currentItem);
      renderHomeRecentSection();
      initMaterialsExplorer();
      initHtmlDocumentViewer(currentItem);
      initGradeCalculatorPage();
    }

    hydrateFromManifest();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
