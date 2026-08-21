// 验证设置页 AI 服务配置：拉取模型 → 草稿凭据预览 → 保存 → 持久化 → 恢复默认。
import { chromium } from "playwright";
const BASE = process.env.BASE || "http://127.0.0.1:3002";
const EMAIL = process.env.EMAIL || "test@example.com";
const PASS = process.env.PASS || "test1234";

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 15000 }).catch(() => {
    console.log("登录未跳转，当前 URL:", page.url());
  });

  const checks = [];
  const check = (label, pass) => {
    checks.push([label, !!pass]);
    console.log(`${pass ? "✓" : "✗"} ${label}`);
  };

  // 1. GET：已保存配置 + 模型列表
  const apiRes = await ctx.request.get(`${BASE}/api/ai/models`);
  check("GET /api/ai/models 返回 200", apiRes.status() === 200);
  const apiJson = await apiRes.json().catch(() => null);
  check("响应含 models 数组", Array.isArray(apiJson?.models) && apiJson.models.length > 0);
  check(
    "响应含 current / effective / saved",
    typeof apiJson?.current === "string" && !!apiJson?.effective && !!apiJson?.saved,
  );
  const hasMeta = apiJson?.models?.some((m) => m.contextLength != null);
  check("模型元数据（上下文长度）已解析", hasMeta);

  // 2. POST 草稿预览（空值回落已保存/env 配置）
  const postRes = await ctx.request.post(`${BASE}/api/ai/models`, { data: {} });
  check("POST 草稿预览（空值回落）返回 200", postRes.status() === 200);
  const postJson = await postRes.json().catch(() => null);
  check("POST 返回模型列表", Array.isArray(postJson?.models) && postJson.models.length > 0);

  // 3. POST 非法 Base URL → 400
  const badRes = await ctx.request.post(`${BASE}/api/ai/models`, { data: { baseUrl: "not-a-url" } });
  check("POST 非法 Base URL 返回 400", badRes.status() === 400);

  // 4. 设置页渲染
  await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
  check("设置页渲染 Base URL 输入框", (await page.locator("#ai-base-url").count()) > 0);
  check("设置页渲染 API Key 输入框", (await page.locator("#ai-api-key").count()) > 0);
  const cardCount = await page.getByRole("button", { name: /deepseek-v4-flash/ }).count();
  check("设置页渲染模型卡片", cardCount > 0);

  // 5. 选模型 → 保存
  const target = page.getByRole("button", { name: /glm-5\.2/ });
  await target.first().click();
  await page.getByRole("button", { name: /保存配置/ }).click();
  await page.waitForSelector("[data-sonner-toast]", { timeout: 10000 }).catch(() => {});
  const toastText = await page.locator("[data-sonner-toast]").allInnerTexts().catch(() => []);
  check("保存配置出现 toast", toastText.some((t) => t.includes("已保存")));

  // 6. 重载后持久化生效
  await page.waitForTimeout(1500);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const body1 = await page.locator("body").innerText();
  check("重载后当前生效模型为 glm-5.2", /当前生效/.test(body1) && /glm-5\.2/.test(body1));

  // 7. 自定义 base/key 保存（保存只校验格式，不校验连通性）
  await page.fill("#ai-base-url", "https://example-gateway.test/v1");
  await page.fill("#ai-api-key", "sk-dummy-key-123");
  await page.getByRole("button", { name: /保存配置/ }).click();
  await page.waitForSelector("[data-sonner-toast]", { timeout: 10000 }).catch(() => {});
  const toast2 = await page.locator("[data-sonner-toast]").allInnerTexts().catch(() => []);
  check("自定义 base/key 保存出现 toast", toast2.some((t) => t.includes("已保存")));

  // 8. 恢复默认
  await page.getByRole("button", { name: /恢复默认/ }).click();
  await page.waitForTimeout(2000);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const afterReset = await page.locator("body").innerText();
  check("恢复默认后回到 env 模型", /当前生效/.test(afterReset) && /deepseek-v4-flash/.test(afterReset));

  // 9. 设置页无 JS 错误
  check("无页面 JS 错误", errors.length === 0);
  if (errors.length) errors.forEach((e) => console.log("  JS 错误:", e.slice(0, 200)));

  await browser.close();
  const ok = checks.every(([, p]) => p);
  console.log(ok ? "\n全部通过" : "\n有失败");
  process.exit(ok ? 0 : 1);
};
run().catch((e) => {
  console.error(e);
  process.exit(1);
});