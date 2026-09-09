// PDF output. Two routes:
//  1. printSvgs(): opens the browser print dialog with only the music on
//     paper pages. Works for every engine (fonts, glyphs, everything), and
//     "Save as PDF" is one click away in every browser. Vector output.
//  2. downloadPdf(): jsPDF + svg2pdf.js, a direct .pdf download without a
//     dialog. Vector too, but it only understands path-based SVG, so it is
//     used for Verovio and abcjs output (VexFlow 5 draws glyphs as text).
import { loadScript } from './ui.js';

export function printSvgs(svgs, { title = 'lilypoint', subtitle = '', pageBreakEvery = 0 } = {}) {
	const frame = document.createElement('iframe');
	frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
	document.body.append(frame);
	const doc = frame.contentDocument;
	doc.open();
	doc.write('<!DOCTYPE html><html><head><title>' + title.replace(/</g, '&lt;') + '</title><style>' +
		'@page{size:A4;margin:16mm 14mm}body{margin:0;font-family:Georgia,serif;color:#000}' +
		'h1{font-weight:normal;font-size:20pt;text-align:center;margin:0 0 2mm}.sub{text-align:center;color:#444;font-size:10pt;margin:0 0 8mm}' +
		'.sys{page-break-inside:avoid;margin:0 0 6mm}.sys svg{width:100%;height:auto;display:block;color:#000}.brk{page-break-before:always}' +
		'</style></head><body></body></html>');
	doc.close();
	const body = doc.body;
	if (title) body.append(Object.assign(doc.createElement('h1'), { textContent: title }));
	if (subtitle) body.append(Object.assign(doc.createElement('p'), { className: 'sub', textContent: subtitle }));
	svgs.forEach((svg, i) => {
		const wrap = doc.createElement('div');
		wrap.className = 'sys' + (pageBreakEvery && i > 0 && i % pageBreakEvery === 0 ? ' brk' : '');
		wrap.innerHTML = typeof svg === 'string' ? svg : svg.outerHTML;
		body.append(wrap);
	});
	const finish = () => { frame.contentWindow.focus(); frame.contentWindow.print(); setTimeout(() => frame.remove(), 60000); };
	if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(finish); else setTimeout(finish, 300);
}

async function ensureJsPdf() {
	await loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js');
	await loadScript('https://cdn.jsdelivr.net/npm/svg2pdf.js@2.5.0/dist/svg2pdf.umd.min.js');
	return window.jspdf.jsPDF;
}

/**
 * svgs: array of SVG elements or strings, one per page (Verovio) or stacked
 * on pages (abcjs systems). Each is fitted to the page width.
 */
export async function downloadPdf(svgs, { filename = 'lilypoint.pdf', onePerPage = true, title = '' } = {}) {
	const jsPDF = await ensureJsPdf();
	const doc = new jsPDF({ unit: 'pt', format: 'a4' });
	const pageW = doc.internal.pageSize.getWidth(), pageH = doc.internal.pageSize.getHeight();
	const margin = 36;
	let y = margin;
	const holder = document.createElement('div');
	holder.style.cssText = 'position:absolute;left:-10000px;top:0;';
	document.body.append(holder);
	try {
		for (let i = 0; i < svgs.length; i++) {
			holder.innerHTML = typeof svgs[i] === 'string' ? svgs[i] : svgs[i].outerHTML;
			const svg = holder.querySelector('svg');
			svg.style.color = '#000';
			const vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : null;
			const w0 = vb ? vb.width : parseFloat(svg.getAttribute('width')) || svg.getBoundingClientRect().width;
			const h0 = vb ? vb.height : parseFloat(svg.getAttribute('height')) || svg.getBoundingClientRect().height;
			const w = pageW - 2 * margin, h = h0 * (w / w0);
			if (onePerPage) {
				if (i > 0) doc.addPage();
				await doc.svg(svg, { x: margin, y: margin, width: w, height: Math.min(h, pageH - 2 * margin) });
			} else {
				if (y + h > pageH - margin && y > margin) { doc.addPage(); y = margin; }
				await doc.svg(svg, { x: margin, y, width: w, height: h });
				y += h + 12;
			}
		}
		if (title) doc.setProperties({ title });
		doc.save(filename);
	} finally { holder.remove(); }
}
