import fs from 'fs';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { Transaction } from './icici';

export async function parseGPayPDF(filePath: string): Promise<Transaction[]> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  const text = data.text;
  const fileName = filePath.split(/[\\/]/).pop() || '';

  const transactions: Transaction[] = [];
  
  // GPay pattern:
  // Date (e.g. 05Apr, 2026 or 05Apr,2026)
  // Time
  // "Paid to" / "Received from" / "Self transfer to"
  // ...
  // ₹Amount
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  for (let i = 0; i < lines.length; i++) {
    // More flexible date regex
    const dateMatch = lines[i].match(/(\d{1,2}[A-Z][a-z]{2},\s?\d{4})/);
    if (dateMatch) {
      const dateStr = dateMatch[1];
      let description = "Unknown";
      let amount = 0;
      let type: 'debit' | 'credit' = 'debit';
      
      for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
        const line = lines[j];
        if (line.includes('Paidto')) {
          description = line.replace('Paidto', '').trim();
          type = 'debit';
        } else if (line.includes('Receivedfrom')) {
          description = line.replace('Receivedfrom', '').trim();
          type = 'credit';
        } else if (line.includes('Selftransferto')) {
          description = line.replace('Selftransferto', '').trim();
          type = 'debit'; // Self transfer is usually a debit from the source
        }
        
        if (line.startsWith('₹')) {
          const amtStr = line.replace('₹', '').replace(/,/g, '').trim();
          amount = parseFloat(amtStr);
          break; 
        }
      }
      
      if (amount > 0) {
        transactions.push({
          date: parseGPayDate(dateStr),
          description: description,
          amount: amount,
          type: type,
          bank_source: 'gpay',
          file_name: fileName
        });
      }
    }
  }

  return transactions;
}

function parseGPayDate(dateStr: string): string {
  // 05Apr, 2026 or 05Apr,2026 or 3Nov, 2025
  const cleanStr = dateStr.replace(',', ' ');
  const date = new Date(cleanStr);
  if (isNaN(date.getTime())) {
    // Try to handle 3Nov (missing leading zero)
    return new Date().toISOString().split('T')[0];
  }
  return date.toISOString().split('T')[0];
}
