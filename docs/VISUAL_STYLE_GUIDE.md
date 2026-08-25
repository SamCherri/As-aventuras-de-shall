# As Aventuras de Shall — Visual Style Guide

Data-base: 2026-08-25
Status: referência canônica para passes visuais incrementais

## Objetivo

Manter todas as fases de **As Aventuras de Shall** visualmente coerentes entre si enquanto o jogo evolui. Este guia não autoriza redesign amplo: assets já aprovados devem ser preservados e novas variações devem derivar deles.

## Regras canônicas

- Canvas interno de referência: **480 × 560**.
- Pixel art com `imageSmoothingEnabled = false` e `image-rendering: pixelated` nas superfícies escaladas.
- Gameplay deve permanecer legível antes de qualquer efeito decorativo.
- Background, midground, gameplay layer e foreground precisam ter funções visuais distintas.
- Foreground pode ocluir parcialmente cenário e bosses, mas nunca esconder Shall, projéteis, inimigos ou rotas críticas por tempo prolongado.
- Sprites não devem parecer ilustrações coladas sobre o mapa; escala, perspectiva, iluminação e pixel density precisam conversar com a geometria jogável.

## Shall — referência canônica

### Identidade

Preservar rosto, cabelo, roupas, paleta, silhueta, cabeça grande, leitura cômica e proporções já aprovadas. Não regenerar Shall inteiro quando apenas uma animação, expressão ou transformação precisa mudar.

### Escala e hitbox

- Nas Fases 1–3, a hitbox base de Shall é aproximadamente **38 × 70 px**, enquanto a arte pode ocupar cerca de **88–124 px**, conforme estado/animação.
- Na Fase 4, Shall Mexilhãozinho usa hitbox **54 × 68 px** e visual aproximadamente **78 × 88 px**.
- A hitbox e a arte devem continuar desacopladas. Aumentar o sprite não deve alterar colisão automaticamente.

### Pivot e baseline

- Pivot horizontal: centro da hitbox.
- Baseline visual: pés/parte inferior do corpo alinhados de forma estável com a base da hitbox em estados terrestres.
- Em estados aquáticos, manter o centro visual do corpo estável e evitar que a troca de frame faça o personagem “pular” alguns pixels para cima/baixo.
- Flip horizontal deve ocorrer em torno do pivot, não deslocando o personagem lateralmente.

### Frames e animações

Cada nova animação deve manter:

- mesma escala aparente do personagem;
- pivot consistente;
- baseline consistente;
- pixel density equivalente;
- outline e shading compatíveis;
- leitura clara em tela de celular.

Priorizar poses com antecipação, impacto e recuperação sem interpolação borrada.

## Transformações

Transformações devem parecer versões do mesmo Shall, não personagens independentes.

Preservar sempre:

- rosto reconhecível;
- proporção da cabeça;
- linguagem de outline;
- família de cores;
- escala aparente compatível com Shall base;
- pivot e centro visual consistentes durante a transformação.

A transformação pode exagerar silhueta e acessórios para comunicar mecânica, mas nunca perder a identidade do personagem.

## Bosses

Bosses precisam parecer fisicamente presentes no mundo.

- Evitar composição de “imagem gigante no fundo”.
- Usar foreground/arquitetura/vegetação/objetos como oclusores quando apropriado.
- Sombras, partículas, reação do cenário e parallax devem reforçar profundidade.
- Watchers gigantes podem existir, mas seu contraste e saturação não devem competir com Shall durante trechos de precisão.
- Boss em combate deve ter escala consistente com sua hitbox e arena.

## Cenários e camadas

### Background

- Baixo contraste relativo.
- Parallax lento.
- Pode usar atmosfera, névoa e gradação.

### Midground

- Define profundidade e tema da fase.
- Contraste intermediário.
- Movimento/parallax perceptível, mas subordinado à gameplay.

### Gameplay layer

- Maior clareza de silhueta.
- Obstáculos e plataformas precisam coincidir visualmente com colisões.
- Elementos perigosos devem ser imediatamente identificáveis.

### Foreground

- Usado para profundidade e integração de bosses.
- Evitar cobrir a parte central da ação por longos períodos.
- Opacidade e altura devem ser controladas em telas pequenas.

## Paleta, luz e contraste

- Reutilizar famílias de cores da própria fase antes de introduzir novas cores.
- Direção de luz deve permanecer coerente dentro de uma mesma cena.
- Shall, inimigos perigosos, projéteis e interativos devem vencer o fundo em contraste local.
- Glow e bloom devem ser simulados sem borrar pixel art.

## Pixel density e escala

Não misturar sprites detalhados demais com tiles simplificados em escalas incompatíveis.

Antes de aprovar um novo asset, comparar:

1. tamanho aparente no canvas 480 × 560;
2. espessura de outline;
3. densidade de detalhe;
4. tamanho dos pixels aparentes;
5. relação com Shall e inimigos próximos.

## VFX

Partículas e efeitos devem reforçar ação, não esconder informação.

- Impactos curtos e legíveis.
- Água, poeira, fumaça e explosões devem respeitar a paleta da fase.
- Evitar grandes flashes opacos sobre controles ou personagem.
- Em mobile, limitar densidade de partículas em cenas já carregadas.

## HUD/UI

- Priorizar leitura rápida com polegar em tela pequena.
- Não cobrir área útil de gameplay desnecessariamente.
- Indicadores importantes devem ter contraste forte e tipografia legível.
- Elementos decorativos do HUD não devem competir com vida, boss HP ou transformação.

## Critério de aprovação de qualquer mudança visual

Antes de concluir um pass, confirmar:

- Parece parte do mesmo jogo?
- Shall continua reconhecível e na escala correta?
- A arte coincide com a geometria e a colisão?
- Background/midground/foreground possuem profundidade clara?
- O boss parece integrado fisicamente ao cenário?
- A pixel density é consistente?
- O personagem e perigos continuam legíveis no celular?
- A mudança preserva humor e personalidade?
- O resultado melhora a gameplay real, não apenas uma captura isolada?

Se qualquer resposta for “não”, o pass deve ser refinado antes de ser considerado concluído.

## Ordem recomendada dos próximos passes

1. **Pass 2 — Shall e transformações:** consolidar escala, pivot, baseline e frame map por estado.
2. **Pass 3 — Cenários:** equalizar composição e hierarquia das quatro fases.
3. **Pass 4 — Bosses:** melhorar integração física e expressividade.
4. **Pass 5 — Animações:** antecipação, impacto, reação e humor visual.
5. **Pass 6 — VFX:** partículas e efeitos de ambiente.
6. **Pass 7 — HUD/UI:** acabamento e leitura mobile.
7. **Pass 8 — Polish:** microdetalhes, consistência final e humor ambiental.
