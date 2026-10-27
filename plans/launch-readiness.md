# Launch readiness — lilypoint

Reviewed 19 September 2026 against commit `50a60d55e87eab7e0df118d2ae2654313ba686e9` (`main`) plus the uncommitted launch files in this working tree. Live host: https://lilypoint.mazzaella.com/. Updated 26 October 2026: the launch files are deployed, blockers 1–3 are closed, Umami Cloud pageview analytics is live (`dbbd5cd`), and the CSP and Lighthouse follow-ups are recorded below.

## Decision

The public site is usable as a free, no-account counterpoint generator. Write already generates, plays, and offers export on the live host. It is **not ready to announce as a finished species-counterpoint authority**. The discovery, security, and privacy files are deployed and checked live (26 Oct 2026).

Write, Practice, and About can be announced as a public beta. Keep the About caveat that generated exercises are material to explore, not a complete rulebook. Do not claim accounts or certified species output. Analytics is Umami Cloud pageviews only, as About's Privacy section says.

## Release boundary

| | |
| --- | --- |
| Audience | Anyone who wants two-voice species exercises in the browser |
| Promise | Generate, hear, keep, and export phrases. No signup. |
| Primary journeys | Write a sheet; Practice a lesson and open kept phrases as a sheet; read About |
| Secondary | Classic generator, prototype gallery |
| Hosting | Static Netlify site from `bun run build` → `dist/` |
| Not this release | Custom analytics events, cookie banner, www host, accounts, payments |

## What was added (easy / important)

These apply to a public static site and were cheap to do well. All are live as of 26 Oct 2026.

- Custom **404** with links to Write, Practice, and About
- **robots.txt** and **sitemap.xml** (canonical pages only; `/proto/` disallowed)
- Page titles, descriptions, **canonical URLs**, **Open Graph / Twitter** tags, favicons, and `og.png`
- **Skip links** on the main rooms, About, Classic, and 404
- **Security headers** and correct `webmanifest` / `LICENSE` content types (`_headers` plus `netlify.toml`)
- Forced **`/write.html` → `/`** rule in the publish directory (`_redirects`), because the live host still serves `write.html` as 200
- Honest **Privacy** section and GPL notice on About; `package.json` license aligned with `LICENSE`; `/LICENSE` copied into `dist/`
- README GitHub URL typo `emdahsii` → `emdashii`
- `noindex` on prototype pages so they do not compete with Write/Practice

A cookie banner was not added (Umami sets no cookies). The Content-Security-Policy was added later and is enforced; see follow-up 5.

## Checklist

| Check | Disposition | Notes |
| --- | --- | --- |
| Core task: generate and show two-voice counterpoint | **Verified** live | Write at `/` on 19 Sep 2026 produced a three-phrase D minor sheet, playback controls, and export buttons |
| Practice lesson → keep → open as sheet | **Unverified** in this pass | Markup and recovery copy are in source; browser host dropped before a full Practice run. Covered by existing proto tests |
| Published claims match behavior | **Verified** with a remaining caveat | About already says the generator is evolving. README no longer points at a 404 GitHub URL |
| Data provenance / licensing | **Action, locally fixed** | GPL-3.0 in `LICENSE` vs ISC in `package.json` is corrected; About links `/LICENSE` |
| Human review of musical quality | **Follow-up** | `plans/counterpoint-audit.md` still treats piano-practice review as remaining work |
| Empty / invalid / retry states | **Verified** in source | Practice empty collection; generation retries exhausted cantus searches; export status text. No server forms |
| 404 recovery | **Verified** live 26 Oct | `/this-page-does-not-exist` returns 404 with “Page not found · lilypoint” |
| HTTPS / apex | **Verified** live | `http://` → `https://lilypoint.mazzaella.com/` 301. No `www` host |
| `/write.html` canonical redirect | **Verified** live 26 Oct | `301`, `Location: /` |
| Titles, descriptions, canonical, favicon | **Action, locally fixed** | Main rooms previously shared one description and only `.ico` |
| Social preview | **Verified** live 26 Oct | A shared Write URL (`/?p=…`) serves `og:title` “The writing room · lilypoint”, `og:image` `/og.png`, `summary_large_image`; `og.png` is 200 `image/png` |
| robots.txt / sitemap | **Verified** live 26 Oct | Both 200. Prototypes kept off the sitemap |
| Structured data | **Not applicable** | No article, product, or dataset page that would make JSON-LD truthful |
| Critical external links | **Verified** | GitHub lilypoint and counterpoint_generator 200; Ko-fi loads in a browser (PowerShell got 403); mazzaella.com, abcjs, Flexoki, LilyPond 200 |
| Main action on phone and desktop | **Partially verified** | Desktop Write works. Mobile layout CSS exists; no device pass this session |
| Keyboard, focus, skip link | **Action, locally fixed** | `:focus-visible` and reduced-motion already in tokens. Skip links added. Not an accessibility certification |
| Async / error copy | **Verified** in source | Piano sample load failure and export failure already surface in status |
| Duplicate submission / abuse controls | **Not applicable** | No writable origin besides the visitor’s own browser |
| Lighthouse / Core Web Vitals | **Lab run recorded** 27 Oct UTC | See Lighthouse below. Mobile Write performance 67 (FCP 3.9 s); no field data |
| Secrets in the client | **Verified** | No private API keys. Theme and Write drafts are browser storage |
| Security headers | **Verified** live 27 Oct UTC | HSTS, nosniff, referrer-policy, frame deny, permissions-policy, enforced CSP (see Content-Security-Policy) |
| Dependency audit | **Unverified** | `bun test` 441 pass; no `bun audit` pass recorded |
| Privacy notice vs actual processing | **Verified** in source | About names Umami Cloud (cookieless pageviews), theme and draft storage, Netlify logs, Google Fonts, jsDelivr, GitHub Pages piano samples, and Hacklily. Samples were misattributed to jsDelivr until 26 Oct |
| Cookie banner | **Not applicable** | No first-party tracking cookies. Theme is `localStorage` |
| Analytics | **Live** | Umami Cloud pageviews, `data-domains` limits collection to this host. No custom events |
| Reproducible build / tests | **Verified** locally | `bun run build`, `bun test` (441), proto smokes, `bun test/site-static.mjs` |
| Monitoring / rollback | **Follow-up** | Static Netlify rollback is a dashboard redeploy. No product analytics or error reporting |
| Domain / www | **Not applicable** | `www.lilypoint.mazzaella.com` does not resolve |

