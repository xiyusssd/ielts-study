# ⭐⭐⭐ 最新状态(2026-07-31) · 修「端口冒充」致内容缺失 · 已重打包并装到 /Applications · 已全部 commit(未 push)

**用户报「app 内容有问题/数据缺失」,根因不在业务代码,是启动器的端口与身份校验缺陷。**

**失效链**(两个缺陷叠加):

1. `electron/main.js` 的 `findPort` 从 **3000** 起探,而本机 OrbStack 的 Docker 容器 `ielts-app-1` 常驻 `*:3000`(独立空库,**仅 75 词**)。
2. Node 默认开 `SO_REUSEADDR`,BSD 语义下**允许在别人已占通配 `*:3000` 之上再绑更具体的 `127.0.0.1:3000`** → 旧探测误判「空闲」。
3. 致命的一环:`waitHealth` **只验 `{ok:true}`,不验应答者是谁**。自己的 server 启动慢/崩溃/抢不到端口时,同端口的 Docker 实例会把 health 应答顶上去,窗口于是加载了**别人的 75 词库**。

`localhost` 在本机优先解析 `::1`,Docker 同时监听 `[::]:3000`,而 app 只绑 v4 → 用 `localhost:3000` 访问必然打到 Docker。**14 个 smoke 脚本的 `BASE` 全默认 `localhost:3000`,所以此前冒烟一直在测 Docker,掩盖了问题。**

**本轮修复**(4 处,commit `1089469`):

- `electron/main.js`:
  - 端口区间 `3000-3020` → **`43110-43140`**,离开公共争用区。
  - `findPort` 改为 `probeFree` 三项全过才算可独占:能绑 `0.0.0.0` + v4 回环无人应答 + v6 回环无人应答(单靠 bind 探测不可信)。
  - 新增每次启动随机 `INSTANCE_ID`,`waitHealth` 只在 `instanceId` 匹配时才放行;不匹配时报明确错误(端口被其他服务占用),不再静默加载别人的库。
- `electron/db-init.js`:`buildEnv` 注入 `APP_INSTANCE_ID`,**排在用户 `.env` 覆盖之后**,不接受篡改。
- `app/api/health/route.ts`:回显 `instanceId`(非打包运行时为 `undefined`)。
- `scripts/*.mjs`(14 个):`BASE` 默认 `localhost:3000` → **`127.0.0.1:3000`**,消除 IPv6 歧义;两个硬编码的也改为可用 `BASE=` 覆盖。

**验证**:

- 端口探测单测:对 3000 现在判「被占」(旧逻辑判「空闲」),对 43110 判「空闲」。
- tsc 0 错误;`electron/main.js` 无 lint。
- 脱离仓库(`/tmp`)跑打包产物:health 回显注入的 `instanceId`、`words:5031`;`/login`、`/reading/cambridge~c11-t1-p1`、`/listening/cambridge~c13-t1-s4`、音频、CSS、JS chunk 全 200。asar 内确认含新逻辑(`INSTANCE_ID`/`probeFree`/`43110`)。
- 实机:`/Applications` 版本启动落在 **43110**,`instanceId` 匹配,launcher.log 干净。8 条路由(`/`、`/login`、reading、listening、`/vocab`、`/writing`、`/speaking/part1`、`/assessment`)全 200。
- **LIVE 库零损失**:112 Passage / 1318 Question / 5031 Word / 168 Attempt / 50 VocabProgress / 3 User / 7 Assessment,与启动前备份逐项一致,悬空外键 0。备份留在 `data.db.bak-20260731-204807`。

**安装与清理**:新包已装到 `/Applications/雅思学习助手.app`(675M,已去 quarantine);按用户授权删除了 `dist/`(含旧 `雅思学习助手-1.0.0.dmg` 与旧 .app);现存唯一产物 `dist-electron/雅思学习助手-0.1.0-arm64.dmg`(339M)。

**续:Docker 容器移出 3000**(`docker-compose.yml`,同 commit `1089469`):

该容器**不是孤儿**,出自本仓库被追踪的 `docker-compose.yml`(v1.0 起就在),是项目正规的 Docker 部署路径,因此没有删除,只挪端口。app 迁到 43110 后,3000 的争用方变成「容器 vs `dev.sh` 的 next dev + 14 个 smoke 脚本」,而 3000 是项目声明的 dev 端口,所以让容器让位:

