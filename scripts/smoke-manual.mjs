// 验证"手动填分跳过测试"：填 5 维分数 → 保存 → 报告页显示这些分数。
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:3000';
const EMAIL = process.env.EMAIL || 'test@example.com';
const PASS = process.env.PASS || 'test1234';

const run = async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 15000 }).catch(() => {});

  const checks = [];

  // 评估首页有"填写分数"入口
  await page.goto(`${BASE}/assessment`, { waitUntil: 'networkidle' });
  checks.push(['首页有「填写分数」入口', await page.getByRole('link', { name: /填写分数/ }).count() > 0]);

  // 进填分页
  await page.goto(`${BASE}/assessment/manual`, { waitUntil: 'networkidle' });
  checks.push(['填分页渲染', await page.getByText(/填写已知分数/).count() > 0]);

  // 给每个维度点选一个分数：分别 7.0 / 6.5 / 8.0 / 6.0 / 7.5
  // 每个 Card 是一个维度，点其中对应文案的按钮
  const targets = ['7.0', '6.5', '8.0', '6.0', '7.5'];
  const cards = page.locator('.space-y-4 > div');
  const nCards = await cards.count();
  for (let i = 0; i < Math.min(nCards, 5); i++) {
    await cards.nth(i).getByRole('button', { name: new RegExp('^' + targets[i].replace('.', '\\.') + '$') }).click().catch(() => {});
  }
  // 保存
  await page.getByRole('button', { name: /保存分数/ }).click();
  await page.waitForURL(/assessment\/report/, { timeout: 15000 }).catch(() => {});
  checks.push(['保存后跳报告页', /assessment\/report/.test(page.url())]);

  // 报告页显示填的分数
  const body = await page.textContent('body');
  const overall = await page.locator('.text-6xl').innerText().catch(() => '');
  checks.push(['报告页有 overall 分数', overall && overall !== '—']);
  // 抓 5 维格子
  const cells = page.locator('.grid-cols-5 > div');
  const scores = {};
  const nc = await cells.count();
  for (let i = 0; i < nc; i++) {
    const t = (await cells.nth(i).innerText()).split('\n');
    if (t.length >= 2) scores[t[0]] = t[1];
  }
  console.log('报告 5 维:', JSON.stringify(scores), '· overall:', overall);
  // 期望：词汇量=7, 听力=6.5, 阅读=8, 写作=6, 口语=7.5
  checks.push(['词汇=7', scores['词汇量'] === '7']);
  checks.push(['听力=6.5', scores['听力'] === '6.5']);
  checks.push(['阅读=8', scores['阅读'] === '8']);

  await browser.close();

  let ok = true;
  for (const [label, pass] of checks) { console.log(`${pass ? '✓' : '✗'} ${label}`); if (!pass) ok = false; }
  if (errors.length) { ok = false; console.log('JS 错误:'); errors.forEach((e) => console.log('  ' + e.slice(0, 200))); }
  console.log(ok ? '\n全部通过' : '\n有失败');
  process.exit(ok ? 0 : 1);
};
run().catch((e) => { console.error(e); process.exit(1); });
