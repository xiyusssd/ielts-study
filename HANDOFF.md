# 进度缓存 · 剑桥真题批量导入(下次从这里继续)

> 用户要求:导入剑桥 14/15/16 完整真题(阅读+听力),词库扩到 1万+,全程自主、不打断,做完自检。
> 本文件记录到 2026-07-26 的进度和**精确续做步骤**。

## 已完成 ✅
- **词库 16,636 词 + 三维分类**(2026-07-26 升级):{word,ipa,meaning,pos,cefr,level,freq,sources[],topics[]}
  - 来源 sources: ielts4980/toefl6874/gre7406/cet4/cet6/kaoyan/gaokao/zhongkao/awl564
  - CEFR: A1-C2 真实难度带(按 COCA 词频); topics: 12 类雅思话题,2243 词有标签(从剑桥阅读提取)
  - 共享模块 `scripts/vocab_common.py`(两版 build 都 import,保证同 schema)
  - `scripts/build-topic-map.py`(48篇→话题词表 topic-map.json,可公开) + `content/wordlists/awl.txt`(570词头)
  - 本地增强版 vocab-bank.json 已 skip-worktree; 公开版 build-vocab-bank.py(ECDICT-only)产同 schema
- **复习库(DB Word 表)灌满**:75 → 5031 词,`scripts/seed-words-from-bank.ts` 从词库灌,tags 存三维分类
  (来源裸token + 话题 `t:` 前缀 + `cefr:` 前缀,可查询); queue.ts 支持 source/topic 筛选
- **界面加强(代码级)**:新增 `components/ui/{badge,skeleton,tooltip}.tsx`;词汇测试/结果/详情页硬编码
  green/red → success/warning/destructive 语义色;词汇首页加「按分类学习」入口(来源+话题 chips→
  /vocab/study?source=X|topic=Y,已端到端接通);详情页展示三维标签。tsc 0 错误,全路由 200 无 500。
- **剑桥13**:阅读 12 篇(c13-t1~t4-p1~p3)+ 听力 4 套(c13-t*-s4)+ 音频,全部答案对图核对 ✅
- **剑桥14 听力**:4 套(c14-t1~t4-s4)+ 音频,已入 `cambridge-listening.json`(共 8 套)✅
- **4 本书全部 OCR 完成**,缓存在 `~/.ielts-ocr-cache/c13..c16/`(每页 `pNN.txt`)。/tmp/cNN 也可能还在。

## 待完成 ⏳
1. ✅ **剑桥14 阅读 12 篇** — 已完成(2026-07-26),对图核对,tsc 通过
2. ✅ **剑桥15 阅读 12 + 听力 4** — 已完成(2026-07-26),对图核对,tsc 通过
3. ✅ **剑桥16 阅读 12 + 听力 4** — 已完成(2026-07-26),OCR文本为主源核对答案,tsc 通过
4. **重打包 + 推送 GitHub**(见"发布流程") ← 唯一剩余

## 现状(2026-07-26 收尾)
- **cambridge-reading.json**: 48 篇 / 640 题(剑13+14+15+16 各 12 篇),skip-worktree
- **cambridge-listening.json**: 16 套 / 160 题(剑13-16 各 4 套 Section4),skip-worktree
- **词库 vocab-bank.json**: 10000 词(4级各2500: 3000/5000/7000/8500 频带),skip-worktree
- **音频**: public/audio/listening/c1[3-6]-t*-s4.m4a 全在,已 gitignore(规则 `c1[3-6]-*.m4a`)
- **剑16 音频是真 MP3**(不是 m4a!),afconvert -f m4af -d aac 转码成 AAC-LC 再命名 .m4a(否则 MIME 不匹配可能不播);剑13-15 本就是 m4a 直接 cp
- 单篇 JSON 缓存: /tmp/c14-extract/、/tmp/c15-extract/(含 gold.json 答案基准 + verify.py 对拍脚本)

## 关键经验(踩坑记录,做剑16照用)
- **子 agent 粒度必须"单篇"(13-14题)**: 扛整个 test(40题)会在写 JSON 前耗尽 turn。prompt 必带硬约束「①一次并行 Read 所有页 ②读完立刻一次 Write ③禁止在回复里复述正文」。matching-headings 等超长选项篇失败率高,直接自己手写更快。
- **成功率约 50-75%**: 每批派完必查落地(`for f in ...; python3 -c load`),缺的重发或手写。
- **ynng 题型坑**: PoolQ.type 只有 tfng|mcq|gapfill,**没有 ynng**。YES/NO/NOT GIVEN 统一转 `mcq`+`options:["YES","NO","NOT GIVEN"]`(value 判分语义不变,合并前用脚本批量转)。
- **听力音频命名**: 剑15 音频在 `雅思真题音频/【15】Cambridge 15 audio/ielts15_testN_audioM.m4a`,audio4=Section4,直接 cp 成 c15-tN-s4.m4a(已是 m4a 无需转码)。前端音频 URL = `/audio/listening/{poolId}.m4a`,poolId 即听力集 id,**无需改任何代码**。
- **自检对拍**: 写 gold.json(每篇答案序列)+ verify.py。matching-heading 罗马数字型靠 options 索引反推字母/罗马数字对拍;matching-people 字母型直接字母对拍。craftsman hook 会拦单字母变量名,但文件已落地可直接跑。
- **⚠️ 图片/shell 通道会间歇性污染**: 读答案图/OCR 时偶发"幻觉描述"(如把桉树题读成珊瑚礁题)。判断可疑时,渲染高清图 + 温度归零重读,或用题目页语义交叉验证。听力答案务必和题目页逐题语义核对。

