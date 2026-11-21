#!/usr/bin/env python3
"""
Deterministic normalization of .qmd source files for Sistemes Operatius (UdL):
1. Vendor Asciinema Player locally (replace cdn.jsdelivr.net URLs with local vendor paths,
   and remove unused asciinema includes from 01-sched.qmd and 02-sched.qmd).
2. Localize hotlinked external image in 03-signals.qmd (wizardzines-signals.png).
3. Fix HTTP links and Catalan typos in course-info/presentation-slides.qmd.
4. Remove legacy Reveal.js hamburger menu (`menu: false`), default arrows (`controls: false`),
   default slide number (`slide-number: false`), and legacy house SVG footer (`footer: ...`)
   so the unified minimalist presentation bar is the sole navigation interface.
5. Enable TOC (toc: true) and fix heading hierarchy in all Pralabs and Activitats so every
   Part and Exercise appears in the right-hand Table of Contents.
6. Populate descriptive Catalan alt-text on all markdown images with empty ![]() labels.
"""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent

ALT_MAP = {
    "udl-logo": "Logotip de la Universitat de Lleida (UdL)",
    "1_computador": "Esquema general de l'arquitectura d'un computador",
    "2_von_neumann": "Arquitectura de Von Neumann: CPU, memòria i entrada/sortida",
    "3_ capes": "Arquitectura per capes d'un sistema informàtic: maquinari, sistema operatiu i aplicacions",
    "4_so": "Funcions principals del sistema operatiu com a gestor de recursos i màquina estesa",
    "5_ rings": "Anells de protecció de la CPU: Mode Usuari (Ring 3) i Mode Nucli (Ring 0)",
    "6_syscall": "Transició d'espai d'usuari a espai de nucli mitjançant una crida al sistema (syscall)",
    "7_unix_tree": "Evolució històrica de la família de sistemes operatius Unix i Linux",
    "1": "Diagrama conceptual de la secció (pas 1)",
    "2": "Diagrama conceptual de la secció (pas 2)",
    "3": "Diagrama conceptual de la secció (pas 3)",
    "4": "Diagrama conceptual de la secció (pas 4)",
    "5": "Diagrama conceptual de la secció (pas 5)",
    "6": "Diagrama conceptual de la secció (pas 6)",
    "7": "Diagrama conceptual de la secció (pas 7)",
    "8": "Diagrama conceptual de la secció (pas 8)",
    "9": "Diagrama conceptual de la secció (pas 9)",
    "10": "Diagrama conceptual de la secció (pas 10)",
    "11": "Diagrama conceptual de la secció (pas 11)",
    "12": "Diagrama conceptual de la secció (pas 12)",
    "complet": "Diagrama complet de la crida a funcions, registres de la CPU i pila d'execució (stack)",
    "wizardzines-signals": "Resum visual dels senyals a Unix/Linux (Julia Evans, Wizard Zines)",
    "fork_exec": "Cicle de creació i execució de processos amb fork(), exec() i wait()",
    "pcb": "Estructura del Bloc de Control de Procés (PCB / task_struct) i estats del procés",
    "estats": "Diagrama de transició d'estats d'un procés al sistema operatiu",
    "pipe": "Comunicació entre processos mitjançant canonades (pipes) i descriptors de fitxer",
    "dup2": "Redirecció d'entrada/sortida mitjançant la crida al sistema dup2()",
    "gantt": "Diagrama de Gantt de planificació de processos a la CPU",
}


def generate_alt_text(img_path: str, qmd_path: Path) -> str:
    p = Path(img_path.split("?")[0])
    stem = p.stem
    parent = p.parent.name
    if stem in ALT_MAP:
        base = ALT_MAP[stem]
        if stem.isdigit():
            return f"Il·lustració {stem} ({qmd_path.stem} · carpeta {parent})"
        return base
    clean = stem.replace("_", " ").replace("-", " ").strip()
    return f"Esquema sobre {clean} ({qmd_path.stem})".strip()


