/**
 * 内置阅读 passage seed。每篇 13 题，覆盖官方 5 种主要题型：
 * - tfng: True/False/Not Given
 * - mcq: Multiple Choice (single answer)
 * - matching: Matching Information/Features
 * - gapfill: Sentence/Summary Completion
 * - heading: Matching Headings
 *
 * 生产：从剑桥 PDF 解析或 AI 生成。这里是能跑通 P3 全流程的最小样本。
 */

export type QuestionType = "tfng" | "mcq" | "matching" | "gapfill" | "heading";

export type SeedQuestion = {
  index: number;
  type: QuestionType;
  prompt: string;
  options?: string[] | Record<string, string>;
  answer: string | string[];
  explanation?: string;
};

export type SeedPassage = {
  source: string;
  title: string;
  content: string;
  metadata: { difficulty: number; wordCount: number; topics: string[] };
  questions: SeedQuestion[];
};

// ------- 题型说明 helper -------
export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  tfng: "True / False / Not Given",
  mcq: "Multiple Choice",
  matching: "Matching",
  gapfill: "Sentence Completion",
  heading: "Matching Headings",
};

// ============ Passage 1: The Origins of Chocolate ============
export const PASSAGE_CHOCOLATE: SeedPassage = {
  source: "seed-chocolate",
  title: "The Origins of Chocolate",
  content: `A. Chocolate, one of the world's most beloved foods, has a history stretching back over 3,500 years. It originated in Mesoamerica, where the Olmec civilization is believed to have first cultivated cacao trees around 1500 BCE. However, it was the Maya and later the Aztecs who transformed cacao beans into a treasured beverage. Unlike the sweet chocolate we know today, ancient chocolate was bitter, spicy, and often mixed with chili peppers, cornmeal, or vanilla.

B. The Aztecs held cacao in such high regard that the beans functioned as currency. Historical records suggest that a small rabbit could be purchased for around 10 cacao beans, while a turkey cost about 100 beans. The drink itself, known as xocolatl, was reserved primarily for royalty, warriors, and priests. Aztec emperor Montezuma II is said to have consumed up to 50 cups of xocolatl each day, using golden goblets that were discarded after a single use.

C. When Spanish conquistadors arrived in the Americas in the early 16th century, they were initially unimpressed by the bitter drink. It was Hernán Cortés, however, who recognized cacao's commercial potential. He brought beans back to Spain in 1528, where sugar was added to make the beverage more palatable to European tastes. For nearly a century, Spain kept chocolate a closely guarded secret, but eventually the drink spread across Europe, becoming a fashionable luxury among the wealthy in France, England, and Italy.

D. The industrial revolution transformed chocolate from an elite beverage into a mass-market product. In 1828, Dutch chemist Coenraad van Houten invented a hydraulic press that could extract cocoa butter from roasted beans, producing a fine powder that mixed easily with water or milk. This "Dutch process" revolutionized chocolate production. Then, in 1847, British confectioner Joseph Fry combined cocoa powder, cocoa butter, and sugar to create the first solid chocolate bar. Milk chocolate, invented by Swiss confectioner Daniel Peter in 1875, further expanded chocolate's global appeal.

E. Today, chocolate is a multi-billion dollar global industry. West Africa produces roughly 70% of the world's cocoa, with Ivory Coast and Ghana as the leading exporters. However, the industry faces serious challenges. Cocoa farmers in developing countries often earn less than \$2 per day, and child labor remains a persistent problem on some plantations. Climate change also threatens cocoa production, as rising temperatures and unpredictable rainfall patterns damage crops in traditional growing regions.

F. In response, initiatives such as Fair Trade certification and direct-trade partnerships aim to ensure that farmers receive fair compensation. Meanwhile, scientists are working to develop cocoa varieties that are more resistant to disease and climate stress. Interest in "bean-to-bar" chocolate, which emphasizes traceability and quality, has grown rapidly among consumers who want to know where their food comes from and how it was produced.`,
  metadata: { difficulty: 6.5, wordCount: 480, topics: ["food history", "economics"] },
  questions: [
    // ---- T/F/NG (1-5) ----
    { index: 1, type: "tfng", prompt: "The Olmec civilization was the first to make chocolate into a beverage.", answer: "FALSE", explanation: "Paragraph A: Olmec cultivated cacao trees, but 'Maya and later Aztecs transformed cacao beans into a treasured beverage.'" },
    { index: 2, type: "tfng", prompt: "Cacao beans were used as a form of money by the Aztecs.", answer: "TRUE", explanation: "Paragraph B directly states 'beans functioned as currency'." },
    { index: 3, type: "tfng", prompt: "Montezuma II drank chocolate for its health benefits.", answer: "NOT GIVEN", explanation: "The text mentions he drank 50 cups daily but never states why." },
    { index: 4, type: "tfng", prompt: "The Spanish immediately loved the taste of chocolate.", answer: "FALSE", explanation: "Paragraph C: 'initially unimpressed by the bitter drink'." },
    { index: 5, type: "tfng", prompt: "Chocolate was affordable for common people in 17th century Europe.", answer: "FALSE", explanation: "Paragraph C describes it as 'a fashionable luxury among the wealthy'." },

    // ---- MCQ (6-8) ----
    { index: 6, type: "mcq", prompt: "Who invented the first solid chocolate bar?",
      options: ["Coenraad van Houten", "Hernán Cortés", "Joseph Fry", "Daniel Peter"], answer: "C",
      explanation: "Paragraph D: 'in 1847, British confectioner Joseph Fry combined cocoa powder, cocoa butter, and sugar to create the first solid chocolate bar.'" },
    { index: 7, type: "mcq", prompt: "What did van Houten's invention allow?",
      options: [
        "Adding sugar to chocolate",
        "Extracting cocoa butter to make powder",
        "Combining chocolate with milk",
        "Increasing plantation yields",
      ], answer: "B", explanation: "Paragraph D: 'a hydraulic press that could extract cocoa butter from roasted beans, producing a fine powder'." },
    { index: 8, type: "mcq", prompt: "According to the passage, which is a current problem in cocoa production?",
      options: [
        "Overproduction lowering prices",
        "Loss of consumer interest",
        "Child labor on some plantations",
        "Government tax increases",
      ], answer: "C", explanation: "Paragraph E: 'child labor remains a persistent problem on some plantations.'" },

    // ---- Gap-fill (9-11) ----
    { index: 9, type: "gapfill", prompt: "The ancient Aztec chocolate drink was called ______.", answer: "xocolatl", explanation: "Paragraph B names the drink 'xocolatl'." },
    { index: 10, type: "gapfill", prompt: "West Africa produces about ______% of the world's cocoa.", answer: "70", explanation: "Paragraph E: 'roughly 70% of the world's cocoa'." },
    { index: 11, type: "gapfill", prompt: "In 1875, ______ chocolate was invented in Switzerland.", answer: "milk", explanation: "Paragraph D: 'Milk chocolate, invented by Swiss confectioner Daniel Peter in 1875'." },

    // ---- Heading (12-13) — match paragraph to heading ----
    { index: 12, type: "heading", prompt: "Choose the best heading for paragraph E.",
      options: {
        i: "Modern challenges facing the industry",
        ii: "How chocolate reached Europe",
        iii: "The rise of solid chocolate",
        iv: "Ancient uses of cacao beans",
      },
      answer: "i",
      explanation: "Paragraph E discusses low farmer income, child labor, climate change — all modern problems." },
    { index: 13, type: "heading", prompt: "Choose the best heading for paragraph F.",
      options: {
        i: "Government regulations",
        ii: "Sustainable and ethical solutions",
        iii: "The health benefits of chocolate",
        iv: "Rising chocolate consumption",
      },
      answer: "ii",
      explanation: "Paragraph F discusses Fair Trade, disease-resistant varieties, bean-to-bar traceability." },
  ],
};

