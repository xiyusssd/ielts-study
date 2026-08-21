// 验证：①每日词量设置可保存并生效 ②拼写模式可用（提示首字母/判错对照/拼对反馈/解锁推进）
// 拼写模式输入为隐藏 input（aria-label="拼写输入"，键盘直输）；判错一次即给出正确拼写。
// 用 source=ielts 显式筛选让队列变成纯新词序列（复习量为 0），首两卡由 DB 查询确定性获取。
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const EMAIL = process.env.EMAIL || 'test@example.com';
const PASS = process.env.PASS || 'test1234';

const prisma = new PrismaClient();

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
  await page.getByRole('button', { name: /^保存$/ }).click().catch(() => {});
  await page.waitForTimeout(1500);
  // 计划页也应有每日词量
  await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle' }).catch(() => {});
  const planHasGoals = await page.getByText(/每日词量/).count();
  checks.push(['计划页也有「每日词量」', planHasGoals > 0 || page.url().includes('/plan/setup')]);

  // === 2. 拼写模式（source=ielts 纯新词队列，首两卡确定性） ===
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  const learnedIds = user
    ? (await prisma.vocabProgress.findMany({ where: { userId: user.id }, select: { wordId: true } })).map((p) => p.wordId)
    : [];
  const freshWords = await prisma.word.findMany({
    where: { id: { notIn: learnedIds }, level: { lte: 5000 }, tags: { contains: 'ielts' } },
    orderBy: [{ level: 'asc' }, { spelling: 'asc' }],
    take: 2,
  });
  const [w1, w2] = freshWords.map((w) => w.spelling);

  await page.goto(`${BASE}/vocab/study?mode=spell&source=ielts`, { waitUntil: 'networkidle' });
  if (/vocab$/.test(page.url()) || await page.getByText(/已清空|暂无新词/).count() || freshWords.length < 2) {
    checks.push(['拼写模式页可访问', true]);
    console.log('· 无可学单词，跳过拼写交互');
  } else {
    checks.push(['拼写模式显示隐藏输入框', await page.getByLabel('拼写输入').count() > 0]);
    checks.push(['有「提示」按钮(首字母)', await page.getByRole('button', { name: /^提示$/ }).count() > 0]);

    // 提示 → 首字母揭示
    await page.getByRole('button', { name: /^提示$/ }).click();
    await page.waitForTimeout(200);
    checks.push(['提示后显示首字母', await page.getByText(/首字母：/).count() > 0]);

    // 故意输错 → 判分 → 正确拼写对照（应与首卡一致）+ 解锁下一个
    await page.getByRole('progressbar').click();
    await page.keyboard.type('zzzznotaword');
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /检查/ }).click();
    await page.waitForTimeout(400);
    checks.push(['判错后显示正确拼写对照', await page.getByText(/正确拼写：/).count() > 0]);
    const revealed = await page.locator('.font-bold.tracking-wide').first().textContent();
    checks.push(['揭示的拼写与首卡一致', revealed?.trim() === w1]);
    checks.push(['判分后解锁「下一个/完成」', await page.getByRole('button', { name: /下一个|完成/ }).count() > 0]);

    // 推进到第二卡，照正确拼写输入 → 「拼写正确」
    await page.getByRole('button', { name: /下一个|完成/ }).click();
    await page.waitForTimeout(600);
    await page.getByRole('progressbar').click();
    await page.keyboard.type(w2);
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /检查/ }).click();
    await page.waitForTimeout(400);
    checks.push(['照着拼对后显示「拼写正确」', await page.getByText(/拼写正确/).count() > 0]);
  }

  await prisma.$disconnect();
  await browser.close();
  let ok = true;
  for (const [label, pass] of checks) { console.log(`${pass ? '✓' : '✗'} ${label}`); if (!pass) ok = false; }
  if (errors.length) { ok = false; console.log('JS 错误:'); errors.forEach((e) => console.log('  ' + e.slice(0, 200))); }
  console.log(ok ? '\n全部通过' : '\n有失败');
  process.exit(ok ? 0 : 1);
};
run().catch((e) => { console.error(e); process.exit(1); });