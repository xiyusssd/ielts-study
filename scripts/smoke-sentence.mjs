// 验证句子拼写交互链路：横线开关 / 难度切换 / LCS 判分对照 / 错题重练 + 完成统计
// 提示台阶已改为「看横线/隐藏横线」骨架开关，输入框为隐藏 textarea（键盘直输）
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

  if (await page.getByText(/暂无可练|已清空|暂无新词/).count()) {
    console.log('⚠ 没有可练句子，跳过交互（不算失败）');
  } else {
    checks.push(['隐藏输入框存在', await page.getByLabel('句子拼写输入').count() > 0]);
    checks.push(['有横线开关(看横线/隐藏横线)', await page.getByRole('button', { name: /看横线|隐藏横线/ }).count() > 0]);
    checks.push(['有难度切换(标准/简单)', await page.getByRole('button', { name: /^标准$|^简单$/ }).count() > 0]);

    // 横线开关：默认显示横线，点「隐藏横线」后出现整句默写提示
    await page.getByRole('button', { name: /隐藏横线/ }).click();
    await page.waitForTimeout(200);
    checks.push(['隐藏横线后显示默写提示', await page.getByText(/凭中文默写/).count() > 0]);
    await page.getByRole('button', { name: /看横线/ }).click();
    await page.waitForTimeout(200);

    // 点击卡片主体把焦点还给隐藏输入框，再故意输错 → 检查 → 显示正确答案对照
    await page.getByRole('progressbar').click();
    await page.keyboard.type('zzz notaword xyz');
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /检查/ }).click();
    await page.waitForTimeout(400);
    checks.push(['判分后显示正确答案对照', await page.getByText(/正确答案/).count() > 0]);

    // 推进到完成页（队列可达 40+ 卡：每卡 2 次循环 = 判分 + 翻页）
    let guard = 0;
    while (guard++ < 200) {
      if (await page.getByText(/句子拼写完成/).count()) break;
      const nextBtn = page.getByRole('button', { name: /^下一句|^完成/ });
      if (await nextBtn.count() > 0) {
        await nextBtn.first().click();
        await page.waitForTimeout(400); // 等 server action(reviewWord) + 状态切换
        continue;
      }
      // 新卡未判分：输错再检查推进（换卡后隐藏输入自动聚焦）
      await page.getByRole('progressbar').click();
      await page.keyboard.type('zzz');
      await page.waitForTimeout(100);
      await page.getByRole('button', { name: /检查/ }).click().catch(() => {});
      await page.waitForTimeout(300);
    }
    const done = await page.getByText(/句子拼写完成/).count();
    checks.push(['到达完成页', done > 0]);
    if (done) {
      checks.push(['完成页有「最高连击」统计', await page.getByText(/最高连击/).count() > 0]);
      checks.push(['完成页有「只练错题」按钮', await page.getByRole('button', { name: /只练错题/ }).count() > 0]);
    }
  }

  checks.push(['全程无 pageerror', errors.length === 0]);

  await browser.close();
  let allOk = true;
  for (const [name, ok] of checks) { console.log(`${ok ? '✓' : '✗'} ${name}`); if (!ok) allOk = false; }
  if (errors.length) { console.log('页面错误:'); errors.forEach((e) => console.log('  ' + e)); }
  console.log(allOk ? '\n全部通过' : '\n有失败');
  process.exit(allOk ? 0 : 1);
};
run().catch((e) => { console.error(e); process.exit(1); });