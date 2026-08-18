export function getLocalDateKey(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error('Local date must be valid.');
  }

  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
