export default function Home() {
  return (
    <main className="game-launcher">
      <div className="launcher-card">
        <span aria-hidden="true">S</span>
        <h1>As Aventuras de Shall</h1>
        <p>Carregando o jogo...</p>
        <a href="/play/index.html">ABRIR JOGO</a>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: "window.location.replace('/play/index.html');",
        }}
      />
    </main>
  );
}
