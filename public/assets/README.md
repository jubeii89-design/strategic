# Art drop-in

The game renders crisp CSS/SVG cards and a typographic intro out of the box.
Drop real art here and it is picked up automatically — a missing file always
falls back to the built-in rendering, so nothing ever breaks.

## Logo

`public/assets/logo.png` — the Strategic Titans crest, shown on the intro
screen (square works best; it is masked to a circle). PNG or SVG.

## Cards

`public/assets/cards/<Name>.png`, one file per card, using the original game's
sprite names (from `Engine.LookupAndLoadCardSprite`):

- Spades: `Spades_A`, `Spades_2` … `Spades_10`, `Spades_J`, `Spades_Q`, `Spades_K`
- Hearts: `Hearts_A` … `Hearts_K`
- Clubs: `Clubs_A` … `Clubs_K`
- Diamonds: `Diamonds_A` … `Diamonds_K`
- Blank hole-filler: `RBC`

Example: `public/assets/cards/Spades_A.png`, `public/assets/cards/Hearts_10.png`.

The four sprite sheets from the original game need to be sliced into these 52
individual PNGs (portrait, transparent or card-coloured background). Until then
the SVG cards are shown.

## Course background (optional)

`public/assets/course.jpg` (or `.png` / `.webp`) — a top-down golf-course
image used as the Golf-mode / intro background. If present it replaces the
built-in hand-drawn SVG course; if absent, the SVG is shown. A landscape image
around 1600×900 or larger works best (it is cover-scaled).
