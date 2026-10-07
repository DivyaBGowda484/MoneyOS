'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  Button,
} from '@carbon/react';
import {
  Money,
  Receipt,
  Wallet,
  ChartLine,
  UserMultiple,
  Add,
  Logout,
} from '@carbon/icons-react';
import QuickAddModal from './QuickAddModal';
import { signOut, useSession } from 'next-auth/react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const { data: session } = useSession();

  const navItems = [
    { label: 'Expenses', href: '/', icon: Receipt, active: pathname === '/' || pathname.startsWith('/transactions') },
    { label: 'Salary Plan', href: '/salary-planner', icon: Wallet, active: pathname.startsWith('/salary-planner') },
    { label: 'Investments', href: '/investments', icon: ChartLine, active: pathname.startsWith('/investments') },
    { label: 'IPO Tracker', href: '/ipo-tracker', icon: UserMultiple, active: pathname.startsWith('/ipo-tracker') },
  ];

  return (
    <div className="min-h-screen bg-[#f4f4f4] flex flex-col justify-between">
      {/* Carbon App Header */}
      <Header aria-label="MoneyOS India" className="cds--header !fixed top-0 left-0 right-0 z-50">
        <Link href="/" className="flex items-center space-x-2 px-4 h-full text-white no-underline hover:text-white">
          <span className="text-xl">🇮🇳</span>
          <span className="font-bold text-lg tracking-tight text-white font-sans">MoneyOS</span>
        </Link>

        <div className="hidden md:flex items-center space-x-4 ml-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-sm rounded ${
                  item.active ? 'bg-[#393939] text-white font-medium' : 'text-[#c6c6c6] hover:text-white'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <HeaderGlobalBar>
          <div className="flex items-center mr-2">
            <Button
              size="sm"
              kind="primary"
              renderIcon={Add}
              onClick={() => setQuickAddOpen(true)}
              className="hidden sm:flex"
            >
              Quick Add
            </Button>
          </div>

          {session && (
            <HeaderGlobalAction
              aria-label="Log Out"
              tooltipAlignment="end"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <Logout size={20} />
            </HeaderGlobalAction>
          )}
        </HeaderGlobalBar>
      </Header>

      {/* Main Content Area */}
      <main className="flex-1 pt-14 pb-20 md:pb-8 max-w-7xl w-full mx-auto px-3 sm:px-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#161616] text-[#c6c6c6] border-t border-[#393939] z-40 flex items-center justify-around py-2 px-2">
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center text-xs py-1 px-2 rounded ${
                item.active ? 'text-[#0f62fe] font-semibold' : 'text-gray-400'
              }`}
            >
              <Icon size={20} />
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}

        {/* Center Quick Add Elevated Button */}
        <button
          onClick={() => setQuickAddOpen(true)}
          className="flex flex-col items-center justify-center -mt-6 bg-[#0f62fe] hover:bg-[#0043ce] text-white rounded-full w-12 h-12 shadow-lg focus:outline-none ring-4 ring-[#161616]"
          aria-label="Quick Add Transaction"
        >
          <Add size={24} />
        </button>

        {navItems.slice(2, 4).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center text-xs py-1 px-2 rounded ${
                item.active ? 'text-[#0f62fe] font-semibold' : 'text-gray-400'
              }`}
            >
              <Icon size={20} />
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Global Quick Add Modal */}
      <QuickAddModal
        open={quickAddOpen}
        onRequestClose={() => setQuickAddOpen(false)}
        onSuccess={() => {
          // Trigger global refresh event
          window.dispatchEvent(new Event('moneyos-refresh'));
        }}
      />
    </div>
  );
}
