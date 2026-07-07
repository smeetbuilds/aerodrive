export default function Loading() {
  return (
    <main className="resilience-screen" aria-label="Loading AeroDrive Zenith">
      <section className="resilience-card">
        <div className="loading-pulse" aria-hidden="true" />
        <p className="eyebrow">AeroDrive Zenith</p>
        <h1>Preparing local simulation.</h1>
        <p>Initializing the application shell before renderer, physics worker, audio graph, and offline cache take over.</p>
      </section>
    </main>
  );
}
