#!/usr/bin/env python3
"""Bundle the prototype into one self-contained HTML body (for publishing as a claude.ai Artifact).

DS stylesheets/icons are inlined from a local clone of the design system (same files the page loads
from Vercel), local CSS/JS are inlined, images stay as relative files (assets/img/*).

usage: python3 tools/build-artifact.py OUT.html [--ds PATH_TO_gocanopy-design-system]
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
args = sys.argv[1:]
out = args[0]
ds = args[args.index("--ds") + 1] if "--ds" in args else os.environ.get(
    "GOCANOPY_DS_ROOT", os.path.join(ROOT, "..", "..", "gocanopy-design-system"))
VERCEL = "https://gocanopy-design-system.vercel.app/"

html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

def read(path):
    return open(path, encoding="utf-8").read()

def css_link(m):
    href = m.group(1)
    if href.startswith(VERCEL):
        return "<style>\n" + read(os.path.join(ds, href[len(VERCEL):])) + "\n</style>"
    if href.startswith("http"):
        return m.group(0)  # Google Fonts
    return "<style>\n" + read(os.path.join(ROOT, href)) + "\n</style>"

def script_tag(m):
    src = m.group(1)
    path = os.path.join(ds, src[len(VERCEL):]) if src.startswith(VERCEL) else os.path.join(ROOT, src)
    return "<script>\n" + read(path).replace("</script", "<\\/script") + "\n</script>"

html = re.sub(r'<link rel="stylesheet" href="([^"]+)" />', css_link, html)
html = re.sub(r'<script src="([^"]+)"></script>', script_tag, html)

# The Artifact host supplies doctype/html/head/body; keep <title> first so it's found in the first 8KB.
title = re.search(r"<title>.*?</title>", html).group(0)
head = re.search(r"<head>(.*?)</head>", html, re.S).group(1).replace(title, "")
head = re.sub(r'<meta[^>]*>\s*', "", head)
body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)
open(out, "w", encoding="utf-8").write(title.replace("Deals inbox · Gocanopy", "Add New Deal Prototype") + "\n" + head + body)
print("wrote", out, os.path.getsize(out), "bytes")
