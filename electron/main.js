// Electron 主进程：只做窗口壳 + 权限。
// Prisma 原生引擎完全隔离在 spawn 出的 node22 子进程（server.js）里，主进程绝不 require @prisma/client。
"use strict";

const { app, BrowserWindow, session, systemPreferences, dialog, Notification } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const net = require("net");
const http = require("http");
const crypto = require("crypto");
const { initDatabase, buildEnv } = require("./db-init");

let serverProc = null;
let mainWindow = null;

// 路径解析：prod 资源在 asar 外的 process.resourcesPath；dev 指向仓库根
const isPacked = app.isPackaged;
function resPath(...p) {
  return isPacked ? path.join(process.resourcesPath, ...p) : path.join(__dirname, "..", ...p);
}
const NODE_BIN = isPacked
  ? path.join(process.resourcesPath, "node")
  : path.join(process.env.HOME || "", ".local/node22/bin/node");
const APP_DIR = isPacked ? resPath("app") : resPath(".next", "standalone"); // standalone 根（含 server.js）
const TEMPLATE_DB = isPacked ? resPath("template.db") : resPath("build", "template.db");
const DATA_DIR = path.join(app.getPath("appData"), "雅思学习助手");
const LOG_FILE = path.join(DATA_DIR, "launcher.log");

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch {
    /* DATA_DIR 尚未建时忽略 */
  }
  process.stdout.write(line);
}

// 本次启动的实例指纹：注入 server 环境，再由 /api/health 回显，
// 用于确认应答者就是自己 spawn 的 server 而非同端口的外部服务。
const INSTANCE_ID = crypto.randomBytes(12).toString("hex");

// 取值域避开 3000 等公共端口：dev server、Docker 端口映射都爱占 3000，
// 而通配监听（*:3000）会兜住发往 127.0.0.1 的连接，造成"探测空闲但实际被冒充"。
const PORT_RANGE = { start: 43110, max: 43140 };

const canBind = (port, host) =>
  new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => srv.close(() => resolve(false)));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(port, host);
  });

const nobodyListening = (port, host) =>
  new Promise((resolve) => {
    const sock = net.connect({ port, host });
    const done = (free) => {
      sock.destroy();
      resolve(free);
    };
    sock.setTimeout(600);
    sock.once("connect", () => done(false));
    sock.once("error", () => done(true));
    sock.once("timeout", () => done(true));
  });

// 单靠 bind 探测不可信：SO_REUSEADDR 下更具体地址能绑在通配监听之上。
// 因此三项全过才算可独占：能绑通配地址，且 v4/v6 回环都没人应答。
async function probeFree(port) {
  return (
    (await canBind(port, "0.0.0.0")) &&
    (await nobodyListening(port, "127.0.0.1")) &&
    (await nobodyListening(port, "::1"))
  );
}

async function findPort({ start, max } = PORT_RANGE) {
  for (let port = start; port <= max; port++) {
    if (await probeFree(port)) return port;
  }
  throw new Error(`端口 ${start}-${max} 全被占`);
}

// 轮询 /api/health，直到应答者自证是本次启动的实例。
// 只认 ok 是不够的：同端口的其他服务同样会返回 ok，窗口就会加载别人的库。
function waitHealth(port, tries = 30) {
  return new Promise((resolve, reject) => {
    let n = 0;
    let impostor = null;
    const ping = () => {
      http
        .get({ host: "127.0.0.1", port, path: "/api/health", timeout: 2000 }, (res) => {
          let body = "";
          res.on("data", (d) => (body += d));
          res.on("end", () => {
            try {
              const j = JSON.parse(body);
              if (j.ok && j.instanceId === INSTANCE_ID) return resolve();
              if (j.ok) impostor = j.instanceId ? `instanceId=${j.instanceId}` : "无 instanceId 字段";
            } catch {
              /* 未就绪 */
            }
            retry();
          });
        })
        .on("error", retry)
        .on("timeout", function () {
          this.destroy();
          retry();
        });
    };
    const retry = () => {
      if (++n >= tries) {
        return reject(
          new Error(
            impostor
              ? `端口 ${port} 被其他服务占用（${impostor}），本机可能已有服务监听该端口`
              : "server 健康检查超时",
          ),
        );
      }
      setTimeout(ping, 1000);
    };
    ping();
  });
}

async function start() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  log("----- 启动 -----");
  initDatabase({ dataDir: DATA_DIR, templateDb: TEMPLATE_DB, log });

  const port = await findPort();
  log(`PORT: ${port} (instance ${INSTANCE_ID})`);
  const env = buildEnv({ dataDir: DATA_DIR, port, instanceId: INSTANCE_ID, log });

  // node22 可执行位兜底
  try {
    fs.chmodSync(NODE_BIN, 0o755);
  } catch {
    /* 忽略 */
  }

  log(`spawn ${NODE_BIN} server.js (cwd=${APP_DIR})`);
  serverProc = spawn(NODE_BIN, ["server.js"], { cwd: APP_DIR, env, stdio: ["ignore", "pipe", "pipe"] });
  serverProc.stdout.on("data", (d) => log("[server] " + d.toString().trim()));
  serverProc.stderr.on("data", (d) => log("[server:err] " + d.toString().trim()));
  serverProc.on("exit", (code) => log(`server 退出 code=${code}`));

  await waitHealth(port);
  log("ready, 加载窗口");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    title: "雅思学习助手",
    backgroundColor: "#ffffff",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // 本地 server 每次启动都是新实例，禁用磁盘缓存避免旧 chunk 残留
      partition: "persist:app",
    },
  });
  // 禁用 HTTP 缓存：本地 server 无需缓存，彻底杜绝旧 Server Action ID 问题
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, cb) => {
    const headers = { ...details.responseHeaders };
    headers["Cache-Control"] = ["no-store, no-cache, must-revalidate"];
    headers["Pragma"] = ["no-cache"];
    cb({ responseHeaders: headers });
  });
  mainWindow.loadURL(`http://127.0.0.1:${port}`);
  mainWindow.on("closed", () => (mainWindow = null));
}

app.whenReady().then(async () => {
  // 放行麦克风（口语录音）：网页 getUserMedia 权限 + 系统 TCC 授权
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(perm === "media"));
  try {
    await systemPreferences.askForMediaAccess("microphone");
  } catch {
    /* 非 mac 或不支持时忽略 */
  }

  // 清除 Chromium HTTP 缓存 + Service Worker，防止旧 build 的 JS chunk
  // 残留导致 "Failed to find Server Action" 错误。
  // 本地 server 每次启动都是全新实例，缓存无价值。
  try {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({
      storages: ["serviceworkers", "cachestorage"],
    });
    log("已清除 HTTP 缓存和 Service Worker");
  } catch (e) {
    log("清缓存失败（非致命）: " + e.message);
  }

  start().catch((e) => {
    log("启动失败: " + (e && e.stack ? e.stack : e));
    dialog.showErrorBox("启动失败", `${e}\n\n日志：${LOG_FILE}`);
    app.quit();
  });
});

app.on("before-quit", () => {
  if (serverProc) {
    serverProc.kill();
    serverProc = null;
  }
});
app.on("window-all-closed", () => app.quit());
