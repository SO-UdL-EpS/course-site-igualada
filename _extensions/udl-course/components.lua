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
  -- Use a project-relative path (via quarto.project.offset), not a domain-
  -- absolute "/assets/..." path. Domain-absolute paths break whenever the
  -- rendered site is served from a subpath (e.g. a GitHub Pages project
  -- site, or an output-dir nested under the repo root) rather than the
  -- domain root, because the browser resolves a leading "/" against the
  -- domain, not the project. quarto.project.offset gives the correct
  -- relative distance from *this* document back to the project root, so
  -- the resulting href is correct no matter how deep the page is nested
  -- or what base path the site is deployed under.
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
        -- PDF/LaTeX: no raw HTML, no collapsibility (static medium) —
        -- a bold label paragraph prepended to the original content.
        local heading = pandoc.Para({ pandoc.Strong({ pandoc.Str(label_text(spec, title)) }) })
        el.content:insert(1, heading)
        return el
      end

      -- HTML: full treatment with the custom icon.
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

-- Filename header for fenced code blocks written as ```{.c filename="x.c"}
-- HTML gets a styled header bar; PDF gets a plain caption line (raw
-- HTML would otherwise vanish here too).
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
