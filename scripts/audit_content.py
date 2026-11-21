#!/usr/bin/env python3
"""Static content audit for the Quarto course site.

Checks, without rendering anything:
  * every sidebar/navbar `href` in _quarto.yml points to an existing file;
  * every .qmd has a `title` in its front matter;
  * every local image / link / asciinema .cast referenced from a .qmd exists;
  * assets that are never referenced (orphans) and oversized images.

Exit status is non-zero when a *broken reference* is found, so it can be
used as a CI gate. Orphans and large images are only reported (warnings).

Usage:  python scripts/audit_content.py [--strict-size]
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIRS = ["blocs", "course-info"]
IGNORE_DIRS = {".git", ".quarto", "docs", "_site", "node_modules", "_extensions"}
ASSET_EXT = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".cast", ".xlsx", ".pdf", ".zip"}
LARGE_IMAGE_BYTES = 500 * 1024

MD_LINK = re.compile(r"!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+\"[^\"]*\")?\s*\)")
HTML_SRC = re.compile(r"""(?:src|href)\s*=\s*["']([^"']+)["']""")
CAST_REF = re.compile(r"""['"]([^'"]+\.cast)['"]""")
YAML_HREF = re.compile(r"^\s*-?\s*href:\s*['\"]?([^'\"\s#]+)", re.M)
FRONT_MATTER = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.S)


def is_external(ref: str) -> bool:
    return bool(re.match(r"^[a-z][a-z0-9+.-]*:", ref, re.I)) or ref.startswith(("#", "//"))


def iter_qmd():
    yield ROOT / "index.qmd"
    for d in CONTENT_DIRS:
        for p in (ROOT / d).rglob("*.qmd"):
            if not IGNORE_DIRS.intersection(p.relative_to(ROOT).parts):
                yield p


def strip_code(text: str) -> str:
    """Remove fenced code blocks so C code like a[i](x) is not parsed as a link."""
    text = re.sub(r"^[ \t]*(```+|~~~+).*?^[ \t]*\1[ \t]*$", "", text, flags=re.S | re.M)
    return re.sub(r"`[^`\n]+`", "", text)  # inline code spans


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    referenced: set[Path] = set()

    # 1. _quarto.yml hrefs
    cfg = (ROOT / "_quarto.yml").read_text(encoding="utf-8")
    for href in YAML_HREF.findall(cfg):
        if is_external(href):
            continue
        if not (ROOT / href).exists():
            errors.append(f"_quarto.yml: sidebar/navbar href does not exist -> {href}")

    # 2. per-document checks
    for qmd in iter_qmd():
        rel = qmd.relative_to(ROOT).as_posix()
        raw = qmd.read_text(encoding="utf-8")
        fm = FRONT_MATTER.match(raw.replace("\r\n", "\n"))
        if not fm:
            errors.append(f"{rel}: missing YAML front matter (no title -> sidebar shows file name)")
        elif not re.search(r"^title:", fm.group(1), re.M):
            errors.append(f"{rel}: front matter has no title")
        if fm:
            for res in re.findall(r"^\s*-\s*(\S+\.cast)\s*$", fm.group(1), re.M):
                referenced.add((qmd.parent / res).resolve())

        body = strip_code(raw)
        refs = set(MD_LINK.findall(body)) | set(HTML_SRC.findall(body)) | set(CAST_REF.findall(raw))
        for ref in refs:
            if is_external(ref) or ref.startswith("/") or "{" in ref:
                continue
            path_part = unquote(ref.split("#", 1)[0].split("?", 1)[0])
            if not path_part:
                continue
            target = (qmd.parent / path_part).resolve()
            # .html links to sibling .qmd sources are valid in Quarto
            if not target.exists() and target.suffix == ".html":
                target = target.with_suffix(".qmd")
            if target.exists():
                referenced.add(target)
            else:
                errors.append(f"{rel}: broken local reference -> {ref}")

    # 3. orphans & large images
    for d in CONTENT_DIRS + ["assets"]:
        for p in (ROOT / d).rglob("*"):
            if not p.is_file() or p.suffix.lower() not in ASSET_EXT:
                continue
            relp = p.relative_to(ROOT).as_posix()
            if d != "assets" and p.resolve() not in referenced:
                warnings.append(f"orphan asset (never referenced): {relp}")
            if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif"} and p.stat().st_size > LARGE_IMAGE_BYTES:
                warnings.append(f"large image ({p.stat().st_size / 1024:.0f} KiB): {relp}")

    for e in sorted(errors):
        print(f"ERROR   {e}")
    for w in sorted(warnings):
        print(f"WARN    {w}")
    print(f"\n{len(errors)} error(s), {len(warnings)} warning(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
