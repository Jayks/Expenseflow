import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import db from '@/lib/db';
import { parseICICI } from '@/lib/parsers/icici';
import { parseGPayPDF } from '@/lib/parsers/gpay';
import { parseHdfcXls } from '@/lib/parsers/hdfc';
import { categorize } from '@/lib/categorizer';
import { resolveDuplicates } from '@/lib/deduplicator';
import { runSmartCategorization } from '@/lib/smart_categorizer';

export async function POST(req: Request) {
  try {
    let folderPath = null;
    try {
      const body = await req.json();
      folderPath = body.folderPath;
    } catch (e) {
      // Body might be empty
    }

    const dataDir = folderPath 
      ? folderPath 
      : path.join(process.cwd(), 'Data');
    
    if (!fs.existsSync(dataDir)) {
      return NextResponse.json({ error: `Folder not found at: ${dataDir}` }, { status: 404 });
    }

    const files = fs.readdirSync(dataDir).filter(f => 
      f.endsWith('.pdf') || f.endsWith('.xls') || f.endsWith('.xlsx')
    );
    let totalAdded = 0;
    const results = [];

    // 1. Sync new files
    for (const file of files) {
      try {
        const existing = db.prepare('SELECT id FROM synced_files WHERE file_name = ?').get(file);
        if (existing) continue;

        const filePath = path.join(dataDir, file);
        let transactions: any[] = [];

        const fileLower = file.toLowerCase();
        if (fileLower.includes('icici') || fileLower.includes('optransactionhistory')) {
          transactions = await parseICICI(filePath);
        } else if (fileLower.includes('gpay')) {
          transactions = await parseGPayPDF(filePath);
        } else if (fileLower.includes('hdfc')) {
          transactions = await parseHdfcXls(filePath);
        } else {
          continue;
        }
        
        if (transactions.length > 0) {
          const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO transactions (date, description, amount, type, category, bank_source, month, year, file_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          const insertTransaction = db.transaction((txs: any[]) => {
            for (const t of txs) {
              const date = new Date(t.date);
              const category = t.category || categorize(t.description);
              insertStmt.run(
                t.date,
                t.description,
                t.amount,
                t.type,
                category,
                t.bank_source,
                date.getMonth() + 1,
                date.getFullYear(),
                file
              );
            }
          });

          insertTransaction(transactions);
          totalAdded += transactions.length;

          db.prepare('INSERT INTO synced_files (file_name, synced_at) VALUES (?, ?)').run(
            file,
            new Date().toISOString()
          );
          
          results.push({ file, status: 'success', count: transactions.length });
        }
      } catch (error: any) {
        console.error(`Failed to process ${file}:`, error);
        results.push({ file, status: 'error', error: error.message });
      }
    }

    // 2. Resolve Duplicates
    const duplicatesRemoved = resolveDuplicates();

    // 3. Run AI Categorization in the background
    runSmartCategorization().catch(e => console.error('Background AI error:', e));

    return NextResponse.json({ 
      success: true, 
      added: totalAdded, 
      duplicatesRemoved,
      aiCategorized: 'Running in background',
      details: results 
    });
  } catch (globalError: any) {
    console.error("Global Sync Error:", globalError);
    return NextResponse.json({ error: globalError.message }, { status: 500 });
  }
}
