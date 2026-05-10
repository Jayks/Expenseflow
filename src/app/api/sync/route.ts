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

    // 1. Sync new files (Parallel Parsing)
    const pendingFiles = files.filter(file => {
      const existing = db.prepare('SELECT id FROM synced_files WHERE file_name = ?').get(file);
      return !existing;
    });

    const parsePromises = pendingFiles.map(async (file) => {
      const filePath = path.join(dataDir, file);
      let parseResult: any = { transactions: [], rawCount: 0 };

      const fileLower = file.toLowerCase();
      try {
        if (fileLower.includes('icici') || fileLower.includes('optransactionhistory')) {
          parseResult = await parseICICI(filePath);
        } else if (fileLower.includes('gpay')) {
          parseResult = await parseGPayPDF(filePath);
        } else if (fileLower.includes('hdfc')) {
          parseResult = await parseHdfcXls(filePath);
        } else {
          return null;
        }

        return { file, parseResult };
      } catch (error: any) {
        console.error(`Failed to parse ${file}:`, error);
        return { file, error: error.message };
      }
    });

    const parsedResults = await Promise.all(parsePromises);

    // 2. Batch Insert to DB (Single Transaction)
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO transactions (date, description, amount, type, category, bank_source, month, year, file_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const logFileStmt = db.prepare('INSERT INTO synced_files (file_name, synced_at) VALUES (?, ?)');

    for (const result of parsedResults) {
      if (!result) continue;
      const { file, parseResult, error } = result as any;

      if (error) {
        results.push({ file, status: 'error', error });
        continue;
      }

      const transactions = parseResult.transactions;
      if (transactions.length > 0 || parseResult.rawCount > 0) {
        let actuallyInserted = 0;

        const insertTransaction = db.transaction((txs: any[]) => {
          for (const t of txs) {
            const date = new Date(t.date);
            const category = t.category || categorize(t.description);
            const info = insertStmt.run(
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
            actuallyInserted += info.changes;
          }
        });

        insertTransaction(transactions);
        totalAdded += actuallyInserted;

        logFileStmt.run(file, new Date().toISOString());
        
        results.push({ 
          file, 
          status: 'success', 
          raw: parseResult.rawCount,
          parsed: transactions.length,
          new: actuallyInserted
        });
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
