/**
 * 写作题库（Task 1 图表 8 题 + Task 2 论述 12 题）
 */

export type SeedPrompt = {
  task: "task1" | "task2";
  category: string;
  prompt: string;
  minWords: number;
  timeMinutes: number;
};

export const WRITING_PROMPTS: SeedPrompt[] = [
  // ---- Task 1（20 分钟，150 词以上）----
  {
    task: "task1",
    category: "bar-chart",
    prompt: `The bar chart below shows the percentage of households in owned and rented accommodation in England and Wales between 1918 and 2011.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.`,
    minWords: 150,
    timeMinutes: 20,
  },
  {
    task: "task1",
    category: "line-graph",
    prompt: `The graph below shows the consumption of three spreads (margarine, low-fat and reduced spreads, and butter) from 1981 to 2007.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.`,
    minWords: 150,
    timeMinutes: 20,
  },
  {
    task: "task1",
    category: "pie-chart",
    prompt: `The pie charts below show the percentage of water used for different purposes in six areas of the world.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.`,
    minWords: 150,
    timeMinutes: 20,
  },
  {
    task: "task1",
    category: "table",
    prompt: `The table below gives information about the underground railway systems in six cities.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.`,
    minWords: 150,
    timeMinutes: 20,
  },
  {
    task: "task1",
    category: "process",
    prompt: `The diagram below shows the water cycle, which is the continuous movement of water on, above and below the surface of the Earth.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.`,
    minWords: 150,
    timeMinutes: 20,
  },
  {
    task: "task1",
    category: "map",
    prompt: `The maps below show a coastal town in 1990 and now. Describe how it has changed.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.`,
    minWords: 150,
    timeMinutes: 20,
  },
  {
    task: "task1",
    category: "mixed",
    prompt: `The bar chart shows the world consumption of primary energy in 2013, and the pie chart shows the percentage of world consumption of primary energy in the same year.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.`,
    minWords: 150,
    timeMinutes: 20,
  },
  {
    task: "task1",
    category: "line-graph",
    prompt: `The graph below shows the number of tourists visiting a particular Caribbean island between 2010 and 2017.

Summarise the information by selecting and reporting the main features, and make comparisons where relevant.

Write at least 150 words.`,
    minWords: 150,
    timeMinutes: 20,
  },

  // ---- Task 2（40 分钟，250 词以上）----
  {
    task: "task2",
    category: "opinion",
    prompt: `Some people believe that university education should be free for everyone, while others argue that students should pay for their own education.

Discuss both views and give your own opinion.

Write at least 250 words.`,
    minWords: 250,
    timeMinutes: 40,
  },
  {
    task: "task2",
    category: "argument",
    prompt: `In many countries, more and more young people are leaving school and unable to find jobs after graduation. What problems do you think youth unemployment will cause to the individual and the society? Give reasons and make some suggestions.

Write at least 250 words.`,
    minWords: 250,
    timeMinutes: 40,
  },
  {
    task: "task2",
    category: "opinion",
    prompt: `Some people think that the government should provide free housing for everyone. Others believe that individuals should pay for their own housing.

Discuss both views and give your own opinion.

Write at least 250 words.`,
    minWords: 250,
    timeMinutes: 40,
  },
  {
    task: "task2",
    category: "agree-disagree",
    prompt: `Some people think that all university students should study whatever they like. Others believe that they should only be allowed to study subjects that will be useful in the future, such as those related to science and technology.

Discuss both these views and give your own opinion.

Write at least 250 words.`,
    minWords: 250,
    timeMinutes: 40,
  },
  {
    task: "task2",
    category: "problem-solution",
    prompt: `Increasing the price of petrol is the best way to solve growing traffic and pollution problems.

To what extent do you agree or disagree? What other measures do you think might be effective?

Write at least 250 words.`,
    minWords: 250,
    timeMinutes: 40,
  },
  {
    task: "task2",
    category: "agree-disagree",
    prompt: `In some countries, an increasing number of people are suffering from health problems as a result of eating too much fast food. It is therefore necessary for governments to impose a higher tax on this kind of food.

To what extent do you agree or disagree with this opinion?

Write at least 250 words.`,
    minWords: 250,
    timeMinutes: 40,
  },
  {
    task: "task2",
    category: "opinion",
    prompt: `Some people think that the best way to reduce crime is to give longer prison sentences. Others, however, believe there are better alternative ways of reducing crime.

Discuss both views and give your own opinion.

Write at least 250 words.`,
    minWords: 250,
    timeMinutes: 40,
  },
  {
    task: "task2",
    category: "cause-effect",
    prompt: `Many people believe that social networking sites (such as Facebook) have had a huge negative impact on both individuals and society.

To what extent do you agree with this view?

Write at least 250 words.`,
    minWords: 250,
    timeMinutes: 40,
  },
  {
    task: "task2",
    category: "advantages-disadvantages",
    prompt: `Some people believe that studying at university or college is the best route to a successful career, while others believe that it is better to get a job straight after school.

Discuss both views and give your opinion.

Write at least 250 words.`,
    minWords: 250,
    timeMinutes: 40,
  },
  {
    task: "task2",
    category: "argument",
    prompt: `Nowadays, many people choose to be self-employed rather than to work for a company or organisation. Why might this be the case? What could be the disadvantages of being self-employed?

Write at least 250 words.`,
    minWords: 250,
    timeMinutes: 40,
  },
  {
    task: "task2",
    category: "problem-solution",
    prompt: `In many cities, planners tend to arrange shops, schools, offices and homes in specific areas and separate them from each other.

Do you think the advantages outweigh the disadvantages of this policy?

Write at least 250 words.`,
    minWords: 250,
    timeMinutes: 40,
  },
  {
    task: "task2",
    category: "agree-disagree",
    prompt: `Some people believe that children should be allowed to stay at home and play until they are six or seven years old. Others believe that it is important for children to attend school as soon as possible.

Discuss both views and give your own opinion.

Write at least 250 words.`,
    minWords: 250,
    timeMinutes: 40,
  },
];
