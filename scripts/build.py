#!/usr/bin/env python3
"""
second-hand :: build.py

ad.md  ->  index.html  +  export/*.txt  +  export/photos/*

A pure, deterministic function. No AI, no network. Run it a thousand times,
get the same bytes. Anything that needs judgement happens in the skill and is
frozen into ad.md before this script ever sees it.

Usage
    python3 scripts/build.py                    # build every ad
    python3 scripts/build.py ads/2026-07-30-x   # build one
    python3 scripts/build.py --check            # validate only, write nothing

Dependencies
    stdlib only. Pillow is used if present (photo resizing); without it the
    build still succeeds and photos are copied through untouched.
"""

from __future__ import annotations

import html
import json
import re
import shutil
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ADS = ROOT / "ads"
TEMPLATES = ROOT / "templates"

try:
    from PIL import Image, ImageOps

    HAVE_PIL = True
except ImportError:  # pragma: no cover
    HAVE_PIL = False


# ─────────────────────────────────────────────────────────────────────────────
#  Hungarian labels — everything the seller or buyer reads
# ─────────────────────────────────────────────────────────────────────────────

CONDITION_HU = {
    "new": "Új",
    "like-new": "Újszerű",
    "used-good": "Használt, jó állapotú",
    "used-fair": "Használt, kopott",
    "for-parts": "Hibás / alkatrésznek",
}

STATUS_HU = {
    "draft": "Piszkozat",
    "active": "Aktív",
    "reserved": "Foglalva",
    "sold": "Elkelt",
    "archived": "Archivált",
}

SHIPPING_HU = {
    "personal": "Személyes átvétel",
    "foxpost": "Foxpost csomagautomata",
    "mpl": "MPL",
    "gls": "GLS házhozszállítás",
    "post": "Posta",
    "courier": "Futár",
}

PLATFORM_STATUS_HU = {
    "pending": "Még nincs feladva",
    "posted": "Fent van",
    "expired": "Lejárt",
    "removed": "Levéve",
}

ATTR_HU = {
    "brand": "Márka",
    "model": "Típus",
    "year": "Évjárat",
    "color": "Szín",
    "size": "Méret",
    "material": "Anyag",
    "weight_kg": "Súly",
    "wheel_size": "Kerékméret",
    "frame_size": "Vázméret",
    "gears": "Váltó",
    "capacity": "Kapacitás",
    "power": "Teljesítmény",
    "warranty": "Garancia",
    "purchased": "Vásárlás ideje",
    # építőanyag / bontott anyag
    "product_type": "Terméktípus",
    "cut": "Vágás",
    "coverage": "Fedhető felület",
    "quantity": "Mennyiség",
    "pieces_per_sqm": "Szükséglet",
    "laying": "Fedésmód",
    "age": "Kor",
    "packaging": "Kiszerelés",
}


# ─────────────────────────────────────────────────────────────────────────────
#  Platform configuration — add a platform by adding one entry here
# ─────────────────────────────────────────────────────────────────────────────


class Platform:
    def __init__(
        self,
        key,
        label,
        title_max=80,
        body_max=4000,
        allow_emoji=False,
        photo_max=10,
        include_keywords=False,
        expires_days=None,
        freeform=False,
        note="",
    ):
        self.key = key
        self.label = label
        self.title_max = title_max
        self.body_max = body_max
        self.allow_emoji = allow_emoji
        self.photo_max = photo_max
        self.include_keywords = include_keywords
        self.expires_days = expires_days
        self.freeform = freeform  # no structured form; whole thing is one text block
        self.note = note


PLATFORMS = [
    Platform("jofogas", "Jófogás", title_max=60, body_max=4000,
             include_keywords=True, expires_days=90,
             note="Ingyenes a legtöbb kategóriában. Szállításhoz kötelező a csomagméret."),
    Platform("marketplace", "Facebook Marketplace", title_max=100, body_max=1500,
             allow_emoji=True,
             note="Az első sor a lényeg — a feed levágja. Négyzetes fotókivágás."),
    Platform("facebook-group", "Facebook csoport", title_max=100, body_max=1200,
             allow_emoji=True, freeform=True,
             note="Szabad szöveg. Ár és helyszín az első két sorban — a feed kb. 3 sor "
                  "után levág. Nézd meg a csoport szabályait feladás előtt."),
    Platform("vatera", "Vatera", title_max=70, body_max=4000, expires_days=21,
             note="Feltöltési díj + jutalék. Alapból 21 nap."),
    Platform("hardverapro", "HardverApró", title_max=70, body_max=4000,
             include_keywords=True, expires_days=30,
             note="Csak műszaki cikk. Pontos típusszám és specifikáció kötelező."),
]

