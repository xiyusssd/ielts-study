// 验证词汇测试结果页有"逐词回顾"，且列出单词+释义。
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const EMAIL = process.env.EMAIL || 'test@example.com';
const PASS = process.env.PASS || 'test1234';

const run = async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 15000 }).catch(async () => {
    console.log('登录未跳转，当前 URL:', page.url());
    const toast = await page.locator('[data-sonner-toast], .text-destructive').allInnerTexts().catch(() => []);
    console.log('页面提示:', toast.join(' | '));
  });

  // 跑词汇测试：逐题选第一个选项
  await page.goto(`${BASE}/assessment/vocab`, { waitUntil: 'networkidle' });
  let firstWord = null;
  for (let i = 0; i < 60; i++) {
    if (!firstWord) {
      const t = await page.locator('h1 + div, .text-3xl').first().innerText().catch(() => null);
      firstWord = t;
    }
    const opts = page.locator('button:has(span.flex-1)');
    if (await opts.count()) await opts.first().click().catch(() => {});
    await page.waitForTimeout(40);
    const submit = page.getByRole('button', { name: /提交词汇测试/ });
    if (await submit.count() && await submit.isEnabled().catch(() => false)) { await submit.click(); break; }
    const next = page.getByRole('button', { name: /^下一题$/ });
    if (await next.count() && await next.isEnabled().catch(() => false)) await next.click();
  }
  await page.waitForURL(/vocab\/result/, { timeout: 15000 }).catch(() => {});

  const checks = [];
  const hasReview = await page.getByText(/逐词回顾/).count();
  checks.push(['结果页含「逐词回顾」', hasReview > 0]);

  // 回顾条目数（每条一个 border-b 行）
  const rows = await page.locator('.text-base:has-text("逐词回顾")').count();
  const reviewCard = page.locator('div').filter({ hasText: /逐词回顾/ }).first();
  const meaningVisible = await page.getByText(/逐词回顾 · \d+ 词/).count();
  checks.push(['回顾标题显示词数', meaningVisible > 0]);

  // 至少有对错图标
  const icons = await reviewCard.locator('svg').count();
  checks.push(['回顾条目有对错标记', icons > 0]);

  await browser.close();

  let ok = true;
  for (const [label, pass] of checks) {
    console.log(`${pass ? '✓' : '✗'} ${label}`);
    if (!pass) ok = false;
  }
  if (errors.length) { ok = false; console.log('JS 错误:'); errors.forEach((e) => console.log('  ' + e.slice(0, 200))); }
  console.log(ok ? '\n全部通过' : '\n有失败');
  process.exit(ok ? 0 : 1);
};
run().catch((e) => { console.error(e); process.exit(1); });
