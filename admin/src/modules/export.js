/**
 * Export Module
 * Handles CSV generation and downloads.
 */

function resolveValue(row, key) {
  if (typeof key === 'function') {
    return key(row);
  }

  return String(key || '')
    .split('.')
    .reduce((value, part) => (value == null ? value : value[part]), row);
}

function normalizeCellValue(value) {
  if (value == null) return '';
  if (Array.isArray(value)) {
    return value.map((item) => normalizeCellValue(item)).join(' | ');
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, entryValue]) => `${key}: ${normalizeCellValue(entryValue)}`)
      .join(' | ');
  }
  return String(value);
}

function escapeCsv(value) {
  return `"${normalizeCellValue(value).replace(/"/g, '""')}"`;
}

function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const exportToCSV = (data, filename, columns = null) => {
  if (!Array.isArray(data) || data.length === 0) return false;

  const normalizedColumns = Array.isArray(columns) && columns.length
    ? columns.map((column) => typeof column === 'string'
      ? { key: column, label: column }
      : column)
    : Object.keys(data[0]).map((key) => ({ key, label: key }));

  const rows = data.map((row) => normalizedColumns.map((column) => {
    const rawValue = resolveValue(row, column.key);
    const formattedValue = column.format ? column.format(rawValue, row) : rawValue;
    return escapeCsv(formattedValue);
  }).join(','));

  const csvContent = [
    normalizedColumns.map((column) => escapeCsv(column.label)).join(','),
    ...rows,
  ].join('\n');

  downloadBlob(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), filename);
  return true;
};
