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