- 宿主端口 `3000:3000` → **`${APP_HOST_PORT:-3100}:3000`**(容器内仍是 3000,healthcheck 不用改)。
- `NEXT_PUBLIC_APP_URL` 改读**独立变量 `APP_PUBLIC_URL`**:原先复用同名变量,会被 `.env` 里给本机 dev 用的 `http://localhost:3000` 盖掉,导致容器自认在 3000 而实际映射在 3100。
- 新增顶层 **`name: ielts`**:目录名 `雅思` 是非 ASCII,compose 从目录推导的项目名为空串,**任何 `docker compose` 命令在此目录都直接报 `project name must not be empty`**(所以当初只能靠 `-p ielts` 手动指定)。取值与既有容器的 `com.docker.compose.project` 标签一致,确保接管的是同一套容器和 `ielts_app-data` 卷。

**验证**:`docker compose config` 通过,解析出 `published:3100` / `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3100`;`docker compose up -d --no-build` 重建后 healthy;**`prod.db` md5 前后一致(`a39775bf7790716a0c2da56496b9c5f8`,278528 字节),卷数据未动**;3000 现已完全腾空(v4/v6/通配三向 bind 全部成功),容器在 3100 的 v4/v6 都正常应答(7 users / 75 words);app 不受影响(43110,uptime 未中断,5031 words)。

访问方式变化:容器实例从 `localhost:3000` 改为 **`127.0.0.1:3100`**。要改回或另选端口,设 `APP_HOST_PORT` 即可(单一旋钮,URL 会跟着变)。

**⚠️ 教训**:后台跑打包不要用 `nohup ... &` 配合极短的前台等待——后台 shell 被回收会带走子进程(本轮第一次打包就这样断在 build 阶段)。直接前台跑并给足超时。

## 本轮 commit 清单(`d0ab358` 之后,全部未 push)

按主题切开,时间正序:

| commit | 主题 |
| --- | --- |
| `1089469` | 启动器身份指纹校验 + 端口迁至 43110 + Docker 让出 3000(本段主体) |
| `691e1ea` | `.gitignore` 补 `template.db` 时间戳备份与 `.claude/`;删根目录误放的 `main.js` 副本 |
| `43f3095` | 内容主键改为自然键推导的确定性 id,入库出口收拢到 `lib/content/write.ts` |
| `df68bb3` | AI 层收拢 JSON 解析与错误翻译,收紧超时;新增 `/api/tts` |
| `57517f3` | 视觉基线微调 + 侧栏可折叠 |
| `e0db3ad` | 精听/拼写判分与提示节奏;抽出逐词 diff、答题横线、完成页三处共用件 |
| `538d849` | 换包/重建库后的陈旧客户端状态自愈(SW/caches/session);认证表单补 `method="post"` |
| `363f9bb` | 口语朗读走 `/api/tts` 真人音并静默降级;实时链路补超时 |
| `6dc3cde` | 打包每次重建 `.next`;`extraResources` 收窄 `prisma` 并补 `content`;补 `metadataBase` |

**遗留待办**(按优先级):

1. **未 push**:本地 `main` 领先 `origin/main` 17 个 commit,且未设上游跟踪。远端是 `github.com/xiyusssd/ielts-study`。
2. **`prisma/schema.prisma` 第 15 行仍是 `@default(cuid())`**。实际写入全走 `lib/content/id.ts` 的 `contentId`,所以不出问题,但 schema 与真实约定不一致 —— 绕过 `write.ts` 直接用 Prisma 建内容行就会退回随机 id。
3. **`extraResources` 的 `from: content` 会打包整个目录**。本机 `content/cambridge-pdfs/`、`content/audio/` 为空,但这两处是版权材料目录 —— 在它们非空的机器上打包会把版权内容装进分发包。
4. **`app/layout.tsx` 的 `metadataBase` 兜底值是 `http://localhost:3000`**。Electron 下 `buildEnv` 会注入实际端口,不受影响;但这是本仓库仅剩的 `localhost` 硬编码兜底。
5. **已装包与 HEAD 的唯一差异是 `method="post"`**。`538d849`/`363f9bb`/`6dc3cde` 虽然在装机之后才 commit,但那些改动打包时已在工作区,所以包内**已含** `voiceReady`、SW 自愈、`content/` 与 `probeFree`(逐项 grep 产物确认)。只有认证表单的 `method="post"` 兜底是装机之后才写的,包内没有。它只在 JS 未 hydrate 时才起作用,不影响正常使用。