PLATFORMS_BY_KEY = {p.key: p for p in PLATFORMS}


# ─────────────────────────────────────────────────────────────────────────────
#  Minimal YAML — enough for our schema, zero dependencies
# ─────────────────────────────────────────────────────────────────────────────


def _unquote(s):
    q = s[0]
    out, i = [], 1
    while i < len(s):
        c = s[i]
        if c == "\\" and i + 1 < len(s):
            nxt = s[i + 1]
            out.append({"n": "\n", "t": "\t"}.get(nxt, nxt))
            i += 2
            continue
        if c == q:
            break
        out.append(c)
        i += 1
    return "".join(out)


def _scalar(s):
    s = s.strip()
    if s == "":
        return None
    if s[0] in "[{":
        return _flow(s, 0)[0]
    if s[0] in "\"'":
        return _unquote(s)
    low = s.lower()
    if low in ("true", "yes"):
        return True
    if low in ("false", "no"):
        return False
    if low in ("null", "~"):
        return None
    if re.fullmatch(r"-?\d+", s):
        return int(s)
    if re.fullmatch(r"-?\d*\.\d+", s):
        return float(s)
    return s


def _flow(s, i):
    """Parse a JSON-ish flow collection starting at s[i]. Returns (value, next_i)."""
    while i < len(s) and s[i] in " \t":
        i += 1
    if i >= len(s):
        return None, i
    c = s[i]
    if c == "[":
        out, i = [], i + 1
        while i < len(s):
            while i < len(s) and s[i] in " \t,":
                i += 1
            if i < len(s) and s[i] == "]":
                return out, i + 1
            v, i = _flow(s, i)
            out.append(v)
        return out, i
    if c == "{":
        out, i = {}, i + 1
        while i < len(s):
            while i < len(s) and s[i] in " \t,":
                i += 1
            if i < len(s) and s[i] == "}":
                return out, i + 1
            k, i = _flow_token(s, i, stop=":")
            while i < len(s) and s[i] in " \t:":
                i += 1
            v, i = _flow(s, i)
            out[str(k).strip()] = v
        return out, i
    return _flow_token(s, i, stop=",]}")


def _flow_token(s, i, stop):
    if s[i] in "\"'":
        q, j = s[i], i + 1
        while j < len(s):
            if s[j] == "\\":
                j += 2
                continue
            if s[j] == q:
                break
            j += 1
        return _unquote(s[i : j + 1]), j + 1
    j = i
    while j < len(s) and s[j] not in stop:
        j += 1
    return _scalar(s[i:j]), j


def _strip_comment(line):
    out, q = [], None
    for c in line:
        if q:
            out.append(c)
            if c == q:
                q = None
            continue
        if c in "\"'":
            q = c
            out.append(c)
            continue
        if c == "#" and (not out or out[-1] in " \t"):
            break
        out.append(c)
    return "".join(out).rstrip()


def _indent(line):
    return len(line) - len(line.lstrip(" "))


def _parse_block(lines, i, indent):
    """Recursive-descent over (already comment-stripped) lines."""
    if i >= len(lines):
        return None, i
    if lines[i].lstrip().startswith("- "):
        out = []
        while i < len(lines):
            line = lines[i]
            if _indent(line) < indent or not line.lstrip().startswith("- "):
                break
            rest = line.lstrip()[2:]
            if ":" in rest and not rest.lstrip()[0] in "[{\"'" or re.match(r"^[\w.-]+:( |$)", rest):
                # list item that is itself a mapping
                sub = [" " * (indent + 2) + rest]
                i += 1
                while i < len(lines) and _indent(lines[i]) > indent:
                    sub.append(lines[i])
                    i += 1
                v, _ = _parse_block(sub, 0, indent + 2)
                out.append(v)
            else:
                out.append(_scalar(rest))
                i += 1
        return out, i

    out = {}
    while i < len(lines):
        line = lines[i]
        ind = _indent(line)
        if ind < indent:
            break
        if ind > indent:
            i += 1
            continue
        m = re.match(r"^([^:]+):(.*)$", line.strip())
        if not m:
            i += 1
            continue
        key, rest = m.group(1).strip().strip("\"'"), m.group(2).strip()
        if rest:
            out[key] = _scalar(rest)
            i += 1
        else:
            j = i + 1
            sub = []
            while j < len(lines) and (_indent(lines[j]) > indent or not lines[j].strip()):
                if lines[j].strip():
                    sub.append(lines[j])
                j += 1
            if sub:
                out[key], _ = _parse_block(sub, 0, _indent(sub[0]))
            else:
                out[key] = None
            i = j
    return out, i


