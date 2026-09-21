// tireScanBadge.js — the Jiffy Pitstop tire scan badge on a GREET check-in (greets-list and
// greets-display send tire_scan: 'scanning' while the inspection is open, then its verdict).
// Same labels and colours as the Greets app's board.
export const TIRE_SCAN_BADGE = {
  scanning: { label: 'SCANNING', text: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
  good: { label: 'TIRES GOOD', text: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
  consider: { label: 'TIRES: CONSIDER', text: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
  replace: { label: 'TIRES: REPLACE', text: '#b91c1c', bg: '#fee2e2', border: '#fecaca' },
};

export function tireScanBadge(scan) {
  return scan ? TIRE_SCAN_BADGE[scan] || TIRE_SCAN_BADGE.scanning : null;
}
