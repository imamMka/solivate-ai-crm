export function formatIdr(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export function formatCompactIdr(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export function formatShortDate(iso: string | null): string {
  if (!iso) return 'Not scheduled';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return 'Never';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isTaskOverdue(dueDateIso: string, status: string): boolean {
  if (status !== 'pending') return false;
  // Reference current local date Oct 12, 2026
  const referenceNow = new Date('2026-10-12T12:00:00Z').getTime();
  return new Date(dueDateIso).getTime() < referenceNow;
}
