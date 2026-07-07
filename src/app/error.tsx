'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[AeroDrive Zenith]', error);
  }, [error]);

  return (
    <main className="resilience-screen" role="alert">
      <section className="resilience-card">
        <p className="eyebrow">Runtime safeguard</p>
        <h1>Simulation recovered into safe mode.</h1>
        <p>
          A browser runtime fault interrupted the current session. Your local settings remain on this device.
          Restart the runtime to reinitialize rendering, audio, input, and the physics worker.
        </p>
        {error.digest ? <p>Reference: {error.digest}</p> : null}
        <div className="resilience-actions">
          <button type="button" onClick={reset}>Restart runtime</button>
          <a href="/#seed=alpha-bravo">Load default seed</a>
        </div>
      </section>
    </main>
  );
}