def parse_yaml(text):
    try:
        import yaml  # noqa

        return yaml.safe_load(text) or {}
    except ImportError:
        pass
    lines = [_strip_comment(l) for l in text.splitlines()]
    lines = [l for l in lines if l.strip()]
    if not lines:
        return {}
    val, _ = _parse_block(lines, 0, _indent(lines[0]))
    return val or {}


def parse_ad(path: Path):
    raw = path.read_text(encoding="utf-8")
    if not raw.startswith("---"):
        raise ValueError(f"{path}: hiányzik a frontmatter (--- nyitás)")
    end = raw.find("\n---", 3)
    if end == -1:
        raise ValueError(f"{path}: nem záródik a frontmatter (--- záró)")
    meta = parse_yaml(raw[3:end])
    body = raw[end + 4 :].lstrip("\n")
    return meta, body


# ─────────────────────────────────────────────────────────────────────────────
#  Formatting helpers
# ─────────────────────────────────────────────────────────────────────────────


def huf(n):
    try:
        return f"{int(n):,}".replace(",", " ") + " Ft"
    except (TypeError, ValueError):
        return str(n)


def g(d, path, default=None):
    """Safe nested get: g(meta, 'price.amount')"""
    cur = d
    for part in path.split("."):
        if not isinstance(cur, dict) or part not in cur or cur[part] is None:
            return default
        cur = cur[part]
    return cur


def as_list(v):
    if v is None:
        return []
    if isinstance(v, list):
        return v
    return [v]


def slugify(s):
    table = str.maketrans("áéíóöőúüűÁÉÍÓÖŐÚÜŰ", "aeiooouuuAEIOOOUUU")
    s = (s or "").translate(table).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "hirdetes"


def location_str(meta):
    city = g(meta, "location.city", "")
    district = g(meta, "location.district")
    parts = [p for p in [city, f"{district}. kerület" if district else None] if p]
    return ", ".join(parts)


def price_str(meta):
    amount = g(meta, "price.amount")
    if amount is None:
        return "Ár megegyezés szerint"
    s = huf(amount)
    return s + (" (alku képezhető)" if g(meta, "price.negotiable") else " (fix ár)")


# ─────────────────────────────────────────────────────────────────────────────
#  Tiny Markdown renderer (body prose only)
# ─────────────────────────────────────────────────────────────────────────────


def md_inline(s):
    s = html.escape(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<em>\1</em>", s)
    return s


def md_to_html(text):
    out, buf, in_list = [], [], False

    def flush_para():
        if buf:
            out.append("<p>" + md_inline(" ".join(buf)) + "</p>")
            buf.clear()

    def close_list():
        nonlocal in_list
        if in_list:
            out.append("</ul>")
            in_list = False

    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            flush_para()
            close_list()
            continue
        m = re.match(r"^(#{2,4})\s+(.*)$", stripped)
        if m:
            flush_para()
            close_list()
            lvl = len(m.group(1))
            out.append(f"<h{lvl}>{md_inline(m.group(2))}</h{lvl}>")
            continue
        if stripped.startswith(("- ", "* ")):
            flush_para()
            if not in_list:
                out.append("<ul>")
                in_list = True
            out.append("<li>" + md_inline(stripped[2:]) + "</li>")
            continue
        close_list()
        buf.append(stripped)
    flush_para()
    close_list()
    return "\n".join(out)


def strip_lead_heading(text):
    """Drop a leading '## Leírás' — the description box doesn't need to be told
    that it contains the description."""
    lines = text.lstrip().splitlines()
    if lines and re.match(r"^#{2,4}\s+(Leírás|Leiras|Description)\s*$", lines[0].strip(), re.I):
        return "\n".join(lines[1:]).lstrip()
    return text


def paragraphs(text, lead_only=False):
    """Prose paragraphs of the body, headings and bullets removed.

    lead_only=True stops at the first heading — i.e. returns just the
    'Leírás' section. Used for short formats where repeating the condition
    text and then listing the defects again would read as padding.
    """
    out, buf = [], []
    for line in strip_lead_heading(text).splitlines():
        s = line.strip()
        if not s:
            if buf:
                out.append(" ".join(buf))
                buf = []
            continue
        if s.startswith("#"):
            if buf:
                out.append(" ".join(buf))
                buf = []
            if lead_only and out:
                return out
            continue
        if s.startswith(("- ", "* ")):
            if buf:
                out.append(" ".join(buf))
                buf = []
            continue
        buf.append(re.sub(r"\*{1,2}(.+?)\*{1,2}", r"\1", s))
    if buf:
        out.append(" ".join(buf))
    return [p for p in out if p]


def md_to_text(text):
    """Markdown -> plain text suitable for a marketplace description box."""
    out = []
    for line in strip_lead_heading(text).splitlines():
        s = line.rstrip()
        m = re.match(r"^#{2,4}\s+(.*)$", s.strip())
        if m:
            if out and out[-1] != "":
                out.append("")
            out.append(m.group(1).upper())
            continue
        s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
        s = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"\1", s)
        if s.strip().startswith(("- ", "* ")):
            s = "• " + s.strip()[2:]
        out.append(s)
    txt = "\n".join(out)
    return re.sub(r"\n{3,}", "\n\n", txt).strip()


