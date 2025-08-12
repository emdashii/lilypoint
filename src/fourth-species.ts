import { Species } from './species.js';

export class FourthSpecies extends Species {
	protected noteOptions: number[] = [];
	protected previousIntervals: number[] = [];
	private isSyncopated: boolean = false;
	private needsResolution: boolean = false;
	private climaxPosition: number = -1;
	private suspensionChain: number = 0;

	/**
	 * Fourth Species Counterpoint: Syncopated notes with suspensions
	 * Rules:
	 * - Notes are tied over bar lines creating suspensions
	 * - First beat often dissonant (suspension)
	 * - Second beat consonant (resolution)
	 * - Creates 'prepare-suspend-resolve' patterns
	 * - Can break syncopation for variety
	 */
	chooseNextNote(isSyncopated: boolean = true, needsResolution: boolean = false): number {
		this.isSyncopated = isSyncopated;
		this.needsResolution = needsResolution;
		this.noteOptions = [];
		
		// Generate initial options
		this.h_cannotCrossMelody();
		
		if (needsResolution) {
			// Must resolve suspension downward by step
			this.m_resolveDissonanceDownward();
		} else if (isSyncopated) {
			// Syncopated beat - can be dissonant
			this.h_allowSuspensions();
		} else {
			// Non-syncopated - must be consonant
			this.h_onlyConsonantIntervals();
			this.h_noUnison();
		}
		
		// Common rules
		this.h_avoidDimFifth();
		this.m_noParallelPerfectConsonances();
		this.m_manageSuspensionChain();
		
		if (this.noteOptions.length === 0) {
			// Fallback
			if (needsResolution && this.noteBefore > this.noteBelow) {
				return this.noteBefore - 1; // Step down resolution
			}
			return this.noteBelow + 2; // Safe third
		}
		
		const toChoose = Math.floor(Math.random() * this.noteOptions.length);
		const chosen = this.noteOptions[toChoose];
		
		// Track suspension chains
		if (isSyncopated && this.isDissonant(chosen)) {
			this.suspensionChain++;
		} else {
			this.suspensionChain = 0;
		}
		
		return chosen;
	}

	generateCounterpoint(cantusFirmus: number[], length: number): number[] {
		const counterpoint: number[] = [];
		this.findClimaxPosition(length);
		
		// Generate exactly 'length' number of notes
		for (let i = 0; i < length; i++) {
			const cantusFirmusIndex = Math.floor(i / 2) % cantusFirmus.length;
			const cantusFirmusNote = cantusFirmus[cantusFirmusIndex];
			const isSyncopated = (i % 2) === 1;
			
			this.setNoteBelow(cantusFirmusNote);
			if (i > 0) {
				this.setNoteBefore(counterpoint[i - 1]);
				if (i > 1) {
					const prevCantusFirmusIndex = Math.floor((i - 1) / 2) % cantusFirmus.length;
					this.setNoteBeforeAndBelow(cantusFirmus[prevCantusFirmusIndex]);
				}
			}
			
			let nextNote: number;
			if (i === 0) {
				// First note must be perfect consonance
				nextNote = Math.random() < 0.7 ? cantusFirmusNote + 7 : cantusFirmusNote + 4;
			} else if (i === length - 1) {
				// Final note - octave resolution
				const finalCantusFirmusIndex = Math.floor((length - 1) / 2) % cantusFirmus.length;
				nextNote = cantusFirmus[finalCantusFirmusIndex] + 7;
			} else {
				const needsResolution = i > 0 && this.isDissonant(counterpoint[i - 1]);
				nextNote = this.chooseNextNote(isSyncopated, needsResolution);
			}
			
			counterpoint.push(nextNote);
		}
		
		return counterpoint;
	}

	private findClimaxPosition(totalBeats: number): void {
		const start = Math.floor(totalBeats * 0.3);
		const end = Math.floor(totalBeats * 0.7);
		// Prefer climax on suspension (odd-numbered beats)
		let position = start + Math.floor(Math.random() * (end - start));
		if (position % 2 === 0) position++; // Make it odd (syncopated beat)
		this.climaxPosition = position;
	}

