# Practice collection and session verification

Verified October 2–3, 2026 in the Windows worktree on `codex/overnight-practice-2026-10-02`, starting from `c19179d`. The main checkout and its untracked launch/test plans were read-only context. Generation profiles and validators were not changed.

## Automated checks

All commands passed on Bun 1.3.14:

- `bun test`: 387 tests, 0 failures.
- `bun run typecheck`.
- `bun run build`.
- `bun test/proto-score-state.mjs`.
- `bun test/proto-generation.mjs`.
- `bun test/proto-smoke.mjs`.
- `bun test/site-static.mjs`.
- `bun test/practice-collection.mjs`.
- `bun test/practice-session.mjs`.
- `git diff --check`.

The two new built-module scripts are part of `test:built` and therefore `test:all`. They check exact stored-event restoration, MIDI note-on/off pitch and timing, merged ties, version/corruption rejection, and preservation of existing storage after failed imports and quota/denial errors. Storage faults use an injected storage adapter.

## Browser evidence

T3 preview drove the real `/practice.html` and `/` pages served from built `dist/` at `http://localhost:8765`. No prototype page was used for these journeys.

The final empty-Write-draft check used a fresh preview origin at `http://localhost:8766` to avoid an older cached Write module. Removing every phrase, reloading, and returning to Write preserved the empty sheet with save/handoff controls disabled and no score-load error.

| Journey | Observed result |
| --- | --- |
| Generate fourth species, name it, save, reload, open in Write | The exact Write draft snapshots matched the collection's stored snapshots. Notation rendered after reload. |
| Write → Practice | The snapshot handoff rendered the saved D-minor score. |
| Collection export/import | Captured the downloaded JSON Blob and selected it through the page's file input using `File`/`DataTransfer`. The stored collection was unchanged after the round trip. |
| Build a session | Added saved exercises, edited target tempo/repetitions/notes, reordered the queue, and added a distinct F-major 6/8 exercise. |
| Session interrupt → reload → resume | Whole-session JSON matched before and after reload. Exercise index, repetition, tick position, tempo, notes, ranges, clefs, voice selection, count-in and loop settings restored. Audio did not start automatically. |
| Pause, seek and tempo change | Paused position stayed frozen. Seek moved to the requested ticks. Playback resumed at the changed tempo with notation highlights. |
| Repetitions and transitions | A two-repetition measure range advanced to the next exercise, then reached session complete. |
| Count-in and voices | The 6/8 exercise counted two dotted-quarter beats. Its upper voice was muted for lower-only playback. |
| Notation/audio pitches, ties and timing | Compared abcjs's actual flattened note tracks with canonical snapshot playback events. All audible pitches, onsets and durations matched for D-minor suspensions with alto/bass clefs and the lower voice of the 6/8 exercise. The complete audio-buffer duration matched the stored score duration at the target tempo. |
| Practice MIDI | Captured the downloaded MIDI Blob. Its bytes matched `midiBytes` from the shared Write exporter for the focused restored score. |
| Session export/import | Downloaded JSON passed through the actual file input and restored the same stored session. |
| Audio refusal | Injected a rejection into `AudioContext.resume`. Play returned to a recoverable state and retained position. Restoring the method allowed retry. |
| Missing samples | Redirected abcjs sample loading to local missing files, producing real HTTP 404s. Playback reported failure and retained position. Restoring the sample route allowed retry. |

Browser fault injection and file selection were confined to the preview page. Production assets contain no fault hooks. The session owns independent snapshots, so collection deletion cannot change its music.

## Limits

No human listening assessment, physical MIDI instrument test, exhaustive PDF engraving review, mobile device pass, or Safari/Firefox pass was performed. Browser startup refusal was simulated; no actual browser permission setting was changed. Actual device quota exhaustion was not induced; the storage adapter tests exercise the same throwing write path. Complete offline rendering is not supported: abcjs, fonts and piano samples still require network access. An abrupt process crash can lose up to one second of session position between saves; normal navigation/pause saves immediately.

**Exercise MIDI** exports the complete focused score. Selected ranges, repetition counts and voice muting affect rehearsal, not the downloaded score. Existing six/seven-field share URLs retain their generation behavior; saved-score handoffs and drafts restore stored notes.
