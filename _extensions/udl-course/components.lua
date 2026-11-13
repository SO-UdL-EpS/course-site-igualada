-- UDL Course Components
-- Semantic teaching components for engineering courses.
--
-- Usage in a .qmd file:
--
--   ::: {.definicio title="Procés"}
--   Un procés és una instància en execució d'un programa.
--   :::
--
-- Icons are custom SVG symbols (assets/icons.svg), not emoji — see
-- documentation/branding.md. IMPORTANT: this filter is format-aware.
-- Raw HTML (the <svg>/<details> used for the HTML output) is silently
-- DROPPED by Pandoc's LaTeX/PDF writer, so PDF output uses a plain
-- Pandoc Div with a bold label paragraph instead. Do not "simplify"
-- this to always emit raw HTML — that would make every PDF export
-- render with all component content invisible, with no error at all.

local components = {
  objectius     = { label = "Objectius d'Aprenentatge", icon = "objectius" },
  prerequisits  = { label = "Prerequisits",              icon = "prerequisits" },
  resultat      = { label = "Resultat d'Aprenentatge",   icon = "resultat" },
  definicio     = { label = "Definició",  icon = "definicio" },
  concepte      = { label = "Concepte",   icon = "concepte" },
  exemple       = { label = "Exemple",    icon = "exemple" },
  laboratori    = { label = "Laboratori (Lab)",        icon = "laboratori" },
  exercici      = { label = "Exercici",                icon = "exercici" },
  exerciciprog  = { label = "Exercici de Programació",  icon = "exerciciprog" },
  repte         = { label = "Repte",                    icon = "repte" },
  reflexio      = { label = "Reflexió",                 icon = "reflexio" },
  pista         = { label = "Pista",                    icon = "pista" },
  examtip       = { label = "Pista d'Examen",  icon = "examtip" },
  errorcomu     = { label = "Error Comú",       icon = "errorcomu" },
  bonapractica  = { label = "Bona Pràctica",    icon = "bonapractica" },
  solucio       = { label = "Solució",          icon = "solucio" },
  resum         = { label = "Resum",                   icon = "resum" },
  lectures      = { label = "Lectura Addicional",       icon = "lectures" },
  programari    = { label = "Programari Necessari",     icon = "programari" },
  lliurament    = { label = "Lliurament",               icon = "lliurament" },
  rubrica       = { label = "Rúbrica",                  icon = "rubrica" },
}

local function icon_svg(name)
  local offset = quarto.project.offset or "."
  return '<svg class="udl-icon" aria-hidden="true"><use href="' .. offset .. '/assets/icons.svg#icon-' .. name .. '"></use></svg>'
end

local function label_text(spec, title)
  local t = spec.label
  if title and title ~= "" then t = t .. " — " .. title end
  return t
end

function Div(el)
  for key, spec in pairs(components) do
    if el.classes:includes(key) then
      local title = el.attributes["title"]

      if quarto.doc.is_format("pdf") or quarto.doc.is_format("latex") then
        local heading = pandoc.Para({ pandoc.Strong({ pandoc.Str(label_text(spec, title)) }) })
        el.content:insert(1, heading)
        return el
      end

      local heading_html = icon_svg(spec.icon) .. '<span>' .. label_text(spec, title) .. '</span>'

      if el.attributes["collapse"] == "true" then
        local open_tag = pandoc.RawBlock("html",
          '<details class="udl-component udl-' .. key .. '">' ..
          '<summary class="udl-component-title">' .. heading_html .. '</summary>' ..
          '<div class="udl-component-body">')
        local close_tag = pandoc.RawBlock("html", "</div></details>")
        local blocks = pandoc.Blocks({})
        blocks:insert(open_tag)
        for _, b in ipairs(el.content) do blocks:insert(b) end
        blocks:insert(close_tag)
        return blocks
      end

      local heading = pandoc.RawBlock("html",
        '<div class="udl-component-title">' .. heading_html .. '</div>')
      el.content:insert(1, heading)
      el.classes:insert("udl-component")
      el.classes:insert("udl-" .. key)
      return el
    end
  end
  return el
end

function CodeBlock(el)
  local filename = el.attributes["filename"]
  if filename and filename ~= "" then
    if quarto.doc.is_format("pdf") or quarto.doc.is_format("latex") then
      local caption = pandoc.Para({ pandoc.Emph({ pandoc.Str(filename) }) })
      return { caption, el }
    end
    local header = pandoc.Div(
      { pandoc.Plain({ pandoc.Str(filename) }) },
      pandoc.Attr("", { "udl-code-filename" })
    )
    return pandoc.Div({ header, el }, pandoc.Attr("", { "udl-code-block" }))
  end
  return el
end

local embedded_casts = {}

local function read_cast_file(path)
  local f = io.open(path, "r")
  if f then
    local c = f:read("*a")
    f:close()
    return c
  end
  local basename = path:match("([^/\\]+%.cast)$")
  if basename then
    local candidates = {
      path,
      "cast/" .. basename,
      "cast/01/" .. basename,
      "cast/06/" .. basename,
      "cast/07/" .. basename
    }
    for _, cand in ipairs(candidates) do
      local f2 = io.open(cand, "r")
      if f2 then
        local c2 = f2:read("*a")
        f2:close()
        return c2
      end
    end
  end
  return nil
end

function RawBlock(el)
  if el.format == "html" and el.text:find("AsciinemaPlayer%.create") then
    for path in el.text:gmatch("AsciinemaPlayer%.create%s*%(%s*['\"]([^'\"]+%.cast)['\"]") do
      if not embedded_casts[path] then
        local data = read_cast_file(path)
        if data then
          embedded_casts[path] = data
        end
      end
    end
  end
  return el
end

