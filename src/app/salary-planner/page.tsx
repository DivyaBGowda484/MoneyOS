'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  Tile,
  Select,
  SelectItem,
  TextInput,
  Button,
  Tag,
  ProgressBar,
  InlineNotification,
  DataTableSkeleton,
  Modal,
  Checkbox,
} from '@carbon/react';
import {
  Wallet,
  Checkmark,
  Add,
  Copy,
  TrashCan,
  ArrowRight,
  Money,
  CheckmarkOutline,
  CheckmarkFilled,
  WarningFilled,
  Launch,
  Camera,
} from '@carbon/icons-react';
import { Loading } from '@carbon/react';
import { formatINR } from '@/lib/formatters';

export default function SalaryPlannerPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [plan, setPlan] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [salaryInput, setSalaryInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingSalary, setSavingSalary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add allocation state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newPurpose, setNewPurpose] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newTargetAccount, setNewTargetAccount] = useState('');
  const [addingAllocation, setAddingAllocation] = useState(false);

  // Scan salary plan image/spreadsheet state
  const [scanningPlan, setScanningPlan] = useState(false);
  const scanInputRef = React.useRef<HTMLInputElement | null>(null);

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

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/salary-planner?month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPlan(data.plan);
      setAccounts(data.accounts || []);
      setSalaryInput(data.plan?.salaryAmount ? String(data.plan.salaryAmount) : '');
      if (data.accounts?.length > 0 && !newTargetAccount) {
        setNewTargetAccount(data.accounts[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // Update Take-Home Salary
  const handleSaveSalary = async () => {
    setSavingSalary(true);
    setError(null);
    try {
      const res = await fetch('/api/salary-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          salaryAmount: salaryInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlan(data.plan);
      setSuccessMsg('Salary updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingSalary(false);
    }
  };

  // Clone from previous month
  const handleClonePrevious = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/salary-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'copy-previous',
          month: selectedMonth,
          year: selectedYear,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlan(data.plan);
      setSalaryInput(data.plan?.salaryAmount ? String(data.plan.salaryAmount) : '');
      setSuccessMsg('Copied plan and allocations from previous month!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Done for an allocation
  const handleToggleDone = async (allocationId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/salary-planner/allocations/${allocationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDone: !currentStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Update local state
      setPlan((prev: any) => ({
        ...prev,
        allocations: prev.allocations.map((a: any) =>
          a.id === allocationId ? { ...a, isDone: !currentStatus } : a
        ),
      }));
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Add new Allocation
  const handleAddAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPurpose || !newAmount) return;

    setAddingAllocation(true);
    setError(null);

    try {
      // Ensure plan exists first
      let currentPlanId = plan?.id;
      if (!currentPlanId) {
        const createPlanRes = await fetch('/api/salary-planner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            month: selectedMonth,
            year: selectedYear,
            salaryAmount: salaryInput || '0',
          }),
        });
        const planData = await createPlanRes.json();
        if (!createPlanRes.ok) throw new Error(planData.error);
        currentPlanId = planData.plan.id;
        setPlan(planData.plan);
      }

      const res = await fetch('/api/salary-planner/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salaryPlanId: currentPlanId,
          purpose: newPurpose,
          amount: newAmount,
          targetAccountId: newTargetAccount || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNewPurpose('');
      setNewAmount('');
      setAddModalOpen(false);
      fetchPlan();
      setSuccessMsg('Allocation purpose added!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingAllocation(false);
    }
  };

  // Delete Allocation
  const handleDeleteAllocation = async (id: string) => {
    try {
      const res = await fetch(`/api/salary-planner/allocations/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      setPlan((prev: any) => ({
        ...prev,
        allocations: prev.allocations.filter((a: any) => a.id !== id),
      }));
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Running balance calculation step by step
  const salary = plan?.salaryAmount || parseFloat(salaryInput) || 0;
  let runningBalance = salary;

  const allocationsWithRunningBalance = (plan?.allocations || []).map((a: any) => {
    runningBalance -= a.amount;
    return {
      ...a,
      balanceAfter: runningBalance,
    };
  });

  const totalAllocated = (plan?.allocations || []).reduce((acc: number, a: any) => acc + a.amount, 0);
  const totalCompleted = (plan?.allocations || [])
    .filter((a: any) => a.isDone)
    .reduce((acc: number, a: any) => acc + a.amount, 0);
  const unallocatedAmount = salary - totalAllocated;
  const isWithinSalary = unallocatedAmount >= 0;
  const completedPercent = totalAllocated > 0 ? (totalCompleted / totalAllocated) * 100 : 0;

  // Inline edit state for purpose / amount
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editPurpose, setEditPurpose] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editAccountId, setEditAccountId] = useState('');

  return (
    <AppLayout>
      <div className="space-y-6 pt-2">
        {/* Top Header & Month Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#161616]">Monthly Salary Planner</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Split take-home salary into purposeful goals and track transfers step-by-step
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Select
              id="plan-month"
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
              id="plan-year"
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

            <Button
              size="sm"
              kind="secondary"
              renderIcon={Camera}
              onClick={() => scanInputRef.current?.click()}
              disabled={scanningPlan}
              title="Scan image/photo of salary sheet"
            >
              {scanningPlan ? 'Scanning Sheet...' : 'Scan Salary Sheet'}
            </Button>

            <input
              type="file"
              ref={scanInputRef}
              className="hidden"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                setScanningPlan(true);
                setError(null);
                try {
                  // Preprocess image canvas: upscale & increase contrast for crisp OCR
                  const imgBitmap = await createImageBitmap(file);
                  const canvas = document.createElement('canvas');
                  const scale = Math.max(1, 2000 / Math.max(imgBitmap.width, imgBitmap.height));
                  canvas.width = imgBitmap.width * scale;
                  canvas.height = imgBitmap.height * scale;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(imgBitmap, 0, 0, canvas.width, canvas.height);
                    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const d = imgData.data;
                    for (let i = 0; i < d.length; i += 4) {
                      // Grayscale + high contrast
                      const avg = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                      const threshold = avg > 175 ? 255 : avg < 90 ? 0 : avg;
                      d[i] = threshold;
                      d[i + 1] = threshold;
                      d[i + 2] = threshold;
                    }
                    ctx.putImageData(imgData, 0, 0);
                  }

                  const Tesseract = await import('tesseract.js');
                  const imageSource = canvas.toDataURL('image/png') || file;
                  const { data } = await Tesseract.recognize(imageSource, 'eng', {
                    logger: () => {},
                  });

                  const ocrRes = await fetch('/api/ocr', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: data.text }),
                  });

                  const json = await ocrRes.json();
                  if (json.tableRows && json.tableRows.length > 0) {
                    // Import all rows
                    const importRes = await fetch('/api/salary-planner', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'batch-import-allocations',
                        month: selectedMonth,
                        year: selectedYear,
                        rows: json.tableRows,
                      }),
                    });

                    const importJson = await importRes.json();
                    if (!importRes.ok) throw new Error(importJson.error);

                    setPlan(importJson.plan);
                    setSuccessMsg(`Successfully imported ${json.tableRows.length} purposes from sheet!`);
                    setTimeout(() => setSuccessMsg(null), 4000);
                  } else {
                    setError('Could not detect table rows in image. Please verify image clarity.');
                  }
                } catch (err: any) {
                  setError('Failed to scan salary table: ' + err.message);
                } finally {
                  setScanningPlan(false);
                }
              }}
            />

            <Button
              size="sm"
              kind="tertiary"
              renderIcon={Copy}
              onClick={handleClonePrevious}
              title="Copy last month's salary plan & allocations"
            >
              Clone Last Month
            </Button>
          </div>
        </div>

        {error && (
          <InlineNotification
            kind="error"
            title="Notice: "
            subtitle={error}
            onCloseButtonClick={() => setError(null)}
          />
        )}

        {successMsg && (
          <InlineNotification
            kind="success"
            title="Success: "
            subtitle={successMsg}
            onCloseButtonClick={() => setSuccessMsg(null)}
          />
        )}

        {/* Salary Input Banner & Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Salary Input Card */}
          <Tile className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Monthly Take-Home Salary
              </div>
              <div className="flex items-center space-x-2">
                <TextInput
                  id="salary-amount-input"
                  labelText=""
                  hideLabel
                  placeholder="e.g. 150000"
                  type="number"
                  step="1000"
                  value={salaryInput}
                  onChange={(e) => setSalaryInput(e.target.value)}
                  className="font-mono text-lg font-bold"
                />
                <Button
                  size="md"
                  kind="primary"
                  onClick={handleSaveSalary}
                  disabled={savingSalary || !salaryInput}
                >
                  {savingSalary ? 'Saving...' : 'Set'}
                </Button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Selected Period</span>
              <strong className="text-gray-900 font-medium">
                {months.find((m) => m.value === selectedMonth)?.label} {selectedYear}
              </strong>
            </div>
          </Tile>

          {/* Allocation Health & Remaining Tile */}
          <Tile className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Remaining Unallocated
                </span>
                <Tag type={isWithinSalary ? 'green' : 'red'}>
                  {isWithinSalary ? 'Within Salary' : 'Deficit / Over-allocated'}
                </Tag>
              </div>

              <div
                className={`text-2xl sm:text-3xl font-black font-mono mt-2 ${
                  isWithinSalary ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatINR(unallocatedAmount)}
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-500 flex justify-between">
              <span>Total Salary: <strong className="font-mono text-gray-800">{formatINR(salary)}</strong></span>
              <span>Allocated: <strong className="font-mono text-gray-800">{formatINR(totalAllocated)}</strong></span>
            </div>
          </Tile>

          {/* Transfer Execution Progress */}
          <Tile className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Execution Checklist
                </span>
                <span className="text-xs font-mono font-bold text-blue-600">
                  {completedPercent.toFixed(0)}% Done
                </span>
              </div>

              <div className="text-2xl font-bold font-mono text-[#161616]">
                {formatINR(totalCompleted)} <span className="text-xs font-normal text-gray-500">transferred</span>
              </div>

              <div className="mt-3">
                <ProgressBar
                  label="Salary allocation completion progress"
                  value={completedPercent}
                  max={100}
                  size="small"
                  status={completedPercent === 100 ? 'finished' : 'active'}
                  hideLabel
                />
              </div>
            </div>

            <div className="text-xs text-gray-500 flex justify-between mt-2">
              <span>
                {(plan?.allocations || []).filter((a: any) => a.isDone).length} of{' '}
                {(plan?.allocations || []).length} purposes ticked
              </span>
            </div>
          </Tile>
        </div>

        {/* Allocations Step-by-Step Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
            <div>
              <h2 className="text-base font-bold text-[#161616]">Monthly Allocation Purposes</h2>
              <p className="text-xs text-gray-500">
                Step-by-step priority breakdown with running balance and bank account targets
              </p>
            </div>

            <Button
              size="sm"
              kind="primary"
              renderIcon={Add}
              onClick={() => setAddModalOpen(true)}
            >
              Add Purpose
            </Button>
          </div>

          {loading ? (
            <div className="p-4">
              <DataTableSkeleton columnCount={6} rowCount={5} />
            </div>
          ) : allocationsWithRunningBalance.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="inline-block p-3 bg-gray-100 rounded-full text-gray-400">
                <Wallet size={32} />
              </div>
              <div className="text-base font-semibold text-gray-700">No allocation purposes defined yet</div>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Add purposes like <em>Rent, Emergency Fund, Mutual Funds, Savings, EMI</em>, or click{' '}
                <strong>Clone Last Month</strong> to copy your template.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <Button size="sm" kind="primary" renderIcon={Add} onClick={() => setAddModalOpen(true)}>
                  Add First Purpose
                </Button>
                <Button size="sm" kind="tertiary" renderIcon={Copy} onClick={handleClonePrevious}>
                  Clone Last Month
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100/75 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                    <th className="py-3 px-4 w-12 text-center">Done</th>
                    <th className="py-3 px-4"># Purpose</th>
                    <th className="py-3 px-4">Target Bank / Wallet</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4 text-right">Running Balance Left</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {allocationsWithRunningBalance.map((row: any, index: number) => {
                    const isPositive = row.balanceAfter >= 0;

                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          row.isDone ? 'bg-green-50/30' : ''
                        }`}
                      >
                        {/* Checkbox Done Tick */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleDone(row.id, row.isDone)}
                            className={`p-1.5 rounded-full transition-all ${
                              row.isDone
                                ? 'bg-[#24a148] text-white shadow-sm'
                                : 'border border-gray-300 text-transparent hover:border-gray-500'
                            }`}
                            title={row.isDone ? 'Mark as Pending' : 'Mark as Transferred / Done'}
                          >
                            <Checkmark size={14} />
                          </button>
                        </td>

                        {/* Purpose Name */}
                        <td className="py-3 px-4">
                          {editingRowId === row.id ? (
                            <input
                              type="text"
                              value={editPurpose}
                              onChange={(e) => setEditPurpose(e.target.value)}
                              className="px-2 py-1 border border-blue-500 rounded text-xs w-full font-semibold bg-white"
                              autoFocus
                            />
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-gray-400 font-mono">
                                #{index + 1}
                              </span>
                              <span
                                className={`font-semibold ${
                                  row.isDone ? 'line-through text-gray-400' : 'text-gray-900'
                                }`}
                              >
                                {row.purpose}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Target Bank Account */}
                        <td className="py-3 px-4">
                          {editingRowId === row.id ? (
                            <select
                              value={editAccountId}
                              onChange={(e) => setEditAccountId(e.target.value)}
                              className="px-2 py-1 border border-blue-500 rounded text-xs bg-white"
                            >
                              <option value="">-- Self Account --</option>
                              {accounts.map((a: any) => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                              ))}
                            </select>
                          ) : row.targetAccount ? (
                            <span className="inline-flex items-center space-x-1 text-xs px-2 py-1 bg-gray-100 rounded text-gray-700 font-medium">
                              <span>🏦</span>
                              <span>{row.targetAccount.name}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Self Account</span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                          {editingRowId === row.id ? (
                            <input
                              type="number"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="px-2 py-1 border border-blue-500 rounded text-xs w-24 text-right font-mono bg-white"
                            />
                          ) : (
                            formatINR(row.amount)
                          )}
                        </td>

                        {/* Balance Left After This Row */}
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-mono font-bold text-sm ${
                              isPositive ? 'text-gray-700' : 'text-red-600'
                            }`}
                          >
                            {formatINR(row.balanceAfter)}
                          </span>
                        </td>

                        {/* Status Tag */}
                        <td className="py-3 px-4 text-center">
                          {row.isDone ? (
                            <Tag type="green" size="sm" className="!mr-0">
                              Completed
                            </Tag>
                          ) : (
                            <Tag type="cool-gray" size="sm" className="!mr-0">
                              Pending
                            </Tag>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          {editingRowId === row.id ? (
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={async () => {
                                  await fetch(`/api/salary-planner/allocations/${row.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      purpose: editPurpose,
                                      amount: parseFloat(editAmount) || 0,
                                      targetAccountId: editAccountId || null,
                                    }),
                                  });
                                  setEditingRowId(null);
                                  fetchPlan();
                                }}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-semibold"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingRowId(null)}
                                className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => {
                                  setEditingRowId(row.id);
                                  setEditPurpose(row.purpose);
                                  setEditAmount(String(row.amount));
                                  setEditAccountId(row.targetAccountId || '');
                                }}
                                className="text-gray-500 hover:text-blue-600 text-xs px-1"
                                title="Edit Row"
                              >
                                ✏️
                              </button>
                              <Button
                                hasIconOnly
                                renderIcon={TrashCan}
                                iconDescription="Delete Purpose"
                                kind="ghost"
                                size="sm"
                                onClick={() => handleDeleteAllocation(row.id)}
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Allocation Purpose Modal */}
      <Modal
        open={addModalOpen}
        modalHeading="Add Salary Allocation Purpose"
        passiveModal
        onRequestClose={() => setAddModalOpen(false)}
        size="sm"
      >
        <form onSubmit={handleAddAllocation} className="space-y-4 pt-2">
          <TextInput
            id="alloc-purpose"
            labelText="Purpose Name"
            placeholder="e.g. Rent, PPF, Mutual Funds, Parents"
            value={newPurpose}
            onChange={(e) => setNewPurpose(e.target.value)}
            required
            autoFocus
          />

          <TextInput
            id="alloc-amount"
            labelText="Amount (₹)"
            type="number"
            step="100"
            placeholder="25000"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            required
          />

          <Select
            id="alloc-target-account"
            labelText="Transfer To (Target Bank / Account)"
            value={newTargetAccount}
            onChange={(e) => setNewTargetAccount(e.target.value)}
          >
            <SelectItem value="" text="-- Select Account (Optional) --" />
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id} text={`${a.name} (${a.type})`} />
            ))}
          </Select>

          <div className="flex justify-end pt-3">
            <Button
              type="submit"
              kind="primary"
              renderIcon={Add}
              disabled={!newPurpose || !newAmount || addingAllocation}
            >
              {addingAllocation ? 'Adding...' : 'Add Purpose'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
