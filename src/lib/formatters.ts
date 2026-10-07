/**
 * Indian Rupee (INR) Formatting Utilities
 * Standard format: ₹1,23,456.78
 */

export function formatINR(
  amount: number | string | null | undefined,
  options?: {
    showSymbol?: boolean;
    decimalPlaces?: number;
    compact?: boolean;
  }
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return options?.showSymbol !== false ? '₹0' : '0';
  }

  const num = Number(amount);
  const showSymbol = options?.showSymbol !== false;
  const decimalPlaces = options?.decimalPlaces !== undefined ? options.decimalPlaces : 2;

  if (options?.compact) {
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    const prefix = showSymbol ? '₹' : '';

    if (abs >= 10000000) {
      // Crores
      return `${sign}${prefix}${(abs / 10000000).toFixed(2)} Cr`;
    } else if (abs >= 100000) {
      // Lakhs
      return `${sign}${prefix}${(abs / 100000).toFixed(2)} L`;
    } else if (abs >= 1000) {
      // Thousands
      return `${sign}${prefix}${(abs / 1000).toFixed(1)} k`;
    }
  }

  const isNegative = num < 0;
  const absoluteValue = Math.abs(num);

  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'decimal',
    minimumFractionDigits: decimalPlaces === 0 ? 0 : decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(absoluteValue);

  const prefix = showSymbol ? '₹' : '';
  return `${isNegative ? '-' : ''}${prefix}${formatted}`;
}

export function parseINR(value: string): number {
  if (!value) return 0;
  const clean = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatDateINR(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatMonthYearINR(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(d);
}
