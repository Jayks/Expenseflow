import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const filter = searchParams.get('filter');
  const category = searchParams.get('category');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (filter === 'ytd') {
      const currentYear = new Date().getFullYear();
      whereClause += ' AND year = ?';
      params.push(currentYear);
    } else if (month && year) {
      whereClause += ' AND month = ? AND year = ?';
      params.push(month, year);
    }

    const channel = searchParams.get('channel');

    if (category && category !== 'All') {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    if (channel && channel !== 'All') {
      whereClause += ' AND bank_source = ?';
      params.push(channel);
    }

    const transactions = db.prepare(`
      SELECT * FROM transactions 
      ${whereClause}
      ORDER BY date DESC 
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM transactions 
      ${whereClause}
    `).get(...params).count;

    return NextResponse.json({
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Transactions API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
