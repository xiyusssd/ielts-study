// 验证句子拼写四项加强：LCS 判分 / 提示台阶 / 错题重练+统计 / 难度切换
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://127.0.0.1:3000';
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
  await page.goto(`${BASE}/vocab/study?mode=sentence`, { waitUntil: 'networkidle' });

  if (/vocab$/.test(page.url()) || await page.getByText(/暂无可练句子|已清空/).count()) {
    checks.push(['句子拼写页可访问(无可练句,跳过交互)', true]);
    console.log('· 无可练句子，跳过交互');
  } else {
    const ta = page.locator('textarea');
    checks.push(['显示整句输入框', await ta.count() > 0]);
    checks.push(['有「提示下一词」按钮', await page.getByRole('button', { name: /提示下一词/ }).count() > 0]);
    checks.push(['有「看首字母」按钮', await page.getByRole('button', { name: /看首字母/ }).count() > 0]);
    checks.push(['有难度切换(标准/简单)', await page.getByRole('button', { name: /^标准$|^简单$/ }).count() > 0]);

    // 首字母骨架
    await page.getByRole('button', { name: /看首字母/ }).click();
    await page.waitForTimeout(200);
    checks.push(['首字母骨架出现下划线', await page.getByText(/_/).count() > 0]);

    // 提示逐词揭示
    await page.getByRole('button', { name: /提示下一词/ }).click();
    await page.waitForTimeout(200);
    checks.push(['提示后显示「已揭示」计数', await page.getByText(/已揭示/).count() > 0]);

    // 故意输错 → 检查 → LCS diff 与正确答案对照
    await ta.fill('zzz notaword xyz');
    await page.getByRole('button', { name: /检查/ }).click();
    await page.waitForTimeout(400);
    checks.push(['判分后显示正确答案对照', await page.getByText(/正确答案/).count() > 0]);

    // 走到完成页看统计
    let guard = 0;
    while (guard++ < 30) {
      if (await page.getByText(/句子拼写完成/).count()) break;
      const nextBtn = page.getByRole('button', { name: /^下一句|^完成/ });
      if (await nextBtn.count() > 0) {
        await nextBtn.first().click();
        await page.waitForTimeout(800); // 等 server action(reviewWord)+ 状态切换
        continue;
      }
      // 新卡未判分：输错再检查推进
      const t2 = page.locator('textarea');
      if (await t2.count()) {
        await t2.fill('zzz');
        await page.getByRole('button', { name: /检查/ }).click().catch(() => {});
        await page.waitForTimeout(500);
      } else break;
    }
    const done = await page.getByText(/句子拼写完成/).count();
    checks.push(['到达完成页', done > 0]);
    if (done) {
      checks.push(['完成页有「最高连击」统计', await page.getByText(/最高连击/).count() > 0]);
      checks.push(['完成页有「只练错题」按钮', await page.getByRole('button', { name: /只练错题/ }).count() > 0]);
    }
  }

  await browser.close();
  let allOk = errors.length === 0;
  for (const [name, ok] of checks) { console.log(`${ok ? '✓' : '✗'} ${name}`); if (!ok) allOk = false; }
  if (errors.length) { console.log('页面错误:'); errors.forEach((e) => console.log('  ' + e)); }
  console.log(allOk ? '\n全部通过' : '\n有失败');
  process.exit(allOk ? 0 : 1);
};
run().catch((e) => { console.error(e); process.exit(1); });
