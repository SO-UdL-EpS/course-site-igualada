#!/usr/bin/env python3
"""
Professor Content Management & Auto-Discovery Tool (`scripts/sync_course.py`)
for Sistemes Operatius (Universitat de Lleida).

Usage:
  python scripts/sync_course.py status
      Show a complete summary of all blocks, subsections, and materials.

  python scripts/sync_course.py sync
      Auto-discover any new blocks (`blocs/NN-slug/`), subsections (`teoria`,
      `pralabs`, `activitats`), or `.qmd` files added to `blocs/`, extract their
      YAML front-matter metadata, register them in `data/course-catalog.json`,
      and validate all file paths.

  python scripts/sync_course.py add-block --id 08 --slug 08-fs --title "Sistemes de Fitxers" --description "Inodes, VFS i emmagatzematge."
      Scaffold a new thematic block directory (`blocs/08-fs/{teoria,pralabs,activitats}`)
      with a starter template and register it in `data/course-catalog.json`.

  python scripts/sync_course.py validate
      Validate that every item in `data/course-catalog.json` points to an existing
      `.qmd` file and has unique IDs and PDF filenames.
"""

import argparse
import json
from pathlib import Path
import re
import sys
import unicodedata

ROOT = Path(__file__).resolve().parent.parent
CATALOG_PATH = ROOT / "data" / "course-catalog.json"

SUBSECTION_META = {
    "teoria": {
        "title": "Teoria",
        "kind": "slide",
        "typeLabel": "Presentació",
        "codePrefix": "T",
        "description": "Presentacions de teoria del bloc.",
    },
    "pralabs": {
        "title": "Pralabs",
        "kind": "pralab",
        "typeLabel": "Laboratori",
        "codePrefix": "Pralab ",
        "description": "Guions de laboratori pràctic guiats.",
    },
    "activitats": {
        "title": "Activitats",
        "kind": "activitat",
        "typeLabel": "Activitat",
        "codePrefix": "Act ",
        "description": "Exercicis i problemes pràctics de consolidació.",
    },
}


def slugify_ascii(text: str) -> str:
    norm = unicodedata.normalize("NFKD", text)
    ascii_str = norm.encode("ascii", "ignore").decode("ascii")
    cleaned = re.sub(r"[^A-Za-z0-9]+", "-", ascii_str).strip("-")
    return cleaned or "Material"


def parse_qmd_frontmatter(qmd_path: Path) -> dict:
    raw = qmd_path.read_text(encoding="utf-8")
    meta = {"title": qmd_path.stem.replace("_", " ").replace("-", " ").title(), "subtitle": ""}
    m = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n", raw, flags=re.DOTALL)
    if m:
        fm = m.group(1)
        for key in ("title", "subtitle", "description"):
            km = re.search(rf'^\s*{key}:\s*"?([^"\r\n]+)"?\s*$', fm, flags=re.MULTILINE)
            if km:
                meta[key] = km.group(1).strip()
        if "revealjs" in fm:
            meta["is_slide"] = True
    return meta


def load_catalog() -> dict:
    if not CATALOG_PATH.exists():
        raise FileNotFoundError(f"Catalog file not found: {CATALOG_PATH}")
    return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))


