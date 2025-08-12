import { Species } from './species.js';

export class SecondSpecies extends Species {
	protected noteOptions: number[] = [];
	protected previousIntervals: number[] = [];
	private isStrongBeat: boolean = true;
	private climaxPosition: number = -1;

	/**
	 * Second Species Counterpoint: Two notes against one
	 * Rules:
	 * - Can begin on upbeat (half rest)
	 * - Strong beats (1st half note) must be consonant
	 * - Weak beats (2nd half note) may be dissonant as passing tones
	 * - Passing tones must be approached and left by step
	 * - Unison may occur on weak beats
	 * - No successive strong beat perfect 5ths or octaves
	 */
	chooseNextNote(isStrongBeat: boolean = true): number {
		this.isStrongBeat = isStrongBeat;
		this.noteOptions = [];
		
		// Generate initial options
		this.h_cannotCrossMelody();
		
		if (isStrongBeat) {
			// Strong beat rules - must be consonant
			this.h_onlyConsonantIntervals();
			this.h_noUnison();
			this.m_noParallelPerfectConsonances();
		} else {
			// Weak beat rules - allow passing tones
			this.h_allowPassingTones();
			this.h_allowWeakBeatUnison();
		}
		
		// Common rules
		this.h_avoidDimFifth();
		this.m_noHiddenParallels();
		
		if (this.noteOptions.length === 0) {
			// Fallback
			return this.noteBelow + (isStrongBeat ? 2 : 1); // 3rd for strong, 2nd for weak
		}
		
		const toChoose = Math.floor(Math.random() * this.noteOptions.length);
		return this.noteOptions[toChoose];
	}

	generateCounterpoint(cantusFirmus: number[], length: number, startWithRest: boolean = false): number[] {
		const counterpoint: number[] = [];
		this.findClimaxPosition(length);
		
		let beatIndex = 0;
		
		if (startWithRest) {
			// Start with half rest, then upbeat
			counterpoint.push(0); // Rest representation
			beatIndex++;
		}
		
		// Generate counterpoint notes up to the specified length
		while (counterpoint.length < length) {
			const isStrongBeat = (counterpoint.length % 2) === (startWithRest ? 1 : 0);
			const cantusFirmusIndex = Math.floor(counterpoint.length / 2) % cantusFirmus.length;
			const cantusFirmusNote = cantusFirmus[cantusFirmusIndex];
			
			this.setNoteBelow(cantusFirmusNote);
			if (counterpoint.length > (startWithRest ? 1 : 0)) {
				const prevNote = counterpoint[counterpoint.length - 1];
				if (prevNote !== 0) { // Skip if previous was a rest
					this.setNoteBefore(prevNote);
				}
				if (counterpoint.length > 1) {
					const prevCantusFirmusIndex = Math.floor((counterpoint.length - 1) / 2) % cantusFirmus.length;
					this.setNoteBeforeAndBelow(cantusFirmus[prevCantusFirmusIndex]);
				}
			}
			
			let nextNote: number;
			if (counterpoint.length === (startWithRest ? 1 : 0)) {
				// First actual note must be perfect consonance
				nextNote = Math.random() < 0.7 ? cantusFirmusNote + 7 : cantusFirmusNote + 4;
			} else if (counterpoint.length === length - 1) {
				// Final note - octave resolution
				const finalCantusFirmusIndex = Math.floor((length - 1) / 2) % cantusFirmus.length;
				nextNote = cantusFirmus[finalCantusFirmusIndex] + 7;
			} else {
				nextNote = this.chooseNextNote(isStrongBeat);
			}
			
			counterpoint.push(nextNote);
		}
		
		return counterpoint;
	}

	private findClimaxPosition(totalBeats: number): void {
		// Place climax roughly in the middle third
		const start = Math.floor(totalBeats * 0.3);
		const end = Math.floor(totalBeats * 0.7);
		this.climaxPosition = start + Math.floor(Math.random() * (end - start));
	}

	protected h_cannotCrossMelody(): void {
		// Generate notes above the cantus firmus
		for (let i = this.noteBelow + 1; i <= this.noteBelow + 10; i++) {
			this.noteOptions.push(i);
		}
	}

	protected h_onlyConsonantIntervals(): void {
		// Strong beats: only 3rds, 4ths, 5ths, 6ths, octaves
		this.noteOptions = this.noteOptions.filter(note => {
			const interval = note - this.noteBelow;
			return [2, 3, 4, 5, 7].includes(interval); // 3rd, 4th, 5th, 6th, octave
		});
	}

	protected h_allowPassingTones(): void {
		// Weak beats: allow 2nds and 7ths as passing tones
		// Must be approached and left by step
		if (this.noteBefore !== 0) {
			const stepUp = this.noteBefore + 1;
			const stepDown = this.noteBefore - 1;
			
			// Only allow passing tones that continue stepwise motion
			this.noteOptions = this.noteOptions.filter(note => {
				if (note === stepUp || note === stepDown) {
					return true; // Stepwise motion allowed
				}
				
				const interval = note - this.noteBelow;
				return [2, 3, 4, 5, 7].includes(interval); // Keep consonances
			});
		}
	}

	protected h_noUnison(): void {
		// Remove unison on strong beats
		const index = this.noteOptions.indexOf(this.noteBelow);
		if (index > -1) {
			this.noteOptions.splice(index, 1);
		}
	}

	protected h_allowWeakBeatUnison(): void {
		// Unison is allowed on weak beats - don't remove it
		// This is handled by not calling h_noUnison() for weak beats
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
		
		// Only check parallel motion between strong beats
		if (this.isStrongBeat) {
			const previousInterval = this.noteBefore - this.noteBeforeAndBelow;
			
			// No parallel fifths between strong beats
			if (previousInterval === 4) {
				const index = this.noteOptions.indexOf(this.noteBelow + 4);
				if (index > -1) {
					this.noteOptions.splice(index, 1);
				}
			}
			
			// No parallel octaves between strong beats
			if (previousInterval === 7) {
				const index = this.noteOptions.indexOf(this.noteBelow + 7);
				if (index > -1) {
					this.noteOptions.splice(index, 1);
				}
			}
		}
	}

	protected m_noHiddenParallels(): void {
		if (this.noteBefore === 0 || this.noteBeforeAndBelow === 0) return;
		
		const upperMotion = this.noteBefore > this.noteBelow ? 'up' : 'down';
		const lowerMotion = this.noteBeforeAndBelow > this.noteBelow ? 'up' : 'down';
		
		// If both voices move in same direction to perfect consonance
		if (upperMotion === lowerMotion && this.isStrongBeat) {
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

	// Track intervals for analysis
	updatePreviousIntervals(): void {
		if (this.noteBefore !== 0 && this.noteBelow !== 0) {
			const interval = this.noteBefore - this.noteBelow;
			this.previousIntervals.push(interval);
			
			// Keep only recent intervals
			if (this.previousIntervals.length > 6) {
				this.previousIntervals.shift();
			}
		}
	}
}