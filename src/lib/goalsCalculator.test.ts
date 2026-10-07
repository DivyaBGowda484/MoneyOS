import { describe, it, expect } from 'vitest';
import { calculateGoalMetrics } from './goalsCalculator';

describe('calculateGoalMetrics', () => {
  it('calculates down payment and monthly EMI for a ₹15,00,000 Car Goal', () => {
    // Target Date: 12 months from now
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 12);

    const result = calculateGoalMetrics({
      targetCost: 1500000,
      targetDate,
      downPaymentPercent: 20, // ₹3,00,000 DP
      expectedLoanTenureMonths: 60, // 5 years
      expectedAnnualInterestRate: 9.0, // 9% p.a.
      currentSavedAmount: 50000,
    });

    expect(result.targetCost).toBe(1500000);
    expect(result.downPaymentRequired).toBe(300000);
    expect(result.loanAmount).toBe(1200000);
    expect(result.monthlyEmi).toBeGreaterThan(24000); // ~24,910
    expect(result.monthlyEmi).toBeLessThan(26000);
    expect(result.progressPercent).toBeCloseTo((50000 / 300000) * 100, 1);
    expect(result.monthsRemaining).toBe(12);
    expect(result.monthlySavingsRequired).toBeGreaterThan(19000);
  });

  it('handles 100% down payment (no loan) for vacation trip', () => {
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 6);

    const result = calculateGoalMetrics({
      targetCost: 200000,
      targetDate,
      downPaymentPercent: 100,
      expectedLoanTenureMonths: 0,
      currentSavedAmount: 50000,
    });

    expect(result.downPaymentRequired).toBe(200000);
    expect(result.loanAmount).toBe(0);
    expect(result.monthlyEmi).toBe(0);
    expect(result.progressPercent).toBe(25.0);
  });
});
