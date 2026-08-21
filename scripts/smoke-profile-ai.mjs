// 临时端到端验证：profile 保存的 base/key/model 真实驱动 AI 调用。
// 用法: node --env-file=.env scripts/smoke-profile-ai.mjs
import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright";

const prisma = new PrismaClient();
const BASE = process.env.BASE || "http://127.0.0.1:3002";
const EMAIL = "test@example.com";
const PASS = "test1234";

const user = await prisma.user.findUnique({ where: { email: EMAIL } });
if (!user) throw new Error("测试用户不存在");

// 把 profile 覆盖为 env 里的真实网关凭据 + 一个具体模型
await prisma.profile.upsert({
  where: { userId: user.id },
  create: {
    userId: user.id,
    aiBaseUrl: process.env.OPENAI_TEXT_BASE_URL,
    aiApiKey: process.env.OPENAI_TEXT_API_KEY,
    aiTextModel: process.env.OPENAI_TEXT_MODEL,
  },
  update: {
    aiBaseUrl: process.env.OPENAI_TEXT_BASE_URL,
    aiApiKey: process.env.OPENAI_TEXT_API_KEY,
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

// 1. 模型列表走 profile 配置
const modelsRes = await ctx.request.get(`${BASE}/api/ai/models`);
const modelsJson = await modelsRes.json().catch(() => null);
check("GET /api/ai/models 用 profile 配置拉取", modelsRes.status() === 200 && Array.isArray(modelsJson?.models));
check("effective.model = profile 保存值", modelsJson?.effective?.model === process.env.OPENAI_TEXT_MODEL);

// 2. 文本生成走 profile 配置（gen-sentence 是完整链路：getAiConfig → provider → 网关）
const genRes = await ctx.request.post(`${BASE}/api/vocab/gen-sentence`, {
  data: { word: "resilience", level: "standard" },
});
const genJson = await genRes.json().catch(() => null);
check(
  "gen-sentence 用 profile 配置生成例句",
  genRes.status() === 200 && typeof genJson?.en === "string" && genJson.en.length > 5,
);

await browser.close();

// 清理：恢复 profile 三项为 null（回到 env 回退）
await prisma.profile.update({
  where: { userId: user.id },
  data: { aiBaseUrl: null, aiApiKey: null, aiTextModel: null },
});
await prisma.$disconnect();
console.log("（已清理测试用户的 profile 覆盖）");