import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

const playDirectory = path.resolve("public/play");
const requiredFiles = [
  "index.html",
  "game.js",
  "styles.css",
  "manifest.webmanifest",
  "sw.js",
  "stage4.html",
  "stage4.css",
  "stage4.js",
  "stage4-bridge.js",
];

const sources = new Map(
  await Promise.all(
    requiredFiles.map(async (file) => [
      file,
      await readFile(path.join(playDirectory, file), "utf8"),
    ]),
  ),
);

function localReferences(source) {
  const references = new Set();
  const pattern = /(?:["'(=:\s]|url\(\s*)(\.\/[A-Za-z0-9_./-]+(?:\?[A-Za-z0-9_=&.-]+)?)/g;
  for (const match of source.matchAll(pattern)) {
    references.add(match[1].split(/[?#]/, 1)[0].replace(/^\.\//, ""));
  }
  return references;
}

test("a aplicação estática contém os arquivos essenciais e a fase 4", async () => {
  for (const file of requiredFiles) {
    assert.equal((await stat(path.join(playDirectory, file))).isFile(), true, file);
  }
});

test("todas as referências locais importantes apontam para arquivos existentes", async () => {
  const references = new Set();
  for (const source of sources.values()) {
    for (const reference of localReferences(source)) references.add(reference);
  }

  assert.ok(references.size > 0, "nenhuma referência local foi encontrada");
  for (const reference of references) {
    const target = path.join(playDirectory, reference);
    assert.equal((await stat(target)).isFile(), true, reference);
  }
});

test("assets da baseline e pacote visual 32-bit da fase 4 continuam referenciados e presentes", async () => {
  const assets = new Set();
  for (const source of sources.values()) {
    for (const reference of localReferences(source)) {
      if (reference.startsWith("assets/")) assets.add(reference);
    }
  }

  assert.equal(assets.size, 43);
  const stage4Art = [...assets].filter((asset) => asset.startsWith("assets/stage4/art-atlas.b64."));
  assert.equal(stage4Art.length, 14);
  for (const asset of assets) {
    assert.equal((await stat(path.join(playDirectory, asset))).isFile(), true, asset);
  }
});

test("scripts de gameplay continuam sintaticamente válidos", () => {
  for (const file of ["game.js", "stage4.js", "stage4-bridge.js"]) {
    assert.doesNotThrow(() => new vm.Script(sources.get(file), { filename: file }), file);
  }
});

test("manifesto e service worker preservam URLs relativas compatíveis com subdiretórios", () => {
  const manifest = JSON.parse(sources.get("manifest.webmanifest"));
  assert.equal(manifest.start_url, "./index.html");
  assert.equal(manifest.scope, "./");
  assert.match(sources.get("game.js"), /serviceWorker\.register\(["']\.\/sw\.js["']\)/);
  assert.match(sources.get("stage4.js"), /serviceWorker\.register\(["']\.\/sw\.js["']\)/);
  assert.match(sources.get("sw.js"), /caches\.match\(["']\.\/index\.html["']\)/);
  assert.match(sources.get("sw.js"), /shall-aventuras-v38/);
  for (const file of ["stage4.html", "stage4.css", "stage4.js", "stage4-bridge.js"]) {
    assert.match(sources.get("sw.js"), new RegExp(file.replace(".", "\\.")), file);
  }
  for (let i = 0; i < 14; i += 1) {
    const file = `art-atlas.b64.${String(i).padStart(2, "0")}.txt`;
    assert.match(sources.get("sw.js"), new RegExp(file.replaceAll(".", "\\.")), file);
  }
});

test("baseline mantém quatro fases, chefes e transformações", () => {
  const game = sources.get("game.js");
  const stage4 = sources.get("stage4.js");
  const index = sources.get("index.html");
  for (const declaration of ["stageOneSections", "stageTwoSections", "stageThreeSections"]) {
    assert.match(game, new RegExp(`const\\s+${declaration}\\s*=`), declaration);
  }
  for (const character of ["Joyce", "Rock", "Zico"]) assert.match(game, new RegExp(character, "i"));
  assert.match(game, /function\s+transformIntoBiluia\s*\(/);
  assert.match(index, /id=["']stage4-button["']/);
  assert.match(index, /4 FASES/);
  assert.match(stage4, /POTAVIO_MAX_HEALTH/);
  assert.match(stage4, /function\s+mexilhao\s*\(/);
  assert.match(stage4, /function\s+potavio\s*\(/);
  assert.match(stage4, /function\s+atlasDraw\s*\(/);
  assert.match(stage4, /function\s+parallax\s*\(/);
  assert.match(stage4, /art-atlas\.b64\./);
  assert.match(stage4, /JATO PRESSURIZADO/);
  assert.match(stage4, /ESPIRO D'ÁGUA/);
  assert.match(stage4, /const\s+currents\s*=/);
  assert.match(stage4, /boss\.active\?boss\.x-hero\.w-24/);
});

test("infraestrutura de QA das quatro fases continua disponível", () => {
  const game = sources.get("game.js");
  const stage4 = sources.get("stage4.js");
  assert.match(game, /new URLSearchParams\(location\.search\)\.get\(["']qa["']\)/);
  assert.match(game, /window\.__shallDebug\s*=/);
  assert.match(stage4, /new URLSearchParams\(location\.search\)\.get\(["']qa["']\)/);
  assert.match(stage4, /window\.__shallStage4Debug\s*=/);
  assert.match(stage4, /artReady/);
});
