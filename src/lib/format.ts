export function formatCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '—';
  const units = [
    { threshold: 1_000_000_000, suffix: 'B' },
    { threshold: 1_000_000, suffix: 'M' },
    { threshold: 1_000, suffix: 'K' },
  ];
  const unit = units.find((candidate) => value >= candidate.threshold);
  if (!unit) return new Intl.NumberFormat('en-AU').format(Math.round(value));
  return `${new Intl.NumberFormat('en-AU', { maximumFractionDigits: 2 }).format(value / unit.threshold)}${unit.suffix}`;
}
