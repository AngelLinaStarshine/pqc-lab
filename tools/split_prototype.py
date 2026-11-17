"""One-time split of the single-file prototype into the shared modules the server and browser load.
After this split the files under app/ are the source of truth."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[1]
html = (root / 'tools/prototype-v5.html').read_text(encoding='utf-8')
i = html.index('<div id="app"></div>\n<script>') + len('<div id="app"></div>\n<script>')
js = html[i:html.rindex('</script>')]
lines = js.split('\n')
def idx(pred, start=0):
    for k in range(start, len(lines)):
        if pred(lines[k]): return k
    raise SystemExit('marker not found')
L_less = idx(lambda l: l.startswith('const LESSONS = {};'))
L_order = idx(lambda l: l.startswith('const LESSON_ORDER'))
L_extras = idx(lambda l: 'PQC LAB v4 — SHARED EXTRAS' in l) - 1
L_engine = idx(lambda l: 'PQC LAB v3 — ENGINE' in l) - 1
L_cohort = idx(lambda l: 'PQC LAB v4 — SAMPLE COHORT' in l) - 1
hdr = '/* Generated once from the v5 prototype by tools/split_prototype.py; edit here from now on. */\n'
catalog = lines[:L_less+1] + [lines[L_order]] + lines[L_extras:L_engine]
lessons = lines[L_less+1:L_order]
engine = lines[L_engine:L_cohort]
ui = lines[L_cohort:]
(root/'app/shared/catalog.js').write_text(hdr + '\n'.join(catalog) + '\n', encoding='utf-8')
(root/'app/shared/lessons.js').write_text(hdr + '/* SERVER ONLY for students: holds the answer keys. Students receive a sanitised copy. */\n' + '\n'.join(lessons) + '\n', encoding='utf-8')
(root/'app/shared/engine.js').write_text(hdr + '\n'.join(engine) + '\n', encoding='utf-8')
(root/'app/public/ui.js').write_text(hdr + '\n'.join(ui) + '\n', encoding='utf-8')
head = html[:html.index('<div id="app"></div>')]
css = head[head.index('<style>\n/* Layout:') + len('<style>\n'):head.rindex('</style>')]
(root/'app/public/style.css').write_text(css, encoding='utf-8')
print({k: len(v) for k, v in dict(catalog=catalog, lessons=lessons, engine=engine, ui=ui).items()})
