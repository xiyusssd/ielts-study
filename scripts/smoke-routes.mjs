// 全静态路由健康检查：登录后逐个访问，报告非 2xx/3xx 的页面。
// 用法：dev server 先起，然后 node scripts/smoke-routes.mjs
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const EMAIL = process.env.EMAIL || 'test@example.com';
const PASS = process.env.PASS || 'test1234';

const ROUTES = [
  '/', '/assessment', '/assessment/report',
  '/assessment/reading', '/assessment/listening', '/assessment/vocab',
  '/assessment/speaking', '/assessment/writing',
  '/plan', '/plan/setup',
  '/vocab', '/vocab/study',
  '/reading', '/listening',
  '/writing', '/writing/samples', '/writing/submissions', '/writing/templates',
  '/speaking', '/speaking/part1', '/speaking/part2', '/speaking/part3',
  '/settings', '/settings/account',
  '/help', '/privacy', '/terms',
];

const PUBLIC = ['/help', '/privacy', '/terms'];

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // 登录
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
    // 受保护路由被踢回登录 = 失败
    const kicked = !PUBLIC.includes(r) && landed.endsWith('/login');
    const newErrs = pageErrors.slice(before);
    const ok = status >= 200 && status < 400 && !kicked && newErrs.length === 0;
    if (ok) {
      console.log(`✓ ${r} → ${status}`);
    } else {
      const why = kicked ? '被踢回登录' : status >= 400 || status === 0 ? `HTTP ${status}` : `JS错误 ${newErrs.length}`;
      console.log(`✗ ${r} → ${why}`);
      fail.push({ r, status, kicked, errs: newErrs });
    }
  }

  await browser.close();

  console.log(`\n${ROUTES.length - fail.length}/${ROUTES.length} 通过`);
  if (fail.length) {
    console.log('\n失败详情：');
    for (const f of fail) {
      console.log(`  ${f.r}: status=${f.status} kicked=${f.kicked}`);
      f.errs.forEach((e) => console.log(`    JS: ${e.slice(0, 200)}`));
    }
    process.exit(1);
  }
};

run().catch((e) => { console.error(e); process.exit(1); });
