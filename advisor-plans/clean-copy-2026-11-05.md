# lilypoint clean-copy audit — 2026-11-05

## Implementation — 2026-11-05

Re-checked all six findings against the current source before editing. Copy changes landed in `df511ef`.

| Finding | Status | Commit |
|---|---|---|
| 1 | Cut the architecture paragraph. | `df511ef` |
| 2 | Cut the heading and build paragraph. Omitted the proposed sharing sentence: 06 keeps its collection in memory, and 08 transfers kept phrases to 07 but does not restore its own collection from the URL. The blanket promise is unsupported. | `df511ef` |
| 3 | Shortened the writing-room description and metadata as proposed. | `df511ef` |
| 4 | Cut the permanent Kept caption. | `df511ef` |
| 5 | Replaced the deck empty-state sentence as proposed. | `df511ef` |
| 6 | Cleared the initial hint text; preserved the error target and render assignments. | `df511ef` |

Validation: `bun run test:all` passed (390 tests, zero failures; typecheck, build, and built-site checks passed). The exercise audit reported zero profile violations and 161 textbook findings. No tests asserted the removed strings, so no test edits were needed. No CSS, layout rules, or behavior changed.

Headless screenshots reviewed at 390 × 844 and 1440 × 1000 CSS pixels for the gallery, deck empty state, sentence editor, and roll. Browser tab and local static server closed after capture. Existing phone overflow remains outside this copy-only scope.

Screenshot artifacts (local to this machine):

- gallery-phone: `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mw458lvt-087b0616.png`
- gallery-desktop: `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mw458mce-bb78e6c5.png`
- deck-phone: `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mw458n53-e1100769.png`
- deck-desktop: `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mw458nhx-fbf8473e.png`
- sentence-phone: `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mw458nwv-4c6ebe3c.png`
- sentence-desktop: `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mw458omg-4dfd5684.png`
- roll-phone: `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mw458p7l-4ace5409.png`
- roll-desktop: `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mw458ppr-6e21c24c.png`


Scope: user-facing strings across the main pages, classic interface, public prototypes, and shared UI scripts, reviewed with the clean-copy skill. Recommendations only; no application changes. Ranked by expected reader value and confidence. Paths are relative to this repository.

Source snapshot: HEAD `669705cd22369ed767509a0264c89ea32f320731`. The working tree was clean when checked. The public prototype gallery is in scope: `public/about.html:47` links readers to it.

Additional footer screenshots:

- gallery-footer-390: `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mw45a24o-14858953.png`
- gallery-footer-1440: `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mw45a2ul-15692dd0.png`
- roll-kept-390: `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mw45a3rm-93c5c304.png`
- roll-kept-1440: `/home/mazzy/.t3/userdata/browser-artifacts/browser-screenshot-localhost-mw45a4ok-44da05e5.png`

After merging the incoming test-audit PR in `0e611e6`, reran `bun run test:all`: passed, 377 tests and zero failures, including typecheck, build, and built-site checks. The incoming PR removed redundant tests; application copy was unchanged by the merge.

## Ranked findings

### 1. Cut implementation architecture from the public prototype gallery

- Location: `public/proto/index.html:57`.
- Current: “Shared code lives in public/proto/shared/: a small adapter over the generator, converters to ABC and MusicXML, the three renderers, a Web Audio player, and the PDF helpers. Any page can swap its renderer for another one.”
- Proposed: cut.
- Reason: pre-empts a worry users don't have. People choosing a music interface do not need its module location, converter architecture, or renderer interchangeability. This has no bearing on a control they can use.
- Verification: gallery context and public link verified in source; developer use of this gallery was not verified. This recommendation concerns the public UI, not removal of technical documentation elsewhere.

### 2. Remove the build instructions from the running site

