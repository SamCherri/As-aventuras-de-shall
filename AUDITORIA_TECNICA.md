# Auditoria técnica — As Aventuras de Shall

**Data da auditoria:** 20 de agosto de 2026  
**Escopo:** estado recebido no GitHub, sem refatoração ou alteração funcional.

## Resumo executivo

O repositório contém um jogo de plataforma 2D realmente implementado, com três fases selecionáveis e encadeáveis, três chefes, controles por teclado e toque, HUD, áudio sintetizado, funcionamento offline e uma transformação especial. O jogo não é uma demonstração vazia. A implementação principal, porém, está concentrada em um único arquivo JavaScript de 5.255 linhas e não possui testes automatizados das mecânicas.

O conteúdo estático em `public/play/` pode ser servido e seus 29 assets referenciados respondem corretamente. A aplicação completa não compilou no ambiente da auditoria porque ele fornece Node.js 20.20.2, enquanto o projeto declara Node.js `>=22.13.0` e o Vinext usa `fs.promises.glob`, API ausente no Node 20. Esse resultado é uma limitação do ambiente, não uma referência quebrada do jogo. A geração de APK ainda não está pronta: há somente `capacitor.config.json`; faltam as dependências do Capacitor, o projeto nativo `android/` e a configuração/validação nativa.

Conclusões diretas:

1. **Executável:** sim como jogo web estático; a build Vinext exige Node.js 22.13 ou superior e não pôde ser concluída no ambiente Node 20 recebido.
2. **Assets principais:** presentes; nenhum dos 29 assets referenciados está faltando. Existem ainda 21 PNGs sem uso pela versão atual.
3. **Completude:** o arco jogável de três fases parece implementado, mas o produto exportado está incompleto para distribuição Android e para manutenção segura (sem projeto Android, salvamento/checkpoints ou testes de gameplay).
4. **Problemas mais graves:** APK inviável no estado atual; build dependente da versão correta do Node; ausência de testes das mecânicas; documentação ainda é a do starter e não descreve o jogo; monólito de gameplay.
5. **Próxima tarefa recomendada:** estabilizar uma linha de base reproduzível em Node 22, adicionar testes de fumaça do jogo sem mudar mecânicas e só então instalar/sincronizar o Capacitor Android de forma incremental.

---

## A) Visão geral

### Tecnologias e arquitetura

- **Jogo:** JavaScript ES moderno sem engine externa, renderizado em Canvas 2D; HTML e CSS próprios.
- **Shell web:** Next.js 16, React 19 e TypeScript, executados por Vinext/Vite sobre Cloudflare Worker.
- **Hospedagem:** plugin do Cloudflare para Vite e um Worker em `worker/index.ts`; o build esperado fica em `dist/`.
- **Persistência do shell:** Drizzle ORM está instalado, mas o schema está vazio e D1/R2 estão desativados. O jogo não usa banco.
- **PWA/offline:** manifesto e service worker próprios em `public/play/`.
- **Mobile nativo:** um arquivo de configuração do Capacitor aponta `webDir` diretamente para `public/play`, mas o runtime/CLI e a plataforma Android não existem no repositório.

Há duas camadas independentes:

1. A rota React `/` apresenta um launcher e redireciona imediatamente para `/play/index.html`.
2. O jogo em `public/play/` é uma aplicação estática autônoma. Seu estado, regras, renderização, física e conteúdo vivem quase totalmente em `public/play/game.js`.

`public/game/` não contém outra versão do jogo: é apenas um redirecionamento legado para `/play/index.html` e um service worker que remove caches antigos e se desregistra.

### Build e dependências

O `package-lock.json` fixa as versões. Os scripts relevantes são:

- `install:ci`: instalação bloqueada e verificada via `npm ci`;
- `dev`: Vite/Vinext com Cloudflare local;
- `build`: Vinext com timeout e validação do artefato;
- `start`: servidor do artefato Vinext;
- `test`: build seguido de um único teste do HTML renderizado;
- `lint`: ESLint para Next/TypeScript;
- `validate:artifact`: valida `dist/server/index.js` e o manifesto de hosting.