---

# ⭐⭐⭐ 最新状态(2026-07-28 续3) · Electron 独立窗口打包完成 · 已 commit(未 push)

**本轮完成并已提交(未 push)**:

- **Electron 独立窗口版**(commit `8e533b5` + `2969066`),与现有浏览器版 .app **并存**,只做 macOS arm64。
  - 架构:Electron 主进程只做窗口壳,spawn 内嵌 node22 跑 standalone `server.js`,**Prisma 原生引擎完全隔离在子进程,绕过 macOS Library Validation**。等 `/api/health` 就绪后 `BrowserWindow.loadURL(127.0.0.1:PORT)`。主进程放行麦克风(setPermissionRequestHandler + askForMediaAccess)。
  - 文件:`electron/main.js`(窗口/端口/health/spawn/权限/退出清理)、`electron/db-init.js`(移植 launcher 的 DB 初始化/内容指纹同步/schema 补列/buildEnv,sqlite 走系统 /usr/bin/sqlite3,零原生依赖)、`electron/after-pack.js`、`electron-builder.yml`、`build/entitlements.mac.plist`、`scripts/build-electron-app.sh`。package.json 加 main + electron:dev/build + devDeps(electron@43.2.0 / electron-builder@26.15.3)。
  - **关键坑已修**(afterPack):electron-builder 把 standalone 的 node_modules 收进 app.asar,而 node22 无法从 asar require → 打包产物 `Cannot find module 'next'`。dev 态/仓库内测试会**假性通过**(node 向上遍历找到仓库根 node_modules),**必须拷到 /tmp 脱离仓库验证**。afterPack hook 用 cp -R 把 standalone node_modules 复制到 Resources/app/node_modules(与 server.js 同级)修复。
  - **验证**:dev 态 `electron .` 弹窗+加载+server Ready+退出清理子进程无残留;打包产物拷到 /tmp 脱离仓库,`node server.js`→`/api/health` 返回 `{ok:true,db.words:5031,text:true}`,prisma 引擎正常。tsc 0 错误。
  - 产物:`dist-electron/雅思学习助手-0.1.0-arm64.dmg`(**456M**,gitignore)。未签名/未公证(本地自用,右键打开)。
  - **⚠️ 待优化**:app.asar 含 ~303M 冗余 node_modules(electron-builder 按 package.json dependencies 自动收集,主进程其实用不到),让 dmg 偏大。后续可通过 files/dependencies 调整瘦身(不影响功能)。
  - 打包命令:`pnpm electron:build`(或 `./scripts/build-electron-app.sh`);dev 自测 `pnpm electron:dev`。
  - **asar 瘦身**(commit `cf000b5`):electron-builder 默认按 package.json dependencies 把 ~289M 生产依赖打进 app.asar(主进程用不到,server 用的已由 afterPack 单独放 Resources/app/node_modules)。electron-builder.yml 的 `files` 加 `!node_modules/**/*` 排除 → app.asar 289M→14K,**dmg 456M→339M**。
  - **⚠️⚠️ CSS 404 / UI 裸奔坑(务必牢记)**:打包出的 .app 若整体样式丢失,是因为 **dev server(dev.sh 的 next dev --turbopack)一直在跑,持续用 dev 产物污染 `.next`**;打包时 HTML 引用 dev 路径 `/_next/static/css/app/layout.css` 但磁盘是 production hash 文件 `xxx.css` → CSS 404。**打包前铁律:先 `pkill next dev` 杀净所有 next 进程 → `rm -rf .next` → 干净 `next build` → 再打包**。验证:curl `/login` 的 CSS 引用应是 hash 文件名且状态 200(非 `app/layout.css`)。
  - ⚠️ **pkill 教训**:`pkill -f "next dev"` 模式过宽会误杀其他项目的 dev server(本次误杀了「网页版生图」项目的两个)。杀进程用更精确的路径匹配。

**本地所有 commit(未 push)**:`1ab584a` 写作扩充+句子拼写四项 → `c0f9d33` HANDOFF → `c1ffc70` 句子完成页 bug → `8e533b5` Electron → `2969066` afterPack 修复。push 须走版权 stub 流程。

---

# ⭐⭐⭐ 最新状态(2026-07-28 续) · 写作扩充 + 句子拼写四项加强 · 已 commit 1ab584a(未 push)

**本轮完成并已提交(commit `1ab584a`,23 文件 +639/-125,未 push)**:

