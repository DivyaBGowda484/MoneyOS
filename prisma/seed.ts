import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding MoneyOS with clean default setup (categories & accounts only)...');

  // Create demo user
  const passwordHash = await bcrypt.hash('moneyos123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'demo@moneyos.in' },
    update: {},
    create: {
      email: 'demo@moneyos.in',
      name: 'Aditya Sharma',
      passwordHash,
    },
  });

  console.log('User setup:', user.email);

  // Default Bank Accounts (with 0 balance)
  const accountsData = [
    { name: 'Slice Savings A/c', type: 'SAVINGS', balance: 0.0, color: '#8a3ffc' },
    { name: 'Slice Credit Card', type: 'CREDIT_CARD', balance: 0.0, color: '#6929c4' },
    { name: 'Canara Bank', type: 'SAVINGS', balance: 0.0, color: '#ff832b' },
    { name: 'SBI Bank', type: 'SAVINGS', balance: 0.0, color: '#0072c3' },
    { name: 'HDFC Bank', type: 'SAVINGS', balance: 0.0, color: '#0f62fe' },
  ];

  for (const acc of accountsData) {
    const existing = await prisma.account.findFirst({
      where: { userId: user.id, name: acc.name },
    });
    if (!existing) {
      await prisma.account.create({
        data: {
          userId: user.id,
          ...acc,
        },
      });
    }
  }

  // Default Categories
  const categoriesData = [
    { name: 'Food & Dining', type: 'EXPENSE', icon: 'Restaurant', color: '#fa4d56', isDefault: true },
    { name: 'Groceries', type: 'EXPENSE', icon: 'ShoppingBag', color: '#ff832b', isDefault: true },
    { name: 'Rent & Housing', type: 'EXPENSE', icon: 'Home', color: '#8a3ffc', isDefault: true },
    { name: 'Travel & Commute', type: 'EXPENSE', icon: 'Car', color: '#1192e8', isDefault: true },
    { name: 'Bills & Utilities', type: 'EXPENSE', icon: 'Wifi', color: '#0072c3', isDefault: true },
    { name: 'Entertainment', type: 'EXPENSE', icon: 'PlayOutline', color: '#d12771', isDefault: true },
    { name: 'Shopping', type: 'EXPENSE', icon: 'Purchase', color: '#ba4e00', isDefault: true },
    { name: 'Health & Medical', type: 'EXPENSE', icon: 'Hospital', color: '#009d9a', isDefault: true },
    { name: 'Salary & Income', type: 'INCOME', icon: 'Money', color: '#24a148', isDefault: true },
    { name: 'Investments', type: 'EXPENSE', icon: 'ChartLine', color: '#6929c4', isDefault: true },
  ];

  for (const cat of categoriesData) {
    const existing = await prisma.category.findFirst({
      where: { userId: user.id, name: cat.name },
    });
    if (!existing) {
      await prisma.category.create({
        data: {
          userId: user.id,
          ...cat,
        },
      });
    }
  }

  console.log('Database initialized with clean zero-balance defaults.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
