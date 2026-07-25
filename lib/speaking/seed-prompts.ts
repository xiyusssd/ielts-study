/**
 * 口语题库 seed。P1/P2/P3 三个部分。
 * 附高频话题短语（sample answers 关键词）供参考。
 */

export type SeedSpeakingPrompt = {
  part: 1 | 2 | 3;
  topic: string;
  question: string;
  followUps?: string[];
  sampleAnswer?: string;
  keyPhrases?: string[];
};

export const SPEAKING_PROMPTS: SeedSpeakingPrompt[] = [
  // ============ Part 1 · 个人话题（3-4 题一组）============
  {
    part: 1,
    topic: "Hometown",
    question: "Where do you come from? Can you describe your hometown?",
    followUps: ["What do you like most about your hometown?", "Has your hometown changed in recent years?"],
    keyPhrases: ["I was born and raised in...", "It's a vibrant city known for...", "One thing I particularly love is..."],
  },
  {
    part: 1,
    topic: "Work / Study",
    question: "Do you work or are you a student? Tell me a little about it.",
    followUps: ["Why did you choose this field?", "What do you enjoy most about it?"],
    keyPhrases: ["I'm currently pursuing a degree in...", "I've been working as a ... for about ...", "What drew me to it was..."],
  },
  {
    part: 1,
    topic: "Free Time",
    question: "How do you usually spend your free time?",
    followUps: ["Have your hobbies changed over the years?", "Do you prefer indoor or outdoor activities?"],
    keyPhrases: ["I'm a big fan of...", "It helps me unwind after a long day", "I make a point of..."],
  },
  {
    part: 1,
    topic: "Technology",
    question: "How often do you use your smartphone?",
    followUps: ["What apps do you use most?", "Do you think you rely on your phone too much?"],
    keyPhrases: ["I'd say I check it...", "The app I couldn't live without is...", "I've been trying to cut down on..."],
  },
  {
    part: 1,
    topic: "Food",
    question: "What kind of food do you usually eat at home?",
    followUps: ["Do you cook for yourself?", "Has your diet changed as you've gotten older?"],
    keyPhrases: ["I usually go for...", "I picked up cooking during...", "I try to eat healthier by..."],
  },

  // ============ Part 2 · Cue Card（2 分钟独白）============
  {
    part: 2,
    topic: "A memorable trip",
    question: `Describe a memorable trip you have taken.

You should say:
- where you went
- who you went with
- what you did there
- and explain why it was memorable.

You will have 1 minute to prepare and should speak for 1-2 minutes.`,
    keyPhrases: [
      "The trip that immediately springs to mind is...",
      "What made it particularly memorable was...",
      "I'll never forget the moment when...",
      "Looking back, what struck me most was...",
    ],
  },
  {
    part: 2,
    topic: "A person who influenced you",
    question: `Describe a person who has had an important influence on you.

You should say:
- who this person is
- how you know them
- how they have influenced you
- and explain why they matter to you.

You will have 1 minute to prepare and should speak for 1-2 minutes.`,
    keyPhrases: [
      "The person who instantly comes to mind is...",
      "What I admire most about them is...",
      "Thanks to their guidance, I've come to...",
      "Their influence has been profound in the sense that...",
    ],
  },
  {
    part: 2,
    topic: "A skill you'd like to learn",
    question: `Describe a skill you would like to learn in the future.

You should say:
- what the skill is
- why you want to learn it
- how you plan to learn it
- and explain what benefits you think it will bring.

You will have 1 minute to prepare and should speak for 1-2 minutes.`,
    keyPhrases: [
      "One skill I've been meaning to pick up is...",
      "The reason I'm drawn to it is...",
      "My plan is to start by...",
      "I believe it would open doors to...",
    ],
  },
  {
    part: 2,
    topic: "A book that impressed you",
    question: `Describe a book that made a strong impression on you.

You should say:
- what the book was
- when you read it
- what it was about
- and explain why it impressed you.

You will have 1 minute to prepare and should speak for 1-2 minutes.`,
    keyPhrases: [
      "The book that comes to mind is...",
      "It's essentially a story about...",
      "What struck me was the way the author...",
      "It really shifted my perspective on...",
    ],
  },

  // ============ Part 3 · 深入讨论 ============
  {
    part: 3,
    topic: "Travel",
    question: "How has tourism changed in your country in the last twenty years?",
    followUps: [
      "What are the positive and negative effects of mass tourism?",
      "Do you think travel broadens people's minds? Why or why not?",
    ],
    keyPhrases: [
      "One striking change has been...",
      "On the plus side, ... whereas on the flip side...",
      "It's often argued that...",
      "I'd say the evidence suggests...",
    ],
  },
  {
    part: 3,
    topic: "Education",
    question: "Should young people be forced to learn foreign languages at school?",
    followUps: [
      "What are the benefits of speaking multiple languages?",
      "Should governments prioritize STEM subjects over humanities?",
    ],
    keyPhrases: [
      "There's a strong case for...",
      "That said, one could argue...",
      "In my view, it boils down to...",
      "The long-term implications are...",
    ],
  },
  {
    part: 3,
    topic: "Environment",
    question: "What are the most serious environmental problems facing your country today?",
    followUps: [
      "Whose responsibility is it to solve these issues — governments, businesses, or individuals?",
      "Do you think technology can solve environmental problems?",
    ],
    keyPhrases: [
      "The most pressing issue, in my view, is...",
      "It's a shared responsibility, but...",
      "Technology offers promising solutions, however...",
      "Ultimately, systemic change requires...",
    ],
  },
  {
    part: 3,
    topic: "Work",
    question: "How is the nature of work changing in your country?",
    followUps: [
      "Do you think remote work will become the norm?",
      "What impact will AI have on employment?",
    ],
    keyPhrases: [
      "Traditionally, work was...",
      "The shift toward ... has fundamentally changed...",
      "While there are clear upsides, we shouldn't overlook...",
      "Looking ahead, I predict...",
    ],
  },
];

