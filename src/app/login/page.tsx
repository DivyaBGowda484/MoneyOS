'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  TextInput,
  Button,
  InlineNotification,
  Tile,
} from '@carbon/react';
import { Login, User } from '@carbon/icons-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('demo@moneyos.in');
  const [password, setPassword] = useState('moneyos123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError('Invalid credentials. You can use demo@moneyos.in / moneyos123');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#161616] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-[#0f62fe] rounded-2xl text-white mb-3 shadow-lg">
            <span className="text-2xl font-black">₹</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">MoneyOS</h1>
          <p className="text-sm text-gray-400 mt-1">Smart Indian Personal Finance & Expense Tracker</p>
        </div>

        <Tile className="!p-6 sm:!p-8 bg-white rounded-xl shadow-2xl border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Sign In</h2>

          {error && (
            <InlineNotification
              kind="error"
              title="Error: "
              subtitle={error}
              className="mb-4 w-full"
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <TextInput
              id="login-email"
              labelText="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <TextInput
              id="login-password"
              labelText="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                kind="primary"
                renderIcon={Login}
                className="w-full flex justify-center"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In to MoneyOS'}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500 bg-gray-50 p-3 rounded">
            <strong>Demo Credentials:</strong>
            <div>Email: <code className="text-blue-600 font-mono">demo@moneyos.in</code></div>
            <div>Password: <code className="text-blue-600 font-mono">moneyos123</code></div>
          </div>
        </Tile>
      </div>
    </div>
  );
}
