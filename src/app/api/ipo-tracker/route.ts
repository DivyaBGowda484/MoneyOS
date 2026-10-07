import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET IPO Tracker Dashboard data
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    let userId = (session?.user as any)?.id;

    if (!userId) {
      const defaultUser = await prisma.user.findFirst();
      if (!defaultUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      userId = defaultUser.id;
    }

    // 1. Fetch Family Members
    let familyMembers = await prisma.familyMember.findMany({
      where: { userId },
      include: {
        applications: true,
        fundTransfers: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Auto seed "Self" member if none exist
    if (familyMembers.length === 0) {
      const self = await prisma.familyMember.create({
        data: {
          userId,
          name: 'Self',
          relation: 'Self',
        },
      });
      familyMembers = [
        {
          ...self,
          applications: [],
          fundTransfers: [],
        },
      ];
    }

    // 2. Fetch all IPO Applications
    const applications = await prisma.ipoApplication.findMany({
      where: { userId },
      include: {
        familyMember: true,
      },
      orderBy: { appliedAt: 'desc' },
    });

    // 3. Compute High-Level Metrics
    let totalBlockedCapital = 0;
    let totalAllottedCapital = 0;
    let totalRealizedProfit = 0;
    let totalRefundsPending = 0;
    let totalApplicationsCount = applications.length;
    let totalAllottedCount = 0;

    applications.forEach((app) => {
      // If still APPLIED or ALLOTTED and not yet settled
      if (app.status === 'APPLIED') {
        totalBlockedCapital += app.totalBlocked;
      } else if (app.status === 'ALLOTTED') {
        totalAllottedCount += 1;
        totalAllottedCapital += app.totalBlocked;
      }

      if (app.status === 'NOT_ALLOTTED' && app.refundStatus === 'PENDING') {
        totalRefundsPending += app.totalBlocked;
      }

      if (app.realizedPnL !== null && app.realizedPnL !== undefined) {
        totalRealizedProfit += app.realizedPnL;
      }
    });

    // 4. Per Family Member Fund & P&L Ledger
    const memberLedgers = familyMembers.map((member) => {
      const memberApps = applications.filter((a) => a.familyMemberId === member.id);
      
      const fundsReceived = member.fundTransfers.reduce((acc, t) => acc + t.amountReceived, 0);
      const fundsReturned = member.fundTransfers.reduce((acc, t) => acc + t.amountReturned, 0);
      
      const capitalBlocked = memberApps
        .filter((a) => a.status === 'APPLIED')
        .reduce((acc, a) => acc + a.totalBlocked, 0);

      const capitalAllotted = memberApps
        .filter((a) => a.status === 'ALLOTTED')
        .reduce((acc, a) => acc + a.totalBlocked, 0);

      const profitEarned = memberApps.reduce((acc, a) => acc + (a.realizedPnL || 0), 0);
      const pendingRefunds = memberApps
        .filter((a) => a.status === 'NOT_ALLOTTED' && a.refundStatus === 'PENDING')
        .reduce((acc, a) => acc + a.totalBlocked, 0);

      const netBalance = fundsReceived - fundsReturned + profitEarned - capitalAllotted;

      return {
        id: member.id,
        name: member.name,
        relation: member.relation,
        pan: member.pan,
        upiId: member.upiId,
        totalApplied: memberApps.length,
        capitalBlocked,
        capitalAllotted,
        profitEarned,
        pendingRefunds,
        fundsReceived,
        fundsReturned,
        netBalance,
        // Raw transactions sorted newest first
        transactions: [...member.fundTransfers].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
      };
    });

    // 5. Group Applications by IPO Company
    const companyMap: Record<string, any[]> = {};
    applications.forEach((app) => {
      if (!companyMap[app.companyName]) {
        companyMap[app.companyName] = [];
      }
      companyMap[app.companyName].push(app);
    });

    const groupedIpos = Object.entries(companyMap).map(([companyName, apps]) => {
      const totalBlocked = apps.reduce((acc, a) => acc + a.totalBlocked, 0);
      const totalAllotted = apps.filter((a) => a.status === 'ALLOTTED').length;
      const totalPnL = apps.reduce((acc, a) => acc + (a.realizedPnL || 0), 0);

      return {
        companyName,
        symbol: apps[0]?.symbol,
        totalApplicants: apps.length,
        totalBlocked,
        totalAllotted,
        totalPnL,
        applications: apps,
      };
    });

    return NextResponse.json({
      summary: {
        totalBlockedCapital,
        totalAllottedCapital,
        totalRealizedProfit,
        totalRefundsPending,
        totalApplicationsCount,
        totalAllottedCount,
      },
      groupedIpos,
      applications,
      familyMembers,
      memberLedgers,
    });
  } catch (error: any) {
    console.error('IPO GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST IPO Tracker Actions
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

    // 1. ADD FAMILY MEMBER
    if (action === 'add-family-member') {
      const { name, relation, pan, upiId } = body;
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

      const member = await prisma.familyMember.create({
        data: {
          userId,
          name,
          relation: relation || 'Family',
          pan: pan ? pan.toUpperCase() : null,
          upiId: upiId || null,
        },
      });

      return NextResponse.json({ success: true, member });
    }

    // 1b. UPDATE PAN / UPI for existing member
    if (action === 'update-member-pan') {
      const { memberId, pan, upiId } = body;
      if (!memberId) return NextResponse.json({ error: 'memberId is required' }, { status: 400 });

      const member = await prisma.familyMember.update({
        where: { id: memberId },
        data: {
          pan: pan ? pan.toUpperCase() : null,
          upiId: upiId || null,
        },
      });

      return NextResponse.json({ success: true, member });
    }

    // 2. APPLY FOR IPO (Single or Multi-Person Batch)
    if (action === 'apply-ipo') {
      const {
        companyName,
        symbol,
        sharesPerLot,
        bidPrice,
        applicantMemberIds, // Array of familyMemberId
        lotsPerPerson = 1,
        directAmountPerPerson, // optional override: enter total blocked directly
      } = body;

      if (!companyName || !applicantMemberIds?.length) {
        return NextResponse.json(
          { error: 'Company name and at least one applicant are required' },
          { status: 400 }
        );
      }

      const numShares = sharesPerLot ? parseInt(sharesPerLot) : 1;
      const numBid = bidPrice ? parseFloat(bidPrice) : 0;
      const numLots = parseInt(lotsPerPerson) || 1;
      // Use direct amount if provided, otherwise calculate
      const totalBlocked = directAmountPerPerson
        ? parseFloat(directAmountPerPerson)
        : numLots * numShares * numBid;

      const created = [];
      for (const memberId of applicantMemberIds) {
        const app = await prisma.ipoApplication.create({
          data: {
            userId,
            familyMemberId: memberId,
            companyName,
            symbol: symbol || null,
            lotsApplied: numLots,
            sharesPerLot: numShares,
            bidPrice: numBid,
            totalBlocked,
            status: 'APPLIED',
            refundStatus: 'PENDING',
          },
        });
        created.push(app);
      }

      return NextResponse.json({ success: true, count: created.length });
    }

    // 3. UPDATE APPLICATION ALLOTMENT / REFUND STATUS
    if (action === 'update-status') {
      const { id, status, allottedLots, refundStatus } = body;

      const updateData: any = {};
      if (status !== undefined) {
        updateData.status = status;
        if (status === 'NOT_ALLOTTED') {
          updateData.allottedLots = 0;
          updateData.refundStatus = 'PENDING';
        } else if (status === 'ALLOTTED') {
          updateData.allottedLots = allottedLots !== undefined ? parseInt(allottedLots) : 1;
          updateData.refundStatus = 'NOT_APPLICABLE';
        }
      }

      if (allottedLots !== undefined) updateData.allottedLots = parseInt(allottedLots);
      if (refundStatus !== undefined) {
        updateData.refundStatus = refundStatus;
        if (refundStatus === 'REFUNDED') {
          updateData.refundDate = new Date();
        }
      }

      const updated = await prisma.ipoApplication.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json({ success: true, application: updated });
    }

    // 4. RECORD SELL EXECUTION & PROFIT/LOSS
    if (action === 'record-sell') {
      const { id, sellPricePerShare } = body;
      if (!id || sellPricePerShare === undefined) {
        return NextResponse.json({ error: 'Application ID and sell price required' }, { status: 400 });
      }

      const app = await prisma.ipoApplication.findUnique({ where: { id } });
      if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

      const sellPrice = parseFloat(sellPricePerShare);
      const totalSharesAllotted = (app.allottedLots > 0 ? app.allottedLots : app.lotsApplied) * app.sharesPerLot;
      const totalCost = totalSharesAllotted * app.bidPrice;
      const totalRealized = totalSharesAllotted * sellPrice;
      const realizedPnL = totalRealized - totalCost;

      const updated = await prisma.ipoApplication.update({
        where: { id },
        data: {
          sellPricePerShare: sellPrice,
          totalRealized,
          realizedPnL,
          soldDate: new Date(),
        },
      });

      return NextResponse.json({ success: true, application: updated });
    }

    // 5. RECORD FAMILY FUND TRANSFER (Money Received or Returned)
    if (action === 'record-fund-transfer') {
      const { familyMemberId, amountReceived, amountReturned, notes } = body;
      if (!familyMemberId) {
        return NextResponse.json({ error: 'Family member required' }, { status: 400 });
      }

      const ledger = await prisma.familyFundLedger.create({
        data: {
          familyMemberId,
          amountReceived: parseFloat(amountReceived) || 0,
          amountReturned: parseFloat(amountReturned) || 0,
          notes: notes || null,
          date: new Date(),
        },
      });

      return NextResponse.json({ success: true, ledger });
    }

    // 6. DELETE APPLICATION OR MEMBER
    if (action === 'delete-application') {
      await prisma.ipoApplication.delete({ where: { id: body.id } });
      return NextResponse.json({ success: true });
    }

    if (action === 'delete-family-member') {
      await prisma.familyMember.delete({ where: { id: body.id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('IPO POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
