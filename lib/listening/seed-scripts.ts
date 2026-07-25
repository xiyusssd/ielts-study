/**
 * 听力 seed：2 段脚本 + 20 题
 *
 * S1 = Section 1（社交对话，10 题）
 * S3 = Section 3（学术讨论，10 题）
 *
 * 音频：browser TTS 播报为默认；也可用 scripts/gen-listening-audio.ts
 * 用 OpenAI TTS 生成 MP3 存到 content/audio/。
 */

import type { QuestionType } from "@/lib/reading/seed-passages";

export type ListeningQ = {
  index: number;
  type: QuestionType; // 复用阅读的题型定义
  prompt: string;
  options?: string[] | Record<string, string>;
  answer: string | string[];
  explanation?: string;
};

export type SeedListening = {
  source: string;
  title: string;
  section: 1 | 2 | 3 | 4;
  transcript: string;
  metadata: { difficulty: number; topics: string[]; speakers: string[]; durationHint: number };
  questions: ListeningQ[];
};

// ============ Section 1: Gym Membership Enquiry ============
export const LISTENING_S1: SeedListening = {
  source: "seed-listen-s1-gym",
  title: "Section 1 · Gym Membership Enquiry",
  section: 1,
  transcript: `Receptionist: Good morning, Fitness Plus. This is Sarah speaking. How may I help you?

Caller: Hi Sarah, I'm interested in joining your gym. Could you tell me about your membership options?

Receptionist: Of course. We have three main plans. The Basic plan is 35 pounds per month and gives you access to the gym floor and the swimming pool. The Standard plan is 55 pounds per month, and that adds all our group classes like yoga, spinning, and pilates.

Caller: And the top plan?

Receptionist: Our Premium plan is 80 pounds a month. It includes everything in Standard plus one personal training session per week and unlimited use of the sauna and steam room.

Caller: That sounds good. What are your opening hours?

Receptionist: We're open from 6 a.m. to 10 p.m. on weekdays, and 8 a.m. to 8 p.m. on weekends.

Caller: Do I need to bring anything for my first visit?

Receptionist: Yes, please bring a photo ID, a towel, and if possible a padlock for the lockers. We also require a signed medical questionnaire, which you can download from our website.

Caller: What's the website address?

Receptionist: It's www dot fitnessplus dash uk dot com. That's all one word, "fitnessplus" with a hyphen and then "uk".

Caller: Great. Where exactly are you located?

Receptionist: We're at 42 Riverside Road, near the central library. There's a car park behind the building, but we recommend using public transport as parking spaces are limited.

Caller: And do I need to book classes in advance?

Receptionist: Yes, classes must be booked at least 4 hours in advance through our mobile app. Popular classes fill up quickly, so we suggest booking as early as possible.

Caller: Perfect. I'll come in tomorrow morning around 10 a.m. to sign up.

Receptionist: Wonderful. I'll make a note. May I have your name?

Caller: Yes, it's James Cooper. C-O-O-P-E-R.

Receptionist: Thank you, James. See you tomorrow at 10.`,
  metadata: {
    difficulty: 5.5,
    topics: ["daily life", "services"],
    speakers: ["Receptionist (F)", "Caller (M)"],
    durationHint: 180,
  },
  questions: [
    { index: 1, type: "gapfill", prompt: "Basic plan: £______ per month", answer: "35", explanation: "'The Basic plan is 35 pounds per month'" },
    { index: 2, type: "gapfill", prompt: "Standard plan adds ______ classes", answer: "group", explanation: "'adds all our group classes'" },
    { index: 3, type: "gapfill", prompt: "Premium plan: £______ per month", answer: "80" },
    { index: 4, type: "mcq", prompt: "The Premium plan includes:",
      options: ["Free towel service", "One personal training session per week", "Free parking pass", "Free breakfast"],
      answer: "B", explanation: "'one personal training session per week'" },
    { index: 5, type: "gapfill", prompt: "Weekday closing time: ______ p.m.", answer: "10" },
    { index: 6, type: "gapfill", prompt: "For first visit, bring photo ID, a towel, and a ______", answer: "padlock" },
    { index: 7, type: "gapfill", prompt: "Address: ______ Riverside Road", answer: "42" },
    { index: 8, type: "gapfill", prompt: "Classes must be booked ______ hours in advance", answer: "4" },
    { index: 9, type: "gapfill", prompt: "Caller's name: James ______", answer: "cooper", explanation: "C-O-O-P-E-R" },
    { index: 10, type: "mcq", prompt: "The receptionist recommends:",
      options: ["Driving to the gym", "Using public transport", "Bringing children", "Booking Premium first"],
      answer: "B", explanation: "'we recommend using public transport as parking spaces are limited'" },
  ],
};

