// 负向验证：profile 存非法 key 时，AI 调用必须走 profile 值并失败，
// 证明「用户配置覆盖 env」确实传导到了 provider 层（而不是静默回落 env）。
// 用法: node --env-file=.env scripts/smoke-profile-override.mjs
import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright";

const prisma = new PrismaClient();
const BASE = process.env.BASE || "http://127.0.0.1:3002";
const EMAIL = "test@example.com";
const PASS = "test1234";

const user = await prisma.user.findUnique({ where: { email: EMAIL } });
if (!user) throw new Error("测试用户不存在");

await prisma.profile.upsert({
  where: { userId: user.id },
  create: {
    userId: user.id,
    aiBaseUrl: process.env.OPENAI_TEXT_BASE_URL,
    aiApiKey: "sk-bogus-should-fail",
    aiTextModel: process.env.OPENAI_TEXT_MODEL,
  },
  update: {
    aiBaseUrl: process.env.OPENAI_TEXT_BASE_URL,
    aiApiKey: "sk-bogus-should-fail",
    aiTextModel: process.env.OPENAI_TEXT_MODEL,
  },
});

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASS);
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 15000 });

const check = (label, pass) => console.log(`${pass ? "✓" : "✗"} ${label}`);

// 1. 模型列表应失败（网关拒绝非法 key）——证明 listModels 用了 profile 的 key。
//    注意：GET /api/ai/models 按设计不因网关故障返回非 200（表单不阻塞），
//    失败以 { models: [], warning } 形式返回，故断言 200 + warning + 空列表。
const modelsRes = await ctx.request.get(`${BASE}/api/ai/models`);
const modelsBody = await modelsRes.json().catch(() => ({}));
check(
  "listModels 走 profile 非法 key 被网关拒绝（200 + warning + 空列表）",
  modelsRes.status() === 200 &&
    !!modelsBody.warning &&
    Array.isArray(modelsBody.models) &&
    modelsBody.models.length === 0,
);

// 2. gen-sentence 应失败——证明 chatJSON 用了 profile 的 key
const genRes = await ctx.request.post(`${BASE}/api/vocab/gen-sentence`, {
  data: { word: "resilience", level: "standard" },
});
check(
  "gen-sentence 走 profile 非法 key 被网关拒绝（非 200）",
  genRes.status() !== 200,
);

await browser.close();

// 清理
await prisma.profile.update({
  where: { userId: user.id },
  data: { aiBaseUrl: null, aiApiKey: null, aiTextModel: null },
});
await prisma.$disconnect();
console.log("（已清理测试用户的 profile 覆盖）");