// ============ Passage 2: Urban Green Spaces ============
export const PASSAGE_GREEN: SeedPassage = {
  source: "seed-urban-green",
  title: "The Importance of Urban Green Spaces",
  content: `A. Urban green spaces — parks, community gardens, tree-lined streets, and green rooftops — have become increasingly recognized as essential components of healthy cities. Once considered mere ornamentation, these spaces are now understood to provide substantial environmental, psychological, and economic benefits. As global urbanization accelerates, with more than 68% of the world's population expected to live in cities by 2050, planners are giving green infrastructure serious attention.

B. From an environmental perspective, urban green spaces play multiple critical roles. Trees and vegetation absorb carbon dioxide, one of the main greenhouse gases contributing to climate change. A single mature tree can absorb up to 22 kilograms of CO2 per year. Green spaces also mitigate the "urban heat island" effect, a phenomenon in which built-up areas become significantly hotter than surrounding rural regions. Studies show that parks can reduce ambient temperatures by 2-8 degrees Celsius during summer heatwaves, a difference that can be life-saving for vulnerable populations.

C. The psychological benefits of green spaces are equally well-documented. Research from Stanford University found that walking in nature for as little as 90 minutes reduces activity in the brain region associated with rumination — the repetitive negative thinking linked to depression. Other studies have connected regular access to parks with lower rates of anxiety, improved concentration in children, and faster recovery times among hospital patients whose rooms overlook greenery.

D. Green spaces also foster social cohesion. Well-designed public parks encourage interactions between residents of different ages, backgrounds, and income levels. Community gardens, in particular, have been shown to strengthen neighborhood ties, provide fresh produce in areas classified as food deserts, and offer educational opportunities for urban children who might otherwise have limited exposure to how food is grown.

E. Despite these benefits, access to green space is highly unequal within many cities. In New York, for instance, wealthy neighborhoods typically have several times more park area per capita than lower-income districts. This inequality has real health consequences: residents of "green-poor" areas experience higher rates of asthma, obesity, and heart disease. Recognizing this, some cities have launched initiatives to add parks and street trees in underserved neighborhoods, though funding and land availability remain significant obstacles.

F. Perhaps surprisingly, green infrastructure can also be financially profitable. Properties adjacent to parks command a premium of 8-20% over comparable properties farther away. Cities with well-maintained green spaces attract tourists and skilled workers, boosting economic activity. Green roofs and permeable surfaces reduce the need for costly stormwater management systems. When municipalities calculate the total return on investment — including health savings, property tax gains, and avoided infrastructure costs — the case for green spaces becomes compelling.`,
  metadata: { difficulty: 6.5, wordCount: 470, topics: ["urban planning", "environment"] },
  questions: [
    { index: 1, type: "tfng", prompt: "More than half the world's population currently lives in cities.", answer: "NOT GIVEN", explanation: "The passage mentions 68% expected by 2050, but doesn't state current percentage." },
    { index: 2, type: "tfng", prompt: "Green spaces can lower city temperatures during hot weather.", answer: "TRUE", explanation: "Paragraph B: 'parks can reduce ambient temperatures by 2-8 degrees Celsius'." },
    { index: 3, type: "tfng", prompt: "A 90-minute walk in nature completely eliminates depression.", answer: "FALSE", explanation: "Study only found it 'reduces activity in the brain region associated with rumination', not that it eliminates depression." },
    { index: 4, type: "tfng", prompt: "All neighborhoods in New York have similar park access.", answer: "FALSE", explanation: "Paragraph E states inequality — wealthy neighborhoods have several times more park area." },

    { index: 5, type: "mcq", prompt: "How much CO2 can a mature tree absorb annually?",
      options: ["Up to 8 kilograms", "Up to 22 kilograms", "Up to 68 kilograms", "Up to 90 kilograms"], answer: "B",
      explanation: "Paragraph B: 'A single mature tree can absorb up to 22 kilograms of CO2 per year'." },
    { index: 6, type: "mcq", prompt: "According to the passage, community gardens can help address:",
      options: ["Air pollution", "Water shortages", "Food deserts", "Urban traffic"], answer: "C",
      explanation: "Paragraph D: 'provide fresh produce in areas classified as food deserts'." },
    { index: 7, type: "mcq", prompt: "Properties near parks are typically worth what percent more?",
      options: ["2-5%", "8-20%", "22-30%", "50% or more"], answer: "B",
      explanation: "Paragraph F: 'a premium of 8-20% over comparable properties farther away'." },
    { index: 8, type: "mcq", prompt: "The main obstacles to expanding green spaces in poor neighborhoods are:",
      options: [
        "Resident opposition and vandalism",
        "Funding and land availability",
        "Climate and pollution",
        "Government regulations",
      ], answer: "B", explanation: "Paragraph E: 'though funding and land availability remain significant obstacles'." },

    { index: 9, type: "gapfill", prompt: "By 2050, over ______% of the world's population is expected to live in cities.", answer: "68" },
    { index: 10, type: "gapfill", prompt: "Green spaces help fight the 'urban ______ island' effect.", answer: "heat" },
    { index: 11, type: "gapfill", prompt: "Residents of green-poor areas have higher rates of asthma, obesity, and ______ disease.", answer: "heart" },

    { index: 12, type: "heading", prompt: "Choose the best heading for paragraph C.",
      options: {
        i: "Environmental impact of urban trees",
        ii: "Mental health benefits of green spaces",
        iii: "The high cost of urban parks",
        iv: "Community involvement in gardens",
      },
      answer: "ii" },
    { index: 13, type: "heading", prompt: "Choose the best heading for paragraph F.",
      options: {
        i: "The unequal distribution of green spaces",
        ii: "Health impacts of park access",
        iii: "The economic case for green infrastructure",
        iv: "The history of urban parks",
      },
      answer: "iii" },
  ],
};

export const ALL_SEED_PASSAGES = [PASSAGE_CHOCOLATE, PASSAGE_GREEN];
