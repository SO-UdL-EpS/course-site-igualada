-- UDL Course Components
-- Semantic teaching components for engineering courses.
--
-- Usage in a .qmd file:
--
--   ::: {.definicio title="Procés"}
--   Un procés és una instància en execució d'un programa.
--   :::
--
-- Format-aware filter:
--   * HTML / RevealJS: emits semantic Div / <details> with SVG sprite icons.
--   * Typst: emits native styled #block(...) callouts with brand accent
--     borders and tinted backgrounds so pre-built PDFs match the web look.
--   * LaTeX / PDF: emits a Pandoc Div with a bold label heading.

local components = {
  objectius     = { label = "Objectius d'Aprenentatge", icon = "objectius",    stroke = "#0f766e", fill = "#f0fdfa" },
  prerequisits  = { label = "Prerequisits",              icon = "prerequisits", stroke = "#0f766e", fill = "#f0fdfa" },
  resultat      = { label = "Resultat d'Aprenentatge",   icon = "resultat",     stroke = "#0f766e", fill = "#f0fdfa" },
  definicio     = { label = "Definició",                 icon = "definicio",    stroke = "#254367", fill = "#f3f6fa" },
  concepte      = { label = "Concepte",                  icon = "concepte",     stroke = "#254367", fill = "#f3f6fa" },
  exemple       = { label = "Exemple",                   icon = "exemple",      stroke = "#254367", fill = "#f3f6fa" },
  laboratori    = { label = "Laboratori (Lab)",          icon = "laboratori",   stroke = "#7a2648", fill = "#fdf4f7" },
  exercici      = { label = "Exercici",                  icon = "exercici",     stroke = "#7a2648", fill = "#fdf4f7" },
  exerciciprog  = { label = "Exercici de Programació",   icon = "exerciciprog", stroke = "#7a2648", fill = "#fdf4f7" },
  repte         = { label = "Repte",                     icon = "repte",        stroke = "#6b46c1", fill = "#f7f4fd" },
  reflexio      = { label = "Reflexió",                  icon = "reflexio",     stroke = "#0f766e", fill = "#f0fdfa" },
  examtip       = { label = "Pista d'Examen",            icon = "examtip",      stroke = "#b78900", fill = "#fefce8" },
  pista         = { label = "Pista",                     icon = "examtip",      stroke = "#b78900", fill = "#fefce8" },
  errorcomu     = { label = "Error Comú",                icon = "errorcomu",    stroke = "#c0392b", fill = "#fef2f2" },
  bonapractica  = { label = "Bona Pràctica",             icon = "bonapractica", stroke = "#2e7d32", fill = "#f1f9f2" },
  solucio       = { label = "Solució",                   icon = "solucio",      stroke = "#2e7d32", fill = "#f1f9f2" },
  resum         = { label = "Resum",                     icon = "resum",        stroke = "#0f766e", fill = "#f0fdfa" },
  lectures      = { label = "Lectura Addicional",        icon = "lectures",     stroke = "#0f766e", fill = "#f0fdfa" },
  programari    = { label = "Programari Necessari",      icon = "programari",   stroke = "#6b46c1", fill = "#f7f4fd" },
  lliurament    = { label = "Lliurament",                icon = "lliurament",   stroke = "#6b46c1", fill = "#f7f4fd" },
  rubrica       = { label = "Rúbrica",                   icon = "rubrica",      stroke = "#6b46c1", fill = "#f7f4fd" },
  observacio    = { label = "Observació",                icon = "concepte",     stroke = "#254367", fill = "#f3f6fa" },
  important     = { label = "Important",                 icon = "examtip",      stroke = "#820034", fill = "#fdf4f7" },
}

local function is_typst()
  if quarto and quarto.doc and quarto.doc.is_format and quarto.doc.is_format("typst") then
    return true
  end
  return FORMAT and FORMAT:match("typst") ~= nil
end

local function is_latex_pdf()
  if quarto and quarto.doc and quarto.doc.is_format then
    if quarto.doc.is_format("pdf") or quarto.doc.is_format("latex") then
      return not is_typst()
    end
  end
  return FORMAT and (FORMAT:match("latex") ~= nil or FORMAT:match("beamer") ~= nil)
end

local function icon_svg(name)
  local offset = (quarto and quarto.project and quarto.project.offset) or "."
  return '<svg class="udl-icon" aria-hidden="true"><use href="' .. offset .. '/assets/icons.svg#icon-' .. name .. '"></use></svg>'
end

local function label_text(spec, title)
  local t = spec.label
  if title and title ~= "" then t = t .. " — " .. title end
  return t
end

local function typst_escape_string(s)
  return (s:gsub("\\", "\\\\"):gsub('"', '\\"'))
end

