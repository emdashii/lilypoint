// bun plans/mutation-audit/output-grid.ts <worktree>
// Prints hashes of cantus and two-bar phrase output over a fixed grid, used to tell an
// equivalent fault (identical output) from one the publishing gate masks (changed output).
const wt = process.argv[2];
const { CantusFirmus } = await import(`${wt}/src/cantus-firmus.ts`);
const { createRandom } = await import(`${wt}/src/random.ts`);
const { WritePhrase } = await import(`${wt}/src/write-phrase.ts`);
const keys = ['C','Db','D','Eb','E','F','F#','Gb','G','Ab','A','Bb','B'];
const cantus: string[] = [], phrases: string[] = [];
for (const k of keys) for (const m of ['major','minor']) for (const len of [3,4,8,12,16,32]) for (const s of [1,2,3,7,42]) cantus.push(new CantusFirmus(k, len, m, createRandom(s)).generate().map((n: any) => n.getNote()).join(','));
for (const k of keys) for (const m of ['major','minor']) for (let sp = 1; sp <= 5; sp++) for (const s of [1, 42]) {
  const w = new WritePhrase(k, 2, sp, '4/4'); w.setMode(m); w.setSeed(s);
  try { w.writeThePhrase(); const p = w.getPhrase(); phrases.push([p.getUpperVoice(), p.getLowerVoice()].map(v => v.map((n: any) => `${n.isRest() ? 'r' : n.getNote()}:${n.getDurationTicks()}${n.getTied() ? '~' : ''}`).join(' ')).join('|')); }
  catch (e: any) { phrases.push('ERR ' + e.message.slice(0, 40)); }
}
const h = (a: string[]) => Bun.hash(a.join('\n')).toString(16);
console.log(JSON.stringify({ cantus: h(cantus), phrases: h(phrases), errors: phrases.filter(p => p.startsWith('ERR')).length, phraseList: phrases }));
