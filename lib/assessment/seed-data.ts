/**
 * 静态诊断题库。诊断测试是标准化的（每个人做同一份），
 * 便于横向对比。真实的 P2+ 模块题库用另外的数据集。
 */

// ============ 词汇题：4 个梯度 × 8 题 ≈ 30+ 题 ============

export type VocabQ = {
  id: string;
  level: 3000 | 5000 | 7000 | 8500;
  prompt: string;    // 词
  options: string[]; // 4 个选项，中英文释义或英英
  answer: number;    // 正确选项下标
};

export const VOCAB_QUESTIONS: VocabQ[] = [
  // ---- 3000 级（基础）----
  { id: "v3-1", level: 3000, prompt: "achieve", options: ["实现，达到", "接受", "计算", "跳过"], answer: 0 },
  { id: "v3-2", level: 3000, prompt: "improve", options: ["证明", "改善，提高", "移动", "打印"], answer: 1 },
  { id: "v3-3", level: 3000, prompt: "environment", options: ["实验", "环境", "娱乐", "紧急情况"], answer: 1 },
  { id: "v3-4", level: 3000, prompt: "avoid", options: ["批准", "回应", "避免", "帮助"], answer: 2 },
  { id: "v3-5", level: 3000, prompt: "obvious", options: ["明显的", "焦虑的", "偶然的", "官方的"], answer: 0 },
  { id: "v3-6", level: 3000, prompt: "prefer", options: ["准备", "假装", "更喜欢", "阻止"], answer: 2 },
  { id: "v3-7", level: 3000, prompt: "opportunity", options: ["反对", "机会", "选择", "责任"], answer: 1 },
  { id: "v3-8", level: 3000, prompt: "similar", options: ["单一的", "静止的", "相似的", "严格的"], answer: 2 },

  // ---- 5000 级（进阶）----
  { id: "v5-1", level: 5000, prompt: "significant", options: ["有意义的，重大的", "微小的", "临时的", "秘密的"], answer: 0 },
  { id: "v5-2", level: 5000, prompt: "consequence", options: ["会议", "结果，后果", "浓度", "组成"], answer: 1 },
  { id: "v5-3", level: 5000, prompt: "estimate", options: ["估计", "延长", "承担", "教育"], answer: 0 },
  { id: "v5-4", level: 5000, prompt: "occur", options: ["订购", "占据", "发生", "拥有"], answer: 2 },
  { id: "v5-5", level: 5000, prompt: "acquire", options: ["询问", "获得", "行动", "同意"], answer: 1 },
  { id: "v5-6", level: 5000, prompt: "tremendous", options: ["透明的", "紧张的", "巨大的，惊人的", "临时的"], answer: 2 },
  { id: "v5-7", level: 5000, prompt: "deteriorate", options: ["决心", "恶化", "决定", "描述"], answer: 1 },
  { id: "v5-8", level: 5000, prompt: "coherent", options: ["彩色的", "商业的", "连贯的", "舒适的"], answer: 2 },

  // ---- 7000 级（高级）----
  { id: "v7-1", level: 7000, prompt: "ubiquitous", options: ["独特的", "无处不在的", "不确定的", "巨大的"], answer: 1 },
  { id: "v7-2", level: 7000, prompt: "ambivalent", options: ["野心勃勃的", "友善的", "矛盾的，两面的", "环境的"], answer: 2 },
  { id: "v7-3", level: 7000, prompt: "meticulous", options: ["粗心的", "机械的", "神秘的", "一丝不苟的"], answer: 3 },
  { id: "v7-4", level: 7000, prompt: "scrutinize", options: ["仔细审查", "痉挛", "刮擦", "屈从"], answer: 0 },
  { id: "v7-5", level: 7000, prompt: "prevalent", options: ["普遍的，流行的", "预防的", "先前的", "私人的"], answer: 0 },
  { id: "v7-6", level: 7000, prompt: "corroborate", options: ["合作", "证实", "腐蚀", "隔离"], answer: 1 },
  { id: "v7-7", level: 7000, prompt: "articulate", options: ["清楚表达", "人工的", "艺术的", "涉及"], answer: 0 },
  { id: "v7-8", level: 7000, prompt: "detrimental", options: ["有害的", "决定性的", "详细的", "决心的"], answer: 0 },

  // ---- 8500 级（native/学术）----
  { id: "v8-1", level: 8500, prompt: "obfuscate", options: ["观察", "使模糊，混淆", "占据", "客观化"], answer: 1 },
  { id: "v8-2", level: 8500, prompt: "recalcitrant", options: ["重新计算的", "顽固不服从的", "召回的", "记忆的"], answer: 1 },
  { id: "v8-3", level: 8500, prompt: "quintessential", options: ["五重的", "精髓的，典型的", "季度的", "追问的"], answer: 1 },
  { id: "v8-4", level: 8500, prompt: "perfunctory", options: ["敷衍的，例行公事的", "完美的", "延续的", "多用途的"], answer: 0 },
  { id: "v8-5", level: 8500, prompt: "sanguine", options: ["神圣的", "血腥的", "乐观的", "咸的"], answer: 2 },
  { id: "v8-6", level: 8500, prompt: "exacerbate", options: ["兴奋", "使恶化", "彻底检查", "过度使用"], answer: 1 },
];

