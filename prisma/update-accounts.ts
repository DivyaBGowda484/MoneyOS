import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating user bank accounts to your specified accounts...');

  const user = await prisma.user.findFirst();
  if (!user) {
    console.error('No user found.');
    return;
  }

  // Desired accounts
  const newAccounts = [
    { name: 'Slice Savings A/c', type: 'SAVINGS', balance: 0.0, color: '#8a3ffc' },
    { name: 'Slice Credit Card', type: 'CREDIT_CARD', balance: 0.0, color: '#6929c4' },
    { name: 'Canara Bank', type: 'SAVINGS', balance: 0.0, color: '#ff832b' },
    { name: 'SBI Bank', type: 'SAVINGS', balance: 0.0, color: '#0072c3' },
    { name: 'HDFC Bank', type: 'SAVINGS', balance: 40058.0, color: '#0f62fe' },
  ];

  // Delete existing accounts or unbind from previous transactions
  await prisma.account.deleteMany({
    where: { userId: user.id },
  });

  for (const acc of newAccounts) {
    await prisma.account.create({
      data: {
        userId: user.id,
        ...acc,
      },
    });
  }

  console.log('Successfully configured your 5 bank accounts!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
