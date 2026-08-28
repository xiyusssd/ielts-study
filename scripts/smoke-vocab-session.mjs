// 验证三处易回归的口径（2026-08-28 一轮修复的回归网）：
//   ① 错词复习/生词本队列不为空（错词一定"已学过"，旧实现按已学过滤 → 永远空）
//   ② 背词会话不被服务端刷新打断（Ctrl+Q 收藏会触发 RSC 刷新，队列不能因此缩短）
//   ③ 空回车不判分（听写空回车曾被记成"答对"，正确率虚高）
//   ④ 阅读列表「历史做题」等于真实 attempt 数（旧实现只统计最近 20 条窗口）
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const EMAIL = process.env.EMAIL || 'test@example.com';
const PASS = process.env.PASS || 'test1234';
const prisma = new PrismaClient();

const counterOf = async (page) => {
  // 翻卡模式的计数器是「1 / 30 · 剩余 29」，拼写/听写是「1 / 30」——统一按前缀匹配
  const t = await page.getByText(/^\s*\d+\s*\/\s*\d+/).first().textContent().catch(() => null);
  if (!t) return null;
  const [, i, n] = t.match(/(\d+)\s*\/\s*(\d+)/) ?? [];
  return { idx: Number(i), total: Number(n) };
};

const run = async () => {
  const checks = [];
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    console.log(`✗ 测试账号 ${EMAIL} 不存在`);
    process.exit(1);
  }

  // --- 造错词：挑 3 个"已学过"的词（旧实现正是被这一点过滤掉的） ---
  const learned = await prisma.vocabProgress.findMany({
    where: { userId: user.id },
    select: { wordId: true },
    take: 3,
  });
  if (learned.length < 3) {
    console.log('⚠ 已学词不足 3 个，先跑一轮 smoke-vocab-modes 再来');
    process.exit(0);
  }
  const created = [];
  for (const { wordId } of learned) {
    const existing = await prisma.mistakeWord.findUnique({
      where: { userId_wordId: { userId: user.id, wordId } },
    });
    if (existing) {
      await prisma.mistakeWord.update({ where: { id: existing.id }, data: { mastered: false } });
    } else {
      const row = await prisma.mistakeWord.create({
        data: { userId: user.id, wordId, source: 'spell', count: 1 },
      });
      created.push(row.id);
    }
  }
  const mistakeCount = await prisma.mistakeWord.count({ where: { userId: user.id, mastered: false } });
  // 一轮错词复习最多给「每日新词数」张卡（30-100，默认 50）
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
  const batchLimit = Math.max(30, Math.min(100, Math.round(profile?.dailyNewWords ?? 50) || 50));
  const expectedCards = Math.min(mistakeCount, batchLimit);

  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.endsWith('/login'), { timeout: 15000 }).catch(() => {});

  // === ① 错词复习有卡可练 ===
  await page.goto(`${BASE}/vocab/study?mistakes=1`, { waitUntil: 'networkidle' });
  const emptyMistakes = await page.getByText(/暂无新词|已清空/).count();
  checks.push(['错词复习不显示空状态', emptyMistakes === 0]);
  checks.push(['错词复习有「错词复习」标记', (await page.getByText('错词复习').count()) > 0]);
  const mc = await counterOf(page);
  checks.push([
    `错词复习卡数=min(未掌握错词 ${mistakeCount}, 每日词量 ${batchLimit})`,
    !!mc && mc.total === expectedCards,
  ]);

  // === ② 会话不被服务端刷新打断（Ctrl+Q 收藏 → RSC 刷新） ===
  await page.goto(`${BASE}/vocab/study?mode=spell&source=ielts`, { waitUntil: 'networkidle' });
  if (await page.getByText(/暂无新词|已清空/).count()) {
    console.log('· 拼写队列为空，跳过会话稳定性检查');
  } else {
    const before = await counterOf(page);
    // 过两张卡（故意拼错，只看推进）
    for (let k = 0; k < 2; k++) {
      await page.getByRole('progressbar').click();
      await page.keyboard.type('zzzznotaword');
      await page.keyboard.press('Enter'); // 判分
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter'); // 下一张
      await page.waitForTimeout(600);
    }
    const mid = await counterOf(page);
    checks.push(['过两张卡后仍在会话中', !!mid && mid.idx === before.idx + 2]);
    checks.push(['队列总数不因提交而缩短', !!mid && mid.total === before.total]);

    // Ctrl+Q 收藏当前词：会 revalidate /vocab，触发本页 RSC 刷新
    await page.keyboard.press('Control+q');
    await page.waitForTimeout(1500);
    const after = await counterOf(page);
    checks.push(['收藏引起的服务端刷新未打断会话', !!after && after.total === before.total && after.idx === mid.idx]);
    checks.push(['刷新后没有被顶成完成页', (await page.getByText(/拼写练习完成/).count()) === 0]);
    await page.keyboard.press('Control+q'); // 撤销收藏，保持数据干净
    await page.waitForTimeout(800);
  }

  // === ③ 听写空回车不判分 ===
  await page.goto(`${BASE}/vocab/dictation?source=random&n=5`, { waitUntil: 'networkidle' });
  if (await page.getByText(/暂无可听写/).count()) {
    console.log('· 无可听写单词，跳过空回车检查');
  } else {
    const c0 = await counterOf(page);
    await page.getByRole('progressbar').click();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    checks.push(['空回车不给出答案对照', (await page.getByText(/正确拼写/).count()) === 0]);
    const c1 = await counterOf(page);
    checks.push(['空回车不推进进度', !!c1 && c1.idx === c0.idx]);
  }

  // === ④ 阅读列表「历史做题」= 真实 attempt 数 ===
  const readingIds = (
    await prisma.passage.findMany({ where: { module: 'reading', active: true }, select: { id: true } })
  ).map((p) => p.id);
  const realReading = await prisma.attempt.count({
    where: { userId: user.id, passageId: { in: readingIds } },
  });
  await page.goto(`${BASE}/reading`, { waitUntil: 'networkidle' });
  const statText = await page.getByText('历史做题').first().locator('xpath=..').innerText();
  const shown = Number((statText.match(/(\d+)/g) ?? []).pop());
  checks.push([`阅读「历史做题」=${realReading}（页面显示 ${shown}）`, shown === realReading]);

  checks.push(['全程无 pageerror', errors.length === 0]);

  // 清理本脚本新建的错词行
  if (created.length) await prisma.mistakeWord.deleteMany({ where: { id: { in: created } } });
  await browser.close();
  await prisma.$disconnect();

  let bad = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) bad++;
  }
  if (errors.length) console.log('页面错误：', errors.slice(0, 3));
  console.log(bad === 0 ? '\n全部通过' : `\n${bad} 项失败`);
  process.exit(bad === 0 ? 0 : 1);
};

run().catch(async (e) => {
  console.error('✗ 运行异常 ·', e.message);
  await prisma.$disconnect();
  process.exit(1);
});