- Location: `public/proto/index.html:59`–`:60`.
- Current heading: “Running them”
- Proposed heading: cut.
- Current paragraph: “Build once with bun run build, serve dist/, and open /proto/. Each page keeps its phrases in the URL, so a link reproduces the same score.”
- Proposed paragraph: “Share a page’s URL to share its score.”
- Reason: pre-empts a worry users don't have. Someone already visiting the gallery can open its links without building the app. Retain the useful URL-sharing behavior rather than deleting it with the setup instructions.
- Verification: existing promise quoted from source; URL round trips for all eight prototypes were not tested. Verify that behavior before publishing the replacement.

### 3. Remove PDF correctness and theme reassurance from the writing-room card

- Location: `public/proto/index.html:39` (two strings on the same line).
- Current description: “The sheet, with a live editor. Select any phrase in the margin, change its settings, reroll it, or move it into place. Sampled piano, highlighted notes, and complete staves in the PDF.”
- Proposed description: “The sheet, with a live editor. Select any phrase in the margin, change its settings, reroll it, or move it into place. Sampled piano and highlighted notes.”
- Current metadata: “New synthesis. White paper in either theme. Keyboard: space, R, N.”
- Proposed metadata: “Keyboard: space, R, N.”
- Reason: pre-empts worries users don't have. Complete staves are an expected property of an exported score, and theme-independent white paper defends an implementation choice. “New synthesis” is development status without a reader action. Keep the shortcuts and useful capabilities.
- Verification: strings and surrounding card verified. This resembles fixed-bug reassurance, but no bug history or PDF correctness was verified; do not describe it as a confirmed fixed bug.

### 4. Cut the permanent caption under “Kept”

- Location: `public/proto/06-roll.html:74`; heading at `:73`, empty state at `:76`, export buttons at `:78`–`:80`.
- Current: “Phrases you keep collect here, in order, ready to print as one piece.”
- Proposed: cut.
- Reason: restates a label and nearby controls. “Kept,” the ordered collection, “Save kept as PDF,” and “Play kept” already explain the destination and available actions. The existing empty state remains.
- Verification: surrounding markup verified; no rendering or collection interaction was tested.

### 5. Remove rendering reassurance from the deck empty state

- Location: `public/proto/02-deck.html:72`; “Add phrase” button at `:77`.
- Current: “No phrases yet. Add one below and it appears here already engraved.”
- Proposed: “No phrases yet. Add a phrase to begin.”
- Reason: pre-empts a worry users don't have about whether added music will be engraved. Preserve the blank-state meaning and next action.
- Verification: empty-state and button context verified; visibility transitions not tested.

### 6. Remove the transient sentence-editor hint

- Location: `public/proto/04-sentence.html:49`; render update at `:111`.
- Current: “The music appears as soon as you change a word.”
- Proposed: cut the initial text; preserve the element used for errors.
- Reason: pre-empts a worry users don't have about whether changing the controls updates the score. Successful rendering already clears this hint, so its initial text also acts as transient startup copy.
- Verification: render assignment verified in source. Do not delete the shared error target: failure copy at `:111` is load-bearing. Startup timing was not tested.

## Copy to retain / verification limits

- `public/about.html:53`: retain draft/session persistence and download guidance. Losing music on reload or navigation is a real consequence.
- `public/about.html:52`: retain the generator's musical-authority limitation; it describes actual scope rather than a confirmed repaired defect.
- `public/practice.html:36` and `public/proto/08-lessons.html:8`: retain the explanation that played-through exercises join kept phrases in print; the distinction is not obvious from the buttons.
- `public/proto/shared/studio.js:105`: retain the piano-loading failure and retry action in its actual failure state.
- `public/proto/index.html:52`–`:55`: renderer comparisons may help technical prototype review; their suitability depends on the intended gallery audience. No blanket deletion recommended without that context.

This was a static source audit, not a rendered or exhaustive runtime-state audit. No browser, build, test, server, installation, network request, or production access was used. No historical bug provenance was verified. Main-room controls were substantially leaner than the prototype-gallery copy; recommendations concentrate on the latter rather than inventing main-room problems. No source, commit, or deployment was changed; only this report was written.
