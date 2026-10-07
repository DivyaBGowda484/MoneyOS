import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;

    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      if (!defaultUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      userId = defaultUser.id;
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : now.getMonth() + 1;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : now.getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch month's transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: true,
        fromAccount: true,
      },
      orderBy: { date: 'desc' },
    });

    // Accounts
    const accounts = await prisma.account.findMany({
      where: { userId, isActive: true },
    });

    const totalBankBalance = accounts.reduce((acc, a) => acc + (a.type !== 'CREDIT_CARD' ? a.balance : 0), 0);
    const totalCreditCardDebt = accounts.reduce((acc, a) => acc + (a.type === 'CREDIT_CARD' ? a.balance : 0), 0);

    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryExpenseMap: Record<string, { name: string; amount: number; color: string; icon: string }> = {};

    transactions.forEach((t) => {
      if (t.type === 'INCOME') {
        totalIncome += t.amount;
      } else if (t.type === 'EXPENSE') {
        totalExpense += t.amount;
        const catName = t.category?.name || 'Uncategorized';
        const catColor = t.category?.color || '#8d8d8d';
        const catIcon = t.category?.icon || 'Tag';

        if (!categoryExpenseMap[catName]) {
          categoryExpenseMap[catName] = { name: catName, amount: 0, color: catColor, icon: catIcon };
        }
        categoryExpenseMap[catName].amount += t.amount;
      }
    });

    // Budgets for month
    const budgets = await prisma.budget.findMany({
      where: { userId, month, year },
      include: { category: true },
    });

    const budgetStatus = budgets.map((b) => {
      const spent = categoryExpenseMap[b.category.name]?.amount || 0;
      const percent = b.amount > 0 ? (spent / b.amount) * 100 : 0;
      return {
        id: b.id,
        categoryId: b.categoryId,
        categoryName: b.category.name,
        allocated: b.amount,
        spent,
        remaining: b.amount - spent,
        percent: Math.min(percent, 100),
        isOverBudget: spent > b.amount,
      };
    });

    // Past 6 months cashflow trend
    const monthsTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const s = new Date(y, m - 1, 1);
      const e = new Date(y, m, 0, 23, 59, 59, 999);

      const mTx = await prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: s, lte: e },
        },
      });

      const inc = mTx.filter((t) => t.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
      const exp = mTx.filter((t) => t.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
      const monthName = d.toLocaleString('en-IN', { month: 'short' });

      monthsTrend.push({
        month: monthName,
        year: y,
        income: inc,
        expense: exp,
        savings: inc - exp,
      });
    }

    return NextResponse.json({
      summary: {
        totalIncome,
        totalExpense,
        netSavings: totalIncome - totalExpense,
        savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
        totalBankBalance,
        totalCreditCardDebt,
      },
      categoryBreakdown: Object.values(categoryExpenseMap).sort((a, b) => b.amount - a.amount),
      budgetStatus,
      monthsTrend,
      recentTransactions: transactions.slice(0, 10),
      accounts,
    });
  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
