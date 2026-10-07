import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST: Add new allocation to a salary plan
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;

    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      if (!defaultUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      userId = defaultUser.id;
    }

    const { salaryPlanId, purpose, amount, targetAccountId } = await req.json();

    if (!salaryPlanId || !purpose || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify ownership of plan
    const plan = await prisma.salaryPlan.findUnique({
      where: { id: salaryPlanId },
      include: { allocations: true },
    });

    if (!plan || plan.userId !== userId) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const orderIndex = plan.allocations.length;

    const allocation = await prisma.salaryAllocation.create({
      data: {
        salaryPlanId,
        purpose,
        amount: parseFloat(amount),
        targetAccountId: targetAccountId || null,
        isDone: false,
        orderIndex,
      },
      include: {
        targetAccount: true,
      },
    });

    return NextResponse.json({ success: true, allocation });
  } catch (error: any) {
    console.error('Salary Allocation POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
