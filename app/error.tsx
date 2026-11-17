"use client";

import { useEffect } from "react";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">VAULT FUERA DE LÍNEA</h1>
        <div className="sub">
          NO SE PUDO CONECTAR CON EL VAULT <span className="blink">_</span>
        </div>
        <div style={{ marginTop: 24 }}>
          <button type="button" className="btn lg" onClick={() => retry()}>
            REINTENTAR
          </button>
        </div>
      </section>
    </div>
  );
}
