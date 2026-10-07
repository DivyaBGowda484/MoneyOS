import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { parseNaturalLanguageInput } from '@/lib/nlParser';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;

    if (!userId) {
      // Find default demo user if not logged in
      const defaultUser = await prisma.user.findFirst();
      if (!defaultUser) {
        return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
      }
      userId = defaultUser.id;
    }

    const { input, source = 'NLP_TEXT' } = await req.json();

    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Input text is required' }, { status: 400 });
    }

    const parsed = parseNaturalLanguageInput(input);

    if (!parsed.amount || parsed.amount <= 0) {
      return NextResponse.json(
        {
          error: 'Could not extract valid amount from input. Please include numbers (e.g., 450 swiggy dinner).',
          parsed,
        },
        { status: 422 }
      );
    }

    // Match or create account
    const accounts = await prisma.account.findMany({ where: { userId } });
    let fromAccount = null;
    let toAccount = null;

    if (parsed.accountHint) {
      fromAccount = accounts.find((a) =>
        a.name.toLowerCase().includes(parsed.accountHint!.toLowerCase())
      );
    }
    if (!fromAccount && accounts.length > 0) {
      fromAccount = accounts[0];
    }

    if (parsed.toAccountHint) {
      toAccount = accounts.find((a) =>
        a.name.toLowerCase().includes(parsed.toAccountHint!.toLowerCase())
      );
    }

    // Match or create category
    const categories = await prisma.category.findMany({ where: { userId } });
    let category = null;

    if (parsed.categoryHint) {
      category = categories.find((c) =>
        c.name.toLowerCase().includes(parsed.categoryHint!.toLowerCase())
      );
    }

    if (!category && parsed.type === 'EXPENSE') {
      category = categories.find((c) => c.name.toLowerCase().includes('dining') || c.name.toLowerCase().includes('food')) || categories[0];
    } else if (!category && parsed.type === 'INCOME') {
      category = categories.find((c) => c.type === 'INCOME') || categories[0];
    }

    // Create the transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: parsed.type,
        amount: parsed.amount,
        description: parsed.description,
        fromAccountId: fromAccount?.id || null,
        toAccountId: toAccount?.id || null,
        categoryId: category?.id || null,
        source: source,
        date: new Date(),
      },
      include: {
        category: true,
        fromAccount: true,
        toAccount: true,
      },
    });

    // Update account balances
    if (parsed.type === 'EXPENSE' && fromAccount) {
      await prisma.account.update({
        where: { id: fromAccount.id },
        data: { balance: { decrement: parsed.amount } },
      });
    } else if (parsed.type === 'INCOME' && fromAccount) {
      await prisma.account.update({
        where: { id: fromAccount.id },
        data: { balance: { increment: parsed.amount } },
      });
    } else if (parsed.type === 'TRANSFER') {
      if (fromAccount) {
        await prisma.account.update({
          where: { id: fromAccount.id },
          data: { balance: { decrement: parsed.amount } },
        });
      }
      if (toAccount) {
        await prisma.account.update({
          where: { id: toAccount.id },
          data: { balance: { increment: parsed.amount } },
        });
      }
    }

    return NextResponse.json({
      success: true,
      transaction,
      parsed,
    });
  } catch (error: any) {
    console.error('Quick Add Error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