# ─────────────────────────────────────────────────────────────────────────────
#  Validation
# ─────────────────────────────────────────────────────────────────────────────


def validate(meta, body, ad_dir):
    warn, err = [], []

    if meta.get("id") and meta["id"] != ad_dir.name:
        err.append(f"id ({meta['id']}) != mappanév ({ad_dir.name})")
    if not meta.get("title"):
        err.append("hiányzik a title")
    if g(meta, "price.amount") is None:
        err.append("hiányzik a price.amount")
    elif not isinstance(g(meta, "price.amount"), int) or g(meta, "price.amount") <= 0:
        err.append("price.amount pozitív egész szám kell legyen")
    if meta.get("status") not in STATUS_HU:
        err.append(f"ismeretlen status: {meta.get('status')!r}")
    if meta.get("condition") not in CONDITION_HU:
        warn.append(f"ismeretlen condition: {meta.get('condition')!r}")

    photos = as_list(meta.get("photos"))
    covers = [p for p in photos if isinstance(p, dict) and p.get("cover")]
    if photos and len(covers) != 1:
        err.append(f"pontosan egy fotó legyen cover: true (most {len(covers)})")
    for p in photos:
        f = p.get("file") if isinstance(p, dict) else p
        if f and not (ad_dir / "photos" / f).exists():
            err.append(f"hiányzó fotófájl: photos/{f}")
        if isinstance(p, dict) and not p.get("alt"):
            warn.append(f"nincs alt szöveg: {f}")
    listed = {p.get("file") for p in photos if isinstance(p, dict)}
    pdir = ad_dir / "photos"
    if pdir.exists():
        for f in sorted(pdir.iterdir()):
            if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp") and f.name not in listed:
                warn.append(f"fotó a mappában, de nincs az ad.md-ben: {f.name}")

    if len(meta.get("title") or "") > 60:
        warn.append(f"a cím {len(meta['title'])} karakter — a Jófogás ~60-nál vág")
    if "defects" not in meta:
        warn.append("nincs defects mező — üres listát is írj ki, ha tényleg hibátlan")

    shipping = as_list(meta.get("shipping"))
    if [s for s in shipping if s != "personal"] and not meta.get("package"):
        warn.append("szállítás van megadva, de nincs package (súly/méret) — a Jófogás kéri")

    if meta.get("status") == "active" and not as_list(meta.get("platforms")):
        warn.append("status: active, de nincs egy platform sem felsorolva")

    if not body.strip():
        warn.append("üres a leírás")

    return warn, err


# ─────────────────────────────────────────────────────────────────────────────
#  Photos
# ─────────────────────────────────────────────────────────────────────────────

FULL_MAX = 1600
THUMB_MAX = 480
OG_SIZE = (1200, 630)


def process_photos(meta, ad_dir, export):
    """Returns list of dicts describing rendered photos. Deterministic."""
    out = []
    src_dir = ad_dir / "photos"
    dst_dir = export / "photos"
    thumb_dir = dst_dir / "thumb"
    dst_dir.mkdir(parents=True, exist_ok=True)
    thumb_dir.mkdir(parents=True, exist_ok=True)

    for p in as_list(meta.get("photos")):
        if isinstance(p, str):
            p = {"file": p}
        name = p.get("file")
        if not name:
            continue
        src = src_dir / name
        if not src.exists():
            continue
        stem = Path(name).stem
        full = dst_dir / f"{stem}.jpg"
        thumb = thumb_dir / f"{stem}.jpg"

        if HAVE_PIL:
            try:
                im = Image.open(src)
                im = ImageOps.exif_transpose(im)
                rot = int(p.get("rotate") or 0) % 360
                if rot:
                    im = im.rotate(-rot, expand=True)
                crop = p.get("crop")
                if isinstance(crop, dict):
                    w, h = im.size
                    x0 = int(float(crop.get("x", 0)) * w)
                    y0 = int(float(crop.get("y", 0)) * h)
                    x1 = x0 + int(float(crop.get("w", 1)) * w)
                    y1 = y0 + int(float(crop.get("h", 1)) * h)
                    im = im.crop((max(0, x0), max(0, y0), min(w, x1), min(h, y1)))
                if im.mode not in ("RGB", "L"):
                    im = im.convert("RGB")
                big = im.copy()
                big.thumbnail((FULL_MAX, FULL_MAX), Image.LANCZOS)
                big.save(full, "JPEG", quality=86, optimize=True)
                small = im.copy()
                small.thumbnail((THUMB_MAX, THUMB_MAX), Image.LANCZOS)
                small.save(thumb, "JPEG", quality=82, optimize=True)
                if p.get("cover"):
                    og = ImageOps.fit(im, OG_SIZE, Image.LANCZOS, centering=(0.5, 0.4))
                    og.convert("RGB").save(export / "og.jpg", "JPEG", quality=86)
            except Exception as e:  # noqa: BLE001
                print(f"    ! fotóhiba {name}: {e}")
                shutil.copy2(src, full)
                shutil.copy2(src, thumb)
        else:
            shutil.copy2(src, full)
            shutil.copy2(src, thumb)
            if p.get("cover"):
                shutil.copy2(src, export / "og.jpg")

        out.append(
            {
                "src": name,
                "full": f"export/photos/{full.name}",
                "thumb": f"export/photos/thumb/{thumb.name}",
                "alt": p.get("alt") or meta.get("title", ""),
                "cover": bool(p.get("cover")),
            }
        )
    return out


