# TAI — UI Direction

Research-first design direction for Tai Manic Studios. Written before implementation, so the
build has a thesis to execute rather than a style to guess at.

---

## 0. Revision — direction change (F8, current)

> **This is the active direction. It supersedes the "From Sketch to Skin" recommendation in
> sections 5 and 7 below, which are kept for their research trail, not as the build target.**

The studio chose a **bold, art-forward streetwear** direction after reviewing the paper-and-graphite
build against a reference streetwear storefront. The site now reads like a contemporary apparel
label whose product happens to be hand-drawn African art, rather than like a quiet gallery.

**What changed from the original recommendation**

- **Dark stages are allowed and wanted.** The hero and accent panels are near-black
  (`neutral-950`), full-bleed, with the artwork behind a scrim. Colour is no longer withheld as a
  reward; the work is loud from the first screen.
- **Type is bold, condensed and uppercase.** Space Grotesk set large, `font-bold uppercase
tracking-tight`, is the display voice. Confident, not quiet.
- **Text may sit over artwork** where a legibility scrim carries it (a deliberate, controlled use of
  the thing section 3 originally forbade — see the revised guardrails).
- **Cards are product tiles.** Rounded image tiles with an overlaid badge (NEW / status), an
  uppercase title and a price. The marketplace-grid taboo is lifted; the badge and the price are
  features, not clutter.
- **Numbered pillar strips** (01–05) replace the "museum caption" restraint as the hero's
  supporting device.

**What did NOT change — the non-negotiables that keep this from becoming a generic template**

- **The art is still the subject.** Every hero and tile is a real drawing from `/public/artworks`.
  No stock photography, no fake model shots. When a drawing is used behind a dark scrim it is chosen
  for it (e.g. the night pieces).
- **The Africanness stays specific.** Real cities, the muse and her cap, real artefacts. No
  "tribal" pattern tax, no costume.
- **Honesty in commerce.** No fabricated "was" prices or fake discounts (ADR-015 — price lives on
  the approved artwork+garment pair). Placement is still the studio's approved decision, not a
  freeform slider (ADR-013).
- **Warm ground for browsing.** Away from the dark hero/accent panels the page ground stays warm
  paper (`canvas`), never cool grey. Dark is used as punctuation, not as the whole site.

The revised guardrails (section 3) and design-system principles (section 7) below carry the current
rules; where they conflict with the original section 5, the current rules win.

---

## 1. Research findings

### The most important finding is in our own repository

The brief describes TAI as "a modern custom art-on-apparel website". That description is true and
almost useless — it fits Redbubble, Teespring and a thousand Shopify stores. The actual brand is
far more specific, and the specificity is the entire opportunity:

**TAI is Tai Manic Studios. The line is "From Africa, to You." The artwork is African.**

The library is not abstract or decorative. It is: Addis Coffee Garden, Nile Legacy, Kenya
Heritage, Ancestral Sisters, Lagos Market Muse, Okada Run, Harmattan Bloom, Four Corners of
Africa. Prices are in naira. This is a Nigerian-rooted, pan-African art house that puts its
drawings on shirts.

Any direction that could be applied unchanged to a Berlin streetwear label is the wrong direction.

### What the artwork actually looks like

I examined the real files rather than trusting the copy. The art has a consistent, ownable
signature:

- **Coloured pencil and marker on paper.** Warm, saturated, hand-made. Visible paper tooth,
  deckle edges, drawn borders. Nothing vector, nothing cold.
- **Selective colour on graphite.** This is the signature. In _Four Corners of Africa_ the figure
  is fully rendered — skin, kente, Ndebele beadwork, denim — while the world behind her stays
  loose pencil. Colour is spent only where it matters.
- **A recurring muse.** The same woman appears city to city, wearing a cap that reads _"from
  Lagos to you"_, _"from Addis to you"_, _"from NIGERIA to you"_. She is the brand's continuity
  device, and she is already drawn.
- **Comic-panel structure.** _Four Corners_ is literally a 2×2 page with gutters and a speech
  bubble ("A gift from Lagos, Nigeria!").
- **Cultural precision.** Ethiopian crosses and Ge'ez script, a jebena coffee pot, Ghana Gold
  cocoa, Table Mountain, protea, adire geometry. Specific places, not "Africa" as a mood.
