export const metadata = { title: "服务条款" };

export default function TermsPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">服务条款</h1>
      <p className="text-sm text-muted-foreground">最后更新：2026-07-25</p>

      <h2 className="mt-8 text-xl font-semibold">1. 接受条款</h2>
      <p className="text-sm leading-relaxed">
        通过访问或使用"雅思学习助手"（下称"本服务"），你同意受本服务条款约束。若不同意，请勿使用本服务。
      </p>

      <h2 className="mt-6 text-xl font-semibold">2. 账户</h2>
      <ul className="mt-2 space-y-1 text-sm leading-relaxed list-disc pl-5">
        <li>你需要提供真实有效的邮箱创建账户。</li>
        <li>你需要为账户下的所有活动负责，包括密码安全。</li>
        <li>禁止将账户转让、共享给他人。</li>
        <li>你可在"账户中心"随时导出数据或删除账户。</li>
      </ul>

      <h2 className="mt-6 text-xl font-semibold">3. 使用限制</h2>
      <p className="text-sm leading-relaxed">
        不得利用本服务进行以下行为：
      </p>
      <ul className="mt-2 space-y-1 text-sm leading-relaxed list-disc pl-5">
        <li>发布违反法律法规、侵犯他人权利的内容。</li>
        <li>逆向工程、破解、爬取本服务。</li>
        <li>滥用 AI 接口进行商业分发。</li>
        <li>冒充他人或伪造信息。</li>
      </ul>

      <h2 className="mt-6 text-xl font-semibold">4. AI 内容免责</h2>
      <p className="text-sm leading-relaxed">
        本服务使用第三方 AI（如 OpenAI GPT-4o）生成内容和评分。AI 输出仅供参考，非官方雅思评分，我们不保证准确性。请勿将 AI 评分作为最终成绩预测的唯一依据。
      </p>

      <h2 className="mt-6 text-xl font-semibold">5. 知识产权</h2>
      <p className="text-sm leading-relaxed">
        · 本服务的代码 / UI / 生成物归项目所有者所有。<br />
        · 你上传的作文、录音等归你所有。使用本服务即授予本服务处理你的内容以提供服务（如 AI 评分）的许可。<br />
        · 剑桥雅思真题版权归 UCLES 所有。用户自备的 PDF 仅供个人学习使用。
      </p>

      <h2 className="mt-6 text-xl font-semibold">6. 服务变更与终止</h2>
      <p className="text-sm leading-relaxed">
        我们可以随时更新、暂停或终止本服务的部分或全部功能。重大变更会提前通知。
      </p>

      <h2 className="mt-6 text-xl font-semibold">7. 责任限制</h2>
      <p className="text-sm leading-relaxed">
        本服务"按现状"提供，不作任何明示或默示的担保。在法律允许的最大范围内，我们对任何直接或间接损失不承担责任。
      </p>

      <h2 className="mt-6 text-xl font-semibold">8. 联系我们</h2>
      <p className="text-sm leading-relaxed">
        如有疑问，请通过项目仓库 issues 联系我们。
      </p>
    </>
  );
}
