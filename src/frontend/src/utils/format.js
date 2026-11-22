export function getTransportTypeLabel(type) {
  switch (type?.toLowerCase()) {
    case 'flight': return 'Flight from';
    case 'car': return 'Driving from';
    case 'train': return 'Train from';
    case 'boat': return 'Travel by sea from';
    case 'bus': return 'Bus from';
    default: return 'Travel from';
  }
}

export function formatNumber(n) {
  try {
    return Number(n || 0).toLocaleString();
  } catch {
    return String(n || 0);
  }
}

// Parse a 'YYYY-MM-DD' date string as a local calendar date (no timezone shift).
function parseISODate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

// Compact human date range, e.g. "Feb 1 – 5, 2025", "Jan 30 – Feb 2, 2025",
// "Dec 30, 2024 – Jan 2, 2025" or "Jun 14, 2025" for a single day.
export function formatDateRange(start, end) {
  const a = parseISODate(start);
  const b = parseISODate(end);
  if (!a && !b) return '';
  const md = { month: 'short', day: 'numeric' };
  const mdy = { month: 'short', day: 'numeric', year: 'numeric' };
  if (!a || !b || a.getTime() === b.getTime()) return (a || b).toLocaleDateString(undefined, mdy);
  if (a.getFullYear() !== b.getFullYear()) {
    return `${a.toLocaleDateString(undefined, mdy)} – ${b.toLocaleDateString(undefined, mdy)}`;
  }
  if (a.getMonth() === b.getMonth()) {
    return `${a.toLocaleDateString(undefined, md)} – ${b.getDate()}, ${b.getFullYear()}`;
  }
  return `${a.toLocaleDateString(undefined, md)} – ${b.toLocaleDateString(undefined, md)}, ${b.getFullYear()}`;
}

// Whole nights between two 'YYYY-MM-DD' dates (0 when missing or reversed).
export function nightsBetween(start, end) {
  const a = parseISODate(start);
  const b = parseISODate(end);
  if (!a || !b) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}
