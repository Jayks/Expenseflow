'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, RefreshCw, Settings, Wallet, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'AI Chat', href: '/chat', icon: MessageSquare },
  { name: 'Deep Insights', href: '/insights', icon: TrendingUp },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      alert(`Sync complete: ${data.count} new transactions.`);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <aside className="w-64 h-screen glass-sidebar fixed left-0 top-0 flex flex-col p-6 z-50">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
          ExpenseFlow
        </h1>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
                pathname === item.href 
                  ? "bg-white/10 text-white border border-white/10" 
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                pathname === item.href ? "text-purple-400" : "text-slate-400 group-hover:text-purple-400"
              )} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
        <button 
          onClick={async () => {
            if (!window.confirm('Are you sure you want to delete ALL data and reload from scratch? This will clear all categorizations.')) return;
            try {
              const res = await fetch('/api/reset', { method: 'POST' });
              if (res.ok) {
                alert('Database reset! Please click "Sync Data" on the dashboard to reload.');
                window.location.reload();
              } else {
                alert('Failed to reset database');
              }
            } catch (error) {
              console.error('Reset failed:', error);
            }
          }}
          className="w-full px-4 py-3 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-all text-xs font-bold flex items-center justify-center gap-2 uppercase tracking-wider"
        >
          Reset Database
        </button>
        <p className="text-[10px] text-slate-500 text-center opacity-50">
          ExpenseFlow v1.0
        </p>
      </div>
    </aside>
  );
}