function Div(el)
  for key, spec in pairs(components) do
    if el.classes:includes(key) then
      local title = el.attributes["title"]
      local lbl = label_text(spec, title)

      if is_typst() then
        local open_typ = pandoc.RawBlock("typst", string.format(
          '#block(width: 100%%, fill: rgb("%s"), stroke: (left: 3.5pt + rgb("%s")), inset: (x: 11pt, y: 9pt), radius: (right: 4pt), breakable: true)[\n#text(fill: rgb("%s"), weight: "bold")[#("%s")]\n#v(3pt)\n',
          spec.fill, spec.stroke, spec.stroke, typst_escape_string(lbl)
        ))
        local close_typ = pandoc.RawBlock("typst", "\n]")
        local blocks = pandoc.Blocks({ open_typ })
        for _, b in ipairs(el.content) do blocks:insert(b) end
        blocks:insert(close_typ)
        return blocks
      end

      if is_latex_pdf() then
        local heading = pandoc.Para({ pandoc.Strong({ pandoc.Str(lbl) }) })
        el.content:insert(1, heading)
        return el
      end

      -- HTML / RevealJS: full treatment with the custom SVG icon.
      local heading_html = icon_svg(spec.icon) .. '<span>' .. lbl .. '</span>'

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

  -- Multi-column layout support for Typst slide/document exports
  if is_typst() and el.classes:includes("columns") then
    local cols = {}
    for _, child in ipairs(el.content) do
      if child.t == "Div" and child.classes:includes("column") then
        table.insert(cols, child)
      end
    end
    if #cols >= 2 then
      local widths = {}
      for _, c in ipairs(cols) do
        local w = c.attributes["width"]
        if w and w:match("^%d+%%$") then
          local fr = w:gsub("%%", "fr")
          table.insert(widths, fr)
        else
          table.insert(widths, "1fr")
        end
      end
      local blocks = pandoc.Blocks({
        pandoc.RawBlock("typst", "#grid(columns: (" .. table.concat(widths, ", ") .. "), column-gutter: 14pt,\n")
      })
      for i, c in ipairs(cols) do
        blocks:insert(pandoc.RawBlock("typst", "[\n"))
        for _, cb in ipairs(c.content) do blocks:insert(cb) end
        blocks:insert(pandoc.RawBlock("typst", i < #cols and "\n],\n" or "\n]\n"))
      end
      blocks:insert(pandoc.RawBlock("typst", ")\n"))
      return blocks
    end
  end

  return el
end

function Para(el)
  -- Strip raw HTML <summary>...</summary> lines when exporting to Typst/LaTeX
  -- because the inner .solucio block already supplies the "Solució" header.
  if is_typst() or is_latex_pdf() then
    if #el.content >= 1 and el.content[1].t == "RawInline" and el.content[1].text:match("^<summary") then
      return {}
    end
  end
  return el
end

function Image(el)
  local alt = el.attributes["alt"] or el.attributes["fig-alt"]
  if not alt or alt == "" then
    local cap = pandoc.utils.stringify(el.caption)
    if cap and cap ~= "" then
      alt = cap
      if cap:match("^Il·lustració") or cap:match("^Esquema") or cap:match("^Diagrama") then
        el.caption = {}
      end
    else
      local stem = (el.src or "diagrama"):match("([^/\\]+)%.%w+$") or "diagrama"
      alt = "Il·lustració sobre " .. stem:gsub("[_%-]", " ")
    end
    el.attributes["alt"] = alt
    el.attributes["fig-alt"] = alt
  end
  return el
end

function Figure(el)
  local cap = pandoc.utils.stringify(el.caption)
  el = el:walk({
    Image = function(img)
      local alt = img.attributes["alt"] or img.attributes["fig-alt"]
      if not alt or alt == "" then
        local stem = (img.src or "diagrama"):match("([^/\\]+)%.%w+$") or "diagrama"
        local text = (cap and cap ~= "") and cap or ("Il·lustració sobre " .. stem:gsub("[_%-]", " "))
        img.attributes["alt"] = text
        img.attributes["fig-alt"] = text
      end
      return img
    end
  })
  if cap:match("^Il·lustració") or cap:match("^Esquema") or cap:match("^Diagrama") then
    el.caption = pandoc.Caption({})
  end
  return el
end

-- Filename header for fenced code blocks written as ```{.c filename="x.c"}
function CodeBlock(el)
  local filename = el.attributes["filename"]
  if filename and filename ~= "" then
    if is_typst() then
      local hdr = pandoc.RawBlock("typst", string.format(
        '#block(width: 100%%, fill: rgb("#e8ecf2"), inset: (x: 8pt, y: 5pt), radius: (top: 4pt), below: 0pt)[#text(font: "Consolas", size: 8.5pt, weight: "bold", fill: rgb("#254367"))[#("%s")]]',
        typst_escape_string(filename)
      ))
      return { hdr, el }
    end
    if is_latex_pdf() then
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

function Pandoc(doc)
  if not is_typst() and not is_latex_pdf() then
    local offset = (quarto and quarto.project and quarto.project.offset) or "."
    doc.blocks:insert(pandoc.RawBlock("html",
      '<script src="' .. offset .. '/assets/js/course-ui.js" defer></script>'
    ))
  end
  return doc
end
