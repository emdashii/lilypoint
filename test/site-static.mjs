#!/usr/bin/env bun
/** After `bun run build`, confirm launch files landed in dist/. */
import { existsSync, readFileSync } from 'node:fs';

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
if (!about.includes('id="privacy"') || !about.includes('does not collect analytics')) {
	console.error('about.html is missing the privacy section');
	process.exit(1);
}

const notFound = readFileSync('dist/404.html', 'utf8');
if (!notFound.includes('href="/"') || !notFound.includes('href="/practice.html"')) {
	console.error('404.html is missing recovery links');
	process.exit(1);
}

console.log('site static files ok');
