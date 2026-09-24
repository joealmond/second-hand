# inbox

**One folder per object.** Give it any short name you'll recognise:

```
inbox/
├── bicikli/
│   ├── IMG_4821.jpg
│   └── IMG_4822.jpg
└── mosogatogep/
    └── ...
```

Then ask Claude for a new ad and **name the folder**:

- `csináljunk egy hirdetést bicikli`
- `/uj-hirdetes mosogatogep`
- `make an ad` — no name: Claude lists the folders and asks which one

Several folders can wait here at once; Claude processes them one at a time, one
ad per folder, and never mixes photos across folders.

The skill will read the photos, ask you a few questions, **move** them into
`ads/<date>-<slug>/photos/` renamed `01.jpg`, `02.jpg`, … and delete the emptied
item folder.

So a folder left here means an item that hasn't been listed yet. If a folder
you've already done is still here, something didn't finish.

## What makes a good set of photos

The cover photo does most of the selling. Everything else is confirmation.

1. **The whole object**, well lit, plain-ish background, filling the frame. This
   becomes `01.jpg` and the thumbnail every buyer sees first.
2. Two or three from other angles.
3. Any **label, model number, serial plate** — buyers search for these.
4. **Every defect, close up.** Photographing a scratch does not cost you the
   sale. Discovering it in person does.
5. Accessories that are included, in one shot together.

Daylight, no flash. Landscape orientation survives cropping better on Facebook.
Wipe the object first — it's the cheapest thing you can do to the price.

Optionally add a `.txt` or `.md` file **inside the item's folder** with notes:
price, age, what's wrong with it, why you're selling. Claude will use it and ask
fewer questions.