# ─────────────────────────────────────────────────────────────────────────────
#  Platform exports
# ─────────────────────────────────────────────────────────────────────────────


def build_description(meta, body, plat: Platform):
    """The block you actually paste into the description box."""
    parts = [md_to_text(body)]

    defects = as_list(meta.get("defects"))
    if "defects" in meta:
        if defects:
            parts.append("HIBÁK, KOPÁSOK\n" + "\n".join(f"• {d}" for d in defects))
        else:
            parts.append("HIBÁK, KOPÁSOK\nHibátlan, sérülésmentes.")

    acc = as_list(meta.get("accessories"))
    if acc:
        parts.append("TARTOZÉKOK\n" + "\n".join(f"• {a}" for a in acc))

    attrs = meta.get("attributes") or {}
    if attrs and not plat.freeform:
        rows = [f"• {ATTR_HU.get(k, k.replace('_', ' ').capitalize())}: {v}"
                for k, v in attrs.items() if v not in (None, "")]
        if rows:
            parts.append("PARAMÉTEREK\n" + "\n".join(rows))

    ship = [SHIPPING_HU.get(s, s) for s in as_list(meta.get("shipping"))]
    tail = []
    if location_str(meta):
        tail.append(f"Helyszín: {location_str(meta)}")
    if ship:
        tail.append("Átvétel: " + ", ".join(ship))
    if g(meta, "contact.note"):
        tail.append(g(meta, "contact.note"))
    if tail:
        parts.append("\n".join(tail))

    if plat.include_keywords and as_list(meta.get("keywords")):
        parts.append("Címkék: " + ", ".join(as_list(meta["keywords"])))

    text = "\n\n".join(p for p in parts if p and p.strip())
    if len(text) > plat.body_max:
        # Drop whole trailing blocks rather than cutting mid-sentence.
        while len(parts) > 1 and len("\n\n".join(parts)) > plat.body_max:
            parts.pop()
        text = "\n\n".join(parts)
        if len(text) > plat.body_max:
            text = truncate_words(text, plat.body_max)
    return text


def truncate_words(s, limit):
    """Cut to `limit` without ever ending mid-word."""
    if len(s) <= limit:
        return s
    cut = s[: max(0, limit - 1)]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]
    return cut.rstrip(" ,;:—-") + "…"


def build_freeform(meta, body, plat: Platform):
    """A single paste-and-post block for Facebook groups.

    Head and tail are mandatory — price, defects and pickup must survive.
    Only the prose gets squeezed, and only at a paragraph boundary.
    """
    head = [meta.get("title", ""), f"{price_str(meta)} — {location_str(meta)}"]

    tail = []
    defects = as_list(meta.get("defects"))
    if defects:
        tail.append("Hibák: " + "; ".join(defects) + ".")
    ship = [SHIPPING_HU.get(s, s) for s in as_list(meta.get("shipping"))]
    if ship:
        tail.append("Átvétel: " + ", ".join(ship) + ".")
    tail.append("Érdeklődni privát üzenetben.")

    fixed = len("\n".join(head)) + len("\n".join(tail)) + 6  # blank-line separators
    budget = plat.body_max - fixed

    paras = paragraphs(body, lead_only=True)
    chosen = []
    for para in paras:
        if sum(len(c) + 2 for c in chosen) + len(para) > budget:
            break
        chosen.append(para)
    if not chosen and paras and budget > 80:
        chosen = [truncate_words(paras[0], budget)]

    parts = ["\n".join(head)]
    if chosen:
        parts.append("\n\n".join(chosen))
    parts.append("\n".join(tail))
    return "\n\n".join(parts).strip()


