import { Species } from './species.js';

export class FifthSpecies extends Species {
	protected noteOptions: number[] = [];
	protected previousIntervals: number[] = [];
	private currentBeat: number = 0;
	private currentStyle: 'first' | 'second' | 'third' | 'fourth' = 'first';
	private climaxPosition: number = -1;
	private measurePattern: string[] = [];

	/**
	 * Fifth Species Counterpoint: Florid counterpoint combining all previous species
	 * Rules:
	 * - Can combine whole notes, half notes, quarter notes
	 * - Can include suspensions from fourth species
	 * - Can include passing tones and neighbors from second/third species
	 * - Most flexible species - "florid" style
	 * - Must maintain voice leading principles from all species
	 */
	chooseNextNote(
		noteValue: 'whole' | 'half' | 'quarter' = 'quarter',
		beatPosition: number = 0,
		allowDissonance: boolean = false
	): number {
		this.currentBeat = beatPosition;
		this.noteOptions = [];
		
		// Generate initial options
		this.h_cannotCrossMelody();
		
		// Apply rules based on note value and position
		if (noteValue === 'whole') {
			// Whole note - first species rules
			this.applyFirstSpeciesRules();
		} else if (noteValue === 'half') {
			// Half note - second species rules
			this.applySecondSpeciesRules(beatPosition === 0);
		} else {
			// Quarter note - third species rules
			this.applyThirdSpeciesRules(beatPosition, allowDissonance);
		}
		
		// Common rules for all note values
		this.h_avoidDimFifth();
		this.m_maintainGoodVoiceLeading();
		this.m_createVariety();
		
		if (this.noteOptions.length === 0) {
			return this.generateFallbackNote();
		}
		
		const toChoose = Math.floor(Math.random() * this.noteOptions.length);
		return this.noteOptions[toChoose];
	}

	generateCounterpoint(cantusFirmus: number[], length: number): number[] {
		const counterpoint: number[] = [];
		this.findClimaxPosition(length);
		
		// Generate exactly 'length' number of notes with varied rhythm
		for (let i = 0; i < length; i++) {
			const cantusFirmusIndex = Math.floor(i / 4) % cantusFirmus.length;
			const cantusFirmusNote = cantusFirmus[cantusFirmusIndex];
			const beat = i % 4;
			
			this.setNoteBelow(cantusFirmusNote);
			if (i > 0) {
				const prevNote = counterpoint[i - 1];
				if (prevNote !== 0) { // Skip if previous was a rest
					this.setNoteBefore(prevNote);
				}
				if (i > 1) {
					const prevCantusFirmusIndex = Math.floor((i - 1) / 4) % cantusFirmus.length;
					this.setNoteBeforeAndBelow(cantusFirmus[prevCantusFirmusIndex]);
				}
			}
			if (i > 1) {
				const twoBefore = counterpoint[i - 2];
				if (twoBefore !== 0) {
					this.setNoteTwoBefore(twoBefore);
				}
			}
			
			let nextNote: number;
			
			if (i === 0) {
				// First note must be perfect consonance
				nextNote = Math.random() < 0.7 ? cantusFirmusNote + 7 : cantusFirmusNote + 4;
			} else if (i === length - 1) {
				// Final note - octave resolution
				const finalCantusFirmusIndex = Math.floor((length - 1) / 4) % cantusFirmus.length;
				nextNote = cantusFirmus[finalCantusFirmusIndex] + 7;
			} else {
				// Occasionally add rests for rhythmic variety
				if (Math.random() < 0.1 && beat !== 0) {
					nextNote = 0; // Rest
				} else {
					const noteValue = this.randomNoteValue();
					const allowDissonance = Math.random() < 0.2 && beat !== 0;
					nextNote = this.chooseNextNote(noteValue, beat, allowDissonance);
				}
			}
			
			counterpoint.push(nextNote);
			this.updatePreviousIntervals();
		}
		
		return counterpoint;
	}
	
	private randomNoteValue(): 'whole' | 'half' | 'quarter' {
		const values = ['half', 'quarter', 'quarter', 'quarter']; // Favor quarters
		return values[Math.floor(Math.random() * values.length)] as 'whole' | 'half' | 'quarter';
	}

	private generateRhythmPattern(length: number): string[][] {
		const patterns: string[][] = [];
		
		for (let measure = 0; measure < length; measure++) {
			if (measure === 0) {
				// First measure - simple start
				patterns.push(['half', 'half']);
			} else if (measure === length - 1) {
				// Final measure - approach to cadence
				patterns.push(['quarter', 'quarter', 'half']);
			} else {
				// Vary the patterns throughout
				const patternType = Math.floor(Math.random() * 6);
				switch (patternType) {
					case 0:
						patterns.push(['whole']); // First species
						break;
					case 1:
						patterns.push(['half', 'half']); // Second species
						break;
					case 2:
						patterns.push(['quarter', 'quarter', 'quarter', 'quarter']); // Third species
						break;
					case 3:
						patterns.push(['half', 'half']); // Fourth species (tied)
						break;
					case 4:
						patterns.push(['quarter', 'half', 'quarter']); // Mixed
						break;
					case 5:
						patterns.push(['half', 'quarter', 'quarter']); // Mixed
						break;
				}
			}
		}
		
		return patterns;
	}

	private findClimaxPosition(totalNotes: number): void {
		const start = Math.floor(totalNotes * 0.3);
		const end = Math.floor(totalNotes * 0.7);
		this.climaxPosition = start + Math.floor(Math.random() * (end - start));
	}

	protected h_cannotCrossMelody(): void {
		for (let i = this.noteBelow + 1; i <= this.noteBelow + 12; i++) {
			this.noteOptions.push(i);
		}
	}

