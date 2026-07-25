export const metadata = { title: "隐私政策" };

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">隐私政策</h1>
      <p className="text-sm text-muted-foreground">最后更新：2026-07-25</p>

      <h2 className="mt-8 text-xl font-semibold">数据本地存储</h2>
      <p className="text-sm leading-relaxed">
        本服务采用<strong>本地部署</strong>模式：所有用户数据（账号、学习记录、作文、录音）保存在你本机（Docker volume 或 SQLite 文件），我们的项目<strong>不运营任何中央服务器</strong>，不收集你的数据。
      </p>

      <h2 className="mt-6 text-xl font-semibold">我们收集哪些数据</h2>
      <ul className="mt-2 space-y-1 text-sm leading-relaxed list-disc pl-5">
        <li><strong>账户</strong>：邮箱 + 加密后的密码哈希（bcrypt · cost 10）</li>
        <li><strong>学习记录</strong>：评估结果、词汇 SRS 状态、做题历史、写作提交、口语会话</li>
        <li><strong>Session</strong>：加密 cookie（iron-session · AES-256）保存在浏览器</li>
      </ul>
      <p className="mt-2 text-sm leading-relaxed">
        所有数据只存在本地。你导出 / 删除账户会立即从磁盘清除。
      </p>

      <h2 className="mt-6 text-xl font-semibold">第三方 AI 服务</h2>
      <p className="text-sm leading-relaxed">
        当你使用以下功能时，相关内容会被发送到 AI 提供商（默认 OpenAI）：
      </p>
      <ul className="mt-2 space-y-1 text-sm leading-relaxed list-disc pl-5">
        <li>写作 AI 批改 → 作文全文发送到 OpenAI</li>
        <li>口语 AI 评分 → 会话转写文本发送到 OpenAI</li>
        <li>AI 出题 → 主题参数发送到 OpenAI</li>
        <li>Realtime 语音对话 → 音频直接从浏览器 WebRTC 连接到 OpenAI（不经本机服务）</li>
        <li>TTS 音频生成 → 文本发送到 OpenAI</li>
      </ul>
      <p className="mt-2 text-sm leading-relaxed">
        AI 提供商的数据使用政策请参考其官方文档。你可以在 <code>.env</code> 中切换提供商（openai / anthropic / ollama），Ollama 是完全本地模型，不产生外部数据传输。
      </p>

      <h2 className="mt-6 text-xl font-semibold">Cookies</h2>
      <ul className="mt-2 space-y-1 text-sm leading-relaxed list-disc pl-5">
        <li><code>ielts-study-session</code>：登录会话 · HttpOnly · SameSite=Lax · 30 天过期</li>
        <li><code>theme</code>：主题偏好（localStorage）</li>
        <li><code>pwa-install-dismissed</code>：安装提示状态（localStorage）</li>
        <li><code>essay-draft-*</code>：作文自动保存草稿（localStorage）</li>
      </ul>
      <p className="mt-2 text-sm leading-relaxed">
        本服务不使用任何广告 / 追踪 / 分析 cookies。
      </p>

      <h2 className="mt-6 text-xl font-semibold">你的权利</h2>
      <ul className="mt-2 space-y-1 text-sm leading-relaxed list-disc pl-5">
        <li><strong>访问 & 导出</strong>：账户中心 → 下载我的数据（JSON）</li>
        <li><strong>更正</strong>：账户中心 → 修改密码</li>
        <li><strong>删除</strong>：账户中心 → 永久删除账号（级联删除所有关联数据）</li>
      </ul>

      <h2 className="mt-6 text-xl font-semibold">儿童隐私</h2>
      <p className="text-sm leading-relaxed">
        本服务不面向 13 岁以下用户。如果你是未成年人，请在监护人同意下使用。
      </p>

      <h2 className="mt-6 text-xl font-semibold">变更</h2>
      <p className="text-sm leading-relaxed">
        隐私政策更新会显示在本页面顶部日期。重大变更会在应用内通知。
      </p>
    </>
  );
}
