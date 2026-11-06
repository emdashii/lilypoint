# Launch-readiness fixes: findings 1 and 2 — 2026-11-06

This note records the fixes for findings 1 and 2 of [the launch-readiness audit](launch-readiness-2026-11-06.md). The audit text is unchanged. Findings 3–10 remain open.

Work was done on the local branch `fix/launch-readiness-2026-11-06`, starting from `b5e48ea`. Nothing was pushed or deployed, and the live site was not used. Each finding was reproduced on an unchanged build before the fix. Raw output is in `tests/temp/launch-readiness-fixes-2026-11-06/`, which Git ignores. The excerpts below are the record.

## 1. Fractional tempo no longer deletes a phrase

**Policy.** `normalizeTempo` in `public/proto/shared/core.js` is the only tempo rule. A tempo is a whole number from 30 to 200. Fractions round to the nearest whole number, with halves rounding up, so `30.5` becomes 31. Out-of-range values clamp to 30 or 200. Blank, `0`, and unreadable input become 80, as before.

**Where it applies.**

- `transportOptions()` in `studio.js` returns the normalized tempo, so Write, Practice keeps, playback, MIDI, and LilyPond all use the saved value.
- `wireTransport()` writes the normalized tempo back into the field on `change`, so the field shows what is saved and played.
- Write's `input` handler applies a value while you type only when normalizing would not change it. Leaving the field normalizes anything else.
- `decodeSpecs()` normalizes the tempo field of seven-field links.

**Links already saved with a fractional tempo.** Before this fix, `30.5` saved as `C.major.1.2.2-4.1.30.5`: eight fields that were silently dropped. `decodeSpecs()` now reads exactly this shape, where fields 7 and 8 are both digit-only, as one decimal tempo and normalizes it. Every split link that earlier builds wrote has this shape, because `transportOptions()` already produced a finite number from 30 to 200. Other malformed entries are still dropped without a message. The audit's suggestion to reject invalid state visibly is not implemented.

**Regression.** `test/proto-score-state.mjs` types blank, 0, 29, 30, 30.5, 200, and 201 through `transportOptions()`, checks the tempo, and round-trips each phrase through `encodeSpecs` and `decodeSpecs`. It also decodes a mixed link that contains one split tempo. It asserts that an empty `p` stays an empty sheet.

Before the fix (`tempo-red-baseline.txt`, `tempo-baseline-probe.txt`):

```text
AssertionError: Typed tempo "30.5"
30.5 !== 31
encode tempo 30.5 -> C.major.1.2.2-4.1.30.5
decode -> []
decode mixed bug link -> [{"key":"D",...,"seed":7,"tempo":80}]
```

After the fix (`tempo-green.txt`): `Phrase tempos round-trip; repeated markings are omitted; C minor stays on C.`, exit 0.

**Browser check.** This check used T3 server Chromium, an incognito profile, and a local server over `dist/`. The baseline run repeated the audit: typing `30.5` and pressing Tab saved `p=C.major.1.2.2-4.1.30.5`, and reloading showed `No phrases yet.` and overwrote the draft with `?p=&...`. After the fix, at 1440 × 1000:

- `30.5` + Tab shows `31` in the field, `= 31` on the staff, `Phrase 1 · ♩ 31` in the status, and `...1.31` in the URL.
- Reload, then About, then `/` (draft restore): one phrase, eight notes, tempo 31.

At 390 × 844, the old split link `/?p=C.major.1.2.2-4.1.30.5&...` opens with its phrase at tempo 31. The page has no horizontal scroll. Blank, 0, 29, 30, 200, 201, 30.5, and 64.4 each keep the phrase, and the field matches the saved value. In Practice, `30.5` + Tab shows 31, and **Keep** then **Open as a sheet** opens Write with `...264465846.31` and one phrase. Screenshots: `write-tempo-30.5-after-1440.png` and `write-tempo-boundaries-after-390.png`.

## 2. Pageviews no longer carry score data

**Change.** The Umami tag on each tracked page, `index`, `practice`, `about`, `classic`, and `404`, now adds `data-exclude-search="true"` and `data-exclude-hash="true"`. The tags keep `data-domains="lilypoint.mazzaella.com"`. No `data-before-send` hook was added, so `_headers` needs no new script hash. Errors, performance, and custom events stay off.

