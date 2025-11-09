export function parseDate(dateStr: string): Date | null {
  // Expected format: YYYY-MM-DD HH:MM
  const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const date = new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(minute, 10)
  );

  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function formatDate(date: Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
