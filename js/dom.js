// Kleine DOM-Helfer
window.$ = (sel, root = document) => root.querySelector(sel);
window.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
window.show = el => el.classList.remove('hidden');
window.hide = el => el.classList.add('hidden');

// Datumsformatierung (lokal, Berlin)
window.formatDT = iso =>
  new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

window.formatD = iso =>
  new Date(iso).toLocaleDateString('de-DE', { dateStyle: 'medium' });

// Kleine Toast-Info
window.toast = (msg) => { alert(msg); };
