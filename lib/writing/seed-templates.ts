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
  {
    id: "t1-body-compare",
    category: "task1-body",
    label: "Task 1 · 比较段（同期对比）",
    content: `[Subject A] was significantly higher / lower than [Subject B], at [number] compared with [number]. Meanwhile, [Subject C] and [Subject D] followed a similar pattern, both standing at around [number].`,
    notes: "静态图（同一年多项对比）用比较结构：X times as high as / twice/half/a third of / the highest-lowest figure was。避免逐项罗列。",
  },
  {
    id: "t1-body-proportion",
    category: "task1-body",
    label: "Task 1 · 饼图 / 占比段",
    content: `[Category] accounted for the largest proportion, at [X]%, followed by [category] at [Y]%. The remaining [Z]% was made up of [smaller categories]. Collectively, [group] represented over half of the total.`,
    notes: "占比表达：account for / make up / represent / constitute。序数衔接：followed by / the second largest / the smallest share。",
  },
  {
    id: "t1-process-intro",
    category: "task1-intro",
    label: "Task 1 · 流程图引言",
    content: `The diagram illustrates the process by which [product / natural phenomenon] is [produced / recycled / formed]. Overall, the process consists of [number] main stages, beginning with [first step] and ending with [final output].`,
    notes: "流程图引言把 overall 直接并进来：说明总共几步、起点和终点。全程用一般现在时 + 被动语态。",
  },
  {
    id: "t1-process-body",
    category: "task1-body",
    label: "Task 1 · 流程图步骤段",
    content: `At the first stage, [raw material] is [collected / heated / mixed]. Once this is complete, the [material] is then transferred to [next step], where it is [transformed]. Subsequently, [next step]. Finally, [end product] is [packaged / distributed].`,
    notes: "顺序连接词：initially / first / then / after that / subsequently / once … has been done / finally。全程被动语态，主语是物不是人。",
  },
  {
    id: "t1-map-body",
    category: "task1-body",
    label: "Task 1 · 地图变化段",
    content: `In [year 1], the area was largely [rural / undeveloped], featuring [original features]. By [year 2], however, [feature] had been replaced by [new feature], and a [new structure] had been constructed to the [north / south] of [landmark].`,
    notes: "地图题用过去/现在完成时对比变化：was replaced by / had been constructed / was demolished / expanded。方位词：to the north of / adjacent to / on the outskirts。",
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
  {
    id: "t2-intro-3",
    category: "task2-intro",
    label: "Task 2 · Advantages / Disadvantages 引言",
    content: `[Trend / development] has become increasingly common in recent years. Although this shift brings certain drawbacks, I would argue that its benefits are more significant / that its disadvantages outweigh the advantages.`,
    notes: "利弊题必须在引言就表态哪边更重。区分 outweigh（比较权重）vs. 单纯列举，考官看的是有没有 clear position。",
  },
  {
    id: "t2-intro-4",
    category: "task2-intro",
    label: "Task 2 · Problem / Solution（Cause）引言",
    content: `In many parts of the world, [problem] has emerged as a pressing concern. This essay will examine the primary causes behind this phenomenon and propose several viable solutions.`,
    notes: "问题解决 / 原因结果题：引言点明问题严重性，预告主体结构（causes + solutions 或 problems + solutions）。避免逐字复述题干。",
  },
  {
    id: "t2-intro-5",
    category: "task2-intro",
    label: "Task 2 · Two-part / Direct question 引言",
    content: `[Background sentence rephrasing the topic]. This raises the question of [first question] and how best to [second question]. Both aspects will be addressed below.`,
    notes: "双问题题（two-part question）：引言必须点到两个问题，主体各答一个。漏答一问是 TR 掉分重灾区。",
  },
  {
    id: "t2-body-3",
    category: "task2-body",
    label: "Task 2 · 原因分析段",
    content: `The root of this problem can be traced to [underlying cause]. As [explanation of mechanism], it is hardly surprising that [consequence]. A telling example is [specific case], which illustrates how [cause] leads directly to [effect].`,
    notes: "分析因果用 be traced to / stem from / be attributed to / give rise to / result in。因果链要显式：cause → mechanism → effect。",
  },
  {
    id: "t2-body-4",
    category: "task2-body",
    label: "Task 2 · 解决方案段",
    content: `One practical measure would be to [solution]. If [actor, e.g. governments / schools] were to [action], [positive outcome] could be achieved. This approach has already proven effective in [context], where [evidence of success].`,
    notes: "方案段用虚拟/条件句显语法多样：If … were to / Should governments … / By doing X, Y could be achieved。方案要具体到谁做什么。",
  },
  {
    id: "t2-conclusion-2",
    category: "task2-conclusion",
    label: "Task 2 · 结论（利弊 / 问题解决题）",
    content: `To sum up, although [acknowledge the other side briefly], the [advantages / underlying causes] discussed above make it clear that [final position]. With [suitable measures / a balanced approach], [optimistic or cautionary outlook].`,
    notes: "结论句式换新：To sum up / On balance / All things considered。呼应主体的两点，不要引入新信息。",
  },
  {
    id: "t2-cohesion-1",
    category: "task2-body",
    label: "Task 2 · 高级衔接词替换表",
    content: `递进: Moreover / Furthermore / In addition / What is more
转折: However / Nevertheless / That said / On the contrary
让步: Admittedly / Granted / While it is true that …
举例: For instance / To illustrate / A case in point is …
因果: Consequently / As a result / For this reason / Hence
总结: In essence / Ultimately / On balance`,
    notes: "别通篇 Firstly/Secondly/Also。衔接词分类记忆，同一篇内不重复用同一个。CC（连贯衔接）分靠这个。",
  },
  {
    id: "t2-upgrade-1",
    category: "task2-body",
    label: "Task 2 · 低分词 → 高分替换",
    content: `good → beneficial / advantageous / favourable
bad → detrimental / adverse / harmful
important → crucial / vital / paramount / significant
a lot of → a considerable amount of / numerous
think → contend / maintain / argue / be convinced that
big problem → a pressing issue / a serious concern
people → individuals / the public / society at large`,
    notes: "LR（词汇资源）升级：替换掉 good/bad/important/a lot of/people 这类小学词。但别硬塞不认识的大词，用错比用简单词扣更多。",
  },
];

