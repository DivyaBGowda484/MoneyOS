import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;

    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      if (!defaultUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      userId = defaultUser.id;
    }

    const { id } = params;

    const existing = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Reverse balance effect
    if (existing.type === 'EXPENSE' && existing.fromAccountId) {
      await prisma.account.update({
        where: { id: existing.fromAccountId },
        data: { balance: { increment: existing.amount } },
      });
    } else if (existing.type === 'INCOME' && existing.fromAccountId) {
      await prisma.account.update({
        where: { id: existing.fromAccountId },
        data: { balance: { decrement: existing.amount } },
      });
    } else if (existing.type === 'TRANSFER') {
      if (existing.fromAccountId) {
        await prisma.account.update({
          where: { id: existing.fromAccountId },
          data: { balance: { increment: existing.amount } },
        });
      }
      if (existing.toAccountId) {
        await prisma.account.update({
          where: { id: existing.toAccountId },
          data: { balance: { decrement: existing.amount } },
        });
      }
    }

    await prisma.transaction.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
