export interface KeyInfo {
	key: string;
	type: 'is' | 'es' | 'natural';
	mode: 'major' | 'minor';
	notes: string[];
}

export class Key {
	private keyName: string;
	private mode: string = "major";

	constructor(keyName: string, mode: string = "major") {
		this.keyName = keyName;
		this.mode = mode;
	}

	getKeyInfo(): KeyInfo {
		return getKey(this.keyName, this.mode);
	}

	getKeyName(): string {
		return this.keyName;
	}

	toString(): string {
		return this.keyName;
	}
}

export function getKey(keyName: string, mode: string = "major"): KeyInfo {
	const modeType = mode === "minor" ? "minor" : "major";
	
	if (mode === "minor") {
		// Minor keys
		switch (keyName) {
			case "A":
				return { key: 'a', type: 'natural', mode: 'minor', notes: [] };
			case "E":
				return { key: 'e', type: 'is', mode: 'minor', notes: ['fis'] };
			case "B":
				return { key: 'b', type: 'is', mode: 'minor', notes: ['fis', 'cis'] };
			case "F#":
				return { key: 'fis', type: 'is', mode: 'minor', notes: ['fis', 'cis', 'gis'] };
			case "C":
				return { key: 'c', type: 'is', mode: 'minor', notes: ['fis', 'cis', 'gis', 'dis'] };
			case "G":
				return { key: 'g', type: 'is', mode: 'minor', notes: ['fis', 'cis', 'gis', 'dis', 'ais'] };
			case "D":
				return { key: 'd', type: 'es', mode: 'minor', notes: ['bes'] };
			case "Bb":
				return { key: 'bes', type: 'es', mode: 'minor', notes: ['bes', 'ees'] };
			case "F":
				return { key: 'f', type: 'es', mode: 'minor', notes: ['bes', 'ees', 'aes'] };
			case "Eb":
				return { key: 'ees', type: 'es', mode: 'minor', notes: ['bes', 'ees', 'aes', 'des'] };
			case "Ab":
				return { key: 'aes', type: 'es', mode: 'minor', notes: ['bes', 'ees', 'aes', 'des', 'ges'] };
			case "Db":
				return { key: 'des', type: 'es', mode: 'minor', notes: ['bes', 'ees', 'aes', 'des', 'ges', 'ces'] };
			default:
				throw new Error(`Unsupported minor key: ${keyName}`);
		}
	} else {
		// Major keys (existing)
		switch (keyName) {
			case "C":
				return { key: 'c', type: 'natural', mode: 'major', notes: [] };
			case "G":
				return { key: 'g', type: 'is', mode: 'major', notes: ['fis'] };
			case "D":
				return { key: 'd', type: 'is', mode: 'major', notes: ['fis', 'cis'] };
			case "A":
				return { key: 'a', type: 'is', mode: 'major', notes: ['fis', 'cis', 'gis'] };
			case "E":
				return { key: 'e', type: 'is', mode: 'major', notes: ['fis', 'cis', 'gis', 'dis'] };
			case "B":
				return { key: 'b', type: 'is', mode: 'major', notes: ['fis', 'cis', 'gis', 'dis', 'ais'] };
			case "F#":
				return { key: 'fis', type: 'is', mode: 'major', notes: ['fis', 'cis', 'gis', 'dis', 'ais', 'eis'] };
			case "F":
				return { key: 'f', type: 'es', mode: 'major', notes: ['bes'] };
			case "Bb":
				return { key: 'bes', type: 'es', mode: 'major', notes: ['bes', 'ees'] };
			case "Eb":
				return { key: 'ees', type: 'es', mode: 'major', notes: ['bes', 'ees', 'aes'] };
			case "Ab":
				return { key: 'aes', type: 'es', mode: 'major', notes: ['bes', 'ees', 'aes', 'des'] };
			case "Db":
				return { key: 'des', type: 'es', mode: 'major', notes: ['bes', 'ees', 'aes', 'des', 'ges'] };
			case "Gb":
				return { key: 'ges', type: 'es', mode: 'major', notes: ['bes', 'ees', 'aes', 'des', 'ges', 'ces'] };
			default:
				throw new Error(`Unsupported major key: ${keyName}`);
		}
	}
}