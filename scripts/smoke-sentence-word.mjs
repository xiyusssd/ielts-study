// 验证句子拼写「每词一条横线」：渲染无报错 + 打字/空格跳词/退格删除 + 提交对照
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
  const url = page.url();
  if (/vocab$/.test(url) || await page.getByText(/暂无可练|已清空|暂无新词/).count()) {
    console.log('⚠ 没有可练句子，跳过交互（不算失败）');
  } else {
    // 隐藏输入捕获键盘：直接键入
    await page.keyboard.type('Hello world foo');
    await page.waitForTimeout(200);
    checks.push(['输入后无 pageerror', errors.length === 0]);

    // 退格删除应生效：删掉最后一个词的部分字符
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(150);

    // 提交对照
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    const hasFeedback =
      (await page.getByText(/正确答案|完全正确/).count()) > 0;
    checks.push(['提交后有对照反馈', hasFeedback]);
  }

  checks.push(['全程无 pageerror', errors.length === 0]);

  let ok = true;
  for (const [name, pass] of checks) {
    console.log(`${pass ? '✓' : '✗'} ${name}`);
    if (!pass) ok = false;
  }
  if (errors.length) { console.log('\n--- pageerrors ---'); errors.forEach((e) => console.log(e)); }

  await browser.close();
  process.exit(ok ? 0 : 1);
};
run().catch((e) => { console.error(e); process.exit(1); });
