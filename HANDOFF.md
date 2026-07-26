# 进度缓存 · 剑11+12 扩充(下次从这里继续)

> 本轮任务:扩充剑桥11+12 真题(阅读24篇+听力8套),修打包遗留缺陷。
> 记录到 2026-07-26,含**精确续做步骤**。只信工具真实返回值,别信 agent 谎报。

## 本轮已完成 ✅
1. **打包脚本修复**(已 commit 6f2653e,本地):
   - build-dmg.sh: .app 缺失时改调 build-standalone-app.sh(原引用过时的 build-macos-app.sh)
   - build-standalone-app.sh: 健全性检查用 require.resolve 动态定位 @prisma/client(移除硬编码 pnpm 版本路径)
   - ⚠️ **commit 6f2653e 还没 push**(GitHub 443 超时)。前两个 commit ff15bd7/464f798 已 push。
2. **听力扩充完成**:cambridge-listening.json 16→**24 套**(剑11-16 全覆盖)。
   - 脚本 `scripts/add-c1112-listening.py`(题干+答案内联,可重跑,幂等)
   - 8 套 Section4 音频已转码:`public/audio/listening/c1[12]-t[1-4]-s4.m4a`
     ⚠️ 剑11/12 是**真 MP3**(不是误标m4a!),已 afconvert -f m4af -d aac 转 AAC-LC(同剑16)
   - 剑12 用 Test5-8 编号 → 映射 c12-t1..t4
   - 答案全对图核对,含2处OCR修正:c11-t2 Q38/39=curved/curtains(读反了)、c11-t4 Q32=hard(OCR误读hand)
3. **OCR 完成**:剑11(143页)+剑12(136页)全书,缓存 `~/.ielts-ocr-cache/c11|c12/pNN.txt`

## 待完成 ⏳ —— 阅读24篇(唯一大头)
**决策(用户拍板)**:阅读不用子 agent(试点3篇只落地1篇,且会谎报完成),**自己逐篇做**。
- 流程:questions 手工核对(核心) + content 用清理后 OCR。
- **已落地1篇**:`/tmp/c1112-reading/c11-t1-p3.json`(agent做的,质量合格,14题,保留)
- 还剩 **23 篇**要做,写到 `/tmp/c1112-reading/<id>.json`,最后合并进 cambridge-reading.json

### 阅读页范围(READING PASSAGE 正文起始→题目,已定位)
| id | 页范围(OCR缓存 ~/.ielts-ocr-cache/) |
|---|---|
| c11-t1-p1 | c11/p16-18 | c11-t1-p2 | c11/p19-23 | c11-t1-p3 | ✅已done |
| c11-t2-p1 | c11/p39-43 | c11-t2-p2 | c11/p43-47 | c11-t2-p3 | c11/p47-52 |
| c11-t3-p1 | c11/p63-67 | c11-t3-p2 | c11/p67-71 | c11-t3-p3 | c11/p71-75 |
| c11-t4-p1 | c11/p85-89 | c11-t4-p2 | c11/p89-94 | c11-t4-p3 | c11/p94-98 |
| c12-t1-p1 | c12/p16-20 | c12-t1-p2 | c12/p20-23 | c12-t1-p3 | c12/p23-27 |
| c12-t2-p1 | c12/p36-42 | c12-t2-p2 | c12/p42-46 | c12-t2-p3 | c12/p46-50 |
| c12-t3-p1 | c12/p59-63 | c12-t3-p2 | c12/p63-66 | c12-t3-p3 | c12/p66-71 |
| c12-t4-p1 | c12/p80-83 | c12-t4-p2 | c12/p83-88 | c12-t4-p3 | c12/p88-92 |

### 已核对答案基准(对图核对✅,直接用):
- `/tmp/ans/c11-answers.md` + `/tmp/ans/c12-answers.md`(阅读,每篇P1/P2/P3答案序列)
- `/tmp/ans/c11-listening.md` + `/tmp/ans/c12-listening.md`(听力,已入JSON)
- ⚠️ /tmp 可能被清!基准答案已抄进本文件末尾"阅读答案全表"备份。

### JSON 结构(照 cambridge-reading.json 现有):
{"id":"c11-t1-p1","title":"...","content":"正文\\n\\n分段","questions":[{"id":"q1","type":"gapfill|tfng|mcq","prompt":"...","answer":"...","accept":[可选]}]}
- tfng: answer 用 TRUE/FALSE/NOT GIVEN 大写
- matching-headings/people/段落匹配: 建模为 mcq。段落匹配 options=字母A-H、answer=字母;heading型 options=选项文本、answer=正确文本(或退用罗马数字)
- IN EITHER ORDER: 两题 answer 各填一个,或用 accept 备选
- gapfill 复数/拼写变体用 accept(如 food→accept:["foods"])