Dependências de produção: `next`, `react`, `react-dom` e `drizzle-orm`. Dependências de desenvolvimento: Vite/Vinext, integração Cloudflare/Wrangler, Tailwind/PostCSS, ESLint, TypeScript, Drizzle Kit e tipos. Para o jogo estático em si não há dependência npm em tempo de execução; ele usa somente APIs do navegador.

### Estrutura observada

| Caminho | Responsabilidade real |
|---|---|
| `app/` | Layout, metadados, launcher/redirecionamento e helper opcional de autenticação ChatGPT. |
| `public/play/` | Versão web canônica e jogável. |
| `public/play/assets/` | 50 imagens PNG do jogo e ícones PWA. |
| `public/game/` | Compatibilidade/redirecionamento legado. |
| `scripts/` | Instalação, ambiente, build e validação do artefato Sites. |
| `tests/` | Um teste de metadado do launcher; não testa gameplay. |
| `worker/` | Entrada Cloudflare Worker e otimização de imagens. |
| `build/` | Plugin que empacota configuração OpenAI Sites e migrações. |
| `db/`, `drizzle/` | Estrutura opcional de D1, atualmente vazia. |
| `examples/d1/` | Exemplo do starter, não usado pelo jogo. |
| `capacitor.config.json` | Identidade do app e diretório web, sem plataforma nativa. |

---

## B) Como executar

### Procedimento oficial do repositório

Pré-requisitos: Linux, Node.js **22.13.0 ou superior**, npm, `flock`, `curl` e GNU `timeout`.

```bash
cd /workspace/As-aventuras-de-shall
npm run install:ci
npm run dev
```

Depois, abrir a URL informada pelo Vite. A raiz redirecionará para `/play/index.html`.

Para build e execução de produção:

```bash
cd /workspace/As-aventuras-de-shall
npm run install:ci
npm run build
npm run start
```

Para servir exclusivamente o jogo estático, sem o shell Vinext (útil para diagnóstico, não substitui o build oficial):

```bash
cd /workspace/As-aventuras-de-shall
python3 -m http.server 4173 --directory public
```

Abrir `http://localhost:4173/play/index.html`. Não se deve abrir o HTML via `file://`, pois service worker, escopo e comportamento de URLs dependem de HTTP.

### Resultado desta auditoria

- O servidor estático respondeu pelo HTML, JavaScript, CSS, manifesto, service worker e todos os 29 assets referenciados.
- A sintaxe de `public/play/game.js` foi aceita pelo Node.
- O lint passou.
- `npm test` não chegou ao teste porque a build encerrou no Vinext sob Node 20.20.2. O projeto exige Node 22.13+; o erro foi a ausência do export `glob` em `node:fs/promises`.

---

## C) Mapa do projeto

Toda a lógica abaixo está em `public/play/game.js`, salvo indicação diferente:

| Sistema | Local principal |
|---|---|
| Shall/estado | objeto `hero`, sprites em `images`, `updatePhysics`, `drawHero` |
| Fases | `stageOne*`, `stageTwo*`, `stageThree*`, `configureStage`, `resetWorld` |
| Inimigos | seeds `stage*EnemySeed`, `makeEnemy`, `updateEnemies`, `drawEnemy` |
| Bosses | objeto `boss`; Joyce em `bossTuning`/`updateBoss`; Rock em `rockTuning`/`updateRockBoss`; Zico/Teiú em `zicoTuning`/`updateZicoBoss` |
| Transformação | `spawnBiluiaRain`, `transformIntoBiluia`, `updateBiluia`, `activateBossBiluia`, `drawBiluiaEvents` |
| Controles | `input`, `setControl`, eventos Pointer/Keyboard no fim de `game.js`; botões em `public/play/index.html` |
| HUD | objeto `ui`, `updateHud`; marcação em `index.html`; aparência em `styles.css` |
| Colisões | `overlap`, `collisionPlatforms`, verificações em `updatePhysics`, inimigos, itens e projéteis |
| Física | `updatePhysics`: aceleração horizontal, atrito, gravidade, pulo, coyote time, jump buffer e plataformas |
| Câmera | variáveis `camera`, `cameraLook`, `cameraLift`, `zoom`; atualização em `update` e transformações em `draw` |
| Ataques | `fireMarble`; cenouras de Joyce, latas/sopro/gudes de Rock e abelhas/ferramentas/Teiú de Zico |
| Vida/itens | `damageHero`, `eatSnack`, `updateItems`, `updateHud`; moedas e X-saladas por fase |
| Áudio | Web Audio API em `initAudio`, `tone`, `drumHit`, `sfx`, `updateMusic`; não há arquivos de áudio |
| Diálogos | `storyFrames`, `renderStory`, `beginStory`; epílogos `endingFrames*`, `renderEnding` |
| Sprites/cenários | mapa `images`, funções `draw*` e PNGs em `public/play/assets/` |
| PWA/offline | `public/play/manifest.webmanifest`, `public/play/sw.js` |
| Web/hosting | `app/`, `vite.config.ts`, `worker/index.ts`, `build/sites-vite-plugin.ts` |
| Salvamento | não existe; apenas a preferência de mudo usa `localStorage` (`shall-muted`) |
| Checkpoints | não existe; morte/reinício restaura o começo da fase atual |

