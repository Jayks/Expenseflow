import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const months = db.prepare(`
      SELECT DISTINCT month, year 
      FROM transactions 
      ORDER BY year DESC, month DESC
    `).all();
    
    return NextResponse.json(months);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch months' }, { status: 500 });
  }
}