// ============ Section 3: Environmental Studies Group Project ============
export const LISTENING_S3: SeedListening = {
  source: "seed-listen-s3-env",
  title: "Section 3 · Environmental Studies Group Project",
  section: 3,
  transcript: `Tutor: So, how is your group project on urban green spaces coming along?

Sara: Well, we've narrowed our focus to look at three specific parks in Manchester. Originally we wanted to compare five, but we realised that was too ambitious given the time frame.

Tutor: Good decision. Depth over breadth is usually more valuable. Which three did you choose?

Ben: Heaton Park, Fletcher Moss, and Platt Fields. We picked these because they represent different types of green space—large historic estate, botanical garden, and multi-purpose urban park.

Tutor: Interesting selection. And what's your main research question?

Sara: We're investigating how park design affects visitor behaviour, particularly whether specific features encourage longer stays.

Tutor: That's quite broad. How are you measuring visitor behaviour?

Ben: Two methods. First, we're doing timed observations, counting how long people stay in different zones of each park. Second, we're conducting short surveys asking visitors why they chose this particular park.

Tutor: How many surveys are you aiming to collect?

Sara: We initially planned 100 per park, so 300 total. But we've found that people can be reluctant to participate, so we may have to reduce that to 60 or 70 per park.

Tutor: What have you found so far?

Ben: We've completed observations for Heaton Park. The most striking finding is that visitors stay significantly longer in areas with seating and shade. Areas with only lawns—no benches, no trees—see visitors passing through but rarely stopping.

Sara: We also noticed that families gather in playground zones for average of 45 minutes, while solo visitors on paths only stay for about 12 minutes.

Tutor: That's fascinating data. Have you considered weather variables?

Ben: Yes, we're recording temperature and weather conditions for each observation. Early results suggest that on rainy days, visitor numbers drop by around 65%, though committed dog walkers still come regardless of weather.

Tutor: Excellent. Now, what challenges have you encountered?

Sara: The biggest issue has been getting park authority permission for surveys. Fletcher Moss required a formal application that took three weeks to approve.

Tutor: I imagine. What about your report structure?

Ben: We're organizing it into five sections: introduction, methodology, individual park findings, comparative analysis, and recommendations for urban planners.

Tutor: I'd suggest putting your comparative analysis before the individual findings—it gives readers a framework to interpret the details.

Sara: That's a good point. We'll restructure.

Tutor: One more suggestion: your recommendations section should be quite specific. General advice like "add more benches" is less useful than "add benches every 50 metres along main paths in high-traffic areas."

Ben: Understood. We'll aim for actionable recommendations.

Tutor: When's your presentation?

Sara: December 15th, so we have about three weeks.

Tutor: Plenty of time if you stay focused. Send me a draft by December 8th.`,
  metadata: {
    difficulty: 7.0,
    topics: ["academic", "research methods", "urban planning"],
    speakers: ["Tutor (M)", "Sara (F)", "Ben (M)"],
    durationHint: 240,
  },
  questions: [
    { index: 11, type: "mcq", prompt: "Why did the group reduce their study to three parks?",
      options: ["Budget constraints", "Time frame limitations", "Weather issues", "Lack of permission"],
      answer: "B", explanation: "'we realised that was too ambitious given the time frame'" },
    { index: 12, type: "gapfill", prompt: "Number of parks studied: ______", answer: "3" },
    { index: 13, type: "mcq", prompt: "The group's research question focuses on:",
      options: ["Park maintenance costs", "How design affects visitor behaviour", "Wildlife populations", "Historical origins"],
      answer: "B" },
    { index: 14, type: "gapfill", prompt: "Original survey target: ______ per park", answer: "100" },
    { index: 15, type: "gapfill", prompt: "Reduced target: 60 or ______ per park", answer: "70" },
    { index: 16, type: "gapfill", prompt: "Families gather in playground zones for average ______ minutes", answer: "45" },
    { index: 17, type: "gapfill", prompt: "Solo visitors on paths stay about ______ minutes", answer: "12" },
    { index: 18, type: "gapfill", prompt: "On rainy days, visitor numbers drop by around ______%", answer: "65" },
    { index: 19, type: "mcq", prompt: "The tutor suggests the report should:",
      options: [
        "Include more parks",
        "Put comparative analysis before individual findings",
        "Focus only on Heaton Park",
        "Cut the recommendations section",
      ], answer: "B", explanation: "'putting your comparative analysis before the individual findings'" },
    { index: 20, type: "gapfill", prompt: "Draft due date: December ______", answer: "8" },
  ],
};

export const ALL_LISTENING = [LISTENING_S1, LISTENING_S3];