def build_export(meta, body, plat: Platform, photo_count, created):
    title = truncate_words(meta.get("title", ""), plat.title_max)

    if plat.freeform:
        desc = build_freeform(meta, body, plat)
        block = [
            f"### {plat.label.upper()} ###",
            f"# {plat.note}",
            "",
            "--- INNENTŐL MÁSOLD ---",
            desc,
            "--- IDÁIG ---",
            "",
            f"Fotók: export/photos/  ({photo_count} db, max {plat.photo_max})",
        ]
        return "\n".join(block) + "\n"

    desc = build_description(meta, body, plat)
    fields = [f"Ár: {price_str(meta)}"]
    if meta.get("condition"):
        fields.append(f"Állapot: {CONDITION_HU.get(meta['condition'], meta['condition'])}")
    if location_str(meta):
        fields.append(f"Helyszín: {location_str(meta)}")
    if g(meta, "location.postal"):
        fields.append(f"Irányítószám: {g(meta, 'location.postal')}")
    ship = [SHIPPING_HU.get(s, s) for s in as_list(meta.get("shipping"))]
    if ship:
        fields.append("Szállítás: " + ", ".join(ship))
    pkg = meta.get("package") or {}
    if pkg:
        size = pkg.get("size_cm")
        size_s = "×".join(str(x) for x in size) + " cm" if isinstance(size, list) else ""
        fields.append(f"Csomag: {pkg.get('weight_kg', '?')} kg  {size_s}".rstrip())
    if meta.get("category"):
        fields.append(f"Kategória (kézzel válaszd ki): {meta['category']}")

    notes = [f"# {plat.note}"] if plat.note else []
    if plat.expires_days and created:
        try:
            d = datetime.strptime(str(created), "%Y-%m-%d").date()
            notes.append(f"# Lejár: {d + timedelta(days=plat.expires_days)} "
                         f"({plat.expires_days} nap)")
        except ValueError:
            pass

    block = [f"### {plat.label.upper()} ###"]
    block += notes
    block += [
        "",
        f"--- CÍM ({len(title)}/{plat.title_max} karakter) ---",
        title,
        "",
        f"--- LEÍRÁS ({len(desc)}/{plat.body_max} karakter) ---",
        desc,
        "",
        "--- KITÖLTENDŐ MEZŐK ---",
        "\n".join(fields),
        "",
        f"--- FOTÓK ---",
        f"export/photos/  ({photo_count} db, max {plat.photo_max})",
    ]
    return "\n".join(block) + "\n"


# ─────────────────────────────────────────────────────────────────────────────
#  HTML
# ─────────────────────────────────────────────────────────────────────────────


def jsonld(meta, photos):
    cond_map = {
        "new": "NewCondition",
        "like-new": "UsedCondition",
        "used-good": "UsedCondition",
        "used-fair": "UsedCondition",
        "for-parts": "DamagedCondition",
    }
    avail = {
        "active": "InStock",
        "reserved": "LimitedAvailability",
        "sold": "SoldOut",
    }.get(meta.get("status"), "InStock")
    data = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": meta.get("title"),
        "description": (meta.get("subtitle") or meta.get("title") or ""),
        "image": [p["full"] for p in photos] or None,
        "brand": g(meta, "attributes.brand"),
        "offers": {
            "@type": "Offer",
            "price": g(meta, "price.amount"),
            "priceCurrency": g(meta, "price.currency", "HUF"),
            "itemCondition": "https://schema.org/" + cond_map.get(meta.get("condition"), "UsedCondition"),
            "availability": "https://schema.org/" + avail,
            "areaServed": location_str(meta) or None,
        },
    }
    return json.dumps({k: v for k, v in data.items() if v is not None},
                      ensure_ascii=False, indent=2)


