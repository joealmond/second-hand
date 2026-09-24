# ads

One folder per item. **This is the database.**

```
2026-07-30-noi-kerekpar-csepel/
├── ad.md        ← source of truth. Edit this.
├── photos/      ← originals. Never modified.
├── index.html   ← generated
└── export/      ← generated
```

Edit `ad.md`, then `python3 scripts/build.py`. Never edit `index.html` or
anything in `export/` — they are overwritten on every build.

Folder names are `YYYY-MM-DD-slug` and must match the `id:` field.
**Never rename a folder after publishing** — the slug becomes the public URL.

The public source repository contains no seller records or original photos. Create your
own folder under `ads/`; local records stay out of Git by default.
