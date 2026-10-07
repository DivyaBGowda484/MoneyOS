'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Select,
  SelectItem,
  Button,
  Tag,
  InlineNotification,
  DataTableSkeleton,
  Modal,
} from '@carbon/react';
import {
  TrashCan,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowsHorizontal,
} from '@carbon/icons-react';
import { formatINR, formatDateINR } from '@/lib/formatters';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filterType !== 'all') query.append('type', filterType);
      if (filterCategory !== 'all') query.append('categoryId', filterCategory);
      if (filterAccount !== 'all') query.append('accountId', filterAccount);
      if (searchTerm) query.append('search', searchTerm);

      const res = await fetch(`/api/transactions?${query.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTransactions(data.transactions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterCategory, filterAccount, searchTerm]);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [cRes, aRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/accounts'),
        ]);
        const cData = await cRes.json();
        const aData = await aRes.json();
        setCategories(cData.categories || []);
        setAccounts(aData.accounts || []);
      } catch (e) {
        console.error(e);
      }
    };

    fetchMeta();
    fetchTransactions();

    const handleRefresh = () => fetchTransactions();
    window.addEventListener('moneyos-refresh', handleRefresh);
    return () => window.removeEventListener('moneyos-refresh', handleRefresh);
  }, [fetchTransactions]);

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      const res = await fetch(`/api/transactions/${deleteTargetId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      setDeleteTargetId(null);
      fetchTransactions();
      window.dispatchEvent(new Event('moneyos-refresh'));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const headers = [
    { key: 'date', header: 'Date' },
    { key: 'description', header: 'Description' },
    { key: 'category', header: 'Category' },
    { key: 'account', header: 'Account' },
    { key: 'type', header: 'Type' },
    { key: 'amount', header: 'Amount (₹)' },
    { key: 'actions', header: 'Action' },
  ];

  const rows = transactions.map((t) => ({
    id: t.id,
    date: formatDateINR(t.date),
    description: t.description,
    category: t.category?.name || 'Uncategorized',
    account: t.fromAccount?.name || (t.toAccount ? `→ ${t.toAccount.name}` : 'Cash'),
    type: t.type,
    amountNum: t.amount,
    source: t.source,
  }));

  return (
    <AppLayout>
      <div className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#161616]">Transaction Ledger</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Complete history with multi-account filtering and search
            </p>
          </div>
        </div>

        {error && (
          <InlineNotification
            kind="error"
            title="Notice: "
            subtitle={error}
            onCloseButtonClick={() => setError(null)}
          />
        )}

        {/* Filter Toolbar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <Select
            id="filter-type"
            labelText="Transaction Type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            size="sm"
          >
            <SelectItem value="all" text="All Types" />
            <SelectItem value="EXPENSE" text="Expense" />
            <SelectItem value="INCOME" text="Income" />
            <SelectItem value="TRANSFER" text="Transfer" />
          </Select>

          <Select
            id="filter-category"
            labelText="Category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            size="sm"
          >
            <SelectItem value="all" text="All Categories" />
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id} text={c.name} />
            ))}
          </Select>

          <Select
            id="filter-account"
            labelText="Account"
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            size="sm"
          >
            <SelectItem value="all" text="All Accounts" />
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id} text={a.name} />
            ))}
          </Select>

          <div className="flex flex-col justify-end">
            <Button
              kind="ghost"
              size="sm"
              onClick={() => {
                setFilterType('all');
                setFilterCategory('all');
                setFilterAccount('all');
                setSearchTerm('');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-4">
              <DataTableSkeleton columnCount={6} rowCount={8} />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500">
              No matching transactions found.
            </div>
          ) : (
            <TableContainer title={`Total ${rows.length} Entries`}>
              <TableToolbar>
                <TableToolbarContent>
                  <TableToolbarSearch
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e: any) => setSearchTerm(e.target.value)}
                  />
                </TableToolbarContent>
              </TableToolbar>
              <Table aria-label="Transactions DataTable">
                <TableHead>
                  <TableRow>
                    {headers.map((h) => (
                      <TableHeader key={h.key}>{h.header}</TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                        {row.date}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-gray-900 text-sm">
                          {row.description}
                        </div>
                        {row.source !== 'MANUAL' && (
                          <span className="text-[10px] text-gray-400 uppercase">
                            via {row.source.replace('_', ' ')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tag type="cool-gray" size="sm">
                          {row.category}
                        </Tag>
                      </TableCell>
                      <TableCell className="text-xs text-gray-700">
                        {row.account}
                      </TableCell>
                      <TableCell>
                        <Tag
                          type={
                            row.type === 'INCOME'
                              ? 'green'
                              : row.type === 'TRANSFER'
                              ? 'purple'
                              : 'red'
                          }
                          size="sm"
                        >
                          {row.type}
                        </Tag>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-mono font-bold text-sm ${
                            row.type === 'INCOME'
                              ? 'text-green-600'
                              : row.type === 'TRANSFER'
                              ? 'text-purple-600'
                              : 'text-red-600'
                          }`}
                        >
                          {row.type === 'INCOME' ? '+' : row.type === 'EXPENSE' ? '-' : ''}
                          {formatINR(row.amountNum)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          hasIconOnly
                          renderIcon={TrashCan}
                          iconDescription="Delete Transaction"
                          kind="ghost"
                          size="sm"
                          onClick={() => setDeleteTargetId(row.id)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        open={!!deleteTargetId}
        modalHeading="Delete Transaction?"
        primaryButtonText="Delete"
        secondaryButtonText="Cancel"
        danger
        onRequestClose={() => setDeleteTargetId(null)}
        onRequestSubmit={handleDelete}
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete this transaction? This will reverse its effect on your bank balance.
        </p>
      </Modal>
    </AppLayout>
  );
}
