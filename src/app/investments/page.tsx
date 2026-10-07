'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  Tile,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Button,
  Tag,
  ProgressBar,
  TextInput,
  Select,
  SelectItem,
  InlineNotification,
  DataTableSkeleton,
  Modal,
} from '@carbon/react';
import {
  ChartLine,
  Add,
  ArrowUpRight,
  ArrowDownLeft,
  TrashCan,
  Edit,
  Car,
  Home,
  Plane,
  Favorite,
  CheckmarkOutline,
  CheckmarkFilled,
  Idea,
  Money,
  Calendar,
  Camera,
  Microphone,
  MicrophoneFilled,
  Send,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
} from '@carbon/icons-react';
import { formatINR, formatDateINR } from '@/lib/formatters';

const GOAL_ICONS: Record<string, any> = {
  CAR: Car,
  BIKE: Car,
  TRIP: Plane,
  HOME: Home,
  EDUCATION: Idea,
  RETIREMENT: Money,
  OTHER: Favorite,
};

export default function InvestmentsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [addInvestModalOpen, setAddInvestModalOpen] = useState(false);
  const [addGoalModalOpen, setAddGoalModalOpen] = useState(false);
  const [editGoalModalOpen, setEditGoalModalOpen] = useState(false);
  const [editGoalId, setEditGoalId] = useState('');
  const [addWishModalOpen, setAddWishModalOpen] = useState(false);
  const [updateValModal, setUpdateValModal] = useState<{ id: string; name: string; investedAmount: number; type: string } | null>(null);
  const [newValInput, setNewValInput] = useState('');
  const [editTypeInput, setEditTypeInput] = useState('');

  // Form states - Investment
  const [invName, setInvName] = useState('');
  const [invSavingType, setInvSavingType] = useState('Equity MF');
  const [invType, setInvType] = useState('MUTUAL_FUND');
  const [invInvested, setInvInvested] = useState('');
  const [invCurrent, setInvCurrent] = useState('');
  const [invGoalId, setInvGoalId] = useState('');
  const [invAccountId, setInvAccountId] = useState('');
  const [submittingInv, setSubmittingInv] = useState(false);

  // Grouping & Collapse state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Form states - Goal
  const [goalTitle, setGoalTitle] = useState('');
  const [goalCategory, setGoalCategory] = useState('OTHER');
  const [goalCost, setGoalCost] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [goalDpPercent, setGoalDpPercent] = useState('');
  const [goalTenure, setGoalTenure] = useState('');
  const [goalInterest, setGoalInterest] = useState('');
  const [goalSavedAmount, setGoalSavedAmount] = useState('');
  const [goalLinkedInvIds, setGoalLinkedInvIds] = useState<string[]>([]);
  const [submittingGoal, setSubmittingGoal] = useState(false);

  // Form states - Wishlist
  const [wishName, setWishName] = useState('');
  const [wishTargetPrice, setWishTargetPrice] = useState('');
  const [wishRationale, setWishRationale] = useState('');
  const [wishPriority, setWishPriority] = useState('MEDIUM');
  const [submittingWish, setSubmittingWish] = useState(false);

  // Fast AI Quick-Add & OCR state for Investments
  const [aiInvestInput, setAiInvestInput] = useState('');
  const [scanningPortfolio, setScanningPortfolio] = useState(false);
  const [isListeningInv, setIsListeningInv] = useState(false);
  const [submittingAiInv, setSubmittingAiInv] = useState(false);
  const fileInputPortfolioRef = React.useRef<HTMLInputElement | null>(null);

  const fetchInvestmentsData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/investments');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvestmentsData();
  }, [fetchInvestmentsData]);

  // Submit Investment
  const handleAddInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName || !invInvested) return;

    setSubmittingInv(true);
    setError(null);
    try {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-investment',
          name: invName,
          savingType: invSavingType || null,
          type: invType,
          investedAmount: invInvested,
          currentValue: invCurrent || invInvested,
          goalId: invGoalId || null,
          accountId: invAccountId || null,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error);

      setInvName('');
      setInvInvested('');
      setInvCurrent('');
      setAddInvestModalOpen(false);
      setSuccessMsg('Investment added to portfolio!');
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchInvestmentsData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingInv(false);
    }
  };

  // Submit Goal
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle || !goalCost || !goalDate) return;

    setSubmittingGoal(true);
    setError(null);
    try {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-goal',
          title: goalTitle,
          category: goalCategory,
          targetCost: goalCost,
          targetDate: goalDate,
          downPaymentPercent: goalDpPercent || '',
          expectedLoanTenure: goalTenure || '',
          expectedInterestRate: goalInterest || '',
          currentSavedAmount: goalSavedAmount || '',
          linkedInvestmentIds: goalLinkedInvIds,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error);

      setGoalTitle('');
      setGoalCategory('OTHER');
      setGoalCost('');
      setGoalDate('');
      setGoalDpPercent('');
      setGoalTenure('');
      setGoalInterest('');
      setGoalSavedAmount('');
      setGoalLinkedInvIds([]);
      setAddGoalModalOpen(false);
      setSuccessMsg('Financial goal created!');
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchInvestmentsData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingGoal(false);
    }
  };

  // Open Edit Goal modal pre-filled
  const openEditGoal = (g: any) => {
    setEditGoalId(g.id);
    setGoalTitle(g.title);
    setGoalCategory(g.category || 'OTHER');
    setGoalCost(String(g.targetCost));
    // Format date as YYYY-MM-DD for the date input
    const d = new Date(g.targetDate);
    setGoalDate(d.toISOString().split('T')[0]);
    setGoalDpPercent(g.downPaymentPercent != null ? String(g.downPaymentPercent) : '');
    setGoalTenure(g.expectedLoanTenure != null ? String(g.expectedLoanTenure) : '');
    setGoalInterest(g.expectedInterestRate != null ? String(g.expectedInterestRate) : '');
    setGoalSavedAmount(g.currentSavedAmount ? String(g.currentSavedAmount) : '');
    setGoalLinkedInvIds((g.linkedInvestments || []).map((inv: any) => inv.id));
    setEditGoalModalOpen(true);
  };

  const resetGoalForm = () => {
    setGoalTitle('');
    setGoalCategory('OTHER');
    setGoalCost('');
    setGoalDate('');
    setGoalDpPercent('');
    setGoalTenure('');
    setGoalInterest('');
    setGoalSavedAmount('');
    setGoalLinkedInvIds([]);
  };

  // Submit Edit Goal
  const handleEditGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle || !goalCost || !goalDate) return;
    setSubmittingGoal(true);
    setError(null);
    try {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-goal',
          id: editGoalId,
          title: goalTitle,
          category: goalCategory,
          targetCost: goalCost,
          targetDate: goalDate,
          downPaymentPercent: goalDpPercent || '',
          expectedLoanTenure: goalTenure || '',
          expectedInterestRate: goalInterest || '',
          currentSavedAmount: goalSavedAmount || '',
          linkedInvestmentIds: goalLinkedInvIds,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error);
      resetGoalForm();
      setEditGoalId('');
      setEditGoalModalOpen(false);
      setSuccessMsg('Goal updated!');
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchInvestmentsData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingGoal(false);
    }
  };

  // Submit Wishlist
  const handleAddWishlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishName) return;

    setSubmittingWish(true);
    setError(null);
    try {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-wishlist',
          name: wishName,
          targetPrice: wishTargetPrice || null,
          rationale: wishRationale || null,
          priority: wishPriority,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error);

      setWishName('');
      setWishTargetPrice('');
      setWishRationale('');
      setAddWishModalOpen(false);
      setSuccessMsg('Added to investment wishlist!');
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchInvestmentsData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingWish(false);
    }
  };

  // Quick edit holding (invested amount + asset type)
  const handleUpdateValuation = async () => {
    if (!updateValModal || !newValInput) return;
    try {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-investment',
          id: updateValModal.id,
          investedAmount: newValInput,
          currentValue: newValInput, // invested = current value
          type: editTypeInput || updateValModal.type,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error);
      }
      setUpdateValModal(null);
      fetchInvestmentsData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Reorder / Move Holding (Back and Forth)
  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    try {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder-investment',
          id,
          direction,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error);
      }
      fetchInvestmentsData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Toggle Collapse
  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // Delete Action
  const handleDelete = async (action: string, id: string) => {
    try {
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error);
      }
      fetchInvestmentsData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Toggle Wishlist
  const handleToggleWishlist = async (id: string, currentStatus: boolean) => {
    try {
      await fetch('/api/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-wishlist',
          id,
          isFulfilled: !currentStatus,
        }),
      });
      fetchInvestmentsData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const summary = data?.summary || {
    totalInvested: 0,
    totalCurrentValue: 0,
    totalAbsoluteGain: 0,
    totalReturnsPercentage: 0,
    holdingsCount: 0,
  };

  const isOverallPositive = summary.totalAbsoluteGain >= 0;

  return (
    <AppLayout>
      <div className="space-y-6 pt-2">
        {/* Top Header & Fast Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#161616]">Investments & Goals</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Track multi-asset portfolio, down payments, loan EMIs, and future wishlist
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              kind="secondary"
              renderIcon={Camera}
              onClick={() => fileInputPortfolioRef.current?.click()}
              disabled={scanningPortfolio}
            >
              {scanningPortfolio ? 'Scanning Portfolio...' : 'Scan Portfolio / Statement'}
            </Button>
            <input
              type="file"
              ref={fileInputPortfolioRef}
              className="hidden"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                setScanningPortfolio(true);
                setError(null);
                try {
                  // Preprocess image canvas: upscale & high-contrast grayscale for crystal clear OCR
                  const imgBitmap = await createImageBitmap(file);
                  const canvas = document.createElement('canvas');
                  const scale = Math.max(1, 2200 / Math.max(imgBitmap.width, imgBitmap.height));
                  canvas.width = imgBitmap.width * scale;
                  canvas.height = imgBitmap.height * scale;
                  const ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.drawImage(imgBitmap, 0, 0, canvas.width, canvas.height);
                    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const d = imgData.data;
                    for (let i = 0; i < d.length; i += 4) {
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

                  const lines = data.text.split('\n').map((l) => l.trim()).filter(Boolean);
                  const parsedHoldings: Array<{
                    name: string;
                    savingType: string;
                    type: string;
                    investedAmount: number;
                    currentValue: number;
                  }> = [];

                  // Current category context if table has merged rows (e.g. Equity MF -> UTI, Motilal, Parag Parikh...)
                  let currentSavingType = 'Equity MF';
                  let currentCategoryContext = 'MUTUAL_FUND';

                  for (const rawLine of lines) {
                    const line = rawLine.trim();
                    const lower = line.toLowerCase();

                    // Skip header row
                    if (
                      (lower.includes('s.no') || lower.includes('sno') || lower.includes('sl.no')) &&
                      (lower.includes('saving type') || lower.includes('account') || lower.includes('invested'))
                    ) {
                      continue;
                    }

                    // 1. Check for Saving Type / Grouping tags
                    if (lower.includes('cash')) {
                      currentSavingType = 'Cash';
                      currentCategoryContext = 'OTHER';
                    } else if (lower.includes('emergency')) {
                      currentSavingType = 'Emergency Fund';
                      currentCategoryContext = lower.includes('fund') || lower.includes('liquid') ? 'MUTUAL_FUND' : 'OTHER';
                    } else if (lower.includes('equity mf') || lower.includes('equity mutual')) {
                      currentSavingType = 'Equity MF';
                      currentCategoryContext = 'MUTUAL_FUND';
                    } else if (lower.includes('retirement')) {
                      currentSavingType = 'Retirement MF';
                      currentCategoryContext = 'MUTUAL_FUND';
                    } else if (lower.includes('individual stock') || lower.includes('stocks') || lower.includes('shares')) {
                      currentSavingType = 'Individual Stocks';
                      currentCategoryContext = 'STOCKS';
                    } else if (lower.includes('short term')) {
                      currentSavingType = 'Short Term Savings';
                      currentCategoryContext = lower.includes('fund') || lower.includes('liquid') ? 'MUTUAL_FUND' : 'OTHER';
                    } else if (lower.includes('mid term')) {
                      currentSavingType = 'Mid Term Savings';
                      currentCategoryContext = 'MUTUAL_FUND';
                    } else if (lower.includes('long term')) {
                      currentSavingType = 'Long Term Savings';
                      currentCategoryContext = 'MUTUAL_FUND';
                    } else if (lower.includes('gold') || lower.includes('etf')) {
                      currentSavingType = 'Gold ETF';
                      currentCategoryContext = 'GOLD';
                    } else if (lower.includes('family')) {
                      currentSavingType = 'Family';
                      currentCategoryContext = 'MUTUAL_FUND';
                    } else if (lower.includes('fd') || lower.includes('deposit') || lower.includes('fixed')) {
                      currentSavingType = 'FD';
                      currentCategoryContext = 'FD_RD';
                    }

                    // 2. Extract numbers: ₹5,730, ₹15,000, 39,953, 31999
                    const allNums = line.match(/(?:₹|rs\.?)?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]{2})?)/gi) || [];
                    const cleanNums = allNums
                      .map((n) => parseFloat(n.replace(/[^0-9\.]/g, '')))
                      .filter((n) => !isNaN(n) && (n > 20 || n === 0));

                    if (cleanNums.length > 0) {
                      // First amount is the invested amount for this row
                      const amount = cleanNums[0];

                      // 3. Extract Asset/Holding Name
                      // Remove serial number at start (1, 2, 3.. 11)
                      let cleanName = line
                        .replace(/^\s*\d+[\s.)-]+/, '')
                        .replace(/(?:₹|rs\.?)?\s*[\d,\.]+/gi, '')
                        .replace(/\b(s\.no|saving type|where|account|invested|total|by)\b/gi, '')
                        .replace(/[^a-zA-Z0-9\s&-]/g, '')
                        .trim();

                      // Determine specific asset type
                      let invType = currentCategoryContext;
                      if (/gold|sgb/i.test(line)) invType = 'GOLD';
                      else if (/nifty|midcap|flexi|index|arbitrage|money market|liquid fund|mf/i.test(line)) invType = 'MUTUAL_FUND';
                      else if (/l&t|hdfc bank|stock|share/i.test(line)) invType = 'STOCKS';
                      else if (/fd|slice fd/i.test(line)) invType = 'FD_RD';

                      if (cleanName.length >= 2 && !/^(invested|total|saving|type)$/i.test(cleanName)) {
                        parsedHoldings.push({
                          name: cleanName,
                          savingType: currentSavingType,
                          type: invType,
                          investedAmount: amount,
                          currentValue: amount,
                        });
                      }
                    }
                  }

                  if (parsedHoldings.length > 0) {
                    const res = await fetch('/api/investments', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'batch-import-investments',
                        items: parsedHoldings,
                      }),
                    });
                    const resJson = await res.json();
                    if (!res.ok) throw new Error(resJson.error);

                    setSuccessMsg(`Successfully extracted and imported ${parsedHoldings.length} holdings from spreadsheet!`);
                    setTimeout(() => setSuccessMsg(null), 4000);
                    fetchInvestmentsData();
                  } else {
                    setError('Could not detect investment lines. You can use Fast AI Add below.');
                  }
                } catch (err: any) {
                  setError('Failed to scan portfolio image: ' + err.message);
                } finally {
                  setScanningPortfolio(false);
                }
              }}
            />

            <Button
              size="sm"
              kind="primary"
              renderIcon={Add}
              onClick={() => setAddInvestModalOpen(true)}
            >
              Add Holding
            </Button>
            <Button
              size="sm"
              kind="tertiary"
              renderIcon={Car}
              onClick={() => setAddGoalModalOpen(true)}
            >
              New Goal
            </Button>
            <Button
              size="sm"
              kind="ghost"
              renderIcon={Favorite}
              onClick={() => setAddWishModalOpen(true)}
            >
              + Wishlist
            </Button>
          </div>
        </div>

        {/* AI & Voice Fast Investment Quick Bar */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full relative">
            <TextInput
              id="ai-invest-bar"
              labelText=""
              hideLabel
              placeholder="⚡ Type or Speak: e.g. '50000 Parag Parikh Flexi Cap' or '15000 Nifty 50 ETF'"
              value={aiInvestInput}
              onChange={(e) => setAiInvestInput(e.target.value)}
              className="w-full text-sm"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              kind={isListeningInv ? 'danger' : 'secondary'}
              renderIcon={isListeningInv ? MicrophoneFilled : Microphone}
              onClick={() => {
                if (isListeningInv) {
                  setIsListeningInv(false);
                  return;
                }
                const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                if (!SR) {
                  setError('Speech recognition not supported in browser');
                  return;
                }
                const r = new SR();
                r.lang = 'en-IN';
                r.onstart = () => setIsListeningInv(true);
                r.onresult = (ev: any) => {
                  setAiInvestInput(ev.results[0][0].transcript);
                  setIsListeningInv(false);
                };
                r.onerror = () => setIsListeningInv(false);
                r.onend = () => setIsListeningInv(false);
                r.start();
              }}
            >
              {isListeningInv ? 'Listening...' : 'Speak'}
            </Button>

            <Button
              size="sm"
              kind="primary"
              renderIcon={Send}
              disabled={!aiInvestInput.trim() || submittingAiInv}
              onClick={async () => {
                if (!aiInvestInput.trim()) return;
                setSubmittingAiInv(true);
                setError(null);
                try {
                  const numMatch = aiInvestInput.match(/(?:₹|rs\.?)?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]{2})?)/i);
                  const amount = numMatch ? parseFloat(numMatch[1].replace(/,/g, '')) : 0;
                  const name = aiInvestInput.replace(/(?:₹|rs\.?)?\s*[\d,\.]+/gi, '').trim() || 'Investment Holding';

                  let invType = 'MUTUAL_FUND';
                  if (/gold|sgb/i.test(name)) invType = 'GOLD';
                  else if (/stock|shares|equity/i.test(name)) invType = 'STOCKS';
                  else if (/fd|deposit|rd/i.test(name)) invType = 'FD_RD';
                  else if (/ppf|epf/i.test(name)) invType = 'EPF_PPF';
                  else if (/crypto/i.test(name)) invType = 'CRYPTO';

                  const res = await fetch('/api/investments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'add-investment',
                      name: name.charAt(0).toUpperCase() + name.slice(1),
                      type: invType,
                      investedAmount: amount || 1000,
                      currentValue: amount || 1000,
                    }),
                  });

                  if (!res.ok) {
                    const j = await res.json();
                    throw new Error(j.error);
                  }

                  setAiInvestInput('');
                  setSuccessMsg(`Added "${name}" (₹${amount}) to portfolio!`);
                  setTimeout(() => setSuccessMsg(null), 3000);
                  fetchInvestmentsData();
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setSubmittingAiInv(false);
                }
              }}
            >
              {submittingAiInv ? 'Adding...' : 'Fast AI Add'}
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

        {/* 4 Key Portfolio Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile className="!p-4 bg-white border border-gray-200 shadow-sm rounded-lg">
            <div className="text-gray-500 text-xs font-medium">TOTAL PORTFOLIO VALUE</div>
            <div className="text-lg sm:text-2xl font-bold text-[#0f62fe] mt-2 font-mono">
              {formatINR(summary.totalCurrentValue)}
            </div>
            <div className="text-xs text-gray-500 mt-1">{summary.holdingsCount} active investments</div>
          </Tile>

          <Tile className="!p-4 bg-white border border-gray-200 shadow-sm rounded-lg">
            <div className="text-gray-500 text-xs font-medium">TOTAL INVESTED CAPITAL</div>
            <div className="text-lg sm:text-2xl font-bold text-gray-900 mt-2 font-mono">
              {formatINR(summary.totalInvested)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Cost basis</div>
          </Tile>

          <Tile className="!p-4 bg-white border border-gray-200 shadow-sm rounded-lg">
            <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
              <span>UNREALIZED GAINS / P&L</span>
              <span className={`p-1 rounded-full ${isOverallPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {isOverallPositive ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
              </span>
            </div>
            <div className={`text-lg sm:text-2xl font-bold mt-2 font-mono ${isOverallPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isOverallPositive ? '+' : ''}{formatINR(summary.totalAbsoluteGain)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Overall Returns: <strong>{summary.totalReturnsPercentage.toFixed(2)}%</strong>
            </div>
          </Tile>

          <Tile className="!p-4 bg-white border border-gray-200 shadow-sm rounded-lg">
            <div className="text-gray-500 text-xs font-medium">ACTIVE FINANCIAL GOALS</div>
            <div className="text-lg sm:text-2xl font-bold text-purple-600 mt-2 font-mono">
              {data?.goals?.length || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Wishlist: {data?.wishlist?.filter((w: any) => !w.isFulfilled).length || 0} ideas
            </div>
          </Tile>
        </div>

        {/* Tabbed Views: Portfolio, Goals Calculator & Wishlist */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <Tabs>
            <TabList aria-label="Investment Sections" fullWidth>
              <Tab>📊 Portfolio Holdings & Allocation</Tab>
              <Tab>🎯 Financial Goals & EMI Calculator</Tab>
              <Tab>💡 Investment Wishlist</Tab>
            </TabList>

            <TabPanels>
              {/* TAB 1: HOLDINGS & ALLOCATION */}
              <TabPanel>
                <div className="space-y-6 pt-4">
                  {/* Asset Allocation Bar */}
                  {data?.assetAllocation?.length > 0 && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Asset Allocation
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          100% Diversification
                        </span>
                      </div>

                      {/* Multi-color Allocation Progress Bar */}
                      <div className="h-4 rounded-full overflow-hidden flex w-full bg-gray-200 shadow-inner">
                        {data?.assetAllocation?.map((item: any) => (
                          <div
                            key={item.type}
                            style={{
                              width: `${item.percentage}%`,
                              backgroundColor: item.color,
                            }}
                            className="h-full transition-all hover:opacity-90"
                            title={`${item.label}: ${item.percentage.toFixed(1)}% (${formatINR(item.value)})`}
                          />
                        ))}
                      </div>

                      {/* Legend Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4 pt-2">
                        {data?.assetAllocation?.map((item: any) => (
                          <div key={item.type} className="flex items-center space-x-2 text-xs">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <div className="truncate">
                              <span className="font-semibold text-gray-800">{item.label}</span>
                              <div className="text-gray-500 font-mono text-[11px]">
                                {formatINR(item.value)} ({item.percentage.toFixed(1)}%)
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grouped Portfolio Holdings Table (like Spreadsheet) */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">Portfolio Holdings & Saving Types</h3>
                        <p className="text-xs text-gray-500">Grouped by purpose / saving category with reorder controls (↑ / ↓) and subtotals</p>
                      </div>
                      <Button
                        size="sm"
                        kind="primary"
                        renderIcon={Add}
                        onClick={() => setAddInvestModalOpen(true)}
                      >
                        Add Holding
                      </Button>
                    </div>

                    {loading ? (
                      <DataTableSkeleton columnCount={7} rowCount={6} />
                    ) : data?.investments?.length === 0 ? (
                      <div className="text-center py-12 text-sm text-gray-400">
                        No investment holdings recorded yet. Click <strong>Add Holding</strong> to start tracking!
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-[#161616] text-white border-b border-gray-700 text-xs font-semibold uppercase tracking-wider">
                              <th className="py-3 px-3 text-center w-12">S.No</th>
                              <th className="py-3 px-4 w-44">Saving Type</th>
                              <th className="py-3 px-4">Where / Account / Fund</th>
                              <th className="py-3 px-3">Asset Type</th>
                              <th className="py-3 px-4 text-right">Invested (₹) ✎</th>
                              <th className="py-3 px-4 text-right">Total by Type (₹)</th>
                              <th className="py-3 px-3 text-center w-28">Order</th>
                              <th className="py-3 px-3 text-center w-20">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-sm">
                            {(() => {
                              // Build groups preserving user order
                              const groupsMap: Record<string, any[]> = {};
                              const groupKeys: string[] = [];

                              (data?.investments || []).forEach((inv: any) => {
                                const st = inv.savingType || 'General Investments';
                                if (!groupsMap[st]) {
                                  groupsMap[st] = [];
                                  groupKeys.push(st);
                                }
                                groupsMap[st].push(inv);
                              });

                              let globalSerial = 0;

                              return groupKeys.map((groupKey) => {
                                globalSerial += 1;
                                const groupItems = groupsMap[groupKey];
                                const groupTotalInvested = groupItems.reduce((acc, it) => acc + (it.investedAmount || 0), 0);
                                const groupTotalCurrent = groupItems.reduce((acc, it) => acc + (it.currentValue || 0), 0);
                                const isCollapsed = collapsedGroups[groupKey] || false;

                                return (
                                  <React.Fragment key={groupKey}>
                                    {/* Group Header / Row 1 */}
                                    {groupItems.map((inv: any, itemIdx: number) => {
                                      const gain = inv.currentValue - inv.investedAmount;
                                      const isPositive = gain >= 0;
                                      const isFirstInGroup = itemIdx === 0;

                                      return (
                                        <tr
                                          key={inv.id}
                                          className={`hover:bg-blue-50/40 transition-colors ${
                                            isFirstInGroup && globalSerial > 1 ? 'border-t-2 border-gray-200' : ''
                                          }`}
                                        >
                                          {/* S.No */}
                                          {isFirstInGroup ? (
                                            <td
                                              rowSpan={groupItems.length}
                                              className="py-3 px-3 text-center font-mono font-bold text-gray-500 bg-gray-50/70 border-r border-gray-200 align-top"
                                            >
                                              {globalSerial}
                                            </td>
                                          ) : null}

                                          {/* Saving Type */}
                                          {isFirstInGroup ? (
                                            <td
                                              rowSpan={groupItems.length}
                                              className="py-3 px-4 font-bold text-gray-900 bg-gray-50/50 border-r border-gray-200 align-top"
                                            >
                                              <div className="flex items-center justify-between gap-1">
                                                <span className="text-sm font-semibold">{groupKey}</span>
                                                <span className="text-[11px] font-normal text-gray-500 px-1.5 py-0.5 bg-gray-200/80 rounded whitespace-nowrap leading-none inline-flex items-center">
                                                  {groupItems.length} {groupItems.length === 1 ? 'item' : 'items'}
                                                </span>
                                              </div>
                                            </td>
                                          ) : null}

                                          {/* Where / Account / Holding Name */}
                                          <td className="py-3 px-4">
                                            <div className="font-semibold text-gray-900 flex items-center space-x-2">
                                              <span>{inv.name}</span>
                                              {inv.goal && (
                                                <Tag type="purple" size="sm">
                                                  🎯 {inv.goal.title}
                                                </Tag>
                                              )}
                                            </div>
                                            {inv.notes && (
                                              <div className="text-[11px] text-gray-400">{inv.notes}</div>
                                            )}
                                          </td>

                                          {/* Asset Type — click to edit */}
                                          <td className="py-3 px-3">
                                            <button
                                              className="group flex items-center gap-1"
                                              title="Click to change asset type"
                                              onClick={() => {
                                                setUpdateValModal({ id: inv.id, name: inv.name, investedAmount: inv.investedAmount, type: inv.type || 'OTHER' });
                                                setNewValInput(String(inv.investedAmount));
                                                setEditTypeInput(inv.type || 'OTHER');
                                              }}
                                            >
                                              <Tag type="cool-gray" size="sm">
                                                {inv.type ? inv.type.replace(/_/g, ' ') : 'OTHER'}
                                              </Tag>
                                              <Edit size={11} className="text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                          </td>

                                          {/* Invested Amount — click pencil to edit */}
                                          <td className="py-3 px-4 text-right font-mono text-gray-800 font-medium">
                                            <div className="flex items-center justify-end space-x-1">
                                              <span>{formatINR(inv.investedAmount)}</span>
                                              <button
                                                onClick={() => {
                                                  setUpdateValModal({ id: inv.id, name: inv.name, investedAmount: inv.investedAmount, type: inv.type || 'OTHER' });
                                                  setNewValInput(String(inv.investedAmount));
                                                  setEditTypeInput(inv.type || 'OTHER');
                                                }}
                                                className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-gray-100"
                                                title="Edit invested amount"
                                              >
                                                <Edit size={14} />
                                              </button>
                                            </div>
                                          </td>

                                          {/* Total by Saving Type (Group Subtotal in column) */}
                                          {isFirstInGroup ? (
                                            <td
                                              rowSpan={groupItems.length}
                                              className="py-3 px-4 text-right font-mono font-bold text-gray-950 bg-gray-50/80 border-l border-r border-gray-200 align-top text-sm"
                                              >
                                                {formatINR(groupTotalInvested)}
                                              </td>
                                          ) : null}

                                          {/* Move Up / Down (Back and Forth controls) */}
                                          <td className="py-3 px-2 text-center">
                                            <div className="inline-flex items-center space-x-0.5 bg-gray-100 rounded p-0.5 border border-gray-200">
                                              <button
                                                onClick={() => handleReorder(inv.id, 'up')}
                                                className="p-1 hover:bg-white text-gray-700 hover:text-blue-600 rounded transition-colors"
                                                title="Move Up (Move backward in list)"
                                              >
                                                <ArrowUp size={14} />
                                              </button>
                                              <button
                                                onClick={() => handleReorder(inv.id, 'down')}
                                                className="p-1 hover:bg-white text-gray-700 hover:text-blue-600 rounded transition-colors"
                                                title="Move Down (Move forward in list)"
                                              >
                                                <ArrowDown size={14} />
                                              </button>
                                            </div>
                                          </td>

                                          {/* Actions */}
                                          <td className="py-3 px-3 text-center">
                                            <Button
                                              hasIconOnly
                                              renderIcon={TrashCan}
                                              iconDescription="Delete Holding"
                                              kind="ghost"
                                              size="sm"
                                              onClick={() => handleDelete('delete-investment', inv.id)}
                                            />
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </React.Fragment>
                                );
                              });
                            })()}
                          </tbody>
                          {/* Asset-type totals footer */}
                          <tfoot>
                            {(() => {
                              const typeMap: Record<string, number> = {};
                              (data?.investments || []).forEach((inv: any) => {
                                const t = inv.type || 'OTHER';
                                typeMap[t] = (typeMap[t] || 0) + (inv.investedAmount || 0);
                              });
                              const sorted = Object.entries(typeMap).sort((a, b) => b[1] - a[1]);
                              const grandTotal = sorted.reduce((s, [, v]) => s + v, 0);
                              return (
                                <>
                                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                                    <td colSpan={3} className="py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                      Total by Asset Type
                                    </td>
                                    {sorted.map(([type, total]) => (
                                      <td key={type} className="py-2 px-3 text-right">
                                        <div className="text-[10px] text-gray-500 uppercase">{type.replace(/_/g, ' ')}</div>
                                        <div className="text-xs font-bold text-gray-800 font-mono">{formatINR(total)}</div>
                                      </td>
                                    ))}
                                    <td colSpan={3} className="py-2 px-4 text-right">
                                      <div className="text-[10px] text-gray-500 uppercase">Grand Total</div>
                                      <div className="text-sm font-bold text-[#0f62fe] font-mono">{formatINR(grandTotal)}</div>
                                    </td>
                                  </tr>
                                </>
                              );
                            })()}
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </TabPanel>

              {/* TAB 2: FINANCIAL GOALS & CALCULATOR */}
              <TabPanel>
                <div className="space-y-6 pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Financial Goals & Down Payment Calculator</h3>
                      <p className="text-xs text-gray-500">
                        Calculates required down payment, EMI, and monthly savings needed to reach target date
                      </p>
                    </div>
                    <Button
                      size="sm"
                      kind="primary"
                      renderIcon={Add}
                      onClick={() => setAddGoalModalOpen(true)}
                    >
                      Create Goal
                    </Button>
                  </div>

                  {data?.goals?.length === 0 ? (
                    <div className="text-center py-12 text-sm text-gray-400">
                      No goals set yet. Add goals like <strong>Car, Bike, Europe Vacation, House Down Payment</strong> to see calculations.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data?.goals?.map((g: any) => {
                        const Icon = GOAL_ICONS[g.category] || Favorite;
                        const m = g.metrics;

                        return (
                          <div
                            key={g.id}
                            className="p-5 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between space-y-4"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <span className="p-2 bg-purple-50 text-purple-700 rounded-lg">
                                    <Icon size={20} />
                                  </span>
                                  <div>
                                    <h4 className="font-bold text-gray-900 text-base">{g.title}</h4>
                                    <span className="text-xs text-gray-500">Target: {formatDateINR(g.targetDate)}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    hasIconOnly
                                    renderIcon={Edit}
                                    iconDescription="Edit Goal"
                                    kind="ghost"
                                    size="sm"
                                    onClick={() => openEditGoal(g)}
                                  />
                                  <Button
                                    hasIconOnly
                                    renderIcon={TrashCan}
                                    iconDescription="Delete Goal"
                                    kind="ghost"
                                    size="sm"
                                    onClick={() => handleDelete('delete-goal', g.id)}
                                  />
                                </div>
                              </div>

                              {/* Target Cost & Progress */}
                              <div className="flex justify-between items-end my-3">
                                <div>
                                  <div className="text-xs text-gray-500 uppercase">Target Cost</div>
                                  <div className="text-xl font-bold font-mono text-gray-900">
                                    {formatINR(g.targetCost)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-semibold text-purple-700">
                                    {m.progressPercent}% Saved
                                  </span>
                                  <div className="text-xs text-gray-500 font-mono">
                                    {formatINR(g.totalSaved ?? g.linkedSaved)} of {m.downPaymentRequired > 0 ? formatINR(m.downPaymentRequired) + ' DP' : formatINR(g.targetCost)}
                                  </div>
                                </div>
                              </div>

                              <ProgressBar
                                label={`Goal progress for ${g.title}`}
                                value={m.progressPercent}
                                max={100}
                                size="small"
                                status={m.progressPercent >= 100 ? 'finished' : 'active'}
                                hideLabel
                              />

                              {/* Savings Breakdown */}
                              {(g.linkedSaved > 0 || g.manualSaved > 0) && (
                                <div className="mt-3 p-2 bg-green-50 rounded border border-green-100 text-xs space-y-1">
                                  <div className="font-semibold text-green-800 text-[11px] uppercase tracking-wide mb-1">Savings Breakdown</div>
                                  {g.manualSaved > 0 && (
                                    <div className="flex justify-between text-gray-600">
                                      <span>💰 Cash / Manual Savings</span>
                                      <span className="font-mono font-semibold">{formatINR(g.manualSaved)}</span>
                                    </div>
                                  )}
                                  {g.linkedSaved > 0 && (
                                    <div className="flex justify-between text-gray-600">
                                      <span>📈 Linked Investments ({g.linkedInvestments?.length ?? 0} holding{(g.linkedInvestments?.length ?? 0) !== 1 ? 's' : ''})</span>
                                      <span className="font-mono font-semibold">{formatINR(g.linkedSaved)}</span>
                                    </div>
                                  )}
                                  {g.manualSaved > 0 && g.linkedSaved > 0 && (
                                    <div className="flex justify-between text-green-800 font-bold border-t border-green-200 pt-1 mt-1">
                                      <span>Total Saved</span>
                                      <span className="font-mono">{formatINR(g.totalSaved)}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Calculator Metrics Grid */}
                              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100 text-xs">
                                {m.downPaymentRequired > 0 && (
                                  <div className="p-2 bg-gray-50 rounded">
                                    <span className="text-gray-500 block">Down Payment ({g.downPaymentPercent ?? 0}%):</span>
                                    <strong className="font-mono text-gray-900 text-sm">
                                      {formatINR(m.downPaymentRequired)}
                                    </strong>
                                  </div>
                                )}

                                <div className="p-2 bg-blue-50/70 rounded">
                                  <span className="text-blue-700 block">Save Monthly (SIP):</span>
                                  <strong className="font-mono text-blue-800 text-sm">
                                    {formatINR(m.monthlySavingsRequired)} / mo
                                  </strong>
                                  <span className="text-[10px] text-gray-500 block">{m.monthsRemaining} months left</span>
                                </div>

                                {m.loanAmount > 0 && (
                                  <>
                                    <div className="p-2 bg-gray-50 rounded">
                                      <span className="text-gray-500 block">Loan Amount:</span>
                                      <strong className="font-mono text-gray-800 text-sm">
                                        {formatINR(m.loanAmount)}
                                      </strong>
                                      <span className="text-[10px] text-gray-500 block">{g.expectedLoanTenure} mo @ {g.expectedInterestRate}%</span>
                                    </div>

                                    <div className="p-2 bg-purple-50/70 rounded">
                                      <span className="text-purple-700 block">Estimated EMI:</span>
                                      <strong className="font-mono text-purple-800 text-sm">
                                        {formatINR(m.monthlyEmi)} / mo
                                      </strong>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabPanel>

              {/* TAB 3: WISHLIST BOARD */}
              <TabPanel>
                <div className="space-y-6 pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Investment Wishlist</h3>
                      <p className="text-xs text-gray-500">
                        Future stocks, funds, or real estate opportunities to buy on dip
                      </p>
                    </div>
                    <Button
                      size="sm"
                      kind="primary"
                      renderIcon={Add}
                      onClick={() => setAddWishModalOpen(true)}
                    >
                      Add Idea
                    </Button>
                  </div>

                  {data?.wishlist?.length === 0 ? (
                    <div className="text-center py-12 text-sm text-gray-400">
                      Your wishlist is empty. Add ideas with buy triggers and rationales!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {data?.wishlist?.map((w: any) => (
                        <div
                          key={w.id}
                          className={`p-4 rounded-lg border transition-all ${
                            w.isFulfilled
                              ? 'bg-gray-50 border-gray-200 opacity-60'
                              : 'bg-white border-gray-200 shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleToggleWishlist(w.id, w.isFulfilled)}
                                className={`p-1 rounded-full ${
                                  w.isFulfilled ? 'text-green-600' : 'text-gray-300 hover:text-gray-600'
                                }`}
                                title={w.isFulfilled ? 'Mark as Active' : 'Mark as Bought / Fulfilled'}
                              >
                                {w.isFulfilled ? <CheckmarkFilled size={18} /> : <CheckmarkOutline size={18} />}
                              </button>
                              <span
                                className={`font-semibold text-sm ${
                                  w.isFulfilled ? 'line-through text-gray-400' : 'text-gray-900'
                                }`}
                              >
                                {w.name}
                              </span>
                            </div>

                            <Tag
                              type={
                                w.priority === 'HIGH'
                                  ? 'red'
                                  : w.priority === 'MEDIUM'
                                  ? 'purple'
                                  : 'cool-gray'
                              }
                              size="sm"
                            >
                              {w.priority}
                            </Tag>
                          </div>

                          {w.targetPrice && (
                            <div className="mt-2 text-xs text-gray-600">
                              Target Trigger Price:{' '}
                              <strong className="font-mono text-gray-900">{formatINR(w.targetPrice)}</strong>
                            </div>
                          )}

                          {w.rationale && (
                            <p className="mt-2 text-xs text-gray-500 italic bg-gray-50 p-2 rounded">
                              "{w.rationale}"
                            </p>
                          )}

                          <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100 text-[11px] text-gray-400">
                            <span>Added {formatDateINR(w.createdAt)}</span>
                            <Button
                              hasIconOnly
                              renderIcon={TrashCan}
                              iconDescription="Delete Wishlist Item"
                              kind="ghost"
                              size="sm"
                              onClick={() => handleDelete('delete-wishlist', w.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>
      </div>

      {/* Modal 1: Add Investment Holding */}
      <Modal
        open={addInvestModalOpen}
        modalHeading="Add Investment Holding"
        passiveModal
        onRequestClose={() => setAddInvestModalOpen(false)}
        size="md"
      >
        <form onSubmit={handleAddInvestment} className="space-y-4 pt-2">
          <TextInput
            id="inv-name"
            labelText="Investment / Fund Name"
            placeholder="e.g. Parag Parikh Flexi Cap Fund, Nifty 50 ETF, SGB 2024"
            value={invName}
            onChange={(e) => setInvName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-3 gap-3">
            <Select
              id="inv-saving-type"
              labelText="Saving Type / Group"
              value={invSavingType}
              onChange={(e) => setInvSavingType(e.target.value)}
            >
              <SelectItem value="Cash" text="Cash" />
              <SelectItem value="FD" text="FD" />
              <SelectItem value="Emergency Fund" text="Emergency Fund" />
              <SelectItem value="Equity MF" text="Equity MF" />
              <SelectItem value="Retirement MF" text="Retirement MF" />
              <SelectItem value="Individual Stocks" text="Individual Stocks" />
              <SelectItem value="Short Term Savings" text="Short Term Savings" />
              <SelectItem value="Mid Term Savings" text="Mid Term Savings" />
              <SelectItem value="Long Term Savings" text="Long Term Savings" />
              <SelectItem value="Gold ETF" text="Gold ETF" />
              <SelectItem value="Family" text="Family" />
              <SelectItem value="General Investments" text="General Investments" />
            </Select>

            <Select
              id="inv-type"
              labelText="Asset Type"
              value={invType}
              onChange={(e) => setInvType(e.target.value)}
            >
              <SelectItem value="MUTUAL_FUND" text="Mutual Fund (Equity/Debt)" />
              <SelectItem value="STOCKS" text="Direct Stocks / ETF" />
              <SelectItem value="FD_RD" text="Fixed / Recurring Deposit" />
              <SelectItem value="GOLD" text="Gold (SGB, Digital, Physical)" />
              <SelectItem value="EPF_PPF" text="EPF & PPF" />
              <SelectItem value="NPS" text="National Pension Scheme (NPS)" />
              <SelectItem value="REAL_ESTATE" text="Real Estate & REIT" />
              <SelectItem value="CRYPTO" text="Crypto" />
              <SelectItem value="OTHER" text="Other Asset" />
            </Select>

            <Select
              id="inv-goal"
              labelText="Link to Goal (Optional)"
              value={invGoalId}
              onChange={(e) => setInvGoalId(e.target.value)}
            >
              <SelectItem value="" text="-- No Linked Goal --" />
              {data?.goals?.map((g: any) => (
                <SelectItem key={g.id} value={g.id} text={g.title} />
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextInput
              id="inv-invested"
              labelText="Total Invested Amount (₹)"
              type="number"
              step="100"
              placeholder="50000"
              value={invInvested}
              onChange={(e) => setInvInvested(e.target.value)}
              required
            />

            <TextInput
              id="inv-current"
              labelText="Current Market Value (₹)"
              type="number"
              step="100"
              placeholder="58400 (leave blank if same)"
              value={invCurrent}
              onChange={(e) => setInvCurrent(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-3">
            <Button
              type="submit"
              kind="primary"
              renderIcon={Add}
              disabled={!invName || !invInvested || submittingInv}
            >
              {submittingInv ? 'Adding...' : 'Save Holding'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Add Goal */}
      <Modal
        open={addGoalModalOpen}
        modalHeading="Create Financial Goal"
        passiveModal
        onRequestClose={() => {
          setAddGoalModalOpen(false);
          setGoalTitle('');
          setGoalCategory('OTHER');
          setGoalCost('');
          setGoalDate('');
          setGoalDpPercent('');
          setGoalTenure('');
          setGoalInterest('');
          setGoalSavedAmount('');
          setGoalLinkedInvIds([]);
        }}
        size="md"
      >
        <form onSubmit={handleAddGoal} className="space-y-4 pt-2">
          <TextInput
            id="goal-title"
            labelText="Goal Title"
            placeholder="e.g. Hyundai Creta, Europe Trip, House Down Payment"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              id="goal-category"
              labelText="Category"
              value={goalCategory}
              onChange={(e) => setGoalCategory(e.target.value)}
            >
              <SelectItem value="OTHER" text="Other Milestone" />
              <SelectItem value="CAR" text="Car Purchase" />
              <SelectItem value="BIKE" text="Bike / Two Wheeler" />
              <SelectItem value="TRIP" text="Vacation / Trip" />
              <SelectItem value="HOME" text="Home / Real Estate" />
              <SelectItem value="EDUCATION" text="Higher Education" />
              <SelectItem value="RETIREMENT" text="Retirement Corpus" />
            </Select>

            <TextInput
              id="goal-date"
              labelText="Target Date"
              type="date"
              value={goalDate}
              onChange={(e) => setGoalDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextInput
              id="goal-cost"
              labelText="Total Target Cost (₹)"
              type="number"
              step="1000"
              placeholder="e.g. 1500000"
              value={goalCost}
              onChange={(e) => setGoalCost(e.target.value)}
              required
            />

            <TextInput
              id="goal-saved"
              labelText="Already Saved (₹) — Optional"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 25000"
              value={goalSavedAmount}
              onChange={(e) => setGoalSavedAmount(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextInput
              id="goal-dp"
              labelText="Down Payment % — Optional"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 20 (skip if N/A)"
              value={goalDpPercent}
              onChange={(e) => setGoalDpPercent(e.target.value)}
            />

            <TextInput
              id="goal-tenure"
              labelText="Loan Tenure (Months) — Optional"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 60 (skip if N/A)"
              value={goalTenure}
              onChange={(e) => setGoalTenure(e.target.value)}
            />
          </div>

          <TextInput
            id="goal-interest"
            labelText="Loan Interest Rate (% p.a.) — Optional"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 9.0 (skip if saving fully)"
            value={goalInterest}
            onChange={(e) => setGoalInterest(e.target.value)}
          />

          {/* Link existing investments — show all; mark ones already linked to another goal */}
          {data?.investments && data.investments.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Link Investments to This Goal — Optional
              </p>
              <p className="text-xs text-gray-500 mb-2">
                Tick any holdings to count their value as saved towards this goal.
              </p>
              <div className="border border-gray-200 rounded max-h-40 overflow-y-auto divide-y divide-gray-100">
                {data.investments.map((inv: any) => {
                  const alreadyLinked = inv.goalId && !goalLinkedInvIds.includes(inv.id);
                  return (
                    <label
                      key={inv.id}
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${alreadyLinked ? 'opacity-50' : 'hover:bg-gray-50'}`}
                    >
                      <input
                        type="checkbox"
                        className="accent-blue-600"
                        checked={goalLinkedInvIds.includes(inv.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGoalLinkedInvIds((prev) => [...prev, inv.id]);
                          } else {
                            setGoalLinkedInvIds((prev) => prev.filter((id) => id !== inv.id));
                          }
                        }}
                      />
                      <span className="text-sm flex-1 truncate">{inv.name}</span>
                      {alreadyLinked && (
                        <span className="text-[10px] text-orange-500 shrink-0 font-medium">linked to other goal</span>
                      )}
                      <span className="text-xs text-gray-400 shrink-0 font-mono">
                        ₹{inv.currentValue.toLocaleString('en-IN')}
                      </span>
                    </label>
                  );
                })}
              </div>
              {goalLinkedInvIds.length > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  {goalLinkedInvIds.length} investment{goalLinkedInvIds.length > 1 ? 's' : ''} selected · ₹
                  {data.investments
                    .filter((inv: any) => goalLinkedInvIds.includes(inv.id))
                    .reduce((s: number, inv: any) => s + inv.currentValue, 0)
                    .toLocaleString('en-IN')}{' '}
                  will count as saved
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end pt-3">
            <Button
              type="submit"
              kind="primary"
              renderIcon={Add}
              disabled={!goalTitle || !goalCost || !goalDate || submittingGoal}
            >
              {submittingGoal ? 'Calculating...' : 'Create Goal & Calculate'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2b: Edit Goal */}
      <Modal
        open={editGoalModalOpen}
        modalHeading="Edit Financial Goal"
        passiveModal
        onRequestClose={() => { setEditGoalModalOpen(false); resetGoalForm(); setEditGoalId(''); }}
        size="md"
      >
        <form onSubmit={handleEditGoal} className="space-y-4 pt-2">
          <TextInput
            id="edit-goal-title"
            labelText="Goal Title"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              id="edit-goal-category"
              labelText="Category"
              value={goalCategory}
              onChange={(e) => setGoalCategory(e.target.value)}
            >
              <SelectItem value="OTHER" text="Other Milestone" />
              <SelectItem value="CAR" text="Car Purchase" />
              <SelectItem value="BIKE" text="Bike / Two Wheeler" />
              <SelectItem value="TRIP" text="Vacation / Trip" />
              <SelectItem value="HOME" text="Home / Real Estate" />
              <SelectItem value="EDUCATION" text="Higher Education" />
              <SelectItem value="RETIREMENT" text="Retirement Corpus" />
            </Select>

            <TextInput
              id="edit-goal-date"
              labelText="Target Date"
              type="date"
              value={goalDate}
              onChange={(e) => setGoalDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextInput
              id="edit-goal-cost"
              labelText="Total Target Cost (₹)"
              type="number"
              step="1000"
              value={goalCost}
              onChange={(e) => setGoalCost(e.target.value)}
              required
            />
            <TextInput
              id="edit-goal-saved"
              labelText="Cash / Manual Savings (₹) — Optional"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 25000"
              value={goalSavedAmount}
              onChange={(e) => setGoalSavedAmount(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextInput
              id="edit-goal-dp"
              labelText="Down Payment % — Optional"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 20 (skip if N/A)"
              value={goalDpPercent}
              onChange={(e) => setGoalDpPercent(e.target.value)}
            />
            <TextInput
              id="edit-goal-tenure"
              labelText="Loan Tenure (Months) — Optional"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 60 (skip if N/A)"
              value={goalTenure}
              onChange={(e) => setGoalTenure(e.target.value)}
            />
          </div>

          <TextInput
            id="edit-goal-interest"
            labelText="Loan Interest Rate (% p.a.) — Optional"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 9.0 (skip if N/A)"
            value={goalInterest}
            onChange={(e) => setGoalInterest(e.target.value)}
          />

          {/* Link investments — show all; mark ones linked to a different goal */}
          {data?.investments && data.investments.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Link Investments to This Goal — Optional</p>
              <p className="text-xs text-gray-500 mb-2">Tick any holdings to count their value as saved towards this goal.</p>
              <div className="border border-gray-200 rounded max-h-40 overflow-y-auto divide-y divide-gray-100">
                {data.investments.map((inv: any) => {
                  const alreadyLinkedElsewhere = inv.goalId && inv.goalId !== editGoalId && !goalLinkedInvIds.includes(inv.id);
                  return (
                    <label key={inv.id} className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${alreadyLinkedElsewhere ? 'opacity-50' : 'hover:bg-gray-50'}`}>
                      <input
                        type="checkbox"
                        className="accent-blue-600"
                        checked={goalLinkedInvIds.includes(inv.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGoalLinkedInvIds((prev) => [...prev, inv.id]);
                          } else {
                            setGoalLinkedInvIds((prev) => prev.filter((id) => id !== inv.id));
                          }
                        }}
                      />
                      <span className="text-sm flex-1 truncate">{inv.name}</span>
                      {alreadyLinkedElsewhere && (
                        <span className="text-[10px] text-orange-500 shrink-0 font-medium">linked to other goal</span>
                      )}
                      <span className="text-xs text-gray-400 shrink-0 font-mono">₹{inv.currentValue.toLocaleString('en-IN')}</span>
                    </label>
                  );
                })}
              </div>
              {goalLinkedInvIds.length > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  {goalLinkedInvIds.length} selected · ₹
                  {data.investments
                    .filter((inv: any) => goalLinkedInvIds.includes(inv.id))
                    .reduce((s: number, inv: any) => s + inv.currentValue, 0)
                    .toLocaleString('en-IN')}{' '}
                  linked
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end pt-3">
            <Button
              type="submit"
              kind="primary"
              renderIcon={Edit}
              disabled={!goalTitle || !goalCost || !goalDate || submittingGoal}
            >
              {submittingGoal ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Add Wishlist Item */}
      <Modal
        open={addWishModalOpen}
        modalHeading="Add Investment Wishlist Idea"
        passiveModal
        onRequestClose={() => setAddWishModalOpen(false)}
        size="sm"
      >
        <form onSubmit={handleAddWishlist} className="space-y-4 pt-2">
          <TextInput
            id="wish-name"
            labelText="Idea / Asset Name"
            placeholder="e.g. Tata Motors shares on dip, Gold ETF"
            value={wishName}
            onChange={(e) => setWishName(e.target.value)}
            required
            autoFocus
          />

          <TextInput
            id="wish-price"
            labelText="Target / Trigger Price (₹) (Optional)"
            type="number"
            placeholder="e.g. 850"
            value={wishTargetPrice}
            onChange={(e) => setWishTargetPrice(e.target.value)}
          />

          <TextInput
            id="wish-rationale"
            labelText="Rationale / Notes"
            placeholder="Buy when PE ratio drops below 18"
            value={wishRationale}
            onChange={(e) => setWishRationale(e.target.value)}
          />

          <Select
            id="wish-priority"
            labelText="Priority"
            value={wishPriority}
            onChange={(e) => setWishPriority(e.target.value)}
          >
            <SelectItem value="HIGH" text="High Priority" />
            <SelectItem value="MEDIUM" text="Medium Priority" />
            <SelectItem value="LOW" text="Low Priority" />
          </Select>

          <div className="flex justify-end pt-3">
            <Button
              type="submit"
              kind="primary"
              renderIcon={Add}
              disabled={!wishName || submittingWish}
            >
              {submittingWish ? 'Adding...' : 'Save to Wishlist'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 4: Quick Edit Holding */}
      <Modal
        open={!!updateValModal}
        modalHeading={`Edit: ${updateValModal?.name}`}
        primaryButtonText="Save Changes"
        secondaryButtonText="Cancel"
        onRequestClose={() => setUpdateValModal(null)}
        onRequestSubmit={handleUpdateValuation}
        size="sm"
      >
        <div className="pt-2 space-y-4">
          <TextInput
            id="update-val-input"
            labelText="Invested Amount (₹)"
            helperText="Current value will be set to the same amount"
            type="number"
            step="100"
            value={newValInput}
            onChange={(e) => setNewValInput(e.target.value)}
            autoFocus
          />
          <Select
            id="edit-type-input"
            labelText="Asset Type"
            value={editTypeInput}
            onChange={(e) => setEditTypeInput(e.target.value)}
          >
            <SelectItem value="MUTUAL_FUND" text="Mutual Fund" />
            <SelectItem value="STOCKS" text="Direct Stocks / ETF" />
            <SelectItem value="FD_RD" text="Fixed / Recurring Deposit" />
            <SelectItem value="GOLD" text="Gold (SGB, Digital, Physical)" />
            <SelectItem value="EPF_PPF" text="EPF & PPF" />
            <SelectItem value="NPS" text="National Pension Scheme (NPS)" />
            <SelectItem value="REAL_ESTATE" text="Real Estate & REIT" />
            <SelectItem value="CRYPTO" text="Crypto" />
            <SelectItem value="OTHER" text="Other Asset" />
          </Select>
        </div>
      </Modal>
    </AppLayout>
  );
}