-- Vista contínua d'apunts i barra de navegació per als temes de Reveal.js
function Pandoc(doc)
  if quarto.doc.is_format("revealjs") then
    local offset = quarto.project.offset or "."
    local home_href = offset .. "/index.html"
    local guia_href = offset .. "/course-info/guia-estudi.html"
    local lab_href  = offset .. "/course-info/entrenament-interactiu.html"

    -- Incorporem les dades dels fitxers .cast a window.__UDL_CASTS perquè AsciinemaPlayer
    -- pugui reproduir les demostracions directament des de memòria ({ data: ... }) tant en local com a la web.
    local cast_js_lines = {
      "<script>",
      "window.__UDL_CASTS = window.__UDL_CASTS || {};"
    }
    for p, d in pairs(embedded_casts) do
      local safe_data = pandoc.json.encode(d):gsub("<(/%s*script)", "<\\/%1")
      table.insert(cast_js_lines, "window.__UDL_CASTS[" .. pandoc.json.encode(p) .. "] = " .. safe_data .. ";")
    end
    table.insert(cast_js_lines, [[
(function() {
  function hookPlayer(ap) {
    if (ap && ap.create && !ap.__udl_hooked) {
      ap.__udl_hooked = true;
      var orig = ap.create;
      ap.create = function(src, el, opts) {
        if (typeof src === 'string' && window.__UDL_CASTS && window.__UDL_CASTS[src]) {
          src = { data: window.__UDL_CASTS[src] };
        }
        return orig.call(this, src, el, opts);
      };
    }
  }
  if (window.AsciinemaPlayer) {
    hookPlayer(window.AsciinemaPlayer);
  } else {
    var _ap;
    Object.defineProperty(window, 'AsciinemaPlayer', {
      configurable: true,
      enumerable: true,
      get: function() { return _ap; },
      set: function(val) {
        _ap = val;
        hookPlayer(_ap);
      }
    });
  }
})();
</script>
]])
    quarto.doc.include_text("in-header", table.concat(cast_js_lines, "\n"))
    embedded_casts = {}

    -- Script inicial al head: aplica udl-notes-html i el tema fosc abans que s'executin
    -- els scripts d'AsciinemaPlayer al body perquè els contenidors ja tinguin l'amplada real.
    local early_head = [[
<script>
(function() {
  var root = document.documentElement;
  try {
    var params = new URLSearchParams(window.location.search);
    if (params.get('vista') === 'apunts') {
      localStorage.setItem('udl_slide_notesview', '1');
    } else if (params.get('vista') === 'diapos') {
      localStorage.setItem('udl_slide_notesview', '0');
    } else if (localStorage.getItem('udl_slide_notesview') === null && window.innerWidth < 860) {
      localStorage.setItem('udl_slide_notesview', '1');
    }
    if (localStorage.getItem('udl_slide_notesview') === '1') {
      root.classList.add('udl-notes-html');
      if (window.innerWidth >= 1100) {
        root.classList.add('udl-has-docked-toc');
      }
    }
    var qScheme = localStorage.getItem('quarto-color-scheme');
    var savedDark = localStorage.getItem('udl_slide_dark');
    var isDark = qScheme === 'alternate' || (qScheme === null && (savedDark === '1' || (savedDark === null && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)));
    if (isDark) root.classList.add('udl-slide-dark');
  } catch (e) {}
})();
</script>
]]
    quarto.doc.include_text("in-header", early_head)

    local slide_tools = [[
<div id="udl-slide-ruler" aria-hidden="true"></div>
<header id="udl-study-header" role="banner" aria-label="Barra d'estudi i navegació del tema">
  <div class="udl-sh-left">
    <a class="udl-sh-home" href="]] .. home_href .. [[" title="Torna a la pàgina principal de Sistemes Operatius">← Curs</a>
    <button type="button" id="udl-sh-toc-btn" class="udl-sh-btn" aria-expanded="false" title="Mostra o amaga l'índex d'apartats del tema">Índex</button>
  </div>

  <div class="udl-sh-center" id="udl-sh-search-wrap">
    <input type="search" id="udl-notes-search" placeholder="Cerca concepte, funció o codi...  (tecla /)" aria-label="Cerca en aquest tema">
    <button type="button" id="udl-sh-favfilter" class="udl-sh-btn" title="Mostra només els apartats que has seleccionat per al teu resum">Resum (0)</button>
    <span class="udl-sh-count" id="udl-nf-count"></span>
  </div>

  <div class="udl-sh-right">
    <div class="udl-sh-seg" role="group" aria-label="Format d'estudi">
      <button type="button" id="udl-st-notesview" title="Format d'apunts continus amb índex lateral, cerca i vídeos actius">Apunts</button>
      <button type="button" id="udl-st-slidesview" title="Format de presentació de diapositives de classe">Diapos</button>
    </div>
    <button type="button" id="udl-st-sols" class="udl-sh-btn" title="Oculta temporalment les solucions dels exercicis per practicar abans de comprovar-les">Practica</button>
    <div class="udl-sh-menu">
      <button type="button" id="udl-sh-prefs-btn" class="udl-sh-btn" aria-expanded="false" aria-controls="udl-sh-prefs" title="Opcions de lectura, concentració i accessibilitat">Preferències</button>
      <div id="udl-sh-prefs" role="dialog" aria-label="Preferències de lectura" hidden>
        <div class="udl-shp-title">Visualització</div>
        <button type="button" id="udl-st-nofrag" class="udl-shp-btn" title="Mostra tots els passos de cada diapositiva sense animacions incrementals">Tot visible</button>
        <button type="button" id="udl-st-profnotes" class="udl-shp-btn" title="Mostra o oculta les notes i resolucions ampliades del professorat">Notes</button>
        <button type="button" id="udl-st-dark" class="udl-shp-btn" title="Canvia entre tema clar i tema fosc">Tema</button>
        <div class="udl-shp-title">Lectura</div>
        <button type="button" id="udl-st-easy" class="udl-shp-btn" title="Tipografia d'alta llegibilitat, també als títols, i interlineat ampli">Lectura fàcil</button>
        <label class="udl-shp-row">Tipus de lletra
          <select id="udl-st-font">
            <option value="default">Estàndard</option>
            <option value="atkinson">Atkinson Hyperlegible</option>
            <option value="lexend">Lexend</option>
            <option value="opendyslexic">OpenDyslexic</option>
          </select>
        </label>
        <button type="button" id="udl-st-ruler" class="udl-shp-btn" title="Guia horitzontal o màscara per seguir línies de codi i taules; també segueix el focus del teclat">Guia de lectura</button>
        <div class="udl-shp-title">Concentració i estudi</div>
        <button type="button" id="udl-st-focus" class="udl-shp-btn" title="Amaga la barra i l'índex per centrar-te en el text, dins la finestra actual">Mode concentració</button>
        <button type="button" id="udl-st-tts" class="udl-shp-btn" title="Llegeix en veu alta el text seleccionat o l'apartat actual">Escolta l'apartat</button>
        <button type="button" id="udl-st-print" class="udl-shp-btn" title="Imprimeix o desa en PDF amb format continu d'apunts (o només el teu resum si tens el filtre actiu)">Desa en PDF</button>
      </div>
    </div>
  </div>
</header>

<div id="udl-focus-exit" hidden>
  <span id="udl-focus-where">Mode concentració</span>
  <button type="button" id="udl-focus-exit-btn">Restaura vista normal</button>
</div>
<div id="udl-live" role="status" aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;"></div>

<aside id="udl-toc-drawer" aria-label="Índex d'apartats del tema" hidden>
  <div class="udl-toc-head">
    <strong>Índex del tema</strong>
    <button type="button" id="udl-toc-close" aria-label="Tanca l'índex">✕</button>
  </div>
  <div id="udl-done-bar-wrap" aria-hidden="true"><div id="udl-done-bar"></div></div>
  <div id="udl-toc-list" class="udl-toc-list"></div>
</aside>

<script>
(function() {
  var root = document.documentElement;
  var homeHref = "]] .. home_href .. [[";
  var guiaHref = "]] .. guia_href .. [[";
  var labHref  = "]] .. lab_href .. [[";
  var favStorageKey = 'udl_fav_v2_' + (window.location.pathname || 'topic').replace(/[^a-zA-Z0-9]/g, '_');
  var favSet = {};
  try {
    var rawFav = JSON.parse(localStorage.getItem(favStorageKey) || '[]');
    if (Array.isArray(rawFav)) {
      rawFav.forEach(function(k) { favSet[k] = true; });
    }
  } catch (e) {}
  var onlyFavs = false;

  // Apartats que l'estudiant ja té clars (es desa per tema al navegador)
  var doneStorageKey = 'udl_done_v2_' + (window.location.pathname || 'topic').replace(/[^a-zA-Z0-9]/g, '_');
  var doneSet = {};
  try {
    var rawDone = JSON.parse(localStorage.getItem(doneStorageKey) || '[]');
    if (Array.isArray(rawDone)) rawDone.forEach(function(k) { doneSet[k] = true; });
  } catch (e) {}
  function saveDone() {
    try {
      localStorage.setItem(doneStorageKey, JSON.stringify(Object.keys(doneSet).filter(function(k) { return doneSet[k]; })));
    } catch (e) {}
  }
  function updateDoneProgress() {
    var total = studySections.length;
    var n = studySections.filter(function(s) { return !!doneSet[s.key]; }).length;
    var title = document.querySelector('#udl-toc-drawer .udl-toc-head strong');
    if (title) title.textContent = total > 0 ? ('Índex · ' + n + ' de ' + total + ' clars') : 'Índex del tema';
    var bar = document.getElementById('udl-done-bar');
    if (bar) bar.style.width = (total > 0 ? Math.round(100 * n / total) : 0) + '%';
    document.querySelectorAll('#udl-toc-list .udl-toc-item[data-slide-key]').forEach(function(b) {
      b.classList.toggle('is-done', !!doneSet[b.getAttribute('data-slide-key')]);
    });
  }
  var hideSolutions = false;
  var focusActive = false;
  var desktopTocHidden = false;

  function normText(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  var FONT_SRC = {
    atkinson: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap',
    lexend: 'https://fonts.googleapis.com/css2?family=Lexend:wght@400;600&display=swap',
    opendyslexic: 'https://cdn.jsdelivr.net/npm/@fontsource/opendyslexic@5/400.css'
  };
  function loadFont(href) {
    if (document.querySelector('link[data-udl-font="' + href + '"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href; l.setAttribute('data-udl-font', href);
    document.head.appendChild(l);
  }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var posKey = 'udl_pos_' + (window.location.pathname || 'topic').replace(/[^a-zA-Z0-9]/g, '_');
  var savedPos = null;
  try { savedPos = localStorage.getItem(posKey); } catch (e) {}

  // Les diapositives de Reveal bloquegen el zoom; a la lectura contínua el deixem lliure
  function setViewportZoom(notesView) {
    var meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    meta.setAttribute('content', notesView
      ? 'width=device-width, initial-scale=1.0'
      : 'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0');
  }

  // Movem la capçalera d'estudi, l'índex i el regle a l'inici del body
  var studyHeader = document.getElementById('udl-study-header');
  var tocDrawer = document.getElementById('udl-toc-drawer');
  var rulerEl = document.getElementById('udl-slide-ruler');
  if (tocDrawer && document.body.firstChild) document.body.insertBefore(tocDrawer, document.body.firstChild);
  if (studyHeader && document.body.firstChild) document.body.insertBefore(studyHeader, document.body.firstChild);
  if (rulerEl && document.body.firstChild) document.body.insertBefore(rulerEl, document.body.firstChild);

  // 1. Carreguem tots els recursos multimèdia de Reveal (img, video, source, iframe)
  //    i traiem data-src perquè el viewDistance de Reveal no els descarregui en vista d'apunts.
  function forceLoadAllMedia() {
    document.querySelectorAll('.reveal [data-src]').forEach(function(el) {
      var ds = el.getAttribute('data-src');
      if (ds) {
        if (!el.getAttribute('src')) {
          el.setAttribute('src', ds);
        }
        if (!el.hasAttribute('decoding')) {
          el.setAttribute('decoding', 'async');
        }
        el.removeAttribute('data-src');
        el.removeAttribute('data-lazy-loaded');
      }
    });
    document.querySelectorAll('.reveal [data-srcset]').forEach(function(el) {
      var dss = el.getAttribute('data-srcset');
      if (dss) {
        if (!el.getAttribute('srcset')) {
          el.setAttribute('srcset', dss);
        }
        el.removeAttribute('data-srcset');
      }
    });
    document.querySelectorAll('.reveal video').forEach(function(v) {
      if (!v.hasAttribute('controls')) v.setAttribute('controls', 'controls');
      if (v.preload === 'none') v.preload = 'metadata';
    });
  }
  forceLoadAllMedia();

  // 2. Redimensionem els reproductors d'AsciinemaPlayer quan canvia la vista
  //    i evitem que Reveal intercepti les tecles dins dels terminals.
  function refreshTerminalPlayers() {
    [20, 140, 380].forEach(function(ms) {
      setTimeout(function() {
        window.dispatchEvent(new Event('resize'));
      }, ms);
    });
  }

  function isolateTerminalEvents() {
    document.querySelectorAll('.ap-wrapper, .asciinema-player').forEach(function(ap) {
      if (ap.getAttribute('data-udl-isolated') === '1') return;
      ap.setAttribute('data-udl-isolated', '1');
      // Aïllem només els esdeveniments de teclat perquè l'espai o les fletxes dins del reproductor no passin de diapositiva.
      ['keydown', 'keyup'].forEach(function(evName) {
        ap.addEventListener(evName, function(e) {
          e.stopPropagation();
        });
      });

      var parent = ap.parentElement;
      // Targeta per a l'exportació en PDF en lloc del reproductor interactiu
      if (parent && !parent.querySelector('.udl-terminal-print-card')) {
        var card = document.createElement('div');
        card.className = 'udl-terminal-print-card';
        card.setAttribute('aria-hidden', 'true');
        card.innerHTML = '<span class="udl-tpc-icon">🖥️</span> <span class="udl-tpc-text"><strong>Demostració interactiva de terminal:</strong> disponible a la versió web de l\'assignatura.</span>';
        parent.insertBefore(card, ap);
      }
    });
  }
  isolateTerminalEvents();

  // 3. Mesurem els diagrames Mermaid de les diapositives ocultes perquè l'SVG no surti retallat
  var measuringSlides = [];
  document.querySelectorAll('.reveal .slides section').forEach(function(sec) {
    if (sec.querySelector('pre.mermaid-js')) {
      sec.classList.add('udl-mermaid-measuring');
      measuringSlides.push(sec);
    }
  });

  window.addEventListener('load', function() {
    forceLoadAllMedia();
    isolateTerminalEvents();
    document.querySelectorAll('a.home-link').forEach(function(a) {
      a.setAttribute('href', homeHref);
    });

    if (measuringSlides.length > 0) {
      var tries = 0;
      var timer = setInterval(function() {
        tries++;
        if (document.querySelectorAll('pre.mermaid-js').length === 0 || tries > 45) {
          clearInterval(timer);
          measuringSlides.forEach(function(s) { s.classList.remove('udl-mermaid-measuring'); });
          if (!root.classList.contains('udl-notes-html') && window.Reveal && typeof window.Reveal.layout === 'function') {
            window.Reveal.layout();
          }
        }
      }, 85);
    }

    // Sincronitzem amb el cicle de vida de Reveal un cop inicialitzat
    var revTries = 0;
    var revWait = setInterval(function() {
      revTries++;
      if (window.Reveal && typeof window.Reveal.isReady === 'function' && window.Reveal.isReady()) {
        clearInterval(revWait);
        syncRevealWithMode();
        window.Reveal.on('slidechanged', function() {
          forceLoadAllMedia();
          isolateTerminalEvents();
          refreshTerminalPlayers();
        });
      } else if (revTries > 60) {
        clearInterval(revWait);
      }
    }, 80);

    refreshTerminalPlayers();
  });

  // 4. Netegem els estils en línia que injecta Reveal.layout() quan estem en mode Apunts
  function cleanInlineStylesForNotes() {
    var slidesEl = document.querySelector('.reveal .slides');
    if (slidesEl) {
      slidesEl.style.width = '';
      slidesEl.style.height = '';
      slidesEl.style.inset = '';
      slidesEl.style.transform = '';
      slidesEl.style.zoom = '';
    }
    document.querySelectorAll('.reveal .slides section').forEach(function(s) {
      s.removeAttribute('hidden');
      s.removeAttribute('aria-hidden');
      if (s.style.display === 'none') s.style.display = '';
      s.style.top = '';
    });
    document.querySelectorAll('.reveal .r-stretch, .reveal .stretch').forEach(function(el) {
      el.style.height = '';
      el.style.width = '';
      el.style.maxHeight = '';
      el.style.maxWidth = '';
    });
  }

  function syncRevealWithMode() {
    var notesView = root.classList.contains('udl-notes-html');
    forceLoadAllMedia();
    if (window.Reveal && typeof window.Reveal.configure === 'function') {
      try {
        window.Reveal.configure({
          viewDistance: 9999,
          mobileViewDistance: 9999,
          keyboard: !notesView,
          touch: !notesView,
          hash: !notesView,
          history: !notesView
        });
      } catch (e) {}
      if (notesView) {
        cleanInlineStylesForNotes();
      } else if (typeof window.Reveal.layout === 'function') {
        setTimeout(function() { window.Reveal.layout(); }, 35);
      }
    } else if (notesView) {
      cleanInlineStylesForNotes();
    }
    refreshTerminalPlayers();
  }

  // 5. Indexem les diapositives per a la vista d'apunts i l'índex lateral:
  //    - #title-slide -> Capçalera del tema
  //    - section.level1 -> Separador de bloc
  //    - section.level2 -> Apartat numerat (1, 2, 3...) amb botons de resum i progrés
  var topSections = Array.from(document.querySelectorAll('.reveal > .slides > section'));
  var allSlides = [];
  var studySections = [];
  var tocEntries = [];
  var secCounter = 0;
  var partCounter = 0;
  var prevBaseTitle = '';
  var prevPrefix = '';
  var prevWasIntroMeta = false;
  var currentStudySec = null;
  var titleSlideEl = null;

  topSections.forEach(function(topSec, hIdx) {
    var children = Array.from(topSec.querySelectorAll(':scope > section'));
    if (children.length > 0) {
      children.forEach(function(child, vIdx) {
        allSlides.push({ el: child, h: hIdx, v: vIdx });
      });
    } else {
      allSlides.push({ el: topSec, h: hIdx, v: 0 });
    }
  });

  // Comptadors de resum a la capçalera del tema en vista d'apunts
  var totalExercises = document.querySelectorAll('.reveal .udl-exercici, .reveal .udl-exerciciprog, .reveal .udl-repte').length;
  var totalDemos = document.querySelectorAll('.reveal .ap-wrapper, .reveal video').length;
  var totalCodeBlocks = document.querySelectorAll('.reveal pre.sourceCode').length;

  function saveFavs() {
    try {
      var arr = Object.keys(favSet).filter(function(k) { return favSet[k]; });
      localStorage.setItem(favStorageKey, JSON.stringify(arr));
    } catch (e) {}
  }

  function updateFavCounter() {
    var count = studySections.filter(function(s) { return !!favSet[s.key]; }).length;
    var favBtn = document.getElementById('udl-sh-favfilter');
    if (favBtn) {
      favBtn.textContent = 'Resum (' + count + ')';
      favBtn.classList.toggle('active', onlyFavs);
    }
    // Marquem també els apartats guardats al resum dins de l'índex lateral
    document.querySelectorAll('#udl-toc-list .udl-toc-item[data-slide-key]').forEach(function(btn) {
      var k = btn.getAttribute('data-slide-key');
      btn.classList.toggle('is-fav-toc', !!favSet[k]);
    });
  }

  allSlides.forEach(function(item, rawIdx) {
    var sec = item.el;
    var isTitleSlide = sec.id === 'title-slide' || (rawIdx === 0 && sec.classList.contains('quarto-title-block'));
    if (isTitleSlide) {
      sec.classList.add('udl-doc-header');
      titleSlideEl = sec;
      return;
    }

    var hEl = sec.querySelector('h1, h2, h3');
    var rawTitle = hEl ? (hEl.textContent || '').trim() : '';
    var isLevel1 = sec.classList.contains('level1') || (hEl && hEl.tagName === 'H1');

    if (isLevel1) {
      partCounter++;
      sec.classList.add('udl-part-divider');
      if (!sec.id) sec.id = 'udl-part-' + partCounter;
      tocEntries.push({
        label: rawTitle || ('Bloc ' + partCounter),
        isL1: true,
        h: item.h,
        v: item.v,
        el: sec,
        key: null
      });
      prevBaseTitle = '';
      prevPrefix = '';
      prevWasIntroMeta = false;
      currentStudySec = null;
      return;
    }

    // Netegem sufixos de continuació "(I)", "(II)", "(III)", "(1)", "(2)"
    var baseMatch = rawTitle.replace(/\s*\((?:[IVXLCDM]+|\d+)\)\s*$/i, '').trim();
    var hasNumSuffix = baseMatch !== rawTitle && baseMatch.length > 0;

    // Detectem prefixos temàtics compartits abans de ":" (ex. "Il·lusionista: ...", "Àrbitre: ...", "Exercici 01: ...")
    var colonIdx = baseMatch.indexOf(':');
    var prefixMatch = colonIdx > 1 ? baseMatch.slice(0, colonIdx).trim() : '';
    if (/^(exemple|example|demo|demostraci[oó]|annex|cas pr[aà]ctic|lectura|pas\s*\d+)$/i.test(prefixMatch)) {
      prefixMatch = '';
    }

    var isIntroMeta = secCounter <= 1 && /^(objectius|prerequisits|punt de partida|on ens vam quedar|recordem qu[eè] sabem|pregunta central|la pregunta)\b/i.test(baseMatch);
    var isSolutionFollowup = /\bsoluci[oó]\b/i.test(baseMatch) && prevBaseTitle && /(exercici|problema|repte|cas pr[aà]ctic|an[aà]lisi)/i.test(prevBaseTitle);

    var isCont = false;
    var isSameBaseTitle = false;
    if (currentStudySec) {
      if (baseMatch && prevBaseTitle && baseMatch.toLowerCase() === prevBaseTitle.toLowerCase()) {
        isCont = true;
        isSameBaseTitle = true;
      } else if (prefixMatch && prevPrefix && prefixMatch.toLowerCase() === prevPrefix.toLowerCase()) {
        isCont = true;
      } else if (prevBaseTitle && prevBaseTitle.length >= 5 && baseMatch.toLowerCase().indexOf(prevBaseTitle.toLowerCase() + ':') === 0) {
        isCont = true;
      } else if (isSolutionFollowup) {
        isCont = true;
      } else if (isIntroMeta && prevWasIntroMeta && currentStudySec.els.length < 4) {
        isCont = true;
      } else if (/^comunicaci[oó] bidireccional/i.test(baseMatch) && /^comunicaci[oó] bidireccional/i.test(prevBaseTitle)) {
        isCont = true;
        isSameBaseTitle = true;
      } else if (/^orfes i zombies$/i.test(baseMatch) && /^orfes$/i.test(prevBaseTitle)) {
        isCont = true;
      }
    }

    if (isCont) {
      sec.setAttribute('data-udl-slide-key', currentStudySec.key);
      sec.classList.add('udl-study-sec', 'udl-sec-continuation');
      if (isSameBaseTitle) {
        sec.classList.add('udl-sec-same-title');
      }
      currentStudySec.els.push(sec);
      currentStudySec.searchText += ' ' + normText(sec.textContent);
      // Si el títol de l'apartat pare duia "(I)", el deixem net sense el "(I)" en mode apunts
      if (currentStudySec.hEl && currentStudySec.hadNumSuffix) {
        currentStudySec.hEl.textContent = currentStudySec.title;
        currentStudySec.hadNumSuffix = false;
      }
      prevBaseTitle = baseMatch;
      if (prefixMatch) prevPrefix = prefixMatch;
      prevWasIntroMeta = prevWasIntroMeta && isIntroMeta;
      return;
    }

    secCounter++;
    var slideKey = 'sec_' + secCounter;
    sec.setAttribute('data-udl-slide-key', slideKey);
    sec.classList.add('udl-study-sec');
    if (!sec.id) sec.id = 'apartat-' + secCounter;

    var displayTitle = (hasNumSuffix ? baseMatch : rawTitle) || ('Apartat ' + secCounter);
    currentStudySec = {
      el: sec,
      els: [sec],
      hEl: hEl,
      hadNumSuffix: hasNumSuffix,
      num: secCounter,
      key: slideKey,
      title: displayTitle,
      searchText: normText(sec.textContent)
    };
    studySections.push(currentStudySec);
    tocEntries.push({
      label: secCounter + '. ' + displayTitle,
      isL1: false,
      h: item.h,
      v: item.v,
      el: sec,
      key: slideKey
    });

    prevBaseTitle = baseMatch;
    prevPrefix = prefixMatch;
    prevWasIntroMeta = isIntroMeta || (secCounter === 1 && rawIdx <= 2);

    // Capçalera de cada apartat (número + botons de progrés i resum)
    if (!sec.querySelector('.udl-sec-headbar')) {
      var headBar = document.createElement('div');
      headBar.className = 'udl-sec-headbar';

      var numSpan = document.createElement('span');
      numSpan.className = 'udl-sec-num';
      numSpan.textContent = 'Apartat ' + secCounter;

      var favToggle = document.createElement('button');
      favToggle.type = 'button';
      favToggle.className = 'udl-fav-btn' + (favSet[slideKey] ? ' is-fav' : '');
      favToggle.textContent = favSet[slideKey] ? 'Al resum' : '+ Guarda al resum';
      function toggleFav(e) {
        if (e) {
          if (e.stopPropagation) e.stopPropagation();
          if (e.preventDefault) e.preventDefault();
        }
        favSet[slideKey] = !favSet[slideKey];
        favToggle.classList.toggle('is-fav', !!favSet[slideKey]);
        favToggle.textContent = favSet[slideKey] ? 'Al resum' : '+ Guarda al resum';
        saveFavs();
        updateFavCounter();
        if (onlyFavs) filterSlides();
      }
      favToggle.addEventListener('click', toggleFav);

      var doneToggle = document.createElement('button');
      doneToggle.type = 'button';
      doneToggle.className = 'udl-done-btn' + (doneSet[slideKey] ? ' is-done' : '');
      doneToggle.textContent = doneSet[slideKey] ? 'Ho tinc clar' : 'Marca com a clar';
      doneToggle.setAttribute('aria-pressed', doneSet[slideKey] ? 'true' : 'false');
      function toggleDone(e) {
        if (e) {
          if (e.stopPropagation) e.stopPropagation();
          if (e.preventDefault) e.preventDefault();
        }
        doneSet[slideKey] = !doneSet[slideKey];
        doneToggle.classList.toggle('is-done', !!doneSet[slideKey]);
        doneToggle.textContent = doneSet[slideKey] ? 'Ho tinc clar' : 'Marca com a clar';
        doneToggle.setAttribute('aria-pressed', doneSet[slideKey] ? 'true' : 'false');
        saveDone();
        updateDoneProgress();
      }
      doneToggle.addEventListener('click', toggleDone);

      ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(function(evt) {
        favToggle.addEventListener(evt, function(e) { e.stopPropagation(); });
        doneToggle.addEventListener(evt, function(e) { e.stopPropagation(); });
      });

      var barActions = document.createElement('span');
      barActions.className = 'udl-sec-actions';
      barActions.appendChild(doneToggle);
      barActions.appendChild(favToggle);

      headBar.appendChild(numSpan);
      headBar.appendChild(barActions);
      ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend'].forEach(function(evt) {
        barActions.addEventListener(evt, function(e) { e.stopPropagation(); });
        headBar.addEventListener(evt, function(e) { e.stopPropagation(); });
      });
      if (hEl && hEl.parentElement === sec) {
        sec.insertBefore(headBar, hEl);
      } else {
        sec.insertBefore(headBar, sec.firstChild);
      }
    }
  });

  // Afegim la tira de metadades a la portada amb el nombre real d'apartats agrupats
  if (titleSlideEl && !titleSlideEl.querySelector('.udl-doc-meta-strip')) {
    var wordCount = ((document.querySelector('.reveal .slides') || {}).textContent || '').split(/\s+/).length;
    var minutes = Math.max(1, Math.round(wordCount / 180));
    var pills = [studySections.length + ' apartats', 'unes ' + minutes + ' min de lectura'];
    if (totalExercises > 0) pills.push(totalExercises + ' exercicis i reptes');
    if (totalCodeBlocks > 0) pills.push(totalCodeBlocks + ' exemples de codi');
    if (totalDemos > 0) pills.push(totalDemos + ' demostracions de terminal');
    var strip = document.createElement('div');
    strip.className = 'udl-doc-meta-strip';
    strip.textContent = pills.join('  ·  ');
    titleSlideEl.appendChild(strip);
  }

  // Enllaç per tornar on es va deixar la lectura (només a Apunts)
  (function() {
    if (!savedPos) return;
    var target = studySections.filter(function(s) { return s.key === savedPos; })[0];
    var header = document.querySelector('.reveal .slides .udl-doc-header');
    if (!target || target.num < 3 || !header) return;
    var link = document.createElement('button');
    link.type = 'button';
    link.className = 'udl-resume-link';
    link.textContent = 'Continua on ho vas deixar: apartat ' + target.num + ' · ' + target.title;
    link.addEventListener('click', function() {
      target.el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
    header.appendChild(link);
  })();

  // En mode "Practica", convertim també les notes docents que resolen exercicis en blocs de solució interactius
  var iconSolHref = homeHref.replace(/index\.html$/, 'assets/icons.svg#icon-solucio');
  document.querySelectorAll('.reveal .slides section').forEach(function(sec) {
    if (sec.querySelector(':scope > section')) return;
    var hasEx = sec.querySelector('.udl-exercici, .udl-exerciciprog, .udl-repte') !== null;
    var hasSol = sec.querySelector('.udl-solucio') !== null;
    if (hasEx && !hasSol) {
      sec.querySelectorAll('aside.notes').forEach(function(noteEl) {
        noteEl.classList.add('udl-practice-note');
        if (!noteEl.querySelector('.udl-component-title')) {
          var tDiv = document.createElement('div');
          tDiv.className = 'udl-component-title';
          tDiv.innerHTML = '<svg class="udl-icon" aria-hidden="true"><use href="' + iconSolHref + '"></use></svg><span>Solució i justificació</span>';
          noteEl.insertBefore(tDiv, noteEl.firstChild);
        }
      });
    }
  });

  // Inicialitzem els controls interactius d'autoavaluació a cada bloc de solució
  var allSolBlocks = Array.from(document.querySelectorAll('.reveal .udl-solucio, .reveal aside.notes.udl-practice-note'));
  function updatePracticeScore() {
    var btnS = document.getElementById('udl-st-sols');
    if (!btnS || allSolBlocks.length === 0) return;
    var mastered = allSolBlocks.filter(function(s) { return s.classList.contains('is-mastered'); }).length;
    var reviewed = allSolBlocks.filter(function(s) { return s.classList.contains('is-review'); }).length;
    if (hideSolutions) {
      btnS.textContent = (mastered + reviewed) > 0
        ? ('Practica · ' + mastered + '/' + allSolBlocks.length + ' ✓')
        : ('Practica (' + allSolBlocks.length + ')');
    } else {
      btnS.textContent = mastered > 0
        ? ('Practica (' + mastered + '/' + allSolBlocks.length + ' ✓)')
        : 'Practica';
    }
  }

  allSolBlocks.forEach(function(sol) {
    var titleEl = sol.querySelector('.udl-component-title');

    var practiceBar = document.createElement('div');
    practiceBar.className = 'udl-sol-practice-bar';

    var tryInput = document.createElement('input');
    tryInput.type = 'text';
    tryInput.className = 'udl-sol-try-input';
    tryInput.placeholder = '✏️ Escriu la teva resposta o predicció abans de comprovar...';
    tryInput.setAttribute('aria-label', 'Escriu la teva resposta o predicció abans de comprovar la solució');

    var toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'udl-sol-toggle-btn';
    toggleBtn.textContent = '🔑 Comprova la solució';

    practiceBar.appendChild(tryInput);
    practiceBar.appendChild(toggleBtn);

    if (titleEl && titleEl.nextSibling) {
      sol.insertBefore(practiceBar, titleEl.nextSibling);
    } else {
      sol.appendChild(practiceBar);
    }

    var evalBar = document.createElement('div');
    evalBar.className = 'udl-sol-eval-bar';

    var evalGroup = document.createElement('div');
    evalGroup.className = 'udl-sol-eval-group';

    var evalLabel = document.createElement('span');
    evalLabel.className = 'udl-sol-eval-label';
    evalLabel.textContent = 'Autoavaluació:';

    var okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = 'udl-sol-eval-btn';
    okBtn.textContent = '✓ Ho he encertat';

    var revBtn = document.createElement('button');
    revBtn.type = 'button';
    revBtn.className = 'udl-sol-eval-btn';
    revBtn.textContent = '↻ Per repassar';

    var hideBtn = document.createElement('button');
    hideBtn.type = 'button';
    hideBtn.className = 'udl-sol-eval-btn';
    hideBtn.textContent = 'Oculta';

    evalGroup.appendChild(evalLabel);
    evalGroup.appendChild(okBtn);
    evalGroup.appendChild(revBtn);
    evalBar.appendChild(evalGroup);
    evalBar.appendChild(hideBtn);
    sol.appendChild(evalBar);

    function setRevealed(rev) {
      sol.classList.toggle('udl-sol-revealed', rev);
      if (rev) {
        sol.classList.add('visible');
        sol.querySelectorAll('.fragment').forEach(function(f) { f.classList.add('visible'); });
      }
      toggleBtn.textContent = rev ? '🙈 Oculta la solució' : '🔑 Comprova la solució';
    }

    function onToggleClick(e) {
      if (e) {
        if (e.stopPropagation) e.stopPropagation();
        if (e.preventDefault) e.preventDefault();
      }
      if (!root.classList.contains('udl-hide-solutions')) return;
      setRevealed(!sol.classList.contains('udl-sol-revealed'));
    }

    toggleBtn.addEventListener('click', onToggleClick);
    hideBtn.addEventListener('click', function(e) {
      if (e && e.stopPropagation) e.stopPropagation();
      setRevealed(false);
    });
    if (titleEl) {
      titleEl.addEventListener('click', onToggleClick);
    }

    tryInput.addEventListener('keydown', function(e) {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        setRevealed(true);
      }
    });
    tryInput.addEventListener('keyup', function(e) { e.stopPropagation(); });

    okBtn.addEventListener('click', function(e) {
      if (e && e.stopPropagation) e.stopPropagation();
      var active = !sol.classList.contains('is-mastered');
      sol.classList.toggle('is-mastered', active);
      sol.classList.remove('is-review');
      okBtn.classList.toggle('is-active-ok', active);
      revBtn.classList.remove('is-active-rev');
      updatePracticeScore();
    });

    revBtn.addEventListener('click', function(e) {
      if (e && e.stopPropagation) e.stopPropagation();
      var active = !sol.classList.contains('is-review');
      sol.classList.toggle('is-review', active);
      sol.classList.remove('is-mastered');
      revBtn.classList.toggle('is-active-rev', active);
      okBtn.classList.remove('is-active-ok');
      updatePracticeScore();
    });

    ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend'].forEach(function(evt) {
      sol.addEventListener(evt, function(e) {
        if (root.classList.contains('udl-hide-solutions')) {
          e.stopPropagation();
        }
      });
    });
  });

  // Avís quan el filtre no té coincidències i targeta final de navegació (en vista d'apunts)
  var slidesContainer = document.querySelector('.reveal .slides');
  var emptyNotice = document.createElement('div');
  emptyNotice.id = 'udl-empty-filter-msg';
  emptyNotice.hidden = true;
  emptyNotice.innerHTML =
    '<p id="udl-empty-filter-text"></p>' +
    '<button type="button" id="udl-reset-filter-btn" class="udl-ne-btn">Mostra tot el tema</button>';

  if (slidesContainer) {
    slidesContainer.appendChild(emptyNotice);
    if (!document.getElementById('udl-notes-endcard')) {
      var endCard = document.createElement('footer');
      endCard.id = 'udl-notes-endcard';
      endCard.innerHTML =
        '<div class="udl-ne-actions">' +
          '<a href="' + homeHref + '" class="udl-ne-btn">&larr; &Iacute;ndex de l\'assignatura</a>' +
          '<a href="' + guiaHref + '" class="udl-ne-btn udl-ne-btn-sec">Guia d\'estudi i resums</a>' +
          '<a href="' + labHref + '" class="udl-ne-btn udl-ne-btn-sec">Laboratori interactiu</a>' +
        '</div>' +
        '<div class="udl-ne-credits">Sistemes Operatius &middot; Universitat de Lleida (Campus Igualada) &mdash; Doc&egrave;ncia: Jordi Mateo Forn&eacute;s &middot; Millores d\'accessibilitat i estudi: Roger Domingo (alumne contribu&iuml;dor)</div>';
      slidesContainer.appendChild(endCard);

      ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend'].forEach(function(evt) {
        endCard.addEventListener(evt, function(e) { e.stopPropagation(); });
      });
      endCard.querySelectorAll('a').forEach(function(a) {
        ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(function(evt) {
          a.addEventListener(evt, function(e) { e.stopPropagation(); });
        });
        a.addEventListener('click', function(e) {
          if (e) {
            if (e.stopPropagation) e.stopPropagation();
          }
          var target = a.getAttribute('href');
          if (target) {
            window.location.href = target;
          }
        });
      });
    }
  }

  // 6. Construcció de l'índex lateral i seguiment d'apartat actiu en mode Apunts
  var tocList = document.getElementById('udl-toc-list');
  var btnToc = document.getElementById('udl-sh-toc-btn');
  var btnTocClose = document.getElementById('udl-toc-close');

  function isDesktopDockedToc() {
    return root.classList.contains('udl-notes-html') && window.innerWidth >= 1100 && !focusActive;
  }

  function syncTocVisibility() {
    if (!tocDrawer || !btnToc) return;
    if (focusActive) {
      // En mode Focus l'índex s'amaga del tot (es pot tornar a obrir amb el botó Índex)
      tocDrawer.hidden = true;
      root.classList.remove('udl-has-docked-toc');
      btnToc.classList.remove('active');
      btnToc.setAttribute('aria-expanded', 'false');
      return;
    }
    if (isDesktopDockedToc()) {
      tocDrawer.hidden = desktopTocHidden;
      root.classList.toggle('udl-has-docked-toc', !desktopTocHidden);
      btnToc.classList.toggle('active', !desktopTocHidden);
      btnToc.setAttribute('aria-expanded', (!desktopTocHidden) ? 'true' : 'false');
    } else {
      root.classList.remove('udl-has-docked-toc');
      btnToc.classList.toggle('active', !tocDrawer.hidden);
      btnToc.setAttribute('aria-expanded', (!tocDrawer.hidden) ? 'true' : 'false');
    }
  }

  function closeMobileToc() {
    if (!isDesktopDockedToc() && tocDrawer) {
      tocDrawer.hidden = true;
      syncTocVisibility();
    }
  }

  if (tocList) {
    tocEntries.forEach(function(entry) {
      var a = document.createElement('button');
      a.type = 'button';
      a.className = 'udl-toc-item' + (entry.isL1 ? ' is-l1' : '');
      if (entry.key) a.setAttribute('data-slide-key', entry.key);
      a.textContent = entry.label;
      a.addEventListener('click', function() {
        closeMobileToc();
        if (root.classList.contains('udl-notes-html')) {
          if (entry.el.classList.contains('udl-filter-hidden')) {
            if (searchInp) searchInp.value = '';
            onlyFavs = false;
            updateFavCounter();
            filterSlides();
          }
          entry.el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        } else if (window.Reveal && typeof window.Reveal.slide === 'function') {
          window.Reveal.slide(entry.h, entry.v);
        }
      });
      tocList.appendChild(a);
    });
  }

  if (btnToc && tocDrawer) {
    btnToc.addEventListener('click', function(e) {
      e.stopPropagation();
      if (focusActive) {
        // Obrir l'índex dins del Focus: es mostra com a calaix temporal
        tocDrawer.hidden = !tocDrawer.hidden;
        btnToc.classList.toggle('active', !tocDrawer.hidden);
        return;
      }
      if (isDesktopDockedToc()) {
        desktopTocHidden = !desktopTocHidden;
        syncTocVisibility();
        refreshTerminalPlayers();
      } else {
        tocDrawer.hidden = !tocDrawer.hidden;
        syncTocVisibility();
      }
    });
  }
  if (btnTocClose) {
    btnTocClose.addEventListener('click', function() {
      if (isDesktopDockedToc()) {
        desktopTocHidden = true;
      } else if (tocDrawer) {
        tocDrawer.hidden = true;
      }
      syncTocVisibility();
      refreshTerminalPlayers();
    });
  }
  document.addEventListener('click', function(e) {
    if (!isDesktopDockedToc() && tocDrawer && !tocDrawer.hidden && !tocDrawer.contains(e.target) && e.target !== btnToc) {
      closeMobileToc();
    }
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeMobileToc();
    // "/" porta directament al cercador (només a Apunts i fora de camps de text)
    var tag = (e.target && e.target.tagName) || '';
    if (e.key === '/' && root.classList.contains('udl-notes-html') && !/INPUT|TEXTAREA|SELECT/.test(tag)) {
      var si = document.getElementById('udl-notes-search');
      if (si) { e.preventDefault(); si.focus(); si.select(); }
    }
  });
  window.addEventListener('resize', function() {
    syncTocVisibility();
  });

  // Seguiment de l'apartat actiu en mode Apunts (sincronitzat amb requestAnimationFrame)
  var tocSlideButtons = tocList ? Array.from(tocList.querySelectorAll('.udl-toc-item[data-slide-key]')) : [];
  var scrollSpyTicking = false;
  var lastSavedScrollKey = null;
  window.addEventListener('scroll', function() {
    if (!root.classList.contains('udl-notes-html') || !tocList || scrollSpyTicking) return;
    scrollSpyTicking = true;
    requestAnimationFrame(function() {
      scrollSpyTicking = false;
      var activeKey = null;
      for (var i = 0; i < studySections.length; i++) {
        var s = studySections[i];
        if (s.el.classList.contains('udl-filter-hidden')) continue;
        var rect = s.el.getBoundingClientRect();
        if (rect.top <= 150) {
          activeKey = s.key;
        } else {
          break;
        }
      }
      if (!activeKey && studySections.length > 0) activeKey = studySections[0].key;
      if (activeKey && activeKey !== lastSavedScrollKey && window.scrollY > 300) {
        lastSavedScrollKey = activeKey;
        try { localStorage.setItem(posKey, activeKey); } catch (e) {}
      }
      for (var j = 0; j < tocSlideButtons.length; j++) {
        var b = tocSlideButtons[j];
        b.classList.toggle('is-current', b.getAttribute('data-slide-key') === activeKey);
      }
    });
  }, { passive: true });

  // 7. Botons de la barra superior i gestió de l'estat
  var btnNotesView = document.getElementById('udl-st-notesview');
  var btnSlidesView = document.getElementById('udl-st-slidesview');
  var btnNoFrag = document.getElementById('udl-st-nofrag');
  var btnSols = document.getElementById('udl-st-sols');
  var btnProfNotes = document.getElementById('udl-st-profnotes');
  var btnRuler = document.getElementById('udl-st-ruler');
  var btnEasy = document.getElementById('udl-st-easy');
  var btnFocus = document.getElementById('udl-st-focus');
  var btnDark = document.getElementById('udl-st-dark');
  var btnPrint = document.getElementById('udl-st-print');
  var btnTts = document.getElementById('udl-st-tts');
  var fontSel = document.getElementById('udl-st-font');
  var prefsBtn = document.getElementById('udl-sh-prefs-btn');
  var prefsPanel = document.getElementById('udl-sh-prefs');
  var focusExit = document.getElementById('udl-focus-exit');
  var focusExitBtn = document.getElementById('udl-focus-exit-btn');
  var focusWhere = document.getElementById('udl-focus-where');
  var liveEl = document.getElementById('udl-live');
  var btnFavFilter = document.getElementById('udl-sh-favfilter');
  var searchWrap = document.getElementById('udl-sh-search-wrap');
  var searchInp = document.getElementById('udl-notes-search');
  var countEl = document.getElementById('udl-nf-count');
  var resetFilterBtn = document.getElementById('udl-reset-filter-btn');

  var totalNotes = document.querySelectorAll('.reveal aside.notes').length;
  if (btnProfNotes) {
    if (totalNotes === 0) {
      btnProfNotes.style.display = 'none';
    } else {
      btnProfNotes.textContent = 'Notes (' + totalNotes + ')';
    }
  }
  if (btnSols && allSolBlocks.length === 0) {
    btnSols.style.display = 'none';
  }

  function isDarkActive() {
    var qScheme = localStorage.getItem('quarto-color-scheme');
    if (qScheme === 'alternate') return true;
    if (qScheme === 'default') return false;
    var saved = localStorage.getItem('udl_slide_dark');
    if (saved === '1') return true;
    if (saved === '0') return false;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function isProfNotesActive(notesView) {
    var saved = localStorage.getItem('udl_slide_profnotes');
    if (saved === '1') return true;
    if (saved === '0') return false;
    // En mode Apunts es mostren per defecte les notes del professorat
    return notesView;
  }

  function applySlideState() {
    var notesView = localStorage.getItem('udl_slide_notesview') === '1';
    var noFrag = localStorage.getItem('udl_slide_nofrag') === '1';
    var profNotes = isProfNotesActive(notesView);
    var rulerMode = localStorage.getItem('udl_ruler_mode') || (localStorage.getItem('udl_reading_ruler') === '1' ? 'line' : 'off');
    var ruler = rulerMode !== 'off';
    var fontPref = localStorage.getItem('udl_font') || 'default';
    var easy = localStorage.getItem('udl_easy_read') === '1';
    var dark = isDarkActive();

    root.classList.toggle('udl-notes-html', notesView);
    setViewportZoom(notesView);
    root.classList.toggle('udl-no-fragments', noFrag);
    root.classList.toggle('udl-show-notes', profNotes && !hideSolutions);
    root.classList.toggle('udl-hide-solutions', hideSolutions);
    root.classList.toggle('udl-slide-ruler-on', ruler);
    root.classList.toggle('udl-slide-ruler-mask', rulerMode === 'mask');
    ['atkinson', 'lexend', 'opendyslexic'].forEach(function(f) { root.classList.toggle('udl-slide-font-' + f, fontPref === f); });
    if (easy) loadFont(FONT_SRC.atkinson);
    if (FONT_SRC[fontPref]) loadFont(FONT_SRC[fontPref]);
    if (fontSel) fontSel.value = fontPref;
    root.classList.toggle('udl-slide-easyread', easy);
    root.classList.toggle('udl-slide-focus', focusActive);
    root.classList.toggle('udl-slide-dark', dark);

    if (btnNotesView) btnNotesView.classList.toggle('active', notesView);
    if (btnSlidesView) btnSlidesView.classList.toggle('active', !notesView);
    if (searchWrap) searchWrap.style.display = notesView ? 'flex' : 'none';
    if (btnNoFrag) {
      btnNoFrag.classList.toggle('active', noFrag);
      btnNoFrag.style.display = notesView ? 'none' : '';
    }
    if (btnSols && allSolBlocks.length > 0) {
      btnSols.style.display = '';
      btnSols.classList.toggle('active', hideSolutions);
      updatePracticeScore();
    }
    if (btnProfNotes && totalNotes > 0) btnProfNotes.classList.toggle('active', profNotes);
    if (btnRuler) {
      btnRuler.classList.toggle('active', ruler);
      btnRuler.textContent = 'Guia de lectura: ' + (rulerMode === 'line' ? 'línia' : (rulerMode === 'mask' ? 'màscara' : 'no'));
    }
    if (focusExit) focusExit.hidden = !focusActive;
    if (prefsBtn) prefsBtn.classList.toggle('active', easy || ruler || fontPref !== 'default' || focusActive);
    if (btnEasy) btnEasy.classList.toggle('active', easy);
    if (btnFocus) { btnFocus.classList.toggle('active', focusActive); btnFocus.setAttribute('aria-pressed', focusActive ? 'true' : 'false'); }
    if (btnEasy) btnEasy.setAttribute('aria-pressed', easy ? 'true' : 'false');
    if (btnDark) {
      btnDark.classList.remove('active');
      btnDark.textContent = dark ? 'Tema: Fosc' : 'Tema: Clar';
    }

    if (!notesView && tocDrawer && isDesktopDockedToc() === false) {
      tocDrawer.hidden = true;
    }
    syncTocVisibility();
    updateFavCounter();
    updateDoneProgress();

    if (notesView) {
      filterSlides();
    }
    syncRevealWithMode();
  }

  function filterSlides() {
    var q = searchInp ? normText(searchInp.value).trim() : '';
    var terms = q ? q.split(/\s+/) : [];
    var shown = 0;

    studySections.forEach(function(item) {
      var hay = item.searchText || '';
      var matchText = terms.length === 0 || terms.every(function(t) { return hay.indexOf(t) !== -1; });
      var matchFav = !onlyFavs || !!favSet[item.key];
      var match = matchText && matchFav;
      (item.els || [item.el]).forEach(function(s) {
        s.classList.toggle('udl-filter-hidden', !match);
      });
      if (match) shown++;
    });

    // Amaguem els separadors de bloc quan s'està filtrant per cerca o pel resum
    var isFiltering = terms.length > 0 || onlyFavs;
    document.querySelectorAll('.reveal .slides .udl-part-divider').forEach(function(pd) {
      pd.classList.toggle('udl-filter-hidden', isFiltering);
    });

    document.querySelectorAll('.reveal .slides > section').forEach(function(st) {
      if (!st.querySelector(':scope > section')) return;
      var anyVisible = st.querySelector(':scope > section:not(.udl-filter-hidden)') !== null;
      st.classList.toggle('udl-filter-hidden', !anyVisible);
    });

    if (countEl) {
      countEl.textContent = isFiltering ? (shown + ' / ' + studySections.length) : (studySections.length + ' apartats');
    }

    var emptyMsgEl = document.getElementById('udl-empty-filter-msg');
    var emptyTxtEl = document.getElementById('udl-empty-filter-text');
    if (emptyMsgEl && emptyTxtEl) {
      if (shown === 0 && studySections.length > 0) {
        emptyMsgEl.hidden = false;
        if (onlyFavs && Object.keys(favSet).filter(function(k) { return favSet[k]; }).length === 0) {
          emptyTxtEl.textContent = 'Encara no has marcat cap apartat per al teu resum en aquest tema. Prem «+ Guarda al resum» a la capçalera dels apartats més importants per filtrar-los o exportar-los a PDF.';
        } else {
          emptyTxtEl.textContent = 'Cap apartat d\'aquest tema coincideix amb el filtre actual.';
        }
      } else {
        emptyMsgEl.hidden = true;
      }
    }
  }

  if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', function() {
      if (searchInp) searchInp.value = '';
      onlyFavs = false;
      updateFavCounter();
      filterSlides();
    });
  }

  function updateVistaUrl(mode) {
    try {
      var url = new URL(window.location.href);
      url.searchParams.set('vista', mode);
      if (mode === 'apunts') {
        url.hash = '';
      }
      window.history.replaceState(null, '', url.toString());
    } catch (e) {}
  }

  if (btnNotesView) {
    btnNotesView.addEventListener('click', function() {
      localStorage.setItem('udl_slide_notesview', '1');
      updateVistaUrl('apunts');
      applySlideState();
    });
  }
  if (btnSlidesView) {
    btnSlidesView.addEventListener('click', function() {
      localStorage.setItem('udl_slide_notesview', '0');
      updateVistaUrl('diapos');
      applySlideState();
    });
  }
  if (btnNoFrag) {
    btnNoFrag.addEventListener('click', function() {
      localStorage.setItem('udl_slide_nofrag', localStorage.getItem('udl_slide_nofrag') === '1' ? '0' : '1');
      applySlideState();
    });
  }
  if (btnSols) {
    btnSols.addEventListener('click', function() {
      hideSolutions = !hideSolutions;
      allSolBlocks.forEach(function(s) {
        s.classList.remove('udl-sol-revealed');
        var tb = s.querySelector('.udl-sol-toggle-btn');
        if (tb) tb.textContent = '🔑 Comprova la solució';
      });
      applySlideState();
    });
  }
  if (btnProfNotes) {
    btnProfNotes.addEventListener('click', function() {
      var cur = isProfNotesActive(root.classList.contains('udl-notes-html'));
      localStorage.setItem('udl_slide_profnotes', cur ? '0' : '1');
      applySlideState();
    });
  }
  if (btnRuler) {
    btnRuler.addEventListener('click', function() {
      var cur = localStorage.getItem('udl_ruler_mode') || (localStorage.getItem('udl_reading_ruler') === '1' ? 'line' : 'off');
      var next = cur === 'off' ? 'line' : (cur === 'line' ? 'mask' : 'off');
      localStorage.setItem('udl_ruler_mode', next);
      localStorage.setItem('udl_reading_ruler', next === 'off' ? '0' : '1');
      applySlideState();
    });
  }
  var rulerTicking = false, rulerLastY = 0;
  function placeRuler(y) {
    if (!rulerEl) return;
    var h = rulerEl.offsetHeight || 38;
    rulerEl.style.top = Math.max(0, y - h / 2) + 'px';
  }
  window.addEventListener('mousemove', function(e) {
    if (!root.classList.contains('udl-slide-ruler-on')) return;
    rulerLastY = e.clientY;
    if (!rulerTicking) {
      rulerTicking = true;
      requestAnimationFrame(function() { rulerTicking = false; placeRuler(rulerLastY); });
    }
  }, { passive: true });
  document.addEventListener('focusin', function(e) {
    if (!root.classList.contains('udl-slide-ruler-on') || !e.target || !e.target.getBoundingClientRect) return;
    if (prefsPanel && prefsPanel.contains(e.target)) return;
    var r = e.target.getBoundingClientRect();
    if (r.height === 0) return;
    placeRuler(r.top + Math.min(r.height, 60) / 2);
  });

  if (btnEasy) {
    btnEasy.addEventListener('click', function() {
      localStorage.setItem('udl_easy_read', localStorage.getItem('udl_easy_read') === '1' ? '0' : '1');
      applySlideState();
    });
  }
  function setFocusMode(on) {
    focusActive = !!on;
    applySlideState();
    if (liveEl) liveEl.textContent = on ? 'Mode concentració activat. Prem Escape per restaurar la vista normal.' : 'Vista normal restaurada.';
    if (on && focusExitBtn) focusExitBtn.focus();
    refreshTerminalPlayers();
  }
  if (btnFocus) {
    btnFocus.addEventListener('click', function() {
      closePrefs();
      setFocusMode(!focusActive);
    });
  }
  if (focusExitBtn) {
    focusExitBtn.addEventListener('click', function() { setFocusMode(false); });
  }
  if (btnDark) {
    btnDark.addEventListener('click', function() {
      var nextDark = !isDarkActive();
      localStorage.setItem('udl_slide_dark', nextDark ? '1' : '0');
      localStorage.setItem('quarto-color-scheme', nextDark ? 'alternate' : 'default');
      applySlideState();
    });
  }
  if (btnFavFilter) {
    btnFavFilter.addEventListener('click', function() {
      onlyFavs = !onlyFavs;
      updateFavCounter();
      filterSlides();
    });
  }
  var printSavedState = null;
  function prepareForPrint() {
    if (printSavedState) return;
    forceLoadAllMedia();
    closePrefs();
    printSavedState = {
      wasNotes: root.classList.contains('udl-notes-html'),
      wasDark: root.classList.contains('udl-slide-dark'),
      wasDocked: root.classList.contains('udl-has-docked-toc'),
      savedHref: window.location.href
    };
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch (e) {}
    root.classList.add('udl-notes-html');
    root.classList.remove('udl-slide-dark');
    root.classList.remove('udl-has-docked-toc');
    cleanInlineStylesForNotes();
  }
  function restoreAfterPrint() {
    if (!printSavedState) return;
    var st = printSavedState;
    printSavedState = null;
    try {
      if (st.savedHref) window.history.replaceState(null, '', st.savedHref);
    } catch (e) {}
    root.classList.toggle('udl-notes-html', st.wasNotes);
    root.classList.toggle('udl-slide-dark', st.wasDark);
    root.classList.toggle('udl-has-docked-toc', st.wasDocked);
    if (!st.wasNotes) {
      syncRevealWithMode();
    }
  }
  window.addEventListener('beforeprint', prepareForPrint);
  window.addEventListener('afterprint', restoreAfterPrint);
  if (btnPrint) {
    btnPrint.addEventListener('click', function() {
      prepareForPrint();
      setTimeout(function() {
        window.print();
        setTimeout(restoreAfterPrint, 300);
      }, 250);
    });
  }
  if (searchInp) {
    searchInp.addEventListener('input', filterSlides);
  }

  // --- Panell de preferències agrupat (en lloc de 14 botons solts a la barra)
  function closePrefs() {
    if (!prefsPanel || prefsPanel.hidden) return;
    prefsPanel.hidden = true;
    if (prefsBtn) prefsBtn.setAttribute('aria-expanded', 'false');
  }
  function openPrefs() {
    if (!prefsPanel) return;
    prefsPanel.hidden = false;
    if (prefsBtn) prefsBtn.setAttribute('aria-expanded', 'true');
    var first = prefsPanel.querySelector('button:not([style*="display: none"]), select');
    if (first) first.focus();
  }
  if (prefsBtn && prefsPanel) {
    prefsBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (prefsPanel.hidden) openPrefs(); else closePrefs();
    });
    document.addEventListener('click', function(e) {
      if (!prefsPanel.hidden && !prefsPanel.contains(e.target) && e.target !== prefsBtn) closePrefs();
    });
  }
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    if (focusActive) { setFocusMode(false); return; }
    if (prefsPanel && !prefsPanel.hidden) { closePrefs(); if (prefsBtn) prefsBtn.focus(); }
  });
  if (fontSel) {
    fontSel.addEventListener('change', function() {
      localStorage.setItem('udl_font', fontSel.value);
      applySlideState();
    });
  }

  // --- Lectura en veu alta del text seleccionat o de l'apartat / diapositiva actual
  (function() {
    if (!btnTts) return;
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      btnTts.style.display = 'none';
      return;
    }
    var token = 0, speaking = false;
    function currentReadText() {
      var sel = window.getSelection && window.getSelection().toString().trim();
      if (sel) return sel;
      var els = [];
      if (root.classList.contains('udl-notes-html')) {
        var curSec = null;
        studySections.forEach(function(s) {
          if (!s.el.classList.contains('udl-filter-hidden') && s.el.getBoundingClientRect().top <= 150) curSec = s;
        });
        if (!curSec && studySections.length) curSec = studySections[0];
        if (curSec) els = curSec.els || [curSec.el];
      } else if (window.Reveal && typeof window.Reveal.getCurrentSlide === 'function') {
        var curSlide = window.Reveal.getCurrentSlide();
        if (curSlide) els = [curSlide];
      }
      if (!els.length) return '';
      return els.map(function(el) {
        var c = el.cloneNode(true);
        c.querySelectorAll('pre, script, style, svg, button, input, .udl-sec-headbar, .udl-sol-practice-bar, .udl-sol-eval-bar, .ap-wrapper, .asciinema-player').forEach(function(n) { n.remove(); });
        if (!root.classList.contains('udl-show-notes')) c.querySelectorAll('aside.notes').forEach(function(n) { n.remove(); });
        return (c.textContent || '').replace(/\s+/g, ' ').trim();
      }).join(' ');
    }
    function chunks(text) {
      var parts = text.match(/[^.!?;:]+[.!?;:]?\s*/g) || [text];
      var out = [], cur = '';
      parts.forEach(function(p) {
        if ((cur + p).length > 220) { if (cur) out.push(cur); cur = p; } else cur += p;
      });
      if (cur) out.push(cur);
      return out;
    }
    function stopSpeech() {
      token++; speaking = false;
      window.speechSynthesis.cancel();
      btnTts.classList.remove('active');
      btnTts.setAttribute('aria-pressed', 'false');
      btnTts.textContent = 'Escolta l\'apartat';
    }
    btnTts.addEventListener('click', function() {
      if (speaking) { stopSpeech(); return; }
      var text = currentReadText();
      if (!text) return;
      var list = chunks(text), my = ++token, i = 0;
      var voice = (window.speechSynthesis.getVoices() || []).filter(function(v) { return /^ca/i.test(v.lang); })[0] || null;
      speaking = true;
      btnTts.classList.add('active');
      btnTts.setAttribute('aria-pressed', 'true');
      btnTts.textContent = 'Atura la lectura';
      if (!voice && liveEl) liveEl.textContent = 'No s\'ha trobat cap veu en català al dispositiu: es farà servir la veu per defecte.';
      (function next() {
        if (my !== token || i >= list.length) { if (my === token) stopSpeech(); return; }
        var u = new SpeechSynthesisUtterance(list[i++]);
        u.lang = 'ca-ES';
        if (voice) u.voice = voice;
        u.onend = next;
        u.onerror = function() { if (my === token) stopSpeech(); };
        window.speechSynthesis.speak(u);
      })();
    });
    window.addEventListener('beforeunload', function() { window.speechSynthesis.cancel(); });
  })();

  // --- Indicador de l'apartat actual al mode concentració
  window.addEventListener('scroll', function() {
    if (!focusActive || !focusWhere) return;
    var cur = null;
    studySections.forEach(function(s) {
      if (!s.el.classList.contains('udl-filter-hidden') && s.el.getBoundingClientRect().top <= 150) cur = s;
    });
    focusWhere.textContent = 'Mode concentració' + (cur ? ' · ' + cur.num + '. ' + cur.title : '');
  }, { passive: true });

  // --- L'alçada real de la barra pot canviar (pantalles estretes): el contingut se'n va ajustant
  function syncHeaderHeight() {
    var h = document.getElementById('udl-study-header');
    if (h) root.style.setProperty('--udl-header-h', h.offsetHeight + 'px');
  }
  window.addEventListener('resize', syncHeaderHeight);
  window.addEventListener('load', syncHeaderHeight);
  applySlideState();
  syncHeaderHeight();
})();
</script>
]]
    quarto.doc.include_text("after-body", slide_tools)
  end
  return doc
end
