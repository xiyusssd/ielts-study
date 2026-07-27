import fs from 'fs';
import path from 'path';

const TARGET = 'lib/assessment/data/cambridge-reading.json';
const SRC_DIR = '/tmp/c1112-reading';

const existing = JSON.parse(fs.readFileSync(TARGET, 'utf8'));
const existingIds = new Set(existing.map(p => p.id));

const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.json')).sort();
let added = 0, skipped = 0;
const toAdd = [];
for (const f of files) {
  const p = JSON.parse(fs.readFileSync(path.join(SRC_DIR, f), 'utf8'));
  if (existingIds.has(p.id)) { console.log('跳过(已存在):', p.id); skipped++; continue; }
  toAdd.push(p); added++;
}

// 合并后按 id 排序(c11 < c12 < c13...)
const merged = [...existing, ...toAdd].sort((a, b) => a.id.localeCompare(b.id));

fs.writeFileSync(TARGET, JSON.stringify(merged, null, 1) + '\n');
console.log(`\n新增 ${added} 篇, 跳过 ${skipped} 篇。合并后共 ${merged.length} 篇。`);
console.log('前3:', merged.slice(0,3).map(p=>p.id).join(', '));
console.log('后3:', merged.slice(-3).map(p=>p.id).join(', '));
