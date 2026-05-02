import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    // 1. Cash Flow (Income vs Spend per month)
    const cashFlowData = db.prepare(`
      SELECT 
        year, 
        month,
        SUM(CASE WHEN type = 'credit' AND category != 'Transfer' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'debit' AND category NOT IN ('Transfer', 'Investment', 'Salary') THEN amount ELSE 0 END) as spend
      FROM transactions
      GROUP BY year, month
      ORDER BY year ASC, month ASC
    `).all();

    // Format for Recharts
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const cashFlow = cashFlowData.map((d: any) => ({
      label: `${MONTH_NAMES[d.month - 1]} ${d.year}`,
      income: d.income || 0,
      spend: d.spend || 0,
    }));

    // 2. Behavioral Spends (Day of Week)
    const dayOfWeekData = db.prepare(`
      SELECT 
        strftime('%w', date) as day_of_week,
        SUM(amount) as total
      FROM transactions
      WHERE type = 'debit' AND category NOT IN ('Transfer', 'Investment')
      GROUP BY day_of_week
    `).all();

    const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const behavior = dayOfWeekData.map((d: any) => ({
      name: daysMap[parseInt(d.day_of_week)],
      value: d.total || 0
    }));

    // Grouping into Weekend vs Weekday
    const weekendSpend = behavior.filter(b => b.name === 'Saturday' || b.name === 'Sunday').reduce((sum, b) => sum + b.value, 0);
    const weekdaySpend = behavior.filter(b => b.name !== 'Saturday' && b.name !== 'Sunday').reduce((sum, b) => sum + b.value, 0);

    // 3. Recurring Transactions (Fixed Costs)
    const allDebits = db.prepare(`
      SELECT description, amount, date 
      FROM transactions 
      WHERE type = 'debit' AND category NOT IN ('Transfer', 'Investment')
      ORDER BY date DESC
    `).all();

    const merchantGroups: Record<string, number[]> = {};
    for (const t of allDebits as any[]) {
      // Simplistic grouping by base name (e.g. NETFLIX from "NETFLIX ENTERTAINMENT")
      const baseName = t.description.substring(0, 15).toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      if (!merchantGroups[baseName]) merchantGroups[baseName] = [];
      merchantGroups[baseName].push(t.amount);
    }

    const recurring: any[] = [];
    let totalFixedCosts = 0;
    
    for (const [name, amounts] of Object.entries(merchantGroups)) {
      if (amounts.length >= 2) {
        // Check if amounts are somewhat consistent (standard deviation is low)
        const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const isConsistent = amounts.every(amt => Math.abs(amt - avg) / avg < 0.1); // within 10%
        if (isConsistent && avg > 100) {
          recurring.push({ name: name.toUpperCase(), avgAmount: avg, count: amounts.length });
          totalFixedCosts += avg; // Add average monthly cost
        }
      }
    }
    
    // Sort by amount descending, limit top 10
    recurring.sort((a, b) => b.avgAmount - a.avgAmount);

    // 4. Anomaly Detection (Sensitive Threshold)
    const categoryAverages = db.prepare(`
      SELECT category, AVG(amount) as avg_amount, COUNT(amount) as count
      FROM transactions
      WHERE type = 'debit' AND category NOT IN ('Transfer', 'Investment')
      GROUP BY category
    `).all();

    const anomalies: any[] = [];
    const catMap = new Map(categoryAverages.map((c: any) => [c.category, c]));

    const recentDebits = db.prepare(`
      SELECT id, date, description, amount, category 
      FROM transactions 
      WHERE type = 'debit' AND category NOT IN ('Transfer', 'Investment')
      ORDER BY date DESC LIMIT 100
    `).all();

    for (const t of recentDebits as any[]) {
      const stats: any = catMap.get(t.category);
      if (stats && stats.count > 5) {
        // Sensitive Anomaly: 1.5x the average for that category and > ₹2000
        if (t.amount > stats.avg_amount * 1.5 && t.amount > 2000) {
          anomalies.push({
            id: t.id,
            date: t.date,
            description: t.description,
            amount: t.amount,
            category: t.category,
            avgAmount: stats.avg_amount
          });
        }
      }
    }

    // Limit anomalies to top 10 largest
    anomalies.sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      cashFlow,
      behavioral: {
        raw: behavior,
        weekend: weekendSpend,
        weekday: weekdaySpend
      },
      recurring: recurring.slice(0, 10),
      totalFixedCosts,
      anomalies: anomalies.slice(0, 10)
    });
  } catch (error) {
    console.error("Insights API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
  }
}