def clean_revealjs_frontmatter(text: str) -> str:
    """Disable legacy RevealMenu, legacy footer house icon, and duplicate slide-number/controls."""
    m = re.match(r"^(---\r?\n)(.*?)(\r?\n---\r?\n)", text, flags=re.DOTALL)
    if not m:
        return text
    fm = m.group(2)
    if "revealjs:" not in fm:
        return text

    # Remove legacy footer line with home-link SVG (even if it is the last line before ---)
    fm = re.sub(r"\r?\n?[ \t]*footer:[^\r\n]*", "", fm)
    # Replace slide-number: true with slide-number: false
    fm = re.sub(r"^([ \t]*slide-number:\s*)true\b", r"\1false", fm, flags=re.MULTILINE)

    # Ensure menu: false and controls: false are present under revealjs
    if not re.search(r"^[ \t]*menu:\s*false\b", fm, flags=re.MULTILINE):
        fm = re.sub(
            r"^([ \t]*chalkboard:\s*false\b)",
            r"\1\n    menu: false\n    controls: false",
            fm,
            flags=re.MULTILINE,
        )
    return m.group(1) + fm + m.group(3) + text[m.end():]


def update_presentation_slides():
    p = ROOT / "course-info" / "presentation-slides.qmd"
    text = p.read_text(encoding="utf-8")
    text = text.replace(
        "https://cdn.jsdelivr.net/npm/asciinema-player@3.9.0/dist/bundle/asciinema-player.css",
        "../assets/vendor/asciinema/asciinema-player.css",
    )
    text = text.replace(
        "https://cdn.jsdelivr.net/npm/asciinema-player@3.9.0/dist/bundle/asciinema-player.min.js",
        "../assets/vendor/asciinema/asciinema-player.min.js",
    )
    text = text.replace("http://www.udl.cat/", "https://www.udl.cat/")
    text = text.replace("http://gcd.udl.cat", "https://gcd.udl.cat/")
    text = text.replace("Experència prèvia", "Experiència prèvia")
    text = text.replace("**Coneixer els seus serveis**", "**Conèixer els seus serveis**")
    text = text.replace("## Començem", "## Comencem")
    text = clean_revealjs_frontmatter(text)
    p.write_text(text, encoding="utf-8")


