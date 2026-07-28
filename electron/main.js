// Electron 主进程：只做窗口壳 + 权限。
// Prisma 原生引擎完全隔离在 spawn 出的 node22 子进程（server.js）里，主进程绝不 require @prisma/client。
"use strict";

const { app, BrowserWindow, session, systemPreferences, dialog, Notification } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const net = require("net");
const http = require("http");
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

// 探测 3000-3020 首个空闲端口
function findPort(start = 3000, max = 3020) {
  return new Promise((resolve, reject) => {
    let port = start;
    const tryPort = () => {
      const srv = net.createServer();
      srv.once("error", () => {
        srv.close();
        if (++port > max) reject(new Error("端口 3000-3020 全被占"));
        else tryPort();
      });
      srv.once("listening", () => srv.close(() => resolve(port)));
      srv.listen(port, "127.0.0.1");
    };
    tryPort();
  });
}

// 轮询 /api/health 直到 ok
function waitHealth(port, tries = 30) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const ping = () => {
      http
        .get({ host: "127.0.0.1", port, path: "/api/health", timeout: 2000 }, (res) => {
          let body = "";
          res.on("data", (d) => (body += d));
          res.on("end", () => {
            try {
              if (JSON.parse(body).ok) return resolve();
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
      if (++n >= tries) return reject(new Error("server 健康检查超时"));
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
  log(`PORT: ${port}`);
  const env = buildEnv({ dataDir: DATA_DIR, port, log });

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
    webPreferences: { contextIsolation: true, nodeIntegration: false },
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
