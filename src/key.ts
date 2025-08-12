export interface KeyInfo {
	key: string;
	type: 'is' | 'es' | 'natural';
	notes: string[];
}

export class Key {
	private keyName: string;

	constructor(keyName: string) {
		this.keyName = keyName;
	}

	getKeyInfo(): KeyInfo {
		return getKey(this.keyName);
	}

	getKeyName(): string {
		return this.keyName;
	}

	toString(): string {
		return this.keyName;
	}
}

export function getKey(keyName: string): KeyInfo {
	switch (keyName) {
		case "C":
			return { key: 'c', type: 'natural', notes: [] };
		case "G":
			return { key: 'g', type: 'is', notes: ['fis'] };
		case "D":
			return { key: 'd', type: 'is', notes: ['fis', 'cis'] };
		case "A":
			return { key: 'a', type: 'is', notes: ['fis', 'cis', 'gis'] };
		case "E":
			return { key: 'e', type: 'is', notes: ['fis', 'cis', 'gis', 'dis'] };
		case "B":
			return { key: 'b', type: 'is', notes: ['fis', 'cis', 'gis', 'dis', 'ais'] };
		case "F#":
			return { key: 'fis', type: 'is', notes: ['fis', 'cis', 'gis', 'dis', 'ais', 'eis'] };
		case "F":
			return { key: 'f', type: 'es', notes: ['bes'] };
		case "Bb":
			return { key: 'bes', type: 'es', notes: ['bes', 'ees'] };
		case "Eb":
			return { key: 'ees', type: 'es', notes: ['bes', 'ees', 'aes'] };
		case "Ab":
			return { key: 'aes', type: 'es', notes: ['bes', 'ees', 'aes', 'des'] };
		case "Db":
			return { key: 'des', type: 'es', notes: ['bes', 'ees', 'aes', 'des', 'ges'] };
		case "Gb":
			return { key: 'ges', type: 'es', notes: ['bes', 'ees', 'aes', 'des', 'ges', 'ces'] };
		default:
			throw new Error(`Unsupported key: ${keyName}`);
	}
}