def normalize_bloc_files():
    changed_files = 0
    alt_added = 0

    for qmd in sorted((ROOT / "blocs").rglob("*.qmd")):
        orig = qmd.read_text(encoding="utf-8")
        text = orig

        # 1. Clean legacy Reveal.js frontmatter options on slide decks
        text = clean_revealjs_frontmatter(text)

        # 2. Remove unused asciinema header in 01-sched.qmd and 02-sched.qmd
        if qmd.name in ("01-sched.qmd", "02-sched.qmd") and "teoria" in qmd.parts:
            text = re.sub(
                r"\s*include-in-header:\s*\n\s*- text: \|\s*\n\s*<link rel=\"stylesheet\"\s*\n\s*href=\"[^\"]*asciinema-player\.css\">\s*\n\s*<script src=\"[^\"]*asciinema-player\.min\.js\"></script>",
                "",
                text,
            )

        # 3. Replace CDN asciinema URLs with local vendor assets
        text = text.replace(
            "https://cdn.jsdelivr.net/npm/asciinema-player@3.9.0/dist/bundle/asciinema-player.css",
            "../../../assets/vendor/asciinema/asciinema-player.css",
        )
        text = text.replace(
            "https://cdn.jsdelivr.net/npm/asciinema-player@3.9.0/dist/bundle/asciinema-player.min.js",
            "../../../assets/vendor/asciinema/asciinema-player.min.js",
        )

        # 4. Localize hotlinked image in 03-signals.qmd
        if qmd.name == "03-signals.qmd":
            text = text.replace(
                "https://wizardzines.com/images/uploads/signals.png",
                "figures/03/wizardzines-signals.png",
            )

        # 5. Pralabs: enable toc: true and promote ### Part -> ## Part, #### -> ###
        if "pralabs" in qmd.parts:
            text = re.sub(r"^(\s*toc:\s*)false\b", r"\1true", text, flags=re.MULTILINE)
            m = re.match(r"^---\r?\n.*?\r?\n---\r?\n", text, flags=re.DOTALL)
            if m:
                fm = m.group(0)
                body = text[m.end():]
                if re.search(r"^### Part ", body, flags=re.MULTILINE):
                    body = re.sub(r"^### (Part )", r"## \1", body, flags=re.MULTILINE)
                    body = re.sub(r"^#### ", r"### ", body, flags=re.MULTILINE)
                text = fm + body

        # 6. Activitats heading fixes
        if qmd.name == "01_c_punters_arrays.qmd":
            text = text.replace('title: "Exercics C:', 'title: "Exercicis C:')
            m = re.match(r"^---\r?\n.*?\r?\n---\r?\n", text, flags=re.DOTALL)
            if m:
                fm = m.group(0)
                body = text[m.end():]
                if re.search(r"^# Objectius\b", body, flags=re.MULTILINE):
                    lines = []
                    in_code = False
                    for line in body.splitlines(keepends=True):
                        if line.lstrip().startswith("```"):
                            in_code = not in_code
                        if not in_code:
                            if line.startswith("## "):
                                line = "#" + line
                            elif line.startswith("# "):
                                line = "#" + line
                        lines.append(line)
                    body = "".join(lines)
                text = fm + body

        if qmd.name == "02_espai_funcions.qmd":
            m = re.match(r"^---\r?\n.*?\r?\n---\r?\n", text, flags=re.DOTALL)
            if m:
                fm = m.group(0)
                body = text[m.end():]
                if re.search(r"^# Part 1:", body, flags=re.MULTILINE):
                    lines = []
                    in_code = False
                    for line in body.splitlines(keepends=True):
                        if line.lstrip().startswith("```"):
                            in_code = not in_code
                        if not in_code:
                            if line.startswith("## "):
                                line = "#" + line
                            elif line.startswith("# Part "):
                                line = "#" + line
                        lines.append(line)
                    body = "".join(lines)
                text = fm + body

        if qmd.name == "01_rols_funcions.qmd":
            text = re.sub(
                r"^### (Què heu de buscar en cada funció\?)",
                r"## \1",
                text,
                flags=re.MULTILINE,
            )

        # 7. Add ## Exercici N headings before top-level ::: {.exercici} in Bloc 2 activitats
        if qmd.name in ("01-fork-wait.qmd", "02-create.qmd", "03-exec.qmd") and "activitats" in qmd.parts:
            if "## Exercici 1" not in text:
                counter = [0]

                def repl_ex(match):
                    counter[0] += 1
                    block = match.group(0)
                    title_m = re.search(r'title="([^"]+)"', block)
                    label = title_m.group(1) if title_m else f"Exercici {counter[0]}"
                    if label.lower().startswith("exercici"):
                        heading = f"## {label}"
                    else:
                        heading = f"## Exercici {counter[0]} · {label}"
                    return f"{heading}\n\n{block}"

                text = re.sub(r"^:::\s*\{\.exercici[^\n]*\}", repl_ex, text, flags=re.MULTILINE)

        # 8. Populate descriptive Catalan fig-alt="..." on all markdown images
        def repl_img_with_attrs(match):
            nonlocal alt_added
            cap = match.group(1).strip()
            img_target = match.group(2).strip()
            attrs = match.group(3) or ""
            alt = cap if cap else generate_alt_text(img_target, qmd)
            alt_clean = alt.replace('"', "'")
            out_cap = "" if (not cap or cap.startswith(("Il·lustració", "Esquema", "Diagrama", "Evolució", "Anells", "Transició", "Funcions", "Arquitectura"))) else cap
            if "fig-alt=" not in attrs and "alt=" not in attrs:
                alt_added += 1
                if attrs:
                    inner = attrs[1:-1].strip()
                    new_attrs = f'{{{inner} fig-alt="{alt_clean}"}}'
                else:
                    new_attrs = f'{{fig-alt="{alt_clean}"}}'
            else:
                new_attrs = attrs
            return f"![{out_cap}]({img_target}){new_attrs}"

        text = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)(\{[^\}]*\})?", repl_img_with_attrs, text)

        if text != orig:
            qmd.write_text(text, encoding="utf-8")
            changed_files += 1

    print(f"Normalized {changed_files} .qmd files in blocs/ (added {alt_added} descriptive image alt texts).")


if __name__ == "__main__":
    update_presentation_slides()
    normalize_bloc_files()
