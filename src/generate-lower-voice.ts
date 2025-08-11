export class GenerateLowerVoice {
	private lowerVoice: number[] = [];
	private length: number;

	constructor(length: number = 8) {
		this.length = length;
		
		this.lowerVoice.push(1);

		for (let i = 0; i < length - 3; i++) {
			let nextNote: number;
			const lastNote = this.lowerVoice[this.lowerVoice.length - 1];
			
			if (lastNote < -1) {
				nextNote = lastNote + this.pickRandomInterval() - 1;
			} else if (lastNote > 4) {
				nextNote = lastNote - this.pickRandomInterval() - 1;
			} else if (Math.random() < 0.5) {
				nextNote = lastNote + this.pickRandomInterval() - 1;
			} else {
				nextNote = lastNote - this.pickRandomInterval() - 1;
			}
			this.lowerVoice.push(nextNote);
		}
		this.lowerVoice.push(2);
		this.lowerVoice.push(1);
	}

	pickRandomInterval(): number {
		const rand = Math.floor(Math.random() * 20);
		switch (rand) {
			case 0:
			case 1:
			case 2:
				return 1;
			case 3:
			case 4:
			case 5:
			case 6:
			case 7:
				return 2;
			case 8:
			case 9:
			case 10:
			case 11:
				return 3;
			case 12:
			case 13:
			case 14:
				return 5;
			case 15:
			case 16:
				return 6;
			default:
				return 2;
		}
	}

	getLowerVoice(): number[] {
		return this.lowerVoice;
	}

	printLowerVoice(): void {
		console.log("Lower voice: " + this.lowerVoice.join("\t"));
	}
}