import { describe, it, expect } from 'vitest';
import { formatINR, parseINR } from './formatters';
import { parseNaturalLanguageInput } from './nlParser';

describe('formatINR', () => {
  it('formats standard Indian currency with commas', () => {
    expect(formatINR(123456.78)).toBe('₹1,23,456.78');
    expect(formatINR(5000000)).toBe('₹50,00,000.00');
    expect(formatINR(450)).toBe('₹450.00');
    expect(formatINR(0)).toBe('₹0.00');
  });

  it('handles negative values correctly', () => {
    expect(formatINR(-450)).toBe('-₹450.00');
  });

  it('supports compact notation in Lakhs and Crores', () => {
    expect(formatINR(1500000, { compact: true })).toBe('₹15.00 L');
    expect(formatINR(25000000, { compact: true })).toBe('₹2.50 Cr');
    expect(formatINR(45000, { compact: true })).toBe('₹45.0 k');
  });
});

describe('parseNaturalLanguageInput', () => {
  it('parses typical single-line quick expense correctly', () => {
    const res = parseNaturalLanguageInput('450 swiggy dinner hdfc');
    expect(res.amount).toBe(450);
    expect(res.type).toBe('EXPENSE');
    expect(res.categoryHint).toBe('Food & Dining');
    expect(res.accountHint).toBe('HDFC');
  });

  it('parses ₹ prefixed amount and groceries', () => {
    const res = parseNaturalLanguageInput('₹1,200 blinkit milk veggies sbi');
    expect(res.amount).toBe(1200);
    expect(res.categoryHint).toBe('Groceries');
    expect(res.accountHint).toBe('SBI');
  });

  it('parses transfer intent', () => {
    const res = parseNaturalLanguageInput('transfer 5000 hdfc to icici');
    expect(res.amount).toBe(5000);
    expect(res.type).toBe('TRANSFER');
    expect(res.accountHint).toBe('hdfc');
    expect(res.toAccountHint).toBe('icici');
  });
});
