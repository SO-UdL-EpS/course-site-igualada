#!/usr/bin/env python3
"""
Automated PDF & Bulk ZIP Generator for Sistemes Operatius (UdL).
Driven 100% by `data/course-catalog.json` (and `scripts/sync_course.py`) so adding
new blocks, subsections, or `.qmd` files automatically generates their PDFs,
packages their per-block ZIP archives, and publishes the unified catalog manifest.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import zipfile

from sync_course import sync_catalog, validate_catalog

ROOT = Path(__file__).resolve().parent.parent
LUA_FILTER = ROOT / "_extensions" / "udl-course" / "components.lua"


def human_size(num_bytes: int) -> str:
    if num_bytes < 1024:
        return f"{num_bytes} B"
    kb = num_bytes / 1024.0
    if kb < 1024:
        return f"{kb:.0f} KB"
    mb = kb / 1024.0
    return f"{mb:.1f} MB"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def flatten_catalog_items(catalog: dict) -> list[dict]:
    items = []
    for block in catalog.get("blocks", []):
        for sub in block.get("subsections", []):
            for it in sub.get("items", []):
                entry = dict(it)
                entry["bloc"] = block["id"]
                entry["blocNumber"] = block["number"]
                entry["blocTitle"] = block["title"]
                entry["blocShortTitle"] = block.get("shortTitle") or block["title"]
                entry["blocFolder"] = block["archiveFolder"]
                entry["subsectionId"] = sub["id"]
                entry["subsectionTitle"] = sub["title"]
                items.append(entry)
    return items


def find_binaries():
    pandoc = os.environ.get("PANDOC_BIN") or shutil.which("pandoc")
    typst = os.environ.get("TYPST_BIN") or shutil.which("typst")

    scratch_tools = Path(r"C:\Users\Usuario\.gemini\antigravity\brain\0b02c382-0cd2-45e3-851d-de404df9119e\scratch\quarto\q\bin\tools")
    if not pandoc and (scratch_tools / "pandoc.exe").exists():
        pandoc = str(scratch_tools / "pandoc.exe")
    if not typst and (scratch_tools / "x86_64" / "typst.exe").exists():
        typst = str(scratch_tools / "x86_64" / "typst.exe")

    quarto_bin = shutil.which("quarto")
    if quarto_bin:
        q_dir = Path(quarto_bin).resolve().parent / "tools"
        if not pandoc:
            for cand in [q_dir / "pandoc", q_dir / "pandoc.exe", q_dir / "x86_64" / "pandoc"]:
                if cand.exists():
                    pandoc = str(cand)
                    break
        if not typst:
            for cand in [q_dir / "typst", q_dir / "typst.exe", q_dir / "x86_64" / "typst", q_dir / "x86_64" / "typst.exe"]:
                if cand.exists():
                    typst = str(cand)
                    break

    if not pandoc or not typst:
        raise RuntimeError(f"Could not find pandoc ({pandoc}) or typst ({typst})")
    return pandoc, typst


def preprocess_qmd(raw_text: str, is_slide: bool) -> tuple[dict, str]:
    """Extract metadata and clean raw HTML/Asciinema/Mermaid blocks for Pandoc -> Typst."""
    meta = {"title": "", "subtitle": "", "author": "Jordi Mateo Fornés"}
    body = raw_text
    m = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n", raw_text, flags=re.DOTALL)
    if m:
        fm = m.group(1)
        body = raw_text[m.end():]
        for key in ("title", "subtitle", "author"):
            km = re.search(rf'^\s*{key}:\s*"?([^"\n]+)"?\s*$', fm, flags=re.MULTILINE)
            if km:
                meta[key] = km.group(1).strip()

    def repl_asciinema(match):
        script_body = match.group(0)
        cast_m = re.search(r"['\"]([^'\"]+\.cast)['\"]", script_body)
        cast_file = cast_m.group(1) if cast_m else "sessió interactiva"
        return f'\n::: {{.observacio title="Demostració de terminal interactiva"}}\nGravació Asciinema (`{cast_file}`) disponible de forma interactiva a la versió web d\'aquesta presentació.\n:::\n'

    body = re.sub(r"<script>.*?AsciinemaPlayer\.create.*?</script>", repl_asciinema, body, flags=re.DOTALL)
    body = re.sub(r"<script.*?</script>", "", body, flags=re.DOTALL)
    body = re.sub(r"<div[^>]*id=\"terminal[^\"]*\"[^>]*>\s*</div>", "", body)

    def repl_mermaid(match):
        m_code = match.group(1).strip()
        lines = []
        for ln in m_code.splitlines():
            s = ln.strip()
            if not s or s.startswith(("flowchart", "graph", "sequenceDiagram", "stateDiagram", "style ", "classDef ", "class ", "subgraph ", "direction ")):
                if s.startswith("subgraph "):
                    lines.append(f"• Secció: {s.replace('subgraph ', '')}")
                continue
            if s == "end":
                continue
            s = re.sub(r'\b[A-Za-z0-9_]+\s*\[\s*"?([^"\]]+)"?\s*\]', r"[\1]", s)
            s = re.sub(r'\b[A-Za-z0-9_]+\s*\(\s*"?([^"\)]+)"?\s*\)', r"(\1)", s)
            s = re.sub(r'\b[A-Za-z0-9_]+\s*\{\s*"?([^"\}]+)"?\s*\}', r"{\1}", s)
            s = s.replace("<br/>", " · ").replace("<br>", " · ").replace("<b>", "").replace("</b>", "").replace("<i>", "").replace("</i>", "").replace("-->", " ➔ ").replace("-.->", " ⇢ ")
            lines.append(f"  {s}")
        formatted = "\n".join(lines) if lines else m_code
        return f'\n::: {{.important title="Diagrama d\'arquitectura / flux"}}\n```text\n{formatted}\n```\n:::\n'

    body = re.sub(r"```\{mermaid[^\n]*\}\n(.*?)```", repl_mermaid, body, flags=re.DOTALL)
    body = re.sub(r"<br\s*/?>", " / ", body)
    body = re.sub(r"</?details[^>]*>", "\n", body)
    body = re.sub(r"<summary[^>]*>.*?</summary>", "", body, flags=re.DOTALL)

    return meta, body


def typst_escape_str(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def build_typst_wrapper(typst_body: str, item: dict, meta: dict) -> str:
    is_slide = item["kind"] == "slide"
    title = typst_escape_str(meta["title"] or item["title"])
    subtitle = typst_escape_str(meta["subtitle"] or f"Sistemes Operatius · {item['blocNumber']}")
    author = typst_escape_str(meta["author"] or "Jordi Mateo Fornés")
    bloc_label = typst_escape_str(item["blocFolder"].replace("-", " "))

    typst_body = typst_body.replace("#horizontalrule", "#line(length: 100%, stroke: 0.6pt + rgb(\"#cbd5e1\"))")

    if is_slide:
        header_tpl = f"""
