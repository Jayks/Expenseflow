import fs from 'fs';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import * as xlsx from 'xlsx';

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  bank_source: string;
  file_name: string;
}

export async function parseICICI(filePath: string): Promise<Transaction[]> {
  const fileName = filePath.split(/[\\/]/).pop() || '';
  
  if (fileName.toLowerCase().endsWith('.xls') || fileName.toLowerCase().endsWith('.xlsx')) {
    return parseICICIXLS(filePath);
  } else {
    return parseICICIPDF(filePath);
  }
}

async function parseICICIXLS(filePath: string): Promise<Transaction[]> {
  const dataBuffer = fs.readFileSync(filePath);
  const workbook = xlsx.read(dataBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  const fileName = filePath.split(/[\\/]/).pop() || '';

  const transactions: Transaction[] = [];

  for (const row of rows) {
    // Check if it looks like a data row (Index 2 should be a date DD/MM/YYYY)
    if (!row || row.length < 8) continue;
    
    const dateStr = row[2];
    if (typeof dateStr !== 'string' || !dateStr.includes('/')) continue;
    
    const description = row[5];
    const withdrawal = parseFloat(String(row[6]).replace(/,/g, '')) || 0;
    const deposit = parseFloat(String(row[7]).replace(/,/g, '')) || 0;

    if (withdrawal > 0) {
      transactions.push({
        date: formatDateXLS(dateStr),
        description: String(description).trim(),
        amount: withdrawal,
        type: 'debit',
        bank_source: 'icici',
        file_name: fileName
      });
    } else if (deposit > 0) {
      transactions.push({
        date: formatDateXLS(dateStr),
        description: String(description).trim(),
        amount: deposit,
        type: 'credit',
        bank_source: 'icici',
        file_name: fileName
      });
    }
  }

  return transactions;
}

export async function parseICICIPDF(filePath: string): Promise<Transaction[]> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  const text = data.text;
  const fileName = filePath.split(/[\\/]/).pop() || '';

  const transactions: Transaction[] = [];
  const rowRegex = /(\d{2}-\d{2}-\d{4})\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/g;
  
  let match;
  while ((match = rowRegex.exec(text)) !== null) {
    const [_, date, description, withdrawal, deposit] = match;
    const withdrawalAmt = parseFloat(withdrawal.replace(/,/g, ''));
    const depositAmt = parseFloat(deposit.replace(/,/g, ''));
    
    if (withdrawalAmt > 0) {
      transactions.push({
        date: formatDatePDF(date),
        description: description.trim(),
        amount: withdrawalAmt,
        type: 'debit',
        bank_source: 'icici',
        file_name: fileName
      });
    } else if (depositAmt > 0) {
      transactions.push({
        date: formatDatePDF(date),
        description: description.trim(),
        amount: depositAmt,
        type: 'credit',
        bank_source: 'icici',
        file_name: fileName
      });
    }
  }

  return transactions;
}

function formatDateXLS(dateStr: string): string {
  // DD/MM/YYYY to YYYY-MM-DD
  const [d, m, y] = dateStr.split('/');
  return `${y}-${m}-${d}`;
}

function formatDatePDF(dateStr: string): string {
  // DD-MM-YYYY to YYYY-MM-DD
  const [d, m, y] = dateStr.split('-');
  return `${y}-${m}-${d}`;
}
