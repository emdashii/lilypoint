import { Species } from './species.js';

export class ThirdSpecies extends Species {
	protected noteOptions: number[] = [];
	protected previousIntervals: number[] = [];
	private beatPosition: number = 0; // 0=strong, 1-3=weak beats
	private climaxPosition: number = -1;

	/**
	 * Third Species Counterpoint: Four notes against one
	 * Rules:
	 * - First beat of each measure must be consonant
	 * - Allows two consecutive dissonant passing tones
	 * - More flexibility than first two species
	 * - Can use neighbor tones and other embellishments
	 * - Must maintain good voice leading
	 */
	chooseNextNote(beatPosition: number = 0): number {
		this.beatPosition = beatPosition;
		this.noteOptions = [];
		
		// Generate initial options
		this.h_cannotCrossMelody();
		
		if (beatPosition === 0) {
			// Strong beat (first beat) - must be consonant
			this.h_onlyConsonantIntervals();
			this.h_noUnison();
			this.m_noParallelPerfectConsonances();
		} else {
			// Weak beats - allow more flexibility
			this.h_allowPassingTonesAndNeighbors();
		}
		
		// Common rules
		this.h_avoidDimFifth();
		this.m_avoidLargeLeaps();
		this.m_preferStepwiseMotion();
		
		if (this.noteOptions.length === 0) {
			// Fallback - step in appropriate direction
			return this.noteBefore !== 0 ? 
				   (Math.random() < 0.5 ? this.noteBefore + 1 : this.noteBefore - 1) : 
				   this.noteBelow + 2;
		}
		
		const toChoose = Math.floor(Math.random() * this.noteOptions.length);
		return this.noteOptions[toChoose];
	}

	generateCounterpoint(cantusFirmus: number[], length: number): number[] {
		const counterpoint: number[] = [];
		this.findClimaxPosition(length);
		
		for (let i = 0; i < length; i++) {
			const measure = Math.floor(i / 4);
			const beat = i % 4;
			const cantusFirmusIndex = measure % cantusFirmus.length;
			const cantusFirmusNote = cantusFirmus[cantusFirmusIndex];
			
			this.setNoteBelow(cantusFirmusNote);
			
			if (counterpoint.length > 0) {
				this.setNoteBefore(counterpoint[counterpoint.length - 1]);
				if (i > 0 && beat === 0) {
					const prevCantusFirmusIndex = Math.floor((i - 1) / 4) % cantusFirmus.length;
					this.setNoteBeforeAndBelow(cantusFirmus[prevCantusFirmusIndex]);
				}
			}
			if (counterpoint.length > 1) {
				this.setNoteTwoBefore(counterpoint[counterpoint.length - 2]);
			}
			
			let nextNote: number;
				
			if (i === 0) {
				// First note must be perfect consonance
				nextNote = Math.random() < 0.7 ? cantusFirmusNote + 7 : cantusFirmusNote + 4;
			} else if (i === length - 1) {
				// Final note - octave resolution
				const finalCantusFirmusIndex = Math.floor((length - 1) / 4) % cantusFirmus.length;
				nextNote = cantusFirmus[finalCantusFirmusIndex] + 7;
			} else if (i >= length - 4 && beat === 2) {
				// Approach final resolution
				nextNote = cantusFirmusNote + 1; // Leading tone approach
			} else {
				nextNote = this.chooseNextNote(beat);
			}
			
			counterpoint.push(nextNote);
			this.updatePreviousIntervals();
		}
		
		return counterpoint;
	}

	private findClimaxPosition(totalBeats: number): void {
		// Place climax roughly in the middle third, preferably on a strong beat
		const start = Math.floor(totalBeats * 0.3);
		const end = Math.floor(totalBeats * 0.7);
		let position = start + Math.floor(Math.random() * (end - start));
		
		// Adjust to strong beat (multiple of 4)
		position = Math.floor(position / 4) * 4;
		this.climaxPosition = position;
	}

	protected h_cannotCrossMelody(): void {
		// Generate notes above the cantus firmus
		for (let i = this.noteBelow + 1; i <= this.noteBelow + 10; i++) {
			this.noteOptions.push(i);
		}
	}

	protected h_onlyConsonantIntervals(): void {
		// Strong beats: only consonant intervals
		this.noteOptions = this.noteOptions.filter(note => {
			const interval = note - this.noteBelow;
			return [2, 3, 4, 5, 7].includes(interval); // 3rd, 4th, 5th, 6th, octave
		});
	}

