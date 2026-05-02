'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, AlertTriangle, CalendarDays, Wallet, AlertCircle } from 'lucide-react';

const PIE_COLORS = ['#3b82f6', '#ec4899']; // Blue for Weekday, Pink for Weekend

export default function DeepInsights() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch('/api/insights');
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error('Failed to load insights:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const pieData = [
    { name: 'Weekday Spend', value: data?.behavioral?.weekday || 0 },
    { name: 'Weekend Spend', value: data?.behavioral?.weekend || 0 }
  ];

  const savingsRate = data?.cashFlow?.length > 0 
    ? ((data.cashFlow[data.cashFlow.length - 1].income - data.cashFlow[data.cashFlow.length - 1].spend) / Math.max(1, data.cashFlow[data.cashFlow.length - 1].income)) * 100 
    : 0;

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col xl:flex-row justify-between items-start gap-6">
        <div>
          <h2 className="text-4xl font-bold font-outfit tracking-tight text-white flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-400" />
            Deep Insights
          </h2>
          <p className="text-slate-400 mt-1">Advanced financial analytics and behavioral tracking.</p>
        </div>
      </header>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Latest Savings Rate</p>
          <div className="flex items-baseline gap-2">
            <h3 className={`text-3xl font-bold font-mono ${savingsRate > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {savingsRate > 0 ? '+' : ''}{savingsRate.toFixed(1)}%
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Of total income</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Upcoming Fixed Costs</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold font-mono text-cyan-400">
              ₹{(data?.totalFixedCosts || 0).toLocaleString()}
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Predicted monthly recurring</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 md:col-span-2">
           <div className="flex items-center gap-3">
             <div className="p-3 bg-rose-500/10 rounded-xl">
               <AlertTriangle className="w-6 h-6 text-rose-400" />
             </div>
             <div>
               <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">Anomalies Detected</p>
               <h3 className="text-xl font-bold text-white">{data?.anomalies?.length || 0} unusual transactions</h3>
             </div>
           </div>
        </motion.div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Cash Flow */}
        <div className="glass-card p-8 lg:col-span-2 flex flex-col min-h-[400px]">
          <h4 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
            Cash Flow <Wallet className="w-4 h-4 text-emerald-400" />
          </h4>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.cashFlow || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px'}}
                  formatter={(val: number) => [`₹${val.toLocaleString()}`]}
                  cursor={{fill: '#ffffff05'}}
                />
                <Legend iconType="circle" />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spend" name="Spend" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Behavioral */}
        <div className="glass-card p-8 flex flex-col min-h-[400px]">
          <h4 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
            Behavioral Spends <CalendarDays className="w-4 h-4 text-purple-400" />
          </h4>
          <div className="flex-1 relative min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px'}}
                  formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Amount']}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-col gap-3">
             {pieData.map((d, i) => (
               <div key={d.name} className="flex justify-between items-center text-sm">
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full" style={{backgroundColor: PIE_COLORS[i]}}></div>
                   <span className="text-slate-300">{d.name}</span>
                 </div>
                 <span className="font-bold font-mono text-white">₹{d.value.toLocaleString()}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recurring Costs */}
        <div className="glass-card p-8 min-h-[400px]">
          <h4 className="text-xl font-bold mb-6 text-white">Predicted Fixed Costs</h4>
          <div className="space-y-4">
            {data?.recurring?.length === 0 && <p className="text-slate-500">No recurring costs identified yet.</p>}
            {data?.recurring?.map((item: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <p className="font-bold text-slate-200">{item.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{item.count} consecutive periods</p>
                </div>
                <p className="font-mono font-bold text-cyan-400">₹{Math.round(item.avgAmount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Anomalies */}
        <div className="glass-card p-8 min-h-[400px]">
          <h4 className="text-xl font-bold mb-6 text-rose-400 flex items-center gap-2">
             <AlertCircle className="w-5 h-5" /> Spending Anomalies
          </h4>
          <div className="space-y-4">
            {data?.anomalies?.length === 0 && <p className="text-emerald-500 font-bold">No unusual spending detected!</p>}
            {data?.anomalies?.map((item: any, i: number) => (
              <div key={i} className="flex justify-between items-center p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <div className="max-w-[60%]">
                  <p className="font-bold text-slate-200 truncate">{item.description}</p>
                  <div className="flex gap-2 mt-1">
                     <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-slate-400">{item.category}</span>
                     <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 uppercase">Avg: ₹{Math.round(item.avgAmount)}</span>
                  </div>
                </div>
                <p className="font-mono font-bold text-rose-400 text-lg">₹{item.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
