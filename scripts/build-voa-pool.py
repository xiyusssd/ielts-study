#!/usr/bin/env python3
"""
把抓取的 VOA 文稿 + 人工编写的题目，合成打包用的题库 JSON。
输入：/tmp/voa/transcripts.json
输出：lib/assessment/data/voa-articles.json  [{id,title,text,questions}]
题目为人工编写（非 AI）。音频用 VOA 真人 MP3（已转 public/audio/listening/voa-<id>.m4a）。
"""
import json, re, os

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = "/tmp/voa/transcripts.json"
OUT = os.path.join(ROOT, "lib", "assessment", "data", "voa-articles.json")


def clean(text):
    # 去掉词汇表（首个下划线分隔线之后）
    text = re.split(r"_{5,}", text)[0]
    # 去掉结尾播音/改写署名段
    lines = [ln for ln in text.split("\n") if ln.strip()]
    kept = []
    for ln in lines:
        if re.search(r"(reported (on )?this story|adapted it|wrote this story|for VOA Learning English|for Learning English|for the Associated Press|for Agence France)", ln):
            continue
        if re.match(r"^I.m [A-Z]", ln.strip()):
            continue
        if ln.strip().startswith("What do you think"):
            continue
        kept.append(ln.strip())
    return "\n\n".join(kept).strip()


