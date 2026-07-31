// 真人端到端:登录→打开剑桥阅读篇目→按DB正确答案作答全部题→提交→断言满分。
// 用法: node scripts/e2e-reading-human.mjs cambridge:c11-t1-p1 [more sources...]
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.BASE || "http://127.0.0.1:3000";
const EMAIL = process.env.EMAIL || "test@example.com";
const PASS = process.env.PASS || "test1234";

const sources = process.argv.slice(2);
if (!sources.length) { console.error("需传入 source, 如 cambridge:c11-t1-p1"); process.exit(1); }

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 15000 });
}

async function answerOne(page, qid, type, answerRaw, options) {
  const box = page.locator(`#q-${qid}`);
  const parsed = JSON.parse(answerRaw);
  if (type === "gapfill") {
    const val = Array.isArray(parsed) ? parsed[0] : parsed;
    await box.locator("input").fill(val);
  } else if (type === "tfng") {
    await box.getByRole("button", { name: parsed, exact: true }).first().click();
  } else {
    // mcq/matching/heading: answer 是字母, 遍历按钮点开头为 "X." 的那个
    const letter = Array.isArray(parsed) ? parsed[0] : parsed;
    const btns = box.getByRole("button");
    const n = await btns.count();
    let clicked = false;
    for (let i = 0; i < n; i++) {
      const t = (await btns.nth(i).innerText()).trim();
      if (t.startsWith(letter + ".")) { await btns.nth(i).click(); clicked = true; break; }
    }
    if (!clicked) throw new Error(`未找到选项按钮 ${letter}`);
  }
}
async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
  page.on("response", (r) => { if (r.status() >= 500) errors.push("[HTTP " + r.status() + "] " + r.url()); });
  await login(page);

  let allPass = true;
  for (const source of sources) {
    const passage = await prisma.passage.findFirst({
      where: { source, module: "reading" },
      include: { questions: { orderBy: { index: "asc" } } },
    });
    if (!passage) { console.log(`✗ ${source} 不存在`); allPass = false; continue; }

    await page.goto(`${BASE}/reading/${passage.id}`, { waitUntil: "networkidle" });
    for (const q of passage.questions) {
      const opts = q.options ? JSON.parse(q.options) : null;
      await answerOne(page, q.id, q.type, q.answer, opts);
    }
    await page.getByRole("button", { name: /提交答卷/ }).click();
    await page.waitForURL(/\/result\//, { timeout: 20000 });
    const body = await page.locator("body").innerText();
    const total = passage.questions.length;
    // 精确匹配 "X / total"(结果页"正确"统计),total 为该篇题数
    const m = body.match(new RegExp(`(\\d+)\\s*/\\s*${total}\\b`));
    const got = m ? parseInt(m[1]) : -1;
    const ok = got === total;
    if (!ok) allPass = false;
    console.log(`${ok ? "✓" : "✗"} ${source} (${passage.title}) → ${got}/${total} ${ok ? "满分" : "!!未满分"}`);
  }

  if (errors.length) { console.log("\n运行时错误:"); errors.forEach((e) => console.log("  " + e)); allPass = false; }
  await browser.close();
  await prisma.$disconnect();
  console.log(allPass ? "\n✅ 全部满分通过" : "\n❌ 有失败");
  process.exit(allPass ? 0 : 1);
}
run();