## 收尾步骤(阅读做完后)
1. 合并:写脚本把 /tmp/c1112-reading/*.json append 进 cambridge-reading.json(注意该文件 skip-worktree,直接改磁盘即可,48→72篇)
2. 验证:`~/.local/node22/bin/tsc --noEmit`(0错误) + `node_modules/.bin/next build`
3. **push 待发**:`git push origin main`(把 6f2653e 推上去;网络恢复后)
4. 音频+脚本提交:git add public/audio/listening/c1[12]-*.m4a scripts/add-c1112-listening.py scripts/ocr-book.sh → commit
   ⚠️ **版权安全**:c1[3-6]-*.m4a 已 gitignore,但 **c11/c12 音频规则要确认**!检查 .gitignore 是否覆盖 c1[12]-*.m4a,不覆盖则加规则,**绝不提交剑桥音频**。
5. 发布流程走版权替换(见下),重打包 .app/.dmg

## ⚠️ 版权安全(仓库PUBLIC,照旧)
- 提交前:三个 skip-worktree JSON 临时 --no-skip-worktree → cambridge-*写空stub[]、vocab-bank跑 build-vocab-bank.py(ECDICT-only,CSV在/tmp/ecdict/ecdict.csv 77万行) → commit → 恢复真实内容(md5校验) → 重新skip-worktree → clone远程验无泄漏
- 真实内容 md5:reading=16d496cf177af96dc42500f04fa1d0af listening(旧,已变) vocab=3300bffa91f2c8a7b9286a4472d44879
- `资料/` `*.mdx` `*.mdd` `dist/` `public/audio/listening/c1[3-6]-*.m4a` 已 gitignore

## 环境
- node: `~/.local/node22/bin`(系统node不能用,prisma .dylib 报 TeamID 签名错;验DB用 sqlite3 直查)
- OCR管线: `sh scripts/ocr-book.sh <pdf> <名> <起> <止>`(200dpi+stdin管道+LC_ALL,已验证)
- tesseract/afconvert/pdftoppm 都在 /opt/homebrew/bin
- 答案对图核对: pdftoppm -f <页> -r 200 -png → Read 工具读PNG(OCR答案网格会串行,必须人眼核图)
- GitHub: https://github.com/xiyusssd/ielts-study (main),测试账号 test@example.com/test1234

## 阅读答案全表备份(对图核对✅,/tmp 清了用这个)
### 剑11
- t1-P1(1-13): tomatoes|urban centres(acc:centers)|energy|fossil fuel|artificial|trays(acc:stacked trays)|rooftops(acc:urban rooftops)|NOT GIVEN|TRUE|FALSE|TRUE|FALSE|TRUE
- t1-P2(14-26): FALSE|NOT GIVEN|TRUE|NOT GIVEN|TRUE|TRUE|gates|clamp|axle|cogs|aqueduct|wall|locks
- t1-P3(27-40): D|B|A|sunshade|iron|algae|clouds|cables|snow|rivers|B|D|C|A ✅已done
- t2-P1(1-13): TRUE|NOT GIVEN|TRUE|FALSE|C|B|G|A|(lifting)frame|hydraulic jacks|stabbing guides|(lifting)cradle|air bags
- t2-P2(14-26): ii|ix|viii|i|iv|vii|vi|farming|canoes|birds|wood|B/C(25&26任序)|B/C
- t2-P3(27-40): C|D|B|A|C|B|H|NOT GIVEN|YES|NO|NO|YES|NOT GIVEN|A
- t3-P1(1-13): tea|reel|women|royalty|currency|paper|monks|nylon|FALSE|TRUE|TRUE|FALSE|NOT GIVEN
- t3-P2(14-26): FALSE|TRUE|NOT GIVEN|TRUE|FALSE|G|D|A|E|speed|plains|bottlenecks|corridor/passageway
- t3-P3(27-40): D|B|G|C|B|E|A|F|beginner|arithmetic|intuitive|scientists|experiments|theorems
- t4-P1(1-13): FALSE|NOT GIVEN|NOT GIVEN|TRUE|A|C|B|A|A|D|B|E|F
- t4-P2(14-26): B|A|B|D|C|D|TRUE|TRUE|NOT GIVEN|TRUE|FALSE|C|A
- t4-P3(27-40): vi|iv|ii|vii|i|v|E|G|B|F|NO|YES|NOT GIVEN|YES
### 剑12 (Test5-8→t1-4)
- t1-P1(1-13): NOT GIVEN|FALSE|FALSE|TRUE|TRUE|taste|cheaper|convenient|image|sustainable|recycled|biodiversity|desertification
- t1-P2(14-26): antiques|triumph|information|contact/meetings|hunt/desire|aimless/empty|educational|Trainspotting|NOT GIVEN|FALSE|NOT GIVEN|TRUE|TRUE
- t1-P3(27-40): vi|viii|ii|iv|iii|vii|fire science|investigators|evidence|prosecution|NOT GIVEN|YES|NO|NO
- t2-P1(1-13): A|B|H|D|B|C|G|B|A|D/E(10&11任序)|D/E|C/D(12&13任序)|C/D
- t2-P2(14-26): iv|vi|v|v|i|vii|iii|TRUE|FALSE|FALSE|NOT GIVEN|rubber|farmer
- t2-P3(27-40): eye movements|language co-activation|Stroop Task|conflict management|cognitive control|YES|NOT GIVEN|NO|NO|NOT GIVEN|D|B|B|C
- t3-P1(1-13): v|iii|viii|i|iv|vi|ii|pirates|food|oil|settlers|species|eggs
- t3-P2(14-26): D|C|F|C|G|D|B|vaccinations|antibiotics|mosquito(e)s|factories|forests|Polio|mountain
- t3-P3(27-40): dopamine|pleasure|caudate|anticipatory phase|food|B|C|A|B|D|F|B|E|C
- t4-P1(1-13): obsidian|spears|beads|impurities|Romans|lead|clouding|taxes|TRUE|FALSE|NOT GIVEN|TRUE|FALSE
- t4-P2(14-26): D|A|C|A|C|E|D|F|A|NO|NOT GIVEN|YES|YES
- t4-P3(27-40): iv|ii|vi|viii|vii|i|iii|YES|NOT GIVEN|NO|NO|information|financial|shareholders/investors
