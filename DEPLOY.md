# Deploying PokerSt8ts

The game is a static site (Vite → `dist/`). It ships with a GitHub Actions
workflow (`.github/workflows/deploy.yml`) that builds and publishes to GitHub
Pages. `vite.config.ts` sets `base: "./"` so the build works at a domain root
**or** a project subpath without changes.

## GitHub Pages (recommended — free, in-repo)

One-time setup (repo admin, ~1 minute):

1. **Enable Pages**: repo **Settings → Pages → Build and deployment → Source:
   GitHub Actions**. (Until this is done, the deploy step 404s — the build/test
   job still runs and validates every push.)
2. **Deploy.** The `build` job runs on every push (validates typecheck + tests +
   build). The `deploy` job runs only from `main` or a manual run, so branch
   pushes don't fail while Pages is being set up. Two ways to publish:
   - **Merge PR #1 to `main`** → every push to `main` builds and deploys.
   - **Publish before merging**: after enabling Pages, go to **Actions →
     "Deploy PokerSt8ts to GitHub Pages" → Run workflow** and pick this branch.
   Either way the live URL prints in the run summary and under **Environments →
   github-pages**. Default: `https://jubeii89-design.github.io/strategic/`.

The workflow gates the deploy on `typecheck`, `test`, and `build`, so a broken
commit never ships.

## Custom domain — strategictitans.ca

Your company site at the apex (`strategictitans.ca`) is hosted elsewhere and is
**not touched** by any of the above — GitHub Pages only claims a custom domain
if you add a `CNAME` file and matching DNS. Recommended: put the game on a
**subdomain** so the main site is untouched.

1. Add `public/CNAME` containing exactly one line, e.g.:
   ```
   play.strategictitans.ca
   ```
   (Vite copies `public/` into `dist/`, so the CNAME ships with the build.)
2. At your DNS provider, add a record:
   ```
   CNAME   play   jubeii89-design.github.io.
   ```
3. In **Settings → Pages → Custom domain**, enter `play.strategictitans.ca`
   and enable **Enforce HTTPS** once the certificate provisions (a few minutes).

Using the apex `strategictitans.ca` instead is possible but would **replace your
current homepage** and needs GitHub's apex `A`/`AAAA` records — only do that if
you intend the game to be the root site.

## Other hosts

`dist/` is a plain static bundle, so any static host works:

- **Netlify / Vercel / Cloudflare Pages**: connect the repo, build command
  `npm run build`, publish directory `dist`. Or drag-and-drop the `dist/` folder.
- **Your own server / CDN**: run `npm ci && npm run build` and serve `dist/`.

## Art before you ship (optional)

Drop real card PNGs into `public/assets/cards/`, a logo at `public/assets/logo.png`,
and an aerial course image at `public/assets/course.jpg` — all auto-detected,
with the built-in SVG/CSS as fallback. See `public/assets/README.md`.
