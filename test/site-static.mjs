#!/usr/bin/env bun
/** After `bun run build`, confirm launch files landed in dist/. */
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Glob } from 'bun';

const required = [
	'dist/index.html',
	'dist/practice.html',
	'dist/about.html',
	'dist/classic.html',
	'dist/404.html',
	'dist/robots.txt',
	'dist/sitemap.xml',
	'dist/og.png',
	'dist/LICENSE',
	'dist/_headers',
	'dist/_redirects',
	'dist/site.webmanifest',
];
const missing = required.filter(path => !existsSync(path));
if (missing.length) {
	console.error('Missing after build:', missing.join(', '));
	process.exit(1);
}

const robots = readFileSync('dist/robots.txt', 'utf8');
if (!robots.includes('Disallow: /proto/') || !robots.includes('sitemap.xml')) {
	console.error('robots.txt is missing the proto disallow or sitemap pointer');
	process.exit(1);
}

const sitemap = readFileSync('dist/sitemap.xml', 'utf8');
for (const loc of ['https://lilypoint.mazzaella.com/', 'practice.html', 'about.html', 'classic.html']) {
	if (!sitemap.includes(loc)) {
		console.error('sitemap.xml is missing', loc);
		process.exit(1);
	}
}

const home = readFileSync('dist/index.html', 'utf8');
for (const needle of ['og:image', 'Skip to the sheet', 'rel="canonical"']) {
	if (!home.includes(needle)) {
		console.error('index.html is missing', needle);
		process.exit(1);
	}
}

const about = readFileSync('dist/about.html', 'utf8');
if (!about.includes('id="privacy"') || !about.includes('umami.is/privacy')) {
	console.error('about.html is missing the privacy section');
	process.exit(1);
}

// Pageviews count rooms, not editor state: the score, title, and composer live in the
// query string, which the tracker must drop from both url and referrer. Production only.
const trackedPages = ['index', 'practice', 'about', 'classic', '404'].map(name => `dist/${name}.html`);
for (const file of new Glob('dist/**/*.html').scanSync('.')) {
	const tags = readFileSync(file, 'utf8').match(/<script[^>]*cloud\.umami\.is[^>]*>/g) ?? [];
	const expected = trackedPages.includes(file) ? 1 : 0;
	if (tags.length !== expected) {
		console.error(`${file} has ${tags.length} analytics tags; expected ${expected}`);
		process.exit(1);
	}
	for (const tag of tags) {
		for (const attribute of ['data-exclude-search="true"', 'data-exclude-hash="true"', 'data-domains="lilypoint.mazzaella.com"']) {
			if (!tag.includes(attribute)) {
				console.error(`${file} analytics tag is missing ${attribute}`);
				process.exit(1);
			}
		}
		const extra = tag.match(/data-(?:errors|performance|auto-track|auto-pageview)=/);
		if (extra) {
			console.error(`${file} analytics tag adds ${extra[0]}`);
			process.exit(1);
		}
	}
}

const notFound = readFileSync('dist/404.html', 'utf8');
if (!notFound.includes('href="/"') || !notFound.includes('href="/practice.html"')) {
	console.error('404.html is missing recovery links');
	process.exit(1);
}

// Every inline <script> must be allowed by hash, or the CSP blocks it.
const csp = readFileSync('dist/_headers', 'utf8').match(/^\s*Content-Security-Policy(?:-Report-Only)?: (.+)$/m)?.[1];
if (!csp) {
	console.error('_headers is missing the Content-Security-Policy');
	process.exit(1);
}
for (const file of new Glob('dist/**/*.html').scanSync('.')) {
	for (const [, body] of readFileSync(file, 'utf8').matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
		const hash = `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
		if (!csp.includes(hash)) {
			console.error(`${file} has an inline script missing from the CSP: ${hash}`);
			process.exit(1);
		}
	}
}

console.log('site static files ok');