#set page(
  paper: "presentation-16-9",
  margin: (top: 1.4cm, bottom: 1.2cm, left: 1.6cm, right: 1.6cm),
  header: context {{
    if here().page() > 1 {{
      grid(
        columns: (1fr, auto),
        align(left)[#text(size: 9pt, fill: rgb("#64748b"), weight: "bold")[#("Sistemes Operatius (UdL) · {title}")]],
        align(right)[#text(size: 9pt, fill: rgb("#820034"), weight: "bold")[#("{bloc_label}")]]
      )
      v(-4pt)
      line(length: 100%, stroke: 0.5pt + rgb("#cbd5e1"))
    }}
  }},
  footer: context {{
    if here().page() > 1 {{
      line(length: 100%, stroke: 0.4pt + rgb("#e2e8f0"))
      v(2pt)
      grid(
        columns: (1fr, auto),
        align(left)[#text(size: 8.5pt, fill: rgb("#64748b"))[Grau en Enginyeria Informàtica · Campus Igualada · {author}]],
        align(right)[#text(size: 8.5pt, fill: rgb("#141e2f"), weight: "bold")[Diapositiva #counter(page).display("1 / 1", both: true)]]
      )
    }}
  }}
)
#set text(font: ("Segoe UI", "Calibri", "Arial", "Liberation Sans"), size: 12.5pt, fill: rgb("#1e293b"), lang: "ca")
#set par(justify: false, leading: 0.62em)
#show heading.where(level: 1): it => {{
  pagebreak(weak: true)
  block(fill: rgb("#141e2f"), inset: 16pt, radius: 6pt, width: 100%, above: 12pt, below: 12pt)[
    #show raw: set text(fill: rgb("#141e2f"))
    #text(fill: white, weight: "bold", size: 20pt)[#it.body]
  ]
}}
#show heading.where(level: 2): it => {{
  pagebreak(weak: true)
  block(below: 8pt, width: 100%)[
    #text(fill: rgb("#141e2f"), weight: "bold", size: 16.5pt)[#it.body]
    #v(-4pt)
    #line(length: 100%, stroke: 1.5pt + rgb("#820034"))
  ]
}}
#show raw.where(block: true): set block(fill: rgb("#f8fafc"), stroke: 0.6pt + rgb("#cbd5e1"), inset: 9pt, radius: 5pt, width: 100%, breakable: true)
#show raw.where(block: false): box.with(fill: rgb("#f1f5f9"), inset: (x: 3pt, y: 0pt), outset: (y: 2pt), radius: 2pt)
#show link: set text(fill: rgb("#820034"))