	protected h_cannotCrossMelody(): void {
		for (let i = this.noteBelow + 1; i <= this.noteBelow + 10; i++) {
			this.noteOptions.push(i);
		}
	}

	protected h_onlyConsonantIntervals(): void {
		this.noteOptions = this.noteOptions.filter(note => {
			const interval = note - this.noteBelow;
			return [2, 3, 4, 5, 7].includes(interval); // 3rd, 4th, 5th, 6th, octave
		});
	}

	protected h_allowSuspensions(): void {
		// Allow dissonances on syncopated beats
		// Common suspensions: 4-3, 7-6, 9-8, 2-1
		if (this.noteBefore !== 0) {
			// Keep the same note (tied suspension)
			if (!this.noteOptions.includes(this.noteBefore)) {
				this.noteOptions.push(this.noteBefore);
			}
		}
		
		// Also allow consonant intervals
		this.noteOptions = this.noteOptions.filter(note => {
			const interval = note - this.noteBelow;
			return [1, 2, 3, 4, 5, 6, 7, 8].includes(interval); // Allow most intervals
		});
	}

	protected h_noUnison(): void {
		const index = this.noteOptions.indexOf(this.noteBelow);
		if (index > -1) {
			this.noteOptions.splice(index, 1);
		}
	}

	protected h_avoidDimFifth(): void {
		if (this.noteBelow % 7 === 0 || this.noteBelow % 7 === 6) {
			const index = this.noteOptions.indexOf(this.noteBelow + 3);
			if (index > -1) {
				this.noteOptions.splice(index, 1);
			}
		}
	}

	protected m_resolveDissonanceDownward(): void {
		// Suspensions must resolve downward by step
		if (this.noteBefore !== 0) {
			const stepDown = this.noteBefore - 1;
			
			// Only allow step down resolution
			this.noteOptions = [stepDown].filter(note => 
				note > this.noteBelow && note <= this.noteBelow + 10
			);
			
			// If step down isn't available, allow step up as last resort
			if (this.noteOptions.length === 0) {
				const stepUp = this.noteBefore + 1;
				if (stepUp <= this.noteBelow + 10) {
					this.noteOptions.push(stepUp);
				}
			}
		}
	}

	protected m_noParallelPerfectConsonances(): void {
		if (this.noteBefore === 0 || this.noteBeforeAndBelow === 0) return;
		
		const previousInterval = this.noteBefore - this.noteBeforeAndBelow;
		
		// Avoid parallel perfect consonances
		[4, 7].forEach(interval => {
			if (previousInterval === interval) {
				const index = this.noteOptions.indexOf(this.noteBelow + interval);
				if (index > -1) {
					this.noteOptions.splice(index, 1);
				}
			}
		});
	}

	protected m_manageSuspensionChain(): void {
		// Avoid too many consecutive suspensions
		if (this.suspensionChain >= 3 && this.isSyncopated) {
			// Force resolution or consonance
			this.noteOptions = this.noteOptions.filter(note => {
				return !this.isDissonant(note);
			});
		}
	}

	private isDissonant(note: number): boolean {
		const interval = note - this.noteBelow;
		return [1, 6].includes(interval); // 2nds and 7ths are dissonant
	}

	// Create suspension patterns
	createSuspensionPattern(preparationNote: number, cantusFirmusNote: number): [number, number] {
		// Common suspension patterns
		const patterns = [
			[4, 3], // 4-3 suspension
			[7, 6], // 7-6 suspension
			[2, 1], // 9-8 suspension (compound)
		];
		
		const pattern = patterns[Math.floor(Math.random() * patterns.length)];
		const suspension = cantusFirmusNote + pattern[0] - 1;
		const resolution = cantusFirmusNote + pattern[1] - 1;
		
		return [suspension, resolution];
	}

	updatePreviousIntervals(): void {
		if (this.noteBefore !== 0 && this.noteBelow !== 0) {
			const interval = this.noteBefore - this.noteBelow;
			this.previousIntervals.push(interval);
			
			if (this.previousIntervals.length > 6) {
				this.previousIntervals.shift();
			}
		}
	}
}