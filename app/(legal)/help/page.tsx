import Link from "next/link";

export const metadata = { title: "帮助中心" };

export default function HelpPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">帮助中心</h1>
      <p className="mt-2 text-muted-foreground">常见问题与操作指南</p>

      <h2 className="mt-8 text-xl font-semibold">快速开始</h2>
      <ol className="mt-2 space-y-2 text-sm leading-relaxed list-decimal pl-5">
        <li><Link href="/signup" className="text-primary hover:underline">注册账号</Link> → 完成 5 段水平诊断（约 20-30 分钟）</li>
        <li>输入目标分数和考试日期，AI 生成个性化周计划</li>
        <li>每天按 Dashboard 的今日任务学习：词汇 / 阅读 / 听力 / 写作 / 口语</li>
        <li>每周末做 mini-mock 复测，系统自适应调整后续计划</li>
      </ol>

      <h2 className="mt-8 text-xl font-semibold">功能说明</h2>

      <h3 className="mt-4 font-medium">词汇 · SRS 间隔重复</h3>
      <p className="text-sm leading-relaxed">
        基于 FSRS-4.5 算法。5 档评分（Again / Hard / Good / Easy / Perfect）会更新单词的记忆稳定度和难度，动态计算下次复习时间。答对越干脆，间隔越长。
      </p>

      <h3 className="mt-4 font-medium">阅读 · 5 种题型 + 计时</h3>
      <p className="text-sm leading-relaxed">
        支持 True/False/Not Given、多选、Matching、Sentence Completion、Matching Headings。60 分钟计时，右侧题号面板可标记 + 跳转。生词可一键加入词汇队列。
      </p>

      <h3 className="mt-4 font-medium">听力 · 播放器 + 精听</h3>
      <p className="text-sm leading-relaxed">
        默认用浏览器 TTS 播报（可切换速度）。运行 <code>scripts/gen-listening-audio.ts</code> 可用 OpenAI TTS 生成 MP3。精听模式按句循环 + 输入对比原文。
      </p>

      <h3 className="mt-4 font-medium">写作 · AI 4 维批改</h3>
      <p className="text-sm leading-relaxed">
        输入作文后 GPT-4o 会按官方评分标准给 TR / CC / LR / GRA 4 维分数，加逐段点评和错误修正。模板库和 Band 6/7/8 范文可辅助学习。
      </p>

      <h3 className="mt-4 font-medium">口语 · P1/P2/P3</h3>
      <p className="text-sm leading-relaxed">
        文本模式：打字模拟答题，AI 评分 4 维（Fluency / Vocab / Grammar / Pronunciation）。Realtime 模式（需 OPENAI_API_KEY）：麦克风直连 AI 考官，实时语音对话。
      </p>

      <h2 className="mt-8 text-xl font-semibold">AI 配置</h2>
      <p className="text-sm leading-relaxed">
        默认支持 OpenAI · Anthropic · Ollama。在 <code>.env</code> 里可独立切换每种能力的提供商：
      </p>
      <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-x-auto"><code>{`AI_TEXT_PROVIDER=openai      # 或 anthropic / ollama
AI_VOICE_PROVIDER=openai
AI_STT_PROVIDER=openai
AI_REALTIME_PROVIDER=openai

OPENAI_API_KEY=sk-...`}</code></pre>
      <p className="mt-2 text-sm leading-relaxed">
        改完 <code>.env</code> 后重启服务。访问 <Link href="/settings" className="text-primary hover:underline">/settings</Link> 查看每种能力的当前状态。
      </p>

      <h2 className="mt-8 text-xl font-semibold">数据管理</h2>
      <ul className="mt-2 space-y-1 text-sm leading-relaxed list-disc pl-5">
        <li><Link href="/settings/account" className="text-primary hover:underline">导出数据</Link>：下载全部学习记录（JSON）</li>
        <li><Link href="/settings/account" className="text-primary hover:underline">删除账号</Link>：级联清除所有数据</li>
        <li>命令行备份：<code>./scripts/backup.sh</code></li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">安装为应用</h2>
      <p className="text-sm leading-relaxed">
        <strong>Chrome / Edge</strong>：地址栏右侧 <code>⤓ 安装</code> 图标<br />
        <strong>Safari (macOS)</strong>：分享 → 添加到程序坞<br />
        <strong>iOS Safari</strong>：分享 → 添加到主屏幕<br />
        安装后从 Launchpad / 主屏打开是独立窗口，图标是紫渐变"雅"字。
      </p>

      <h2 className="mt-8 text-xl font-semibold">法律</h2>
      <ul className="mt-2 space-y-1 text-sm leading-relaxed list-disc pl-5">
        <li><Link href="/terms" className="text-primary hover:underline">服务条款</Link></li>
        <li><Link href="/privacy" className="text-primary hover:underline">隐私政策</Link></li>
      </ul>
    </>
  );
}
