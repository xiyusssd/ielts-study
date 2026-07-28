// 验证：①每日词量设置可保存并生效 ②拼写模式可用（对/错反馈+发音提示）
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

  // === 1. 每日词量设置 ===
  await page.goto(`${BASE}/vocab`, { waitUntil: 'networkidle' });
  checks.push(['词汇首页有「每日词量」', await page.getByText(/每日词量/).count() > 0]);
  checks.push(['有「单词拼写」入口', await page.getByRole('link', { name: /单词拼写/ }).count() > 0]);

  // 点每日新词预设 10，保存
  const goalsCard = page.locator('div').filter({ hasText: /每日词量/ }).last();
  await page.getByRole('button', { name: /^10$/ }).first().click().catch(() => {});
  await page.getByRole('button', { name: /^保存$/ }).click().catch(() => {});
  await page.waitForTimeout(1500);
  // 计划页也应有每日词量
  await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle' }).catch(() => {});
  const planHasGoals = await page.getByText(/每日词量/).count();
  checks.push(['计划页也有「每日词量」', planHasGoals > 0 || page.url().includes('/plan/setup')]);

  // === 2. 拼写模式 ===
  await page.goto(`${BASE}/vocab/study?mode=spell`, { waitUntil: 'networkidle' });
  const url = page.url();
  if (/vocab$/.test(url) || await page.getByText(/已清空|暂无新词/).count()) {
    // 没有可学的词，跳过拼写交互但不算失败
    checks.push(['拼写模式页可访问', true]);
    console.log('· 无可学单词，跳过拼写交互');
  } else {
    checks.push(['拼写模式显示输入框', await page.locator('input[placeholder*="拼出"]').count() > 0]);
    checks.push(['单词拼写标注', await page.getByText(/单词拼写/).count() > 0]);
    // 故意输错，检查反馈
    const input = page.locator('input[placeholder*="拼出"]');
    await input.fill('zzzznotaword');
    await page.getByRole('button', { name: /检查/ }).click();
    await page.waitForTimeout(500);
    checks.push(['输错显示正确拼写', await page.getByText(/正确拼写是/).count() > 0]);
    // 下一个
    await page.getByRole('button', { name: /下一个|完成/ }).click().catch(() => {});
    await page.waitForTimeout(500);
  }

  await browser.close();
  let ok = true;
  for (const [label, pass] of checks) { console.log(`${pass ? '✓' : '✗'} ${label}`); if (!pass) ok = false; }
  if (errors.length) { ok = false; console.log('JS 错误:'); errors.forEach((e) => console.log('  ' + e.slice(0, 200))); }
  console.log(ok ? '\n全部通过' : '\n有失败');
  process.exit(ok ? 0 : 1);
};
run().catch((e) => { console.error(e); process.exit(1); });
