#!/usr/bin/env python3
"""清理按栏 OCR 文本。用法: python3 clean-col-ocr.py <book> <startpage> <endpage>
按 ===COL-BREAK=== 拆左右栏,左栏在前右栏在后拼接。去除栏边线噪声/页眉。"""
import sys, os, re

book, p0, p1 = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
cache = os.path.expanduser(f"~/.ielts-ocr-cache/{book}")

def clean_line(ln):
    # 去行首栏边线噪声 ": " / "| " / "i " 等
    ln = re.sub(r'^[\s:|_iIl\.]{1,3}\s', '', ln)
    ln = ln.rstrip()
    return ln

for p in range(p0, p1+1):
    fp = os.path.join(cache, f"p{p}.col.txt")
    if not os.path.exists(fp):
        print(f"\n########## p{p}: 缺失 ##########")
        continue
    raw = open(fp, encoding="utf-8", errors="replace").read()
    parts = raw.split("===COL-BREAK===")
    left = parts[0] if parts else ""
    right = parts[1] if len(parts) > 1 else ""
    print(f"\n########## p{p} 左栏 ##########")
    for ln in left.splitlines():
        c = clean_line(ln)
        if c: print(c)
    print(f"\n########## p{p} 右栏 ##########")
    for ln in right.splitlines():
        c = clean_line(ln)
        if c: print(c)
