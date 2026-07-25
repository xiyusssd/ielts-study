/**
 * 内置雅思核心词库（4 个 CEFR 等级 × ~40 词 = 约 160 词）
 *
 * 生产环境应从 content/wordlists/*.csv 导入完整柯林斯 3500/5500/8000。
 * 这里是能立即跑起来的最小可用样本，覆盖所有 P2 功能测试路径。
 */

export type SeedWord = {
  spelling: string;
  ipa: string;
  level: 3000 | 5000 | 7000 | 8500;
  translations: { pos: string; meaning: string }[];
  examples: { en: string; zh: string }[];
  tags?: string[];
};

export const SEED_WORDS: SeedWord[] = [
  // ---- 3000 级 · 高频基础 ----
  { spelling: "achieve", ipa: "/əˈtʃiːv/", level: 3000, translations: [{ pos: "v.", meaning: "达到，实现" }], examples: [{ en: "She achieved her goal after years of hard work.", zh: "多年努力后她实现了目标。" }], tags: ["core"] },
  { spelling: "improve", ipa: "/ɪmˈpruːv/", level: 3000, translations: [{ pos: "v.", meaning: "改善，提高" }], examples: [{ en: "Your English has improved a lot.", zh: "你的英语进步很大。" }], tags: ["core"] },
  { spelling: "environment", ipa: "/ɪnˈvaɪrənmənt/", level: 3000, translations: [{ pos: "n.", meaning: "环境" }], examples: [{ en: "We must protect the environment.", zh: "我们必须保护环境。" }] },
  { spelling: "avoid", ipa: "/əˈvɔɪd/", level: 3000, translations: [{ pos: "v.", meaning: "避免" }], examples: [{ en: "Avoid making the same mistake twice.", zh: "避免重蹈覆辙。" }] },
  { spelling: "obvious", ipa: "/ˈɒbviəs/", level: 3000, translations: [{ pos: "adj.", meaning: "明显的" }], examples: [{ en: "It's obvious that he was lying.", zh: "很明显他在说谎。" }] },
  { spelling: "prefer", ipa: "/prɪˈfɜː/", level: 3000, translations: [{ pos: "v.", meaning: "更喜欢" }], examples: [{ en: "I prefer tea to coffee.", zh: "比起咖啡我更喜欢茶。" }] },
  { spelling: "opportunity", ipa: "/ˌɒpəˈtjuːnəti/", level: 3000, translations: [{ pos: "n.", meaning: "机会" }], examples: [{ en: "This is a great opportunity for you.", zh: "这对你是很好的机会。" }] },
  { spelling: "similar", ipa: "/ˈsɪmələ/", level: 3000, translations: [{ pos: "adj.", meaning: "相似的" }], examples: [{ en: "Our views are similar.", zh: "我们的观点相似。" }] },
  { spelling: "reduce", ipa: "/rɪˈdjuːs/", level: 3000, translations: [{ pos: "v.", meaning: "减少" }], examples: [{ en: "The government aims to reduce pollution.", zh: "政府目标是减少污染。" }] },
  { spelling: "provide", ipa: "/prəˈvaɪd/", level: 3000, translations: [{ pos: "v.", meaning: "提供" }], examples: [{ en: "The school provides free textbooks.", zh: "学校提供免费教科书。" }] },
  { spelling: "increase", ipa: "/ɪnˈkriːs/", level: 3000, translations: [{ pos: "v./n.", meaning: "增加" }], examples: [{ en: "Prices continue to increase.", zh: "物价继续上涨。" }] },
  { spelling: "consider", ipa: "/kənˈsɪdə/", level: 3000, translations: [{ pos: "v.", meaning: "考虑，认为" }], examples: [{ en: "Please consider my proposal.", zh: "请考虑我的提议。" }] },
  { spelling: "solution", ipa: "/səˈluːʃn/", level: 3000, translations: [{ pos: "n.", meaning: "解决方案" }], examples: [{ en: "We found a simple solution.", zh: "我们找到了简单方案。" }] },
  { spelling: "benefit", ipa: "/ˈbenɪfɪt/", level: 3000, translations: [{ pos: "n./v.", meaning: "好处，受益" }], examples: [{ en: "Exercise benefits your health.", zh: "运动有益健康。" }] },
  { spelling: "effect", ipa: "/ɪˈfekt/", level: 3000, translations: [{ pos: "n.", meaning: "效果，影响" }], examples: [{ en: "The medicine had no effect.", zh: "这药没起作用。" }] },
  { spelling: "develop", ipa: "/dɪˈveləp/", level: 3000, translations: [{ pos: "v.", meaning: "发展，开发" }], examples: [{ en: "Children develop rapidly at this age.", zh: "孩子这个年龄发展迅速。" }] },
  { spelling: "society", ipa: "/səˈsaɪəti/", level: 3000, translations: [{ pos: "n.", meaning: "社会" }], examples: [{ en: "Society is changing fast.", zh: "社会变化很快。" }] },
  { spelling: "government", ipa: "/ˈɡʌvənmənt/", level: 3000, translations: [{ pos: "n.", meaning: "政府" }], examples: [{ en: "The government announced new policies.", zh: "政府公布了新政策。" }] },
  { spelling: "individual", ipa: "/ˌɪndɪˈvɪdʒuəl/", level: 3000, translations: [{ pos: "n./adj.", meaning: "个人（的）" }], examples: [{ en: "Each individual is unique.", zh: "每个人都是独特的。" }] },
  { spelling: "essential", ipa: "/ɪˈsenʃl/", level: 3000, translations: [{ pos: "adj.", meaning: "必要的" }], examples: [{ en: "Water is essential to life.", zh: "水对生命至关重要。" }] },

  // ---- 5000 级 · 学术进阶 ----
  { spelling: "significant", ipa: "/sɪɡˈnɪfɪkənt/", level: 5000, translations: [{ pos: "adj.", meaning: "有意义的，重大的" }], examples: [{ en: "There is a significant difference between them.", zh: "他们之间有重大差异。" }], tags: ["academic"] },
  { spelling: "consequence", ipa: "/ˈkɒnsɪkwəns/", level: 5000, translations: [{ pos: "n.", meaning: "后果" }], examples: [{ en: "He must face the consequences.", zh: "他必须承担后果。" }] },
  { spelling: "estimate", ipa: "/ˈestɪmeɪt/", level: 5000, translations: [{ pos: "v./n.", meaning: "估计" }], examples: [{ en: "The cost is estimated at $500.", zh: "估计费用 500 美元。" }] },
  { spelling: "occur", ipa: "/əˈkɜː/", level: 5000, translations: [{ pos: "v.", meaning: "发生" }], examples: [{ en: "Accidents can occur at any time.", zh: "事故随时可能发生。" }] },
  { spelling: "acquire", ipa: "/əˈkwaɪə/", level: 5000, translations: [{ pos: "v.", meaning: "获得，习得" }], examples: [{ en: "Children acquire language quickly.", zh: "儿童学习语言很快。" }] },
  { spelling: "tremendous", ipa: "/trəˈmendəs/", level: 5000, translations: [{ pos: "adj.", meaning: "巨大的" }], examples: [{ en: "She made tremendous progress.", zh: "她取得了巨大进步。" }] },
  { spelling: "deteriorate", ipa: "/dɪˈtɪəriəreɪt/", level: 5000, translations: [{ pos: "v.", meaning: "恶化" }], examples: [{ en: "His health deteriorated rapidly.", zh: "他的健康急剧恶化。" }] },
  { spelling: "coherent", ipa: "/kəʊˈhɪərənt/", level: 5000, translations: [{ pos: "adj.", meaning: "连贯的" }], examples: [{ en: "The essay lacks a coherent argument.", zh: "这篇文章缺乏连贯论点。" }] },
  { spelling: "comprehensive", ipa: "/ˌkɒmprɪˈhensɪv/", level: 5000, translations: [{ pos: "adj.", meaning: "全面的" }], examples: [{ en: "We offer comprehensive services.", zh: "我们提供全面的服务。" }] },
  { spelling: "sufficient", ipa: "/səˈfɪʃnt/", level: 5000, translations: [{ pos: "adj.", meaning: "充足的" }], examples: [{ en: "The evidence is not sufficient.", zh: "证据不充分。" }] },
  { spelling: "diverse", ipa: "/daɪˈvɜːs/", level: 5000, translations: [{ pos: "adj.", meaning: "多样的" }], examples: [{ en: "Our team is culturally diverse.", zh: "我们团队文化多元。" }] },
  { spelling: "inevitable", ipa: "/ɪnˈevɪtəbl/", level: 5000, translations: [{ pos: "adj.", meaning: "不可避免的" }], examples: [{ en: "Change is inevitable.", zh: "变化不可避免。" }] },
  { spelling: "phenomenon", ipa: "/fəˈnɒmɪnən/", level: 5000, translations: [{ pos: "n.", meaning: "现象" }], examples: [{ en: "Global warming is a serious phenomenon.", zh: "全球变暖是严重现象。" }] },
  { spelling: "distinguish", ipa: "/dɪˈstɪŋɡwɪʃ/", level: 5000, translations: [{ pos: "v.", meaning: "区分" }], examples: [{ en: "Can you distinguish the twins?", zh: "你能分辨这对双胞胎吗？" }] },
  { spelling: "correspond", ipa: "/ˌkɒrəˈspɒnd/", level: 5000, translations: [{ pos: "v.", meaning: "对应，通信" }], examples: [{ en: "The results correspond to our theory.", zh: "结果与理论吻合。" }] },
  { spelling: "constitute", ipa: "/ˈkɒnstɪtjuːt/", level: 5000, translations: [{ pos: "v.", meaning: "构成" }], examples: [{ en: "Women constitute 40% of workforce.", zh: "女性占劳动力的 40%。" }] },
  { spelling: "elaborate", ipa: "/ɪˈlæbərət/", level: 5000, translations: [{ pos: "adj./v.", meaning: "精心制作的；详述" }], examples: [{ en: "Could you elaborate on this?", zh: "你能详细说说吗？" }] },
  { spelling: "underlying", ipa: "/ˌʌndəˈlaɪɪŋ/", level: 5000, translations: [{ pos: "adj.", meaning: "潜在的" }], examples: [{ en: "The underlying cause is unclear.", zh: "根本原因尚不清楚。" }] },
  { spelling: "reluctant", ipa: "/rɪˈlʌktənt/", level: 5000, translations: [{ pos: "adj.", meaning: "不情愿的" }], examples: [{ en: "He was reluctant to leave.", zh: "他不情愿离开。" }] },
  { spelling: "notorious", ipa: "/nəʊˈtɔːriəs/", level: 5000, translations: [{ pos: "adj.", meaning: "臭名昭著的" }], examples: [{ en: "The area is notorious for crime.", zh: "该地区以犯罪著称。" }] },

  // ---- 7000 级 · 高级 ----
  { spelling: "ubiquitous", ipa: "/juːˈbɪkwɪtəs/", level: 7000, translations: [{ pos: "adj.", meaning: "无处不在的" }], examples: [{ en: "Smartphones are now ubiquitous.", zh: "智能手机现在无处不在。" }], tags: ["advanced"] },
  { spelling: "ambivalent", ipa: "/æmˈbɪvələnt/", level: 7000, translations: [{ pos: "adj.", meaning: "矛盾的" }], examples: [{ en: "She felt ambivalent about the offer.", zh: "她对此机会态度矛盾。" }] },
  { spelling: "meticulous", ipa: "/məˈtɪkjələs/", level: 7000, translations: [{ pos: "adj.", meaning: "一丝不苟的" }], examples: [{ en: "He kept meticulous records.", zh: "他记录一丝不苟。" }] },
  { spelling: "scrutinize", ipa: "/ˈskruːtɪnaɪz/", level: 7000, translations: [{ pos: "v.", meaning: "仔细审查" }], examples: [{ en: "The auditors scrutinized every expense.", zh: "审计员仔细审查每笔支出。" }] },
  { spelling: "prevalent", ipa: "/ˈprevələnt/", level: 7000, translations: [{ pos: "adj.", meaning: "流行的，普遍的" }], examples: [{ en: "This attitude is prevalent among teens.", zh: "这种态度在青少年中普遍。" }] },
  { spelling: "corroborate", ipa: "/kəˈrɒbəreɪt/", level: 7000, translations: [{ pos: "v.", meaning: "证实" }], examples: [{ en: "Witnesses corroborated his story.", zh: "证人证实了他的说法。" }] },
  { spelling: "articulate", ipa: "/ɑːˈtɪkjələt/", level: 7000, translations: [{ pos: "v./adj.", meaning: "清楚表达" }], examples: [{ en: "She articulated her thoughts clearly.", zh: "她表达得很清楚。" }] },
  { spelling: "detrimental", ipa: "/ˌdetrɪˈmentl/", level: 7000, translations: [{ pos: "adj.", meaning: "有害的" }], examples: [{ en: "Smoking is detrimental to health.", zh: "吸烟有害健康。" }] },
  { spelling: "pervasive", ipa: "/pəˈveɪsɪv/", level: 7000, translations: [{ pos: "adj.", meaning: "普遍存在的" }], examples: [{ en: "There is a pervasive sense of unease.", zh: "普遍弥漫着不安感。" }] },
  { spelling: "compelling", ipa: "/kəmˈpelɪŋ/", level: 7000, translations: [{ pos: "adj.", meaning: "有说服力的" }], examples: [{ en: "She made a compelling argument.", zh: "她的论点很有说服力。" }] },
  { spelling: "profound", ipa: "/prəˈfaʊnd/", level: 7000, translations: [{ pos: "adj.", meaning: "深远的" }], examples: [{ en: "The book had a profound impact on me.", zh: "这本书对我影响深远。" }] },
  { spelling: "discrepancy", ipa: "/dɪsˈkrepənsi/", level: 7000, translations: [{ pos: "n.", meaning: "差异，不符" }], examples: [{ en: "There is a discrepancy in the accounts.", zh: "账目上有出入。" }] },
  { spelling: "mitigate", ipa: "/ˈmɪtɪɡeɪt/", level: 7000, translations: [{ pos: "v.", meaning: "减轻" }], examples: [{ en: "Measures to mitigate climate change.", zh: "缓解气候变化的措施。" }] },
  { spelling: "salient", ipa: "/ˈseɪliənt/", level: 7000, translations: [{ pos: "adj.", meaning: "突出的，显著的" }], examples: [{ en: "The salient points of the report.", zh: "报告的要点。" }] },
  { spelling: "juxtapose", ipa: "/ˈdʒʌkstəpəʊz/", level: 7000, translations: [{ pos: "v.", meaning: "并置" }], examples: [{ en: "The artist juxtaposes old and new.", zh: "艺术家将新旧并置。" }] },
  { spelling: "reciprocal", ipa: "/rɪˈsɪprəkl/", level: 7000, translations: [{ pos: "adj.", meaning: "相互的" }], examples: [{ en: "There is a reciprocal agreement.", zh: "存在互惠协议。" }] },
  { spelling: "vindicate", ipa: "/ˈvɪndɪkeɪt/", level: 7000, translations: [{ pos: "v.", meaning: "证明正当" }], examples: [{ en: "The result vindicated his decision.", zh: "结果证明他决定是对的。" }] },
  { spelling: "cogent", ipa: "/ˈkəʊdʒənt/", level: 7000, translations: [{ pos: "adj.", meaning: "令人信服的" }], examples: [{ en: "She gave cogent reasons.", zh: "她给出令人信服的理由。" }] },
  { spelling: "paradigm", ipa: "/ˈpærədaɪm/", level: 7000, translations: [{ pos: "n.", meaning: "范式" }], examples: [{ en: "This marks a paradigm shift.", zh: "这标志着范式转变。" }] },
  { spelling: "anomaly", ipa: "/əˈnɒməli/", level: 7000, translations: [{ pos: "n.", meaning: "反常现象" }], examples: [{ en: "The data shows a clear anomaly.", zh: "数据显示明显异常。" }] },

  // ---- 8500 级 · Native/学术顶级 ----
  { spelling: "obfuscate", ipa: "/ˈɒbfʌskeɪt/", level: 8500, translations: [{ pos: "v.", meaning: "使模糊，混淆" }], examples: [{ en: "He obfuscated the issue with jargon.", zh: "他用行话让问题变得模糊。" }] },
  { spelling: "recalcitrant", ipa: "/rɪˈkælsɪtrənt/", level: 8500, translations: [{ pos: "adj.", meaning: "顽固不服从的" }], examples: [{ en: "The recalcitrant students refused to comply.", zh: "顽固的学生拒不服从。" }] },
  { spelling: "quintessential", ipa: "/ˌkwɪntɪˈsenʃl/", level: 8500, translations: [{ pos: "adj.", meaning: "精髓的，典型的" }], examples: [{ en: "He is the quintessential gentleman.", zh: "他是典型的绅士。" }] },
  { spelling: "perfunctory", ipa: "/pəˈfʌŋktəri/", level: 8500, translations: [{ pos: "adj.", meaning: "敷衍的" }], examples: [{ en: "She gave a perfunctory nod.", zh: "她敷衍地点了点头。" }] },
  { spelling: "sanguine", ipa: "/ˈsæŋɡwɪn/", level: 8500, translations: [{ pos: "adj.", meaning: "乐观的" }], examples: [{ en: "He was sanguine about their chances.", zh: "他对他们的机会很乐观。" }] },
  { spelling: "exacerbate", ipa: "/ɪɡˈzæsəbeɪt/", level: 8500, translations: [{ pos: "v.", meaning: "使恶化" }], examples: [{ en: "The policy exacerbated inequality.", zh: "该政策加剧了不平等。" }] },
  { spelling: "propensity", ipa: "/prəˈpensəti/", level: 8500, translations: [{ pos: "n.", meaning: "倾向" }], examples: [{ en: "He has a propensity for exaggeration.", zh: "他有夸大的倾向。" }] },
  { spelling: "vehement", ipa: "/ˈviːəmənt/", level: 8500, translations: [{ pos: "adj.", meaning: "激烈的" }], examples: [{ en: "She was vehement in her opposition.", zh: "她激烈反对。" }] },
  { spelling: "ephemeral", ipa: "/ɪˈfemərəl/", level: 8500, translations: [{ pos: "adj.", meaning: "短暂的" }], examples: [{ en: "Fame is often ephemeral.", zh: "名声往往是短暂的。" }] },
  { spelling: "surreptitious", ipa: "/ˌsʌrəpˈtɪʃəs/", level: 8500, translations: [{ pos: "adj.", meaning: "偷偷摸摸的" }], examples: [{ en: "He took a surreptitious glance.", zh: "他偷偷瞥了一眼。" }] },
  { spelling: "insidious", ipa: "/ɪnˈsɪdiəs/", level: 8500, translations: [{ pos: "adj.", meaning: "潜在危害的" }], examples: [{ en: "Insidious effects of pollution.", zh: "污染的潜在危害。" }] },
  { spelling: "capitulate", ipa: "/kəˈpɪtʃuleɪt/", level: 8500, translations: [{ pos: "v.", meaning: "投降，屈服" }], examples: [{ en: "The city capitulated after weeks of siege.", zh: "该城被围困数周后投降。" }] },
  { spelling: "iconoclast", ipa: "/aɪˈkɒnəklæst/", level: 8500, translations: [{ pos: "n.", meaning: "打破传统者" }], examples: [{ en: "She was an iconoclast in her field.", zh: "她是该领域的破旧立新者。" }] },
  { spelling: "loquacious", ipa: "/ləˈkweɪʃəs/", level: 8500, translations: [{ pos: "adj.", meaning: "健谈的" }], examples: [{ en: "He became loquacious after wine.", zh: "喝酒后他变得健谈。" }] },
  { spelling: "assiduous", ipa: "/əˈsɪdjuəs/", level: 8500, translations: [{ pos: "adj.", meaning: "勤勉的" }], examples: [{ en: "Her assiduous research paid off.", zh: "她勤勉的研究得到回报。" }] },
];
