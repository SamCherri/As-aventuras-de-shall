# Direção de arte — auditoria visual Pass 1

Data: 2026-08-25

## Escopo

Auditoria da versão atual de **As Aventuras de Shall** antes de qualquer reformulação ampla. O objetivo deste pass é identificar o maior problema visual e corrigir somente ele, preservando gameplay, identidade e assets canônicos.

## Referência técnica canônica observada nas Fases 1–3

- Canvas interno: **480 × 560**.
- Pixel art: `imageSmoothingEnabled = false`.
- Shall mantém hitbox separada da arte: hitbox base aproximada **38 × 70**, enquanto os sprites visuais chegam a aproximadamente **88–124 px** conforme o estado.
- Inimigos usam sprites recortados por frame e escalas visuais próximas às hitboxes; os maiores inimigos comuns ficam aproximadamente na faixa **70–126 px**.
- Bosses são desenhados com sprite recortado e composição de cenário; Joyce usa aproximadamente **216 × 216** no combate.
- Backgrounds panorâmicos acompanham câmera/progresso e recebem gradação/atmosfera no mesmo canvas.
- Fases 1–3 usam foreground/occluders para colocar arquitetura e objetos na frente dos bosses, evitando aparência de wallpaper puro.

## Auditoria por fase

### Fase 1 — Joyce Cenorita

**Pontos fortes**
- Família cromática quente/vegetal coerente: laranjas, verdes, marrons e luz de dia.
- Cenário, inimigos e boss compartilham linguagem de pixel art.
- Foreground de feira, toldos e caixas ajuda a criar profundidade.

**Problemas observados**
- O watcher da Joyce é propositalmente enorme e depende bastante do `clip()` para parecer encaixado.
- Em alguns trechos a densidade de decoração compete com a leitura das plataformas.

**Severidade:** média, não é o pior problema atual.

### Fase 2 — Rock

**Pontos fortes**
- Paleta noturna consistente com âmbar, roxo, azul escuro e iluminação de bar.
- Pilares, fachadas e toldos funcionam como oclusores e integram melhor o watcher ao cenário.
- Inimigos possuem escala consistente e sprites dedicados.

**Problemas observados**
- O Rock observador ainda ocupa uma área muito grande da composição.
- Saturação e contraste do watcher podem disputar atenção com Shall em alguns momentos.

**Severidade:** média.

### Fase 3 — Zico

**Pontos fortes**
- Background de mata/horta e inimigos florestais utilizam assets dedicados.
- A família de verdes/amarelos e o tema orgânico são reconhecíveis.
- Transformação Biluia e inimigos mantêm linguagem visual próxima das fases anteriores.

**Problemas observados**
- Cena pode ficar visualmente carregada quando transformação, enxame, boss e decoração coincidem.
- Precisa de polish posterior de hierarquia, mas a arquitetura visual continua coerente.

**Severidade:** média/baixa.

### Fase 4 — Água pOtávio

**Problema crítico da versão publicada**

A integração de `stage4-art-overlay.js` criou uma segunda camada de renderização sobre a fase. Isso fez atlas, tiles e personagens parecerem colados em cima da gameplay, com escala, recorte e profundidade que não correspondem à geometria real do mapa.

Sintomas visuais:
- blocos/recifes gigantes;
- Shall fora da escala do restante do jogo;
- arte sem coincidência com colisões;
- background/midground/foreground parecendo outra composição sobreposta;
- pixel density incompatível;
- perda de hierarquia visual;
- aparência de mockup em vez de uma fase pertencente ao mesmo jogo.

**Severidade:** crítica — é o pior problema visual atual.

## Primeira melhoria escolhida

### Remover a arquitetura de overlay e integrar a arte nativamente no renderer da Fase 4

Esta é a única melhoria visual de alto impacto deste pass.

A solução adotada na branch `fix/fase4-visual-native-integration`:

1. remove `stage4-art-overlay.js` da renderização;
2. mantém um único canvas, como nas outras fases;
3. carrega o atlas de forma assíncrona sem bloquear `start()`, controles ou `loop()`;
4. recorta sprites e tiles com `drawImage()` de 9 argumentos;
5. mantém hitboxes independentes da escala visual;
6. desenha recifes dentro da própria geometria de colisão usando `ctx.clip()`;
7. usa parallax no mesmo renderer;
8. preserva fallback procedural por elemento quando a arte não estiver pronta;
9. preserva física aquática, boss AI, HP, controles e dificuldade.

## Escalas usadas no Pass 1

- Shall Mexilhãozinho: visual aproximadamente **78 × 88 px**, hitbox **54 × 68**.
- Água pOtávio: base aproximadamente **172 × 194 px**, com variação controlada conforme `boss.water`.
- Tiles de recife: células de **32 × 32 px** recortadas e repetidas dentro do retângulo de colisão.
- Background: câmera × **0.08**.
- Midground: câmera × **0.32**.
- Gameplay layer: câmera × **1.0**.
- Foreground: câmera × **1.14**, restrito à faixa inferior para não bloquear leitura.

## Arquivos do Pass 1

- `public/play/stage4.js`
- `public/play/stage4.html`
- `public/play/sw.js`
- `tests/play-smoke.test.mjs`
- `.github/workflows/stage4-pr-check.yml`
- remoção de `public/play/stage4-art-overlay.js`

## Validação

O workflow **Validar Fase 4** executa os smoke tests com Node 22 e verifica, entre outros pontos:

- sintaxe do runtime;
- listener de MERGULHAR;
- `requestAnimationFrame(loop)`;
- debug hook;
- referências dos assets;
- recortes com `drawImage()`;
- ausência do overlay;
- fallback e inicialização independentes dos assets.

## Próximo passo recomendado — não executar neste Pass 1

Após revisão visual no celular e aprovação desta primeira correção, o Pass 2 deve focar em **Shall e transformações canônicas**: consolidar escala, pivot, baseline e frame map de Shall em todas as fases antes de alterar cenários, bosses ou VFX.

Nenhuma mudança do Pass 2 deve ser feita antes da aprovação do Pass 1.
