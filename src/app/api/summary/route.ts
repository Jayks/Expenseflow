import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const filter = searchParams.get('filter');
  const category = searchParams.get('category');

  try {
    let whereClause = "WHERE 1=1";
    let baseWhereClause = "WHERE 1=1";
    const params: any[] = [];
    const baseParams: any[] = [];

    if (filter === 'ytd') {
      const currentYear = new Date().getFullYear();
      whereClause += ' AND year = ?';
      baseWhereClause += ' AND year = ?';
      params.push(currentYear);
      baseParams.push(currentYear);
    } else if (month && year) {
      whereClause += ' AND month = ? AND year = ?';
      baseWhereClause += ' AND month = ? AND year = ?';
      params.push(month, year);
      baseParams.push(month, year);
    }

    const channel = searchParams.get('channel');

    if (channel && channel !== 'All') {
      whereClause += ' AND bank_source = ?';
      baseWhereClause += ' AND bank_source = ?';
      params.push(channel);
      baseParams.push(channel);
    }

    if (category && category !== 'All') {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    // Total Consumption Spend
    const totalSpend = db.prepare(`
      SELECT SUM(amount) as total 
      FROM transactions 
      ${whereClause} 
      AND type = 'debit'
      AND category NOT IN ('Transfer', 'Investment', 'Salary')
    `).get(...params).total || 0;

    // Avg Spent
    const avgSpent = db.prepare(`
      SELECT AVG(amount) as avg 
      FROM transactions 
      ${whereClause} 
      AND type = 'debit'
      AND category NOT IN ('Transfer', 'Investment', 'Salary')
    `).get(...params).avg || 0;

    // Avg Received
    const avgReceived = db.prepare(`
      SELECT AVG(amount) as avg 
      FROM transactions 
      ${whereClause} 
      AND type = 'credit'
    `).get(...params).avg || 0;
    
    // Category Breakdown (Excluding non-consumption, ignoring category filter)
    const categoryBreakdown = db.prepare(`
      SELECT category, SUM(amount) as value 
      FROM transactions 
      ${baseWhereClause}
      AND type = 'debit'
      AND category NOT IN ('Transfer', 'Investment', 'Salary')
      GROUP BY category 
      ORDER BY value DESC
    `).all(...baseParams);

    const fullTotalSpend = db.prepare(`
      SELECT SUM(amount) as total 
      FROM transactions 
      ${baseWhereClause} 
      AND type = 'debit'
      AND category NOT IN ('Transfer', 'Investment', 'Salary')
    `).get(...baseParams).total || 0;

    // Trend Logic (Excluding non-consumption)
    let trend;
    if (month && year && filter !== 'ytd') {
      trend = db.prepare(`
        SELECT SUBSTR(date, 9, 2) as label, SUM(amount) as total 
        FROM transactions 
        ${whereClause} 
        AND type = 'debit'
        AND category NOT IN ('Transfer', 'Investment', 'Salary')
        GROUP BY label 
        ORDER BY label ASC
      `).all(...params);
    } else {
      trend = db.prepare(`
        SELECT month as label, SUM(amount) as total 
        FROM transactions 
        ${whereClause} 
        AND type = 'debit'
        AND category NOT IN ('Transfer', 'Investment', 'Salary')
        GROUP BY label 
        ORDER BY label ASC
      `).all(...params);
    }

    // Top Merchants
    const topMerchants = db.prepare(`
      SELECT description, SUM(amount) as total, COUNT(*) as count
      FROM transactions
      ${whereClause}
      AND type = 'debit'
      AND category NOT IN ('Transfer', 'Investment', 'Salary')
      GROUP BY description
      ORDER BY total DESC
      LIMIT 5
    `).all(...params);

    return NextResponse.json({
      totalSpend,
      fullTotalSpend,
      avgSpent,
      avgReceived,
      categoryBreakdown,
      trend,
      topMerchants
    });
  } catch (error) {
    console.error("Summary API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
}
