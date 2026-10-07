import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json({ error: 'User already exists with this email' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || 'MoneyOS User',
        passwordHash,
      },
    });

    // Seed default categories and sample account for new user
    const defaultCategories = [
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

    for (const cat of defaultCategories) {
      await prisma.category.create({
        data: {
          userId: user.id,
          ...cat,
        },
      });
    }

    await prisma.account.create({
      data: {
        userId: user.id,
        name: 'Primary Bank A/c',
        type: 'SAVINGS',
        balance: 25000.0,
      },
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
