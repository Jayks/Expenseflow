import db from './db';

export function resolveDuplicates() {
  console.log("Resolving cross-channel duplicates...");
  
  const allTxs = db.prepare(`
    SELECT id, description, bank_source, amount, date 
    FROM transactions 
    ORDER BY date DESC
  `).all();

  const toDelete = [];
  const processedIds = new Set();

  for (let i = 0; i < allTxs.length; i++) {
    if (processedIds.has(allTxs[i].id)) continue;

    for (let j = i + 1; j < allTxs.length; j++) {
      if (processedIds.has(allTxs[j].id)) continue;

      const t1: any = allTxs[i];
      const t2: any = allTxs[j];

      if (t1.amount !== t2.amount) continue;

      const d1 = new Date(t1.date).getTime();
      const d2 = new Date(t2.date).getTime();
      const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
      if (diffDays > 2) continue;

      if (t1.bank_source === t2.bank_source) continue;

      const desc1 = t1.description.toLowerCase();
      const desc2 = t2.description.toLowerCase();
      const words1 = desc1.split(/[^a-z0-9]/).filter((w: string) => w.length > 4);
      const words2 = desc2.split(/[^a-z0-9]/).filter((w: string) => w.length > 4);
      
      const isMatch = words1.some((w: string) => desc2.includes(w)) || words2.some((w: string) => desc1.includes(w));
      
      if (isMatch) {
        // Prefer GPAY for description, delete the bank source one
        let idToDelete;
        if (t1.bank_source === 'gpay') {
          idToDelete = t2.id;
        } else if (t2.bank_source === 'gpay') {
          idToDelete = t1.id;
        } else {
          idToDelete = t2.id;
        }
        toDelete.push(idToDelete);
        processedIds.add(t1.id);
        processedIds.add(t2.id);
      }
    }
  }

  if (toDelete.length > 0) {
    const deleteStmt = db.prepare('DELETE FROM transactions WHERE id = ?');
    const deleteMany = db.transaction((ids: any[]) => {
      for (const id of ids) deleteStmt.run(id);
    });
    deleteMany(toDelete);
    return toDelete.length;
  }
  return 0;
}
