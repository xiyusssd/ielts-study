// 验证单词发音：①本地音频 HTTP 可取 ②拼写模式有单词+例句发音按钮 ③Audio 能加载本地 m4a
import { chromium } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:3000';
const EMAIL = process.env.EMAIL || 'test@example.com';
const PASS = process.env.PASS || 'test1234';

const run = async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  const checks = [];

  // ① 本地音频 HTTP（登录前也可取静态资源）
  const r1 = await page.request.get(`${BASE}/audio/words/abandon.m4a`);
  checks.push(['单词音频 HTTP 200', r1.status() === 200 && r1.headers()['content-type']?.includes('audio')]);

  // 登录
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 15000 }).catch(() => {});

  // ② 拼写模式
  await page.goto(`${BASE}/vocab/study?mode=spell`, { waitUntil: 'networkidle' });
  if (await page.getByText(/已清空|暂无新词/).count()) {
    checks.push(['拼写模式(无词跳过)', true]);
  } else {
    // 单词发音按钮（title=发音）
    checks.push(['拼写模式有发音按钮', await page.locator('button[title="发音"]').count() > 0]);
    // ③ 浏览器能否解码播放本地 m4a（headless 无音频设备，故用 canplaythrough 而非 play()）
    const canPlay = await page.evaluate(async () => {
      return await new Promise((resolve) => {
        const a = new Audio('/audio/words/abandon.m4a');
        const t = setTimeout(() => resolve(false), 5000);
        a.addEventListener('canplaythrough', () => { clearTimeout(t); resolve(true); }, { once: true });
        a.addEventListener('error', () => { clearTimeout(t); resolve(false); }, { once: true });
        a.load();
      });
    });
    checks.push(['浏览器可解码本地 m4a 音频', canPlay]);
    // 例句发音按钮（可能当前词无例句，非硬性）
    const hasSentBtn = await page.locator('button[title="朗读整句"]').count();
    console.log(`  (当前词${hasSentBtn > 0 ? '有' : '无'}例句发音按钮)`);
  }

  await browser.close();
  let ok = true;
  for (const [label, pass] of checks) { console.log(`${pass ? '✓' : '✗'} ${label}`); if (!pass) ok = false; }
  if (errors.length) { ok = false; console.log('JS 错误:'); errors.forEach((e) => console.log('  ' + e.slice(0, 200))); }
  console.log(ok ? '\n全部通过' : '\n有失败');
  process.exit(ok ? 0 : 1);
};
run().catch((e) => { console.error(e); process.exit(1); });
