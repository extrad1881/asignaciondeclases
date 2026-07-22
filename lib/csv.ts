export function escapeCsvCell(cell: unknown): string {
  const value = String(cell);
  const safeValue = /^\s*[=+\-@]/.test(value) || /^[\t\r]/.test(value)
    ? `'${value}`
    : value;
  return `"${safeValue.replace(/"/g, '""')}"`;
}
