# Artwork images

Drop your artwork files here and they appear across the site automatically —
gallery, hero, artwork pages — with no code changes.

## How it works

Each artwork has a **slug** (its URL id). Save the piece as a file named after
that slug — that's the only step:

```
public/artworks/<slug>.jpg      (.jpg preferred; .png / .webp also work)
```

Example: `public/artworks/midnight-in-lagos.jpg`

No code to edit. The server checks this folder and shows your file wherever that
piece appears; if a file is missing, it shows a drawn placeholder plate instead —
nothing breaks. (In dev, restart `pnpm dev` after adding files so they're picked
up.)

## The eight catalogue slugs (save one image per name)

Pick whichever of your pieces fits each name — you can rename anytime.

| Save as filename                | Suggested piece (from what you sent)                    |
| ------------------------------- | ------------------------------------------------------- |
| `midnight-in-lagos.jpg`         | Rooftop woman, teal patterned top, Lagos sunset (HERO)  |
| `market-day.jpg`                | Woman in the market with the "from africa to you" cap   |
| `paper-tigers.jpg`              | Bold black-background piece (Ashanti stool / comic)     |
| `harmattan-bloom.jpg`           | A florals / colour-pencil seasonal piece                |
| `lantern-keeper.jpg`            | A warm night / single-figure piece                      |
| `the-getaway.jpg`               | A dynamic / action piece                                |
| `rainy-season.jpg`              | A softer colour-pencil study                            |
| `okada-run.jpg`                 | A motion / street piece                                 |

Recommended: roughly square-ish (4:5) or portrait, at least 1200px on the short
edge, under ~500 KB each (compress large exports).

The landing-page **hero** uses `midnight-in-lagos` — whatever you save there
becomes the big hero image.
