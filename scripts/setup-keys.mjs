import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const ROOT = process.cwd();
const ENV_LOCAL = path.join(ROOT, ".env.local");
const ENV_DOCKER = path.join(ROOT, ".env.docker");

function parseEnv(text) {
  const map = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    map.set(key, val);
  }
  return map;
}

function serializeEnv(map, headerLines) {
  const lines = [...headerLines, ""];
  for (const [k, v] of map.entries()) {
    const formatted = /[\s#"']/.test(v)
      ? `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
      : v;
    lines.push(`${k}=${formatted}`);
  }
  return `${lines.join("\n")}\n`;
}

async function readEnvMap(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return parseEnv(raw);
  } catch {
    return new Map();
  }
}

function mask(val) {
  if (!val) return "не задано";
  if (val.length <= 8) return "********";
  return `${val.slice(0, 4)}...${val.slice(-4)}`;
}

async function main() {
  console.log("==============================================================");
  console.log("  Мастер настройки ключей — Канон кампуса «Южный Урал»");
  console.log("==============================================================");
  console.log(
    "Нажмите Enter, чтобы оставить текущее значение или пропустить ключ.\n" +
      "Сервис полностью работает и без облачных ключей (в локальном режиме).\n"
  );

  const rl = readline.createInterface({ input, output });
  const envMap = await readEnvMap(ENV_LOCAL);

  const fields = [
    {
      key: "YANDEX_AI_STUDIO_API_KEY",
      label: "1. Yandex AI Studio API Key (боевой контур РФ 152-ФЗ)",
      defaultVal: "",
    },
    {
      key: "YANDEX_AI_STUDIO_FOLDER_ID",
      label: "2. Yandex Cloud Folder ID (каталог Yandex AI Studio)",
      defaultVal: "",
    },
    {
      key: "YANDEX_DISK_OAUTH_TOKEN",
      label: "3. Яндекс Диск OAuth Token (авторезервирование .md / .csv)",
      defaultVal: "",
    },
    {
      key: "ALIBABA_DASHSCOPE_API_KEY",
      label: "4. Alibaba Cloud Model Studio API Key (учебный полигон Qwen)",
      defaultVal: "",
    },
    {
      key: "ALIBABA_MODEL_NAME",
      label: "5. Модель Alibaba Qwen (например qwen-plus или qwen-max)",
      defaultVal: "qwen-plus",
    },
    {
      key: "ALIBABA_DASHSCOPE_BASE_URL",
      label: "6. Endpoint Alibaba DashScope",
      defaultVal: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    },
  ];

  for (const field of fields) {
    const current = envMap.get(field.key) || field.defaultVal;
    const hint = current ? ` [текущее: ${mask(current)}]` : "";
    const answer = (await rl.question(`${field.label}${hint}: `)).trim();
    if (answer) {
      envMap.set(field.key, answer);
    } else if (!envMap.has(field.key) && field.defaultVal) {
      envMap.set(field.key, field.defaultVal);
    }
  }

  const syncDockerAnswer = (
    await rl.question(
      "\nОбновить также .env.docker этими ключами для Docker Compose? (y/N): "
    )
  )
    .trim()
    .toLowerCase();

  rl.close();

  await fs.writeFile(
    ENV_LOCAL,
    serializeEnv(envMap, [
      "# Конфигурация Канона кампуса «Южный Урал»",
      "# Сгенерировано скриптом scripts/setup-keys.mjs",
    ]),
    "utf8"
  );
  console.log(`\n✓ Сохранено в ${ENV_LOCAL}`);

  if (syncDockerAnswer === "y" || syncDockerAnswer === "yes" || syncDockerAnswer === "д") {
    const dockerMap = await readEnvMap(ENV_DOCKER);
    for (const field of fields) {
      const val = envMap.get(field.key);
      if (val) dockerMap.set(field.key, val);
    }
    await fs.writeFile(
      ENV_DOCKER,
      serializeEnv(dockerMap, [
        "# Environment variables for Docker Compose development",
      ]),
      "utf8"
    );
    console.log(`✓ Обновлено в ${ENV_DOCKER}`);
  }

  console.log("\nГотово! Запустите проект командой:");
  console.log("  npm run dev   (локальный запуск на http://localhost:3050)");
  console.log("  или   docker compose up -d   (контейнер на http://localhost:8080)");
}

main().catch((err) => {
  console.error("Ошибка мастера настройки:", err);
  process.exit(1);
});
