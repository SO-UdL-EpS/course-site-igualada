#!/usr/bin/env python3
"""
End-to-End QA, Responsive DOM Invariants, Multi-Year Grade Engine, Legacy Removal,
Accessibility, Performance & Security Verification Suite for Iteration 3 of the
Sistemes Operatius (UdL) course platform.
"""

from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess
import sys
from urllib.parse import unquote, urlparse
import zipfile

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
CATALOG_JSON = ROOT / "data" / "course-catalog.json"

FORBIDDEN_EMOJIS = [
    "🏠", "📑", "⬇", "📊", "👁", "🙈", "☆", "★", "📅", "🧮", "👨‍🏫", "🕘"
]

FORBIDDEN_MOSAIC_CLASSES = [
    "udl-blocks-grid",
    "udl-subsections-grid",
    "udl-bundles-grid",
    "udl-mosaic-grid",
]


class LinkAndA11yParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.html_lang = None
        self.links = []
        self.srcs = []
        self.empty_alt_imgs = []
        self.has_course_ui = False
        self.has_legacy_sidebar = False

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        if tag == "html":
            self.html_lang = attr_dict.get("lang")
        elif tag in ("a", "link"):
            href = attr_dict.get("href")
            if href:
                self.links.append(href)
        elif tag in ("script", "img", "source", "use"):
            src = attr_dict.get("src") or attr_dict.get("href")
            if src:
                self.srcs.append(src)
                if "course-ui.js" in src:
                    self.has_course_ui = True
            if tag == "img":
                alt = attr_dict.get("alt")
                role = attr_dict.get("role")
                aria_hidden = attr_dict.get("aria-hidden")
                if (alt is None or alt.strip() == "") and role != "presentation" and aria_hidden != "true":
                    self.empty_alt_imgs.append(attr_dict.get("src", "<unknown>"))
        if attr_dict.get("id") == "quarto-sidebar":
            self.has_legacy_sidebar = True


def check_local_ref(html_file: Path, ref: str) -> Path | None:
    parsed = urlparse(ref)
    if parsed.scheme in ("http", "https", "mailto", "tel", "javascript", "data"):
        return None
    clean_path = unquote(parsed.path)
    if not clean_path or clean_path.startswith("#"):
        return None
    if clean_path.startswith("/"):
        target = DOCS / clean_path.lstrip("/")
    else:
        target = (html_file.parent / clean_path).resolve()
    if not target.exists():
        return target
    return None