- **Warm sunset palette** where colour appears: magenta, violet, orange, teal.

### The artist's process is in the files, in three stages

This is the finding the whole direction rests on, and it is verifiable:

| Stage                  | Example file             | State                                                        |
| ---------------------- | ------------------------ | ------------------------------------------------------------ |
| 1. Construction sketch | `nigeria-muse-sketch`    | Graphite, figure-drawing cylinders still visible on the arms |
| 2. Selective colour    | `four-corners-of-africa` | Figure coloured, world still pencil                          |
| 3. Full colour         | `market-day`             | Fully rendered, sunset palette                               |

We are not inventing a story about craft. We have the receipts. **Sketch → colour → skin** is what
actually happened, and no competitor can copy it without learning to draw.

### Two problems this research surfaced

**The site's copy describes different art than the site's art.** Mock descriptions say "ink and
neon", "a single unbroken line", "confident, tangled linework", "comic-panel study". The real
pieces are warm, full-figure, coloured-pencil illustrations. The words were written before the art
arrived. This is content debt and it will read as inauthentic — fix the copy to the art, never the
reverse.

**The in-flight F6 palette fights the artwork.** F6 moved to a "cool gallery-neutral palette with
teal secondary". The art is warm — paper cream, sunset magenta, terracotta skin. A cool grey-teal
frame around a hot magenta drawing makes the drawing look dirty. This needs to be reversed before
more UI is built on it.

### Market research

Claude in Chrome was not connected, so **the logged-in Pinterest session was unreachable**. Public
Pinterest returns keyword chips with no usable imagery. I went to primary sources instead, which is
better evidence anyway.

**Daily Paper** (Amsterdam, African-diaspora streetwear — the closest real comparable): full-bleed
editorial photography hero, centred wordmark, near-zero chrome. Strong. Then it opens a **10% off
modal over the brand moment**, under a "SUMMER SALE" banner, with a chat bubble in the corner. The
brand spends its first impression on a discount. That is the exact tension TAI must resolve: it is
possible to look premium and behave like a coupon site.

**Zeitz MOCAA** (Cape Town — the largest contemporary African art museum on earth): a carousel with
prev/next arrows, and a dark rounded panel sitting **on top of the artwork**, cropping it and
covering the subject. Even the flagship institution for African contemporary art ships a template.

The conclusion is not "these sites are bad". It is that **African art and fashion are badly
underserved by great web design**. There is no Aesop of African illustration commerce. That
position is unclaimed, and TAI has the artwork to claim it.

---

## 2. Pattern synthesis

**Worth emulating**

- Full-bleed imagery as the hero. The work is the argument; nothing should precede it.
- Ruthlessly minimal chrome. Daily Paper's header is a wordmark and three icons. Correct.
- Museum caption discipline: title, medium, edition, year — set small, set quietly, never sold.
- Generous margins. Premium reads as confidence to leave space.
- One idea per screen.

**Worth stealing specifically for TAI (from the art, not from other sites)**

- Comic gutters as a layout grid. The art already uses panels; the site can share the grid.
- Selective colour as an interface rule, not just a drawing technique.
- The cap-and-city device as a wayfinding motif for collections.
- Construction lines as loading states — the figure's underdrawing _is_ a skeleton screen, and
  it's brand-true instead of a grey rectangle.

**The gap in the market**

Nobody is presenting African illustration commerce with real design discipline. The category
default is either a marketplace grid or a museum template. TAI can be the first that looks like
what it is.

---

## 3. What to avoid (revised for the current direction)

- **Discount modals over the first impression.** Still true. No welcome-offer popup over the hero.
  A promo may live in a bar or after the work, never as a modal over the brand moment.
- **Fabricated discounts.** No struck-through "was" prices, no invented urgency. Prices are real
  (ADR-015). The reference streetwear site fakes `$89 ~~$120~~`; we do not.
- **Text over artwork _without_ a legibility scrim.** Overlaying is now allowed, but only with a
  gradient scrim strong enough to keep contrast (WCAG AA) on the text. Never drop raw text onto a
  busy drawing and hope.
- **Carousels with arrows.** Still avoided. The numbered pillar strip is static; the work does not
  hide behind prev/next.
