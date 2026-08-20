# As Aventuras de Shall

Jogo de plataforma 2D em Canvas com visual 32-bit, ambientado em Botucatu. Shall percorre três fases e enfrenta Joyce Cenorita, Rock Dente de Cavalo e Zico, incluindo a transformação voadora Biluia. A versão web é instalável, funciona offline e oferece controles por teclado e toque.

## Arquitetura

O repositório possui duas camadas:

- **Jogo estático canônico:** `public/play/`, aplicação autônoma em HTML, CSS e JavaScript, sem dependências npm em tempo de execução. O gameplay está concentrado em `public/play/game.js`; não o refatore sem uma etapa específica e cobertura adequada.
- **Shell e hosting:** `app/`, Next.js 16, React 19, Vinext/Vite e `worker/` fornecem o launcher e o build para Cloudflare/OpenAI Sites. A rota principal encaminha para `/play/index.html`.

`public/game/` é um redirecionamento legado e deve ser preservado. Drizzle/D1 e os helpers opcionais de autenticação do starter continuam disponíveis, mas não participam atualmente do gameplay.

## Requisitos e instalação reproduzível

- Node.js **22.13.0 ou superior**; a baseline em `.nvmrc` usa `22.13.0`.
- npm e, para os scripts de Sites em Linux, `flock`, `curl` e GNU `timeout`.

Com NVM:

```bash
nvm install
nvm use
npm run install:ci
```

`npm run install:ci` executa uma instalação bloqueada baseada em `package-lock.json` (`npm ci`) e nunca atualiza o lockfile implicitamente.

## Como executar

### Aplicação completa

```bash
npm run dev
```

Abra a URL informada pelo Vite; a página inicial direciona para `/play/index.html`.

Para gerar e servir o artefato de produção Vinext:

```bash
npm run build
npm run start
```

### Somente a versão estática

```bash
python3 -m http.server 4173 --directory public/play
```

Abra `http://localhost:4173/`. Não abra `index.html` por `file://`, pois o service worker exige HTTP ou HTTPS.

## Qualidade e testes

```bash
npm run lint
npm run test:smoke
npm test
npm run validate:artifact
```

- `test:smoke` protege os arquivos essenciais, as referências locais, os 29 assets utilizados, a sintaxe/estrutura esperada da baseline, as três fases, os três chefes, Biluia e os recursos `?qa=`/`window.__shallDebug`.
- `test` gera o build e executa todos os testes Node, incluindo a verificação do HTML renderizado.
- `validate:artifact` revalida o build existente em `dist/`.

## GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` publica **somente** o conteúdo de `public/play/`, sem copiar ou modificar o jogo. No site publicado, `index.html`, `game.js`, `styles.css`, `manifest.webmanifest`, `sw.js` e `assets/` ficam diretamente na raiz do artefato.

O deploy ocorre em pushes relevantes para `main` e também pode ser iniciado em **Actions → Publicar jogo no GitHub Pages → Run workflow**. Para o repositório `SamCherri/As-aventuras-de-shall`, a URL esperada é:

**https://samcherri.github.io/As-aventuras-de-shall/**

Os caminhos `./...` são intencionais: mantêm CSS, JavaScript, manifesto, service worker e assets funcionando sob o subdiretório do GitHub Pages. O manifesto usa escopo relativo e o service worker é registrado em `./sw.js`, portanto seu escopo fica limitado à versão jogável.

Na primeira publicação, confirme no GitHub: **Settings → Pages → Build and deployment → Source → GitHub Actions**. Depois consulte o ambiente `github-pages` ou a execução do workflow para acompanhar a URL e o status reais.

## Assets, gráficos e áudio

Os arquivos visuais ficam em `public/play/assets/`. A baseline usa 29 imagens e conserva outras 21 variantes artísticas atualmente sem referência. **Não remova os 21 assets não utilizados sem revisão artística e funcional**, pois podem representar iterações ou conteúdo futuro.

Não existem arquivos MP3, OGG ou WAV: músicas e efeitos são sintetizados em tempo real pela Web Audio API dentro de `public/play/game.js`.

## Android e Capacitor

Android **ainda não está implementado**. `capacitor.config.json` apenas registra a identidade do aplicativo e aponta `webDir` para `public/play`; as dependências do Capacitor, o diretório nativo `android/`, Gradle e o processo de assinatura ainda não existem. Esta baseline não gera APK.

## Estrutura resumida

```text
.github/workflows/   deploy exclusivo do jogo no GitHub Pages
app/                 launcher Next.js/React
public/play/         versão web canônica e jogável
public/play/assets/  sprites, cenários e ícones PWA
public/game/         compatibilidade com links antigos
tests/               testes do shell e fumaça da baseline
scripts/             instalação, build e validação do Sites
worker/              entrada do Cloudflare Worker
db/, drizzle/        infraestrutura opcional, atualmente sem gameplay
```

## Detalhes preservados do starter

O build Vinext usa a configuração de hosting em `.openai/hosting.json`, a simulação local de bindings em `vite.config.ts` e os scripts isolados em `scripts/sites-env.sh`. `.sites-runtime/` é descartável e ignorado pelo Git. O projeto não usa `wrangler.jsonc`.

Os helpers de login opcional do ChatGPT permanecem em `app/chatgpt-auth.ts`. As rotas públicas do jogo não dependem deles. Para manutenção da camada de hosting, consulte a [documentação do Vinext](https://github.com/cloudflare/vinext) e o [guia Drizzle para D1](https://orm.drizzle.team/docs/get-started/d1-new).
