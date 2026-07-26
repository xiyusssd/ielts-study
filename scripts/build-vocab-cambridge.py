#!/usr/bin/env python3
"""本地增强版：与 build-vocab-bank.py 同一 schema/选词逻辑，仅释义优先用剑桥英汉词典。

释义：剑桥 MDX 命中则用剑桥(更权威)，否则回退 ECDICT。其余(pos/cefr/sources/topics/
level/freq)完全走共享 vocab_common，保证与公开版 schema 一致(发布覆盖不丢字段)。

⚠️ 含剑桥词典释义，产物 vocab-bank.json 不可公开(skip-worktree)。
用法：python3 scripts/build-vocab-cambridge.py
依赖：readmdict + python-lzo (brew lzo)
"""
import os, re, html
import vocab_common as vc

HERE = os.path.dirname(__file__)
MDX_PATH = "/Users/xiyu/Desktop/剑桥英汉（简体）词典/Cambridge English-Chinese (Simplified) Dictionary.mdx"
CSV_PATH = "/tmp/ecdict/ecdict.csv"
OUT_PATH = os.path.join(HERE, "..", "lib", "assessment", "data", "vocab-bank.json")
TOPIC_MAP = os.path.join(HERE, "..", "lib", "assessment", "data", "topic-map.json")
AWL_PATH = os.path.join(HERE, "..", "content", "wordlists", "awl.txt")


def extract_cn(html_text):
    """从剑桥词典 HTML 抽第一个简短中文释义(跳过例句)。"""
    html_text = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", html_text, flags=re.S)
    html_text = html.unescape(html_text)
    for frag in re.findall(r"([（(【\[]?[一-鿿][^<>]{0,32})", html_text):
        frag = frag.strip()
        frag = re.sub(r"[（(【\[][^）)】\]]*[）)】\]]", "", frag)
        if re.search(r"^[^（(【\[]*[）)】\]]", frag):
            frag = re.sub(r"^[^（(【\[]*[）)】\]]", "", frag)
        frag = re.sub(r"[（()）【】\[\]]", "", frag).strip()
        if any(p in frag for p in "。？！"):
            continue
        frag = re.split(r"[；;/]", frag)[0]
        parts = re.split(r"[，,、]", frag)
        meaning = "，".join(parts[:2]).strip()
        if meaning and vc.CJK.search(meaning) and 1 < len(meaning) <= 12:
            return meaning
    return None


def load_cambridge():
    from readmdict import MDX
    defs = {}
    for key, val in MDX(MDX_PATH).items():
        word = key.decode("utf-8").strip().lower()
        if not vc.WORD_RE.match(word) or word in defs:
            continue
        meaning = extract_cn(val.decode("utf-8", "ignore"))
        if meaning:
            defs[word] = meaning
    return defs


def main():
    print("加载剑桥词典 MDX ...", flush=True)
    cambridge = load_cambridge()
    print(f"  剑桥词条(有中文释义): {len(cambridge)}", flush=True)

    entries = list(vc.iter_ecdict(CSV_PATH))
    cam_used = 0
    for e in entries:
        cam = cambridge.get(e["word"])
        if cam:
            e["meaning"] = cam
            cam_used += 1

    topic_map = vc.load_topic_map(TOPIC_MAP)
    awl = vc.load_awl(AWL_PATH)
    out = vc.build_and_write(entries, topic_map, awl, OUT_PATH)
    picked_cam = sum(1 for e in out if cambridge.get(e["word"]))
    vc.report(out, f"(剑桥释义 {picked_cam}/{cam_used} 命中)")
    print(f"→ {OUT_PATH}")


if __name__ == "__main__":
    main()