- **Cool neutrals as the ground.** The browsing ground stays warm paper. Dark surfaces are
  intentional near-black stages, not a cool grey-teal wash. (The original F6 error still stands.)
- **Stock photography / fake product shots.** Every image is a real drawing. No model photos we do
  not have; no AI-generated garment mockups.
- **Gimmick motion.** Anything that says "look at the website" instead of "look at the drawing".
  Hover-scale on a tile and a settling transition are fine; bounce/parallax theatre is not.
- **Erasing the Africanness into tasteful minimalism, _or_ into generic streetwear.** The gravest
  risk, now from two sides: sanding the work down to a beige grid, or dressing it up as an
  anonymous hype label. The art's specificity — the muse, the cities, the artefacts — must survive
  the bold treatment.

---

## 4. Concept directions

### Direction A — "The Sketchbook"

- **Vibe:** you are inside the artist's working book. Paper ground, graphite furniture, colour only
  where a piece is finished.
- **Why it fits:** the material is taken from the art itself. The site becomes the page the drawing
  lives on.
- **Homepage:** one full-bleed finished piece, a caption, and nothing else above the fold.
- **Browsing artworks:** a wall of paper; hovering warms a piece into colour.
- **Browsing garments:** blanks presented as sketch — they are the unpainted canvas.
- **Customisation:** choosing artwork paints the shirt.
- **Type:** a warm humanist body face; a display face with drawn, slightly irregular character.
- **Motion:** ink and wash — colour bleeding, not sliding.
- **3D:** none. Paper is flat; that is the point.
- **Pros:** deeply authentic, cheap to run, ages well.
- **Risks:** adjacent to the cream/serif AI default; needs real precision to avoid looking like a
  Squarespace template.

### Direction B — "Panel"

- **Vibe:** the site as a comic page. Gutters are the grid; panels are the components.
- **Why it fits:** _Four Corners of Africa_ already is this.
- **Homepage:** an asymmetric panel page — one large, several small, real gutters.
- **Browsing:** panels; a click expands a panel to full bleed.
- **Customisation:** a strip of panels — artwork, garment, colour, placement — read left to right.
- **Type:** confident, slightly condensed display; speech-bubble microcopy used sparingly.
- **Motion:** panel-to-panel; things arrive by gutter, not by fade.
- **3D:** none.
- **Pros:** highly distinctive, structurally original, mobile-friendly (panels stack).
- **Risks:** can tip into novelty; comics read as casual, which can undercut premium pricing.

### Direction C — "The Muse"

- **Vibe:** character-led editorial. The recurring woman is the brand; each city is an issue.
- **Why it fits:** she already exists in every piece, cap and all.
- **Homepage:** full-bleed muse portrait; the cap names the city; the city is the collection.
- **Browsing:** by city — Lagos, Addis, Accra, Cape Town — as chapters, not filters.
- **Customisation:** secondary; the story sells first.
- **Type:** magazine masthead energy.
- **Motion:** cinematic and slow; a portrait holds.
- **3D:** none.
- **Pros:** the strongest brand story; genuinely ownable; makes collections meaningful.
- **Risks:** editorial can smother commerce; needs real writing, and thin copy will show.

### Direction D — "Night Market"

- **Vibe:** _Midnight in Lagos_. Dusk palette, warm neon, saturated dark.
- **Why it fits:** it takes its cue from the most striking piece in the library.
- **Homepage:** dark, hot, glowing.
- **Type:** high contrast on dark.
- **Motion:** glow, bloom, drift.
- **3D:** optional atmospheric depth.
- **Pros:** immediate wow; photographs well.
- **Risks:** **the art is on white paper.** A dark UI puts a bright white rectangle on every screen
  and every drawing becomes a lightbox. It fights the medium. Also the near-black + accent AI
  default. _Not recommended._

### Direction E — "Atelier" (3D)

- **Vibe:** the garment as object. Light, fabric, weight, the print sitting on cotton.
- **Why it fits:** it answers the one question commerce must answer — what will I actually receive?
- **Customisation:** an apparel preview you can turn.
- **3D:** yes, but confined to the product moment.
- **Pros:** best possible product confidence; genuine wow at the decision point.
- **Risks:** expensive; heavy; a bad 3D shirt looks cheaper than a good photograph; and ADR-013
  means placement is approved, not dragged — a 3D toy that implies free positioning would lie about
  what we sell.

