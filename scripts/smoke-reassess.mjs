// 复现"重复测试"问题：
// 1) 完成一次完整评估
// 2) 再单独重测「词汇」一个模块
// 3) 看报告页 —— 若其余 4 项被清零 = bug
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const EMAIL = process.env.EMAIL || 'test@example.com';
const PASS = process.env.PASS || 'test1234';
const log = (...a) => console.log(...a);

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 15000 });
}

async function doVocab(page) {
  await page.goto(`${BASE}/assessment/vocab`, { waitUntil: 'networkidle' });
  for (let i = 0; i < 60; i++) {
    const opts = page.locator('button:has(span.flex-1)');
    if (await opts.count()) await opts.first().click().catch(() => {});
    await page.waitForTimeout(40);
    const submit = page.getByRole('button', { name: /提交词汇测试/ });
    if (await submit.count() && await submit.isEnabled().catch(() => false)) { await submit.click(); break; }
    const next = page.getByRole('button', { name: /^下一题$/ });
    if (await next.count() && await next.isEnabled().catch(() => false)) await next.click();
  }
  await page.waitForURL(/vocab\/result|listening/, { timeout: 15000 }).catch(() => {});
}

async function reportBands(page) {
  await page.goto(`${BASE}/assessment/report`, { waitUntil: 'networkidle' });
  // 抓 5 维小格子的分数
  const cells = page.locator('.grid-cols-5 > div');
  const n = await cells.count();
  const out = {};
  for (let i = 0; i < n; i++) {
    const t = (await cells.nth(i).innerText()).split('\n');
    if (t.length >= 2) out[t[0]] = t[1];
  }
  return out;
}

const run = async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  await login(page);

  log('--- 场景：已有一份完整评估后，单独重测词汇 ---');
  const before = await reportBands(page);
  log('重测前报告:', JSON.stringify(before));

  await doVocab(page);
  const after = await reportBands(page);
  log('重测后报告:', JSON.stringify(after));

  // 判定：只有"重测前有分、重测后变无分"才算清零 bug（本就无分的维度不算）
  const hasScore = (v) => v && v !== '—' && v !== '未测试' && v !== '0';
  const zeroed = Object.keys(after).filter(
    (k) => k !== '词汇量' && hasScore(before[k]) && !hasScore(after[k]),
  );
  if (zeroed.length) {
    log(`\n✗ BUG 复现：单独重测词汇后，其余维度被清零：${zeroed.join(', ')}`);
    process.exit(1);
  } else {
    log('\n✓ 重测词汇未清零其它维度（已有分数保留）');
  }
  await browser.close();
};

run().catch((e) => { console.error(e); process.exit(1); });