	private applyFirstSpeciesRules(): void {
		// First species: only consonances, no unison except ends
		this.noteOptions = this.noteOptions.filter(note => {
			const interval = note - this.noteBelow;
			return [2, 3, 4, 5, 7].includes(interval); // 3rd, 4th, 5th, 6th, octave
		});
		
		// Remove unison
		const unisonIndex = this.noteOptions.indexOf(this.noteBelow);
		if (unisonIndex > -1) {
			this.noteOptions.splice(unisonIndex, 1);
		}
	}

	private applySecondSpeciesRules(isStrongBeat: boolean): void {
		if (isStrongBeat) {
			// Strong beat - consonant only
			this.applyFirstSpeciesRules();
		} else {
			// Weak beat - allow passing tones
			this.allowPassingTones();
		}
	}

	private applyThirdSpeciesRules(beatPosition: number, allowDissonance: boolean): void {
		if (beatPosition === 0) {
			// Strong beat - consonant
			this.applyFirstSpeciesRules();
		} else if (allowDissonance) {
			// Weak beat - allow embellishments
			this.allowEmbellishments();
		} else {
			// Weak beat consonant
			this.applyFirstSpeciesRules();
		}
	}

	private allowPassingTones(): void {
		if (this.noteBefore !== 0) {
			// Add stepwise options
			const stepUp = this.noteBefore + 1;
			const stepDown = this.noteBefore - 1;
			
			[stepUp, stepDown].forEach(note => {
				if (note > this.noteBelow && note <= this.noteBelow + 12) {
					if (!this.noteOptions.includes(note)) {
						this.noteOptions.push(note);
					}
				}
			});
		}
		
		// Keep consonant intervals too
		const consonantOptions = this.noteOptions.filter(note => {
			const interval = note - this.noteBelow;
			return [2, 3, 4, 5, 7].includes(interval);
		});
		
		this.noteOptions = [...new Set([...this.noteOptions, ...consonantOptions])];
	}

	private allowEmbellishments(): void {
		this.allowPassingTones();
		
		// Add neighbor tones
		if (this.noteBefore !== 0 && this.noteTwoBefore !== 0) {
			// Upper and lower neighbors
			const upperNeighbor = this.noteTwoBefore + 1;
			const lowerNeighbor = this.noteTwoBefore - 1;
			
			[upperNeighbor, lowerNeighbor].forEach(note => {
				if (note > this.noteBelow && note <= this.noteBelow + 12) {
					if (!this.noteOptions.includes(note)) {
						this.noteOptions.push(note);
					}
				}
			});
		}
	}

	private canUseDissonance(noteValue: string, beat: number, pattern: string[]): boolean {
		// Dissonance allowed on weak beats of shorter note values
		if (noteValue === 'whole') return false;
		if (noteValue === 'half' && beat === 0) return false;
		if (noteValue === 'quarter' && beat === 0) return false;
		
		// Allow dissonance as passing tones or neighbors
		return true;
	}

	protected h_avoidDimFifth(): void {
		if (this.noteBelow % 7 === 0 || this.noteBelow % 7 === 6) {
			const index = this.noteOptions.indexOf(this.noteBelow + 3);
			if (index > -1 && Math.random() < 0.8) {
				this.noteOptions.splice(index, 1);
			}
		}
	}

	protected m_maintainGoodVoiceLeading(): void {
		// Avoid large leaps except when necessary
		if (this.noteBefore !== 0) {
			this.noteOptions = this.noteOptions.filter(note => {
				const leap = Math.abs(note - this.noteBefore);
				
				// Allow larger leaps occasionally for variety
				if (leap > 4 && Math.random() < 0.8) {
					return false;
				}
				
				return true;
			});
		}
		
		// Avoid parallel perfect consonances
		this.m_noParallelPerfectConsonances();
	}

	protected m_noParallelPerfectConsonances(): void {
		if (this.noteBefore === 0 || this.noteBeforeAndBelow === 0) return;
		
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

	protected m_createVariety(): void {
		// Encourage variety in intervals and motion
		if (this.previousIntervals.length >= 2) {
			const lastTwoSame = this.previousIntervals[this.previousIntervals.length - 1] === 
							   this.previousIntervals[this.previousIntervals.length - 2];
			
			if (lastTwoSame) {
				const repeatedInterval = this.previousIntervals[this.previousIntervals.length - 1];
				const noteToAvoid = this.noteBelow + repeatedInterval;
				const index = this.noteOptions.indexOf(noteToAvoid);
				if (index > -1) {
					this.noteOptions.splice(index, 1);
				}
			}
		}
	}

	private generateFallbackNote(): number {
		// Safe fallback note
		if (this.noteBefore !== 0) {
			// Prefer stepwise motion
			const step = Math.random() < 0.5 ? this.noteBefore + 1 : this.noteBefore - 1;
			if (step > this.noteBelow && step <= this.noteBelow + 12) {
				return step;
			}
		}
		
		// Default to third above cantus firmus
		return this.noteBelow + 2;
	}

	updatePreviousIntervals(): void {
		if (this.noteBefore !== 0 && this.noteBelow !== 0) {
			const interval = this.noteBefore - this.noteBelow;
			this.previousIntervals.push(interval);
			
			// Keep sliding window
			if (this.previousIntervals.length > 10) {
				this.previousIntervals.shift();
			}
		}
	}

	// Additional methods for rhythm and pattern management
	setMeasurePattern(pattern: string[]): void {
		this.measurePattern = pattern;
	}

	getCurrentStyle(): string {
		return this.currentStyle;
	}

	setCurrentStyle(style: 'first' | 'second' | 'third' | 'fourth'): void {
		this.currentStyle = style;
	}
}