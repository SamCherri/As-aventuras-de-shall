import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const play = path.resolve("public/play");
const parity = await readFile(path.join(play, "stage4-character-density-parity.js"), "utf8");
const html = await readFile(path.join(play, "stage4.html"), "utf8");
const sw = await readFile(path.join(play, "sw.js"), "utf8");

test("passe de densidade dos personagens da Fase 4 é sintaticamente válido", () => {
  assert.doesNotThrow(() => new vm.Script(parity, { filename: "stage4-character-density-parity.js" }));
});

test("densidade 8x fica restrita a Shall, Água pOtávio e inimigos", () => {
  assert.match(parity, /BASE_SCALE_PASSES\s*=\s*2/);
  assert.match(parity, /CHARACTER_DETAIL_PASSES\s*=\s*1/);
  assert.match(parity, /CHARACTER_FACTOR\s*=\s*2\s*\*\*\s*TOTAL_SCALE_PASSES/);
  for (const region of ["hero", "potavio", "enemies"]) {
    assert.match(parity, new RegExp(`name:\\s*["']${region}["']`), region);
  }
  for (const environmentRegion of ["far", "mid", "fore", "tiles", "vfx"]) {
    assert.doesNotMatch(parity, new RegExp(`name:\\s*["']${environmentRegion}["']`), environmentRegion);
  }
  assert.match(parity, /paletteSafe:\s*true/);
  assert.match(parity, /gameplayWrites:\s*false/);
});

test("novo passe envolve a fidelidade existente antes do backdrop regional", () => {
  const fidelity = html.indexOf("stage4-sprite-fidelity.js?v=2");
  const density = html.indexOf("stage4-character-density-parity.js?v=1");
  const backdrop = html.indexOf("stage4-backdrop-parity.js?v=1");
  assert.ok(fidelity >= 0, "stage4-sprite-fidelity ausente");
  assert.ok(density > fidelity, "densidade deve carregar depois da fidelidade base");
  assert.ok(backdrop > density, "backdrop deve carregar depois do passe de personagens");
});

test("PWA publica o passe novo e força atualização de cache", () => {
  assert.match(sw, /stage4-character-density-parity\.js\?v=1/);
  assert.match(sw, /shall-aventuras-v43-character-density-8x/);
});

test("passe não contém escritas de estado de gameplay", () => {
  for (const forbidden of [
    /hero\.(?:hp|x|y|vx|vy)\s*=/,
    /boss\.(?:hp|water|state|timer|x|y)\s*=/,
    /POTAVIO_MAX_HEALTH\s*=/,
    /currents\s*=/,
  ]) {
    assert.doesNotMatch(parity, forbidden);
  }
});
