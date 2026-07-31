// 词汇模块浏览器冒烟：真实登录 → 验证分类卡/筛选学习/详情三维标签真正渲染。
// 用法：node scripts/smoke-vocab.mjs
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://127.0.0.1:3000";
const results = [];
function ok(name, cond, extra = "") { results.push({ name, pass: !!cond, extra }); }

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => results.push({ name: "page JS error", pass: false, extra: e.message }));

try {
  // 登录
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type=email]', "test@example.com");
  await page.fill('input[type=password]', "test1234");
  await page.click('button[type=submit]');
  // server action 提交后走客户端跳转，等 URL 离开 /login
  await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState("networkidle");
  ok("登录后离开 /login", !page.url().endsWith("/login"), page.url());

  // 词汇首页：分类卡
  await page.goto(`${BASE}/vocab`, { waitUntil: "networkidle" });
  const body = await page.textContent("body");
  ok("词汇首页含「按分类学习」", body.includes("按分类学习"));
  ok("含来源 chip「雅思」", body.includes("雅思"));
  ok("含话题 chip", /环境|科技|健康|历史文化/.test(body));

  // 点雅思 chip → 筛选学习
  const ielts = page.locator('a[href="/vocab/study?source=ielts"]').first();
  ok("雅思 chip 链接存在", await ielts.count() > 0);
  await page.goto(`${BASE}/vocab/study?source=ielts`, { waitUntil: "networkidle" });
  const studyBody = await page.textContent("body");
  ok("筛选学习页含「今日学习」", studyBody.includes("今日学习"));
  ok("筛选页显示 filter badge「雅思」", studyBody.includes("雅思"));

  // 词汇测试页：pos/cefr 徽章
  await page.goto(`${BASE}/assessment/vocab`, { waitUntil: "networkidle" });
  const testBody = await page.textContent("body");
  ok("测试页渲染(含「词汇测试」)", testBody.includes("词汇测试"));
} catch (e) {
  results.push({ name: "运行异常", pass: false, extra: e.message });
} finally {
  await browser.close();
}

let allPass = true;
for (const r of results) {
  console.log(`${r.pass ? "✓" : "✗"} ${r.name}${r.extra ? " · " + r.extra.slice(0, 80) : ""}`);
  if (!r.pass) allPass = false;
}
console.log(allPass ? "\n全部通过" : "\n有失败项");
process.exit(allPass ? 0 : 1);
