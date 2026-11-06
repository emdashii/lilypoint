# lilypoint launch-readiness audit — 2026-11-06

**Launch decision: hold a new public-beta announcement.** The existing experimental site can remain available, but fix findings 1–6 before inviting a wider audience. The highest-value fixes prevent lost phrases, exclude score metadata from analytics, and make the phone collection reachable. Keep the existing musical-authority caveat. This audit does not support announcing a finished species-counterpoint teaching authority.

This is a report, not an implementation. No application source, production data, hosting configuration, or dependency files were changed. Only this report is intended for commit and push. The commit uses `[skip netlify]` to avoid deploying it, as documented in [Netlify's skip-deploy instructions](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/#skip-a-deploy).

## Release boundary and evidence

- Source: `89e3a9828fee132b2cc4d1ee127847e3e0ace4e3` on `main`, after the requested pull. Plain `git pull --rebase` refused the existing unstaged change; `git pull --rebase --autostash` returned `Already up to date.`
- Production: <https://lilypoint.mazzaella.com/>. Reviewed 6 November 2026, approximately 10:10–10:23 UTC.
- Promise: a free, no-account browser tool to generate, hear, arrange, collect, and export two-voice exercises. Primary rooms are Write and Practice; About explains limitations. Classic and the gallery are secondary.
- Scope: live anonymous journeys at **390 × 844** and **1440 × 1000 CSS pixels**, input boundaries, links/assets, performance, accessibility, privacy, and product claims. T3's server Chromium reported Chrome 156 on Linux. Lighthouse used headless Chromium 155. Width tests do not establish real iPhone/Safari or touch-device behavior.
- Production/source comparison: nine checked JS/CSS files matched the local build byte for byte, including the two room controllers, core, UI, studio styles, exporter, and generator modules. Eight checked HTML files differed; inspection of About showed Netlify rewriting `.html` links to extensionless paths. Those paths also returned 200. There is no exposed deployment SHA, so this is a matched-source sample, not proof of the exact deployed commit.
- Excluded: the six clean-copy items already fixed by `df511ef` and recorded by `5304185`. No recommendation below repeats those removals.
- Evidence directory: `/tmp/lilypoint-launch-2026-11-06/`. Screenshots live under `/home/mazzy/.t3/userdata/browser-artifacts/`. These artifacts are local and uncommitted; the essential observations and reproduction steps are included here so each handoff stands alone.

`bun.lock` was already modified and remains outside this report. Its SHA-256 stayed `b6c6a79f98be3d267163a943f23a757a3fa2173702e734628adc6fa9c1fed8b9` throughout the audit. Do not stage it when implementing these handoffs without its owner's direction.

## Ranked handoffs

Rank reflects user impact and confidence. Findings 1–6 are announcement gates; 7–10 are follow-ups within the current experimental release boundary.

### 1. A fractional tempo silently deletes a phrase on reopening

**Problem:** Write accepts `30.5` when the tempo field loses focus. Its dot becomes an extra delimiter in the saved phrase. Reopening the link or tab draft silently discards that phrase. In a one-phrase sheet this becomes an empty sheet, and saving the empty state overwrites the draft.

**Evidence:** `public/proto/shared/writing-room.js:81` restricts the input handler to integers, but `:82` accepts `transportOptions().tempo` on change without the same constraint. `public/proto/shared/studio.js:137` clamps the range without rounding. `public/proto/shared/core.js:93` joins fields with dots; `:99` discards entries with more than seven fields. In live Chromium, starting with `/?p=C.major.1.2.2-4.1.30`, typing `30.5` and pressing Tab produced:

```text
tempo = "30.5"; input.validity.valid = false
p = C.major.1.2.2-4.1.30.5
Navigate to / to restore the draft:
phrase count = 0; sheet = "No phrases yet."
rewritten URL: /?p=&title=Boundary&composer=Studies+for+two+voices&selected=0
```

**Proposed change:** Apply one integer-tempo policy at both input and change boundaries. Reject or normalize fractional values before changing the score. Make URL decoding reject invalid state visibly rather than silently dropping a saved phrase. Add the decimal-tempo/draft round trip to the existing score-state regression checks.

**Done state:** Blank, 0, 29, 30, 200, 201, and fractional input preserve every phrase. Displayed tempo, saved tempo, playback, and exports agree. Valid six- and seven-field links and intentionally empty sheets remain supported.

**Verification command:** After adding the regression, run `bun test/proto-score-state.mjs` against a fresh build. In Chromium at both widths, type `30.5`, Tab, reload the resulting URL, and navigate to `/`; assert the same phrase count and notes survive. The current script passes and does not catch this UI path.

### 2. Automatic pageviews include score seeds, title, and composer

**Problem:** Editing a sheet changes its URL with `history.replaceState`. Umami treats that as another pageview and constructs a payload containing the complete score URL and previous URL. Composer names and arbitrary titles can therefore leave the browser as analytics data. Editing can also inflate pageview counts.

**Evidence:** `public/index.html:28` enables the default Umami tracker with domain restriction only. `public/proto/shared/writing-room.js:22`–`:26` put score specifications, title, composer, and selection into that URL; `:89` saves on title/composer input. `plans/launch-readiness.md` explicitly says to exclude seeds, titles, composer text, and `?p=` from measurement. A live browser probe intercepted and rejected the outgoing request before delivery:

```json
{
  "url": "https://gateway.umami.is/api/send",
  "method": "POST",
  "body": {
    "type": "event",
    "payload": {
      "url": "https://lilypoint.mazzaella.com/?p=D.minor.1.4.4-4.263640730.80_D.minor.2.4.4-4.132989964.80_D.minor.3.4.4-4.1026319849.80&title=Study+%22one%22&composer=Studies+for+two+voices&selected=0",
      "referrer": "/?p=D.minor.1.4.4-4.263640730.80_D.minor.2.4.4-4.132989964.80_D.minor.3.4.4-4.1026319849.80&title=A+little+counterpoint&composer=Studies+for+two+voices&selected=0"
    }
  }
}
```

The excerpt omits ordinary device fields and the public website identifier. This proves payload construction, not receipt or retention at Umami. A later reload with analytics disabled did not reproduce a send; that is not evidence that the original payload was safe.

**Proposed change:** Exclude search and hash data on every tracked page, sanitize both URL and referrer before sending, and count room navigation independently of editor-state changes. Current [Umami tracker documentation](https://docs.umami.is/docs/tracker-configuration) provides `data-exclude-search`, `data-exclude-hash`, and a `data-before-send` hook. Verify the installed tracker's behavior rather than assuming one attribute sanitizes both fields. Preserve production-only domain gating and keep custom events/replay off. Align the Privacy text with the final collection boundary.

**Done state:** Loading a shared link and editing title, composer, settings, or selection produces no analytics payload containing score specifications or user text. The intended room-pageview count is stable. No extra events, replay, or error capture are introduced.

**Verification command:** In Chromium, install this interception before editing, then inspect `auditWrites` after a title change:

```js
window.auditWrites = [];
const originalFetch = window.fetch.bind(window);
window.fetch = (url, options = {}) => {
  if ((options.method || 'GET').toUpperCase() !== 'GET') {
    auditWrites.push({url: String(url), ...options});
    return Promise.reject(new Error('Audit blocked non-GET'));
  }
  return originalFetch(url, options);
};
```

Use a local/staging interception installed before page scripts to cover the initial shared-link pageview too. Assert sanitized `url` **and** `referrer`, plus counts. Run `bun test/site-static.mjs` after adding tracker-configuration coverage. Receipt, historical collected data, retention, and deletion require the owner's read-only Umami account review; none was available in this audit. This is a technical minimization finding, not a legal ruling.

### 3. Phone scrolling pushes the kept collection away

**Problem:** On phones, the collection follows an automatically growing exercise feed. Scrolling toward export and **Open as a sheet** intersects the sentinel first, inserts more exercises above the collection, and pushes those controls out of reach again. A scripted locator can jump directly to the button, but ordinary downward scrolling repeatedly encounters more exercises.

**Evidence:** `public/practice.html:35` places the sentinel before the collection at `:36`. `public/proto/shared/practice-room.js:110` appends two exercises whenever that sentinel enters a 200px margin. `public/proto/shared/studio.css:101` places the collection in normal flow on phones. At 390 × 844, after keeping the first warm-up exercise:

```text
Initial: 3 exercises; collection top in document = 2292.30px
Scroll down 3000px: scrollY = 2438; 5 exercises;
  collection viewport top = 1446.13px; document height = 4549px
Scroll down 3000px again: scrollY = 3705.5; 7 exercises;
  collection viewport top = 1446.46px; document height = 5817px
```

Screenshots: `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4tihun-57ca4fe4.png` and `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4tiicv-b34c5ccd.png`. The latter still shows exercises and transport, not the kept collection. Desktop's separate collection column avoids this arrangement. Directly activating the button transferred the kept snapshot successfully, so the defect is access to the action.

**Proposed change:** Give the collection a stable reachable position on phones, or make further exercise loading explicit there. The existing **More exercises** action is a small alternative to unconditional observation. Preserve kept snapshots when changing filters or rerolling exercises.

**Done state:** At 390px, keep a phrase, scroll normally to the collection, and activate each export/handoff action without more content pushing it away. The kept snapshot opens unchanged in Write. Desktop behavior remains usable.

**Verification command:** In a 390 × 844 browser, start the first lesson, keep its first exercise, and run `window.scrollBy(0, 3000)` twice with a render between calls. Read `document.querySelector('#open-sheet').getBoundingClientRect()` and exercise count after each call. The action must remain reachable above the fixed transport. Repeat by keyboard, then at 1440px. Add this browser scenario before running `bun run test:all`; the current built-module checks do not drive scrolling.

### 4. Startup generation errors leave Write inert, including a supported score

**Problem:** Write generates every initial phrase before wiring its controls. A malformed URL, invalid saved state, or bounded solver failure aborts module initialization. The sheet stays blank, **Add phrase** does nothing, exports look enabled, and status misleadingly remains **Ready**. A valid supported setting combination can trigger this too.

**Evidence:** `public/proto/shared/core.js:95`–`:101` validate field count without validating supported field values. `public/proto/shared/writing-room.js:13` calls generation at module top level; handlers start later. `public/proto/shared/studio.js:12` retries only cantus-search exhaustion, not a counterpoint-search failure. Both live URLs reproduced the dead room:

```text
/?p=C.major.1.0.4-4.1
/?p=Fs.minor.4.16.6-8.1.200
phrase rows = 0; score SVGs = 0; add.onclick === null; status = "Ready"
```

The second link requests F-sharp minor, fourth species, 16 bars, 6/8, seed 1, 200 BPM. A browser call to the live generator confirmed `No valid fourth species counterpoint found for cantus firmus ...`. Search failure itself is permitted by `plans/counterpoint-audit.md:51`; losing the whole interface is not required by that contract. Screenshots: `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4th3db-501c7735.png` and `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4tmo5f-8117f470.png`.

**Proposed change:** Validate URL/draft specifications at the boundary and handle startup failure inside an initialized room. Preserve the last good draft, show a useful error, and provide an explicit retry or new-sheet action. Never silently overwrite good saved music with a failed load. Keep bounded search; a supported setting need not promise success for every seed.

**Done state:** Both URLs leave navigation, recovery, and **Add phrase** working. Failed scores do not appear as a successful empty sheet or overwrite the good draft. Empty `p`, valid legacy links, malformed fields, unsupported settings, and failed valid seeds have distinct usable outcomes.

**Verification command:** Run `bun test/proto-generation.mjs` after adding startup recovery coverage. Open both exact production reproduction URLs at both widths and evaluate `({wired: typeof document.querySelector('#add').onclick === 'function', status: document.querySelector('#status').textContent})`; confirm recovery can generate a new phrase. Verify the saved good draft separately. Existing tests currently pass despite this failure.

### 5. LilyPond export does not escape title and composer strings

**Problem:** Ordinary quotation marks or backslashes in metadata become LilyPond syntax. The download succeeds but does not preserve the title as literal text and can produce invalid source.

**Evidence:** `src/export-to-file.ts:82` and `:83` interpolate metadata directly into quoted strings. The main inputs at `public/index.html:34` allow quotation marks; `public/proto/shared/writing-room.js:88` exports them. Live download with title `Study "one"` produced `/tmp/lilypoint-launch-2026-11-06/study-one.ly`:

```lilypond
\header {
title = "Study "one""
composer = "Studies for two voices"
```

**Proposed change:** Encode LilyPond string literals centrally for title and composer. Cover quotation marks, backslashes, and line endings, including metadata loaded from shared URLs. Do not change the user's displayed text.

**Done state:** Exported files compile and display literal metadata for quoted titles, backslashes, empty strings, Unicode, and boundary-length input. They do not turn metadata into additional LilyPond syntax.

**Verification command:** Add the metadata cases to `tests/unit/export-to-file.test.ts`, then run `bun test tests/unit/export-to-file.test.ts`. Generate/download the quoted-title fixture and run `lilypond -o /tmp/lilypoint-metadata /tmp/lilypoint-launch-2026-11-06/study-one.ly` against the fixed export. LilyPond is not installed here, so this audit verified the malformed bytes, not a downstream compiler diagnostic.

### 6. Primary actions fail text contrast, especially in dark mode

**Problem:** The primary button foreground/background pair falls below the 4.5:1 normal-text contrast check in both themes. Some small light-theme labels also fail. These affect the actions needed to play and download music.

**Evidence:** `public/proto/shared/studio.css:9` uses `var(--paper)` text on `var(--accent)`. Colors come from `public/proto/shared/tokens.css:22` and `:47`. Fresh Lighthouse runs reproduce the finding already noted in PR #4's launch plan: light buttons `#fffcf0` on `#66800b` = **4.38:1**, labels `#6f6e69` on `#f2f0e5` = **4.46:1**. A live axe-core 4.10.3 check of dark Write reports **3.04:1**, `#fffcf0` on `#879a39`, on `#pdf` and `#play`. Practice session also flags lesson/filter labels. Screenshot: `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4tme8v-42923cae.png`.

**Proposed change:** Define button foreground/background roles that pass in each theme, and adjust the small muted text pair where used on the secondary background. Check selected, hover, focus, and disabled states separately. Retain the score's dark-on-paper treatment.

**Done state:** Automated contrast checks pass on Write, Practice home/session, and About in both themes. Primary labels and focus indicators remain legible at both widths. This is not a claim of complete accessibility certification.

**Verification command:** Run the Lighthouse command in the measurement section with `--only-categories=accessibility` on the three main pages. In a loaded Practice session and dark Write, run `await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa']}})` after loading axe-core. Review incomplete results manually; the audit used jsDelivr's `axe-core@4.10.3/axe.min.js` for session checks.

### 7. Saved links do not preserve music across generator revisions

**Problem:** About advises saving a Write link to return to the music, but links and drafts store a generation recipe rather than notes or a generator version. A later solver revision can change the score behind an existing link.

**Evidence:** `public/about.html:53` makes the save-link promise. `public/proto/shared/core.js:91`–`:100` serialize settings/seed/tempo only; `public/proto/shared/writing-room.js:13` regenerates the music. This has already happened: `plans/exercise-audit.md:39` records existing links and drafts regenerating different notes after the cantus repair. Current-version Practice-to-Write transfer succeeded; this finding is about persistence across revisions, not that transfer.

**Proposed change:** Either preserve versioned score snapshots/compatible generator versions, or explicitly explain that links regenerate and can change after updates. A clear limitation is the smaller change for the experimental release. Do not imply that downloading a score and saving its recipe have identical durability.

**Done state:** The public promise matches the chosen persistence contract. If durable links are promised, an old saved fixture keeps pitch, duration, spelling, order, and tempo across generator changes.

**Verification command:** Extend `bun test/proto-score-state.mjs` with a historical serialized fixture and independently recorded expected notes. Run it after a generator revision. If choosing disclosure instead, review `public/about.html:53` against the actual seed-only encoding; retain download guidance. Follow-up for today's beta, a gate before promising durable saved scores.

### 8. Mobile startup still pays for blocking fonts and notation

**Problem:** Write has slow mobile lab startup and substantial blocking work before the initial score is ready. This is the remaining performance work from PR #4, not a new CSP regression.

**Evidence:** Three fresh sequential mobile runs per main page are summarized below. Write median performance is **68**, LCP **3.58 s**, TBT **475 ms**, CLS **0.115**. Lighthouse identifies the synchronous abcjs script and imported Google Fonts CSS as render blockers, with estimated savings of 2.09 s in the first Write run. That estimate is diagnostic, not a promised speedup. `public/index.html:37` loads abcjs synchronously; `public/proto/shared/studio.css:3` imports Fonts after the shared stylesheet. Write's first run requested 43 resources, about 285 KB transferred, with about 2.1 s of measured main-thread work. Raw report: `/tmp/lilypoint-launch-2026-11-06/lh-write-1.json`.

**Proposed change:** Measure a compatible deferred notation-loading path and remove the nested font discovery delay. Profile initial engraving/layout before adding broad bundling infrastructure, and remove repeated work if the trace confirms it. Preserve notation, exports, and CSP while changing dependency timing.

**Done state:** Three comparable cold mobile runs show a repeatable improvement in LCP and TBT without worse layout shifts, and the initial score plus play/export paths still work. Use the present medians as the baseline rather than a single score target.

**Verification command:** Repeat the sequential Lighthouse recipe below, then compare medians. Recheck the actual interaction on a slow mobile profile. No field Core Web Vitals or INP data was available; navigation Lighthouse does not establish interaction responsiveness.

### 9. A transient PDF-library failure prevents retry until reload

**Problem:** The script loader caches rejected promises permanently. Once the first PDF-library load fails, restoring connectivity and clicking download again cannot retry in that tab.

**Evidence:** `public/proto/shared/ui.js:68`–`:78` retain every promise in `loaded`, including failures. `public/proto/shared/pdf.js:36` and `:37` use that loader; `public/proto/shared/studio.js:68` reports failure. In a fresh live room, a browser-local fault injection dispatched one error on the first jsPDF script insertion and immediately restored normal insertion. Two PDF clicks produced:

```text
first:  injected script errors = 1; subsequent script appends = 0
second: injected script errors = 1; subsequent script appends = 0
both: Export failed: Could not load https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js
```

Screenshot: `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4tnwtp-22c72cfb.png`. This was a controlled local failure of the browser's script-load callback, not an observed outage at jsDelivr.

**Proposed change:** Remove the failed cache entry and failed script on rejection, retaining single-flight loading and the successful cache. Preserve the score when retrying.

**Done state:** One failed request followed by restored loading yields a PDF on the next click without reload or duplicate concurrent loads.

**Verification command:** In Chromium, intercept the first jsPDF request as failed, unblock it, and click **Download PDF** twice. Inspect `performance.getEntriesByType('resource').filter(e => e.name.includes('jspdf'))` and the downloaded file/status. Add this failed-then-successful browser regression; run `bun run test:all` afterward. A healthy-cache happy path alone does not verify recovery.

### 10. The build dependency audit fails

**Problem:** The development dependency tree has known denial-of-service advisories. This is build-tool exposure, not evidence of an exploitable visitor endpoint: the production site is static and the build uses fixed globs.

**Evidence:** `package.json:23` declares `copyfiles`. `bun audit` exited 1 with **10 vulnerabilities: 8 high, 2 moderate**, in `copyfiles > minimatch@3.1.2` and `copyfiles > minimatch > brace-expansion@1.1.12`. Output is in `/tmp/lilypoint-launch-2026-11-06/bun-audit.log`; examples include `GHSA-3ppc-4f35-3m26` and `GHSA-mh99-v99m-4gvg`. The user's pre-existing lockfile edit only adds `configVersion`; it is not an authorized dependency update.

**Proposed change:** In a separate authorized change, update/replace the copy helper or resolve compatible patched transitive versions. Keep file-copy semantics, hidden `_headers`/`_redirects`, and deployment output intact. Do not automatically apply `bun audit fix --latest` or stage the existing lockfile edit.

**Done state:** `bun audit` passes for the resolved build tree, or remaining items have a specific documented reachability assessment and owner decision. The same production files are emitted.

**Verification command:** `bun audit`, followed sequentially by `bun run test:all`. Compare the output asset list and static header/redirect checks after the dependency change. The present failure does not by itself block the current static beta.

## Journey and checklist dispositions

| Check | Disposition | Evidence and limits |
|---|---|---|
| Required local checks | **Verified** | One foreground `bun run test:all`: typecheck, 377 Bun tests, one build, five built-module scripts passed. `/tmp/lilypoint-launch-2026-11-06/test-all.log`. Local Bun was 1.4.3; Netlify config pins 1.3.0 and GitHub Actions pins 1.3.14, so this is not an exact reproduction of either hosted toolchain. No concurrent build/test/server processes were launched. |
| Write initial score, settings, add/reorder/remove, empty recovery | **Verified with actions** | Default three-phrase score; valid short and long score URLs; keyboard N adds; move-up/remove; deleting all disables export; Add recovers. Findings 1 and 4 cover failures. |
| Write persistence/sharing | **Action** | Normal current-version restore works. Fractional tempo loses a phrase; generator revisions change recipe output. Findings 1 and 7. |
| Practice lesson, keep, reroll, handoff | **Verified with action** | First warm-up lesson produced ordered C-major first/second then C-minor first species. Kept first snapshot survived reroll; direct handoff opened one phrase in Write. Ordinary phone access to that handoff fails as described in finding 3. |
| Practice filter extremes | **Verified sample** | 16 bars and 6/8 rendered in the desktop session and after resizing to 390px. Minimum 2-bar 2/4 and maximum 16-bar 6/8 generation sampled all five species in major/minor; F-sharp minor fourth species at seed 1 failed explicitly. Other nine sampled generation cases completed. Not an exhaustive seed-space guarantee. |
| Input boundaries | **Verified with actions** | Tempo 30/200, blank, 0, 201, and 30.5; typed title/composer limited to 100 characters after 120 supplied; empty title; literal quotes; minimum/maximum phrase lengths; malformed and supported failing links. Findings 1, 4, 5. Arbitrarily huge URL/phrase-count abuse was not load-tested. |
| Mobile/desktop layout | **Verified sample** | Write, Practice home/session, About, Classic, and recovery page inspected at the requested widths. Main room document width stayed 390/1440px in sampled states, including a 16-bar fifth-species score. No blanket claim for every prototype or zoom level. |
| Playback | **Partially verified** | Live Write loaded piano resources and reached Finished; stop controls worked and no captured CSP violation occurred. This headless pass did not listen through speakers, certify audio quality, or exhaustively test voice isolation, loop, or count-in timing. |
| PDF/MIDI/LilyPond | **Verified sample with action** | Live downloads copied to `/tmp/lilypoint-launch-2026-11-06/export.pdf`, `export.mid`, and `study-one.ly`. PDF is two A4 pages; both rasterized and visually inspected, including complete final system. MIDI download 1423 bytes; independent built exercise checks cover MIDI/LilyPond pitch and timing. LilyPond metadata is broken; no local LilyPond compiler. |
| Print | **Unverified this pass** | PR #5 records working Print under enforced CSP. This pass did not complete a physical/browser print-dialog journey. |
| Classic | **Verified sample** | Live form produced LilyPond text; layout inspected at both widths. Hacklily embedded generation and every utility were not retested. |
| Internal links and static assets | **Verified sample** | Browser GET sweep: 14 HTML routes and 26 linked/support paths returned 200 with appropriate MIME types. Includes all eight prototype URLs, main CSS/JS, icons, manifest, license, OG image, robots, and sitemap. `/404.html` itself is 200; an unknown route correctly returns 404. `/tmp/lilypoint-launch-2026-11-06/link-assets.json`. Dynamic notation/PDF/piano assets worked in the exercised journey. |
| External critical links | **Verified sample** | Anonymous browser navigation: current/original GitHub repositories, June 2022 project post, Ko-fi support page, and Umami privacy page returned 200. No donation/payment submitted. Full vendor/legal-page contents and every secondary credit link were not audited. |
| HTTPS and old links | **Verified** | HTTP entry ended on HTTPS; HSTS is present. GET `/write.html` ended at `/`. Browser follow did not independently expose the redirect status, so this pass does not reassert the earlier 301 measurement. |
| 404 recovery | **Verified** | Unknown production path returned 404 and the lilypoint recovery page, inspected at both widths. |
| Discovery metadata | **Verified sample** | Main pages have distinct titles and canonical URLs; OG image is 200 image/png; manifest is JSON; license is text/plain; robots and sitemap deliver canonical pages. Prototypes have noindex and `/proto/` is disallowed. Social-platform rendering and search indexing were not independently checked. |
| Accessibility basics | **Action / partial verification** | Visible skip-link focus and keyboard activation; N shortcut, named controls, status region, and keyboard-compatible action buttons checked. Lighthouse plus axe found contrast failures. Not a screen-reader, 200%/400% zoom, full touch-target, or WCAG certification pass. |
| CSP/security headers | **Verified sample** | Live responses enforce CSP and include HSTS, nosniff, frame deny, referrer policy, and permissions policy. Browser listeners recorded zero violations while Write PDF, MIDI, LilyPond, and playback ran. JS/CSS matched source. PR #5's broader enforced-policy pass remains historical evidence, not a fresh pass of every route/action. |
| Sensitive features and secrets | **Not applicable / limited inspection** | No accounts, tenant boundaries, backend writes, uploads, subscriptions, marketing mail, or runtime AI generation. The Umami website identifier is public configuration. No private credential was identified in reviewed public code; this is not an exhaustive Git-history secret scan. `bun audit` covers the Bun dependency tree, not CDN-loaded runtime libraries; those libraries did not receive a separate advisory audit. |
| Privacy notice and storage | **Action / partial verification** | About names Netlify logs, Umami, Google Fonts, jsDelivr, GitHub Pages samples, Hacklily, theme, and draft storage. Browser observed no first-party cookies; draft key is tab session storage and theme persists locally. Finding 2 concerns full query/referrer payloads. Collector receipt, actual hosting-log retention, processor/account settings, historical deletion, and jurisdiction-specific legal duties remain unverified. No blanket consent exemption inferred from cookieless tracking. |
| Published product claims | **Verified with limits** | No-account/free access and browser generation observed. About's AI-development versus runtime-generation distinction agrees with the static architecture. Export, persistence, and mobile-collection limitations are findings above. Keep About's statement that exercises are not a definitive species rulebook: the independent exercise audit still reports zero profile violations but 161 broader textbook findings in 35/40 samples. Human piano-practice review remains open in `plans/counterpoint-audit.md:55`. Historical authorship/model claims were not independently established. |
| Operations and rollback | **Unverified owner evidence** | Netlify build/publish config and manual-only GitHub test workflow inspected. No account access used to verify deployment ownership, alerts, renewal, rollback operation, or analytics settings. With no server-side product data, database restore checks are not applicable. |

## Performance measurements and repeat command

Lighthouse **12.8.2**, headless Chromium **155**, production URLs, default simulated mobile profile: 412 × 823, 4× CPU slowdown, 150ms RTT and about 1.6Mbps throughput. These are separate from the 390/1440 interaction widths. Three runs per page, sequentially, fresh Lighthouse browser sessions. Analytics URLs were blocked to avoid collector writes and isolate the product path. Warm intermediary/CDN caches and other machine activity remain sources of variability. All other Lighthouse run warnings were empty.

| Page | Performance runs | Median FCP | Median LCP | Median TBT | Median CLS | A11y | Best practices / SEO |
|---|---|---|---|---|---|---|---|
| Write | 68, 68, 70 | 3.20 s | 3.58 s | 475 ms | 0.115 | 95 | 100 / 100 |
| Practice home | 83, 84, 85 | 3.25 s | 3.48 s | 57 ms | 0.036 | 94 | 100 / 100 |
| About | 93, 92, 93 | 2.63 s | 2.63 s | 0 ms | 0.027 | 95 | 100 / 100 |

The baseline in [PR #4](https://github.com/emdashii/lilypoint/pull/4) recorded mobile performance 67/78/92 and the same blockers/contrast issue. [PR #5](https://github.com/emdashii/lilypoint/pull/5) enforced CSP after interaction checks. The fresh measurements confirm remaining work; different browser/cache conditions and analytics blocking prevent a causal before/after speed claim. Fresh desktop Lighthouse was not run; the 1440px journey checks are functional evidence, not desktop performance scores. No field CWV or INP measurement is claimed.

Raw reports: `/tmp/lilypoint-launch-2026-11-06/lh-{write,practice,about}-{1,2,3}.json`. Reproduce one run with the locally available CLI:

```sh
node /home/mazzy/.npm/_npx/8003d8991b0d346b/node_modules/lighthouse/cli/index.js \
  https://lilypoint.mazzaella.com/ \
  --chrome-path=/usr/bin/chromium \
  --chrome-flags='--headless --no-sandbox --disable-dev-shm-usage' \
  --blocked-url-patterns='*umami.is*' \
  --output=json --output-path=/tmp/lilypoint-lighthouse.json --quiet
```

Repeat three times sequentially for `/`, `/practice.html`, and `/about.html`, retaining each report. On another machine, use an installed Lighthouse 12.8.2 CLI and record its Chromium version; the local npm cache path is machine-specific. Do not run it alongside a build, test suite, or server. A cached script-load or a blocked analytics request must not be counted as successful analytics verification.

## Screenshot index

All targets below are local artifacts; they are not hosted or included in the commit.

| State | Screenshot path |
|---|---|
| Write, 390 | `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4tdx8b-268f9fc9.png` |
| Write settings expanded, 390 | `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4tf2v4-933efbb0.png` |
| Write, 1440 | `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4tg8p1-22922644.png` |
| Practice home, 390 | `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4ti196-d2b980c2.png` |
| Practice session, 390 | `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4ti1m6-f447a207.png` |
| Practice home, 1440 | `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4tj62p-3d43fa25.png` |
| Practice 16-bar session, 1440 | `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4tj7d5-f43a5ba3.png` |
| Practice 16-bar session, 390 | `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4tkt08-8efe7cb4.png` |
| About, 390 | `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4tlac7-8f8ad22d.png` |
| About, 1440 | `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4tlau8-0f1fd033.png` |
| Classic, 390 | `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4tmoi3-7816258a.png` |
| Classic, 1440 | `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4tncgj-c0fc0557.png` |
| 404, 390 | `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4topyc-4e331296.png` |
| 404, 1440 | `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-lilypoint-mazzaella-com-mw4topue-f3d420e5.png` |
| Downloaded PDF, pages 1 and 2 | `/tmp/lilypoint-launch-2026-11-06/export-pdf-page1.png`, `/tmp/lilypoint-launch-2026-11-06/export-pdf-page2.png` |

## Completion and owner handoff

The assessment is complete. Findings remain unfixed by design. Browser tabs opened for this audit were closed; Lighthouse exited; no local server was started. Existing unrelated servers were left alone. Production probes were GET navigation/resource reads and local browser interaction; no deliberate origin/collector mutation was sent. The analytics payload probe rejected the attempted POST rather than testing collector delivery. Normal page scripts attempted their own analytics requests before interception; their successful delivery was not established.

For Elliott: authorize an implementation pass when ready, starting with findings 1–4. Keep the musical caveat and decide whether saved links promise durable music or only reproducible recipes for a compatible generator. A read-only owner review is still needed for Umami history/retention, hosting ownership/rollback, and any jurisdiction-specific privacy assessment. No account setup, publication change, production write, or deployment is part of this report.