---

## 5. Recommended direction

### "From Sketch to Skin" — A + B, with C as the editorial layer

Take **The Sketchbook** as the material, **Panel** as the grid, and **The Muse** as the story. They
are not three directions; they are three layers of one idea, and all three come from the same
drawings.

**The thesis:** _every piece exists as a sketch before it exists in colour, and as colour before it
exists on cotton. The site shows that journey, because we have it._

**The signature — colour as reward.** The interface is paper and graphite. The artwork is the only
saturated thing on screen. Every appearance of colour is earned:

- A gallery of graphite sketches; the piece under attention warms into full colour.
- Loading is a construction-line drawing, not a grey box — we already own the underdrawings.
- Choosing an artwork for a shirt is the moment the shirt gains colour.

This is a rule a competitor cannot copy without the artist's actual process files, and it is
enforced by the product's own reality rather than by taste alone.

**Why this wins**

- It is the only direction derived from TAI's evidence instead of from other websites.
- It solves the premium problem structurally: restraint everywhere makes the art loud without
  the art having to shout.
- It makes the Studio honest. ADR-013 says the customer picks approved placements, not free
  geometry. "Choose the piece; the studio has already decided how it sits" is a _brand_ statement,
  not an apology for a constraint. The design language turns our biggest UX limitation into
  curation.
- It carries the Africanness without costume. Specific cities, specific artefacts, the muse's cap —
  no mud-cloth borders, no "tribal" pattern tax.

**The risk, stated honestly:** paper + graphite sits one bad decision away from the cream-and-serif
AI default. The defence is that every choice must trace to a file in `/public/artworks`. If a
detail cannot be traced to the drawings, it is decoration and it gets cut.

---

## 6. Page-by-page vision

**Home** — one finished piece, full bleed, uncovered. A caption in the corner: title, city, medium.
One line of brand: _From Africa, to you._ No modal, no banner, no carousel. Scroll reveals the
current city chapter, then a panel page of recent work, then the process strip (sketch → colour →
shirt).

**Artworks** — the wall. Paper-white, generous gutters, pieces at rest in graphite where a sketch
exists. Attention warms one piece into colour. Filters are cities and collections, set as quiet
text, not chips.

**Artwork detail** — the piece, uncovered, as large as the viewport allows. Beside it: the story,
the city, the edition. Below: the sketch it came from — the strongest proof of authorship we have.
Then: the garments it is approved for.

**Garments (blanks)** — deliberately the quietest page. Sketch-state shirts, honest specs, fabric
weight, fit. This page's job is trust, not seduction. It is the unpainted canvas.

**Design Studio** — a panel strip: artwork → garment → colour → placement → scale. The preview is
the hero and holds still. Approved placements are presented as the studio's decision: "Centre
chest, printed at 280 × 350 mm." Confidence, not limitation.

**Cart / checkout** — paper, quiet, no upsell. Every line shows what was made: piece, city,
garment, placement. Money is the only other colour on the page.

**Story / editorial** — the Muse layer. City chapters with real writing.

---

## 7. Design system principles (current — streetwear direction)

**Visual tone.** Two registers, used deliberately. **Warm paper** (`canvas`) is the browsing
ground — lists, detail pages, reading. **Near-black stages** (`neutral-950`) are the punctuation —
the hero, the studio/brand accent panels, badge pills. The art is always the loudest thing; the
dark stages exist to make it louder, not to theme the whole site.

**Colour philosophy.** Saturation belongs to the artwork. Chrome is achromatic (paper, ink,
near-black, white). The warm accent (`accent`, a burnt ochre) is the single interactive colour for
non-pill controls (links, form focus). Money is stated plainly. No decorative colour that is not
artwork, accent, or a CTA.

**Component philosophy.** The card is a **product tile**: a rounded image (or dark type tile where
no image exists), an overlaid badge (NEW / status), an uppercase title, and a price or meta line.
Tiles may overlay a badge on the image; they may not bury the image under chrome. Detail pages
still show the whole piece, uncropped.

**Type.** Space Grotesk is the display voice — large, `font-bold uppercase tracking-tight` for
heroes and section titles; `text-xs uppercase tracking-[0.2em]` for eyebrows. IBM Plex Sans is the
body/reading face. Prices and titles on tiles use the display face for weight.

