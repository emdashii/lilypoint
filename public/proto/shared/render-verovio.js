// Verovio renderer: MusicXML in, engraved pages out. Also gives MIDI and a
// timemap, so playback highlighting works without a second data model.
import { toMusicXML } from './notation.js';
import { loadScript, inheritColor } from './ui.js';

const VEROVIO_URL = 'https://cdn.jsdelivr.net/npm/verovio@6.3.0/dist/verovio-toolkit-wasm.js';

let ready;
export function ensureVerovio(onProgress) {
	if (!ready) {
		ready = new Promise(async (resolve, reject) => {
			try {
				onProgress && onProgress('loading engraver (about 7 MB, once)');
				await loadScript(VEROVIO_URL);
				const mod = window.verovio && window.verovio.module;
				const make = () => resolve(new window.verovio.toolkit());
				if (!mod) return reject(new Error('Verovio did not initialise'));
				if (mod.calledRun) make(); else mod.onRuntimeInitialized = make;
			} catch (e) { reject(e); }
		});
	}
	return ready;
}

export const PAGE = { A4: { w: 2100, h: 2970 }, LETTER: { w: 2159, h: 2794 } };

/**
 * Render results into container. opts: meta, scale, pageWidth, pageHeight,
 * paged (true: real pages; false: one tall page), font, breaks,
 * onProgress(text). Returns { toolkit, pages: [svgElements], pageCount, xml }.
 */
export async function renderScore(container, results, opts = {}) {
	const tk = await ensureVerovio(opts.onProgress);
	const meta = opts.meta || {};
	const xml = toMusicXML(results, meta);
	const page = opts.page || PAGE.A4;
	tk.setOptions({
		inputFrom: 'xml',
		scale: opts.scale ?? 40,
		pageWidth: opts.pageWidth ?? page.w,
		pageHeight: opts.pageHeight ?? (opts.paged ? page.h : 60000),
		pageMarginLeft: opts.margin ?? 100, pageMarginRight: opts.margin ?? 100,
		pageMarginTop: opts.marginTop ?? 100, pageMarginBottom: opts.marginBottom ?? 100,
		adjustPageHeight: !opts.paged,
		breaks: opts.breaks || 'auto',
		font: opts.font || 'Leipzig',
		header: opts.header || 'auto',
		footer: opts.footer || 'none',
		svgViewBox: true,
		svgHtml5: false,
		justifyVertically: false,
		spacingStaff: opts.spacingStaff ?? 10,
		spacingSystem: opts.spacingSystem ?? 6,
		barLineWidth: 0.3,
		lyricSize: 4.5,
	});
	tk.loadData(xml);
	const pageCount = tk.getPageCount();
	container.replaceChildren();
	const pages = [];
	for (let p = 1; p <= pageCount; p++) {
		const holder = document.createElement('div');
		holder.className = 'page';
		holder.innerHTML = tk.renderToSVG(p);
		const svg = holder.querySelector('svg');
		inheritColor(svg);
		svg.removeAttribute('width'); svg.removeAttribute('height');
		container.append(holder);
		pages.push(svg);
	}
	return { toolkit: tk, pages, pageCount, xml };
}

/** Playback data from Verovio's own timing: [{id, pitch, on(ms), off(ms)}]. */
export function timedNotes(tk) {
	const map = JSON.parse(tk.renderToTimemap());
	const notes = [];
	const open = new Map();
	for (const entry of map) {
		for (const id of entry.off || []) { const n = open.get(id); if (n) { n.off = entry.tstamp; open.delete(id); } }
		for (const id of entry.on || []) {
			const v = tk.getMIDIValuesForElement(id);
			const n = { id, midi: v.pitch, on: entry.tstamp, off: entry.tstamp + (v.duration || 500) };
			open.set(id, n); notes.push(n);
		}
	}
	return notes;
}

export function midiBlob(tk) {
	const b64 = tk.renderToMIDI();
	const bin = atob(b64);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return new Blob([bytes], { type: 'audio/midi' });
}
