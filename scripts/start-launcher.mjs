import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { stdin as input, stdout as output } from "node:process";
import readline from "node:readline/promises";

const ROOT = process.cwd();
const DEFAULT_PORT = 3050;
const MAX_PORT = 3090;
const IS_DRY_RUN = process.argv.includes("--dry-run");
const NEXT_BIN = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

function checkPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}

async function findFreePort(startPort = DEFAULT_PORT, maxPort = MAX_PORT) {
  for (let port = startPort; port <= maxPort; port += 1) {
    if (await checkPortFree(port)) {
      return port;
    }
  }
  return startPort;
}

function runNpmSync(args) {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmCmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return result.status ?? 1;
}

function runCommandSync(cmd, args, useShell = false) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: useShell,
  });
  return result.status ?? 1;
}

function openBrowserWhenReady(url) {
  const openUrl = () => {
    if (process.platform === "win32") {
      const child = spawn("cmd.exe", ["/c", "start", "", url], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
    } else if (process.platform === "darwin") {
      const child = spawn("open", [url], { detached: true, stdio: "ignore" });
      child.unref();
    } else {
      const child = spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
      child.unref();
    }
  };

  const deadline = Date.now() + 25_000;
  const poll = async () => {
    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${url}/api/health`);
        if (res.ok) {
          openUrl();
          return;
        }
      } catch {
        // Server is still booting; retry shortly.
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    openUrl();
  };

  void poll();
}

function runNextServer(mode, port) {
  const url = `http://localhost:${port}`;
  console.log(`\nЗапускаю сервер (${mode}) на ${url} ...`);
  console.log("Для остановки нажмите Ctrl+C или закройте окно.\n");

  openBrowserWhenReady(url);

  if (fs.existsSync(NEXT_BIN)) {
    return runCommandSync(process.execPath, [NEXT_BIN, mode, "-p", String(port)]);
  }

  return runNpmSync(["run", mode === "start" ? "start" : "dev"]);
}

function ensureDependencies() {
  if (fs.existsSync(path.join(ROOT, "node_modules"))) {
    return true;
  }

  console.log("[1/2] Папка node_modules не найдена — устанавливаю зависимости...");
  const status = runNpmSync(["install"]);
  if (status !== 0) {
    console.error("[ОШИБКА] Не удалось установить зависимости npm.");
    return false;
  }
  return true;
}

function runAllChecks() {
  const steps = [
    { label: "[1/4] Регрессионные автотесты (npm test)...", args: ["test"] },
    { label: "[2/4] ESLint + TypeScript (npm run check)...", args: ["run", "check"] },
    { label: "[3/4] Проверка backlog...", args: ["run", "check:backlog"] },
    { label: "[4/4] Production-сборка (npm run build)...", args: ["run", "build"] },
  ];

  for (const step of steps) {
    console.log(`\n${step.label}`);
    const status = runNpmSync(step.args);
    if (status !== 0) {
      console.error("\n[ОШИБКА] Проверка завершилась с ошибкой. Подробности выше.");
      return false;
    }
  }

  console.log("\n[OK] Все тесты, проверки и сборка прошли без единой ошибки!");
  return true;
}

async function main() {
  console.log("====================================================================");
  console.log("  Канон кампуса «Южный Урал» — Локальный запуск и проверка сервиса");
  console.log("====================================================================\n");

  const port = await findFreePort(DEFAULT_PORT, MAX_PORT);

  if (IS_DRY_RUN) {
    console.log(`DRY-RUN OK: порт ${port} свободен, каталог проекта ${ROOT}`);
    process.exit(0);
  }

  if (!ensureDependencies()) {
    process.exit(1);
  }

  console.log("Выберите действие (или просто нажмите Enter для быстрого запуска):\n");
  console.log(`  [1] Запустить сайт для проверки (http://localhost:${port}) [по умолчанию]`);
  console.log(`  [2] Собрать и запустить production-версию (npm run build + start на порту ${port})`);
  console.log("  [3] Прогнать полную проверку кода (Тесты + ESLint + TypeScript + Build)");
  console.log("  [4] Настроить API-ключи (Yandex AI Studio, Яндекс Диск, Alibaba Qwen)");
  console.log("  [5] Запустить в Docker с локальной БД DynamoDB/YDB (http://localhost:8080)\n");

  const rl = readline.createInterface({ input, output });
  let choice = "";
  try {
    choice = (await rl.question("Введите номер (1-5) [1]: ")).trim() || "1";
  } finally {
    rl.close();
  }

  if (choice === "1") {
    process.exit(runNextServer("dev", port));
  }

  if (choice === "2") {
    console.log("\nВыполняю production-сборку...");
    const buildStatus = runNpmSync(["run", "build"]);
    if (buildStatus !== 0) {
      console.error("[ОШИБКА] Ошибка сборки проекта.");
      process.exit(buildStatus);
    }
    process.exit(runNextServer("start", port));
  }

  if (choice === "3") {
    if (!runAllChecks()) {
      process.exit(1);
    }

    const rlLaunch = readline.createInterface({ input, output });
    let launchAnswer = "";
    try {
      launchAnswer = (
        await rlLaunch.question(`\nЗапустить сайт на http://localhost:${port} прямо сейчас? (Y/n): `)
      )
        .trim()
        .toLowerCase();
    } finally {
      rlLaunch.close();
    }

    if (launchAnswer === "" || launchAnswer === "y" || launchAnswer === "yes" || launchAnswer === "д") {
      process.exit(runNextServer("dev", port));
    }
    process.exit(0);
  }

  if (choice === "4") {
    process.exit(runCommandSync(process.execPath, [path.join(ROOT, "scripts", "setup-keys.mjs")]));
  }

  if (choice === "5") {
    console.log("\nЗапускаю Docker Compose (http://localhost:8080)...");
    process.exit(runCommandSync("docker", ["compose", "up", "--build"], process.platform === "win32"));
  }

  console.log(`Неизвестный выбор "${choice}", запускаю режим [1]...`);
  process.exit(runNextServer("dev", port));
}

main().catch((error) => {
  console.error("[ОШИБКА] Сбой лаунчера:", error);
  process.exit(1);
});