// ============ 范文（Task 2）============

export type SampleEssay = {
  id: string;
  task: "task1" | "task2";
  promptCategory: string;
  prompt: string;
  content: string;
  band: 6 | 7 | 8 | 9;
  annotations: { paragraph: number; comment: string }[];
};

export const SAMPLE_ESSAYS: SampleEssay[] = [
  {
    id: "sample-b7-education",
    task: "task2",
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
    task: "task2",
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
    task: "task2",
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
  {
    id: "sample-b7-advdisadv-remote-work",
    task: "task2",
    promptCategory: "advantages-disadvantages",
    prompt: `An increasing number of people now work from home rather than in a traditional office. Do the advantages of this development outweigh the disadvantages?`,
    band: 7,
    content: `The way people work has changed dramatically, with remote employment becoming a permanent feature for many industries. Although working from home poses certain challenges, I believe its advantages clearly outweigh the drawbacks.

The most obvious benefit is flexibility. Without a daily commute, employees can save considerable time and money, while enjoying greater control over their schedules. This often translates into a better work-life balance, as parents in particular can attend to family responsibilities alongside their professional duties. In addition, companies benefit from lower overhead costs and access to a wider talent pool, since geography is no longer a barrier to recruitment.

Admittedly, remote work is not without its problems. Some employees struggle with isolation and find it difficult to separate their professional and personal lives, which can lead to overwork and stress. Collaboration may also suffer when colleagues cannot interact face to face. However, these issues can largely be mitigated through regular video meetings, clear boundaries, and occasional in-person gatherings.

On balance, while the disadvantages of remote work are real, they are manageable and are outweighed by the substantial gains in flexibility, cost savings, and productivity. As technology continues to improve, I expect these benefits to become even more pronounced.`,
    annotations: [
      { paragraph: 1, comment: "引言明确表态 outweigh，符合利弊题要求。'a permanent feature' 自然。" },
      { paragraph: 2, comment: "优点段两层：员工角度 + 公司角度，论据充分。'talent pool, overhead costs' 属地道搭配。" },
      { paragraph: 3, comment: "让步段先承认缺点再反驳（mitigated through…），体现平衡与批判性。" },
      { paragraph: 4, comment: "结论呼应立场并加未来预测。若想上 8：再加一个具体行业/数据例证。" },
    ],
  },
  {
    id: "sample-b8-problem-solution-traffic",
    task: "task2",
    promptCategory: "problem-solution",
    prompt: `Traffic congestion is becoming a serious problem in many major cities. What are the causes, and what measures could be taken to address it?`,
    band: 8,
    content: `Gridlocked roads have become an everyday reality in metropolitan areas across the globe. This essay will explore the principal causes of urban traffic congestion before outlining a number of measures that could realistically alleviate it.

Several interlocking factors lie at the heart of the problem. Foremost among them is the sheer growth in private car ownership, which has far outpaced the expansion of road infrastructure. As rising incomes make vehicles affordable to a broader segment of the population, cities designed decades ago simply cannot accommodate the volume of traffic. Compounding this is the inadequacy of public transport in many regions; where bus and rail networks are unreliable or poorly connected, commuters understandably default to driving.

Fortunately, a range of solutions has proven effective elsewhere. The most immediate is substantial investment in efficient public transportation, since a fast, affordable metro system offers a genuine alternative to the car. Cities such as Singapore have gone further, introducing congestion charges that discourage unnecessary journeys into central districts during peak hours. In the longer term, integrated urban planning that situates housing, workplaces, and amenities in close proximity can reduce the need to travel altogether.

In conclusion, urban congestion stems primarily from unchecked vehicle growth and weak public transport, but it is far from insoluble. Through coordinated investment, pricing mechanisms, and forward-looking planning, cities can restore mobility to their streets.`,
    annotations: [
      { paragraph: 1, comment: "'Gridlocked roads' 生动开头 + 清晰预告结构（causes → measures）。8 分的组织感。" },
      { paragraph: 2, comment: "原因段因果链严密：car ownership > infrastructure，再叠加 public transport 不足。'interlocking factors' 高级。" },
      { paragraph: 3, comment: "方案段每条都带具体例证（Singapore congestion charge），从短期到长期分层，说服力强。" },
      { paragraph: 4, comment: "结论精炼呼应两部分，'far from insoluble' 收束有力，无冗余重复。" },
    ],
  },
  {
    id: "sample-b7-twopart-technology",
    task: "task2",
    promptCategory: "two-part-question",
    prompt: `These days, many people rely on their smartphones for almost every daily task. Why has this happened, and is it a positive or negative development?`,
    band: 7,
    content: `Smartphones have woven themselves into the fabric of modern life, serving as our maps, wallets, cameras, and offices all at once. This essay will consider why people have grown so dependent on these devices and argue that, on balance, the trend is a positive one.

There are two main reasons behind this reliance. Firstly, smartphones offer unrivalled convenience: a single device can now handle tasks that once required numerous separate tools, from banking to booking travel. Secondly, the rapid spread of affordable internet access has made these functions available to almost everyone, so it is only natural that people integrate them into their routines.

In my view, this development is largely beneficial. Smartphones save time, keep families connected across distances, and give ordinary users instant access to information and services that were once the preserve of specialists. A farmer in a remote village, for example, can now check market prices or weather forecasts that directly improve his livelihood. While excessive screen time is a legitimate concern, this is a matter of personal discipline rather than a flaw in the technology itself.

In conclusion, the widespread dependence on smartphones stems from their convenience and accessibility, and I believe the advantages they bring to daily life clearly outweigh the potential downsides.`,
    annotations: [
      { paragraph: 1, comment: "引言点明两问（why + positive/negative），two-part 题的关键。开头比喻生动。" },
      { paragraph: 2, comment: "答第一问：两条清晰原因，Firstly/Secondly 结构明确。" },
      { paragraph: 3, comment: "答第二问：立场 + 具体例证（远程村庄农民），并预先处理反方（screen time）。" },
      { paragraph: 4, comment: "结论同时收束两问。若上 8：例证再具体化、句式再多样。" },
    ],
  },
  {
    id: "sample-t1-b7-bar",
    task: "task1",
    promptCategory: "bar-chart",
    prompt: `The bar chart below shows the percentage of households with internet access in four countries in 2010 and 2020. Summarise the information by selecting and reporting the main features.`,
    band: 7,
    content: `The bar chart compares the proportion of households with internet access in four countries, namely the USA, the UK, Brazil, and India, in the years 2010 and 2020.

Overall, it is clear that internet access rose in all four countries over the decade. The two developed nations, the USA and the UK, maintained the highest levels of connectivity throughout, whereas India, despite the fastest growth, remained the least connected.

In 2010, around 70% of households in the USA had internet access, closely followed by the UK at roughly 65%. By 2020, both figures had climbed to over 90%, with the USA reaching approximately 94%. The gap between these two countries remained narrow across the period.

Brazil and India started from far lower bases. Just 30% of Brazilian households were connected in 2010, though this had more than doubled to around 75% by 2020. India saw the most dramatic proportional increase, from a mere 10% to nearly 50%, yet it still trailed the other three nations by a considerable margin.`,
    annotations: [
      { paragraph: 1, comment: "引言改写题干、列出四国和两个年份，不复述数字。" },
      { paragraph: 2, comment: "Overall 段抓两条大趋势（全部上升 + 发达国家领先），无具体数字——7+ 的关键。" },
      { paragraph: 3, comment: "主体先写高值组，数字带近似词 around/approximately，动词多样 climbed/reached。" },
      { paragraph: 4, comment: "低值组对比：'more than doubled, the most dramatic increase, trailed by a margin' 比较语言到位。" },
    ],
  },
  {
    id: "sample-t1-b8-line",
    task: "task1",
    promptCategory: "line-graph",
    prompt: `The line graph shows the average monthly temperatures in three cities over the course of a year. Summarise the information by selecting and reporting the main features.`,
    band: 8,
    content: `The line graph illustrates how average monthly temperatures fluctuated across a single year in three cities: Moscow, Cairo, and Sydney.

Overall, the three cities exhibited markedly different patterns. While Moscow and Cairo experienced their warmest months in the middle of the year, Sydney displayed the opposite trend, peaking at the beginning and end. Cairo remained the hottest city for most of the period.

Moscow underwent the most extreme variation. Beginning at a bitterly cold minus 10°C in January, its temperature climbed steadily to a summer high of around 23°C in July, before falling back sharply towards freezing by December. Cairo, by contrast, was consistently warm, ranging from a mild 14°C in winter to a peak of approximately 35°C in midsummer.

Sydney's curve mirrored the northern cities in reverse, reflecting its southern-hemisphere location. Its temperatures were highest in January, at roughly 26°C, dipped to a low of about 12°C around July, and then recovered towards the year's end. Consequently, for a brief period in mid-year, Sydney was cooler than Cairo yet warmer than Moscow.`,
    annotations: [
      { paragraph: 1, comment: "引言精准改写，用 fluctuated 替换 shows。" },
      { paragraph: 2, comment: "Overall 段点出三城模式差异 + 南北半球对立，展现对数据的深度理解。" },
      { paragraph: 3, comment: "'bitterly cold, climbed steadily, fell back sharply' 词汇与副词丰富，数字精确近似。" },
      { paragraph: 4, comment: "解释 Sydney 反相并给出因果（southern-hemisphere），结尾三城横向对比——8 分的综合归纳。" },
    ],
  },
  {
    id: "sample-t1-b7-process",
    task: "task1",
    promptCategory: "process",
    prompt: `The diagram below shows how glass bottles are recycled. Summarise the information by selecting and reporting the main features.`,
    band: 7,
    content: `The diagram illustrates the process by which used glass bottles are recycled into new glass products. Overall, the process is cyclical and consists of six main stages, beginning with the collection of waste glass and ending with the distribution of newly manufactured bottles.

At the first stage, used bottles are collected from households and deposited in recycling bins. These are then transported to a processing facility, where the glass is sorted by colour and any contaminants such as caps and labels are removed.

Once the glass has been cleaned, it is crushed into small fragments known as cullet. The cullet is subsequently fed into a furnace and melted at extremely high temperatures, together with raw materials such as sand and soda ash.

In the final stages, the molten glass is poured into moulds and shaped into new bottles. After being cooled and inspected for quality, the finished products are packaged and delivered to shops, from where they may eventually re-enter the recycling process.`,
    annotations: [
      { paragraph: 1, comment: "引言 + overall 合并：说明总步数、起点终点，并点出 cyclical 特征。" },
      { paragraph: 2, comment: "全程被动语态（are collected / are removed），主语是物，符合流程题规范。" },
      { paragraph: 3, comment: "顺序连接 Once … has been / subsequently，术语 cullet 增强精确度。" },
      { paragraph: 4, comment: "结尾点出循环回到起点，呼应 overall 的 cyclical，结构闭合。" },
    ],
  },
];
