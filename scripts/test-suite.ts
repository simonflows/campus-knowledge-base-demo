import assert from "node:assert/strict";

import {
  sanitizeCardFor152FZ,
  sanitizeTextFor152FZ,
  validateExternalHttpsUrl,
} from "../lib/alibaba-ai";
import { buildAnalyticsReport } from "../lib/analytics";
import { articleSeed, DEMO_ARTICLE_IDS, isDemoArticle } from "../lib/articles";
import { canEditCard, getDemoAccount, toSessionUser } from "../lib/auth";
import { FACT_CHECK_PRESETS } from "../lib/audit-canon-registry";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  recordFailedLogin,
  signSessionToken,
  verifySameOrigin,
  verifySessionToken,
} from "../lib/auth-server";
import { buildCanonicalRewrite, checkFactText } from "../lib/fact-check";
import { knowledgeSeedCards } from "../lib/knowledge";

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}`);
    throw error;
  }
}

console.log("\n=== Тесты «Канон кампуса «Южный Урал»» ===\n");

test("1. Эталонная база содержит 18 карточек и 3 статьи со всеми валидными sourceCardIds", () => {
  assert.equal(knowledgeSeedCards.length, 18);
  assert.equal(articleSeed.length, 3);

  const cardIds = new Set(knowledgeSeedCards.map((c) => c.id));
  for (const article of articleSeed) {
    for (const srcId of article.sourceCardIds) {
      assert.ok(cardIds.has(srcId), `Missing sourceCardId ${srcId} in ${article.id}`);
    }
  }
});

test("2. Все 18 эталонных описаний карточек и 3 готовые статьи не содержат красных и жёлтых ошибок", () => {
  for (const card of knowledgeSeedCards) {
    if (!card.referenceDescription.trim()) continue;
    const chk = checkFactText(card.referenceDescription, knowledgeSeedCards);
    assert.equal(
      chk.summary.red,
      0,
      `Card ${card.id} failed red check: ${JSON.stringify(chk.findings.filter((f) => f.level === "red"))}`
    );
    assert.equal(
      chk.summary.yellow,
      0,
      `Card ${card.id} failed yellow check: ${JSON.stringify(chk.findings.filter((f) => f.level === "yellow"))}`
    );
  }

  for (const article of articleSeed) {
    const fullText = [
      article.title,
      article.lead,
      ...article.sections.flatMap((s) => [s.heading, ...s.chunks.map((c) => c.content)]),
    ].join("\n\n");
    const chk = checkFactText(fullText, knowledgeSeedCards);
    assert.equal(
      chk.summary.red,
      0,
      `Seed article ${article.id} has red findings: ${JSON.stringify(chk.findings.filter((f) => f.level === "red"))}`
    );
    assert.equal(
      chk.summary.yellow,
      0,
      `Seed article ${article.id} has yellow findings: ${JSON.stringify(chk.findings.filter((f) => f.level === "yellow"))}`
    );
  }
});

test("3. Все 3 пресета фактчекера находят искажения и очищаются каноническим рерайтом (0 красных / 0 жёлтых)", () => {
  for (const preset of FACT_CHECK_PRESETS) {
    const chk = checkFactText(preset.text, knowledgeSeedCards);
    assert.ok(chk.summary.red >= 3, `Preset ${preset.id} found < 3 red issues`);

    if (preset.id === "preset-tz-vr") {
      assert.equal(chk.summary.red, 3);
      assert.equal(chk.summary.yellow, 1);
    }

    const rewrite = buildCanonicalRewrite(preset.text, knowledgeSeedCards);
    assert.ok(rewrite, `No canonical rewrite generated for ${preset.id}`);

    const recheck = checkFactText(rewrite.plainText, knowledgeSeedCards);
    assert.equal(
      recheck.summary.red,
      0,
      `Rewrite of ${preset.id} has red findings: ${JSON.stringify(recheck.findings)}`
    );
    assert.equal(
      recheck.summary.yellow,
      0,
      `Rewrite of ${preset.id} has yellow findings: ${JSON.stringify(recheck.findings)}`
    );
  }
});

test("4. Отсутствие ReDoS: проверка текста длиной 58 000 символов быстрее 250 мс", () => {
  const longText = "В кампусе Южный Урал тренажёр травмпункта 110 тыс. м². "
    .repeat(1100)
    .slice(0, 58_000);
  const start = Date.now();
  const res = checkFactText(longText, knowledgeSeedCards);
  const elapsed = Date.now() - start;
  assert.ok(res.summary.red > 0);
  assert.ok(elapsed < 250, `Fact-check took too long: ${elapsed} ms`);
});

test("5. Аналитика: партнёры включают лаборатории, дедупликация ГК inSmart, мульти-вуз", () => {
  const partnerReport = buildAnalyticsReport(
    "индустриальные партнёры",
    knowledgeSeedCards
  );
  assert.ok(partnerReport.summary.laboratories >= 3);
  assert.ok(partnerReport.summary.projects >= 10);

  const inSmartCount = partnerReport.summary.partners.filter((p) =>
    p.toLowerCase().includes("insmart")
  ).length;
  assert.equal(inSmartCount, 1, "ГК inSmart должна учитываться строго один раз");

  const multiUniv = buildAnalyticsReport(
    "Покажи проекты ЮУрГУ и ЧелГУ",
    knowledgeSeedCards
  );
  assert.ok(multiUniv.summary.total >= 6);
});

test("6. 152-ФЗ: санитайзер Alibaba удаляет ПДн, телефоны, email и ФИО, SSRF-валидатор блокирует внутренние адреса", () => {
  const traumaCard = knowledgeSeedCards.find(
    (c) => c.id === "joint-midis-susmu-trauma"
  );
  assert.ok(traumaCard);

  const sanitized = sanitizeCardFor152FZ(traumaCard);
  assert.ok(!JSON.stringify(sanitized).includes("Мария Лебедева"));
  assert.ok(!JSON.stringify(sanitized).includes("Дмитрий Петров"));

  const textSanitized = sanitizeTextFor152FZ(
    "Руководитель: Анна Смирнова, тел. +7 (351) 267-99-00, test@susu.ru"
  );
  assert.ok(!textSanitized.includes("Анна Смирнова"));
  assert.ok(!textSanitized.includes("267-99-00"));
  assert.ok(!textSanitized.includes("test@susu.ru"));

  assert.equal(
    validateExternalHttpsUrl("https://dashscope-intl.aliyuncs.com/compatible-mode/v1")
      .valid,
    true
  );
  assert.equal(validateExternalHttpsUrl("http://127.0.0.1:8000").valid, false);
  assert.equal(validateExternalHttpsUrl("https://localhost/api").valid, false);
  assert.equal(
    validateExternalHttpsUrl("https://169.254.169.254/latest").valid,
    false
  );
});

test("7. Безопасность: HMAC-SHA256 куки, Origin-защита, rate-limit и изоляция ролей 7 вузов", () => {
  const token = signSessionToken("demo-admin");
  assert.equal(verifySessionToken(token), "demo-admin");
  assert.equal(verifySessionToken("demo-admin"), null);
  assert.equal(verifySessionToken(`${token}tampered`), null);
  assert.equal(verifySessionToken("demo-admin.fakehex"), null);

  const sameOriginReq = new Request("http://localhost:3050/api/auth/session", {
    method: "POST",
    headers: { Origin: "http://localhost:3050", Host: "localhost:3050" },
  });
  const crossOriginReq = new Request("http://localhost:3050/api/auth/session", {
    method: "POST",
    headers: { Origin: "https://evil.example", Host: "localhost:3050" },
  });
  const nullOriginReq = new Request("http://localhost:3050/api/auth/session", {
    method: "POST",
    headers: { Origin: "null", Host: "localhost:3050" },
  });
  assert.equal(verifySameOrigin(sameOriginReq), true);
  assert.equal(verifySameOrigin(crossOriginReq), false);
  assert.equal(verifySameOrigin(nullOriginReq), false);

  const testIp = "test-bruteforce-ip";
  clearLoginFailures(testIp);
  for (let i = 0; i < 5; i += 1) {
    assert.equal(checkLoginRateLimit(testIp).allowed, true);
    recordFailedLogin(testIp);
  }
  assert.equal(checkLoginRateLimit(testIp).allowed, false);
  clearLoginFailures(testIp);
  assert.equal(checkLoginRateLimit(testIp).allowed, true);

  const susuOwner = getDemoAccount("demo-owner-susu");
  const csuOwner = getDemoAccount("demo-owner-csu");
  const guest = getDemoAccount("demo-guest");
  assert.ok(susuOwner && csuOwner && guest);
  const csuCard = knowledgeSeedCards.find((c) => c.folderId.includes("/csu/"));
  assert.ok(csuCard);
  assert.equal(canEditCard(toSessionUser(csuOwner), csuCard), true);
  assert.equal(canEditCard(toSessionUser(susuOwner), csuCard), false);
  assert.equal(canEditCard(toSessionUser(guest), csuCard), false);

  assert.equal(DEMO_ARTICLE_IDS.length, 3);
  assert.equal(isDemoArticle("article-seed-trauma"), true);
  assert.equal(isDemoArticle("custom-article-id"), false);
});

console.log("\n✓ Все 7 групп регрессионных тестов успешно пройдены!\n");