// Title Slide
#block(
  fill: rgb("#141e2f"),
  inset: 28pt,
  radius: 10pt,
  width: 100%,
  height: 88%,
)[
  #text(fill: rgb("#f9d6e2"), size: 11pt, weight: "bold")[#("UNIVERSITAT DE LLEIDA · CAMPUS IGUALADA · {bloc_label}")]
  #v(12pt)
  #text(fill: white, size: 28pt, weight: "bold")[#("{title}")]
  #v(8pt)
  #text(fill: rgb("#cbd5e1"), size: 15pt)[#("{subtitle}")]
  #v(1fr)
  #line(length: 40%, stroke: 2pt + rgb("#820034"))
  #v(6pt)
  #text(fill: rgb("#e2e8f0"), size: 11pt)[#("Professor: {author} · Curs 2026–27 (Versió PDF per a estudi i impressió)")]
]
"""
        return header_tpl + "\n" + typst_body
    else:
        kind_badge = "PRALAB (LABORATORI GUIAT)" if item["kind"] == "pralab" else ("ACTIVITAT I EXERCICIS" if item["kind"] == "activitat" else "GUIA DEL CURS")
        header_tpl = f"""
#set page(
  paper: "a4",
  margin: (top: 2.2cm, bottom: 2.0cm, left: 2.0cm, right: 2.0cm),
  header: context {{
    if here().page() > 1 {{
      grid(
        columns: (1fr, auto),
        align(left)[#text(size: 8.5pt, fill: rgb("#64748b"))[#("Sistemes Operatius (UdL) · {title}")]],
        align(right)[#text(size: 8.5pt, fill: rgb("#820034"), weight: "bold")[#("{bloc_label}")]]
      )
      v(-4pt)
      line(length: 100%, stroke: 0.5pt + rgb("#cbd5e1"))
    }}
  }},
  footer: context {{
    line(length: 100%, stroke: 0.4pt + rgb("#e2e8f0"))
    v(3pt)
    grid(
      columns: (1fr, auto),
      align(left)[#text(size: 8.5pt, fill: rgb("#64748b"))[Universitat de Lleida · Grau en Enginyeria Informàtica (Campus Igualada)]],
      align(right)[#text(size: 8.5pt, fill: rgb("#141e2f"), weight: "bold")[Pàgina #counter(page).display("1 de 1", both: true)]]
    )
  }}
)
#set text(font: ("Segoe UI", "Calibri", "Arial", "Liberation Sans"), size: 10.5pt, fill: rgb("#1e293b"), lang: "ca")
#set par(justify: true, leading: 0.65em)
#set heading(numbering: "1.1.")
#show heading.where(level: 1): it => block(above: 18pt, below: 10pt)[
  #text(fill: rgb("#141e2f"), size: 15pt, weight: "bold")[#it]
  #v(-4pt)
  #line(length: 100%, stroke: 1.2pt + rgb("#820034"))
]
#show heading.where(level: 2): it => block(above: 14pt, below: 8pt)[
  #text(fill: rgb("#820034"), size: 12.5pt, weight: "bold")[#it]
]
#show raw.where(block: true): set block(fill: rgb("#f8fafc"), stroke: 0.6pt + rgb("#cbd5e1"), inset: 9pt, radius: 5pt, width: 100%, breakable: true)
#show raw.where(block: false): box.with(fill: rgb("#f1f5f9"), inset: (x: 3pt, y: 0pt), outset: (y: 2pt), radius: 2pt)
#show link: set text(fill: rgb("#820034"))

// Document Banner
#block(
  fill: rgb("#141e2f"),
  inset: 18pt,
  radius: 8pt,
  width: 100%,
)[
  #text(fill: rgb("#f9d6e2"), size: 9pt, weight: "bold")[#("UNIVERSITAT DE LLEIDA · SISTEMES OPERATIUS · {kind_badge}")]
  #v(6pt)
  #text(fill: white, size: 18pt, weight: "bold")[#("{title}")]
  #v(4pt)
  #text(fill: rgb("#cbd5e1"), size: 10.5pt)[#("{subtitle} · Professor: {author}")]
]
#v(8pt)
#block(
  fill: rgb("#f8fafc"),
  stroke: 0.6pt + rgb("#cbd5e1"),
  inset: 12pt,
  radius: 6pt,
  width: 100%,
)[
  #outline(title: text(size: 11pt, weight: "bold", fill: rgb("#141e2f"))[Índex de continguts], indent: 1.2em, depth: 2)
]
#v(10pt)
"""
        return header_tpl + "\n" + typst_body


def compile_item_pdf(item: dict, pdf_out_dir: Path, pandoc_bin: str, typst_bin: str, force: bool = False) -> dict:
    qmd_path = ROOT / item["qmd"]
    qmd_dir = qmd_path.parent
    out_pdf = pdf_out_dir / item["pdf"]

    # Reuse existing compiled PDF if up-to-date and not forced
    if not force and out_pdf.exists() and out_pdf.stat().st_size > 1000:
        if out_pdf.stat().st_mtime >= qmd_path.stat().st_mtime:
            size_bytes = out_pdf.stat().st_size
            return {
                "id": item["id"],
                "bloc": item["bloc"],
                "subsection": item["subsectionId"],
                "code": item["code"],
                "kind": item["kind"],
                "typeLabel": item["typeLabel"],
                "title": item["title"],
                "subtitle": item["subtitle"],
                "href": item["href"],
                "pdf": item["pdf"],
                "pdfHref": f"downloads/pdf/{item['pdf']}",
                "sizeBytes": size_bytes,
                "sizeHuman": human_size(size_bytes),
                "sha256": sha256_file(out_pdf),
                "cached": True,
            }

    raw_qmd = qmd_path.read_text(encoding="utf-8")
    is_slide = item["kind"] == "slide"
    meta, cleaned_md = preprocess_qmd(raw_qmd, is_slide=is_slide)

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        md_file = tmp_path / "input.md"
        body_typ = tmp_path / "body.typ"
        md_file.write_text(cleaned_md, encoding="utf-8")

        cmd_pandoc = [
            pandoc_bin,
            str(md_file),
            "--from",
            "markdown+yaml_metadata_block+fenced_divs+bracketed_spans+backtick_code_blocks+pipe_tables+tex_math_dollars+raw_html",
            "--to",
            "typst",
            "--lua-filter",
            str(LUA_FILTER),
            "--output",
            str(body_typ),
        ]
        if not is_slide:
            cmd_pandoc.extend(["--shift-heading-level-by=-1"])

        res_p = subprocess.run(cmd_pandoc, cwd=str(qmd_dir), capture_output=True, text=True)
        if res_p.returncode != 0:
            raise RuntimeError(f"Pandoc failed for {item['qmd']}:\n{res_p.stderr}")

        typst_body = body_typ.read_text(encoding="utf-8")
        full_typst = build_typst_wrapper(typst_body, item, meta)

        temp_typ_in_qmd = qmd_dir / f".tmp_{item['id']}.typ"
        try:
            temp_typ_in_qmd.write_text(full_typst, encoding="utf-8")
            cmd_typst = [
                typst_bin,
                "compile",
                "--root",
                str(ROOT),
                str(temp_typ_in_qmd),
                str(out_pdf),
            ]
            res_t = subprocess.run(cmd_typst, cwd=str(qmd_dir), capture_output=True, text=True)
            if res_t.returncode != 0:
                raise RuntimeError(f"Typst failed for {item['qmd']}:\n{res_t.stderr}")
        finally:
            if temp_typ_in_qmd.exists():
                temp_typ_in_qmd.unlink()

    size_bytes = out_pdf.stat().st_size
    return {
        "id": item["id"],
        "bloc": item["bloc"],
        "subsection": item["subsectionId"],
        "code": item["code"],
        "kind": item["kind"],
        "typeLabel": item["typeLabel"],
        "title": item["title"],
        "subtitle": item["subtitle"],
        "href": item["href"],
        "pdf": item["pdf"],
        "pdfHref": f"downloads/pdf/{item['pdf']}",
        "sizeBytes": size_bytes,
        "sizeHuman": human_size(size_bytes),
        "sha256": sha256_file(out_pdf),
        "cached": False,
    }


def build_zip_bundles(catalog: dict, flat_items: list[dict], downloads_dir: Path, pdf_out_dir: Path) -> list[dict]:
    xlsx_src = ROOT / "blocs" / "03-sched" / "activitats" / "src" / "template.xlsx"

    slides_count = sum(1 for it in flat_items if it["kind"] == "slide")
    labs_count = sum(1 for it in flat_items if it["kind"] in ("pralab", "activitat", "guide"))

    bundles_spec = [
        {
            "id": "zip-all",
            "alias": "all",
            "filename": "SO-Curs-Complet-PDFs.zip",
            "title": f"Curs complet — Tots els materials ({len(flat_items)} PDFs + Plantilla .xlsx)",
            "filter": lambda it: True,
            "include_xlsx": True,
            "use_subfolders": True,
        },
        {
            "id": "zip-slides",
            "alias": "teoria",
            "filename": "SO-Totes-les-Presentacions-PDFs.zip",
            "title": f"Totes les presentacions de teoria ({slides_count} PDFs)",
            "filter": lambda it: it["kind"] == "slide",
            "include_xlsx": False,
            "use_subfolders": True,
        },
        {
            "id": "zip-labs",
            "alias": "practica",
            "filename": "SO-Tots-els-Pralabs-i-Activitats-PDFs.zip",
            "title": f"Tots els pralabs, activitats i guies ({labs_count} PDFs + Plantilla .xlsx)",
            "filter": lambda it: it["kind"] in ("pralab", "activitat", "guide"),
            "include_xlsx": True,
            "use_subfolders": True,
        },
    ]

    # Dynamically add a ZIP bundle for every thematic block (excluding "00" Informació General)
    for block in catalog.get("blocks", []):
        if block["id"] == "00":
            continue
        b_id = block["id"]
        b_items = [it for it in flat_items if it["bloc"] == b_id]
        has_xlsx = any(it.get("extraDownload") for it in b_items)
        bundles_spec.append({
            "id": block["zipId"],
            "alias": f"bloc-{int(b_id) if b_id.isdigit() else b_id}",
            "filename": block["zipFilename"],
            "title": f"{block['number']} · {block['title']} ({len(b_items)} PDFs)",
            "filter": (lambda target_b: (lambda it: it["bloc"] == target_b))(b_id),
            "include_xlsx": has_xlsx,
            "use_subfolders": False,
        })

    bundle_manifests = []
    for spec in bundles_spec:
        zip_path = downloads_dir / spec["filename"]
        matched = [it for it in flat_items if spec["filter"](it)]
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            for it in matched:
                src_pdf = pdf_out_dir / it["pdf"]
                arcname = f"{it['blocFolder']}/{it['pdf']}" if spec["use_subfolders"] else it["pdf"]
                zf.write(src_pdf, arcname=arcname)
            if spec["include_xlsx"] and xlsx_src.exists():
                arc_xlsx = "Bloc-3-Planificacio/SO-Bloc3-Plantilla-Planificacio.xlsx" if spec["use_subfolders"] else "SO-Bloc3-Plantilla-Planificacio.xlsx"
                zf.write(xlsx_src, arcname=arc_xlsx)

        sz = zip_path.stat().st_size
        bundle_manifests.append({
            "id": spec["id"],
            "alias": spec["alias"],
            "filename": spec["filename"],
            "href": f"downloads/{spec['filename']}",
            "title": spec["title"],
            "fileCount": len(matched) + (1 if spec["include_xlsx"] else 0),
            "sizeBytes": sz,
            "sizeHuman": human_size(sz),
            "sha256": sha256_file(zip_path),
        })

    return bundle_manifests


def main():
    parser = argparse.ArgumentParser(description="Build all course PDFs and ZIP bundles from data/course-catalog.json.")
    parser.add_argument("--docs-dir", default="docs", help="Output docs directory (default: docs)")
    parser.add_argument("--force", action="store_true", help="Force recompile all PDFs even if cached")
    args = parser.parse_args()

    catalog, sync_notes = sync_catalog(write_changes=True)
    for note in sync_notes:
        print(f"[AUTO-SYNC] {note}")
    val_errors = validate_catalog(catalog)
    if val_errors:
        raise RuntimeError("Catalog validation errors:\n" + "\n".join(val_errors))

    flat_items = flatten_catalog_items(catalog)

    docs_dir = (ROOT / args.docs_dir).resolve()
    downloads_dir = docs_dir / "downloads"
    pdf_out_dir = downloads_dir / "pdf"
    pdf_out_dir.mkdir(parents=True, exist_ok=True)

    pandoc_bin, typst_bin = find_binaries()
    print(f"Using pandoc: {pandoc_bin}")
    print(f"Using typst:  {typst_bin}")

    items_manifest = {}
    for idx, item in enumerate(flat_items, 1):
        info = compile_item_pdf(item, pdf_out_dir, pandoc_bin, typst_bin, force=args.force)
        items_manifest[item["id"]] = info
        tag = "CACHED" if info.get("cached") else "BUILT "
        print(f"[{idx:02d}/{len(flat_items):02d}] {tag} {info['pdf']} ({info['sizeHuman']})")

    # Prune orphaned PDFs and rendered bloc HTMLs whose source .qmd was removed
    expected_pdfs = {it["pdf"] for it in flat_items}
    for old_pdf in pdf_out_dir.glob("*.pdf"):
        if old_pdf.name not in expected_pdfs:
            old_pdf.unlink()
            print(f"[CLEAN] Removed orphaned PDF: {old_pdf.name}")

    docs_blocs = docs_dir / "blocs"
    if docs_blocs.exists():
        for html_f in docs_blocs.rglob("*.html"):
            rel_no_ext = html_f.relative_to(docs_dir).with_suffix(".qmd")
            if not (ROOT / rel_no_ext).exists():
                html_f.unlink()
                print(f"[CLEAN] Removed orphaned HTML: {html_f.relative_to(docs_dir)}")

    bundles_manifest = build_zip_bundles(catalog, flat_items, downloads_dir, pdf_out_dir)
    for b in bundles_manifest:
        print(f"[ZIP] Built {b['filename']} ({b['fileCount']} files, {b['sizeHuman']})")

    bundles_dict = {}
    for b in bundles_manifest:
        bundles_dict[b["id"]] = b
        if b.get("alias"):
            bundles_dict[b["alias"]] = b

    # Enrich catalog blocks with live PDF/ZIP size metadata and write both manifest.json and course-catalog.json
    enriched_catalog = json.loads(json.dumps(catalog))
    for block in enriched_catalog.get("blocks", []):
        zinfo = bundles_dict.get(block.get("zipId"))
        if zinfo:
            block["zipSizeHuman"] = zinfo["sizeHuman"]
            block["zipHref"] = zinfo["href"]
        for sub in block.get("subsections", []):
            for it in sub.get("items", []):
                minfo = items_manifest.get(it["id"])
                if minfo:
                    it["pdfHref"] = minfo["pdfHref"]
                    it["sizeBytes"] = minfo["sizeBytes"]
                    it["sizeHuman"] = minfo["sizeHuman"]

    manifest_data = {
        "schemaVersion": 3,
        "course": enriched_catalog["course"],
        "activeAcademicYear": enriched_catalog.get("activeAcademicYear", "2026–2027"),
        "academicYears": enriched_catalog.get("academicYears", []),
        "evaluation": enriched_catalog["evaluation"],
        "blocks": enriched_catalog["blocks"],
        "totalPdfs": len(items_manifest),
        "totalBundles": len(bundles_manifest),
        "items": items_manifest,
        "bundles": bundles_dict,
    }
    manifest_path = downloads_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest_data, indent=2, ensure_ascii=False), encoding="utf-8")
    catalog_out_path = downloads_dir / "course-catalog.json"
    catalog_out_path.write_text(json.dumps(enriched_catalog, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote manifest to {manifest_path} and catalog to {catalog_out_path}")

    # Generate split, on-demand JSON payloads under docs/downloads/data/ (Section 11.1 & 11.2)
    data_out_dir = downloads_dir / "data"
    data_out_dir.mkdir(parents=True, exist_ok=True)
    blocks_overview = []
    for block in enriched_catalog.get("blocks", []):
        block_file = data_out_dir / f"block-{block['id']}.json"
        block_file.write_text(json.dumps(block, indent=2, ensure_ascii=False), encoding="utf-8")
        blocks_overview.append({
            "id": block["id"],
            "slug": block.get("slug", ""),
            "number": block["number"],
            "title": block["title"],
            "shortTitle": block.get("shortTitle", block["title"]),
            "description": block.get("description", ""),
            "zipId": block.get("zipId"),
            "zipFilename": block.get("zipFilename"),
            "zipSizeHuman": block.get("zipSizeHuman"),
            "subsections": [
                {
                    "id": sub["id"],
                    "title": sub["title"],
                    "description": sub.get("description", ""),
                    "itemCount": len(sub.get("items", [])),
                }
                for sub in block.get("subsections", [])
            ],
        })
    (data_out_dir / "blocks-overview.json").write_text(
        json.dumps({"blocks": blocks_overview, "bundles": bundles_dict}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    (data_out_dir / "academic-years.json").write_text(
        json.dumps(
            {
                "activeAcademicYear": enriched_catalog.get("activeAcademicYear", "2026–2027"),
                "academicYears": enriched_catalog.get("academicYears", []),
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    # Copy PROFESSOR_GUIDE.md and DEVELOPER_GUIDE.md from documentation/ to docs/
    doc_src_dir = ROOT / "documentation"
    for guide_name in ("PROFESSOR_GUIDE.md", "DEVELOPER_GUIDE.md"):
        src_guide = doc_src_dir / guide_name
        if src_guide.exists():
            dst_guide = docs_dir / guide_name
            dst_guide.write_text(src_guide.read_text(encoding="utf-8"), encoding="utf-8")
            print(f"[GUIDE] Copied {guide_name} to {dst_guide}")

    # Ensure latest JS assets in assets/js/ are synced to docs/assets/js/
    js_src_dir = ROOT / "assets" / "js"
    js_dst_dir = docs_dir / "assets" / "js"
    js_dst_dir.mkdir(parents=True, exist_ok=True)
    for js_name in ("course-ui.js", "grade-engine.js"):
        src_js = js_src_dir / js_name
        if src_js.exists():
            (js_dst_dir / js_name).write_text(src_js.read_text(encoding="utf-8"), encoding="utf-8")

    # Synchronize compiled Bootstrap CSS hash, floating navbar header, and minimalist footer
    # from docs/index.html across all nested HTML document pages in docs/blocs/ and docs/course-info/
    sync_nested_html_chrome(docs_dir)


def sync_nested_html_chrome(docs_dir: Path):
    index_path = docs_dir / "index.html"
    if not index_path.exists():
        return
    index_html = index_path.read_text(encoding="utf-8")

    # Extract light and dark compiled bootstrap CSS filenames from index.html
    m_light = re.search(r'site_libs/bootstrap/(bootstrap-[a-f0-9]+\.min\.css)', index_html)
    m_dark = re.search(r'site_libs/bootstrap/(bootstrap-dark-[a-f0-9]+\.min\.css)', index_html)
    m_header = re.search(r'(<header id="quarto-header"[^>]*>.*?</header>)', index_html, flags=re.DOTALL)
    m_footer = re.search(r'(<footer class="footer">.*?</footer>)', index_html, flags=re.DOTALL)

    if not (m_light and m_header and m_footer):
        return

    light_css = m_light.group(1)
    dark_css = m_dark.group(1) if m_dark else None
    canon_header = m_header.group(1).replace(' data-bs-theme="dark"', '')
    canon_footer = m_footer.group(1)

    # Also strip data-bs-theme="dark" from the 4 top-level pages
    for top_name in ("index.html", "materials.html", "calculadora.html", "guia.html"):
        tp = docs_dir / top_name
        if tp.exists():
            t_txt = tp.read_text(encoding="utf-8")
            if ' data-bs-theme="dark"' in t_txt:
                tp.write_text(t_txt.replace(' data-bs-theme="dark"', ''), encoding="utf-8")

    synced_count = 0
    for hf in sorted(docs_dir.rglob("*.html")):
        if "site_libs" in hf.relative_to(docs_dir).parts:
            continue
        if hf.name in ("index.html", "materials.html", "calculadora.html", "guia.html"):
            continue
        txt = hf.read_text(encoding="utf-8")
        if '<header id="quarto-header"' not in txt:
            continue

        # Determine relative offset to site root from <meta name="quarto:offset" content="...">
        m_off = re.search(r'<meta name="quarto:offset" content="([^"]+)"', txt)
        offset = m_off.group(1) if m_off else "./"
        if not offset.endswith("/"):
            offset += "/"

        # Rewrite relative ./ links in canonical header & footer to use the nested page's offset
        page_header = canon_header.replace('href="./', f'href="{offset}')
        # Remove aria-current="page" and active class from Inici on nested material pages,
        # and mark Materials as active
        page_header = page_header.replace('class="nav-link active" href="' + offset + 'index.html" aria-current="page"', 'class="nav-link" href="' + offset + 'index.html"')
        page_header = page_header.replace('class="nav-link" href="' + offset + 'materials.html"', 'class="nav-link active" href="' + offset + 'materials.html" aria-current="page"')

        page_footer = canon_footer.replace('href="./', f'href="{offset}')

        new_txt = re.sub(r'site_libs/bootstrap/bootstrap-[a-f0-9]+\.min\.css', f'site_libs/bootstrap/{light_css}', txt)
        if dark_css:
            new_txt = re.sub(r'site_libs/bootstrap/bootstrap-dark-[a-f0-9]+\.min\.css', f'site_libs/bootstrap/{dark_css}', new_txt)
        new_txt = re.sub(r'<header id="quarto-header"[^>]*>.*?</header>', lambda _: page_header, new_txt, flags=re.DOTALL)
        new_txt = re.sub(r'<footer class="footer">.*?</footer>', lambda _: page_footer, new_txt, flags=re.DOTALL)

        if new_txt != txt:
            hf.write_text(new_txt, encoding="utf-8")
            synced_count += 1

    # Prune any stale hashed bootstrap CSS files left behind by partial renders
    active_css = {c for c in (light_css, dark_css) if c}
    bs_dir = docs_dir / "site_libs" / "bootstrap"
    if bs_dir.exists():
        for old_css in bs_dir.glob("bootstrap*.min.css"):
            if old_css.name not in active_css:
                old_css.unlink()

    print(f"[SYNC-CHROME] Synchronized CSS ({light_css}), floating navbar, and footer across {synced_count} nested HTML pages.")


if __name__ == "__main__":
    main()