// ============ 阅读测试：一篇 ~500 词 + 8 题 ============

export const READING_PASSAGE = {
  title: "The History of Coffee",
  content: `The origin of coffee can be traced back to the ancient forests of the Ethiopian highlands. According to legend, a goat herder named Kaldi first noticed the energizing effects of coffee cherries when his goats became remarkably lively after eating them. Kaldi reported his findings to the local monastery, where the abbot made a drink from the berries and discovered that it kept him alert through the long hours of evening prayer.

News of the invigorating beverage soon spread. By the 15th century, coffee was being cultivated in Yemen, and coffee houses (known as qahveh khaneh) began to appear in cities across the Arabian Peninsula, becoming centers of social activity where people gathered to listen to music, watch performers, play chess, and discuss the news of the day.

European travelers to the Near East brought back stories of an unusual dark black beverage. By the 17th century, coffee had made its way to Europe and was becoming popular across the continent. Coffee houses quickly became centers of social activity and communication in the major cities of England, Austria, France, Germany, and Holland. In London alone, more than 300 coffee houses were in operation by the mid-1600s, and they were sometimes called "penny universities" because for the price of a penny one could purchase a cup of coffee and engage in stimulating conversation.

Coffee eventually replaced beer and wine as the breakfast drink of choice. Those who drank coffee instead of alcohol began the day alert and energized, resulting in a marked increase in the quality of their work. As demand for the beverage continued to spread, competition to cultivate coffee outside of Arabia grew intense.

The Dutch finally succeeded in obtaining seedlings in the latter half of the 17th century, and their efforts to grow them in India were successful. They expanded coffee cultivation to Java and later to other Indonesian islands. The Dutch soon became the primary suppliers of coffee to Europe.

Missionaries and travelers, traders and colonists continued to carry coffee seeds to new lands, and coffee trees were planted worldwide. Plantations were established in magnificent tropical forests and on rugged mountain highlands. Some crops flourished, while others were short-lived. New nations were established on coffee economies. Fortunes were made and lost. By the end of the 18th century, coffee had become one of the world's most profitable export crops. After crude oil, coffee is the most sought after commodity in the world today.`,
};

export type ReadingQ = { id: string; type: "tfng" | "mcq"; prompt: string; options?: string[]; answer: string };

