# Counterpoint rule profiles

`student` is the generation profile. `historical` preserves the Fux fixture policy and is the default for existing validator constructors. Pass `student` explicitly when validating a practice score. These are application policies, not a claim to encode every historical school of counterpoint.

Both profiles check continuity, equal voice duration, valid ties, exact subdivisions in species 1 through 4, opening and closing perfect intervals, parallel perfect intervals, melodic leap limits, and dissonance preparation and resolution. Harmonic analysis checks both voices at every change time. Rhythm checks count notated subdivisions, including tie continuations.

The student profile adds these requirements:

- Voices never cross and remain within 16 semitones.
- Similar motion cannot approach a perfect interval at a cantus change.
- A melodic leap larger than a third is followed by a contrary step. Ties do not count as melodic moves.
- Spelled melodic intervals cannot be augmented or diminished. Harmonic consonances must have consonant spelling as well as consonant sound.
- The cadence uses contrary steps into a unison or octave. An ascending final approach is a semitone, including in minor.
- Third species requires consonance on the first and third subdivisions. Florid half-pulse positions also require consonance unless tied as a suspension.
- Fourth species starts with a half-pulse rest, sustains every interior downbeat, and ends with a dissonant suspension. This initial profile allows zero breaks in syncopation.
- Fourth species also checks consecutive weak-beat perfect intervals.

The historical profile permits the existing fixture exceptions for crossing, spacing, cadences, melodic recovery, and rhythmic position. Fixture acceptance never changes the student profile.

The generator searches within these constraints and independently validates the assembled, spelled score before returning it. A bounded search can fail explicitly. A valid score does not establish good phrasing, comfortable piano fingering, or reviewed engraving.

References: [first species](https://openmusictheory.github.io/firstSpecies.html), [third species](https://openmusictheory.github.io/thirdSpecies.html), and [fourth species](https://openmusictheory.github.io/fourthSpecies.html) in Open Music Theory. The zero-break policy and mandatory third-subdivision consonance deliberately restrict the available exercises.
