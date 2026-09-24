#!/usr/bin/env python3
"""Build one buyer-facing ad page into site/ for static hosting."""

from __future__ import annotations

import html
import json
import os
import shutil
import sys
from pathlib import Path
from urllib.parse import quote

from build import (
    ADS,
    ATTR_HU,
    CONDITION_HU,
    ROOT,
    SHIPPING_HU,
    STATUS_HU,
    as_list,
    build_ad,
    g,
    huf,
    location_str,
    md_to_html,
    parse_ad,
)

SITE = ROOT / "site"
PUBLIC_CSS = ROOT / "templates" / "public.css"


def clean_site() -> None:
    if not SITE.exists():
        return
    for path in sorted(SITE.rglob("*"), key=lambda item: len(item.parts), reverse=True):
        if path.is_file() or path.is_symlink():
            path.unlink()
        elif path.is_dir():
            path.rmdir()


def select_ad(argument: str | None) -> Path:
    if argument:
        candidate = Path(argument)
        if not candidate.is_absolute():
            candidate = ROOT / candidate
        if candidate.is_dir() and (candidate / "ad.md").exists():
            return candidate.resolve()
        by_id = ADS / argument
        if (by_id / "ad.md").exists():
            return by_id.resolve()
        raise SystemExit(f"Nincs ilyen hirdetés: {argument}")

    candidates = [path for path in ADS.iterdir() if (path / "ad.md").exists()]
    if not candidates:
        raise SystemExit("Nincs publikálható hirdetés az ads/ mappában.")
    return max(candidates, key=lambda path: (path / "ad.md").stat().st_mtime)


def status_label(status: str) -> str:
    return {
        "active": "Eladó",
        "reserved": "Foglalva",
        "sold": "Elkelt",
    }.get(status, STATUS_HU.get(status, status))


def availability(status: str) -> str:
    return {
        "reserved": "https://schema.org/LimitedAvailability",
        "sold": "https://schema.org/SoldOut",
    }.get(status, "https://schema.org/InStock")


def build_facts(meta: dict) -> str:
    facts: list[tuple[str, object]] = []
    for key, value in (meta.get("attributes") or {}).items():
        facts.append((ATTR_HU.get(key, key.replace("_", " ").capitalize()), value))
    facts.extend(
        [
            ("Állapot", CONDITION_HU.get(meta.get("condition"), meta.get("condition"))),
            ("Helyszín", location_str(meta)),
            (
                "Átvétel",
                ", ".join(SHIPPING_HU.get(item, item) for item in as_list(meta.get("shipping"))),
            ),
        ]
    )
    return "".join(
        f"<tr><th>{html.escape(str(label))}</th><td>{html.escape(str(value))}</td></tr>"
        for label, value in facts
        if value not in (None, "", [])
    )