def render_html(meta, body, photos, exports, warnings, css):
    t = html.escape(meta.get("title", ""))
    status = meta.get("status", "draft")
    cover = next((p for p in photos if p["cover"]), photos[0] if photos else None)

    gallery = "\n".join(
        f'<figure class="shot"><a href="{p["full"]}" target="_blank">'
        f'<img src="{p["thumb"]}" alt="{html.escape(p["alt"])}" loading="lazy"></a>'
        f'<figcaption>{html.escape(p["alt"])}</figcaption></figure>'
        for p in photos
    )

    facts = []

    def row(k, v):
        if v not in (None, "", []):
            facts.append(f"<tr><th>{html.escape(k)}</th><td>{html.escape(str(v))}</td></tr>")

    row("Állapot", CONDITION_HU.get(meta.get("condition"), meta.get("condition")))
    row("Kategória", meta.get("category"))
    for k, v in (meta.get("attributes") or {}).items():
        row(ATTR_HU.get(k, k.replace("_", " ").capitalize()), v)
    row("Helyszín", location_str(meta))
    row("Átvétel", ", ".join(SHIPPING_HU.get(s, s) for s in as_list(meta.get("shipping"))))
    pkg = meta.get("package") or {}
    if pkg:
        size = pkg.get("size_cm")
        row("Csomag", f"{pkg.get('weight_kg','?')} kg" +
            (", " + "×".join(str(x) for x in size) + " cm" if isinstance(size, list) else ""))

    defects = as_list(meta.get("defects"))
    defect_html = ""
    if "defects" in meta:
        items = "".join(f"<li>{html.escape(d)}</li>" for d in defects) or "<li>Hibátlan, sérülésmentes.</li>"
        defect_html = f'<section class="defects"><h2>Hibák, kopások</h2><ul>{items}</ul></section>'

    acc = as_list(meta.get("accessories"))
    acc_html = ""
    if acc:
        acc_html = ('<section><h2>Tartozékok</h2><ul>'
                    + "".join(f"<li>{html.escape(a)}</li>" for a in acc) + "</ul></section>")

    plat_rows = []
    for entry in as_list(meta.get("platforms")):
        if not isinstance(entry, dict):
            entry = {"name": entry}
        p = PLATFORMS_BY_KEY.get(entry.get("name"))
        label = p.label if p else str(entry.get("name"))
        st = entry.get("status", "pending")
        note = entry.get("note", "")
        url = entry.get("url")
        link = f'<a href="{html.escape(url)}" target="_blank">megnyitás</a>' if url else ""
        plat_rows.append(
            f'<tr><td>{html.escape(label)}</td>'
            f'<td><span class="pill pill-{html.escape(st)}">'
            f'{html.escape(PLATFORM_STATUS_HU.get(st, st))}</span></td>'
            f'<td>{html.escape(note)} {link}</td></tr>'
        )
    plat_html = ""
    if plat_rows:
        plat_html = ('<section><h2>Hol van fent</h2><table class="facts">'
                     + "".join(plat_rows) + "</table></section>")

    tabs, panes = [], []
    for i, (key, label, text) in enumerate(exports):
        active = " active" if i == 0 else ""
        tabs.append(f'<button class="tab{active}" data-t="{key}">{html.escape(label)}</button>')
        panes.append(
            f'<div class="pane{active}" id="pane-{key}">'
            f'<button class="copy" data-for="{key}">Szöveg másolása</button>'
            f'<pre id="txt-{key}">{html.escape(text)}</pre></div>'
        )

    warn_html = ""
    if warnings:
        warn_html = ('<div class="warn"><strong>Figyelmeztetések</strong><ul>'
                     + "".join(f"<li>{html.escape(w)}</li>" for w in warnings) + "</ul></div>")

    og_img = "export/og.jpg" if cover else ""

    return f"""<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t}</title>
<meta name="description" content="{html.escape(meta.get('subtitle') or t)}">
<meta property="og:type" content="product">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{html.escape(meta.get('subtitle') or t)}">
<meta property="og:image" content="{og_img}">
<meta property="og:locale" content="hu_HU">
<meta property="product:price:amount" content="{g(meta,'price.amount','')}">
<meta property="product:price:currency" content="{g(meta,'price.currency','HUF')}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
{jsonld(meta, photos)}
</script>
<style>
{css}
</style>
</head>
<body data-status="{html.escape(status)}">
<div class="wrap">

<header class="head">
  <div>
    <span class="pill pill-{html.escape(status)}">{html.escape(STATUS_HU.get(status, status))}</span>
    <h1>{t}</h1>
    {f'<p class="sub">{html.escape(meta["subtitle"])}</p>' if meta.get("subtitle") else ""}
  </div>
  <div class="price">{html.escape(price_str(meta))}</div>
</header>

{warn_html}

<div class="cols">
  <main>
    <section class="gallery">{gallery}</section>
    <section class="prose">{md_to_html(body)}</section>
    {defect_html}
    {acc_html}
  </main>
  <aside>
    <h2>Adatok</h2>
    <table class="facts">{''.join(facts)}</table>
    {plat_html}
  </aside>
</div>

<section class="exports">
  <h2>Hirdetésszövegek</h2>
  <div class="tabs">{''.join(tabs)}</div>
  {''.join(panes)}
</section>

<footer>
  <code>{html.escape(meta.get('id',''))}</code> · létrehozva {html.escape(str(meta.get('created','')))}
  · generálta a <code>build.py</code> · a forrás: <code>ad.md</code>
</footer>
</div>

<script>
document.querySelectorAll('.tab').forEach(b => b.onclick = () => {{
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.pane').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  document.getElementById('pane-' + b.dataset.t).classList.add('active');
}});
document.querySelectorAll('.copy').forEach(b => b.onclick = async () => {{
  const el = document.getElementById('txt-' + b.dataset.for);
  let txt = el.textContent;
  const m = txt.match(/--- INNENTŐL MÁSOLD ---\\n([\\s\\S]*?)\\n--- IDÁIG ---/);
  if (m) txt = m[1];
  try {{ await navigator.clipboard.writeText(txt); b.textContent = 'Kimásolva ✓'; }}
  catch (e) {{ b.textContent = 'Nem sikerült — jelöld ki kézzel'; }}
  setTimeout(() => b.textContent = 'Szöveg másolása', 1800);
}});
</script>
</body>
</html>
"""


