import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : null;
    const categoryId = searchParams.get('categoryId');
    const accountId = searchParams.get('accountId');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

    let whereClause: any = { userId };

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      whereClause.date = {
        gte: startDate,
        lte: endDate,
      };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      whereClause.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (categoryId && categoryId !== 'all') {
      whereClause.categoryId = categoryId;
    }

    if (accountId && accountId !== 'all') {
      whereClause.OR = [
        { fromAccountId: accountId },
        { toAccountId: accountId },
      ];
    }

    if (type && type !== 'all') {
      whereClause.type = type;
    }

    if (search) {
      whereClause.description = {
        contains: search,
      };
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
      },
      orderBy: {
        date: 'desc',
      },
      take: limit,
    });

    return NextResponse.json({ transactions });
  } catch (error: any) {
    console.error('Transactions GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
    const { amount, description, type, categoryId, fromAccountId, toAccountId, date, source } = body;

    if (!amount || !description || !type) {
      return NextResponse.json({ error: 'Amount, description and type are required' }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    const txDate = date ? new Date(date) : new Date();

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: numAmount,
        description,
        type,
        categoryId: categoryId || null,
        fromAccountId: fromAccountId || null,
        toAccountId: toAccountId || null,
        date: txDate,
        source: source || 'MANUAL',
      },
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
      },
    });

    // Adjust balances
    if (type === 'EXPENSE' && fromAccountId) {
      await prisma.account.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: numAmount } },
      });
    } else if (type === 'INCOME' && fromAccountId) {
      await prisma.account.update({
        where: { id: fromAccountId },
        data: { balance: { increment: numAmount } },
      });
    } else if (type === 'TRANSFER') {
      if (fromAccountId) {
        await prisma.account.update({
          where: { id: fromAccountId },
          data: { balance: { decrement: numAmount } },
        });
      }
      if (toAccountId) {
        await prisma.account.update({
          where: { id: toAccountId },
          data: { balance: { increment: numAmount } },
        });
      }
    }

    return NextResponse.json({ success: true, transaction });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
