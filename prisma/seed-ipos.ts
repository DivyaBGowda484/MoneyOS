import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USER_ID = 'cmutei4590000wljqhq37118x';

async function main() {
  // 1. Ensure all family members exist (upsert by name+userId)
  const memberDefs = [
    { name: 'Rakshith', relation: 'Self', pan: 'ELPRR4074F' },
    { name: 'Praveen',  relation: 'Family' },
    { name: 'Bhanu',   relation: 'Family' },
    { name: 'Divya',   relation: 'Family', pan: 'DZHPG0605Q' },
    { name: 'Sanjana', relation: 'Family' },
  ];

  const memberMap: Record<string, string> = {}; // name → id

  for (const def of memberDefs) {
    let existing = await prisma.familyMember.findFirst({
      where: { userId: USER_ID, name: def.name },
    });
    if (!existing) {
      existing = await prisma.familyMember.create({
        data: {
          userId: USER_ID,
          name: def.name,
          relation: def.relation,
          pan: (def as any).pan ?? null,
        },
      });
      console.log(`Created member: ${def.name}`);
    } else {
      console.log(`Member exists: ${def.name} (${existing.id})`);
    }
    memberMap[def.name] = existing.id;
  }

  // 2. IPO data from spreadsheet
  const ipos = [
    {
      companyName: 'Jindal Supreme',
      appliedAt: new Date('2026-09-18'),
      amount: 14973,
      persons: ['Rakshith', 'Praveen', 'Bhanu'],
    },
    {
      companyName: 'SS Retail',
      appliedAt: new Date('2026-09-18'),
      amount: 14840,
      persons: ['Rakshith', 'Praveen', 'Bhanu'],
    },
    {
      companyName: 'Adroit',
      appliedAt: new Date('2026-09-25'),
      amount: 14874,
      persons: ['Divya', 'Sanjana', 'Rakshith', 'Praveen'],
    },
    {
      companyName: 'Money View',
      appliedAt: new Date('2026-09-18'),
      amount: 14994,
      persons: ['Divya', 'Sanjana', 'Rakshith', 'Praveen', 'Bhanu'],
    },
    {
      companyName: 'Orient Cable',
      appliedAt: new Date('2026-09-29'),
      amount: 14960,
      persons: ['Divya', 'Sanjana', 'Rakshith', 'Praveen', 'Bhanu'],
    },
    {
      companyName: 'German Green',
      appliedAt: new Date('2026-09-29'),
      amount: 14873,
      persons: ['Divya', 'Sanjana', 'Rakshith', 'Praveen', 'Bhanu'],
    },
  ];

  // 3. Insert applications (skip if already exists for same company+member)
  let created = 0;
  let skipped = 0;

  for (const ipo of ipos) {
    for (const personName of ipo.persons) {
      const memberId = memberMap[personName];
      if (!memberId) {
        console.warn(`Member not found: ${personName}`);
        continue;
      }

      const existing = await prisma.ipoApplication.findFirst({
        where: { userId: USER_ID, companyName: ipo.companyName, familyMemberId: memberId },
      });

      if (existing) {
        skipped++;
        console.log(`  Skip (exists): ${ipo.companyName} / ${personName}`);
        continue;
      }

      await prisma.ipoApplication.create({
        data: {
          userId: USER_ID,
          familyMemberId: memberId,
          companyName: ipo.companyName,
          lotsApplied: 1,
          sharesPerLot: 1,       // amount is per-lot total; bid price = amount
          bidPrice: ipo.amount,
          totalBlocked: ipo.amount,
          status: 'NOT_ALLOTTED',
          allottedLots: 0,
          refundStatus: 'REFUNDED', // spreadsheet shows Refund Pending = No / ₹0
          appliedAt: ipo.appliedAt,
        },
      });
      created++;
      console.log(`  Added: ${ipo.companyName} / ${personName} @ ₹${ipo.amount}`);
    }
  }

  console.log(`\nDone. Created ${created} applications, skipped ${skipped} duplicates.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