## 关键机制(照抄即可)
- **OCR 管线**(已验证):`pdftoppm -f N -l N -r 200 -png "$PDF" out; LC_ALL=en_US.UTF-8 tesseract - out --psm 6 < img.png`。坑:必须 200dpi、stdin 管道(避 /tmp 符号链接)、设 LC_ALL。
- **答案必须对图核对**:`pdftoppm -f <答案页> ... -png` 然后用 Read 工具读 PNG(OCR 答案网格会漏/串)。
- **导入格式**:阅读进 `cambridge-reading.json`,听力进 `cambridge-listening.json`(结构见现有条目)。matching/heading 题建模为 mcq(options=选项文本,answer=正确文本);IN EITHER ORDER 用 `accept` 备选。gapfill 的复数/拼写变体用 `accept`。
- **音频**:剑桥音频是**误标 .mp3 实为 m4a**,直接 `cp` 成 `public/audio/listening/c<书>-t<N>-s4.m4a`(别 afconvert,会报 !dat)。c14 路径 `Test N/Test N-4.mp3`;c13 路径 `TestN/TestN.Section4.mp3`(t4 是 Section5)。c15/c16 路径待查。
- **答案页位置**:每本书末 `Listening and Reading answer keys`,约 p117-126。听力/阅读交替。**按内容(topic)对应 test,不能只按页序**(剑13 踩过坑)。
- **pick.ts 自动读 JSON**,加完直接生效;`scripts/seed-real-content.ts` 把内容 seed 进练习模块 DB。

## C14 阅读答案(已核对,可直接用)
- T1 P1(1-13): creativity,rules,cities,traffic/crime(4&5任序),competition,evidence,life,TRUE,TRUE,NOT GIVEN,FALSE,TRUE
- T1 P2(14-26): E,C,F,C,A,B/D(19&20任序),D,activists,consumerism,leaflets,police
- T1 P3(27-40): E,D,B,D,C,YES,NO,NO,NOT GIVEN,restaurants,performance,turnover,goals,characteristics
- T2 P1(1-13): FALSE,TRUE,NOT GIVEN,FALSE,NOT GIVEN,TRUE,FALSE,TRUE,merchant,equipment,gifts,canoe,mountains
- T2 P2(14-26): F,C,E,D,B,design(s),pathogens,tuberculosis,wards,communal,public,miasmas,cholera
- T2 P3(27-40): vi,i,iii,ii,ix,vii,iv,viii,productive,perfectionists,dissatisfied,TRUE,FALSE,NOT GIVEN
- T3 P1(1-13): B,A,D,NOT GIVEN,NO,YES,B,C,B,A,A,C,A
- T3 P2(14-26): C,H,A,F,I,B,E,B/C(21&22任序),ecology,prey,habitats,antibiotics
- T3 P3(27-40): B,G,F,E,C,NO,YES,NOT GIVEN,NO,YES,encouraging,desire,autonomy,targeted
- T4 P1(1-13): four/4,young,food,light,aggressively,neurons,location,chemicals,FALSE,TRUE,FALSE,NOT GIVEN,TRUE
- T4 P2(14-26): B,E,C,A,TRUE,TRUE,NOT GIVEN,FALSE,NOT GIVEN,B/D(23&24任序),B/E(25&26任序)
- T4 P3(27-40): B,NOT GIVEN,FALSE,TRUE,FALSE,TRUE,NOT GIVEN,large,microplastic,populations,concentrations,predators,disasters,A
- C14 阅读正文起始页(在 ~/.ielts-ocr-cache/c14/): T1=p16/17,p20-21,p25-26; T2=p32-49; T3=p59-68; T4=p82-92(READING PASSAGE 标记页)

## 发布流程(版权安全!仓库是 PUBLIC)
1. 本地保留全部真实内容(vocab-bank/cambridge-*.json 已 skip-worktree)
2. 提交前:临时 `git update-index --no-skip-worktree` 三个 json → 写空 stub `[]`(cambridge-*)/跑 build-vocab-bank.py(ECDICT-only 10k)→ commit → 恢复真实内容 → 重新 skip-worktree
3. 剑桥音频 c1[3-6]-*.m4a 已 gitignore,VOA 音频可传
4. `资料/` `*.mdx` `*.mdd` `dist/` 已 gitignore
5. 重打包:`next build` → `sh scripts/build-standalone-app.sh`(会跑 seed-real-content.ts 把真实内容装进 .app 模板库)→ `sh scripts/build-dmg.sh`
6. 验证:`git clone` 远程确认无剑桥音频/文本泄漏
- GitHub: https://github.com/xiyusssd/ielts-study (main)

## 环境
- node: `~/.local/node22/bin`(系统 node 不能用)。启动 dev: 见 /tmp/run-dev.sh 模式(nohup 分离子 shell,DATABASE_URL 用绝对路径)
- tesseract/lzo 已装(brew);readmdict+python-lzo 已装
- 测试账号: test@test.com / test1234;Playwright 用系统 Chrome(channel="chrome")