---

## D) Funcionalidades encontradas e confirmadas no código

- Três fases completas em termos de dados: geometrias, plataformas, moedas, alimentos, inimigos, seções visuais e arenas próprias.
- Seleção direta das fases 1, 2 e 3 no título e progressão para a próxima fase após o epílogo.
- Movimento lateral, pulo, aceleração, desaceleração, gravidade, coyote time e buffer de pulo.
- Colisão AABB com chão/plataformas, inimigos, itens, projéteis e chefes; recuperação após cair fora do mapa.
- Câmera lateral com antecipação, elevação, zoom de arena e tremor de impacto.
- Controles mobile por Pointer Events, captura de ponteiro e deslizamento entre direções; teclado com setas/A-D, espaço/W/seta para cima, X/K para tiro, C/E para comer e Escape/P para pausa.
- HUD de vida, moedas, X-saladas, som, pausa e barra/fase/nome de chefe.
- Shall possui 100 de energia, invencibilidade temporária após dano, game over e cura de 25 pontos por X-salada.
- Ataque com bolinha de gude e estados temporários de bloqueio do tiro.
- Inimigos de fase 1: `hopper`, `roller`, `crate`, `snack`, `shooter`, `burrower`, `cart`.
- Inimigos de fase 2: `can`, `bottle`, `keg`, `coaster`.
- Inimigos de fase 3: `workerbee`, `beetle`, `sprout`, `hive`.
- Joyce Cenorita com três níveis por vida, arremessos de cenouras, giro/furacão, vulnerabilidade quando zonza e fuga.
- Rock Dente de Cavalo com três níveis, arremesso de latas e gudes, bebida, baforada alcoólica, frenesi/corrida, mordida, dano por pisão e retaliação.
- Batalha de Zico em três atos: Teiú, Zico montado/abelhas e confronto final com ferramentas e companheiro.
- Transformação Biluia temporária, voo, chuva/evento de obtenção e uso especial durante o chefe da fase 3.
- Efeito de embriaguez com alteração de controles/cena, níveis e duração.
- História inicial em quatro quadros, opção de pular, pausas, game over e epílogos específicos para cada fase.
- Música e efeitos 32-bit sintetizados em tempo real com osciladores, ruído, compressor, eco, chorus e reverberação; temas distintos de título, história, rua, chefe, bar, Rock, floresta, Zico e final.
- Preferência persistente de áudio ligado/desligado.
- PWA instalável em tela cheia, orientação retrato, ícones e cache offline.
- Cenários híbridos: grandes PNGs combinados com desenhos procedurais no Canvas, partículas, flashes, números de dano e animação por spritesheets.
- Cenários internos de QA acionáveis por query string e uma função de diagnóstico `window.__shallDebug`, úteis para futuros testes automatizados.

Não foram encontrados inventário além de X-saladas, sistema de contas, placar persistente, salvamento de progresso, checkpoints intermediários, multiplayer ou backend de gameplay.

---

## E) Assets

### Inventário utilizado (29 arquivos)

**Personagens e animações:**

