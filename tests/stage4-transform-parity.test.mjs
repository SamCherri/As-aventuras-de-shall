import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const playDirectory = path.resolve("public/play");
const [parity, html, serviceWorker, stage4] = await Promise.all([
  readFile(path.join(playDirectory, "stage4-transform-parity.js"), "utf8"),
  readFile(path.join(playDirectory, "stage4.html"), "utf8"),
  readFile(path.join(playDirectory, "sw.js"), "utf8"),
  readFile(path.join(playDirectory, "stage4.js"), "utf8"),
]);

test("ponte de transformação da fase 4 permanece sintaticamente válida e publicada", () => {
  assert.doesNotThrow(() => new vm.Script(parity, { filename: "stage4-transform-parity.js" }));
  assert.match(html, /stage4-transform-parity\.js\?v=2/);
  assert.match(serviceWorker, /stage4-transform-parity\.js\?v=2/);
  assert.match(serviceWorker, /shall-aventuras-v43-canonical-transform/);
});

test("transformação mantém Shall canônico antes de revelar o Mexilhãozinho", () => {
  assert.match(parity, /\.\/assets\/shall-short-neck-idle\.png/);
  assert.match(parity, /function\s+drawCanonicalShall\s*\(/);
  assert.match(parity, /function\s+drawNativeTransform\s*\(/);
  assert.match(parity, /canonical-shall-morph-mexilhao/);
  assert.match(parity, /compression-crossfade/);
  assert.match(parity, /prefers-reduced-motion/);
  assert.match(parity, /imageSmoothingEnabled\s*=\s*false/);
});

test("passe de transformação não muda o contrato de gameplay", () => {
  assert.match(stage4, /transformTimer\s*=\s*2\.4/);
  assert.match(stage4, /transformTimer\s*-=?\s*dt/);
  assert.match(stage4, /if\s*\(transformTimer\s*<=\s*0\)\s*\{transformed=true/);
  assert.doesNotMatch(parity, /hero\.(?:hp|x|y|vx|vy)\s*=/);
  assert.doesNotMatch(parity, /boss\.(?:hp|water|state|timer)\s*=/);
  assert.doesNotMatch(parity, /transformTimer\s*=/);
  assert.doesNotMatch(parity, /transformed\s*=/);
});