**CTAs.** The pill is the primary action: a rounded pill with a small circular arrow badge. Two
tones — dark pill (near-black on paper) on light surfaces, white pill on dark stages. Secondary
actions are outline/ghost. One primary pill per view.

**Spacing.** Generous. Section rhythm is `py-16`/`py-20`; tiles breathe in a 1/2/3 responsive grid
with `gap-6`. Cramped still reads cheap.

**Motion.** Restrained and physical, built on the shared `--duration-*` / `--ease-emphasis`
tokens, animating transform + opacity only. The vocabulary, in order of how often it fires:

- **Hover** — a tile image `scale-[1.03]`, pill arrows nudge. Gated to fine pointers.
- **Scroll-reveal** (`components/site/reveal.tsx`) — the signature entrance: sections and grid
  tiles fade + rise once as they enter view, with a capped 40–80ms per-item stagger. Prevents
  content teleporting in on a page seen occasionally.
- **Accordion** (`components/site/accordion.tsx`) — product details expand with a real
  `grid-rows` height transition instead of snapping (state indication).
- **Marquee** — one decorative brand ticker, `aria-hidden`, paused on hover.

No parallax, no bounce, no attention-seeking scroll theatre. Everything respects
`prefers-reduced-motion` — reveals resolve instantly, the marquee stops, the accordion jumps.

**Imagery.** Real drawings only, from `/public/artworks`. Never crop the subject out on a detail
page. On a tile or hero, a considered crop (`object-cover`) is allowed; behind a dark scrim, pick a
piece that suits the dark (the night studies). Deckle/paper edges are welcome but no longer
mandatory.

**Africanness.** Non-negotiable and specific. The muse, her cap, named cities, real artefacts.
Bold treatment must not sand this off; if a screen could belong to any hype label, it has failed.

**3D.** Not in this phase (unchanged). ADR-013 forbids implying freeform placement; a 3D toy would
lie about what we sell.

**Consistency rules.** Warm paper is the default ground; dark is used as intentional stages, not
scattered. One display face, one body face, one accent, one primary pill per view. If a page needs
a brand-new component to feel special, prefer composing the existing kit first.

---

## 8. Implementation approach

1. **Fix the foundation first.** Reverse the F6 cool-neutral/teal palette to warm paper and
   graphite. Everything else compounds on this.
2. **Fix the copy to match the art.** Retire "ink and neon" and "unbroken line". Write to the
   pieces that exist. This is a writing task, not a code task, and it should not be automated.
3. **Build the frame, not the pages.** Ground, type scale, caption component, panel grid, the
   colour-reveal primitive. Two components carry this direction: the _plate_ (a framed piece with a
   caption that never covers it) and the _panel grid_.
4. **Prove it on the Artworks wall**, the highest-traffic surface and the purest test of the
   signature.
5. **Then the Studio**, where the approved-placement story has to land.
6. **Verify in a browser at every step** — screenshots, mobile, reduced motion, keyboard focus.

**Cost/reality note.** The colour-reveal signature needs both states per piece. We have sketches
for some pieces, not all. Either the artist supplies sketches for the rest, or the reveal degrades
gracefully (pieces without a sketch simply rest in colour). Decide this before building the wall —
it changes the component's contract.

---

## 9. Next steps

1. **Decide the direction** (recommendation: "From Sketch to Skin").
2. **Confirm the sketch inventory** — which pieces have a sketch state, and will more be drawn?
3. **Reverse the F6 palette** to warm paper/graphite.
4. **Rewrite artwork copy** to the real art.
5. **Build the plate + panel grid**, prove on Artworks, then Studio.

**Open conflict:** F6 (`claude/f6-premium-ui-overhaul`) is mid-flight on the cool-neutral palette
and still carries the freeform placement work ADR-013 forbids. This direction and that branch
disagree on both. Reconcile before either lands.

**Stated limitation:** the logged-in Pinterest session was unreachable (Claude in Chrome not
connected), so no moodboard research was possible. The direction is instead grounded in primary
sources: the artwork files themselves, and two live comparables. I consider the artwork the
stronger evidence, but a Pinterest pass could still enrich the type and photography choices.
