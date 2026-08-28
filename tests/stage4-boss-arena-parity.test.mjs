import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, sw, parity, baseGame] = await Promise.all([
  readFile(new URL("../public/play/stage4.html", import.meta.url), "utf8"),
  readFile(new URL("../public/play/sw.js", import.meta.url), "utf8"),
  readFile(new URL("../public/play/stage4-boss-arena-parity.js", import.meta.url), "utf8"),
  readFile(new URL("../public/play/game.js", import.meta.url), "utf8"),
]);

test("Fase 4 troca profundidade CSS fixa por integração de arena no renderer", () => {
  assert.match(html, /stage4-boss-arena-parity\.js\?v=1/);
  assert.doesNotMatch(html, /stage4-arena-depth\.css/);
  assert.match(sw, /stage4-boss-arena-parity\.js\?v=1/);
  assert.doesNotMatch(sw, /stage4-arena-depth\.css/);
  assert.match(sw, /shall-aventuras-v43-boss-arena-worldspace/);
});

test("apresentação do boss reutiliza gramática das Fases 1–3 sem mexer em gameplay", () => {
  // Joyce usa 216x216 no renderer-base; Água pOtávio é normalizado para a mesma
  // ordem de grandeza visual, sem alterar a hitbox 150x188 definida em stage4.js.
  assert.match(baseGame, /216, 216/);
  assert.match(parity, /const BASE_SCALE = 1\.12/);
  assert.match(parity, /targetBossHeight: 216/);
  assert.match(parity, /worldSpaceScenery: true/);
  assert.match(parity, /usesNativeAtlasTiles: true/);
  assert.match(parity, /__shallStage4CameraParity/);
  assert.match(parity, /drawPressureStation/);
  assert.match(parity, /drawWorldForegroundBrace/);
  assert.doesNotMatch(parity, /\b(?:hero|boss)\.(?:hp|health|water|phase|state|x|y|vx|vy|w|h|timer|attackCd|hitCd)\s*=/);
});
