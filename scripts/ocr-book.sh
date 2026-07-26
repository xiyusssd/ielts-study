#!/bin/sh
# 用法: sh scripts/ocr-book.sh <pdf路径> <缓存目录名> [起页] [止页]
# 已验证管线: pdftoppm -r 200 + tesseract stdin 管道(避 /tmp 符号链接) + LC_ALL
set -e
PDF="$1"; NAME="$2"; FROM="${3:-1}"; TO="$4"
CACHE="$HOME/.ielts-ocr-cache/$NAME"
mkdir -p "$CACHE"
[ -z "$TO" ] && TO=$(mdls -name kMDItemNumberOfPages "$PDF" 2>/dev/null | sed 's/[^0-9]//g')
echo "OCR $PDF → $CACHE (页 $FROM..$TO)"
for p in $(seq "$FROM" "$TO"); do
  OUT="$CACHE/p$p.txt"
  [ -s "$OUT" ] && continue
  IMG="/tmp/ocrpage-$$.png"
  pdftoppm -f "$p" -l "$p" -r 200 -png "$PDF" "/tmp/ocrpage-$$" >/dev/null 2>&1
  # pdftoppm 输出可能带 -N 后缀
  SRC="/tmp/ocrpage-$$.png"
  [ -f "$SRC" ] || SRC=$(ls /tmp/ocrpage-$$-*.png 2>/dev/null | head -1)
  if [ -f "$SRC" ]; then
    LC_ALL=en_US.UTF-8 tesseract - "$CACHE/p$p" --psm 6 < "$SRC" >/dev/null 2>&1 || echo "  p$p FAIL"
    rm -f /tmp/ocrpage-$$*.png
  fi
  [ $((p % 20)) -eq 0 ] && echo "  ...p$p done"
done
echo "完成: $(ls "$CACHE"/p*.txt 2>/dev/null | wc -l | tr -d ' ') 页"
