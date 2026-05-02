import fs from 'fs';
import * as xlsx from 'xlsx';
import { categorize } from '../categorizer';

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  bank_source: string;
  month: number;
  year: number;
  file_name: string;
}

import { ParseResult } from './icici';

export async function parseHdfcXls(filePath: string): Promise<ParseResult> {
  const fileName = filePath.split(/[\\/]/).pop() || '';
  const dataBuffer = fs.readFileSync(filePath);
  const workbook = xlsx.read(dataBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  const transactions: any[] = [];
  let rawCount = 0;

  for (let i = 22; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;
    
    const col0 = row[0].toString().trim();
    if (col0 === '********' || col0 === '') continue;
    if (col0.toUpperCase().includes('STATEMENT SUMMARY')) break;
    if (col0.includes('---  End Of Statement ---')) break;

    const dateVal = row[0];
    const description = row[1]?.toString() || '';
    const debit = parseFloat(row[4]) || 0;
    const credit = parseFloat(row[5]) || 0;

    if (!dateVal || (!debit && !credit)) continue;

    rawCount++; // This row looks like a transaction row

    let d, m, y;
    try {
      if (typeof dateVal === 'number') {
        const excelDate = new Date((dateVal - 25569) * 86400 * 1000);
        d = excelDate.getDate().toString();
        m = (excelDate.getMonth() + 1).toString();
        y = excelDate.getFullYear().toString();
      } else {
        const dateStr = dateVal.toString();
        if (!dateStr.includes('/')) continue;
        [d, m, y] = dateStr.split('/');
      }

      const fullYear = parseInt(y) < 100 ? 2000 + parseInt(y) : parseInt(y);
      if (fullYear > 2100 || fullYear < 2000) continue;

      const date = `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

      transactions.push({
        date,
        description,
        amount: debit || credit,
        type: debit ? 'debit' : 'credit',
        category: categorize(description),
        bank_source: 'hdfc',
        month: parseInt(m),
        year: fullYear,
        file_name: fileName
      });
    } catch (e) {
      continue;
    }
  }

  return { transactions, rawCount };
}
