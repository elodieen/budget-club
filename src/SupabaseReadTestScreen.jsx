import { useState } from 'react';
import { fetchMonthFromSupabase } from './supabaseData';

// Écran de test temporaire — dev only, jamais monté en production.
// Vérifie fetchMonthFromSupabase sur un seul cas connu : elodie, juin 2026.
export default function SupabaseReadTestScreen() {
  const [running, setRunning] = useState(false);
  const [result,  setResult]  = useState(null); // { ok:true, data } | { ok:false, error }

  const runTest = async () => {
    setRunning(true);
    setResult(null);
    try {
      const data = await fetchMonthFromSupabase('elodie', 2026, 6);
      setResult({ ok: true, data });
    } catch (e) {
      setResult({ ok: false, error: e.message });
    }
    setRunning(false);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 640, margin: '40px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2 style={{ fontSize: 18, marginBottom: 4 }}>Test — Lecture Supabase (lecture seule)</h2>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
        Outil temporaire de développement. Appelle fetchMonthFromSupabase('elodie', 2026, 6).
      </p>

      <button
        onClick={runTest}
        disabled={running}
        style={{ padding: '8px 16px', fontSize: 14, cursor: running ? 'default' : 'pointer' }}
      >
        {running ? 'Lecture en cours...' : 'Lire juin 2026 — elodie'}
      </button>

      {result && (
        <div style={{ marginTop: 20, padding: 12, background: result.ok ? '#eaf7ea' : '#fdecea', borderRadius: 6, fontSize: 12 }}>
          {result.ok ? (
            result.data === null ? (
              <div>Aucun mois trouvé (null).</div>
            ) : (
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )
          ) : (
            <div style={{ color: '#a33' }}>{result.error}</div>
          )}
        </div>
      )}
    </div>
  );
}
