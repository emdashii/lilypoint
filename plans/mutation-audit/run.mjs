// Mutation runner for the 3 November 2026 test audit (plans/test-quality.md).
//   git worktree add --detach /tmp/mut HEAD && ln -s "$PWD/node_modules" /tmp/mut/node_modules
//   bun plans/mutation-audit/run.mjs /tmp/mut results.json [generator|audit|ID,...]
// Applies each fault from mutations.mjs to the worktree only, runs tsc, each Bun test
// file, the build, and each built script, records what failed, then restores the
// worktree with git checkout. Never point it at your working copy: it discards edits.
import { readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import * as M from './mutations.mjs';

const [wt, out, which = 'generator,audit'] = process.argv.slice(2);
if (!wt || !out || realpathSync(wt) === realpathSync(join(import.meta.dir, '../..'))) throw new Error('Pass a scratch worktree, not this checkout, and an output file');
const all = [...M.generator, ...M.audit];
const selected = which.split(',').flatMap(w => M[w] ?? all.filter(m => m.id === w));
const sh = (cmd, timeout = 600000) => {
	const r = spawnSync('bash', ['-c', cmd], { cwd: wt, encoding: 'utf8', timeout, maxBuffer: 1 << 28 });
	return { code: r.status ?? 'timeout', out: (r.stdout || '') + (r.stderr || '') };
};
const BUILT = ['proto-generation', 'proto-score-state', 'proto-smoke', 'site-static', 'exercise-audit'];
const FILES = sh('git ls-files "tests/*.test.ts"').out.trim().split('\n');
const results = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : [];
const done = new Set(results.map(r => r.id));
const restore = () => sh('git checkout -- . && git clean -fdq -- src test tests public');
for (const mut of selected) {
	if (done.has(mut.id)) continue;
	restore();
	for (const e of mut.edits) {
		const path = join(wt, e.file), src = readFileSync(path, 'utf8');
		const n = src.split(e.find).length - 1;
		if (n === 0 || (n > 1 && !e.all)) throw new Error(`${mut.id}: find occurs ${n} times in ${e.file}: ${e.find}`);
		writeFileSync(path, e.all ? src.split(e.find).join(e.replace) : src.replace(e.find, () => e.replace));
	}
	const t0 = Date.now();
	const tc = sh('bunx tsc --noEmit');
	const fails = [], timeouts = [];
	for (const file of FILES) {
		const r = sh(`exec bun test ${file} 2>&1`, 30000);
		if (r.code === 'timeout') { timeouts.push(file); continue; }
		fails.push(...[...r.out.matchAll(/^\(fail\) (.*?)(?: \[[\d.]+m?s\])?$/gm)].map(x => x[1]));
		if (r.code !== 0 && !/\(fail\)/.test(r.out)) fails.push(`${file}: exit ${r.code}`);
	}
	const test = { code: fails.length || timeouts.length ? 1 : 0 };
	const summary = `${fails.length} fail, ${timeouts.length} timeout`;
	const build = sh('rm -rf dist && bun run build');
	const built = {};
	if (build.code === 0) for (const s of BUILT) {
		const r = sh(`exec bun test/${s}.mjs 2>&1`, 45000);
		const msg = r.code === 0 ? '' : ((r.out.match(/^(?:AssertionError|error|Error|TypeError)[^\n]*(?:\n[^\n]*){0,3}/m) || [r.out.trim().split('\n').slice(-3).join(' / ')])[0]).slice(0, 400);
		built[s] = { code: r.code, msg };
	}
	const rec = { id: mut.id, desc: mut.desc, typecheck: tc.code, bunTestCode: test.code, summary, fails, timeouts, build: build.code, built, seconds: Math.round((Date.now() - t0) / 1000) };
	results.push(rec);
	const caught = [...timeouts.map(f => `TIMEOUT ${f}`), ...fails.map(f => f.slice(0, 90)), ...Object.entries(built).filter(([, v]) => v.code !== 0).map(([k]) => `test/${k}.mjs`)];
	console.log(`${mut.id}: tsc=${tc.code} ${summary} build=${build.code} caught by ${caught.length}: ${caught.slice(0, 6).join(' | ')}${caught.length > 6 ? ' ...' : ''}`);
	writeFileSync(out, JSON.stringify(results, null, 1));
}
restore();
