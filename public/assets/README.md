# Art drop-in

The game renders crisp CSS/SVG cards and a typographic intro out of the box.
Drop real art here and it is picked up automatically — a missing file always
falls back to the built-in rendering, so nothing ever breaks. This directory
is shared by both site pages — the marketing portal at `/` and the game at
`/play/` — so an image dropped in here shows up on both.

## Logo

`public/assets/logo.png` (or `logo.jpg`) — the Strategic Titans crest, shown on
the intro screen (square works best; it is masked to a circle). The real crest is
checked in as `logo.png`. To replace it, overwrite the file via GitHub web upload
or push a new image. A built-in SVG fallback is shown if the file is missing.

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

## Poker table background (optional)

`public/assets/poker-table.jpg` (or `.png` / `.webp`) — a top-down casino
poker table image used as the PokerStr8ts mode background. If present it
replaces the built-in SVG poker table; if absent, the SVG is shown. A landscape
image around 1600×900 or larger works best (it is cover-scaled).

## Scoreboard / leaderboard design (optional)

`public/assets/scoreboard.jpg` (or `.jpeg` / `.png`) — replaces the scorecard's
background (used both at the top of the game and on the end-of-round score
screens) with your own image. `public/assets/leaderboard.jpg` (or `.jpeg` /
`.png`) does the same for the leaderboard sign. Either is optional; a missing
file leaves the built-in look in place. Checked once per page load and
cached — later re-renders (which happen often during play) reuse the cached
result instead of re-requesting the file, so there's no added load cost.

## Background music (optional)

`public/assets/music.mp3` (or `.ogg`) — a looping background track, played on
both the portal and the game. If present, a mute/unmute button appears in the
top-right corner automatically; if absent, no button is shown and nothing
plays. Use royalty-free / copyright-free music only. Browsers block
autoplay-with-sound until the player's first click or key press, so the track
starts as soon as they interact with the page.
