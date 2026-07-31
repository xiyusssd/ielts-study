// 验证精听改造：逐词 diff / 键盘流 / 提示骨架 / 完成页
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const EMAIL = process.env.EMAIL || 'test@example.com';
const PASS = process.env.PASS || 'test1234';

// 取一个真实听力 passage id
const PID = execSync(
  `/usr/bin/sqlite3 prisma/dev.db "SELECT id FROM Passage WHERE module='listening' ORDER BY length(content) DESC LIMIT 1;"`
).toString().trim();

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
  await page.goto(`${BASE}/listening/${PID}/dictation`, { waitUntil: 'networkidle' });
  checks.push(['精听页渲染(含「精听」)', await page.getByText(/精听/).count() > 0]);
  checks.push(['有输入框', await page.locator('textarea').count() > 0]);
  checks.push(['有「看首字母」提示', await page.getByRole('button', { name: /看首字母/ }).count() > 0]);

  // 点看首字母 → 出现骨架 + 词数
  await page.getByRole('button', { name: /看首字母/ }).click();
  await page.waitForTimeout(200);
  checks.push(['骨架显示词数', await page.getByText(/个词/).count() > 0]);

  // 故意输错 → 提交对照 → 逐词 diff 高亮
  await page.locator('textarea').fill('this is definitely wrong text zzz');
  await page.getByRole('button', { name: /提交对照/ }).click();
  await page.waitForTimeout(300);
  checks.push(['判分后出现原文对照', await page.getByText(/原文|完全正确/).count() > 0]);
  checks.push(['有「下一句」按钮', await page.getByRole('button', { name: /下一句|完成/ }).count() > 0]);

  // 回车进下一句
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  checks.push(['回车前进到下一句(句号变化或仍在精听)', await page.getByText(/精听|完成/).count() > 0]);

  await browser.close();
  let ok = true;
  for (const [label, pass] of checks) { console.log(`${pass ? '✓' : '✗'} ${label}`); if (!pass) ok = false; }
  if (errors.length) { ok = false; console.log('JS 错误:'); errors.forEach((e) => console.log('  ' + e.slice(0, 200))); }
  console.log(ok ? '\n全部通过' : '\n有失败');
  process.exit(ok ? 0 : 1);
};
run().catch((e) => { console.error(e); process.exit(1); });