- Shall: `shall-short-neck-idle.png`, `shall-actions.png`, `shall-walk-cycle.png`, `shall-short-neck-actions.png`, `shall-head-back-walk.png`.
- Cleyde: `cleyde.png`.
- Joyce: `joyce-cenorita-v2.png`, `joyce-actions.png`, `joyce-watcher-day-32.png`.
- Rock: `rock-side-actions.png`, `rock-front-watcher.png`, `rock-flee.png`.
- Zico/Teiú/abelhas/Biluia: `zico-actions-32.png`, `zico-flee-32.png`, `teiu-bees-32.png`, `biluia-actions-32.png`, `boss-watchers-32.png`.
- Inimigos: `bar-enemies.png`, `carrot-enemies.png`, `carrot-elites.png`, `forest-enemies-32.png`.

**Cenários e objetos:**

- `bar-district-v2.png`, `bar-props.png`, `rock-arena-bg.png`.
- `stage1-carrot-district-day-32.png`, `joyce-market-arena-day-32.png`.
- `mata-horta-stage-32.png`.

**PWA:** `icon-192.png`, `icon-512.png`.

Todos existem e foram alcançados por HTTP. O service worker inclui os mesmos 29 arquivos referenciados, portanto o shell offline não aponta para asset ausente.

### Presentes, mas não usados pela versão atual (21 arquivos)

- Cenários/versões anteriores: `bar-street-bg.png`, `joyce-market-arena.png`, `stage1-carrot-district.png`.
- Joyce/Rock alternativos: `joyce-cenorita.png`, `joyce-front-watcher.png`, `rock-actions.png`.
- Shall alternativo: `shall-funny-actions.png`, `shall-funny-idle.png`, `shall-funny-walk.png`, `shall-megahead-actions.png`, `shall-megahead-idle.png`, `shall-megahead-walk.png`, `shall-normal-v2.png`, `shall-normal.png`, `shall-short-neck-c-walk.png`, `shall-slim-actions.png`, `shall-slim-idle.png`, `shall-slim-walk.png`, `shall-thin-neck-actions.png`, `shall-thin-neck-idle.png`, `shall-thin-neck-walk.png`.

Esses arquivos **não devem ser apagados automaticamente**: parecem variantes artísticas e material de transformações/iterações anteriores que podem ser necessários ao roteiro futuro. Não há hashes duplicados entre os PNGs.

### Áudio

Não existem MP3, OGG, WAV ou arquivos equivalentes. Isso não representa referência quebrada: músicas e efeitos são gerados programaticamente pela Web Audio API. A consequência é que os “assets de áudio” estão codificados como sequências de frequências e síntese dentro de `game.js`.

---

## F) Problemas encontrados

### CRÍTICO

1. **Android/APK não é gerável no estado atual.** `capacitor.config.json` existe, mas `@capacitor/core`, `@capacitor/cli` e `@capacitor/android` não estão no `package.json`, e não existe diretório `android/`. Não há Gradle wrapper, manifesto Android, Activity, recursos mipmap/splash ou configuração de assinatura.

### ALTO

1. **Build não executa com o Node disponível no ambiente recebido.** O ambiente usa Node 20.20.2, enquanto o repositório exige 22.13+. O Vinext falha antes de compilar. A fonte deve ser testada em CI com a versão declarada para separar limitação ambiental de defeito real.
2. **Não há testes de gameplay.** O único teste valida um metadado HTML do launcher. Física, colisões, três fases, chefes, controles, progressão, offline e referências de assets ficam sem proteção contra regressões.
3. **Gameplay monolítico.** As 5.255 linhas de regras, conteúdo, áudio, input e renderização em um IIFE tornam alterações futuras arriscadas. Isso não justifica reescrita: a separação deve ocorrer gradualmente, acompanhada por testes de comportamento.
4. **Não existe salvamento/progresso nem checkpoints.** Atualizar, fechar ou morrer reinicia o conteúdo; somente a preferência de mudo persiste. Isso é especialmente relevante em mobile, onde o sistema pode encerrar o WebView em segundo plano.

### MÉDIO

