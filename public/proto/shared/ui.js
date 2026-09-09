// Small DOM helpers shared by the prototypes.

export function el(tag, attrs = {}, ...children) {
	const node = document.createElement(tag);
	for (const [k, v] of Object.entries(attrs)) {
		if (v == null || v === false) continue;
		if (k === 'class') node.className = v;
		else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
		else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
		else if (k === 'dataset') Object.assign(node.dataset, v);
		else if (k in node && typeof v !== 'string') node[k] = v;
		else node.setAttribute(k, v === true ? '' : v);
	}
	for (const c of children.flat()) if (c != null && c !== false) node.append(c.nodeType ? c : document.createTextNode(String(c)));
	return node;
}

export function options(select, list, value, label = x => x) {
	select.replaceChildren(...list.map(item => {
		const v = typeof item === 'object' ? item.value : item;
		const o = el('option', { value: v }, typeof item === 'object' ? item.label : label(item));
		if (String(v) === String(value)) o.selected = true;
		return o;
	}));
	return select;
}

// --- theme -----------------------------------------------------------------
const THEME_KEY = 'theme'; // same key the current site uses
export function initTheme() {
	const saved = localStorage.getItem(THEME_KEY);
	if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
}
export function currentTheme() {
	return document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
export function toggleTheme() {
	const next = currentTheme() === 'dark' ? 'light' : 'dark';
	document.documentElement.dataset.theme = next;
	localStorage.setItem(THEME_KEY, next);
	document.dispatchEvent(new CustomEvent('themechange', { detail: next }));
	return next;
}
export function themeButton() {
	const b = el('button', { class: 'theme-toggle no-print', type: 'button', onclick: () => { toggleTheme(); refresh(); } });
	const refresh = () => { b.textContent = currentTheme() === 'dark' ? 'light mode' : 'dark mode'; };
	refresh();
	return b;
}

/** Recolour black fills/strokes to currentColor so CSS can theme the SVG. */
export function inheritColor(svg) {
	for (const node of [svg, ...svg.querySelectorAll('[fill], [stroke]')]) {
		const f = node.getAttribute('fill');
		if (f && /^(black|#000000|#000|rgb\(0, ?0, ?0\))$/i.test(f)) node.setAttribute('fill', 'currentColor');
		const s = node.getAttribute('stroke');
		if (s && /^(black|#000000|#000|rgb\(0, ?0, ?0\))$/i.test(s)) node.setAttribute('stroke', 'currentColor');
	}
	if (svg.style && svg.style.color) svg.style.color = '';
	// Notation is not readable by assistive tech; the container carries the label.
	svg.setAttribute('aria-hidden', 'true');
	svg.removeAttribute('role');
	return svg;
}

/** Load a classic script once. */
const loaded = new Map();
export function loadScript(src) {
	if (!loaded.has(src)) {
		loaded.set(src, new Promise((resolve, reject) => {
			const s = document.createElement('script');
			s.src = src; s.async = true;
			s.onload = () => resolve();
			s.onerror = () => reject(new Error('Could not load ' + src));
			document.head.append(s);
		}));
	}
	return loaded.get(src);
}

export function debounce(fn, ms = 120) {
	let t;
	return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/** Short-lived status text, for "Copied" and friends. */
export function flash(node, text, ms = 1400) {
	const old = node.textContent;
	node.textContent = text;
	node.disabled = true;
	setTimeout(() => { node.textContent = old; node.disabled = false; }, ms);
}
