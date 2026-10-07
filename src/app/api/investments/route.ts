import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculateGoalMetrics } from '@/lib/goalsCalculator';

// Color map for asset types
const ASSET_TYPE_COLORS: Record<string, string> = {
  MUTUAL_FUND: '#0f62fe',
  STOCKS: '#0072c3',
  FD_RD: '#1192e8',
  GOLD: '#f1c21b',
  EPF_PPF: '#24a148',
  NPS: '#009d9a',
  REAL_ESTATE: '#8a3ffc',
  CRYPTO: '#ff832b',
  OTHER: '#8d8d8d',
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  MUTUAL_FUND: 'Mutual Funds',
  STOCKS: 'Direct Stocks',
  FD_RD: 'Fixed / Recurring Deposit',
  GOLD: 'Gold (SGB & Physical)',
  EPF_PPF: 'EPF & PPF',
  NPS: 'National Pension Scheme',
  REAL_ESTATE: 'Real Estate & REIT',
  CRYPTO: 'Crypto',
  OTHER: 'Other Assets',
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;

    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      if (!defaultUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      userId = defaultUser.id;
    }

    // 1. Fetch Investments
    const investments = await prisma.investment.findMany({
      where: { userId },
      include: {
        account: true,
        goal: true,
      },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    });

    // 2. Fetch Goals
    const goals = await prisma.goal.findMany({
      where: { userId },
      include: {
        linkedInvestments: true,
      },
      orderBy: { targetDate: 'asc' },
    });

    // 3. Fetch Wishlist Items
    const wishlist = await prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate Portfolio Summaries
    const totalInvested = investments.reduce((acc, inv) => acc + inv.investedAmount, 0);
    const totalCurrentValue = investments.reduce((acc, inv) => acc + inv.currentValue, 0);
    const totalAbsoluteGain = totalCurrentValue - totalInvested;
    const totalReturnsPercentage =
      totalInvested > 0 ? (totalAbsoluteGain / totalInvested) * 100 : 0;

    // Aggregate by Asset Type
    const assetTypeMap: Record<string, { type: string; label: string; invested: number; value: number; color: string; count: number }> = {};

    investments.forEach((inv) => {
      const type = inv.type || 'OTHER';
      if (!assetTypeMap[type]) {
        assetTypeMap[type] = {
          type,
          label: ASSET_TYPE_LABELS[type] || type,
          invested: 0,
          value: 0,
          color: ASSET_TYPE_COLORS[type] || '#8d8d8d',
          count: 0,
        };
      }
      assetTypeMap[type].invested += inv.investedAmount;
      assetTypeMap[type].value += inv.currentValue;
      assetTypeMap[type].count += 1;
    });

    const assetAllocation = Object.values(assetTypeMap).map((item) => ({
      ...item,
      percentage: totalCurrentValue > 0 ? (item.value / totalCurrentValue) * 100 : 0,
      gain: item.value - item.invested,
      returnsPercent: item.invested > 0 ? ((item.value - item.invested) / item.invested) * 100 : 0,
    })).sort((a, b) => b.value - a.value);

    // Calculate Goal Progress & Metrics
    const goalsWithMetrics = goals.map((g) => {
      const linkedSaved = g.linkedInvestments.reduce((acc, inv) => acc + inv.currentValue, 0);
      const manualSaved = g.currentSavedAmount ?? 0;
      // Total saved = manual cash saved + linked investment value combined
      const totalSaved = linkedSaved + manualSaved;
      const metrics = calculateGoalMetrics({
        targetCost: g.targetCost,
        targetDate: g.targetDate,
        downPaymentPercent: g.downPaymentPercent ?? undefined,
        expectedLoanTenureMonths: g.expectedLoanTenure ?? undefined,
        expectedAnnualInterestRate: g.expectedInterestRate ?? undefined,
        currentSavedAmount: totalSaved,
      });

      return {
        ...g,
        metrics,
        linkedSaved,
        manualSaved,
        totalSaved,
      };
    });

    const accounts = await prisma.account.findMany({
      where: { userId, isActive: true },
    });

    return NextResponse.json({
      summary: {
        totalInvested,
        totalCurrentValue,
        totalAbsoluteGain,
        totalReturnsPercentage,
        holdingsCount: investments.length,
      },
      assetAllocation,
      investments,
      goals: goalsWithMetrics,
      wishlist,
      accounts,
    });
  } catch (error: any) {
    console.error('Investments GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add new Investment, Goal, or Wishlist item
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;

    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      if (!defaultUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      userId = defaultUser.id;
    }

    const body = await req.json();
    const { action } = body;

    // 1. ADD INVESTMENT
    if (action === 'add-investment') {
      const { name, savingType, type, investedAmount, currentValue, accountId, goalId, notes } = body;
      if (!name || investedAmount === undefined) {
        return NextResponse.json({ error: 'Name and invested amount are required' }, { status: 400 });
      }

      const lastInv = await prisma.investment.findFirst({
        where: { userId },
        orderBy: { orderIndex: 'desc' },
      });
      const orderIndex = (lastInv?.orderIndex ?? -1) + 1;

      const investment = await prisma.investment.create({
        data: {
          userId,
          name,
          savingType: savingType || null,
          type: type || 'MUTUAL_FUND',
          investedAmount: parseFloat(investedAmount),
          currentValue: currentValue !== undefined && currentValue !== '' ? parseFloat(currentValue) : parseFloat(investedAmount),
          accountId: accountId || null,
          goalId: goalId || null,
          notes: notes || null,
          orderIndex,
        },
      });

      return NextResponse.json({ success: true, investment });
    }

    // UPDATE INVESTMENT DETAILS (INCLUDING SAVING TYPE)
    if (action === 'update-investment') {
      const { id, name, savingType, type, investedAmount, currentValue, goalId } = body;
      const updated = await prisma.investment.update({
        where: { id },
        data: {
          ...(name ? { name } : {}),
          savingType: savingType !== undefined ? savingType : undefined,
          ...(type ? { type } : {}),
          ...(investedAmount !== undefined ? { investedAmount: parseFloat(investedAmount) } : {}),
          ...(currentValue !== undefined ? { currentValue: parseFloat(currentValue) } : {}),
          goalId: goalId !== undefined ? (goalId || null) : undefined,
        },
      });
      return NextResponse.json({ success: true, investment: updated });
    }

    // REORDER / MOVE HOLDING (BACK AND FORTH)
    if (action === 'reorder-investment') {
      const { id, direction } = body; // 'up' | 'down'
      const current = await prisma.investment.findUnique({ where: { id } });
      if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const all = await prisma.investment.findMany({
        where: { userId },
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
      });

      const currentIndex = all.findIndex((i) => i.id === id);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex >= 0 && targetIndex < all.length) {
        const target = all[targetIndex];
        const tempOrder = current.orderIndex;
        await prisma.$transaction([
          prisma.investment.update({
            where: { id: current.id },
            data: { orderIndex: target.orderIndex },
          }),
          prisma.investment.update({
            where: { id: target.id },
            data: { orderIndex: tempOrder },
          }),
        ]);
      }
      return NextResponse.json({ success: true });
    }

    // 2. ADD GOAL
    if (action === 'add-goal') {
      const { title, category, targetCost, targetDate, downPaymentPercent, expectedLoanTenure, expectedInterestRate, currentSavedAmount, linkedInvestmentIds } = body;
      if (!title || !targetCost || !targetDate) {
        return NextResponse.json({ error: 'Title, target cost and target date are required' }, { status: 400 });
      }

      const goal = await prisma.goal.create({
        data: {
          userId,
          title,
          category: category || 'OTHER',
          targetCost: parseFloat(targetCost),
          targetDate: new Date(targetDate),
          downPaymentPercent: downPaymentPercent !== undefined && downPaymentPercent !== '' ? parseFloat(downPaymentPercent) : null,
          expectedLoanTenure: expectedLoanTenure && expectedLoanTenure !== '' ? parseInt(expectedLoanTenure) : null,
          expectedInterestRate: expectedInterestRate && expectedInterestRate !== '' ? parseFloat(expectedInterestRate) : null,
          currentSavedAmount: currentSavedAmount && currentSavedAmount !== '' ? parseFloat(currentSavedAmount) : 0,
        },
      });

      // Link selected investments to this goal
      if (Array.isArray(linkedInvestmentIds) && linkedInvestmentIds.length > 0) {
        await prisma.investment.updateMany({
          where: { id: { in: linkedInvestmentIds }, userId },
          data: { goalId: goal.id },
        });
      }

      return NextResponse.json({ success: true, goal });
    }

    // 3. ADD WISHLIST ITEM
    if (action === 'add-wishlist') {
      const { name, targetPrice, rationale, priority } = body;
      if (!name) {
        return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
      }

      const item = await prisma.wishlistItem.create({
        data: {
          userId,
          name,
          targetPrice: targetPrice ? parseFloat(targetPrice) : null,
          rationale: rationale || null,
          priority: priority || 'MEDIUM',
        },
      });

      return NextResponse.json({ success: true, item });
    }

    // 4. UPDATE INVESTMENT VALUE QUICK ACTION
    if (action === 'update-investment-value') {
      const { id, currentValue } = body;
      const updated = await prisma.investment.update({
        where: { id },
        data: { currentValue: parseFloat(currentValue) },
      });
      return NextResponse.json({ success: true, investment: updated });
    }

    // 5. TOGGLE WISHLIST FULFILLED
    if (action === 'toggle-wishlist') {
      const { id, isFulfilled } = body;
      const updated = await prisma.wishlistItem.update({
        where: { id },
        data: { isFulfilled: Boolean(isFulfilled) },
      });
      return NextResponse.json({ success: true, item: updated });
    }

    // 5b. UPDATE GOAL
    if (action === 'update-goal') {
      const { id, title, category, targetCost, targetDate, downPaymentPercent, expectedLoanTenure, expectedInterestRate, currentSavedAmount, linkedInvestmentIds } = body;
      if (!id) return NextResponse.json({ error: 'Goal id is required' }, { status: 400 });

      await prisma.goal.update({
        where: { id },
        data: {
          ...(title ? { title } : {}),
          ...(category ? { category } : {}),
          ...(targetCost !== undefined && targetCost !== '' ? { targetCost: parseFloat(targetCost) } : {}),
          ...(targetDate ? { targetDate: new Date(targetDate) } : {}),
          downPaymentPercent: downPaymentPercent !== undefined && downPaymentPercent !== '' ? parseFloat(downPaymentPercent) : null,
          expectedLoanTenure: expectedLoanTenure && expectedLoanTenure !== '' ? parseInt(expectedLoanTenure) : null,
          expectedInterestRate: expectedInterestRate && expectedInterestRate !== '' ? parseFloat(expectedInterestRate) : null,
          currentSavedAmount: currentSavedAmount !== undefined && currentSavedAmount !== '' ? parseFloat(currentSavedAmount) : 0,
        },
      });

      // Re-link investments: first unlink all investments currently linked to this goal
      await prisma.investment.updateMany({
        where: { goalId: id, userId },
        data: { goalId: null },
      });
      // Then link the new selection
      if (Array.isArray(linkedInvestmentIds) && linkedInvestmentIds.length > 0) {
        await prisma.investment.updateMany({
          where: { id: { in: linkedInvestmentIds }, userId },
          data: { goalId: id },
        });
      }

      return NextResponse.json({ success: true });
    }

    // 6. DELETE ACTIONS
    if (action === 'delete-investment') {
      await prisma.investment.delete({ where: { id: body.id } });
      return NextResponse.json({ success: true });
    }

    if (action === 'delete-goal') {
      await prisma.goal.delete({ where: { id: body.id } });
      return NextResponse.json({ success: true });
    }

    if (action === 'delete-wishlist') {
      await prisma.wishlistItem.delete({ where: { id: body.id } });
      return NextResponse.json({ success: true });
    }

    // 7. BATCH IMPORT SCANNED HOLDINGS / PORTFOLIO SHEET
    if (action === 'batch-import-investments') {
      const { items } = body;
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'No investment items to import' }, { status: 400 });
      }

      let startOrder = 0;
      const lastInv = await prisma.investment.findFirst({
        where: { userId },
        orderBy: { orderIndex: 'desc' },
      });
      if (lastInv) startOrder = lastInv.orderIndex + 1;

      const created = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const inv = await prisma.investment.create({
          data: {
            userId,
            name: it.name || 'Unnamed Asset',
            savingType: it.savingType || null,
            type: it.type || 'MUTUAL_FUND',
            investedAmount: parseFloat(it.investedAmount) || 0,
            currentValue: it.currentValue !== undefined ? parseFloat(it.currentValue) : parseFloat(it.investedAmount) || 0,
            notes: it.notes || 'Imported via AI/OCR Scan',
            orderIndex: startOrder + i,
          },
        });
        created.push(inv);
      }

      return NextResponse.json({ success: true, count: created.length });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Investments POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
