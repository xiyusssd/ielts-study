#!/bin/sh
# 按左右栏 OCR(剑桥双栏正文页): pdftoppm 裁剪左/右半分别识别再拼接
# 用法: sh scripts/ocr-cols.sh <pdf> <缓存名> <起页> <止页>
# 输出: ~/.ielts-ocr-cache/<名>/pN.col.txt (不覆盖旧 pN.txt)
set -e
PDF="$1"; NAME="$2"; FROM="$3"; TO="$4"
CACHE="$HOME/.ielts-ocr-cache/$NAME"
mkdir -p "$CACHE"
for p in $(seq "$FROM" "$TO"); do
  OUT="$CACHE/p$p.col.txt"
  [ -s "$OUT" ] && { echo "p$p 已存在,跳过"; continue; }
  B="/tmp/ocrcol-$$"
  # 先渲染全页拿尺寸
  pdftoppm -f "$p" -l "$p" -r 200 -png "$PDF" "$B.full" >/dev/null 2>&1
  FIMG=$(ls "$B.full"*.png 2>/dev/null | head -1)
  W=$(sips -g pixelWidth "$FIMG" 2>/dev/null | awk '/pixelWidth/{print $2}')
  H=$(sips -g pixelHeight "$FIMG" 2>/dev/null | awk '/pixelHeight/{print $2}')
  [ -z "$W" ] && W=1654; [ -z "$H" ] && H=2339
  # 校准: 左栏 0..(W/2+8), 右栏 (W/2+13)..W。中缝白,不重叠碎片,词尾不切
  LW=$(( W / 2 + 8 ))
  RX=$(( W / 2 + 13 ))
  RW=$(( W - RX ))
  pdftoppm -f "$p" -l "$p" -r 200 -x 0    -y 0 -W "$LW" -H "$H" -png "$PDF" "$B.l" >/dev/null 2>&1
  pdftoppm -f "$p" -l "$p" -r 200 -x "$RX" -y 0 -W "$RW" -H "$H" -png "$PDF" "$B.r" >/dev/null 2>&1
  LIMG=$(ls "$B.l"*.png 2>/dev/null | head -1)
  RIMG=$(ls "$B.r"*.png 2>/dev/null | head -1)
  : > "$OUT"
  [ -f "$LIMG" ] && LC_ALL=en_US.UTF-8 tesseract - - --psm 6 < "$LIMG" >> "$OUT" 2>/dev/null
  printf '\n===COL-BREAK===\n\n' >> "$OUT"
  [ -f "$RIMG" ] && LC_ALL=en_US.UTF-8 tesseract - - --psm 6 < "$RIMG" >> "$OUT" 2>/dev/null
  rm -f "$B"*.png
  echo "p$p done"
done
echo "完成"