1. **写作范文/模板扩充**(`lib/writing/seed-templates.ts` + `writing/samples/page.tsx`):
   - 模板库 8→**24 条**:补 T1 流程图引言/步骤段、地图变化段、饼图占比段、同期比较段;T2 利弊/问题解决/双问题三种引言、原因分析段、解决方案段、第二种结论;新增「高级衔接词替换表」+「低分词→高分词替换表」。category 沿用现有枚举自动归 tab。
   - 范文库 3→**9 篇**:`SampleEssay` 加 `task` 字段;新增 T2 利弊/问题解决/双问题(band 7/8/7)+ T1 柱状(b7)/折线(b8)/流程图(b7),每篇原创正文+分段点评。范文页改**按 Task 1/Task 2 分组**,组内按 band 排序。
   - ⚠️ 全原创,题目用通用改写题,**不触版权**,可正常入库。
2. **句子拼写四项加强**(`components/vocab/sentence-card.tsx` + `lib/ai/content-gen.ts` + `api/vocab/gen-sentence/route.ts`):
   - **修逐词判分错位**(真实缺陷):`wordDiff` 从按索引对齐改为 **LCS 最长公共子序列对齐**,漏词/多词只标真正错的词,不再连锁满屏红。已独立跑用例验证。
   - **提示台阶**:「提示下一词」逐个揭示 +「看首字母」骨架(`c__`);用过提示的答对降级为 FSRS grade 1、不计连击。
   - **错题重练+统计**:完成页显示 答对率/最高连击/答错数;「只练错题」按钮用错题重开一轮;顶栏连击≥2 实时显示火苗。
   - **AI 例句可降难度**:`generateExampleSentence` 加 `easy`(5-10 词 A2-B1 口语)/`standard`(雅思 6-7) 档,接口透传,组件顶栏可切「简单/标准」。
3. **修过时冒烟断言**:`smoke-vocab-modes` 找旧文案「拼写模式」→改为「单词拼写」(模式早已重命名,非功能回归)。

**验证**:tsc 0 错误;**9/9 冒烟全绿**(routes/vocab/vocab-modes/vocab-review/detail/assessment/audio/manual/reassess)。dev(3000) 健康;app(3001) 未起(本轮只做网页端)。

**待续**(优先级从高到低):
- [ ] **句子拼写浏览器实测**:上面四项交互(提示揭示/错题重练/难度切换/连击/换AI句)代码+类型全通,但真实点击效果需登录后进 `/vocab/study?mode=sentence` 试(测试账号 test@example.com/test1234 有 2 个带例句到期词)。
- [ ] **Electron 独立窗口**(用户已选 Electron,tasks 未动):主进程 spawn 打包内 node22 跑 server.js→等 health→BrowserWindow 加载 localhost;electron-builder 打包,体积 +~150MB。关键坑:Prisma 原生引擎用 spawn 子进程跑(别在 Electron 主进程 require)。
- [ ] **重打包 .app** 同步本轮写作+句子拼写改动(+ Electron)。
- [ ] push:仓库 public,须走版权 stub 流程(三个 skip-worktree JSON 置空→commit→恢复→clone 验证)。本次仅 commit 未 push。

---

# ⭐⭐⭐ 最新状态(2026-07-28) · UI升级 + 听力重构 + airouter文本 + 词书锁定 + 句子拼写 + 换AI句

**本轮完成(全部本地,未提交)**:

1. **UI 升级**:Sora 展示字体(`app/layout.tsx` next/font)+ tabular 数字 + 分层阴影 + 页面底色微染 + 侧栏渐变竖条。改 `globals.css`/`tailwind.config.ts`/`card.tsx`/`sidebar.tsx`/首页。
2. **听力页重构**:`app/(dashboard)/listening/page.tsx` 从"32 卡按钮墙"改为按剑桥册/VOA/内置**分组紧凑列表**,整行可点=做题,小耳朵=精听。修了 "Section undefined" 老 bug。
3. **airouter 文本接入**:文本能力(写作/口语批改)走 airouter,语音仍走官方 OpenAI。
   - `lib/env.ts` 加 `OPENAI_TEXT_API_KEY/_BASE_URL`(留空回落通用);`lib/ai/providers/openai.ts` 加 `getTextClient()` + `extractJSON()` 兜底(Claude 系不强制 schema)。
   - `.env` 已填:airouter=`https://airouter.linkof.link/v1` model=`gpt-5.6-sol`。语音三能力因没填官方 key 显示未启用(正常)。
