/**
 * 写作模板 + 范文（Band 6/7/8+）
 */

export type Template = {
  id: string;
  category: "task1-intro" | "task1-body" | "task1-overview" | "task2-intro" | "task2-body" | "task2-conclusion";
  label: string;
  content: string;
  notes: string;
};

export const TEMPLATES: Template[] = [
  // ---- Task 1 ----
  {
    id: "t1-intro-1",
    category: "task1-intro",
    label: "Task 1 · 图表引言（改写题干）",
    content: `The [bar chart / line graph / pie chart / table] illustrates [what is shown] over the period from [start] to [end] / in [location].`,
    notes: "永远第一段：改写题干，不复述数字。用 illustrates/depicts/provides information about 替换 shows。",
  },
  {
    id: "t1-overview-1",
    category: "task1-overview",
    label: "Task 1 · 概述段（2 句 overall）",
    content: `Overall, it is clear that [main trend 1]. Additionally, [main trend 2 or comparison].`,
    notes: "第二段。选 2 条最显著趋势，不含具体数字。此段是 7+ 的关键——很多 6 分作文没写。",
  },
  {
    id: "t1-body-trend",
    category: "task1-body",
    label: "Task 1 · 趋势段（描述变化）",
    content: `[Subject] rose / fell / remained stable at [number] in [year], before increasing sharply / gradually to reach [number] in [year]. In contrast, [comparison].`,
    notes: "动词-名词多样化：rise/fall/climb/plummet/soar/dip/level off；副词：sharply/gradually/steadily/dramatically。",
  },

  // ---- Task 2 ----
  {
    id: "t2-intro-1",
    category: "task2-intro",
    label: "Task 2 · Discuss both views 引言",
    content: `Nowadays, [topic sentence rephrasing the issue]. While some argue that [view 1], others believe that [view 2]. In my opinion, [thesis stating your position clearly].`,
    notes: `3 句：背景 → 双方观点 → 明确立场。避免"in this essay I will discuss…"这种老套开头。`,
  },
  {
    id: "t2-intro-2",
    category: "task2-intro",
    label: "Task 2 · Agree/Disagree 引言",
    content: `There has been an ongoing debate regarding [issue]. While the argument that [statement] has some merit, I strongly [agree / disagree] with this view because [main reason].`,
    notes: `明确表态，"strongly agree/disagree" 或 "partly agree" 都比含糊的 "it depends" 强。`,
  },
  {
    id: "t2-body-1",
    category: "task2-body",
    label: "Task 2 · 论证段（PEEL 结构）",
    content: `[Point] One primary reason is that [claim]. [Explain] This is because [reasoning]. [Example] For instance, [concrete example]. [Link] Consequently, [tie back to thesis].`,
    notes: `PEEL：Point-Explain-Example-Link。例子用具体人/机构/研究——"a 2020 study by Oxford" 比 "many people say" 强。`,
  },
  {
    id: "t2-body-2",
    category: "task2-body",
    label: "Task 2 · 让步段（Counterargument）",
    content: `Admittedly, [opposing view] is not without merit; [brief acknowledgment]. However, [rebuttal explaining why your side is stronger].`,
    notes: "承认对方一定合理，但立即反驳。用 Admittedly/Granted/While it is true that 开头能拿 CC 分。",
  },
  {
    id: "t2-conclusion-1",
    category: "task2-conclusion",
    label: "Task 2 · 结论",
    content: `In conclusion, [restate thesis in different words]. While [minor concession], [strong final statement supporting your position]. It is therefore essential that [call to action / prediction].`,
    notes: "重申立场，不引入新论据。可加行动号召或未来预测让结尾有力。",
  },
];

// ============ 范文（Task 2）============

export type SampleEssay = {
  id: string;
  promptCategory: string;
  prompt: string;
  content: string;
  band: 6 | 7 | 8 | 9;
  annotations: { paragraph: number; comment: string }[];
};

