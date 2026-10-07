'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import {
  Tile,
  Select,
  SelectItem,
  ProgressBar,
  Tag,
  Button,
  InlineNotification,
  DataTableSkeleton,
  TextInput,
  Modal,
} from '@carbon/react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowsHorizontal,
  Wallet,
  WarningAlt,
  View,
  Add,
  Calendar,
  Filter,
  Money,
} from '@carbon/icons-react';
import { formatINR, formatDateINR } from '@/lib/formatters';

export default function ExpenseDashboard() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Income quick-update modal state
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeDesc, setIncomeDesc] = useState('Monthly Salary');
  const [incomeAccountId, setIncomeAccountId] = useState('');
  const [savingIncome, setSavingIncome] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchDashboard();

    const handleRefresh = () => fetchDashboard();
    window.addEventListener('moneyos-refresh', handleRefresh);
    return () => window.removeEventListener('moneyos-refresh', handleRefresh);
  }, [fetchDashboard]);

  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeAmount) return;

    setSavingIncome(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: incomeAmount,
          description: incomeDesc || 'Monthly Salary',
          type: 'INCOME',
          fromAccountId: incomeAccountId || dashboardData?.accounts?.[0]?.id || null,
          date: new Date(selectedYear, selectedMonth - 1, 1),
          source: 'MANUAL',
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }

      setIncomeAmount('');
      setIncomeModalOpen(false);
      fetchDashboard();
      window.dispatchEvent(new Event('moneyos-refresh'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingIncome(false);
    }
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 pt-2">
        {/* Top Header & Date Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#161616]">Expense Tracker</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Overview for {months.find((m) => m.value === selectedMonth)?.label} {selectedYear}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Select
              id="select-month"
              labelText=""
              hideLabel
              size="sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-36"
            >
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value} text={m.label} />
              ))}
            </Select>

            <Select
              id="select-year"
              labelText=""
              hideLabel
              size="sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-28"
            >
              <SelectItem value={2025} text="2025" />
              <SelectItem value={2026} text="2026" />
              <SelectItem value={2027} text="2027" />
            </Select>

            <Link href="/transactions">
              <Button size="sm" kind="tertiary" renderIcon={View}>
                Ledger
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <InlineNotification
            kind="error"
            title="Failed to load dashboard: "
            subtitle={error}
          />
        )}

        {/* 4 Key Summary Metric Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile className="!p-4 bg-white border border-gray-200 shadow-sm rounded-lg">
            <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
              <span>TOTAL EXPENSE</span>
              <span className="p-1.5 bg-red-50 text-red-600 rounded-full">
                <ArrowUpRight size={16} />
              </span>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-red-600 mt-2 font-mono">
              {formatINR(dashboardData?.summary?.totalExpense || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">For selected month</div>
          </Tile>

          <Tile className="!p-4 bg-white border border-gray-200 shadow-sm rounded-lg relative group">
            <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
              <span>TOTAL INCOME</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    setIncomeAmount(dashboardData?.summary?.totalIncome ? String(dashboardData.summary.totalIncome) : '');
                    setIncomeAccountId(dashboardData?.accounts?.[0]?.id || '');
                    setIncomeModalOpen(true);
                  }}
                  className="text-xs px-2 py-0.5 bg-green-100 hover:bg-green-200 text-green-800 rounded font-semibold transition-colors flex items-center space-x-1"
                  title="Add or update income for this month"
                >
                  <Add size={12} />
                  <span>Update</span>
                </button>
                <span className="p-1.5 bg-green-50 text-green-600 rounded-full">
                  <ArrowDownLeft size={16} />
                </span>
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-green-600 mt-2 font-mono">
              {formatINR(dashboardData?.summary?.totalIncome || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1 flex justify-between items-center">
              <span>Salary & Freelance</span>
            </div>
          </Tile>

          <Tile className="!p-4 bg-white border border-gray-200 shadow-sm rounded-lg">
            <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
              <span>NET SAVINGS</span>
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-full">
                <Wallet size={16} />
              </span>
            </div>
            <div className={`text-lg sm:text-2xl font-bold mt-2 font-mono ${
              (dashboardData?.summary?.netSavings || 0) >= 0 ? 'text-blue-600' : 'text-red-600'
            }`}>
              {formatINR(dashboardData?.summary?.netSavings || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Rate: {(dashboardData?.summary?.savingsRate || 0).toFixed(1)}%
            </div>
          </Tile>

          <Tile className="!p-4 bg-white border border-gray-200 shadow-sm rounded-lg">
            <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
              <span>TOTAL LIQUID BANK</span>
              <span className="p-1.5 bg-purple-50 text-purple-600 rounded-full">
                <Wallet size={16} />
              </span>
            </div>
            <div className="text-lg sm:text-2xl font-bold text-[#161616] mt-2 font-mono">
              {formatINR(dashboardData?.summary?.totalBankBalance || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Across all accounts</div>
          </Tile>
        </div>

        {/* Charts & Category Breakdown Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Trend Bar Visualization */}
          <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#161616]">6-Month Cash Flow Trend</h2>
              <span className="text-xs text-gray-500">Income vs Expenses</span>
            </div>

            <div className="h-56 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-gray-200">
              {dashboardData?.monthsTrend?.map((item: any, idx: number) => {
                const maxVal = Math.max(
                  ...dashboardData.monthsTrend.map((m: any) => Math.max(m.income, m.expense)),
                  1000
                );
                const incHeight = (item.income / maxVal) * 160;
                const expHeight = (item.expense / maxVal) * 160;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip hover */}
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-[#161616] text-white text-[10px] p-1.5 rounded pointer-events-none transition-opacity z-20 whitespace-nowrap shadow-md">
                      <div>Inc: {formatINR(item.income)}</div>
                      <div>Exp: {formatINR(item.expense)}</div>
                    </div>

                    <div className="flex items-end space-x-1.5 w-full justify-center">
                      <div
                        style={{ height: `${Math.max(incHeight, 4)}px` }}
                        className="w-3.5 sm:w-5 bg-[#24a148] rounded-t transition-all hover:opacity-80"
                        title={`Income: ${formatINR(item.income)}`}
                      />
                      <div
                        style={{ height: `${Math.max(expHeight, 4)}px` }}
                        className="w-3.5 sm:w-5 bg-[#fa4d56] rounded-t transition-all hover:opacity-80"
                        title={`Expense: ${formatINR(item.expense)}`}
                      />
                    </div>
                    <span className="text-[11px] text-gray-500 mt-2 font-medium">
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center space-x-6 mt-3 text-xs text-gray-600">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 bg-[#24a148] rounded-sm" />
                <span>Income</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 bg-[#fa4d56] rounded-sm" />
                <span>Expenses</span>
              </div>
            </div>
          </div>

          {/* Category-wise Breakdown */}
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[#161616]">Category Spending</h2>
                <span className="text-xs text-gray-500 font-mono">
                  {formatINR(dashboardData?.summary?.totalExpense || 0)}
                </span>
              </div>

              {dashboardData?.categoryBreakdown?.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400">
                  No expense recorded for this month.
                </div>
              ) : (
                <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                  {dashboardData?.categoryBreakdown?.map((cat: any, i: number) => {
                    const totalExp = dashboardData.summary.totalExpense || 1;
                    const percent = (cat.amount / totalExp) * 100;

                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-gray-700">{cat.name}</span>
                          <span className="font-mono text-gray-900 font-semibold">
                            {formatINR(cat.amount)} ({percent.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: cat.color || '#0f62fe',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Link href="/transactions" className="mt-4 pt-3 border-t border-gray-100 text-center block text-xs font-semibold text-blue-600 hover:underline">
              View All Transactions →
            </Link>
          </div>
        </div>

        {/* Budgets Progress Section */}
        {dashboardData?.budgetStatus?.length > 0 && (
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#161616]">Monthly Budget Limits</h2>
                <p className="text-xs text-gray-500">Track and stay under your category targets</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardData.budgetStatus.map((b: any) => (
                <div
                  key={b.id}
                  className={`p-3.5 rounded-lg border ${
                    b.isOverBudget
                      ? 'bg-red-50/50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-800">{b.categoryName}</span>
                    {b.isOverBudget && (
                      <Tag type="red" size="sm" className="!mr-0">
                        Exceeded
                      </Tag>
                    )}
                  </div>

                  <div className="flex justify-between text-xs text-gray-600 mb-2">
                    <span>
                      Spent: <strong className="font-mono">{formatINR(b.spent)}</strong>
                    </span>
                    <span>
                      Limit: <span className="font-mono">{formatINR(b.allocated)}</span>
                    </span>
                  </div>

                  <ProgressBar
                    label={`Budget progress for ${b.name}`}
                    value={b.percent}
                    max={100}
                    status={b.isOverBudget ? 'error' : b.percent > 80 ? 'active' : 'finished'}
                    size="small"
                    hideLabel
                  />

                  <div className="flex justify-between text-[11px] text-gray-500 mt-2">
                    <span>{b.percent.toFixed(0)}% used</span>
                    <span>
                      {b.remaining >= 0
                        ? `${formatINR(b.remaining)} left`
                        : `${formatINR(Math.abs(b.remaining))} over limit`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Transactions List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#161616]">Recent Transactions</h2>
            <Link href="/transactions">
              <Button size="sm" kind="ghost">
                View All
              </Button>
            </Link>
          </div>

          {loading ? (
            <DataTableSkeleton columnCount={4} rowCount={5} />
          ) : dashboardData?.recentTransactions?.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No transactions found. Click <strong>Quick Add</strong> to record your first entry.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {dashboardData?.recentTransactions?.map((tx: any) => (
                <div key={tx.id} className="py-3 flex items-center justify-between hover:bg-gray-50 px-2 rounded transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      tx.type === 'INCOME'
                        ? 'bg-green-100 text-green-700'
                        : tx.type === 'TRANSFER'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {tx.type === 'INCOME' ? (
                        <ArrowDownLeft size={18} />
                      ) : tx.type === 'TRANSFER' ? (
                        <ArrowsHorizontal size={18} />
                      ) : (
                        <ArrowUpRight size={18} />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{tx.description}</div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{formatDateINR(tx.date)}</span>
                        <span>•</span>
                        <span>{tx.category?.name || 'General'}</span>
                        {tx.fromAccount && (
                          <>
                            <span>•</span>
                            <span>{tx.fromAccount.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-mono font-bold text-sm sm:text-base ${
                      tx.type === 'INCOME'
                        ? 'text-green-600'
                        : tx.type === 'TRANSFER'
                        ? 'text-purple-600'
                        : 'text-red-600'
                    }`}>
                      {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                      {formatINR(tx.amount)}
                    </div>
                    {tx.source !== 'MANUAL' && (
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                        via {tx.source.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Quick Update Income Modal */}
      <Modal
        open={incomeModalOpen}
        modalHeading={`Record / Update Income for ${months.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`}
        passiveModal
        onRequestClose={() => setIncomeModalOpen(false)}
        size="sm"
      >
        <form onSubmit={handleSaveIncome} className="space-y-4 pt-2">
          <TextInput
            id="modal-income-amount"
            labelText="Monthly Income / Salary Amount (₹)"
            type="number"
            step="100"
            placeholder="e.g. 40058"
            value={incomeAmount}
            onChange={(e) => setIncomeAmount(e.target.value)}
            required
            autoFocus
          />

          <TextInput
            id="modal-income-desc"
            labelText="Income Description"
            placeholder="Monthly Salary / Freelance"
            value={incomeDesc}
            onChange={(e) => setIncomeDesc(e.target.value)}
          />

          <Select
            id="modal-income-account"
            labelText="Credit to Account"
            value={incomeAccountId}
            onChange={(e) => setIncomeAccountId(e.target.value)}
          >
            {dashboardData?.accounts?.map((a: any) => (
              <SelectItem key={a.id} value={a.id} text={`${a.name} (${a.type})`} />
            ))}
          </Select>

          <div className="flex justify-end pt-3">
            <Button
              type="submit"
              kind="primary"
              renderIcon={Money}
              disabled={!incomeAmount || savingIncome}
            >
              {savingIncome ? 'Saving...' : 'Save Income'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