4. **词书锁定(持久)**:`Profile.vocabBook` 字段(已 db push + build 脚本 add_col)。词汇页"学习词书"卡片可锁定,今日队列新词只从该书抽。`BookPicker` 组件 + `saveVocabBook` action + `VOCAB_BOOKS` 常量。
5. **句子拼写**:词汇第三种模式(翻卡/单词拼写/句子拼写循环切换)。`SentenceCard` 组件:看中文↔纯听写可切、整句输入、宽松判分(去标点/大小写)+ 逐词 diff。用词自带例句。
6. **换 AI 句(新,⚠️ 仅网页端,未进 .app)**:句子拼写里"换 AI 句"按钮现场生成新例句(走 airouter)。`generateExampleSentence`(`lib/ai/content-gen.ts`,已做键名归一化兜底)+ `app/api/vocab/gen-sentence/route.ts`(登录+限流+providerReady门)。已直连实测生成成功。

**同步状态**:
- 1-5 已进 **.app**(最后重打包 16:30,402M,在 `dist/雅思学习助手.app`)。**.app 页面 500 老坑已根治**(是反复重启攒的 7 个僵尸 dev 进程污染 `.next`,已清零;打包务必先杀净 next 进程再独占 build)。
- **6(换AI句)仅在网页端**,要进 .app 需再重打包一次。

**晚上待续**:
- [ ] 网页端 UI 实测"换 AI 句"(白天测试账号今日队列空,只做了直连验证;需有新词/复习词时进句子拼写点按钮看效果)
- [ ] **Electron 独立窗口**(用户选了 Electron 跨平台,tasks 未动):electron 主进程 spawn 打包内 node22 跑 server.js→等 health→BrowserWindow 加载 localhost;electron-builder 打包;体积会 +~150MB。Rust/swiftc/Xcode CLT 都在但选了 Electron。关键坑:Prisma 原生引擎用 spawn 子进程跑(别在 Electron 主进程 require)。
- [ ] 全做完再重打包 .app 同步 6 + Electron

**两端现状**:dev 网页 3000 / .app 3001,都健康。改动全未 commit。node 走 `~/.local/node22/bin`,dev 用 `./scripts/dev.sh`。

---

# ⭐⭐⭐ 最新状态(2026-07-27) · 剑11+剑12 阅读 24 篇全部完成

**本轮完成(内容在本地 skip-worktree,未提交/未 push)**:
- 修复 OCR 双栏交错根因:`scripts/ocr-cols.sh` 按左右栏裁剪分别 OCR(左 0..W/2+8,右 W/2+13..W;tesseract 走 stdin 管道)。清理 `scripts/clean-col-ocr.py`;合并 `scripts/merge-c1112-reading.mjs`。
- **剑11+剑12 阅读全 24 篇落地**,合并进 `lib/assessment/data/cambridge-reading.json`(48→**72 篇**,c11×12 + c12×12,c12 源=剑12 Test5-8→t1-4)。
- 正文用按栏 OCR(问题页/全宽段落匹配页用整页 OCR),答案**逐题对真实题目页核验**,修正 HANDOFF 答案表 4+ 处错误(t3-p1 漏 wool、t3-p2 Q20=C、c12-t2-p2 Para C=viii、c12-t3-p2 Q14-19 多插 C 等)。
- ⚠️ **关键教训**:c12-t3-p1 曾因页码错位凭记忆臆造整篇(题型全错),读到真实 p59-62 后完全重写。**务必先读真实题目页再落地,不可照抄答案表或凭记忆**。
- 同步网页:`prisma/dev.db` 重 seed(reading 80 篇);`next build` 通过(standalone 内嵌 72 篇);tsc 0 错误;smoke-detail + smoke-assessment 全绿。
- 同步 App:`.app`(72篇)+ `.dmg`(235M,18:12)已重打包,template.db 80 篇。
- 24 篇 JSON 备份在 `content/parsed/c1112-reading/`(gitignore,防 /tmp 清空)。
- ⚠️ 未 push:仓库 PUBLIC,cambridge-reading.json 靠 skip-worktree 不会被提交;要 push 须走版权 stub 流程(见下"版权安全")。已提交项仅工具脚本+HANDOFF(无版权正文)。

---

# 最新状态(2026-07-26 晚)