export const SAMPLE_ESSAYS: SampleEssay[] = [
  {
    id: "sample-b7-education",
    promptCategory: "opinion",
    prompt: `Some people believe that university education should be free for everyone, while others argue that students should pay for their own education. Discuss both views and give your own opinion.`,
    band: 7,
    content: `Higher education has long been a subject of intense debate, particularly regarding who should shoulder its financial burden. While some maintain that university tuition should be free for all, others contend that students themselves ought to pay. In my view, a balanced model that combines public funding with individual contribution is the most sustainable approach.

Those who support free university education often argue that access to learning is a fundamental right. When financial barriers are removed, students from disadvantaged backgrounds gain an equal opportunity to develop their talents, which ultimately benefits society through a more skilled workforce and reduced inequality. Countries such as Germany and Norway, where higher education is publicly funded, demonstrate that this policy can produce highly educated populations without imposing debt burdens on graduates.

On the other hand, proponents of tuition fees point out that free education has significant costs. Universities require substantial funding to maintain quality staff, facilities, and research capabilities. If governments cover all these expenses, taxes must rise, or resources may be diverted from other public services such as healthcare. Furthermore, when students invest their own money, they often show greater commitment and take their studies more seriously.

In my opinion, the most effective solution lies in the middle ground. Governments should provide substantial subsidies to keep tuition affordable, while students contribute a modest portion, ideally through income-contingent loans that only require repayment once graduates earn above a certain threshold. This ensures fairness, encourages seriousness, and prevents the crippling debt seen in some countries.

In conclusion, while both extremes have valid arguments, a hybrid model best balances accessibility, quality, and personal responsibility.`,
    annotations: [
      { paragraph: 1, comment: "引言点明议题 + 清晰表态。'shoulder its financial burden' 是不错的搭配。" },
      { paragraph: 2, comment: "支持免费的观点：具体国家例证（Germany, Norway）+ 逻辑链条完整。" },
      { paragraph: 3, comment: "反对方观点：cost breakdown + 学生动力，论据平衡。" },
      { paragraph: 4, comment: `个人立场：具体机制（income-contingent loans），比空泛的"平衡"高级。` },
      { paragraph: 5, comment: "简短结论重申立场。" },
    ],
  },
  {
    id: "sample-b8-social-media",
    promptCategory: "cause-effect",
    prompt: `Many people believe that social networking sites have had a huge negative impact on both individuals and society. To what extent do you agree with this view?`,
    band: 8,
    content: `The proliferation of social networking platforms has sparked heated debate about their societal impact. While critics argue that these sites primarily generate harm, I believe the reality is more nuanced: they have profound negative consequences that must be acknowledged, yet their benefits should not be dismissed.

On the harmful side, social networking sites can inflict serious damage on mental health. Research by the American Psychological Association has linked heavy use of platforms like Instagram with heightened rates of anxiety and depression among adolescents, largely due to unfavourable social comparisons and the pursuit of external validation through likes. Additionally, these platforms have been implicated in the erosion of public discourse, as algorithms tend to amplify polarising content, creating echo chambers that entrench division rather than promote understanding.

Nevertheless, dismissing social networking as uniformly negative would overlook substantial advantages. These platforms enable unprecedented connectivity, allowing dispersed families to maintain relationships and marginalised communities to organise around shared causes. For instance, activists during the Arab Spring leveraged Twitter to coordinate protests and share information that traditional media suppressed. Moreover, small businesses now access global markets with minimal capital, democratising entrepreneurship in ways that were unimaginable two decades ago.

The critical issue, in my view, is not whether social networking is inherently good or bad, but rather how it is designed and consumed. Platforms driven purely by engagement metrics inevitably prioritise attention-grabbing content, often at the expense of user wellbeing. If regulations required greater algorithmic transparency and if users cultivated more mindful consumption habits, the balance could tilt significantly toward net benefit.

In conclusion, while social networking sites undeniably cause significant harm, particularly to mental health and public discourse, they also offer genuine advantages. The path forward lies not in condemning the technology but in reshaping its incentives.`,
    annotations: [
      { paragraph: 1, comment: "'proliferation, heated debate, nuanced' 均属 8+ 词汇。立场明确又不极端。" },
      { paragraph: 2, comment: "两个具体伤害 + 权威来源（APA）。'echo chambers, entrench division' 高级表达。" },
      { paragraph: 3, comment: "反面论据同样具体（Arab Spring, Twitter）。承认权重合理。" },
      { paragraph: 4, comment: `个人立场提升到"设计与使用方式"元层面，8 分的深度。` },
      { paragraph: 5, comment: "结论平衡且不重复，落到解决方向。" },
    ],
  },
  {
    id: "sample-b6-employment",
    promptCategory: "argument",
    prompt: `In many countries, more and more young people are leaving school and unable to find jobs after graduation. What problems do you think youth unemployment will cause? Give reasons and make some suggestions.`,
    band: 6,
    content: `Nowadays, many young people cannot find work after they finish school. This is a big problem in many countries. In this essay, I will discuss the problems and give some solutions.

The first problem is that unemployed young people may feel bad about themselves. When they cannot get a job, they might lose confidence and become sad. Some of them may even do bad things like drinking or fighting. This is not good for them and their families.

Also, when there are many unemployed young people, the society will have problems. The government has to spend more money to help them. This means less money for other important things like schools and hospitals. Also, crime rates may go up because unemployed people need money.

There are some ways to solve this problem. First, schools should teach students useful skills, like computer skills and English. This can help them find jobs easily. Second, the government should give money to companies that hire young people. This will encourage more companies to give jobs to young workers.

In conclusion, youth unemployment causes many problems for both individuals and society. But if schools teach useful skills and the government helps companies, this problem can be solved.`,
    annotations: [
      { paragraph: 1, comment: `结构清晰但语言基础："many, big problem, in this essay I will…" 都是低分句型。` },
      { paragraph: 2, comment: "论据合理但缺具体例证。'feel bad, become sad, do bad things' 词汇单一。" },
      { paragraph: 3, comment: "转折用 Also 而非 Furthermore/Moreover，衔接生硬。" },
      { paragraph: 4, comment: "解决方案泛泛而谈。'help companies' 无具体机制。" },
      { paragraph: 5, comment: "重复引言。可提升到 7 分的方向：加具体国家/数据 + 复杂句 + 高级词汇。" },
    ],
  },
];