# ─────────────────────────────────────────────────────────────────────────────
#  Build
# ─────────────────────────────────────────────────────────────────────────────


def clean_export(export: Path):
    """Remove previous artifacts without requiring directory-delete permission.

    Network shares, synced folders and sandboxed mounts sometimes refuse
    rmtree on a directory. Files are always overwritable, so delete file by
    file and tolerate failures — a stale leftover is a cosmetic problem,
    a failed build is not.
    """
    if not export.exists():
        return
    for p in sorted(export.rglob("*"), key=lambda x: len(x.parts), reverse=True):
        try:
            if p.is_file() or p.is_symlink():
                p.unlink()
            elif p.is_dir():
                p.rmdir()
        except OSError:
            pass


def build_ad(ad_dir: Path, check_only=False):
    md = ad_dir / "ad.md"
    if not md.exists():
        return None
    meta, body = parse_ad(md)
    warnings, errors = validate(meta, body, ad_dir)

    print(f"  {ad_dir.name}")
    for e in errors:
        print(f"    HIBA:  {e}")
    for w in warnings:
        print(f"    figy.: {w}")
    if errors:
        return {"id": ad_dir.name, "meta": meta, "ok": False}
    if check_only:
        return {"id": ad_dir.name, "meta": meta, "ok": True}

    export = ad_dir / "export"
    clean_export(export)
    export.mkdir(parents=True, exist_ok=True)

    photos = process_photos(meta, ad_dir, export)

    wanted = {e.get("name") if isinstance(e, dict) else e
              for e in as_list(meta.get("platforms"))}
    targets = [p for p in PLATFORMS if p.key in wanted] or PLATFORMS

    exports = []
    for plat in targets:
        text = build_export(meta, body, plat, len(photos), meta.get("created"))
        (export / f"{plat.key}.txt").write_text(text, encoding="utf-8")
        exports.append((plat.key, plat.label, text))

    css_file = TEMPLATES / "ad.css"
    css = css_file.read_text(encoding="utf-8") if css_file.exists() else ""
    page = render_html(meta, body, photos, exports, warnings, css)

    # Hard guarantee: the private floor price never leaks into any artifact.
    floor = g(meta, "price.floor")
    if floor and floor != g(meta, "price.amount"):
        blob = page + "".join(t for _, _, t in exports)
        if str(floor) in blob or huf(floor) in blob:
            raise SystemExit(f"BIZTONSÁGI HIBA: a price.floor ({floor}) megjelent a kimenetben!")

    (ad_dir / "index.html").write_text(page, encoding="utf-8")
    print(f"    -> index.html, {len(exports)} export, {len(photos)} fotó")
    return {"id": ad_dir.name, "meta": meta, "ok": True, "cover":
            (photos[0]["thumb"] if photos else None)}


def main(argv):
    check_only = "--check" in argv
    args = [a for a in argv if not a.startswith("--")]

    if args:
        dirs = [Path(a).resolve() for a in args]
    else:
        dirs = sorted(d for d in ADS.iterdir() if d.is_dir()) if ADS.exists() else []

    if not dirs:
        print("Nincs egyetlen hirdetés sem az ads/ mappában.")
        print("Tegyél fotókat az inbox/ mappába, és indítsd a hirdetés-készítő skillt.")
        return 0

    print(f"second-hand build — {len(dirs)} hirdetés"
          + ("" if HAVE_PIL else "   (Pillow nincs telepítve; a fotók átmásolódnak méretezés nélkül)"))
    results = []
    failed = 0
    for d in dirs:
        try:
            r = build_ad(d, check_only)
            if r:
                results.append(r)
                if not r["ok"]:
                    failed += 1
        except Exception as e:  # noqa: BLE001
            print(f"    ÖSSZEOMLÁS: {type(e).__name__}: {e}")
            failed += 1

    print(f"\nKész. {len(results) - failed} rendben, {failed} hibás.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
