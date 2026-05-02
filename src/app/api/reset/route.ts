import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST() {
  try {
    // 1. Clear transactions
    db.prepare('DELETE FROM transactions').run();
    
    // 2. Clear synced files history
    db.prepare('DELETE FROM synced_files').run();
    
    // 3. Reset auto-increment if needed (optional but clean)
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('transactions', 'synced_files')").run();

    return NextResponse.json({ success: true, message: 'Database reset successfully' });
  } catch (error: any) {
    console.error('Reset error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
