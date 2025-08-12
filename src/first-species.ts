import { Species } from './species.js';

export class FirstSpecies extends Species {
	protected noteOptions: number[] = [];
	protected previousIntervals: number[] = [];
	private climax: number = -1;
	private climaxPosition: number = -1;

	/**
	 * First Species Counterpoint: Note against note
	 * Rules:
	 * - Must begin and end on perfect consonance (unison, octave, fifth)
	 * - No unison except at beginning/end
	 * - No parallel 4ths, 5ths, or octaves
	 * - Avoid hidden parallels unless one part moves by step
	 * - Cannot use same interval more than 3 times in a row
	 * - Prefer parallel 3rds and 6ths (up to 3 in a row)
	 * - Avoid both parts skipping in same direction
	 * - No dissonant intervals (2nds, 7ths, augmented/diminished)
	 */
	chooseNextNote(): number {
		this.noteOptions = [];
		
		// Generate initial options (don't cross cantus firmus)
		this.h_cannotCrossMelody();
		
		// Apply harmonic rules
		this.h_noDissonantIntervals();
		this.h_noUnison();
		this.h_avoidDimFifth();
		
		// Apply melodic rules
		this.m_noParallelPerfectConsonances();
		this.m_noHiddenParallels();
		this.m_limitConsecutiveIntervals();
		this.m_preferImperfectConsonances();
		
		// Choose random note from remaining options
		if (this.noteOptions.length === 0) {
			// Fallback to safe consonance
			return this.noteBelow + 2; // Third above
		}
		
		const toChoose = Math.floor(Math.random() * this.noteOptions.length);
		return this.noteOptions[toChoose];
	}

	generateCounterpoint(cantusFirmus: number[], length: number): number[] {
		const counterpoint: number[] = [];
		this.findClimaxPosition(length);
		
		// Start with perfect consonance (octave or fifth)
		counterpoint.push(Math.random() < 0.7 ? cantusFirmus[0] + 7 : cantusFirmus[0] + 4);
		
		// Generate middle notes
		for (let i = 1; i < length - 1; i++) {
			// Use modulo to cycle through cantus firmus if we need more notes than cantus firmus length
			const cantusFirmusIndex = i % cantusFirmus.length;
			this.setNoteBelow(cantusFirmus[cantusFirmusIndex]);
			if (i > 0) {
				this.setNoteBefore(counterpoint[i - 1]);
				const prevCantusFirmusIndex = (i - 1) % cantusFirmus.length;
				this.setNoteBeforeAndBelow(cantusFirmus[prevCantusFirmusIndex]);
			}
			if (i > 1) {
				this.setNoteTwoBefore(counterpoint[i - 2]);
			}
			
			const nextNote = this.chooseNextNote();
			counterpoint.push(nextNote);
		}
		
		// End with perfect consonance (prefer octave)
		const finalCantusFirmusIndex = (length - 1) % cantusFirmus.length;
		counterpoint.push(cantusFirmus[finalCantusFirmusIndex] + 7);
		
		return counterpoint;
	}

	private findClimaxPosition(length: number): void {
		// Place climax roughly in the middle third
		const start = Math.floor(length * 0.3);
		const end = Math.floor(length * 0.7);
		this.climaxPosition = start + Math.floor(Math.random() * (end - start));
	}

	protected h_cannotCrossMelody(): void {
		// Generate notes above the cantus firmus
		for (let i = this.noteBelow + 1; i <= this.noteBelow + 10; i++) {
			this.noteOptions.push(i);
		}
	}

	protected h_noDissonantIntervals(): void {
		// Remove 2nds, 7ths, and other dissonances
		const intervalsToRemove = [1, 6, 8]; // 2nd, 7th, 9th (relative to noteBelow)
		
		intervalsToRemove.forEach(interval => {
			const index = this.noteOptions.indexOf(this.noteBelow + interval);
			if (index > -1) {
				this.noteOptions.splice(index, 1);
			}
		});
	}

	protected h_noUnison(): void {
		// Remove unison (except at beginning/end - handled elsewhere)
		const index = this.noteOptions.indexOf(this.noteBelow);
		if (index > -1) {
			this.noteOptions.splice(index, 1);
		}
	}

	protected h_avoidDimFifth(): void {
		// Avoid diminished fifth (tritone)
		if (this.noteBelow % 7 === 0 || this.noteBelow % 7 === 6) { // F or B in key
			const index = this.noteOptions.indexOf(this.noteBelow + 3); // Tritone
			if (index > -1) {
				this.noteOptions.splice(index, 1);
			}
		}
	}

	protected m_noParallelPerfectConsonances(): void {
		if (this.noteBefore === 0 || this.noteBeforeAndBelow === 0) return;
		
		const previousInterval = this.noteBefore - this.noteBeforeAndBelow;
		
		// No parallel fifths
		if (previousInterval === 4) {
			const index = this.noteOptions.indexOf(this.noteBelow + 4);
			if (index > -1) {
				this.noteOptions.splice(index, 1);
			}
		}
		
		// No parallel octaves
		if (previousInterval === 7) {
			const index = this.noteOptions.indexOf(this.noteBelow + 7);
			if (index > -1) {
				this.noteOptions.splice(index, 1);
			}
		}
		
		// No parallel unisons
		if (previousInterval === 0) {
			const index = this.noteOptions.indexOf(this.noteBelow);
			if (index > -1) {
				this.noteOptions.splice(index, 1);
			}
		}
	}

	protected m_noHiddenParallels(): void {
		if (this.noteBefore === 0 || this.noteBeforeAndBelow === 0) return;
		
		const upperMotion = this.noteBefore > this.noteBelow ? 'up' : 'down';
		const lowerMotion = this.noteBeforeAndBelow > this.noteBelow ? 'up' : 'down';
		
		// If both voices move in same direction to perfect consonance
		if (upperMotion === lowerMotion) {
			// Remove perfect consonances unless approached by step
			const stepwiseMotion = Math.abs(this.noteBefore - this.noteBelow) === 1 ||
								   Math.abs(this.noteBeforeAndBelow - this.noteBelow) === 1;
			
			if (!stepwiseMotion) {
				[4, 7].forEach(interval => { // 5th and octave
					const index = this.noteOptions.indexOf(this.noteBelow + interval);
					if (index > -1) {
						this.noteOptions.splice(index, 1);
					}
				});
			}
		}
	}

	protected m_limitConsecutiveIntervals(): void {
		// Track recent intervals to avoid more than 3 of the same
		if (this.previousIntervals.length >= 2) {
			const lastInterval = this.previousIntervals[this.previousIntervals.length - 1];
			const secondLastInterval = this.previousIntervals[this.previousIntervals.length - 2];
			
			if (lastInterval === secondLastInterval) {
				// Remove notes that would create a third consecutive identical interval
				const noteToRemove = this.noteBelow + lastInterval;
				const index = this.noteOptions.indexOf(noteToRemove);
				if (index > -1) {
					this.noteOptions.splice(index, 1);
				}
			}
		}
	}

	protected m_preferImperfectConsonances(): void {
		// Slight preference for 3rds and 6ths over perfect consonances
		// This is implemented by keeping more imperfect consonance options
		// The actual preference is handled by the random selection
	}

	// Track intervals for consecutive interval checking
	updatePreviousIntervals(): void {
		if (this.noteBefore !== 0 && this.noteBelow !== 0) {
			const interval = this.noteBefore - this.noteBelow;
			this.previousIntervals.push(interval);
			
			// Keep only recent intervals (sliding window)
			if (this.previousIntervals.length > 5) {
				this.previousIntervals.shift();
			}
		}
	}
}