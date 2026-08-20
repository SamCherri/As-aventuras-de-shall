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

test("a aplicação estática contém os cinco arquivos essenciais", async () => {
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

test("os 29 assets da baseline continuam referenciados e presentes", async () => {
  const assets = new Set();
  for (const source of sources.values()) {
    for (const reference of localReferences(source)) {
      if (reference.startsWith("assets/")) assets.add(reference);
    }
  }

  assert.equal(assets.size, 29);
  for (const asset of assets) {
    assert.equal((await stat(path.join(playDirectory, asset))).isFile(), true, asset);
  }
});

test("game.js continua sintaticamente válido", () => {
  assert.doesNotThrow(() => new vm.Script(sources.get("game.js"), { filename: "game.js" }));
});

test("manifesto e service worker preservam URLs relativas compatíveis com subdiretórios", () => {
  const manifest = JSON.parse(sources.get("manifest.webmanifest"));
  assert.equal(manifest.start_url, "./index.html");
  assert.equal(manifest.scope, "./");
  assert.match(sources.get("game.js"), /serviceWorker\.register\(["']\.\/sw\.js["']\)/);
  assert.match(sources.get("sw.js"), /caches\.match\(["']\.\/index\.html["']\)/);
});

test("baseline mantém três fases, chefes e transformação Biluia", () => {
  const game = sources.get("game.js");
  for (const declaration of ["stageOneSections", "stageTwoSections", "stageThreeSections"]) {
    assert.match(game, new RegExp(`const\\s+${declaration}\\s*=`), declaration);
  }
  for (const character of ["Joyce", "Rock", "Zico"]) assert.match(game, new RegExp(character, "i"));
  assert.match(game, /function\s+transformIntoBiluia\s*\(/);
});

test("infraestrutura de QA da baseline continua disponível", () => {
  const game = sources.get("game.js");
  assert.match(game, /new URLSearchParams\(location\.search\)\.get\(["']qa["']\)/);
  assert.match(game, /window\.__shallDebug\s*=/);
});
