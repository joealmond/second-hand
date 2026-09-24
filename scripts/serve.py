#!/usr/bin/env python3
"""
second-hand :: serve.py

A local gallery of every ad. Stdlib only — no npm, no build step, nothing to rot.

    python3 scripts/serve.py            # http://localhost:8765
    python3 scripts/serve.py 9000

The gallery is generated on every request, so editing an ad.md and hitting
reload shows the change. It does NOT rebuild pages — run build.py for that.
"""

import html
import sys
from datetime import datetime, timedelta
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build import (  # noqa: E402
    ADS, ROOT, TEMPLATES, PLATFORMS_BY_KEY, STATUS_HU,
    parse_ad, huf, g, as_list, location_str,
)

ORDER = {"active": 0, "reserved": 1, "draft": 2, "sold": 3, "archived": 4}


def collect():
    ads = []
    if not ADS.exists():
        return ads
    for d in sorted(ADS.iterdir()):
        if not d.is_dir() or not (d / "ad.md").exists():
            continue
        try:
            meta, _ = parse_ad(d / "ad.md")
        except Exception as e:  # noqa: BLE001
            ads.append({"dir": d.name, "error": str(e), "status": "draft",
                        "title": d.name, "meta": {}})
            continue
        cover = None
        for p in as_list(meta.get("photos")):
            if isinstance(p, dict) and p.get("cover"):
                cover = f"ads/{d.name}/export/photos/thumb/{Path(p['file']).stem}.jpg"
                break
        ads.append({
            "dir": d.name,
            "title": meta.get("title") or d.name,
            "status": meta.get("status", "draft"),
            "price": g(meta, "price.amount"),
            "created": str(meta.get("created") or ""),
            "location": location_str(meta),
            "cover": cover,
            "meta": meta,
            "built": (d / "index.html").exists(),
            "error": None,
        })
    ads.sort(key=lambda a: (ORDER.get(a["status"], 9), a["created"]), reverse=False)
    return ads


def alerts(ad):
    """Things that need your attention: expiry, stale sold listings."""
    out = []
    meta = ad["meta"]
    if ad["status"] == "sold":
        live = [e for e in as_list(meta.get("platforms"))
                if isinstance(e, dict) and e.get("status") == "posted"]
        for e in live:
            p = PLATFORMS_BY_KEY.get(e.get("name"))
            out.append(("urgent", f"Elkelt, de még fent van: {p.label if p else e.get('name')}"))
    if ad["status"] == "active" and ad["created"]:
        try:
            created = datetime.strptime(ad["created"], "%Y-%m-%d").date()
        except ValueError:
            return out
        for e in as_list(meta.get("platforms")):
            if not isinstance(e, dict) or e.get("status") != "posted":
                continue
            p = PLATFORMS_BY_KEY.get(e.get("name"))
            if not p or not p.expires_days:
                continue
            left = (created + timedelta(days=p.expires_days) - datetime.now().date()).days
            if left < 0:
                out.append(("urgent", f"{p.label}: lejárt {-left} napja"))
            elif left <= 7:
                out.append(("soon", f"{p.label}: {left} nap múlva lejár"))
    return out


def page(ads):
    css = (TEMPLATES / "ad.css").read_text(encoding="utf-8") if (TEMPLATES / "ad.css").exists() else ""

    todo = []
    for ad in ads:
        for kind, msg in alerts(ad):
            todo.append(f'<li><a href="/ads/{ad["dir"]}/index.html">'
                        f'{html.escape(ad["title"])}</a> — {html.escape(msg)}</li>')

    cards = []
    for ad in ads:
        img = (f'<img src="/{ad["cover"]}" alt="">' if ad["cover"]
               else '<img src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'/%3E" alt="">')
        href = f'/ads/{ad["dir"]}/index.html' if ad["built"] else f'/ads/{ad["dir"]}/'
        err = f'<div class="meta" style="color:#9c3a3a">{html.escape(ad["error"])}</div>' if ad["error"] else ""
        nobuild = "" if ad["built"] else '<div class="meta">nincs buildelve — futtasd a build.py-t</div>'
        cards.append(f"""<a class="card" href="{href}" data-status="{ad['status']}">
  {img}
  <div class="body">
    <span class="pill pill-{ad['status']}">{html.escape(STATUS_HU.get(ad['status'], ad['status']))}</span>
    <h3>{html.escape(ad['title'])}</h3>
    <div class="meta"><span class="amt">{huf(ad['price']) if ad['price'] else '—'}</span>
      {' · ' + html.escape(ad['location']) if ad['location'] else ''}</div>
    {nobuild}{err}
  </div>
</a>""")

    counts = {}
    for ad in ads:
        counts[ad["status"]] = counts.get(ad["status"], 0) + 1
    summary = " · ".join(f"{STATUS_HU.get(k, k)}: {v}" for k, v in sorted(counts.items()))

    todo_block = ""
    if todo:
        todo_block = (f'<div class="warn"><strong>Teendők</strong><ul>{"".join(todo)}</ul></div>')

    filters = "".join(
        f'<button class="tab{" active" if k == "all" else ""}" data-f="{k}">{v}</button>'
        for k, v in [("all", "Mind"), ("active", "Aktív"), ("draft", "Piszkozat"),
                     ("reserved", "Foglalva"), ("sold", "Elkelt")]
    )

    return f"""<!DOCTYPE html><html lang="hu"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hirdetéseim</title><style>{css}</style></head>
<body><div class="wrap">
<header class="head"><div><h1>Hirdetéseim</h1>
<p class="sub stat">{html.escape(summary) or "Még nincs egy hirdetés sem."}</p></div></header>
{todo_block}
<div class="filters">{filters}</div>
<div class="grid">{"".join(cards)}</div>
<footer>Szerkesztéshez nyisd meg az <code>ad.md</code> fájlt, utána: <code>python3 scripts/build.py</code></footer>
</div>
<script>
document.querySelectorAll('.tab').forEach(b => b.onclick = () => {{
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  const f = b.dataset.f;
  document.querySelectorAll('.card').forEach(c => {{
    c.style.display = (f === 'all' || c.dataset.status === f) ? '' : 'none';
  }});
}});
</script></body></html>"""


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/", "/index.html"):
            body = page(collect()).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def log_message(self, *args):
        pass


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    handler = partial(Handler, directory=str(ROOT))
    print(f"second-hand  →  http://localhost:{port}    (Ctrl-C a leállításhoz)")
    try:
        ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()
    except KeyboardInterrupt:
        print("\nleállítva")


if __name__ == "__main__":
    main()