// ============ 高频万能短语（分类）============
export type PhraseGroup = { title: string; phrases: string[]; usage: string };

export const PHRASE_LIBRARY: PhraseGroup[] = [
  {
    title: "开头 · Buying time",
    usage: "被问难题时争取思考时间，避免长时间沉默扣 Fluency 分",
    phrases: [
      "That's an interesting question, let me think...",
      "Well, off the top of my head, I'd say...",
      "I've never really thought about it that way, but...",
      "Hmm, there are a few angles to this...",
    ],
  },
  {
    title: "表达观点",
    usage: "P3 表态用，避免 I think 重复",
    phrases: [
      "In my view, ...",
      "I'd argue that...",
      "From where I stand, ...",
      "It seems to me that...",
      "As far as I'm concerned, ...",
    ],
  },
  {
    title: "让步与反驳",
    usage: "P3 高分技巧：先承认对方合理再反驳",
    phrases: [
      "Admittedly, ..., but...",
      "While it's true that ..., I still believe...",
      "That's a valid point, though I'd counter with...",
      "Granted, ..., however...",
    ],
  },
  {
    title: "举例",
    usage: "具体例子拉高 Coherence 和 Task Response",
    phrases: [
      "Take X for instance,",
      "A good case in point is...",
      "This reminds me of...",
      "For example, in my own experience...",
    ],
  },
  {
    title: "推测未来 / 假设",
    usage: "P3 常问 future / hypothetical",
    phrases: [
      "It's likely that...",
      "I could see ... becoming more common",
      "If ... were to happen, ...",
      "Down the line, we might see...",
    ],
  },
  {
    title: "P2 描述细节",
    usage: "Cue card 独白扩展",
    phrases: [
      "One particular detail I remember vividly is...",
      "The atmosphere was... You could almost feel...",
      "What really stood out was the way...",
      "It was one of those moments where everything just clicked.",
    ],
  },
];
