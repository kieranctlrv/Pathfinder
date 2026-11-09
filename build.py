#!/usr/bin/env python3
"""Build Pathfinder Watchstation into one self-contained HTML file.

    python3 build.py                 -> dist/index.html
    python3 build.py out.html        -> out.html

The game ships as a single file so it opens anywhere: Netlify, the Claude
artifact link, or straight off a phone. src/manifest.json lists the source
files in order; this script glues them into src/index.template.html.

Nothing is minified or transformed. The station files are plain text pieces
of one script, so their order in the manifest matters.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8", newline="") as f:
        return f.read()


def build():
    manifest = json.loads(read("src/manifest.json"))
    html = read("src/index.template.html")
    html = html.replace("<!--@style-->", "".join(read(p) for p in manifest["style"]), 1)
    for i, files in enumerate(manifest["scripts"]):
        marker = "<!--@script%d-->" % i
        if marker not in html:
            sys.exit("template is missing " + marker)
        html = html.replace(marker, "".join(read(p) for p in files), 1)
    return html


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "dist", "index.html")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    html = build()
    with open(out, "w", encoding="utf-8", newline="") as f:
        f.write(html)
    print("built %s (%d KB)" % (os.path.relpath(out), len(html.encode("utf-8")) // 1024))


if __name__ == "__main__":
    main()
