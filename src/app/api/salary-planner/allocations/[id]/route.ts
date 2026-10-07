import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// PATCH: Toggle done, update amount, purpose, or target account
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;

    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      if (!defaultUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      userId = defaultUser.id;
    }

    const { id } = params;
    const body = await req.json();

    const allocation = await prisma.salaryAllocation.findUnique({
      where: { id },
      include: { salaryPlan: true },
    });

    if (!allocation || allocation.salaryPlan.userId !== userId) {
      return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (body.isDone !== undefined) {
      updateData.isDone = Boolean(body.isDone);
      updateData.completedAt = body.isDone ? new Date() : null;
    }
    if (body.purpose !== undefined) updateData.purpose = body.purpose;
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount);
    if (body.targetAccountId !== undefined) updateData.targetAccountId = body.targetAccountId || null;

    const updated = await prisma.salaryAllocation.update({
      where: { id },
      data: updateData,
      include: { targetAccount: true },
    });

    return NextResponse.json({ success: true, allocation: updated });
  } catch (error: any) {
    console.error('Salary Allocation PATCH Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove an allocation row
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

    const allocation = await prisma.salaryAllocation.findUnique({
      where: { id },
      include: { salaryPlan: true },
    });

    if (!allocation || allocation.salaryPlan.userId !== userId) {
      return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
    }

    await prisma.salaryAllocation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Salary Allocation DELETE Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
