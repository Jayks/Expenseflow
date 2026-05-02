import db from './db';

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'gemma3';

export async function askAI(question: string) {
  // 1. Gather context from DB
  const recentTransactions = db.prepare('SELECT * FROM transactions ORDER BY date DESC LIMIT 10').all();
  const summary = db.prepare(`
    SELECT category, SUM(amount) as total 
    FROM transactions 
    WHERE type = 'debit' 
    GROUP BY category
  `).all();

  const context = `
    You are a personal finance assistant. Here is some data from the user's accounts:
    - Total spend by category: ${JSON.stringify(summary)}
    - Recent transactions: ${JSON.stringify(recentTransactions)}
    
    Answer the user's question based on this data. Be concise, professional, and provide actionable insights.
  `;

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt: `${context}\n\nUser Question: ${question}\nAssistant:`,
        stream: false
      })
    });

    if (!response.ok) throw new Error('Ollama not reachable');
    
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('AI Error:', error);
    return "I'm sorry, I couldn't connect to my local intelligence engine (Ollama). Please make sure it's running with the gemma3 model.";
  }
}