1. **README não documenta o produto.** Ele ainda se apresenta como `vinext-starter` e descreve quase exclusivamente infraestrutura OpenAI Sites/D1, sem controles, fases, arquitetura do jogo, assets ou Android.
2. **Nomes herdados do projeto-base.** O pacote se chama `marujo-pixel` e o comentário do Worker cita `vinext-starter`, enquanto o produto é “As Aventuras de Shall”. Isso pode confundir releases, telemetria e manutenção.
3. **Responsividade restrita.** O layout força retrato, largura máxima de 480 px e `min-height: 560px`; em telas muito baixas, teclado aberto, split-screen ou orientação paisagem pode haver corte. O bloqueio de zoom (`user-scalable=no`) também reduz acessibilidade.
4. **Ausência de integração com ciclo de vida Android.** Não há tratamento do botão Voltar, pausa/retomada nativa, status bar, splash screen, insets testados em aparelhos, política de áudio/foco ou teste de WebView.
5. **PWA e cache não têm teste automatizado.** O código registra o service worker e ignora silenciosamente erros de registro; não há teste de instalação/atualização/offline.
6. **Estrutura de banco e autenticação não usada.** Drizzle, exemplo D1 e helper ChatGPT pertencem ao starter e não participam do jogo. Não são necessariamente removíveis, pois sustentam a plataforma de hosting, mas devem ser explicitamente classificados antes de qualquer limpeza.

### BAIXO

1. **21 PNGs sem referência.** Podem ser variantes úteis, mas hoje aumentam o repositório e não há catálogo explicando seu propósito.
2. **Alias legado em `public/game/`.** Duplica o caminho público apenas para redirecionar e limpar service workers anteriores. Deve ser mantido até confirmar que nenhum link/instalação antiga depende dele.
3. **Aviso npm de `http-proxy`.** Os comandos exibem que essa configuração de ambiente será descontinuada em versão futura do npm; não foi localizada no `.npmrc` do projeto.
4. **Ferramenta `file` ausente no ambiente.** Impediu a inspeção via comando Unix de metadados das imagens, mas não impediu validação de existência, hash e entrega HTTP.

### Verificações sem problema encontrado

- Nenhum asset referenciado está ausente.
- Nenhuma referência `assets/...` apontou para caminho inválido.
- `game.js` não apresenta erro de sintaxe no verificador utilizado.
- ESLint não encontrou erro.
- Não há `node_modules`, `dist`, `.next`, logs, backups ou temporários rastreados pelo Git.
- Não foram encontrados `TODO`, `FIXME`, `debugger` ou logs de depuração no código do produto.
- Não há PNGs com conteúdo exatamente duplicado por SHA-256.

---

## G) Código versus documentação

O conflito principal é de omissão e identidade:

- O README afirma que o repositório é um starter limpo, enquanto há um jogo substancial em `public/play/`.
- A seção “Included Shape” orienta editar `app/`, mas quase toda mudança de gameplay precisa ocorrer em `public/play/game.js`, `styles.css`, `index.html` e `assets/`.
- O README não menciona Capacitor, apesar de existir uma configuração.
- O README não afirma as três fases, bosses, transformação Biluia, controles, PWA ou áudio sintetizado, todos presentes no código.
- A interface e o manifesto dizem “funciona offline”; isso está implementado por service worker e cache, mas falta teste automatizado que confirme o comportamento em navegador real.
- A interface diz “trilha 32-bit”; ela existe, mas como síntese procedural, não como arquivos de música. Isso deve ser documentado para evitar que alguém procure assets de áudio ausentes.
- A configuração e documentação do starter sugerem D1/Drizzle opcional. O código confirma que o schema está vazio, bindings D1/R2 estão nulos e o jogo não salva dados no servidor.

Não foi encontrada documentação prometendo mecânicas específicas que estejam claramente ausentes. O problema é que a documentação atual praticamente não documenta o jogo.

---

## H) APK / Android

### O que já existe

```json
{
  "appId": "br.com.asaventurasdeshall.game",
  "appName": "As Aventuras de Shall",
  "webDir": "public/play"
}
```

O `appId`, nome e diretório estático são coerentes. O jogo já usa layout mobile, Pointer Events, `viewport-fit=cover`, safe areas no CSS, orientação retrato no manifesto web e assets locais, o que constitui uma boa base para WebView offline.

### O que falta para um APK funcional

