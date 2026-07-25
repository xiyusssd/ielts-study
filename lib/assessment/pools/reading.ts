import type { ReadingSet } from "./types";

/** 5 篇原创 IELTS 风格阅读（各 ~450 词 + 8 题）。非版权材料。*/
export const READING_SETS: ReadingSet[] = [
  {
    id: "rd-coffee",
    title: "The Global Journey of Coffee",
    content: `Coffee is one of the most widely consumed beverages in the world, yet its origins are surprisingly humble. The plant is believed to have been first cultivated in the highlands of Ethiopia, where wild coffee shrubs still grow today. According to a popular legend, a goat herder noticed that his animals became unusually energetic after eating the bright red cherries of a certain bush. Whether or not the story is true, by the fifteenth century coffee was being deliberately grown and traded across the Arabian Peninsula.

The city of Mocha in Yemen became an early centre of the coffee trade. Merchants guarded the plant jealously, and for a long time beans were only exported after being boiled or roasted so that they could not be germinated elsewhere. Despite these precautions, seedlings were eventually smuggled out, and cultivation spread to India and later to the Dutch colonies in Southeast Asia. The Dutch became the first Europeans to grow coffee on a commercial scale.

Coffee houses appeared in major European cities during the seventeenth century and quickly became important social institutions. In London they were nicknamed "penny universities" because, for the price of a single cup, a customer could join conversations on politics, science and commerce. Some historians argue that these venues played a role in the intellectual life of the period, providing a space where ideas could be exchanged freely across social classes.

The economics of coffee have not always been kind to those who produce it. Today the crop is grown mainly in a band of tropical countries, but the largest profits are usually earned further along the supply chain, by roasters and retailers in wealthier nations. Price fluctuations on international markets can leave farmers vulnerable, and this imbalance has driven the growth of fair-trade schemes intended to guarantee producers a more stable income.

Environmental concerns have also come to the fore. Traditional coffee was grown in the shade of larger trees, a method that supported birds and other wildlife. The shift towards sun-grown varieties, which produce higher yields, has contributed to deforestation in some regions. Researchers continue to study ways of balancing productivity with the need to protect fragile ecosystems.`,
    questions: [
      { id: "q1", type: "tfng", prompt: "Coffee shrubs no longer grow wild in Ethiopia.", answer: "FALSE" },
      { id: "q2", type: "tfng", prompt: "Merchants in Mocha tried to prevent others from growing coffee.", answer: "TRUE" },
      { id: "q3", type: "tfng", prompt: "The Dutch were the first Europeans to grow coffee commercially.", answer: "TRUE" },
      { id: "q4", type: "tfng", prompt: "Coffee houses in London charged customers a fee to enter debates each hour.", answer: "NOT GIVEN" },
      { id: "q5", type: "mcq", prompt: "Why were London coffee houses called 'penny universities'?",
        options: ["A penny bought coffee and access to intellectual discussion.", "Universities charged a penny for coffee.", "Only students could afford them.", "They taught for one penny per lesson."],
        answer: "A penny bought coffee and access to intellectual discussion." },
      { id: "q6", type: "mcq", prompt: "According to the passage, who earns the largest profits from coffee today?",
        options: ["Tropical farmers", "Roasters and retailers in wealthier nations", "International charities", "Coffee house owners"],
        answer: "Roasters and retailers in wealthier nations." },
      { id: "q7", type: "mcq", prompt: "What is one environmental drawback of sun-grown coffee?",
        options: ["It lowers yields", "It contributes to deforestation", "It requires more water than tea", "It cannot be traded fairly"],
        answer: "It contributes to deforestation." },
      { id: "q8", type: "gapfill", prompt: "Fair-trade schemes aim to give producers a more stable ______.", answer: "income" },
    ],
  },
  {
    id: "rd-sleep",
    title: "Why We Sleep",
    content: `For much of human history, sleep was regarded as a passive state in which the body simply shut down to rest. Modern research has overturned this view. Far from being idle, the sleeping brain is intensely active, carrying out processes that are essential to memory, health and emotional balance. Scientists now describe sleep as one of the most important, and least understood, of all biological functions.

Sleep is organised into cycles, each lasting roughly ninety minutes and consisting of several distinct stages. The deepest stage, known as slow-wave sleep, is thought to be crucial for physical recovery and for the consolidation of newly learned information. A different stage, rapid eye movement or REM sleep, is associated with vivid dreaming and appears to help the brain process emotional experiences. A healthy adult passes through four or five complete cycles each night.

The consequences of insufficient sleep are far-reaching. Studies have linked chronic sleep loss to impaired concentration, weakened immunity and an increased risk of conditions such as heart disease and diabetes. Perhaps more surprisingly, tired people are often poor judges of their own performance, believing themselves to be functioning normally even when tests show significant decline. This makes sleep deprivation particularly dangerous in situations such as driving.

Patterns of sleep are shaped by an internal clock known as the circadian rhythm, which is tuned to the cycle of light and darkness. Exposure to artificial light in the evening, especially the blue light emitted by screens, can delay the release of melatonin, the hormone that signals the body to prepare for rest. Some researchers believe that the widespread use of electronic devices is contributing to a rise in sleep problems, particularly among young people.

Not everyone requires the same amount of sleep, and needs change over a lifetime. Newborn babies may sleep for sixteen hours a day, while many older adults find that they sleep less and wake more frequently. Nevertheless, the popular belief that some people can thrive on only three or four hours a night is largely a myth; genuine short sleepers are extremely rare.`,
    questions: [
      { id: "q1", type: "tfng", prompt: "Scientists once believed the brain was inactive during sleep.", answer: "TRUE" },
      { id: "q2", type: "tfng", prompt: "A single sleep cycle lasts about ninety minutes.", answer: "TRUE" },
      { id: "q3", type: "tfng", prompt: "REM sleep is mainly responsible for physical recovery.", answer: "FALSE" },
      { id: "q4", type: "tfng", prompt: "Sleep deprivation is the leading cause of traffic accidents worldwide.", answer: "NOT GIVEN" },
      { id: "q5", type: "mcq", prompt: "Why is sleep deprivation described as particularly dangerous?",
        options: ["Tired people often overestimate their own performance.", "It always causes heart disease.", "It stops the brain from dreaming.", "It cannot be measured by tests."],
        answer: "Tired people often overestimate their own performance." },
      { id: "q6", type: "mcq", prompt: "What effect does evening blue light have?",
        options: ["It increases melatonin", "It delays the release of melatonin", "It resets the circadian rhythm instantly", "It has no measurable effect"],
        answer: "It delays the release of melatonin." },
      { id: "q7", type: "mcq", prompt: "What does the passage say about 'short sleepers'?",
        options: ["They are very common", "They are extremely rare", "They live longer", "They need more REM sleep"],
        answer: "They are extremely rare." },
      { id: "q8", type: "gapfill", prompt: "The deepest stage of sleep is called ______ sleep.", answer: "slow-wave" },
    ],
  },
  {
    id: "rd-cities",
    title: "The Rise of the Vertical City",
    content: `As the world's population becomes increasingly urban, planners face a difficult question: how can cities accommodate more people without sprawling endlessly across the surrounding countryside? For many, the answer lies in building upwards. The skyscraper, once a symbol of commercial ambition, is being reimagined as a solution to the pressures of density, housing and sustainability.

The earliest tall buildings were made possible by two nineteenth-century innovations: the steel frame, which could bear great loads, and the safety elevator, which made the upper floors genuinely usable. Before these developments, the height of a building was limited by the strength of its masonry walls and by how many stairs people were willing to climb. The combination transformed the skylines of cities such as Chicago and New York within a single generation.

Modern high-rise design is concerned with far more than height. Architects increasingly aim to create "mixed-use" towers that combine homes, offices, shops and green spaces within a single structure, reducing the need for residents to travel. Some designs incorporate gardens on multiple levels, which can improve air quality, provide insulation and offer inhabitants a connection to nature that is often lost in dense urban environments.

Critics, however, warn that building tall is not automatically sustainable. Skyscrapers consume enormous quantities of energy and materials, and the concrete and steel used in their construction are associated with significant carbon emissions. Whether a vertical city is truly greener than a low-rise one depends on how the buildings are powered, how long they last and how efficiently the surrounding infrastructure is organised.

There are social questions too. Very tall residential towers can isolate their occupants, particularly the elderly, and may weaken the sense of community that develops more easily at street level. Successful vertical neighbourhoods, researchers suggest, are those that pay careful attention to shared spaces and to the ways in which people move between the building and the city around it.`,
    questions: [
      { id: "q1", type: "tfng", prompt: "The safety elevator made the upper floors of tall buildings practical to use.", answer: "TRUE" },
      { id: "q2", type: "tfng", prompt: "Before the steel frame, building height was limited by masonry walls.", answer: "TRUE" },
      { id: "q3", type: "tfng", prompt: "All modern skyscrapers include gardens on multiple levels.", answer: "FALSE" },
      { id: "q4", type: "tfng", prompt: "Chicago has more skyscrapers than New York today.", answer: "NOT GIVEN" },
      { id: "q5", type: "mcq", prompt: "What is the aim of a 'mixed-use' tower?",
        options: ["To combine homes, offices and shops to reduce travel.", "To be as tall as possible.", "To house only offices.", "To replace all low-rise buildings."],
        answer: "To combine homes, offices and shops to reduce travel." },
      { id: "q6", type: "mcq", prompt: "Why do critics say building tall is not automatically sustainable?",
        options: ["Skyscrapers are ugly", "Their construction involves high carbon emissions", "They are too short-lived to matter", "Nobody wants to live in them"],
        answer: "Their construction involves high carbon emissions." },
      { id: "q7", type: "mcq", prompt: "What social risk of tall residential towers is mentioned?",
        options: ["Rising rents", "Isolation of occupants", "Noise from elevators", "Lack of parking"],
        answer: "Isolation of occupants." },
      { id: "q8", type: "gapfill", prompt: "Two nineteenth-century innovations were the safety elevator and the ______ frame.", answer: "steel" },
    ],
  },
  {
    id: "rd-language",
    title: "The Disappearance of Languages",
    content: `There are roughly seven thousand languages spoken in the world today, but linguists warn that a large proportion of them may vanish before the end of the century. A language is generally considered endangered when children are no longer learning it as their mother tongue. When the last fluent speaker of a language dies, a unique way of describing the world dies with them.

The reasons for language loss are varied. In many cases, speakers of a minority language shift to a dominant national or global language in order to gain access to education, employment and wider social opportunities. This process is often gradual, with parents choosing not to pass on their heritage language because they believe it will hold their children back. Within two or three generations, a language that was once spoken by thousands can fall silent.

The consequences extend beyond communication. Languages encode detailed knowledge about local plants, animals and environments, accumulated over centuries. When a language disappears, this knowledge is frequently lost as well, because it has never been written down. Some scientists have found that indigenous vocabularies contain distinctions—between species of fish, for example—that formal science has yet to catalogue.

Efforts to reverse language decline have met with mixed success. Revival programmes typically involve teaching the language in schools, producing dictionaries and recordings, and creating opportunities for it to be used in daily life. The revival of Hebrew as a spoken language is often cited as the most striking success, though it took place under highly unusual circumstances. Most endangered languages lack the political and financial support that such an effort requires.

Technology may offer new possibilities. Online archives can preserve recordings of speakers, and social media allows scattered communities to communicate in their own tongue. Yet technology alone cannot save a language; ultimately, survival depends on whether a community of speakers continues to use it, and whether the next generation chooses to learn it.`,
    questions: [
      { id: "q1", type: "tfng", prompt: "A language is considered endangered when children stop learning it as a first language.", answer: "TRUE" },
      { id: "q2", type: "tfng", prompt: "Language shift usually happens suddenly within one generation.", answer: "FALSE" },
      { id: "q3", type: "tfng", prompt: "Indigenous languages can contain knowledge not yet recorded by science.", answer: "TRUE" },
      { id: "q4", type: "tfng", prompt: "Hebrew is the only language ever to have been revived.", answer: "NOT GIVEN" },
      { id: "q5", type: "mcq", prompt: "Why do some parents stop passing on their heritage language?",
        options: ["They believe it will limit their children's opportunities.", "They have forgotten it.", "It is illegal to speak it.", "Schools require a fee to teach it."],
        answer: "They believe it will limit their children's opportunities." },
      { id: "q6", type: "mcq", prompt: "What does the passage say is often lost along with a language?",
        options: ["Local environmental knowledge", "National borders", "Written literature only", "Musical traditions"],
        answer: "Local environmental knowledge." },
      { id: "q7", type: "mcq", prompt: "What is said about technology and language survival?",
        options: ["It can preserve recordings but cannot save a language alone.", "It guarantees a language will survive.", "It has no role at all.", "It replaces the need for speakers."],
        answer: "It can preserve recordings but cannot save a language alone." },
      { id: "q8", type: "gapfill", prompt: "Roughly ______ thousand languages are spoken in the world today.", answer: "seven" },
    ],
  },
  {
    id: "rd-plastic",
    title: "Rethinking Plastic",
    content: `Few materials have transformed daily life as completely as plastic. Cheap, light and endlessly adaptable, it is used in everything from medical equipment to food packaging. Yet the very qualities that make plastic so useful—above all its durability—have created one of the most persistent environmental problems of the modern age. Much of the plastic ever produced still exists in some form, and a great deal of it has ended up in the natural environment.

The scale of the problem is difficult to grasp. Every year, millions of tonnes of plastic waste enter the oceans, where currents gather it into vast floating accumulations. Over time, sunlight and wave action break larger items into tiny fragments known as microplastics. These particles have been found in the most remote parts of the planet, from deep-sea sediments to Arctic ice, and increasingly in the bodies of animals and even humans.

Recycling is often presented as the answer, but its record is disappointing. Only a small fraction of plastic is actually recycled; much is difficult or uneconomical to process, and some is simply exported to countries with limited capacity to deal with it. Many experts now argue that recycling alone cannot solve the crisis, and that the focus must shift towards reducing the amount of plastic produced in the first place.

A number of alternatives are being developed. Some companies are experimenting with biodegradable materials made from plant starch or seaweed, which break down far more quickly than conventional plastic. Others are redesigning products and packaging to use less material or to be reused many times. Governments, meanwhile, have introduced bans on certain single-use items and charges on plastic bags, measures that have produced measurable reductions in waste.

Changing behaviour, however, remains a challenge. Plastic is deeply embedded in modern economies, and convenient habits are hard to break. Progress is likely to require a combination of technological innovation, sensible regulation and a shift in the way societies think about waste—away from the assumption that materials can simply be thrown away, and towards a system in which they are kept in use for as long as possible.`,
    questions: [
      { id: "q1", type: "tfng", prompt: "Most of the plastic ever made still exists in some form.", answer: "TRUE" },
      { id: "q2", type: "tfng", prompt: "Microplastics have been found only near large cities.", answer: "FALSE" },
      { id: "q3", type: "tfng", prompt: "Only a small fraction of plastic is actually recycled.", answer: "TRUE" },
      { id: "q4", type: "tfng", prompt: "Seaweed-based packaging is now cheaper than conventional plastic.", answer: "NOT GIVEN" },
      { id: "q5", type: "mcq", prompt: "Why is plastic's durability described as a problem?",
        options: ["It means plastic persists in the environment for a very long time.", "It makes plastic expensive.", "It stops plastic being useful.", "It causes plastic to dissolve in water."],
        answer: "It means plastic persists in the environment for a very long time." },
      { id: "q6", type: "mcq", prompt: "What do many experts now argue about recycling?",
        options: ["It alone cannot solve the crisis.", "It is the complete solution.", "It should be banned.", "It is only useful in the ocean."],
        answer: "It alone cannot solve the crisis." },
      { id: "q7", type: "mcq", prompt: "Which government measure is mentioned?",
        options: ["Charges on plastic bags", "Free plastic for all", "A tax on seaweed", "Banning recycling"],
        answer: "Charges on plastic bags." },
      { id: "q8", type: "gapfill", prompt: "Sunlight and wave action break plastic into tiny fragments called ______.", answer: "microplastics" },
    ],
  },
];

