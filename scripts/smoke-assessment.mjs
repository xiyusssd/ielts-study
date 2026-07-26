// 评估流程端到端复现：vocab→listening→reading→writing→speaking→report。
// 捕获页面 JS 错误、控制台错误、失败请求、error 边界。
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const EMAIL = process.env.EMAIL || 'test@example.com';
const PASS = process.env.PASS || 'test1234';

const log = (...a) => console.log(...a);

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const errors = [];
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console.error] ${m.text()}`); });
  page.on('response', (r) => { if (r.status() >= 500) errors.push(`[HTTP ${r.status()}] ${r.url()}`); });

  const step = async (name, fn) => {
    const before = errors.length;
    try {
      await fn();
      const newErrs = errors.slice(before);
      if (newErrs.length) { log(`✗ ${name}`); newErrs.forEach((e) => log(`    ${e.slice(0, 250)}`)); }
      else log(`✓ ${name} → ${new URL(page.url()).pathname}`);
    } catch (e) {
      log(`✗ ${name} — 异常: ${String(e).slice(0, 250)}`);
      errors.push(`[step:${name}] ${e}`);
    }
  };

  // 登录
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 15000 });

  // 评估入口
  await step('评估入口', async () => {
    await page.goto(`${BASE}/assessment`, { waitUntil: 'networkidle' });
  });

  // 1. 词汇：逐题选第一个选项 → 下一题 → 提交
  await step('词汇测试', async () => {
    await page.goto(`${BASE}/assessment/vocab`, { waitUntil: 'networkidle' });
    for (let i = 0; i < 60; i++) {
      const opts = page.locator('button:has(span.flex-1)');
      const n = await opts.count();
      if (n > 0) await opts.first().click().catch(() => {});
      await page.waitForTimeout(50);
      const submitBtn = page.getByRole('button', { name: /提交词汇测试/ });
      if (await submitBtn.count() && await submitBtn.isEnabled().catch(() => false)) {
        await submitBtn.click();
        break;
      }
      const nextBtn = page.getByRole('button', { name: /^下一题$/ });
      if (await nextBtn.count() && await nextBtn.isEnabled().catch(() => false)) await nextBtn.click();
    }
    await page.waitForURL(/vocab\/result|listening/, { timeout: 15000 }).catch(() => {});
  });

  // 2. 听力：题目区随便填/选，提交
  await step('听力测试', async () => {
    await page.goto(`${BASE}/assessment/listening`, { waitUntil: 'networkidle' });
    await fillTextAndChoices(page);
    await clickSubmit(page, /提交并进入下一节|提交听力/);
    await page.waitForURL(/listening\/result/, { timeout: 15000 }).catch(() => {});
  });

  // 3. 阅读
  await step('阅读测试', async () => {
    await page.goto(`${BASE}/assessment/reading`, { waitUntil: 'networkidle' });
    await fillTextAndChoices(page);
    await clickSubmit(page, /提交阅读测试/);
    await page.waitForURL(/reading\/result|writing|assessment$/, { timeout: 15000 }).catch(() => {});
  });

  // 4. 写作
  await step('写作测试', async () => {
    await page.goto(`${BASE}/assessment/writing`, { waitUntil: 'networkidle' });
    const ta = page.locator('textarea').first();
    if (await ta.count()) await ta.fill('This is a test essay. '.repeat(30));
    await clickSubmit(page, /提交|完成|下一/);
    await page.waitForTimeout(1500);
  });

  // 5. 口语
  await step('口语测试', async () => {
    if (!/speaking/.test(page.url())) await page.goto(`${BASE}/assessment/speaking`, { waitUntil: 'networkidle' });
    const skip = page.getByRole('button', { name: /跳过/ });
    if (await skip.count()) await skip.first().click();
    else await clickSubmit(page, /提交|完成/);
    await page.waitForTimeout(1500);
  });

  // 6. 报告
  await step('查看报告', async () => {
    await page.goto(`${BASE}/assessment/report`, { waitUntil: 'networkidle' });
    const hasError = await page.getByText(/出错|Error|something went wrong/i).count();
    if (hasError) errors.push('[report] 报告页显示错误 UI');
  });

  await browser.close();

  log(`\n=== 捕获错误 ${errors.length} 条 ===`);
  errors.forEach((e) => log(`  ${e.slice(0, 300)}`));
  process.exit(errors.length ? 1 : 0);
};

async function fillTextAndChoices(page) {
  // 文本框填答案
  const inputs = page.locator('input[placeholder*="答案"]');
  const ni = await inputs.count();
  for (let i = 0; i < ni; i++) await inputs.nth(i).fill('test');
  // TFNG / MCQ 每题点第一个按钮
  const groups = page.locator('div.space-y-2.border-b, div.space-y-2');
  // 简单点所有可点选项按钮的第一个
  const tfng = page.locator('button:has-text("TRUE")');
  const nt = await tfng.count();
  for (let i = 0; i < nt; i++) await tfng.nth(i).click().catch(() => {});
}

async function clickSubmit(page, re) {
  const btn = page.getByRole('button', { name: re });
  if (await btn.count()) await btn.last().click().catch(() => {});
}

run().catch((e) => { console.error(e); process.exit(1); });
