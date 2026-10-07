/**
 * Financial Goal and Loan EMI / SIP Savings Calculator Utilities for India
 */

export interface GoalCalculationResult {
  targetCost: number;
  downPaymentPercent: number;
  downPaymentRequired: number;
  loanAmount: number;
  monthlyEmi: number;
  totalLoanInterest: number;
  totalLoanPayment: number;
  monthsRemaining: number;
  monthlySavingsRequired: number;
  currentSaved: number;
  progressPercent: number;
}

export function calculateGoalMetrics(params: {
  targetCost: number;
  targetDate: Date | string;
  downPaymentPercent?: number; // e.g. 20%
  expectedLoanTenureMonths?: number; // e.g. 60 months (5 yrs)
  expectedAnnualInterestRate?: number; // e.g. 8.5%
  currentSavedAmount?: number;
  expectedAnnualReturnRate?: number; // e.g. 12% for Mutual Funds/SIP
}): GoalCalculationResult {
  const {
    targetCost,
    targetDate,
    downPaymentPercent = 20,
    expectedLoanTenureMonths = 60,
    expectedAnnualInterestRate = 8.5,
    currentSavedAmount = 0,
    expectedAnnualReturnRate = 10,
  } = params;

  const cost = Math.max(0, targetCost);
  const dpPercent = Math.max(0, Math.min(100, downPaymentPercent));
  const downPaymentRequired = (cost * dpPercent) / 100;
  const loanAmount = Math.max(0, cost - downPaymentRequired);

  // Calculate Monthly EMI: P * r * (1+r)^n / ((1+r)^n - 1)
  let monthlyEmi = 0;
  let totalLoanInterest = 0;
  let totalLoanPayment = loanAmount;

  if (loanAmount > 0 && expectedLoanTenureMonths > 0) {
    const monthlyInterestRate = expectedAnnualInterestRate / 12 / 100;
    if (monthlyInterestRate > 0) {
      const compoundFactor = Math.pow(1 + monthlyInterestRate, expectedLoanTenureMonths);
      monthlyEmi = (loanAmount * monthlyInterestRate * compoundFactor) / (compoundFactor - 1);
    } else {
      monthlyEmi = loanAmount / expectedLoanTenureMonths;
    }
    totalLoanPayment = monthlyEmi * expectedLoanTenureMonths;
    totalLoanInterest = Math.max(0, totalLoanPayment - loanAmount);
  }

  // Calculate Months Remaining until Target Date
  const now = new Date();
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const diffTime = target.getTime() - now.getTime();
  const rawMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.4375));
  const monthsRemaining = Math.max(1, rawMonths);

  // Target amount to save before purchase = downPaymentRequired (or full cost if 100% DP)
  const targetToSave = downPaymentRequired > 0 ? downPaymentRequired : cost;
  const currentSaved = Math.max(0, currentSavedAmount);
  const shortfall = Math.max(0, targetToSave - currentSaved);

  // Monthly SIP / Savings formula: Future Value of SIP
  let monthlySavingsRequired = 0;
  if (shortfall > 0) {
    const monthlyRate = expectedAnnualReturnRate / 12 / 100;
    if (monthlyRate > 0 && monthsRemaining > 1) {
      // Shortfall = SIP * [((1 + r)^n - 1) / r] * (1 + r)
      const factor = ((Math.pow(1 + monthlyRate, monthsRemaining) - 1) / monthlyRate) * (1 + monthlyRate);
      monthlySavingsRequired = shortfall / factor;
    } else {
      monthlySavingsRequired = shortfall / monthsRemaining;
    }
  }

  const progressPercent = targetToSave > 0 ? Math.min(100, (currentSaved / targetToSave) * 100) : 0;

  return {
    targetCost: cost,
    downPaymentPercent: dpPercent,
    downPaymentRequired,
    loanAmount,
    monthlyEmi: Math.round(monthlyEmi),
    totalLoanInterest: Math.round(totalLoanInterest),
    totalLoanPayment: Math.round(totalLoanPayment),
    monthsRemaining,
    monthlySavingsRequired: Math.round(monthlySavingsRequired),
    currentSaved,
    progressPercent: Math.round(progressPercent * 10) / 10,
  };
}
