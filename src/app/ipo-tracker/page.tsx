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
  TextInput,
  Select,
  SelectItem,
  InlineNotification,
  DataTableSkeleton,
  Modal,
  Checkbox,
} from '@carbon/react';
import {
  UserMultiple,
  Add,
  ArrowUpRight,
  ArrowDownLeft,
  TrashCan,
  Money,
  CheckmarkFilled,
  Pending,
  CloseFilled,
  Wallet,
  Receipt,
  Edit,
} from '@carbon/icons-react';
import { formatINR, formatDateINR } from '@/lib/formatters';

export default function IpoTrackerPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [sellModalApp, setSellModalApp] = useState<any>(null);

  // Form states - Apply IPO
  const [ipoName, setIpoName] = useState('');
  const [ipoSymbol, setIpoSymbol] = useState('');
  const [sharesPerLot, setSharesPerLot] = useState('');
  const [bidPrice, setBidPrice] = useState('');
  const [lotsPerPerson, setLotsPerPerson] = useState('1');
  const [directAmountPerPerson, setDirectAmountPerPerson] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [submittingApply, setSubmittingApply] = useState(false);

  // Form states - Person (formerly Family Member)
  const [memberName, setMemberName] = useState('');
  const [memberPan, setMemberPan] = useState('');
  const [memberUpi, setMemberUpi] = useState('');
  const [submittingMember, setSubmittingMember] = useState(false);

  // Expanded ledger accordion per person
  const [expandedLedger, setExpandedLedger] = useState<Record<string, boolean>>({});

  // Collapsed IPO cards in Tab 1 (default all collapsed)
  const [expandedIpos, setExpandedIpos] = useState<Record<string, boolean>>({});
  const toggleIpo = (companyName: string) => setExpandedIpos(prev => ({ ...prev, [companyName]: !prev[companyName] }));

  // Drill-down: selected person in Fund & Profit Ledger
  const [selectedLedgerMember, setSelectedLedgerMember] = useState<any>(null);

  // Manual IPO club assignments: { companyName -> clubId (1,2,3…) }
  // Persisted in localStorage — initialised empty to avoid SSR/hydration mismatch;
  // real values are loaded from localStorage in a useEffect after mount.
  const ipoClubs = React.useRef<Record<string, number>>({});
  const [ipoClubsVersion, setIpoClubsVersion] = useState(0); // force re-render
  const [pendingClub, setPendingClub] = useState<string[]>([]); // IPOs selected for next club
  const [nextClubId, setNextClubId] = useState<number>(1);

  // Hydrate club state from localStorage after first client render
  useEffect(() => {
    try {
      const stored: Record<string, number> = JSON.parse(localStorage.getItem('ipo-clubs') || '{}');
      if (Object.keys(stored).length > 0) {
        ipoClubs.current = stored;
        const max = Object.values(stored).reduce((m, v) => Math.max(m, v), 0);
        setNextClubId(max + 1);
        setIpoClubsVersion(v => v + 1); // trigger re-render with loaded clubs
      }
    } catch { /* ignore */ }
  }, []);

  const saveClubs = (clubs: Record<string, number>) => {
    ipoClubs.current = clubs;
    localStorage.setItem('ipo-clubs', JSON.stringify(clubs));
    setIpoClubsVersion(v => v + 1);
  };

  const handleCompanyDoubleClick = (companyName: string) => {
    const currentClub = ipoClubs.current[companyName];
    if (currentClub !== undefined) {
      // Already clubbed: unclub it
      const updated = { ...ipoClubs.current };
      delete updated[companyName];
      saveClubs(updated);
      return;
    }
    // Add to pending selection
    setPendingClub(prev => {
      const next = prev.includes(companyName) ? prev.filter(n => n !== companyName) : [...prev, companyName];
      return next;
    });
  };

  const confirmClub = () => {
    if (pendingClub.length < 1) return;
    const clubId = nextClubId;
    const updated = { ...ipoClubs.current };
    pendingClub.forEach(name => { updated[name] = clubId; });
    saveClubs(updated);
    setNextClubId(clubId + 1);
    setPendingClub([]);
  };

  const clearAllClubs = () => {
    saveClubs({});
    setPendingClub([]);
    setNextClubId(1);
  };

  // Club colour palette (index = clubId % length)
  const CLUB_COLORS = [
    { border: 'border-blue-400',   bg: 'bg-blue-50',   header: 'bg-blue-800',   label: 'bg-blue-100 text-blue-800',   tag: 'CLUB A' },
    { border: 'border-purple-400', bg: 'bg-purple-50', header: 'bg-purple-800', label: 'bg-purple-100 text-purple-800', tag: 'CLUB B' },
    { border: 'border-amber-400',  bg: 'bg-amber-50',  header: 'bg-amber-800',  label: 'bg-amber-100 text-amber-800',  tag: 'CLUB C' },
    { border: 'border-teal-400',   bg: 'bg-teal-50',   header: 'bg-teal-800',   label: 'bg-teal-100 text-teal-800',    tag: 'CLUB D' },
    { border: 'border-rose-400',   bg: 'bg-rose-50',   header: 'bg-rose-800',   label: 'bg-rose-100 text-rose-800',    tag: 'CLUB E' },
  ];

  // Form states - Fund Transfer
  const [fundMemberId, setFundMemberId] = useState('');
  const [fundReceived, setFundReceived] = useState('');
  const [fundReturned, setFundReturned] = useState('');
  const [fundNotes, setFundNotes] = useState('');
  const [submittingFund, setSubmittingFund] = useState(false);

  // Inline add row in fund table
  const [inlineRowMemberId, setInlineRowMemberId] = useState('');
  const [inlineRowAmount, setInlineRowAmount] = useState('');
  const [inlineRowNotes, setInlineRowNotes] = useState('');
  const [submittingInlineRow, setSubmittingInlineRow] = useState(false);

  // Form states - Sell Execution
  const [sellPriceInput, setSellPriceInput] = useState('');
  const [submittingSell, setSubmittingSell] = useState(false);

  const fetchIpoData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ipo-tracker');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);

      // Pre-select all members for IPO application
      if (json.familyMembers?.length > 0 && selectedMemberIds.length === 0) {
        setSelectedMemberIds(json.familyMembers.map((m: any) => m.id));
      }
      if (json.familyMembers?.length > 0 && !fundMemberId) {
        setFundMemberId(json.familyMembers[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedMemberIds.length, fundMemberId]);

  useEffect(() => {
    fetchIpoData();
  }, [fetchIpoData]);

  // Apply for IPO (Multi-person batch)
  const handleApplyIpo = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasAmount = directAmountPerPerson || (bidPrice && sharesPerLot);
    if (!ipoName || !hasAmount || selectedMemberIds.length === 0) return;

    setSubmittingApply(true);
    setError(null);
    try {
      const res = await fetch('/api/ipo-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply-ipo',
          companyName: ipoName,
          symbol: ipoSymbol || null,
          sharesPerLot: sharesPerLot || undefined,
          bidPrice: bidPrice || undefined,
          lotsPerPerson,
          directAmountPerPerson: directAmountPerPerson || undefined,
          applicantMemberIds: selectedMemberIds,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error);

      setIpoName('');
      setIpoSymbol('');
      setSharesPerLot('');
      setBidPrice('');
      setDirectAmountPerPerson('');
      setApplyModalOpen(false);
      setSuccessMsg(`Applied for IPO across ${resJson.count} family members!`);
      setTimeout(() => setSuccessMsg(null), 3500);
      fetchIpoData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingApply(false);
    }
  };

  // Quick-add person inline from Apply IPO modal
  const handleQuickAddPerson = async () => {
    if (!memberName.trim()) return;
    setSubmittingMember(true);
    setError(null);
    try {
      const res = await fetch('/api/ipo-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-family-member',
          name: memberName.trim(),
          relation: 'Person',
          pan: memberPan || null,
          upiId: null,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error);
      // Auto-select the newly added person
      setSelectedMemberIds((prev) => [...prev, resJson.member.id]);
      setMemberName('');
      setMemberPan('');
      // Refresh the person list in the background
      const refreshRes = await fetch('/api/ipo-tracker');
      const refreshJson = await refreshRes.json();
      if (refreshRes.ok) setData(refreshJson);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingMember(false);
    }
  };

  // Add / Update PAN for existing person (modal)
  const [panMemberId, setPanMemberId] = useState('');
  const handleUpdatePan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!panMemberId) return;

    setSubmittingMember(true);
    setError(null);
    try {
      const res = await fetch('/api/ipo-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-member-pan',
          memberId: panMemberId,
          pan: memberPan,
          upiId: memberUpi,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error);

      setPanMemberId('');
      setMemberPan('');
      setMemberUpi('');
      setAddMemberModalOpen(false);
      setSuccessMsg('PAN details saved!');
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchIpoData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingMember(false);
    }
  };

  // Record Fund Transfer
  const handleRecordFund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundMemberId) return;

    setSubmittingFund(true);
    setError(null);
    try {
      const res = await fetch('/api/ipo-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record-fund-transfer',
          familyMemberId: fundMemberId,
          amountReceived: fundReceived || '0',
          amountReturned: fundReturned || '0',
          notes: fundNotes,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error);

      setFundReceived('');
      setFundReturned('');
      setFundNotes('');
      setFundModalOpen(false);
      setSuccessMsg('Fund transaction recorded in family ledger!');
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchIpoData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingFund(false);
    }
  };

  // Inline add money received row — accepts optional explicit memberId for detail-view use
  const handleInlineAddRow = async (overrideMemberId?: string) => {
    const memberId = overrideMemberId || inlineRowMemberId;
    if (!memberId || !inlineRowAmount) return;
    setSubmittingInlineRow(true);
    try {
      const res = await fetch('/api/ipo-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record-fund-transfer',
          familyMemberId: memberId,
          amountReceived: inlineRowAmount,
          amountReturned: '0',
          notes: inlineRowNotes || null,
        }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error); }
      setInlineRowAmount('');
      setInlineRowNotes('');
      fetchIpoData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingInlineRow(false);
    }
  };

  // Update Status (Allotted / Not Allotted / Refunded)
  const handleUpdateStatus = async (id: string, status: string, refundStatus?: string) => {
    try {
      const res = await fetch('/api/ipo-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-status',
          id,
          status,
          refundStatus,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error);
      }
      fetchIpoData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Record Sell Execution & PnL
  const handleRecordSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellModalApp || !sellPriceInput) return;

    setSubmittingSell(true);
    setError(null);
    try {
      const res = await fetch('/api/ipo-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record-sell',
          id: sellModalApp.id,
          sellPricePerShare: sellPriceInput,
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error);

      setSellModalApp(null);
      setSellPriceInput('');
      setSuccessMsg('Sell execution recorded and profit calculated!');
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchIpoData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingSell(false);
    }
  };

  // Delete Action
  const handleDelete = async (action: string, id: string) => {
    try {
      const res = await fetch('/api/ipo-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error);
      }
      fetchIpoData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const summary = data?.summary || {
    totalBlockedCapital: 0,
    totalAllottedCapital: 0,
    totalRealizedProfit: 0,
    totalRefundsPending: 0,
    totalApplicationsCount: 0,
    totalAllottedCount: 0,
  };

  const isProfitPositive = summary.totalRealizedProfit >= 0;

  return (
    <AppLayout>
      <div className="space-y-6 pt-2">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#161616]">Family IPO Tracker</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Multi-person family bidding matrix, allotment status, refunds & profit distribution
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              kind="primary"
              renderIcon={Add}
              onClick={() => setApplyModalOpen(true)}
            >
              Apply IPO
            </Button>
            <Button
              size="sm"
              kind="secondary"
              renderIcon={UserMultiple}
              onClick={() => setAddMemberModalOpen(true)}
            >
              + Add PAN
            </Button>
            <Button
              size="sm"
              kind="tertiary"
              renderIcon={Money}
              onClick={() => setFundModalOpen(true)}
            >
              Ledger Entry
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

        {/* 4 Key Summary Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile className="!p-4 bg-white border border-gray-200 shadow-sm rounded-lg">
            <div className="text-gray-500 text-xs font-medium">CURRENTLY BLOCKED CAPITAL</div>
            <div className="text-lg sm:text-2xl font-bold text-[#0f62fe] mt-2 font-mono">
              {formatINR(summary.totalBlockedCapital)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Pending allotment results</div>
          </Tile>

          <Tile className="!p-4 bg-white border border-gray-200 shadow-sm rounded-lg">
            <div className="text-gray-500 text-xs font-medium">TOTAL REALIZED PROFIT / P&L</div>
            <div className={`text-lg sm:text-2xl font-bold mt-2 font-mono ${isProfitPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isProfitPositive ? '+' : ''}{formatINR(summary.totalRealizedProfit)}
            </div>
            <div className="text-xs text-gray-500 mt-1">From sold IPO listings</div>
          </Tile>

          <Tile className="!p-4 bg-white border border-gray-200 shadow-sm rounded-lg">
            <div className="text-gray-500 text-xs font-medium">ALLOTTED APPLICATIONS</div>
            <div className="text-lg sm:text-2xl font-bold text-purple-600 mt-2 font-mono">
              {summary.totalAllottedCount} <span className="text-xs font-normal text-gray-500">/ {summary.totalApplicationsCount} bids</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Allotted Capital: <strong>{formatINR(summary.totalAllottedCapital)}</strong>
            </div>
          </Tile>

          <Tile className="!p-4 bg-white border border-gray-200 shadow-sm rounded-lg">
            <div className="text-gray-500 text-xs font-medium">UNBLOCK / REFUNDS DUE</div>
            <div className="text-lg sm:text-2xl font-bold text-orange-600 mt-2 font-mono">
              {formatINR(summary.totalRefundsPending)}
            </div>
            <div className="text-xs text-gray-500 mt-1">For unallotted applications</div>
          </Tile>
        </div>

        {/* Tabbed Views: Active Applications & Matrix, Family Profit Ledger */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <Tabs>
            <TabList aria-label="IPO Sections" fullWidth>
              <Tab>📋 All Applications & Bidding Matrix</Tab>
              <Tab>💰 Fund & Profit Ledger</Tab>
            </TabList>

            <TabPanels>
              {/* TAB 1: ALL APPLICATIONS */}
              <TabPanel>
                <div className="space-y-4 pt-4">
                  {/* ── CLUB TOOLBAR: shown when pending selection or any clubs exist ── */}
                  {(pendingClub.length > 0 || Object.keys(ipoClubs.current).length > 0) && (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-yellow-50 border border-yellow-300 rounded-lg text-sm">
                      {pendingClub.length > 0 ? (
                        <>
                          <span className="font-semibold text-yellow-800">
                            🔗 {pendingClub.length} IPO{pendingClub.length > 1 ? 's' : ''} selected for club
                          </span>
                          <span className="text-yellow-600 text-xs">— double-click more to add, then confirm</span>
                          <div className="ml-auto flex gap-2">
                            <button
                              onClick={confirmClub}
                              disabled={pendingClub.length < 2}
                              className="text-xs bg-yellow-500 hover:bg-yellow-600 disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded"
                            >
                              ✓ Confirm Club ({pendingClub.length})
                            </button>
                            <button
                              onClick={() => setPendingClub([])}
                              className="text-xs bg-white border border-yellow-400 text-yellow-700 hover:bg-yellow-100 font-medium px-3 py-1.5 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-gray-500 text-xs">
                            💡 Double-click any IPO header to start clubbing
                          </span>
                          <button
                            onClick={clearAllClubs}
                            className="ml-auto text-xs text-red-500 hover:text-red-700 underline font-medium"
                          >
                            Clear all clubs
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {loading ? (
                    <DataTableSkeleton columnCount={7} rowCount={5} />
                  ) : data?.applications?.length === 0 ? (
                    <div className="text-center py-12 text-sm text-gray-400 space-y-2">
                      <p>No IPO applications recorded yet.</p>
                      <Button size="sm" kind="primary" renderIcon={Add} onClick={() => setApplyModalOpen(true)}>
                        Apply for your first IPO
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* hint shown when no clubs yet */}
                      {Object.keys(ipoClubs.current).length === 0 && pendingClub.length === 0 && (
                        <p className="text-[11px] text-gray-400 text-right pr-1">
                          💡 Click an IPO to expand · Double-click to club by colour
                        </p>
                      )}
                      {(() => {
                        // Build per-company map sorted by applied date
                        const companyMap: Record<string, any[]> = {};
                        const companyOrder: string[] = [];
                        (data?.applications || []).forEach((app: any) => {
                          if (!companyMap[app.companyName]) {
                            companyMap[app.companyName] = [];
                            companyOrder.push(app.companyName);
                          }
                          companyMap[app.companyName].push(app);
                        });
                        companyOrder.sort((a, b) =>
                          new Date(companyMap[a][0]?.appliedAt).getTime() - new Date(companyMap[b][0]?.appliedAt).getTime()
                        );

                        return companyOrder.map((companyName, idx) => {
                          const apps = companyMap[companyName];
                          const firstApp = apps[0];
                          const groupTotal = apps.reduce((s: number, a: any) => s + a.totalBlocked, 0);
                          const allotted = apps.filter((a: any) => a.status === 'ALLOTTED').length;
                          const notAllotted = apps.filter((a: any) => a.status === 'NOT_ALLOTTED').length;
                          const applied = apps.filter((a: any) => a.status === 'APPLIED').length;

                          // Club state for this card
                          const clubId = ipoClubs.current[companyName];
                          const isPending = pendingClub.includes(companyName);
                          const clubColor = clubId !== undefined ? CLUB_COLORS[(clubId - 1) % CLUB_COLORS.length] : null;

                          // Card wrapper styles
                          let cardBorder = 'border border-gray-200';
                          let cardBg = '';
                          let headerBg = 'bg-[#161616]';
                          if (isPending) {
                            cardBorder = 'border-2 border-dashed border-yellow-400';
                            cardBg = 'bg-yellow-50/40';
                            headerBg = 'bg-yellow-700';
                          } else if (clubColor) {
                            cardBorder = `border-2 ${clubColor.border}`;
                            cardBg = clubColor.bg;
                            headerBg = clubColor.header;
                          }

                          const isExpanded = !!expandedIpos[companyName];

                          return (
                            <div
                              key={companyName}
                              className={`rounded-xl overflow-hidden ${cardBorder} ${cardBg} transition-all`}
                            >
                              {/* Company header bar — click to expand/collapse, double-click to club/unclub */}
                              <div
                                className={`px-4 py-2.5 flex items-center justify-between text-white ${headerBg} cursor-pointer select-none`}
                                onClick={() => toggleIpo(companyName)}
                                onDoubleClick={(e) => { e.stopPropagation(); handleCompanyDoubleClick(companyName); }}
                                title="Click to expand · Double-click to club / unclub"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-mono opacity-60">#{idx + 1}</span>
                                  {/* Expand/collapse chevron */}
                                  <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 opacity-60 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                  </svg>
                                  <span className="font-bold text-sm">{companyName}</span>
                                  {firstApp?.symbol && <span className="text-xs opacity-60">{firstApp.symbol}</span>}
                                  <span className="text-xs opacity-50">{formatDateINR(firstApp?.appliedAt)}</span>
                                  {/* Club badge */}
                                  {clubColor && (
                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${clubColor.label}`}>
                                      {clubColor.tag}
                                    </span>
                                  )}
                                  {isPending && (
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-900 animate-pulse">
                                      SELECTING…
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                  <span className="opacity-60">{apps.length} applicant{apps.length !== 1 ? 's' : ''}</span>
                                  {allotted > 0 && <span className="px-1.5 py-0.5 bg-green-700 rounded">{allotted} allotted</span>}
                                  {notAllotted > 0 && <span className="px-1.5 py-0.5 bg-black/30 rounded">{notAllotted} not allotted</span>}
                                  {applied > 0 && <span className="px-1.5 py-0.5 bg-blue-700 rounded">{applied} pending</span>}
                                  <span className="font-mono font-bold">Total: {formatINR(groupTotal)}</span>
                                </div>
                              </div>

                              {/* Applicant rows — only shown when expanded */}
                              {isExpanded && (
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className={`border-b text-[11px] font-semibold text-gray-500 uppercase tracking-wide ${clubColor ? clubColor.bg : 'bg-gray-50'} border-gray-200`}>
                                      <th className="py-2 px-4">Applicant</th>
                                      <th className="py-2 px-4 text-right">Blocked (₹)</th>
                                      <th className="py-2 px-4 text-center">Status</th>
                                      <th className="py-2 px-4 text-center">Refund</th>
                                      <th className="py-2 px-4 text-right">Realized P&L</th>
                                      <th className="py-2 px-4 text-center w-14">Del</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 text-sm">
                                    {apps.map((app: any) => {
                                      const isSold = app.realizedPnL !== null && app.realizedPnL !== undefined;
                                      const isPositive = (app.realizedPnL || 0) >= 0;
                                      return (
                                        <tr key={app.id} className="hover:bg-white/70 transition-colors">
                                          <td className="py-2.5 px-4">
                                            <span className="font-medium text-gray-800">{app.familyMember?.name}</span>
                                          </td>
                                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-gray-900">
                                            {formatINR(app.totalBlocked)}
                                          </td>
                                          <td className="py-2.5 px-4 text-center">
                                            <select
                                              value={app.status}
                                              onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                                              className={`text-xs font-semibold px-2 py-1 rounded border cursor-pointer ${
                                                app.status === 'ALLOTTED' ? 'bg-green-100 text-green-800 border-green-300'
                                                : app.status === 'NOT_ALLOTTED' ? 'bg-gray-100 text-gray-700 border-gray-300'
                                                : 'bg-blue-100 text-blue-800 border-blue-300'
                                              }`}
                                            >
                                              <option value="APPLIED">Applied</option>
                                              <option value="ALLOTTED">Allotted</option>
                                              <option value="NOT_ALLOTTED">Not Allotted</option>
                                              <option value="CANCELLED">Cancelled</option>
                                            </select>
                                          </td>
                                          <td className="py-2.5 px-4 text-center">
                                            {app.status === 'NOT_ALLOTTED' ? (
                                              <select
                                                value={app.refundStatus}
                                                onChange={(e) => handleUpdateStatus(app.id, app.status, e.target.value)}
                                                className={`text-[11px] px-2 py-0.5 rounded font-medium border ${
                                                  app.refundStatus === 'REFUNDED'
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-orange-50 text-orange-700 border-orange-200'
                                                }`}
                                              >
                                                <option value="PENDING">Pending</option>
                                                <option value="REFUNDED">Refunded</option>
                                              </select>
                                            ) : (
                                              <span className="text-xs text-gray-400">—</span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-4 text-right font-mono font-bold">
                                            {isSold ? (
                                              <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                                                {isPositive ? '+' : ''}{formatINR(app.realizedPnL)}
                                                <span className="block text-[10px] text-gray-400 font-normal">@ {formatINR(app.sellPricePerShare)}</span>
                                              </span>
                                            ) : app.status === 'ALLOTTED' ? (
                                              <button
                                                onClick={() => { setSellModalApp(app); setSellPriceInput(''); }}
                                                className="text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold px-2 py-1 rounded border border-purple-200"
                                              >
                                                Record Sell
                                              </button>
                                            ) : (
                                              <span className="text-xs text-gray-400">—</span>
                                            )}
                                          </td>
                                          <td className="py-2.5 px-4 text-center">
                                            <Button hasIconOnly renderIcon={TrashCan} iconDescription="Delete" kind="ghost" size="sm"
                                              onClick={() => handleDelete('delete-application', app.id)} />
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot>
                                    <tr className="border-t border-gray-200 text-xs font-semibold bg-white/50">
                                      <td className="py-1.5 px-4 text-gray-500">{apps.length} applicant{apps.length !== 1 ? 's' : ''}</td>
                                      <td className="py-1.5 px-4 text-right font-mono font-bold text-gray-900">{formatINR(groupTotal)}</td>
                                      <td colSpan={4} className="py-1.5 px-4 text-gray-400">
                                        {allotted > 0 ? `${allotted} allotted` : notAllotted > 0 ? 'None allotted' : `${applied} pending`}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </TabPanel>

              {/* TAB 2: FUND & PROFIT LEDGER */}
              <TabPanel>
                {(() => {
                  // Deduplicate: hide "Self" if there's also a non-Self member with data (user added themselves by name)
                  const allLedgers: any[] = data?.memberLedgers || [];
                  const hasNonSelf = allLedgers.some((m: any) => m.name.toLowerCase() !== 'self');
                  const visibleLedgers = allLedgers.filter((m: any) =>
                    hasNonSelf ? m.name.toLowerCase() !== 'self' : true
                  );

                  // ── PERSON DETAIL VIEW ──
                  if (selectedLedgerMember) {
                    const m = visibleLedgers.find((lm: any) => lm.id === selectedLedgerMember.id) || selectedLedgerMember;
                    const pending = Math.max(0, m.fundsReceived - m.fundsReturned);
                    const hasPending = pending > 0;
                    const txns = (m.transactions || [])
                      .filter((t: any) => t.amountReceived > 0)
                      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

                    return (
                      <div className="space-y-4 pt-3">
                        {/* Back navbar */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setSelectedLedgerMember(null)}
                            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to all people
                          </button>
                          <span className="text-gray-300">|</span>
                          {/* Prev / Next navigation */}
                          {(() => {
                            const idx = visibleLedgers.findIndex((lm: any) => lm.id === selectedLedgerMember.id);
                            const prev = visibleLedgers[idx - 1];
                            const next = visibleLedgers[idx + 1];
                            return (
                              <>
                                <button
                                  disabled={!prev}
                                  onClick={() => prev && setSelectedLedgerMember(prev)}
                                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                  </svg>
                                  {prev ? prev.name : 'Prev'}
                                </button>
                                <span className="text-gray-300 text-xs">·</span>
                                <button
                                  disabled={!next}
                                  onClick={() => next && setSelectedLedgerMember(next)}
                                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
                                >
                                  {next ? next.name : 'Next'}
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </>
                            );
                          })()}
                        </div>

                        {/* Person header */}
                        <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{m.name}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {m.pan ? (
                                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{m.pan}</span>
                              ) : (
                                <button
                                  onClick={() => { setPanMemberId(m.id); setMemberPan(''); setMemberUpi(m.upiId || ''); setAddMemberModalOpen(true); }}
                                  className="text-xs text-blue-500 hover:underline"
                                >+ add PAN</button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-xs text-gray-500">Given</div>
                              <div className="font-mono font-bold text-gray-900">{m.fundsReceived > 0 ? m.fundsReceived.toLocaleString('en-IN') : '—'}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-500">Returned</div>
                              <div className="font-mono font-bold text-gray-600">{m.fundsReturned > 0 ? m.fundsReturned.toLocaleString('en-IN') : '—'}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-gray-500">Pending</div>
                              <div className={`font-mono font-bold text-base ${hasPending ? 'text-red-600' : 'text-green-600'}`}>
                                {hasPending ? pending.toLocaleString('en-IN') : '✓ settled'}
                              </div>
                            </div>
                            <button
                              onClick={() => { setFundMemberId(m.id); setFundModalOpen(true); }}
                              className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded hover:bg-blue-700 font-medium whitespace-nowrap"
                            >
                              + Return Money
                            </button>
                          </div>
                        </div>

                        {/* Quick add entry for this person */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">💰 Record Money Received</p>
                          <div className="flex flex-wrap gap-2 items-end">
                            <div className="flex flex-col gap-1">
                              <label className="text-[11px] text-gray-600 font-medium">Amount (₹)</label>
                              <input
                                type="number"
                                placeholder="e.g. 15000"
                                value={inlineRowAmount}
                                onChange={(e) => setInlineRowAmount(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInlineAddRow(m.id); } }}
                                className="text-right text-sm font-mono border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500 bg-white w-36"
                              />
                            </div>
                            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                              <label className="text-[11px] text-gray-600 font-medium">Note (optional)</label>
                              <input
                                type="text"
                                placeholder="e.g. For Swiggy IPO"
                                value={inlineRowNotes}
                                onChange={(e) => setInlineRowNotes(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInlineAddRow(m.id); } }}
                                className="text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500 bg-white"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleInlineAddRow(m.id)}
                              disabled={!inlineRowAmount || submittingInlineRow}
                              className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-40 font-semibold self-end"
                            >
                              {submittingInlineRow ? 'Saving…' : '+ Record'}
                            </button>
                          </div>
                        </div>

                        {/* Transaction log for this person */}
                        <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Money Received Log — {m.name}
                          </div>
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="bg-[#1e3a5f] text-white text-xs font-semibold uppercase tracking-wide">
                                <th className="py-2.5 px-4">Date</th>
                                <th className="py-2.5 px-4">Note</th>
                                <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {txns.length === 0 ? (
                                <tr>
                                  <td colSpan={3} className="py-8 text-center text-xs text-gray-400">
                                    No entries yet — use the form above to record the first payment.
                                  </td>
                                </tr>
                              ) : (
                                txns.map((t: any, i: number) => (
                                  <tr key={t.id} className={`border-t border-gray-200 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'} hover:bg-blue-50/30`}>
                                    <td className="py-2 px-4 text-xs text-gray-500 font-mono whitespace-nowrap">
                                      {new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="py-2 px-4 text-gray-700">{t.notes || <span className="text-gray-300">—</span>}</td>
                                    <td className="py-2 px-4 text-right font-mono font-semibold text-gray-900">
                                      {t.amountReceived.toLocaleString('en-IN')}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                            {txns.length > 0 && (
                              <tfoot>
                                <tr className="bg-[#d4edda] border-t-2 border-green-400 text-sm font-bold">
                                  <td colSpan={2} className="py-2.5 px-4 text-gray-700">Total Given</td>
                                  <td className="py-2.5 px-4 text-right font-mono text-green-800">{m.fundsReceived.toLocaleString('en-IN')}</td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>
                    );
                  }

                  // ── PERSON TABLE VIEW (default) ──
                  return (
                    <div className="space-y-5 pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-bold text-gray-900">IPO Money Tracker — Who Gave What</h3>
                          <p className="text-xs text-gray-500 mt-0.5">Record every amount your parents / family gave you for IPO applications. Click a name to see full details.</p>
                        </div>
                      </div>

                      {/* ── QUICK ENTRY CARD ── */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-3">💰 Record Money Received from a Person</p>
                        <div className="flex flex-wrap gap-2 items-end">
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] text-gray-600 font-medium">Person</label>
                            <select
                              value={inlineRowMemberId}
                              onChange={(e) => setInlineRowMemberId(e.target.value)}
                              className="text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500 bg-white min-w-[140px]"
                            >
                              <option value="">— Select —</option>
                              {visibleLedgers.map((m: any) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[11px] text-gray-600 font-medium">Amount (₹)</label>
                            <input
                              type="number"
                              placeholder="e.g. 15000"
                              value={inlineRowAmount}
                              onChange={(e) => setInlineRowAmount(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInlineAddRow(); } }}
                              className="text-right text-sm font-mono border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500 bg-white w-36"
                            />
                          </div>
                          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                            <label className="text-[11px] text-gray-600 font-medium">Note (optional)</label>
                            <input
                              type="text"
                              placeholder="e.g. For Swiggy IPO"
                              value={inlineRowNotes}
                              onChange={(e) => setInlineRowNotes(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleInlineAddRow(); } }}
                              className="text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500 bg-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleInlineAddRow()}
                            disabled={!inlineRowMemberId || !inlineRowAmount || submittingInlineRow}
                            className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-40 font-semibold flex items-center gap-1.5 self-end"
                          >
                            {submittingInlineRow ? 'Saving…' : '+ Record'}
                          </button>
                        </div>
                      </div>

                      {/* ── PER-PERSON SUMMARY TABLE ── */}
                      <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          Per-Person Summary
                        </div>
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="bg-[#1e3a5f] text-white text-xs font-semibold uppercase tracking-wide">
                              <th className="py-2.5 px-4 border-r border-blue-800">Person</th>
                              <th className="py-2.5 px-4 text-right border-r border-blue-800">Tot Amt Given</th>
                              <th className="py-2.5 px-4 text-right border-r border-blue-800">Received Back</th>
                              <th className="py-2.5 px-4 text-right border-r border-blue-800">Pending</th>
                              <th className="py-2.5 px-4 text-center w-28">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleLedgers.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-10 text-center text-xs text-gray-400">
                                  No entries yet — use the form above to record the first payment.
                                </td>
                              </tr>
                            ) : (
                              visibleLedgers.map((m: any, i: number) => {
                                const pending = Math.max(0, m.fundsReceived - m.fundsReturned);
                                const hasPending = pending > 0;
                                return (
                                  <tr
                                    key={m.id}
                                    className={`border-t border-gray-200 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/20 cursor-pointer`}
                                    onClick={() => setSelectedLedgerMember(m)}
                                  >
                                    <td className="py-2.5 px-4 border-r border-gray-200">
                                      <span className="font-semibold text-blue-700 hover:underline">{m.name}</span>
                                      {m.pan && (
                                        <span className="ml-2 text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{m.pan}</span>
                                      )}
                                      {!m.pan && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setPanMemberId(m.id); setMemberPan(''); setMemberUpi(m.upiId || ''); setAddMemberModalOpen(true); }}
                                          className="ml-2 text-[10px] text-blue-500 hover:underline"
                                        >+ add PAN</button>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-gray-900 border-r border-gray-200">
                                      {m.fundsReceived > 0 ? m.fundsReceived.toLocaleString('en-IN') : <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className="py-2.5 px-4 text-right font-mono text-gray-600 border-r border-gray-200">
                                      {m.fundsReturned > 0 ? m.fundsReturned.toLocaleString('en-IN') : <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className={`py-2.5 px-4 text-right font-mono font-bold border-r border-gray-200 ${hasPending ? 'text-red-600' : 'text-green-600'}`}>
                                      {hasPending ? pending.toLocaleString('en-IN') : '✓ settled'}
                                    </td>
                                    <td className="py-2.5 px-4 text-center">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setFundMemberId(m.id); setFundModalOpen(true); }}
                                        className="text-[11px] bg-gray-800 text-white px-2.5 py-1 rounded hover:bg-blue-700 font-medium whitespace-nowrap"
                                      >
                                        + Return
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="bg-[#d4edda] border-t-2 border-green-400 text-sm font-bold">
                              <td colSpan={2} className="py-3 px-4 text-gray-700 border-r border-green-300">
                                Total IPO Amt Received
                              </td>
                              <td colSpan={3} className="py-3 px-4 text-right font-mono text-green-800 text-base">
                                {visibleLedgers.reduce((s: number, m: any) => s + m.fundsReceived, 0).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>
      </div>

      {/* Modal 1: Apply for IPO (Multi-person) */}
      <Modal
        open={applyModalOpen}
        modalHeading="Apply for IPO"
        passiveModal
        onRequestClose={() => { setApplyModalOpen(false); setIpoName(''); setIpoSymbol(''); setSharesPerLot(''); setBidPrice(''); setDirectAmountPerPerson(''); }}
        size="md"
      >
        <form onSubmit={handleApplyIpo} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              id="ipo-name"
              labelText="IPO Company Name"
              placeholder="e.g. Swiggy Ltd, Tata Tech"
              value={ipoName}
              onChange={(e) => setIpoName(e.target.value)}
              required
              autoFocus
            />
            <TextInput
              id="ipo-symbol"
              labelText="NSE / BSE Symbol (Optional)"
              placeholder="e.g. SWIGGY"
              value={ipoSymbol}
              onChange={(e) => setIpoSymbol(e.target.value)}
            />
          </div>

          {/* Amount entry — direct OR via shares × price */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount Blocked Per Person</p>
            <TextInput
              id="ipo-direct-amount"
              labelText="Enter Amount Directly (₹) — fill this OR use shares × price below"
              type="number"
              step="1"
              placeholder="e.g. 14973"
              value={directAmountPerPerson}
              onChange={(e) => { setDirectAmountPerPerson(e.target.value); if (e.target.value) { setSharesPerLot(''); setBidPrice(''); } }}
            />
            <div className="grid grid-cols-3 gap-3">
              <TextInput
                id="ipo-shares"
                labelText="Shares Per Lot"
                type="number"
                placeholder="e.g. 35"
                value={sharesPerLot}
                onChange={(e) => { setSharesPerLot(e.target.value); if (e.target.value) setDirectAmountPerPerson(''); }}
              />
              <TextInput
                id="ipo-bid"
                labelText="Cut-off Price (₹)"
                type="number"
                placeholder="e.g. 428"
                value={bidPrice}
                onChange={(e) => { setBidPrice(e.target.value); if (e.target.value) setDirectAmountPerPerson(''); }}
              />
              <TextInput
                id="ipo-lots"
                labelText="Lots Per Person"
                type="number"
                placeholder="1"
                value={lotsPerPerson}
                onChange={(e) => setLotsPerPerson(e.target.value)}
              />
            </div>
            {/* Live preview */}
            <div className="flex justify-between items-center text-xs font-mono bg-blue-50 border border-blue-200 rounded px-3 py-2 text-blue-900">
              <span>Blocked per person:</span>
              <strong className="text-sm">
                {directAmountPerPerson
                  ? formatINR(parseFloat(directAmountPerPerson) || 0)
                  : formatINR((parseInt(lotsPerPerson) || 1) * (parseInt(sharesPerLot) || 0) * (parseFloat(bidPrice) || 0))
                }
              </strong>
            </div>
          </div>

          {/* Select Applicants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700">
                Select Applicants ({selectedMemberIds.length} selected):
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 border border-gray-200 rounded-t bg-gray-50">
              {data?.familyMembers?.map((m: any) => {
                const isChecked = selectedMemberIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className="flex items-center space-x-2 text-xs p-1.5 bg-white rounded border border-gray-200 cursor-pointer hover:bg-blue-50"
                  >
                    <input
                      type="checkbox"
                      className="accent-blue-600"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMemberIds((prev) => [...prev, m.id]);
                        } else {
                          setSelectedMemberIds((prev) => prev.filter((id) => id !== m.id));
                        }
                      }}
                    />
                    <div>
                      <span className="font-medium text-gray-900 block truncate">{m.name}</span>
                      {m.pan && <span className="text-[10px] text-gray-400 font-mono">{m.pan}</span>}
                    </div>
                  </label>
                );
              })}
            </div>
            {/* Inline quick-add person row */}
            <div className="flex items-center gap-2 border border-t-0 border-gray-200 rounded-b bg-white px-2 py-2">
              <input
                type="text"
                placeholder="+ Add new person name (e.g. Babu)"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (memberName.trim()) handleQuickAddPerson(); } }}
                className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
              />
              <input
                type="text"
                placeholder="PAN (optional)"
                value={memberPan}
                onChange={(e) => setMemberPan(e.target.value.toUpperCase())}
                className="w-28 text-xs border border-gray-200 rounded px-2 py-1.5 font-mono focus:outline-none focus:border-blue-400 uppercase"
                maxLength={10}
              />
              <button
                type="button"
                onClick={handleQuickAddPerson}
                disabled={!memberName.trim() || submittingMember}
                className="text-xs bg-gray-800 text-white px-2.5 py-1.5 rounded hover:bg-blue-700 disabled:opacity-40 shrink-0 font-medium"
              >
                {submittingMember ? '...' : '+ Add'}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <Button
              type="submit"
              kind="primary"
              renderIcon={Add}
              disabled={!ipoName || selectedMemberIds.length === 0 || submittingApply || (!directAmountPerPerson && !(bidPrice && sharesPerLot))}
            >
              {submittingApply ? 'Applying...' : `Apply for ${selectedMemberIds.length} Person${selectedMemberIds.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Add / Update PAN */}
      <Modal
        open={addMemberModalOpen}
        modalHeading="Add / Update PAN Details"
        passiveModal
        onRequestClose={() => { setAddMemberModalOpen(false); setPanMemberId(''); setMemberPan(''); setMemberUpi(''); }}
        size="sm"
      >
        <form onSubmit={handleUpdatePan} className="space-y-4 pt-2">
          <p className="text-xs text-gray-500">
            Select an existing person and enter their PAN &amp; UPI. This updates their details without creating a duplicate.
          </p>

          <Select
            id="pan-member"
            labelText="Person"
            value={panMemberId}
            onChange={(e) => {
              const m = data?.familyMembers?.find((f: any) => f.id === e.target.value);
              setPanMemberId(e.target.value);
              setMemberPan(m?.pan || '');
              setMemberUpi(m?.upiId || '');
            }}
            required
          >
            <SelectItem value="" text="— Select person —" />
            {(data?.familyMembers || []).map((m: any) => (
              <SelectItem key={m.id} value={m.id} text={`${m.name}${m.pan ? ' · ' + m.pan : ' · no PAN'}`} />
            ))}
          </Select>

          <TextInput
            id="pan-number"
            labelText="PAN Number"
            placeholder="e.g. ABCDE1234F"
            value={memberPan}
            onChange={(e) => setMemberPan(e.target.value.toUpperCase())}
            maxLength={10}
            autoFocus
          />

          <TextInput
            id="pan-upi"
            labelText="UPI ID / Bank Account (Optional)"
            placeholder="e.g. babu@upi or SBI xxxxxx"
            value={memberUpi}
            onChange={(e) => setMemberUpi(e.target.value)}
          />

          <div className="flex justify-end pt-3">
            <Button
              type="submit"
              kind="primary"
              renderIcon={Add}
              disabled={!panMemberId || submittingMember}
            >
              {submittingMember ? 'Saving...' : 'Save PAN Details'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Fund Transfer Ledger Entry */}
      <Modal
        open={fundModalOpen}
        modalHeading="Record Money In / Out"
        passiveModal
        onRequestClose={() => setFundModalOpen(false)}
        size="sm"
      >
        <form onSubmit={handleRecordFund} className="space-y-4 pt-2">
          <Select
            id="fund-member"
            labelText="Person"
            value={fundMemberId}
            onChange={(e) => setFundMemberId(e.target.value)}
            required
          >
            {data?.familyMembers?.map((m: any) => (
              <SelectItem key={m.id} value={m.id} text={m.name} />
            ))}
          </Select>

          <TextInput
            id="fund-received"
            labelText="Money Received from this Person (₹)"
            type="number"
            placeholder="e.g. 15000"
            value={fundReceived}
            onChange={(e) => setFundReceived(e.target.value)}
          />

          <TextInput
            id="fund-returned"
            labelText="Money Returned / Distributed to Member (₹)"
            type="number"
            placeholder="e.g. 21500"
            value={fundReturned}
            onChange={(e) => setFundReturned(e.target.value)}
          />

          <TextInput
            id="fund-notes"
            labelText="Notes"
            placeholder="e.g. Tata Tech profit distributed via UPI"
            value={fundNotes}
            onChange={(e) => setFundNotes(e.target.value)}
          />

          <div className="flex justify-end pt-3">
            <Button
              type="submit"
              kind="primary"
              renderIcon={Money}
              disabled={(!fundReceived && !fundReturned) || submittingFund}
            >
              {submittingFund ? 'Saving...' : 'Save Ledger Entry'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 4: Record Sell Execution */}
      <Modal
        open={!!sellModalApp}
        modalHeading={`Record Listing Sell: ${sellModalApp?.companyName}`}
        passiveModal
        onRequestClose={() => setSellModalApp(null)}
        size="sm"
      >
        <form onSubmit={handleRecordSell} className="space-y-4 pt-2">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs space-y-1">
            <div className="flex justify-between">
              <span>Applicant:</span>
              <strong className="text-gray-900">{sellModalApp?.familyMember?.name}</strong>
            </div>
            <div className="flex justify-between">
              <span>Shares Allotted:</span>
              <strong className="font-mono">{sellModalApp?.sharesPerLot * (sellModalApp?.allottedLots || 1)} shares</strong>
            </div>
            <div className="flex justify-between">
              <span>Issue Bid Price:</span>
              <strong className="font-mono">{formatINR(sellModalApp?.bidPrice)}</strong>
            </div>
          </div>

          <TextInput
            id="sell-price"
            labelText="Selling / Listing Price Per Share (₹)"
            type="number"
            step="0.05"
            placeholder="e.g. 1450.00"
            value={sellPriceInput}
            onChange={(e) => setSellPriceInput(e.target.value)}
            required
            autoFocus
          />

          {sellPriceInput && (
            <div className="p-3 bg-green-50 border border-green-200 rounded text-xs space-y-1">
              {(() => {
                const totalShares = sellModalApp?.sharesPerLot * (sellModalApp?.allottedLots || 1);
                const cost = totalShares * sellModalApp?.bidPrice;
                const realized = totalShares * parseFloat(sellPriceInput);
                const pnl = realized - cost;
                return (
                  <>
                    <div className="flex justify-between">
                      <span>Total Realized Value:</span>
                      <strong className="font-mono text-gray-900">{formatINR(realized)}</strong>
                    </div>
                    <div className="flex justify-between font-bold text-green-700">
                      <span>Net Profit / Gain:</span>
                      <strong className="font-mono text-sm">{formatINR(pnl)}</strong>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <div className="flex justify-end pt-3">
            <Button
              type="submit"
              kind="primary"
              renderIcon={Money}
              disabled={!sellPriceInput || submittingSell}
            >
              {submittingSell ? 'Calculating...' : 'Save Sell & Realize P&L'}
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