1. Fixar versões compatíveis de `@capacitor/core`, `@capacitor/cli` e `@capacitor/android` no lockfile.
2. Criar `android/` com `npx cap add android` e versionar o projeto nativo.
3. Rodar `npx cap sync android` e conferir que `public/play` é copiado corretamente. Como `webDir` aponta para a subpasta, a Activity abrirá seu `index.html` diretamente; isso é diferente do launcher web em `/` e precisa ser testado.
4. Configurar SDK/Gradle/JDK suportados pela versão escolhida do Capacitor.
5. Gerar ícones adaptativos, splash screen e recursos Android a partir da identidade existente, sem alterar o estilo artístico.
6. Definir orientação, fullscreen, status/navigation bars, edge-to-edge e insets no Android.
7. Tratar botão Voltar (pausa/fechar diálogo em vez de sair abruptamente), `appStateChange`, foco de áudio e retomada após background.
8. Validar service worker dentro do Capacitor. Em WebView nativa ele é geralmente desnecessário para arquivos empacotados; não se deve removê-lo da web sem separar os ambientes.
9. Testar toque múltiplo, pointer capture, latência, proporções pequenas/grandes, recortes, 60 Hz/120 Hz e consumo de Web Audio/Canvas em aparelhos reais.
10. Configurar assinatura: keystore fora do Git, variáveis seguras no CI, `versionCode`, `versionName`, build debug/release e política de backup.
11. Adicionar comandos documentados, por exemplo `cap:sync`, `android:open` e build Gradle, sem substituir os scripts web existentes.
12. Gerar e instalar primeiro um APK debug; somente após testes criar o release assinado/AAB.

O banco, Cloudflare Worker e Next/Vinext não são necessários para empacotar o jogo estático atual, mas continuam necessários para a versão web hospedada. Essas duas linhas de distribuição devem coexistir.

---

## I) Plano de desenvolvimento seguro

### Etapa 1 — congelar a linha de base

1. Criar/taguear uma versão conhecida do estado exportado.
2. Padronizar Node 22.13+ em `.nvmrc`/Volta e CI.
3. Executar instalação limpa, lint, build, teste e servidor em ambiente compatível.
4. Registrar capturas e vídeos das três fases e bosses como referência visual e mecânica.

### Etapa 2 — proteção contra regressões, sem alterar o jogo

1. Criar auditor automatizado de referências/arquivos do PWA.
2. Usar os cenários `?qa=` e `window.__shallDebug` existentes para testes de fumaça em navegador real.
3. Cobrir título, história, cada fase, controles, cura, dano, três bosses, Biluia, final e offline.
4. Testar tamanhos mobile críticos e acessibilidade básica.

### Etapa 3 — documentação e inventário

1. Substituir o README genérico por instruções reais do jogo, web e Android.
2. Documentar spritesheets (dimensões, grade, frames, personagem e uso).
3. Classificar os 21 assets não usados antes de mover ou excluir qualquer um.
4. Documentar a compatibilidade de `public/game/` antes de decidir sobre sua vida útil.

### Etapa 4 — Android incremental

1. Adicionar dependências Capacitor com versões fixas.
2. Gerar e versionar `android/` sem modificar o gameplay.
3. Integrar ciclo de vida e botão Voltar.
4. Produzir APK debug e executar matriz de testes em emulador e aparelho.
5. Só então preparar assinatura e release.

### Etapa 5 — manutenção do código

1. Não reescrever `game.js` de uma vez.
2. Com testes já verdes, extrair primeiro dados estáticos de fases/assets, depois input, áudio e renderização, uma responsabilidade por commit.
3. Preservar constantes, timings, hitboxes e aparência; comparar cada extração com os testes e registros visuais.
4. Avaliar salvamento/checkpoints como funcionalidade nova e versionada, definindo antes com o autor quais pontos e dados devem persistir.

### Próxima tarefa recomendada

**Preparar uma baseline reproduzível e testes de fumaça em Node 22, sem mudar mecânicas.** Essa etapa confirma a build oficial, protege as três fases e cria segurança para a posterior inclusão do Android. Iniciar diretamente pelo APK sem essa rede de segurança aumentaria o risco de confundir defeitos do WebView com regressões do jogo existente.

---

## Comandos e evidências da auditoria

Foram usados, entre outros:

```bash
git ls-files
npm ls --depth=0
node --check public/play/game.js
npm run lint
npm test
python3 -m http.server 4173 --directory public
curl -fsS http://127.0.0.1:4173/play/index.html
sha256sum public/play/assets/*
```

Nenhum arquivo funcional, asset, mecânica ou configuração existente foi alterado nesta auditoria. O único acréscimo é este relatório.