def save_catalog(catalog: dict) -> None:
    CATALOG_PATH.write_text(
        json.dumps(catalog, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def sync_catalog(write_changes: bool = True) -> tuple[dict, list[str]]:
    catalog = load_catalog()
    notes = []

    known_qmdds = set()
    blocks_by_slug = {}
    for b in catalog.get("blocks", []):
        blocks_by_slug[b["slug"]] = b
        for sub in b.get("subsections", []):
            for it in sub.get("items", []):
                known_qmdds.add(it["qmd"].replace("\\", "/"))

    blocs_dir = ROOT / "blocs"
    if blocs_dir.exists():
        for folder in sorted(blocs_dir.iterdir()):
            if not folder.is_dir() or folder.name.startswith("."):
                continue
            slug = folder.name
            m_num = re.match(r"^(\d+)[-_](.+)$", slug)
            bloc_id = m_num.group(1).zfill(2) if m_num else slug[:2]
            short_slug = m_num.group(2).replace("-", " ").title() if m_num else slug.title()

            if slug not in blocks_by_slug:
                num_int = int(bloc_id) if bloc_id.isdigit() else bloc_id
                archive_folder = f"Bloc-{num_int}-{slugify_ascii(short_slug)}"
                zip_filename = f"SO-{archive_folder}-PDFs.zip"
                new_block = {
                    "id": bloc_id,
                    "slug": slug,
                    "archiveFolder": archive_folder,
                    "number": f"Bloc {num_int}",
                    "title": short_slug,
                    "shortTitle": short_slug,
                    "description": f"Materials docents de {short_slug}.",
                    "zipId": f"zip-bloc{num_int}",
                    "zipFilename": zip_filename,
                    "subsections": [],
                }
                # Insert before Informació General ("00") so numbered blocks stay ordered
                blocks = catalog.get("blocks", [])
                info_blocks = [x for x in blocks if x["id"] == "00"]
                num_blocks = [x for x in blocks if x["id"] != "00"] + [new_block]
                num_blocks.sort(key=lambda x: x["id"])
                catalog["blocks"] = num_blocks + info_blocks
                blocks_by_slug[slug] = new_block
                notes.append(f"Discovered new block directory: blocs/{slug} -> {new_block['number']}")

            block_obj = blocks_by_slug[slug]
            subs_by_id = {s["id"]: s for s in block_obj.get("subsections", [])}

            for sub_id in ("teoria", "pralabs", "activitats"):
                sub_dir = folder / sub_id
                if not sub_dir.exists() or not sub_dir.is_dir():
                    continue
                qmds = sorted(sub_dir.glob("*.qmd"))
                if not qmds:
                    continue

                if sub_id not in subs_by_id:
                    meta_spec = SUBSECTION_META[sub_id]
                    new_sub = {
                        "id": sub_id,
                        "title": meta_spec["title"],
                        "description": meta_spec["description"],
                        "items": [],
                    }
                    block_obj.setdefault("subsections", []).append(new_sub)
                    subs_by_id[sub_id] = new_sub
                    notes.append(f"Added subsection '{sub_id}' to {block_obj['number']}")

                sub_obj = subs_by_id[sub_id]
                for qmd_file in qmds:
                    rel_qmd = qmd_file.relative_to(ROOT).as_posix()
                    if rel_qmd in known_qmdds:
                        continue
                    fm = parse_qmd_frontmatter(qmd_file)
                    meta_spec = SUBSECTION_META[sub_id]
                    idx = len(sub_obj["items"]) + 1
                    num_int = int(block_obj["id"]) if block_obj["id"].isdigit() else block_obj["id"]
                    item_id = f"b{num_int}-{sub_id[0]}{idx:02d}"
                    code = f"{meta_spec['codePrefix']}{idx:02d}"
                    pdf_name = f"SO-Bloc{num_int}-{slugify_ascii(code)}-{slugify_ascii(fm['title'])[:32]}.pdf"
                    new_item = {
                        "id": item_id,
                        "code": code,
                        "kind": "slide" if fm.get("is_slide") else meta_spec["kind"],
                        "typeLabel": "Presentació" if fm.get("is_slide") else meta_spec["typeLabel"],
                        "title": fm["title"],
                        "subtitle": fm.get("subtitle") or fm.get("description") or f"{block_obj['number']} · {meta_spec['title']}",
                        "qmd": rel_qmd,
                        "href": rel_qmd[:-4] + ".html",
                        "pdf": pdf_name,
                    }
                    sub_obj["items"].append(new_item)
                    known_qmdds.add(rel_qmd)
                    notes.append(f"Registered new material: {rel_qmd} -> {item_id} ({pdf_name})")

    # Prune catalog entries whose source .qmd file was removed from disk
    for b in catalog.get("blocks", []):
        kept_subs = []
        for sub in b.get("subsections", []):
            kept_items = []
            for it in sub.get("items", []):
                if (ROOT / it["qmd"]).exists():
                    kept_items.append(it)
                else:
                    notes.append(f"Pruned deleted material: {it['qmd']} ({it['id']})")
            sub["items"] = kept_items
            if kept_items:
                kept_subs.append(sub)
            else:
                notes.append(f"Removed empty subsection '{sub['id']}' from {b['number']}")
        b["subsections"] = kept_subs

    if write_changes and notes:
        save_catalog(catalog)

    return catalog, notes


def validate_catalog(catalog: dict) -> list[str]:
    errors = []
    seen_ids = set()
    seen_pdfs = set()

    for block in catalog.get("blocks", []):
        for sub in block.get("subsections", []):
            for item in sub.get("items", []):
                iid = item["id"]
                if iid in seen_ids:
                    errors.append(f"Duplicate item id: {iid}")
                seen_ids.add(iid)

                pdf = item["pdf"]
                if pdf in seen_pdfs:
                    errors.append(f"Duplicate PDF filename: {pdf}")
                seen_pdfs.add(pdf)

                qmd_path = ROOT / item["qmd"]
                if not qmd_path.exists():
                    errors.append(f"Missing source .qmd file for {iid}: {item['qmd']}")

                extra = item.get("extraDownload")
                if extra:
                    extra_path = ROOT / extra["href"]
                    if not extra_path.exists():
                        errors.append(f"Missing extraDownload file for {iid}: {extra['href']}")

    # Validate academicYears grading configurations
    academic_years = catalog.get("academicYears", [])
    if not academic_years:
        errors.append("Missing academicYears list in data/course-catalog.json")
    else:
        for yr in academic_years:
            y_name = yr.get("year", "<unnamed>")
            total_w = 0.0
            for cat in yr.get("categories", []):
                if cat.get("isBonus"):
                    continue
                for it in cat.get("items", []):
                    total_w += float(it.get("weight", 0))
            if yr.get("enforceWeightSum100", True) and abs(total_w - 100.0) > 0.05:
                errors.append(f"Academic year {y_name} regular item weights sum to {total_w}%, expected 100%.")

    return errors


def add_new_block(args) -> None:
    bloc_id = args.id.zfill(2)
    slug = args.slug if args.slug.startswith(bloc_id) else f"{bloc_id}-{args.slug}"
    block_dir = ROOT / "blocs" / slug
    for sub in ("teoria", "pralabs", "activitats"):
        (block_dir / sub).mkdir(parents=True, exist_ok=True)

    starter_qmd = block_dir / "teoria" / "01-introduccio.qmd"
    if not starter_qmd.exists():
        starter_qmd.write_text(
            f"""---
title: "Introducció a {args.title}"
subtitle: "Bloc {int(bloc_id) if bloc_id.isdigit() else bloc_id} · {args.title}"
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

# {args.title}

## Objectius de la sessió

::: {{.objectius}}
{args.description}
:::
""",
            encoding="utf-8",
        )

    catalog, notes = sync_catalog(write_changes=True)
    for b in catalog["blocks"]:
        if b["slug"] == slug:
            b["title"] = args.title
            b["shortTitle"] = args.short_title or args.title
            b["description"] = args.description
    save_catalog(catalog)
    print(f"Created block folder blocs/{slug} and updated {CATALOG_PATH.relative_to(ROOT)}.")
    for n in notes:
        print(f"  + {n}")


def print_status(catalog: dict) -> None:
    print(f"Course: {catalog['course']['title']} ({catalog['course']['code']}) · {catalog['course']['academicYear']}")
    print("-" * 78)
    total_items = 0
    for b in catalog.get("blocks", []):
        b_count = sum(len(s["items"]) for s in b.get("subsections", []))
        total_items += b_count
        subs_summary = ", ".join(f"{s['title']}: {len(s['items'])}" for s in b.get("subsections", []))
        print(f"  [{b['id']}] {b['number']} · {b['title']} ({b_count} materials -> {subs_summary})")
    print("-" * 78)
    print(f"Total registered materials: {total_items}")


def main():
    parser = argparse.ArgumentParser(description="Manage and auto-discover course blocks and materials.")
    subparsers = parser.add_subparsers(dest="cmd")

    subparsers.add_parser("status", help="Display course structure summary")
    subparsers.add_parser("sync", help="Scan blocs/ and sync data/course-catalog.json")
    subparsers.add_parser("validate", help="Validate all catalog entries and files")

    p_add = subparsers.add_parser("add-block", help="Scaffold a new thematic block")
    p_add.add_argument("--id", required=True, help="Block number, e.g. 04 or 08")
    p_add.add_argument("--slug", required=True, help="Folder slug, e.g. 04-memoria")
    p_add.add_argument("--title", required=True, help="Full title of the block")
    p_add.add_argument("--short-title", default="", help="Short title for navigation")
    p_add.add_argument("--description", default="Materials docents del bloc.", help="Short description")

    args = parser.parse_args()
    cmd = args.cmd or "status"

    if cmd == "add-block":
        add_new_block(args)
        return

    catalog, notes = sync_catalog(write_changes=(cmd == "sync"))
    if notes:
        for n in notes:
            print(f"[SYNC] {n}")

    errors = validate_catalog(catalog)
    if cmd == "status":
        print_status(catalog)
    elif cmd == "sync":
        print_status(catalog)
        print("Catalog synchronized successfully." if not errors else f"Found {len(errors)} validation errors.")
    elif cmd == "validate":
        if not errors:
            print("VALID: All catalog entries, IDs, PDFs, and .qmd paths are valid.")
        else:
            for e in errors:
                print(f"ERROR: {e}")

    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
