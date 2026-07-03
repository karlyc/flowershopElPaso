// js/format.js — shared display formatting helpers
export function money(value) {
  const n = Number(value || 0);
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function dateShort(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function dateInput(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

export function dateTimeShort(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function titleCase(value) {
  if (!value) return '—';
  return String(value)
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}