## Remaining actions

### Release blockers — closed 26 Oct 2026

1. ~~Deploy this tree~~ **Done.** `/robots.txt` 200, `/this-page-does-not-exist` returns the lilypoint 404, `/write.html` 301 to `/`, and every response carries `X-Content-Type-Options: nosniff`.
2. ~~Confirm `/write.html` 301 after deploy~~ **Done.** `curl -I https://lilypoint.mazzaella.com/write.html` → `HTTP/2 301`, `location: /`.
3. ~~Spot-check a shared Write URL social card~~ **Done.** `/?p=D.minor.4.4.4-4.7_Bb.major.3.2.6-8.9` serves the lilypoint `og:` and `twitter:` tags; `og.png` is 200 `image/png` (152 KB). Checked by direct fetch, not a platform debugger.

### Follow-up (not blockers for a public beta)

4. Piano-practice musical review and remaining items in `plans/counterpoint-audit.md`.
5. **Content-Security-Policy** — **Done.** Shipped report-only 26 Oct 2026 (PR #4), checked live with zero violations, then enforced (PR #5). See below.
6. Manual keyboard / mobile device pass (still open). The Lighthouse lab run is recorded below.
7. Analytics events, when wanted: Write generate / Practice start / export; exclude `?p=` contents; update the Privacy section in the same change. Pageviews are already live through Umami Cloud.

## Content-Security-Policy

Lives in `public/_headers` only (not `netlify.toml`), so there is one copy. Origins, recorded 26 Oct 2026 from source and the third-party scripts themselves:

| Directive | Origin | Why |
| --- | --- | --- |
| `script-src` | `https://cdn.jsdelivr.net` | abcjs; jsPDF and svg2pdf on PDF export; VexFlow/Verovio in prototypes |
| `script-src` | `https://cloud.umami.is` | Umami `script.js` |
| `script-src` | `'sha256-…'` | Each inline `<script>` in `public/**/*.html`. `test/site-static.mjs` fails the build check when one is missing |
| `script-src` | `'wasm-unsafe-eval'` | Verovio WebAssembly (prototype renderer) |
| `connect-src` | `https://gateway.umami.is` | Umami `POST /api/send` (the script's default host) |
| `connect-src` | `https://paulrosen.github.io` | abcjs default soundfont (`/midi-js-soundfonts/abcjs/`), fetched by XHR |
| `connect-src` | `https://cdn.jsdelivr.net` | Verovio's `.wasm` fetch |
| `style-src` | `https://fonts.googleapis.com`, `'unsafe-inline'` | Google Fonts CSS; abcjs sets `style` attributes and the print iframe writes a `<style>` |
| `font-src` | `https://fonts.gstatic.com`, `https://cdn.jsdelivr.net` | Google Fonts files; VexFlow music fonts |
| `frame-src` | `https://www.hacklily.org` | Classic generator's LilyPond viewer |
| `img-src` | `data:`, `blob:` | Inline SVG/data images and generated previews |

Live checks (`puppeteer-core` + headless Chromium, a `securitypolicyviolation` listener installed before page scripts, then Play, Play sheet, Download PDF, and Print clicked where present). Pages: `/`, shared Write URL `/?p=D.minor.4.4.4-4.7_Bb.major.3.2.6-8.9`, `/practice.html` (lesson started, exercise played), `/about.html`, `/classic.html`, a 404 path.

| When (UTC) | Header | Violations | Notes |
| --- | --- | --- | --- |
| 27 Oct 2026 02:05 | Deploy preview 4, report-only | Only `frame-src https://app.netlify.com` | Netlify's preview drawer; production does not inject it. Umami does not send on preview (`data-domains`) |
| 27 Oct 2026 02:08 | Production, report-only | 0 | Piano played, PDF downloaded, print preview opened; Umami beacon `POST /api/send` 200 |

The only console error on these pages is an intermittent `ERR_CONNECTION_REFUSED` from this machine's missing IPv6 route to `gateway.umami.is` (`curl -6` fails, `curl -4` succeeds); the beacon still lands over IPv4. It is not a CSP report.

Changing an inline script: rebuild, run `bun test/site-static.mjs`, and replace the reported hash in `_headers`.


## Lighthouse lab run

Lighthouse 12.8.2, headless Chromium, production host, default throttling (mobile = simulated Moto G Power / slow 4G; desktop preset). Run 27 Oct 2026 01:59–02:00 UTC against `c9692fc`, before the CSP.

| Page | Form | Perf | A11y | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` (Write) | Mobile | 67 | 95 | 96 | 100 | 3.9 s | 4.3 s | 340 ms | 0.013 |
| `/practice.html` | Mobile | 78 | 94 | 96 | 100 | 3.3 s | 3.8 s | 150 ms | 0 |
| `/about.html` | Mobile | 92 | 95 | 96 | 100 | 2.7 s | 2.7 s | 0 ms | 0.026 |
| `/` (Write) | Desktop | 97 | 95 | 96 | 100 | 0.8 s | 0.8 s | 20 ms | 0.083 |
| `/practice.html` | Desktop | 99 | 94 | 96 | 100 | 0.8 s | 0.8 s | 0 ms | 0.001 |
| `/about.html` | Desktop | 99 | 95 | 100 | 100 | 0.8 s | 0.8 s | 0 ms | 0.03 |

Findings: render-blocking Google Fonts CSS (`@import` inside `studio.css`) and the synchronous abcjs script drive the mobile FCP; `color-contrast` flags the primary buttons and summary text; best-practices loses points only for a console error from the Umami beacon, which this machine's Chromium refused (`ERR_CONNECTION_REFUSED`) while `curl` reached `gateway.umami.is`. One run per page, so treat scores as ±5.

## Analytics handoff (pageviews installed; events not)

Questions it should answer later: which room is used, whether generation and export complete, where people drop on Practice. Property: this host only. Events: `page_view`, `generate`, `play`, `export_pdf|midi|ly`. Exclude seeds, titles, composer text, and `?p=`. No session replay. Privacy mode on. Preview/localhost off.

## Verification

| When | What | Result |
| --- | --- | --- |
| 19 Sep 2026 | Live GET `/`, `/practice.html`, `/about.html`, `/classic.html` | 200, HSTS only |
| 19 Sep 2026 | Live GET `/write.html` | 200 HTML refresh, not 301 |
| 19 Sep 2026 | Live GET `/robots.txt`, `/sitemap.xml`, unknown path | 404 (Netlify default) |
| 19 Sep 2026 | Live Write in browser | Sheet generated and interactive |
| 19 Sep 2026 | `bun test` | 441 pass |
| 19 Sep 2026 | `bun run build` + proto smokes + `test/site-static.mjs` | pass |
| 19 Sep 2026 | Local GET of `/`, `/about.html`, `/missing-page` on `dist/` | 200 / 200 / 404 with new markup |
| 26 Oct 2026 | Live HEAD `/robots.txt`, `/sitemap.xml`, `/`, unknown path | 200 / 200 / 200 / 404 lilypoint page; all with nosniff, referrer-policy, frame deny, permissions-policy, HSTS |
| 26 Oct 2026 | Live HEAD `/write.html` | 301, `location: /` |
| 26 Oct 2026 | Live GET shared Write URL, `/og.png` | lilypoint `og:`/`twitter:` tags; 200 `image/png` |
| 27 Oct 2026 UTC | Lighthouse 12.8.2 mobile + desktop on `/`, practice, about | See Lighthouse lab run |
| 26 Oct 2026 | `bun run test:all` | pass; `bun test` 390 |

Limits: no physical mobile device or keyboard-only pass, no field Core Web Vitals, no `bun audit`, no legal conclusion about GDPR/CCPA.

## Owner input

- Analytics events beyond pageviews stay off until you ask for them.
- Prototypes are still reachable at `/proto/` and linked from About; they are asked not to be indexed.