def render(meta: dict, body: str, photos: list[dict], base_url: str, css: str) -> str:
    title = str(meta.get("title", "Eladó használt termék"))
    subtitle = str(meta.get("subtitle") or title)
    status = str(meta.get("status", "active"))
    amount = g(meta, "price.amount")
    currency = g(meta, "price.currency", "HUF")
    cover = photos[0] if photos else None
    canonical = base_url
    og_url = base_url + "assets/og.jpg" if cover else ""

    visible_photos = photos
    gallery = []
    for index, photo in enumerate(visible_photos):
        loading = 'fetchpriority="high"' if index == 0 else 'loading="lazy"'
        count = (
            f'<span class="photo-count">{len(photos)} fotó</span>'
            if index == len(visible_photos) - 1
            else ""
        )
        gallery.append(
            f'<button class="photo-button" type="button" data-photo="{photo["src"]}" '
            f'aria-label="{html.escape(photo["alt"])} – nagyítás">'
            f'<img src="{photo["src"]}" alt="{html.escape(photo["alt"])}" '
            f"{loading}>"
            f"{count}</button>"
        )

    facts = build_facts(meta)
    defects = as_list(meta.get("defects"))
    defect_html = ""
    if defects:
        defect_html = (
            '<section class="defects"><h3>Fontos tudnivalók</h3><ul>'
            + "".join(f"<li>{html.escape(str(item))}</li>" for item in defects)
            + "</ul></section>"
        )

    image_urls = [base_url + photo["src"] for photo in photos]
    structured = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": title,
        "description": subtitle,
        "image": image_urls,
        "brand": g(meta, "attributes.brand"),
        "itemCondition": "https://schema.org/UsedCondition",
        "offers": {
            "@type": "Offer",
            "price": amount,
            "priceCurrency": currency,
            "availability": availability(status),
            "url": canonical,
            "areaServed": location_str(meta),
        },
    }

    price_text = huf(amount)
    share_text = quote(f"{title} – {price_text}")
    return f"""<!doctype html>
<html lang="hu">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <meta name="description" content="{html.escape(subtitle)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="{html.escape(canonical)}">
  <meta property="og:type" content="product">
  <meta property="og:locale" content="hu_HU">
  <meta property="og:title" content="{html.escape(title)}">
  <meta property="og:description" content="{html.escape(subtitle)}">
  <meta property="og:url" content="{html.escape(canonical)}">
  {f'<meta property="og:image" content="{html.escape(og_url)}">' if og_url else ""}
  <meta property="product:price:amount" content="{html.escape(str(amount or ""))}">
  <meta property="product:price:currency" content="{html.escape(str(currency))}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#f3eee6">
  <script type="application/ld+json">{json.dumps(structured, ensure_ascii=False)}</script>
  <style>{css}</style>
</head>
<body>
  <header class="shell topbar">
    <a class="wordmark" href="#top">Másodkézből</a>
    <span class="topnote">Gondosan dokumentált, őszinte hirdetés</span>
  </header>

  <main id="top">
    <section class="shell hero" aria-labelledby="title">
      <div>
        <div class="eyebrow">Bontott építőanyag · Biatorbágy</div>
        <h1 id="title">{html.escape(title)}</h1>
        <p class="lead">{html.escape(subtitle)}</p>
      </div>
      <aside class="offer" aria-label="Ajánlat">
        <div class="status">{html.escape(status_label(status))}</div>
        <div class="price">{html.escape(price_text)}</div>
        <p class="price-note">A teljes tétel ára · alkuképes</p>
        <ul class="quick-facts">
          <li><span>Mennyiség</span><strong>{html.escape(str(g(meta, "attributes.quantity", "—")))}</strong></li>
          <li><span>Fedhető felület</span><strong>{html.escape(str(g(meta, "attributes.coverage", "—")))}</strong></li>
          <li><span>Átvétel</span><strong>{html.escape(location_str(meta))}</strong></li>
        </ul>
        <a class="button" href="#kapcsolat">Érdekel a teljes tétel</a>
      </aside>
    </section>

    <section class="shell gallery" aria-label="Termékfotók">
      {''.join(gallery)}
    </section>

    <section class="shell content-grid">
      <article class="story">
        {md_to_html(body)}
      </article>
      <aside class="details">
        <div class="section-label">Részletek</div>
        <h2>Minden fontos adat</h2>
        <table class="facts">{facts}</table>
        {defect_html}
      </aside>
    </section>
  </main>

  <section class="contact" id="kapcsolat">
    <div class="shell">
      <div>
        <div class="section-label">Érdeklődés</div>
        <h2>A cserép Biatorbágyon megtekinthető.</h2>
      </div>
      <div class="contact-card">
        <p><strong>Írj azon a piactéren vagy csoportban, ahol ezt a hirdetést megtaláltad.</strong></p>
        <p>Az átvétel előre egyeztetett időpontban, saját szállítással lehetséges.</p>
      </div>
    </div>
  </section>

  <footer>
    <div class="shell footer-row">
      <span>Magánszemély hirdetése · {html.escape(str(meta.get("updated") or meta.get("created") or ""))}</span>
      <a href="mailto:?subject={share_text}&body={quote(canonical)}">Hirdetés megosztása</a>
    </div>
  </footer>

  <dialog id="lightbox" aria-label="Nagyított termékfotó">
    <button class="close" type="button" aria-label="Bezárás">×</button>
    <img class="lightbox-image" alt="">
  </dialog>

  <script>
    const dialog = document.getElementById('lightbox');
    const large = dialog.querySelector('img');
    document.querySelectorAll('[data-photo]').forEach((button) => {{
      button.addEventListener('click', () => {{
        large.src = button.dataset.photo;
        large.alt = button.querySelector('img').alt;
        dialog.showModal();
      }});
    }});
    dialog.querySelector('.close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {{
      if (event.target === dialog) dialog.close();
    }});
  </script>
</body>
</html>
"""


def main(argv: list[str]) -> int:
    configured_url = os.environ.get("PUBLIC_BASE_URL", "").strip()
    if not configured_url:
        raise SystemExit("Add meg a PUBLIC_BASE_URL címet a statikus közzétételhez.")
    base_url = configured_url.rstrip("/") + "/"
    argument = next((item for item in argv if not item.startswith("--")), None)
    ad_dir = select_ad(argument)
    result = build_ad(ad_dir)
    if not result or not result.get("ok"):
        return 1

    meta, body = parse_ad(ad_dir / "ad.md")
    css = PUBLIC_CSS.read_text(encoding="utf-8")

    clean_site()
    assets = SITE / "assets"
    assets.mkdir(parents=True, exist_ok=True)

    photos = []
    declared = as_list(meta.get("photos"))
    declared.sort(key=lambda photo: not bool(photo.get("cover")))
    for photo in declared:
        filename = str(photo.get("file", ""))
        source = ad_dir / "export" / "photos" / filename
        if not source.exists():
            continue
        target = assets / filename
        shutil.copy2(source, target)
        photos.append(
            {
                "src": f"assets/{filename}",
                "alt": str(photo.get("alt") or meta.get("title") or ""),
            }
        )

    og_source = ad_dir / "export" / "og.jpg"
    if og_source.exists():
        shutil.copy2(og_source, assets / "og.jpg")

    page = render(meta, body, photos, base_url, css)
    floor = g(meta, "price.floor")
    if floor and (str(floor) in page or huf(floor) in page):
        raise SystemExit("BIZTONSÁGI HIBA: a minimálár megjelent a publikus oldalon.")

    (SITE / "index.html").write_text(page, encoding="utf-8")
    (SITE / ".nojekyll").write_text("", encoding="utf-8")
    print(f"Publikus oldal elkészült: {SITE / 'index.html'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
