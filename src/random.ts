export type RandomSource = () => number;
let defaultSeed: number | undefined;
/** Compatibility default for new generation requests; never replaces Math.random. */
export function setDefaultSeed(seed: number): void {
	if (!Number.isSafeInteger(seed)) throw new Error('Seed must be a safe integer');
	defaultSeed = seed;
}
export function createRandom(seed: number | undefined = defaultSeed): RandomSource {
	if (seed === undefined) return () => Math.random();
	let state = seed;
	return () => {
		state = Math.imul(state ^ state >>> 15, state | 1);
		state ^= state + Math.imul(state ^ state >>> 7, state | 61);
		return ((state ^ state >>> 14) >>> 0) / 4294967296;
	};
}
