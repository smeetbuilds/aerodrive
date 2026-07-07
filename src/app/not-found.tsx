export default function NotFound() {
  return (
    <main className="resilience-screen">
      <section className="resilience-card">
        <p className="eyebrow">Route unavailable</p>
        <h1>This road does not exist.</h1>
        <p>The simulator is intentionally local-first and currently exposes only the main driving shell.</p>
        <div className="resilience-actions">
          <a href="/#seed=alpha-bravo">Return to AeroDrive Zenith</a>
        </div>
      </section>
    </main>
  );
}