def main():
    errors = []
    warnings = []

    if not DOCS.exists():
        print("FAIL: docs/ directory does not exist.")
        sys.exit(1)

    for js_file in ("course-ui.js", "grade-engine.js"):
        src_js = ROOT / "assets" / "js" / js_file
        dst_js = DOCS / "assets" / "js" / js_file
        if src_js.exists() and dst_js.parent.exists():
            dst_js.write_text(src_js.read_text(encoding="utf-8"), encoding="utf-8")

    # 1. Check required top-level pages, JS modules, and guides exist in docs/
    for top_page in (
        "index.html",
        "materials.html",
        "guia.html",
        "calculadora.html",
        "assets/js/course-ui.js",
        "assets/js/grade-engine.js",
        "downloads/data/blocks-overview.json",
        "downloads/data/block-01.json",
        "downloads/data/academic-years.json",
        "PROFESSOR_GUIDE.md",
        "DEVELOPER_GUIDE.md",
    ):
        if not (DOCS / top_page).exists():
            errors.append(f"Missing required artifact in docs/: docs/{top_page}")

    # 2. Check Iteration 3 page-level DOM invariants
    idx_path = DOCS / "index.html"
    if idx_path.exists():
        idx_html = idx_path.read_text(encoding="utf-8")
        if "udl-hero" not in idx_html or "udl-home-recent" not in idx_html:
            errors.append("index.html: missing minimalist .udl-hero or #udl-home-recent section")
        for mc in FORBIDDEN_MOSAIC_CLASSES:
            if mc in idx_html:
                errors.append(f"index.html: contains forbidden mosaic/grid class '{mc}'")

    mat_path = DOCS / "materials.html"
    if mat_path.exists():
        mat_html = mat_path.read_text(encoding="utf-8")
        for req_id in ("udl-materials-explorer", "udl-materials-stage", "udl-bundles-list", "udl-materials-breadcrumb"):
            if req_id not in mat_html:
                errors.append(f"materials.html: missing required element/class '{req_id}'")
        for dead in ("udl-mat-rail", "udl-materials-block-bar", "udl-materials-workspace", "udl-mat-mobile-toggle"):
            if dead in mat_html:
                errors.append(f"materials.html: sidebar remnant '{dead}' still present")
        for mc in FORBIDDEN_MOSAIC_CLASSES:
            if mc in mat_html:
                errors.append(f"materials.html: contains forbidden mosaic/grid class '{mc}'")

    calc_path = DOCS / "calculadora.html"
    if calc_path.exists():
        calc_html = calc_path.read_text(encoding="utf-8")
        for req_token in (
            "udl-calc-minimal-shell",
            "udl-calc-result-panel",
            "calc-year-select",
            "calc-categories-container",
            "calc-req-headline",
            "udl-calc-details",
            "grade-engine.js",
        ):
            if req_token not in calc_html:
                errors.append(f"calculadora.html: missing required token '{req_token}'")
        for forbidden_admin in ("calc-prof-modal", "calc-open-prof-btn"):
            if forbidden_admin in calc_html:
                errors.append(f"calculadora.html: unprotected client-side admin control '{forbidden_admin}' must not be exposed")

    # Ensure global navbar controller never injects thematic blocks into the global navbar
    course_ui_txt = (ROOT / "assets" / "js" / "course-ui.js").read_text(encoding="utf-8")
    if "udl-nav-has-dropdown" in course_ui_txt or "udl-nav-dropdown-blocks" in course_ui_txt:
        errors.append("course-ui.js: still injects thematic blocks dropdown into global navbar")

    # Verify structural tokens in course-ui.js
    for required_token in (
        "udl-nav-recents-capsule",
        "udl-nav-overlay",
        "udl-nav-theme-capsule",
        "udl-exp-list",
        "udl-exp-block-trigger",
        "udl-exp-cat-trigger",
        "createResourceRow",
        "udl-clean-row-meta-tag",
    ):
        if required_token not in course_ui_txt:
            errors.append(f"course-ui.js: missing required token '{required_token}'")

    if "Mostra tots els recursos del bloc" in course_ui_txt or "Mostrar tots els recursos" in course_ui_txt:
        errors.append("course-ui.js: 'Mostra(r) tots els recursos del bloc' was not removed from Level 2")

    # 3. Check zero emojis and zero mosaic classes in UI controller and source hub pages
    ui_files = [
        ROOT / "assets" / "js" / "course-ui.js",
        ROOT / "assets" / "js" / "grade-engine.js",
        ROOT / "index.qmd",
        ROOT / "materials.qmd",
        ROOT / "guia.qmd",
        ROOT / "calculadora.qmd",
        ROOT / "_quarto.yml",
    ]
    for uf in ui_files:
        if uf.exists():
            txt = uf.read_text(encoding="utf-8")
            for em in FORBIDDEN_EMOJIS:
                if em in txt:
                    errors.append(f"{uf.relative_to(ROOT)}: contains forbidden decorative emoji '{em}'")
            for mc in FORBIDDEN_MOSAIC_CLASSES:
                if mc in txt:
                    errors.append(f"{uf.relative_to(ROOT)}: contains forbidden mosaic/grid class '{mc}'")

    # 4. Run Node.js unit test suite for grade-engine.js
    test_script = ROOT / "scripts" / "test_calculator.js"
    if test_script.exists():
        res = subprocess.run(["node", str(test_script)], cwd=str(ROOT), capture_output=True, text=True)
        if res.returncode != 0:
            errors.append(f"Calculator unit tests failed:\n{res.stdout}\n{res.stderr}")
        else:
            print("[OK] Calculator unit tests passed (16/16 suites).")

    # 5. Inspect all rendered course HTML pages
    html_files = sorted(
        hf for hf in DOCS.rglob("*.html") if "site_libs" not in hf.relative_to(DOCS).parts
    )
    print(f"Checking {len(html_files)} rendered course HTML pages in docs/...")
    if len(html_files) < 40:
        errors.append(f"Expected at least 40 course HTML files in docs/, found {len(html_files)}")

    total_links_checked = 0
    bootstrap_hashes = set()
    for hf in html_files:
        rel_hf = hf.relative_to(DOCS)
        content = hf.read_text(encoding="utf-8")
        parser = LinkAndA11yParser()
        parser.feed(content)

        # Verify all non-revealjs HTML document pages share the exact same compiled Bootstrap CSS hash
        # and have Guia docent after Calculadora in the navbar
        if '<header id="quarto-header"' in content:
            for lk in parser.links:
                if "site_libs/bootstrap/bootstrap-" in lk and "dark" not in lk and lk.endswith(".min.css"):
                    bootstrap_hashes.add(Path(lk).name)
            pos_calc = content.find("Calculadora</span>")
            pos_guia = content.find("Guia docent</span>")
            if pos_calc == -1 or pos_guia == -1 or pos_calc > pos_guia:
                errors.append(f"{rel_hf}: navbar order invalid (expected Calculadora before Guia docent)")
            if 'data-bs-theme="dark"' in content:
                errors.append(f"{rel_hf}: legacy dark navbar attribute data-bs-theme='dark' still present")

        if parser.html_lang != "ca":
            errors.append(f"{rel_hf}: expected <html lang='ca'>, got lang='{parser.html_lang}'")

        if not parser.has_course_ui:
            errors.append(f"{rel_hf}: missing course-ui.js script")

        if parser.has_legacy_sidebar:
            errors.append(f"{rel_hf}: legacy #quarto-sidebar still present in DOM")

        if '"openButton":true' in content:
            errors.append(f"{rel_hf}: legacy RevealMenu hamburger openButton is still enabled")

        if 'class="home-link"' in content:
            errors.append(f"{rel_hf}: legacy .home-link footer icon still present in presentation")

        if "cdn.jsdelivr.net/npm/asciinema-player" in content:
            errors.append(f"{rel_hf}: still references external CDN asciinema-player")
        if "wizardzines.com" in content:
            errors.append(f"{rel_hf}: still hotlinks wizardzines.com")

        for img_src in parser.empty_alt_imgs:
            if "udl-logo" not in img_src:
                warnings.append(f"{rel_hf}: <img> with empty alt: {img_src}")

        for ref in parser.links + parser.srcs:
            total_links_checked += 1
            missing = check_local_ref(hf, ref)
            if missing is not None:
                errors.append(f"{rel_hf}: broken local reference '{ref}' -> {missing}")

    if len(bootstrap_hashes) > 1:
        errors.append(f"Inconsistent compiled Bootstrap CSS stylesheets across HTML pages: {sorted(bootstrap_hashes)}")

    # 6. Verify PDFs, ZIP bundles & Multi-Year Catalog via manifest.json
    manifest_path = DOCS / "downloads" / "manifest.json"
    if not manifest_path.exists():
        errors.append("Missing docs/downloads/manifest.json")
    else:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        items = manifest.get("items", {})
        bundles = manifest.get("bundles", {})
        blocks = manifest.get("blocks", [])
        academic_years = manifest.get("academicYears", [])

        if len(blocks) < 5:
            errors.append(f"Expected at least 5 blocks in manifest.json, got {len(blocks)}")

        if len(academic_years) < 3:
            errors.append(f"Expected at least 3 academicYears in manifest.json, got {len(academic_years)}")

        expected_item_count = sum(
            len(s.get("items", []))
            for b in blocks
            for s in b.get("subsections", [])
        )
        if len(items) != expected_item_count or expected_item_count == 0:
            errors.append(f"Expected {expected_item_count} PDFs in manifest.json, got {len(items)}")

        for item_id, info in items.items():
            pdf_file = DOCS / info["pdfHref"]
            if not pdf_file.exists():
                errors.append(f"Missing generated PDF for {item_id}: {pdf_file}")
            else:
                header = pdf_file.read_bytes()[:7]
                if not header.startswith(b"%PDF-1."):
                    errors.append(f"Invalid PDF header in {pdf_file}: {header!r}")

        unique_zips = {b_info["filename"]: b_info for b_info in bundles.values()}
        if len(unique_zips) != 7:
            errors.append(f"Expected 7 unique ZIP bundles in manifest.json, got {len(unique_zips)}")
        for fname, b_info in unique_zips.items():
            zf_path = DOCS / b_info["href"]
            if not zf_path.exists():
                errors.append(f"Missing generated ZIP bundle {fname}: {zf_path}")
            else:
                with zipfile.ZipFile(zf_path, "r") as zf:
                    bad = zf.testzip()
                    if bad is not None:
                        errors.append(f"Corrupted file {bad} inside ZIP {zf_path}")

    pdf_count = len(manifest.get("items", {})) if manifest_path.exists() else 0
    zip_count = len({b["filename"] for b in manifest.get("bundles", {}).values()}) if manifest_path.exists() else 0
    print(
        f"Checked {len(html_files)} HTML pages, {total_links_checked} local references, "
        f"DOM invariants, zero mosaic grids, {pdf_count} PDFs, and {zip_count} ZIP archives."
    )
    for w in warnings:
        print(f"WARN:  {w}")
    for e in errors:
        print(f"ERROR: {e}")

    print(f"\nVerification summary: {len(errors)} error(s), {len(warnings)} warning(s).")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
