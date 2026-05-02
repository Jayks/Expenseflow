import db from './db';
import http from 'http';

const CATEGORIES = ['Salary', 'Rent', 'Food', 'Transport', 'Shopping', 'Utilities', 'Entertainment', 'Health', 'Transfer', 'Investment', 'Tax'];

async function askOllama(description: string): Promise<string> {
  const prompt = `Categorize this bank transaction description into exactly one of these categories: ${CATEGORIES.join(', ')}. 
Description: "${description}"
Return only the category name.`;

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
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const response = json.response.trim();
          const match = CATEGORIES.find(c => response.toLowerCase().includes(c.toLowerCase()));
          resolve(match || 'Other');
        } catch (e) {
          resolve('Other');
        }
      });
    });

    req.on('error', () => resolve('Other'));
    req.write(data);
    req.end();
  });
}

export async function runSmartCategorization() {
  const others = db.prepare("SELECT id, description FROM transactions WHERE category = 'Other'").all();
  if (others.length === 0) return 0;

  const updateStmt = db.prepare('UPDATE transactions SET category = ? WHERE id = ?');
  let count = 0;

  for (const t of others as any[]) {
    const category = await askOllama(t.description);
    const finalCategory = category === 'Other' ? 'Uncategorized' : category;
    
    updateStmt.run(finalCategory, t.id);
    
    if (finalCategory !== 'Uncategorized') {
      count++;
    }
  }

  return count;
}