	protected h_allowPassingTonesAndNeighbors(): void {
		// Weak beats: allow dissonances as passing tones or neighbors
		if (this.noteBefore !== 0) {
			// Allow stepwise motion (passing tones)
			const stepUp = this.noteBefore + 1;
			const stepDown = this.noteBefore - 1;
			
			// Add neighbor tones and passing tones to options
			if (!this.noteOptions.includes(stepUp) && stepUp <= this.noteBelow + 10) {
				this.noteOptions.push(stepUp);
			}
			if (!this.noteOptions.includes(stepDown) && stepDown > this.noteBelow) {
				this.noteOptions.push(stepDown);
			}
			
			// Allow returning to previous note (neighbor tone pattern)
			if (this.noteTwoBefore !== 0 && this.beatPosition === 3) {
				const returnNote = this.noteTwoBefore;
				if (!this.noteOptions.includes(returnNote) && returnNote > this.noteBelow) {
					this.noteOptions.push(returnNote);
				}
			}
		}
		
		// Keep consonant intervals as well
		this.noteOptions = this.noteOptions.filter(note => {
			const interval = note - this.noteBelow;
			const isConsonant = [2, 3, 4, 5, 7].includes(interval);
			const isStepwise = this.noteBefore !== 0 && Math.abs(note - this.noteBefore) <= 2;
			
			return isConsonant || isStepwise;
		});
	}

	protected h_noUnison(): void {
		// Remove unison on strong beats
		if (this.beatPosition === 0) {
			const index = this.noteOptions.indexOf(this.noteBelow);
			if (index > -1) {
				this.noteOptions.splice(index, 1);
			}
		}
	}

	protected h_avoidDimFifth(): void {
		// Avoid diminished fifth (tritone) - especially on strong beats
		if (this.noteBelow % 7 === 0 || this.noteBelow % 7 === 6) {
			const index = this.noteOptions.indexOf(this.noteBelow + 3);
			if (index > -1 && (this.beatPosition === 0 || Math.random() < 0.7)) {
				this.noteOptions.splice(index, 1);
			}
		}
	}

	protected m_noParallelPerfectConsonances(): void {
		if (this.noteBefore === 0 || this.noteBeforeAndBelow === 0) return;
		
		// Check parallel motion between strong beats
		if (this.beatPosition === 0) {
			const previousInterval = this.noteBefore - this.noteBeforeAndBelow;
			
			[4, 7].forEach(interval => { // 5th and octave
				if (previousInterval === interval) {
					const index = this.noteOptions.indexOf(this.noteBelow + interval);
					if (index > -1) {
						this.noteOptions.splice(index, 1);
					}
				}
			});
		}
	}

	protected m_avoidLargeLeaps(): void {
		if (this.noteBefore === 0) return;
		
		// Prefer smaller intervals, especially after leaps
		const previousLeap = Math.abs(this.noteBefore - (this.noteTwoBefore || this.noteBefore));
		
		if (previousLeap > 2) { // Previous was a leap
			// Prefer stepwise motion after leap
			this.noteOptions = this.noteOptions.filter(note => {
				const interval = Math.abs(note - this.noteBefore);
				return interval <= 2; // Step or same note
			});
		} else {
			// Allow moderate leaps but prefer steps
			this.noteOptions = this.noteOptions.filter(note => {
				const interval = Math.abs(note - this.noteBefore);
				return interval <= 4; // Up to perfect fourth
			});
		}
	}

	protected m_preferStepwiseMotion(): void {
		// Give preference to stepwise motion by weighting options
		if (this.noteBefore !== 0 && this.noteOptions.length > 3) {
			const stepwise = this.noteOptions.filter(note => 
				Math.abs(note - this.noteBefore) <= 1
			);
			
			// If stepwise options exist, favor them
			if (stepwise.length > 0 && Math.random() < 0.6) {
				this.noteOptions = stepwise;
			}
		}
	}

	updatePreviousIntervals(): void {
		if (this.noteBefore !== 0 && this.noteBelow !== 0) {
			const interval = this.noteBefore - this.noteBelow;
			this.previousIntervals.push(interval);
			
			// Keep sliding window of recent intervals
			if (this.previousIntervals.length > 8) {
				this.previousIntervals.shift();
			}
		}
	}
}