export const READING_QUESTIONS: ReadingQ[] = [
  { id: "r1", type: "tfng", prompt: "Kaldi personally brewed the first coffee drink.", answer: "FALSE" },
  { id: "r2", type: "tfng", prompt: "Coffee houses in Arabia were used for social and cultural activities.", answer: "TRUE" },
  { id: "r3", type: "tfng", prompt: "Coffee was more expensive than beer in 17th century London.", answer: "NOT GIVEN" },
  { id: "r4", type: "mcq", prompt: "Why were English coffee houses called 'penny universities'?",
    options: ["They charged a penny for admission.", "They were run by university students.", "A penny bought coffee and access to intellectual discussion.", "They taught economics."], answer: "C" },
  { id: "r5", type: "mcq", prompt: "According to the passage, who successfully cultivated coffee outside Arabia first?",
    options: ["The English", "The Dutch", "The French", "The Ethiopians"], answer: "B" },
  { id: "r6", type: "tfng", prompt: "Coffee cultivation was always successful wherever it was planted.", answer: "FALSE" },
  { id: "r7", type: "mcq", prompt: "The word 'invigorating' in paragraph 2 is closest in meaning to:",
    options: ["expensive", "energizing", "unusual", "bitter"], answer: "B" },
  { id: "r8", type: "tfng", prompt: "Coffee is currently the most traded commodity in the world.", answer: "FALSE" },
];

// ============ 听力：脚本（可用 TTS 播报，也可显示文本 fallback）+ 6 题 ============

export const LISTENING_SCRIPT = `Woman: Hi, I'm calling about the language courses I saw advertised. Could you tell me more about them?

Man: Of course. We offer courses in five languages: French, Spanish, German, Japanese, and Mandarin Chinese. Each course runs for twelve weeks.

Woman: And what levels are available?

Man: We have three levels: beginner, intermediate, and advanced. Classes meet twice a week, on Tuesdays and Thursdays, from seven to nine in the evening.

Woman: How much does a course cost?

Man: The standard fee is 350 pounds, but if you register before the fifteenth of September, you get a 20% early bird discount.

Woman: That's very reasonable. Do I need any textbooks?

Man: Yes, textbooks are required and are not included in the course fee. They typically cost around 40 pounds. However, we do provide free online audio materials.

Woman: What about the class size?

Man: We keep classes small, usually between eight and twelve students, to ensure everyone gets enough practice.

Woman: Perfect. Where are you located?

Man: Our main center is at 42 Church Road, near the town hall. There's parking available at the back of the building.`;

export type ListeningQ = { id: string; type: "gapfill" | "mcq"; prompt: string; options?: string[]; answer: string };

export const LISTENING_QUESTIONS: ListeningQ[] = [
  { id: "l1", type: "gapfill", prompt: "How many languages does the school offer? ______", answer: "5" },
  { id: "l2", type: "gapfill", prompt: "How many weeks does each course run? ______ weeks", answer: "12" },
  { id: "l3", type: "mcq", prompt: "Which days do classes meet?",
    options: ["Monday and Wednesday", "Tuesday and Thursday", "Wednesday and Friday", "Every weekday"], answer: "B" },
  { id: "l4", type: "gapfill", prompt: "The early bird discount is ______%", answer: "20" },
  { id: "l5", type: "gapfill", prompt: "Textbooks cost around ______ pounds", answer: "40" },
  { id: "l6", type: "gapfill", prompt: "Class size is between ______ and 12 students", answer: "8" },
];

// ============ 写作：Task 2 mini（200 词）============

export const WRITING_PROMPT = {
  task: "task2-mini",
  content: `Some people think that formal education is the most important factor in career success, while others believe that practical experience matters more.

Discuss both views and give your own opinion.

Write at least 200 words. You have 15 minutes.`,
  minWords: 200,
  minutes: 15,
};

// ============ 口语：3 个 P1 问题 ============

export const SPEAKING_QUESTIONS = [
  { id: "s1", question: "Where do you come from? Can you describe your hometown briefly?" },
  { id: "s2", question: "Do you work or are you a student? Tell me a little about what you do." },
  { id: "s3", question: "What do you usually do in your free time? Why do you enjoy these activities?" },
];
