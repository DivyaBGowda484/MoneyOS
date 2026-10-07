import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET salary plan for specific month and year
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

    let plan = await prisma.salaryPlan.findUnique({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
      include: {
        allocations: {
          include: {
            targetAccount: true,
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
    });

    const accounts = await prisma.account.findMany({
      where: { userId, isActive: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ plan, accounts, month, year });
  } catch (error: any) {
    console.error('Salary Plan GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create or Update Salary Plan (and support copying previous month)
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
    const { action, month, year, salaryAmount, notes, allocations } = body;

    const targetMonth = parseInt(month);
    const targetYear = parseInt(year);

    // BATCH IMPORT MULTIPLE ALLOCATIONS FROM SCAN/CSV/SPREADSHEET
    if (action === 'batch-import-allocations') {
      const { rows } = body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ error: 'No rows to import' }, { status: 400 });
      }

      // Ensure plan exists
      let currentPlan = await prisma.salaryPlan.findUnique({
        where: {
          userId_month_year: {
            userId,
            month: targetMonth,
            year: targetYear,
          },
        },
      });

      if (!currentPlan) {
        currentPlan = await prisma.salaryPlan.create({
          data: {
            userId,
            month: targetMonth,
            year: targetYear,
            salaryAmount: 0,
          },
        });
      }

      const accounts = await prisma.account.findMany({ where: { userId } });

      // Clear existing and replace with scanned rows
      await prisma.salaryAllocation.deleteMany({
        where: { salaryPlanId: currentPlan.id },
      });

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        let targetAccId = null;
        if (r.accountHint) {
          const matched = accounts.find((a) =>
            a.name.toLowerCase().includes(r.accountHint.toLowerCase())
          );
          if (matched) targetAccId = matched.id;
        }

        await prisma.salaryAllocation.create({
          data: {
            salaryPlanId: currentPlan.id,
            purpose: r.purpose,
            amount: parseFloat(r.amount) || 0,
            targetAccountId: targetAccId,
            isDone: Boolean(r.isDone),
            orderIndex: i,
          },
        });
      }

      const updatedPlan = await prisma.salaryPlan.findUnique({
        where: { id: currentPlan.id },
        include: {
          allocations: {
            include: { targetAccount: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      return NextResponse.json({ success: true, plan: updatedPlan });
    }

    if (action === 'copy-previous') {
      // Find the previous month plan
      let prevMonth = targetMonth - 1;
      let prevYear = targetYear;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
      }

      // Find the most recent available plan before target
      const prevPlan = await prisma.salaryPlan.findFirst({
        where: {
          userId,
          OR: [
            { year: prevYear, month: prevMonth },
            { year: { lt: targetYear } },
            { year: targetYear, month: { lt: targetMonth } },
          ],
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: {
          allocations: true,
        },
      });

      if (!prevPlan) {
        return NextResponse.json({ error: 'No previous plan found to copy from.' }, { status: 404 });
      }

      // Upsert current plan with copied salary & allocations
      const currentPlan = await prisma.salaryPlan.upsert({
        where: {
          userId_month_year: {
            userId,
            month: targetMonth,
            year: targetYear,
          },
        },
        update: {
          salaryAmount: prevPlan.salaryAmount,
          notes: prevPlan.notes,
        },
        create: {
          userId,
          month: targetMonth,
          year: targetYear,
          salaryAmount: prevPlan.salaryAmount,
          notes: prevPlan.notes,
        },
      });

      // Clear existing allocations and re-create from previous plan (uncheck 'isDone')
      await prisma.salaryAllocation.deleteMany({
        where: { salaryPlanId: currentPlan.id },
      });

      if (prevPlan.allocations.length > 0) {
        await prisma.salaryAllocation.createMany({
          data: prevPlan.allocations.map((a, idx) => ({
            salaryPlanId: currentPlan.id,
            purpose: a.purpose,
            amount: a.amount,
            targetAccountId: a.targetAccountId,
            isDone: false,
            orderIndex: idx,
          })),
        });
      }

      const updatedPlan = await prisma.salaryPlan.findUnique({
        where: { id: currentPlan.id },
        include: {
          allocations: {
            include: { targetAccount: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      return NextResponse.json({ success: true, plan: updatedPlan });
    }

    // Standard upsert plan
    const parsedSalary = parseFloat(salaryAmount) || 0;
    const plan = await prisma.salaryPlan.upsert({
      where: {
        userId_month_year: {
          userId,
          month: targetMonth,
          year: targetYear,
        },
      },
      update: {
        salaryAmount: parsedSalary,
        notes: notes || null,
      },
      create: {
        userId,
        month: targetMonth,
        year: targetYear,
        salaryAmount: parsedSalary,
        notes: notes || null,
      },
      include: {
        allocations: {
          include: { targetAccount: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    // Automatically sync or record as Income transaction for this month if salary is set
    if (parsedSalary > 0) {
      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

      // Find primary/salary category and account
      const salaryCategory = await prisma.category.findFirst({
        where: {
          userId,
          type: 'INCOME',
        },
      });

      const primaryAccount = await prisma.account.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });

      // Check if a salary transaction already exists for this month
      const existingSalaryTx = await prisma.transaction.findFirst({
        where: {
          userId,
          type: 'INCOME',
          description: { contains: 'Salary' },
          date: { gte: startDate, lte: endDate },
        },
      });

      if (existingSalaryTx) {
        // Adjust balance if account exists
        const diff = parsedSalary - existingSalaryTx.amount;
        if (existingSalaryTx.fromAccountId && diff !== 0) {
          await prisma.account.update({
            where: { id: existingSalaryTx.fromAccountId },
            data: { balance: { increment: diff } },
          });
        }
        await prisma.transaction.update({
          where: { id: existingSalaryTx.id },
          data: {
            amount: parsedSalary,
          },
        });
      } else {
        // Create new salary income transaction for the month
        await prisma.transaction.create({
          data: {
            userId,
            type: 'INCOME',
            amount: parsedSalary,
            description: `Monthly Salary (${targetMonth}/${targetYear})`,
            date: new Date(targetYear, targetMonth - 1, 1),
            categoryId: salaryCategory?.id || null,
            fromAccountId: primaryAccount?.id || null,
            source: 'MANUAL',
          },
        });

        if (primaryAccount) {
          await prisma.account.update({
            where: { id: primaryAccount.id },
            data: { balance: { increment: parsedSalary } },
          });
        }
      }
    }

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    console.error('Salary Plan POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