**Tracker behavior.** The [Umami tracker configuration docs](https://docs.umami.is/docs/tracker-configuration) say both attributes remove data "from the URL". They do not mention the referrer. The installed tracker was checked directly: `https://cloud.umami.is/script.js`, downloaded 2026-11-06 20:34 UTC, `last-modified` 5 November 2026, SHA-256 `c11c9d29ac15ee26ef07059add176fd7db95acbf8e8bdb1a79796b0ffdb58f18`. Its URL sanitizer applies to the first page URL, to `document.referrer`, and to every `pushState` and `replaceState` URL. The tracker sends a history pageview only when the sanitized URL changes. Because Write changes only the query string, editing sends nothing.

**Regression.** `test/site-static.mjs` checks every built HTML file. Each of the five tracked pages has exactly one Umami tag, and every other page has none. Each tag carries both exclusions and the production domain. No tag sets `data-errors`, `data-performance`, `data-auto-track`, or `data-auto-pageview`. This checks configuration only. The browser run below shows what that configuration does.

Before the fix (`analytics-red-baseline.txt`): `dist/404.html analytics tag is missing data-exclude-search="true"`, exit 1. After the fix (`analytics-green.txt`): `site static files ok`, exit 0.

**Browser check.** The browser check used the same server. In the harness only, the server served the downloaded tracker and set `data-host-url` to a local sink, so no payload reached Umami. It also set `data-domains` to `localhost` so the tracker would run. The journey was the same for both runs: About, then a shared Write link with a title and composer, title and tempo edits, reload, then About and `/`.

| Run | Navigations | Payloads | Score data in `url` or `referrer` |
|---|---|---|---|
| Baseline (`sink-baseline-summary.txt`) | 5 | 7: two came from edits | Yes. Specs, title, composer, and `selected` appeared in both fields, including the About referrer. |
| After the fix (`sink-after-summary.txt`) | 9: the same journey, plus the old split link, Practice handoff, and `/about.html#privacy` | 9: none came from edits | None. `grep` for `p=`, `title=`, `composer=`, `selected`, the typed title and composer, and `#privacy` found 0 matches. |

After the fix, every payload is `type: "event"`, and `url` is the page path with no query or hash. With the shipped `data-domains`, the tracker loaded on `localhost` and sent 0 payloads (`sink-gate-after.jsonl`). The production-only gate still holds.

**Privacy text.** The Privacy paragraph in `about.html` was not changed. It says Umami records "the page visited, the referring site, and browser, device, language, and country". That now matches what is sent.

## Checks

`bun run test:all` passed (`test-all.txt`). It ran the typecheck, 377 Bun tests in 15 files with 0 failures, the build, and the built-site checks. `bun.lock` was not touched. Its SHA-256 stayed `b6c6a79f98be3d267163a943f23a757a3fa2173702e734628adc6fa9c1fed8b9`.

The parent reviewed the source diff, red/green output, payload logs, and both screenshots before committing. Main and origin/main stayed at `b5e48ea`.

**Process exception.** Builds and tests ran sequentially in the foreground, but the implementation delegate started the browser verification server detached three times. This violated the requested foreground-only server rule. All three instances were stopped, port 4173 is free, and the delegate closed both browser tabs it opened.

## Before merging

Elliott should check the rounding behavior (`30.5` becomes 31), reopening an old fractional-tempo link, and restoring the tab draft. Check the pageview payloads with the current Umami tracker in an isolated local capture: both URL and referrer must omit the query and hash, and score edits must not add pageviews. Review historical collection and retention through the owner's Umami account. Merging and pushing main triggers production deployment, so schedule that action when Elliott can verify it.

## Not covered

- **Collector side.** Delivery to Umami, data already collected, retention, and deletion still need the owner's read-only Umami account review.
- **Tracker version.** Production loads the tracker from Umami Cloud without a pinned version. A later tracker could change how it sanitizes URLs. The static test checks the configuration, not the remote script.
- **Silent drops.** Malformed links other than the split-tempo shape are still dropped without a message.
- **Devices.** Width checks in Chromium do not establish behavior in iPhone Safari or on touch devices.
- **Saved-link durability.** Finding 7 is out of scope. Saved links still regenerate music from the current generator.
