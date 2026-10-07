import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning all transactions, budgets, salary plans, investments, goals, wishlist items, and IPO applications...');

  // Delete all transactional & activity data
  await prisma.transaction.deleteMany({});
  await prisma.budget.deleteMany({});
  await prisma.recurringTransaction.deleteMany({});
  await prisma.salaryAllocation.deleteMany({});
  await prisma.salaryPlan.deleteMany({});
  await prisma.investment.deleteMany({});
  await prisma.goal.deleteMany({});
  await prisma.wishlistItem.deleteMany({});
  await prisma.familyFundLedger.deleteMany({});
  await prisma.ipoApplication.deleteMany({});

  // Reset balances on any accounts to 0.0
  await prisma.account.updateMany({
    data: {
      balance: 0.0,
    },
  });

  console.log('Successfully cleared all fake data and reset account balances to 0.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
