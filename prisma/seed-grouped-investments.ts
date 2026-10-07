import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No user found');
    return;
  }

  // Clear existing investments
  await prisma.investment.deleteMany({ where: { userId: user.id } });

  // Spreadsheet row structure
  const rows = [
    { sNo: 1, savingType: 'Cash', name: 'ME', investedAmount: 5730, currentValue: 5730, type: 'OTHER' },
    { sNo: 2, savingType: 'FD', name: 'Slice', investedAmount: 15000, currentValue: 15000, type: 'FD_RD' },
    { sNo: 3, savingType: 'Emergency Fund', name: 'Bank Account', investedAmount: 7000, currentValue: 7000, type: 'OTHER' },
    { sNo: 3, savingType: 'Emergency Fund', name: 'Axis Liquid Fund', investedAmount: 39953, currentValue: 39953, type: 'MUTUAL_FUND' },
    { sNo: 4, savingType: 'Equity MF', name: 'UTI Nifty 50 Index Fund', investedAmount: 31999, currentValue: 31999, type: 'MUTUAL_FUND' },
    { sNo: 4, savingType: 'Equity MF', name: 'Motilal Oswal Midcap Fund', investedAmount: 19699, currentValue: 19699, type: 'MUTUAL_FUND' },
    { sNo: 4, savingType: 'Equity MF', name: 'Parag Parikh Flexi Cap Fund', investedAmount: 19499, currentValue: 19499, type: 'MUTUAL_FUND' },
    { sNo: 4, savingType: 'Equity MF', name: 'HDFC Flexi Cap Fund', investedAmount: 6799, currentValue: 6799, type: 'MUTUAL_FUND' },
    { sNo: 5, savingType: 'Retirement MF', name: 'Motilal Oswal Nifty 500 Index Fund', investedAmount: 7000, currentValue: 7000, type: 'MUTUAL_FUND' },
    { sNo: 6, savingType: 'Individual Stocks', name: 'HDFC Bank', investedAmount: 1807, currentValue: 1807, type: 'STOCKS' },
    { sNo: 6, savingType: 'Individual Stocks', name: 'L&T', investedAmount: 3988, currentValue: 3988, type: 'STOCKS' },
    { sNo: 7, savingType: 'Short Term Savings', name: 'Slice', investedAmount: 5000, currentValue: 5000, type: 'OTHER' },
    { sNo: 7, savingType: 'Short Term Savings', name: 'HDFC Bank', investedAmount: 4336, currentValue: 4336, type: 'OTHER' },
    { sNo: 7, savingType: 'Short Term Savings', name: 'Axis Liquid Fund', investedAmount: 15098, currentValue: 15098, type: 'MUTUAL_FUND' },
    { sNo: 8, savingType: 'Mid Term Savings', name: 'Kotak Money Market Fund', investedAmount: 22000, currentValue: 22000, type: 'MUTUAL_FUND' },
    { sNo: 8, savingType: 'Mid Term Savings', name: 'Tata Arbitrage Fund', investedAmount: 8181, currentValue: 8181, type: 'MUTUAL_FUND' },
    { sNo: 9, savingType: 'Long Term Savings', name: 'Motilal Oswal Nifty 500 Index Fund', investedAmount: 20000, currentValue: 20000, type: 'MUTUAL_FUND' },
    { sNo: 9, savingType: 'Long Term Savings', name: 'Kotak Money Market Fund', investedAmount: 11777, currentValue: 11777, type: 'MUTUAL_FUND' },
    { sNo: 10, savingType: 'Gold ETF', name: 'ICICI Prudential Gold ETF', investedAmount: 12965, currentValue: 12965, type: 'GOLD' },
    { sNo: 11, savingType: 'Family', name: 'Axis Liquid Fund', investedAmount: 10000, currentValue: 10000, type: 'MUTUAL_FUND' },
  ];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    await prisma.investment.create({
      data: {
        userId: user.id,
        name: r.name,
        savingType: r.savingType,
        type: r.type,
        investedAmount: r.investedAmount,
        currentValue: r.currentValue,
        notes: `Imported from spreadsheet group: ${r.savingType}`,
        orderIndex: i,
      },
    });
  }

  console.log(`Successfully seeded ${rows.length} investments with savingType groupings!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
