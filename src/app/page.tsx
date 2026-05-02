'use client';

import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, CreditCard, PieChart, TrendingUp, Zap, Calendar, Filter, ChevronLeft, ChevronRight, ShoppingBag, Wallet, Download, RefreshCw, CheckCircle2, AlertCircle, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart as RePieChart, 
  Pie, 
  Cell,
  CartesianGrid
} from 'recharts';

const COLORS = ['#9333ea', '#06b6d4', '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CATEGORIES = ['All', 'Salary', 'Rent', 'Food', 'Transport', 'Shopping', 'Utilities', 'Entertainment', 'Health', 'Transfer', 'Investment', 'Tax', 'Education', 'Credit Card', 'Uncategorized', 'Other'];

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, totalPages: 1, total: 0 });
  const [availableMonths, setAvailableMonths] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedChannel, setSelectedChannel] = useState<string>('All');
  const [isYTD, setIsYTD] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showPathModal, setShowPathModal] = useState(false);
  const [syncPath, setSyncPath] = useState('');

  useEffect(() => {
    const savedPath = localStorage.getItem('expenseSyncPath');
    if (savedPath) setSyncPath(savedPath);
  }, []);

  useEffect(() => {
    async function fetchMonths() {
      try {
        const res = await fetch('/api/months');
        const data = await res.json();
        setAvailableMonths(data);
        if (data.length > 0) {
          setSelectedMonth(`${data[0].month}-${data[0].year}`);
        }
      } catch (error) {
        console.error('Failed to fetch months:', error);
      }
    }
    fetchMonths();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    let query = '';
    if (isYTD) {
      query = `filter=ytd`;
    } else if (selectedMonth) {
      const [m, y] = selectedMonth.split('-');
      query = `month=${m}&year=${y}`;
    }
    
    if (selectedCategory !== 'All') {
      query += `&category=${selectedCategory}`;
    }

    if (selectedChannel !== 'All') {
      query += `&channel=${selectedChannel}`;
    }
    
    query += `&page=${currentPage}&limit=50`;

    try {
      const [sumRes, transRes] = await Promise.all([
        fetch(`/api/summary?${query}`),
        fetch(`/api/transactions?${query}`)
      ]);
      const sumData = await sumRes.json();
      const transData = await transRes.json();
      setSummary(sumData);
      setTransactions(transData.transactions || []);
      setPagination(transData.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (error) {
      console.error('Fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, isYTD, selectedCategory, selectedChannel, currentPage]);

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to delete ALL data and reload from scratch? This will clear all categorizations.')) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        setSyncResult(null);
        await handleSync(syncPath); // Re-sync after reset
      } else {
        alert('Failed to reset database');
      }
    } catch (error) {
      console.error('Reset failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (pathOverride?: string) => {
    const finalPath = pathOverride || syncPath;
    if (finalPath) {
      localStorage.setItem('expenseSyncPath', finalPath);
    }
    
    setShowPathModal(false);
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/sync', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: finalPath || undefined })
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Sync server error:', errorText);
        alert(`Sync failed (Server Error): ${res.status}`);
        return;
      }
      const data = await res.json();
      setSyncResult(data);
      setShowSyncModal(true);
      fetchData();
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed: Network error or server is down.');
    } finally {
      setSyncing(false);
    }
  };

  const stats = [
    { 
      name: 'Total Spent', 
      value: `₹${summary?.totalSpend?.toLocaleString() || 0}`, 
      icon: CreditCard, 
      color: 'text-purple-400' 
    },
    { 
      name: 'Avg. Spent', 
      value: `₹${Math.round(summary?.avgSpent || 0).toLocaleString()}`, 
      icon: TrendingUp, 
      color: 'text-rose-400' 
    },
    { 
      name: 'Avg. Received', 
      value: `₹${Math.round(summary?.avgReceived || 0).toLocaleString()}`, 
      icon: Download, 
      color: 'text-emerald-400' 
    },
    { 
      name: 'Top Category', 
      value: summary?.categoryBreakdown?.[0]?.category || 'N/A', 
      sub: `₹${summary?.categoryBreakdown?.[0]?.value?.toLocaleString() || 0}`, 
      icon: PieChart, 
      color: 'text-teal-400' 
    },
    { 
      name: 'Total Items', 
      value: `${pagination.total}`, 
      sub: 'Bank entries', 
      icon: Zap, 
      color: 'text-yellow-400' 
    },
  ];

  return (
    <div className="space-y-8 pb-12 relative">
      <AnimatePresence>
        {showSyncModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSyncModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="relative w-full max-w-lg glass-card p-8 border border-white/20 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setShowSyncModal(false)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white font-outfit">Sync Complete</h3>
                  <p className="text-slate-400 text-sm">Your financial data is now up to date.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Synced</p>
                  <p className="text-2xl font-bold text-white">{syncResult?.added || 0}</p>
                  <p className="text-[10px] text-slate-400">New records</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">De-duplicated</p>
                  <p className="text-2xl font-bold text-rose-400">{syncResult?.duplicatesRemoved || 0}</p>
                  <p className="text-[10px] text-slate-400">Redundant entries</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">AI Classified</p>
                  <p className="text-2xl font-bold text-purple-400">{syncResult?.aiCategorized || 0}</p>
                  <p className="text-[10px] text-slate-400">Smart inferences</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Files</p>
                  <p className="text-2xl font-bold text-cyan-400">{syncResult?.details?.length || 0}</p>
                  <p className="text-[10px] text-slate-400">Processed sources</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Processed Sources</p>
                {syncResult?.details?.map((f: any) => (
                  <div key={f.file} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium text-slate-300 truncate max-w-[200px]">{f.file}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                      Success
                    </span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setShowSyncModal(false)}
                className="w-full mt-8 py-4 rounded-2xl bg-white text-slate-950 font-bold hover:bg-slate-200 transition-colors shadow-lg shadow-white/10"
              >
                Dismiss
              </button>
            </motion.div>
          </div>
        )}
        
        {showPathModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-lg p-8 relative"
            >
              <button 
                onClick={() => setShowPathModal(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="mb-6">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4 border border-cyan-500/20">
                  <Wallet className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-bold font-outfit text-white">Sync Configuration</h3>
                <p className="text-slate-400 text-sm mt-2">Specify the absolute path to the folder containing your bank statements on this computer.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Local Folder Path</label>
                  <input 
                    type="text" 
                    value={syncPath}
                    onChange={(e) => setSyncPath(e.target.value)}
                    placeholder="e.g. E:\Downloads\FinanceData"
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors font-mono"
                  />
                </div>
                
                <p className="text-[10px] text-slate-500">
                  Leave blank to use the default <code>Data/</code> directory in the project workspace.
                </p>
              </div>

              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setShowPathModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-slate-300 font-bold hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleSync(syncPath)}
                  className="flex-1 py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
                >
                  Start Sync
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
        <div>
          <h2 className="text-4xl font-bold font-outfit tracking-tight text-white">Financial Hub</h2>
          <p className="text-slate-400 mt-1">Real-time spend analysis and historical insights.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col items-center gap-2">
            <button 
              disabled={syncing || loading}
              onClick={() => setShowPathModal(true)}
              className={`px-6 py-2 rounded-xl border transition-all text-sm font-bold flex items-center gap-2 ${
                syncing 
                ? 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed' 
                : 'bg-white text-slate-950 border-white hover:bg-slate-200 shadow-lg shadow-white/10'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Synchronizing...' : 'Sync Data'}
            </button>
            
            {syncResult && !syncing && (
              <button 
                onClick={() => setShowSyncModal(true)}
                className="text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-widest flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3" /> View Sync Report
              </button>
            )}
          </div>

          <button 
            onClick={() => { setIsYTD(!isYTD); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl border transition-all text-sm font-bold flex items-center gap-2 ${
              isYTD 
              ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20' 
              : 'glass-card border-white/10 text-slate-400 hover:border-purple-500/50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            YTD
          </button>

          <div className={`flex items-center gap-3 glass-card px-4 py-2 border border-white/10 ${isYTD ? 'opacity-50 pointer-events-none' : ''}`}>
            <Calendar className="w-4 h-4 text-purple-400" />
            <select 
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setCurrentPage(1); }}
              className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer outline-none min-w-[120px] text-white"
            >
              {availableMonths.map((m) => (
                <option key={`${m.month}-${m.year}`} value={`${m.month}-${m.year}`} className="bg-slate-900">
                  {MONTH_NAMES[m.month - 1]} {m.year}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 glass-card px-4 py-2 border border-white/10">
            <Filter className="w-4 h-4 text-cyan-400" />
            <select 
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer outline-none min-w-[100px] text-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 glass-card px-4 py-2 border border-white/10">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <select 
              value={selectedChannel}
              onChange={(e) => { setSelectedChannel(e.target.value); setCurrentPage(1); }}
              className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer outline-none min-w-[80px] text-white"
            >
              {['All', 'gpay', 'icici', 'hdfc'].map((channel) => (
                <option key={channel} value={channel} className="bg-slate-900">
                  {channel === 'All' ? 'All Channels' : channel.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={stat.name} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            title={`${stat.name}: ${stat.value}`}
            className="glass-card p-5 group hover:border-purple-500/50 transition-all relative overflow-hidden cursor-default"
          >
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className={`p-3 rounded-xl bg-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{stat.name}</p>
              <h3 className="text-xl font-bold mt-1 text-white">{stat.value}</h3>
              {stat.sub && <p className="text-[10px] text-slate-500 mt-1">{stat.sub}</p>}
            </div>
            <div className={`absolute -right-4 -bottom-4 w-20 h-20 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity bg-current ${stat.color}`} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-8 min-h-[400px]">
          <h4 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
            {isYTD ? 'Monthly Spending Trend' : 'Daily Spending Trend'} <TrendingUp className="w-4 h-4 text-purple-400" />
          </h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary?.trend}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748b', fontSize: 10}}
                  tickFormatter={(val) => isYTD ? MONTH_NAMES[val-1] : `${val}`}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px'}}
                  itemStyle={{color: '#9333ea'}}
                  formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Spend']}
                  labelFormatter={(val: any) => isYTD ? MONTH_NAMES[val-1] : `Day ${val}`}
                />
                <Area type="monotone" dataKey="total" stroke="#9333ea" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="glass-card p-8 min-h-[400px] flex flex-col">
          <h4 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
            Top Merchants <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </h4>
          <div className="space-y-4 flex-1">
            {summary?.topMerchants?.map((m: any, i: number) => (
              <div 
                key={m.description} 
                title={m.description}
                className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-colors group cursor-help"
              >
                <div className="truncate max-w-[150px]">
                  <p className="text-sm font-bold text-slate-200 truncate group-hover:text-emerald-400 transition-colors">{m.description}</p>
                  <p className="text-[10px] text-slate-500">{m.count} transactions</p>
                </div>
                <p className="text-sm font-mono font-bold text-white">₹{m.total.toLocaleString()}</p>
              </div>
            ))}
            {(!summary?.topMerchants || summary.topMerchants.length === 0) && (
              <p className="text-slate-500 text-center py-10">No data available</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-8 flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-xl font-bold flex items-center gap-2 text-white">
              Spending Distribution <PieChart className="w-4 h-4 text-cyan-400" />
            </h4>
            {selectedCategory !== 'All' && (
              <button 
                onClick={() => setSelectedCategory('All')}
                className="text-xs font-bold px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors border border-cyan-500/20"
              >
                Show All Categories
              </button>
            )}
          </div>
          <div className="flex-1 relative min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={summary?.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={(data) => {
                    if (data && data.category) {
                      setSelectedCategory(data.category);
                      setCurrentPage(1);
                    }
                  }}
                  className="cursor-pointer focus:outline-none"
                >
                  {summary?.categoryBreakdown?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px'}}
                  formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Amount']}
                />
              </RePieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total</p>
              <p className="text-2xl font-bold text-white font-mono">₹{summary?.fullTotalSpend?.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {summary?.categoryBreakdown?.map((entry: any, i: number) => (
              <div 
                key={entry.category} 
                onClick={() => { setSelectedCategory(entry.category); setCurrentPage(1); }}
                className={`flex items-center gap-2 text-[10px] group cursor-pointer p-1.5 rounded-lg transition-colors ${
                  selectedCategory === entry.category ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className={`truncate transition-colors ${selectedCategory === entry.category ? 'text-white font-bold' : 'group-hover:text-white'}`}>
                  {entry.category}
                </span>
                <span className={`ml-auto font-mono ${selectedCategory === entry.category ? 'text-white font-bold' : 'text-slate-500'}`}>
                  {Math.round((entry.value / (summary.fullTotalSpend || 1)) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-8 flex flex-col justify-center items-center text-center space-y-6 bg-gradient-to-br from-purple-500/5 to-transparent">
          <div className="p-6 rounded-3xl bg-purple-500/10 border border-purple-500/20 shadow-2xl shadow-purple-500/10">
            <TrendingUp className="w-12 h-12 text-purple-400" />
          </div>
          <div>
            <h5 className="text-2xl font-bold text-white font-outfit">Smart Financial Insights</h5>
            <p className="text-slate-400 mt-2 max-w-xs text-sm leading-relaxed">
              Your spending on <span className="text-purple-400 font-bold">{summary?.categoryBreakdown?.[0]?.category}</span> accounts for 
              <span className="text-white font-bold ml-1">{Math.round((summary?.categoryBreakdown?.[0]?.value / (summary?.totalSpend || 1)) * 100)}%</span> of your consumption.
            </p>
          </div>
          <div className="flex gap-2 mt-4">
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
              {summary?.totalSpend > 50000 ? 'High Burn Rate' : 'Healthy Spend'}
            </span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
              AI Classified
            </span>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.01]">
          <h4 className="text-xl font-bold text-white">Transaction History</h4>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-white">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-1 rounded-md hover:bg-white/5 disabled:opacity-20 transition-opacity"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold px-2 text-slate-400">
                Page {currentPage} of {pagination.totalPages}
              </span>
              <button 
                disabled={currentPage === pagination.totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-1 rounded-md hover:bg-white/5 disabled:opacity-20 transition-opacity"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <span className="text-xs text-slate-500 font-medium px-3 py-1 rounded-full bg-white/5 border border-white/10">
              {pagination.total} items
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto relative min-h-[600px]">
          {loading && (
            <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] z-20 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            </div>
          )}
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 text-[10px] uppercase tracking-widest bg-white/[0.01] border-b border-white/5">
                <th className="px-8 py-5 font-bold">Description</th>
                <th className="px-8 py-5 font-bold">Category</th>
                <th className="px-8 py-5 font-bold">Channel</th>
                <th className="px-8 py-5 font-bold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-white/5 transition-opacity duration-300 ${loading ? 'opacity-40' : 'opacity-100'}`}>
              <AnimatePresence mode="wait">
                {transactions.map((t, i) => (
                  <motion.tr 
                    key={t.id} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="px-8 py-5" title={t.description}>
                      <div className="font-semibold text-sm text-slate-200 group-hover:text-purple-400 transition-colors truncate max-w-sm">{t.description}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{t.date}</div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                        {t.category}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <div className={`w-1.5 h-1.5 rounded-full ${t.bank_source === 'icici' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                        {t.bank_source.toUpperCase()}
                      </div>
                    </td>
                    <td className={`px-8 py-5 text-right font-mono font-bold text-sm ${t.type === 'debit' ? 'text-white' : 'text-emerald-400'}`}>
                      {t.type === 'debit' ? '-' : '+'}₹{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          
          {/* Bottom Pagination */}
          <div className="p-6 border-t border-white/5 flex justify-center items-center bg-white/[0.01]">
            <div className="flex items-center gap-4 text-white">
              <button 
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(prev => prev - 1);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 disabled:opacity-20 transition-all text-sm font-bold"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              
              <span className="text-xs font-bold text-slate-400 min-w-[100px] text-center">
                Page {currentPage} / {pagination.totalPages}
              </span>

              <button 
                disabled={currentPage === pagination.totalPages}
                onClick={() => {
                  setCurrentPage(prev => prev + 1);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/50 disabled:opacity-20 transition-all text-sm font-bold"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