# 人工编写的题目（answer 按 value 判分）
QUESTIONS = {}
QUESTIONS["daylight"] = [
    {"id": "q1", "type": "tfng", "prompt": "Every part of the United States changes its clocks for daylight saving time.", "answer": "FALSE"},
    {"id": "q2", "type": "tfng", "prompt": "Some studies link the March time change to more heart attacks and strokes.", "answer": "TRUE"},
    {"id": "q3", "type": "tfng", "prompt": "The circadian rhythm stays the same throughout a person's life.", "answer": "FALSE"},
    {"id": "q4", "type": "mcq", "prompt": "According to the article, what resets the body's circadian rhythm?",
     "options": ["Morning light", "Caffeine", "Evening screen time", "A longer nap"], "answer": "Morning light"},
    {"id": "q5", "type": "mcq", "prompt": "What do the American Medical Association and sleep experts recommend?",
     "options": ["Staying on standard time year-round", "More time changes each year", "Later bedtimes for everyone", "Banning caffeine"], "answer": "Staying on standard time year-round"},
    {"id": "q6", "type": "mcq", "prompt": "Which is suggested as a way to prepare for the time change?",
     "options": ["Move bedtime 15-20 minutes earlier for several nights", "Sleep in much later", "Drink coffee before bed", "Avoid all sunlight"], "answer": "Move bedtime 15-20 minutes earlier for several nights"},
]
QUESTIONS["dementia"] = [
    {"id": "q1", "type": "tfng", "prompt": "The new study predicts about one million Americans a year will develop dementia by 2060.", "answer": "TRUE"},
    {"id": "q2", "type": "tfng", "prompt": "Dementia is described as a normal part of getting older.", "answer": "FALSE"},
    {"id": "q3", "type": "tfng", "prompt": "Women are more likely than men to develop dementia partly because they live longer.", "answer": "TRUE"},
    {"id": "q4", "type": "mcq", "prompt": "What is the most common form of dementia?",
     "options": ["Alzheimer's", "Vascular dementia", "Mixed dementia", "APOE4 dementia"], "answer": "Alzheimer's"},
    {"id": "q5", "type": "mcq", "prompt": "Which advice do the experts give to reduce dementia risk?",
     "options": ["Exercise and control blood pressure", "Sleep less", "Avoid all social contact", "Stop reading"], "answer": "Exercise and control blood pressure"},
    {"id": "q6", "type": "mcq", "prompt": "At what age does the article say dementia risk is highest?",
     "options": ["After 75", "Before 55", "In the 20s", "At any age equally"], "answer": "After 75"},
]
QUESTIONS["airquality"] = [
    {"id": "q1", "type": "tfng", "prompt": "Blue skies always mean the air is clean.", "answer": "FALSE"},
    {"id": "q2", "type": "tfng", "prompt": "Air pollution is estimated to kill about 7 million people each year.", "answer": "TRUE"},
    {"id": "q3", "type": "tfng", "prompt": "PM 2.5 particles can travel deep into human lungs.", "answer": "TRUE"},
    {"id": "q4", "type": "mcq", "prompt": "According to the Health Effects Institute, air pollution is the second-largest risk for early death, behind what?",
     "options": ["High blood pressure", "Smoking", "Poor diet", "Lack of exercise"], "answer": "High blood pressure"},
    {"id": "q5", "type": "mcq", "prompt": "When do air purifiers work best?",
     "options": ["In small spaces with people nearby", "In very large rooms", "Outdoors", "Only at night"], "answer": "In small spaces with people nearby"},
    {"id": "q6", "type": "mcq", "prompt": "What do experts say individuals should do when air quality is bad?",
     "options": ["Limit exposure by staying indoors or wearing a mask", "Exercise outside more", "Open all windows", "Burn incense"], "answer": "Limit exposure by staying indoors or wearing a mask"},
]
QUESTIONS["asteroid"] = [
    {"id": "q1", "type": "tfng", "prompt": "NASA estimated a 3.1 percent chance that asteroid 2024 YR4 would hit Earth in 2032.", "answer": "TRUE"},
    {"id": "q2", "type": "tfng", "prompt": "Several planetary defense methods have already been tested against real asteroids.", "answer": "FALSE"},
    {"id": "q3", "type": "tfng", "prompt": "Experts say the world is defenceless against asteroids.", "answer": "FALSE"},
    {"id": "q4", "type": "mcq", "prompt": "Which method has actually been tried against an asteroid?",
     "options": ["NASA's DART spacecraft impact", "A nuclear weapon", "Laser beams", "Painting it white"], "answer": "NASA's DART spacecraft impact"},
    {"id": "q5", "type": "mcq", "prompt": "Why must scientists be careful not to 'overdo' hitting an asteroid?",
     "options": ["It could break into smaller pieces heading toward Earth", "It would cost too much", "It might change colour", "It could speed up"], "answer": "It could break into smaller pieces heading toward Earth"},
    {"id": "q6", "type": "mcq", "prompt": "What does one non-contact method use to pull an asteroid off course?",
     "options": ["A spacecraft's gravitational force", "A giant net", "Explosives", "Sound waves"], "answer": "A spacecraft's gravitational force"},
]
QUESTIONS["mars"] = [
    {"id": "q1", "type": "tfng", "prompt": "Scientists say ferrihydrite may be responsible for the red colour of Mars.", "answer": "TRUE"},
    {"id": "q2", "type": "tfng", "prompt": "Ferrihydrite can form in water-rich environments.", "answer": "TRUE"},
    {"id": "q3", "type": "tfng", "prompt": "Past studies had suggested hematite might cause the red colour.", "answer": "TRUE"},
    {"id": "q4", "type": "mcq", "prompt": "What does the discovery of ferrihydrite suggest about Mars's past?",
     "options": ["It once held liquid water", "It was always dry", "It had no atmosphere", "It was covered in ice only"], "answer": "It once held liquid water"},
    {"id": "q5", "type": "mcq", "prompt": "How do scientists say their theory can finally be confirmed?",
     "options": ["With samples brought back from Mars", "By painting Mars", "With a bigger telescope on Earth", "It is already fully proven"], "answer": "With samples brought back from Mars"},
    {"id": "q6", "type": "mcq", "prompt": "Ferrihydrite is described as what kind of mineral?",
     "options": ["An iron oxide mineral", "A carbon mineral", "A salt crystal", "A form of ice"], "answer": "An iron oxide mineral"},
]
QUESTIONS["butterfly"] = [
    {"id": "q1", "type": "tfng", "prompt": "The 2024 western monarch count was the second-lowest in nearly 30 years.", "answer": "TRUE"},
    {"id": "q2", "type": "tfng", "prompt": "Monarch numbers have only ever fallen and never recovered.", "answer": "FALSE"},
    {"id": "q3", "type": "tfng", "prompt": "Pesticides, habitat loss and climate change are blamed for the decline.", "answer": "TRUE"},
    {"id": "q4", "type": "mcq", "prompt": "Which plant do monarch caterpillars feed on?",
     "options": ["Milkweed", "Sunflower", "Wheat", "Clover"], "answer": "Milkweed"},
    {"id": "q5", "type": "mcq", "prompt": "What does the article say about the monarch population's ability to recover?",
     "options": ["It can rebound quickly because insects reproduce fast", "It can never recover", "It only grows in winter", "Recovery takes 30 years"], "answer": "It can rebound quickly because insects reproduce fast"},
    {"id": "q6", "type": "mcq", "prompt": "What did the U.S. Fish and Wildlife Service propose in December 2024?",
     "options": ["Listing monarchs as threatened", "Banning all farming", "Removing all milkweed", "Ending butterfly counts"], "answer": "Listing monarchs as threatened"},
]
def main():
    src = json.load(open(SRC, encoding="utf-8"))
    out = []
    for art in src:
        aid = art["id"]
        qs = QUESTIONS.get(aid)
        if not qs:
            print(f"! {aid} 无题目，跳过")
            continue
        out.append({
            "id": aid,
            "title": art["title"],
            "text": clean(art["text"]),
            "questions": qs,
        })
        print(f"✓ {aid}: {len(qs)} 题 · {len(clean(art['text']).split())} 词")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\n✓ {len(out)} 篇 → {OUT}")


if __name__ == "__main__":
    main()
