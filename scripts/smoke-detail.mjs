// 动态详情路由健康检查（阅读/听力/写作/词汇详情页）。
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const EMAIL = process.env.EMAIL || 'test@example.com';
const PASS = process.env.PASS || 'test1234';

// 从命令行传入真实 id
const [readingId, listeningId, writingId, wordId] = process.argv.slice(2);

const ROUTES = [
  `/reading/${readingId}`,
  `/listening/${listeningId}`,
  `/listening/${listeningId}/dictation`,
  `/writing/${writingId}`,
  `/vocab/${wordId}`,
];

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 15000 });

  const fail = [];
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  for (const r of ROUTES) {
    const before = pageErrors.length;
    const resp = await page.goto(`${BASE}${r}`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
    const status = resp ? resp.status() : 0;
    const landed = new URL(page.url()).pathname;
    const kicked = landed.endsWith('/login');
    const newErrs = pageErrors.slice(before);
    const ok = status >= 200 && status < 400 && !kicked && newErrs.length === 0;
    if (ok) console.log(`✓ ${r} → ${status}`);
    else {
      const why = kicked ? '被踢回登录' : status >= 400 || status === 0 ? `HTTP ${status}` : `JS错误 ${newErrs.length}`;
      console.log(`✗ ${r} → ${why}`);
      newErrs.forEach((e) => console.log(`    JS: ${e.slice(0, 200)}`));
      fail.push(r);
    }
  }

  await browser.close();
  console.log(`\n${ROUTES.length - fail.length}/${ROUTES.length} 通过`);
  if (fail.length) process.exit(1);
};

run().catch((e) => { console.error(e); process.exit(1); });