**本轮全部完成并已提交(commit 4615ac7,未 push)**:
1. 评估:修复重测清零 bug + 每模块可重测 + 手动填分跳过测试(/assessment/manual)
2. 词汇:每日新词/复习量可配置(首页+计划页)+ 拼写模式(翻卡/拼写切换)+ 逐词回顾(测完显示单词释义)
3. 单词发音:Piper 开源 TTS + LJSpeech 公有领域音色,5031词+75例句 m4a(零版权,可上架)。播放优先本地音频降级浏览器TTS
- 全套回归通过(TSC + 9冒烟)。.app(399M,含音频)+ .dmg(226M) 已重打包同步。

## 明天怎么用
- **桌面 App**:双击 `dist/雅思学习助手.app`(或装 dmg)。首启从 template 初始化,自动补 schema 列/同步内容。跑在 127.0.0.1:3001。
- **网页端开发**:`cd /Users/xiyu/Desktop/ai/雅思 && ./scripts/dev.sh` → http://localhost:3000。**必须用这个脚本**(系统 node 加载不了 prisma,见 memory)。
- 测试账号(网页端 dev.db):`test@example.com` / `test1234`。桌面端是 `xiyu@qq.com`。
- **重跑冒烟**:`~/.local/node22/bin/node scripts/smoke-<名>.mjs`(需 dev server 先起)。冒烟脚本:routes/vocab/audio/vocab-modes/vocab-review/manual/reassess/detail/assessment。
- **重生成发音**(换机/新词):`python3 scripts/gen-word-audio.py`(需 `pip install piper-tts` + 模型 `~/.local/share/piper-voices/ljspeech.onnx`)。音频不进 git。
- **AI 功能(写作批改/口语)**:App 未配 key(providers 全 false),要用在 `~/Library/Application Support/雅思学习助手/.env` 填 OPENAI_API_KEY。
- ⚠️ 想推 GitHub:仓库 public,先走版权安全流程(cambridge/vocab-bank 三个 skip-worktree 文件),我没 push,等你发话。

---

# 进度缓存 · 剑11+12 扩充(历史任务,阅读扩充未做完)

> 本轮任务:扩充剑桥11+12 真题(阅读24篇+听力8套),修打包遗留缺陷。
> 记录到 2026-07-26,含**精确续做步骤**。只信工具真实返回值,别信 agent 谎报。

## 本轮已完成 ✅
1. **打包脚本修复**(已 commit 6f2653e,本地):
   - build-dmg.sh: .app 缺失时改调 build-standalone-app.sh(原引用过时的 build-macos-app.sh)
   - build-standalone-app.sh: 健全性检查用 require.resolve 动态定位 @prisma/client(移除硬编码 pnpm 版本路径)
   - ⚠️ **commit 6f2653e 还没 push**(GitHub 443 超时)。前两个 commit ff15bd7/464f798 已 push。
2. **听力扩充完成**:cambridge-listening.json 16→**24 套**(剑11-16 全覆盖)。
   - 脚本 `add-c1112-listening.py`(题干+答案内联,可重跑,幂等)⚠️ **已移出版本控制**,副本在 `content/parsed/copyright-scripts/`(gitignore)。绝不入库(见文末版权安全)。
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
4. 脚本提交:只提交 `scripts/ocr-book.sh` 等**通用工具**(无内联版权)。
   ⚠️ **剑桥内容脚本(build-cambridge-reading*/add-c1[124]*-listening)绝不入库** —— 它们内联了剑桥题干+答案,等同版权正文。副本留 `content/parsed/copyright-scripts/`(gitignore)。
   ⚠️ 音频:c1[1-6]-*.m4a 已 gitignore(第62行),**绝不提交剑桥音频**。
5. 发布流程走版权替换(见下),重打包 .app/.dmg

## ⚠️ 版权安全(仓库PUBLIC,照旧)
- **2026-07-27 历史清理**:发现 build-cambridge-reading*/add-c1[124]*-listening 六脚本把剑桥题干+答案内联入库(剑13-16阅读+剑14听力已 push,剑11/12听力待 push)。已用 `git filter-repo --invert-paths` 从**全历史**移除并 force-push 覆盖 public 远程(464f798→a710278),clone 净检无泄漏。副本留 `content/parsed/copyright-scripts/`(gitignore)。备份:`/tmp/ielts-full-*.bundle` + `/tmp/ielts-git-backup-*`。
- **红线扩展**:不止"正文全文",**题干+答案也算版权**,任何载体(json/py/mjs)都不得入库。
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
