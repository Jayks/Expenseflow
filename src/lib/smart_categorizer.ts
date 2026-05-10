import db from './db';
import http from 'http';

const CATEGORIES = ['Salary', 'Rent', 'Food', 'Transport', 'Shopping', 'Utilities', 'Entertainment', 'Health', 'Transfer', 'Investment', 'Tax'];

async function askOllamaBatch(items: {id: number, description: string}[]): Promise<string[]> {
  const descriptions = items.map((t, i) => `${i+1}. ${t.description}`).join('\n');
  const prompt = `Categorize these ${items.length} bank transaction descriptions into exactly one of these categories: ${CATEGORIES.join(', ')}.

Descriptions:
${descriptions}

Return ONLY a comma-separated list of ${items.length} category names in the exact same order as the descriptions above. Do not include numbers or any other text.
Example: Food, Transport, Shopping`;

  return new Promise((resolve) => {
    const data = JSON.stringify({
      model: 'gemma3',
      prompt: prompt,
      stream: false
    });

    const options = {
      hostname: 'localhost',
      port: 11434,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const response = json.response.trim();
          const parts = response.split(',').map((p: string) => p.trim());
          
          const results = items.map((_, i) => {
            const part = parts[i];
            if (!part) return 'Uncategorized';
            const match = CATEGORIES.find(c => part.toLowerCase().includes(c.toLowerCase()));
            return match || 'Uncategorized';
          });
          
          resolve(results);
        } catch (e) {
          resolve(items.map(() => 'Uncategorized'));
        }
      });
    });

    req.on('error', () => resolve(items.map(() => 'Uncategorized')));
    req.write(data);
    req.end();
  });
}

export async function runSmartCategorization() {
  const others = db.prepare("SELECT id, description FROM transactions WHERE category = 'Other'").all() as any[];
  if (others.length === 0) return 0;

  const BATCH_SIZE = 10;
  const updateStmt = db.prepare('UPDATE transactions SET category = ? WHERE id = ?');
  let count = 0;

  for (let i = 0; i < others.length; i += BATCH_SIZE) {
    const chunk = others.slice(i, i + BATCH_SIZE);
    const categories = await askOllamaBatch(chunk);
    
    const updateTransaction = db.transaction((items: any[], cats: string[]) => {
      for (let j = 0; j < items.length; j++) {
        updateStmt.run(cats[j], items[j].id);
        if (cats[j] !== 'Uncategorized') {
          count++;
        }
      }
    });

    updateTransaction(chunk, categories);
  }

  return count;
}
