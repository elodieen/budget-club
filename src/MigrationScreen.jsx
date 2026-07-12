import { useState } from 'react';
import { migrateRecurringBills } from './migrationTools';

// Écran temporaire de migration — dev only, jamais monté en production.
export default function MigrationScreen() {
  const [backupData, setBackupData] = useState(null);
  const [fileName, setFileName]     = useState('');
  const [running, setRunning]       = useState(false);
  const [result, setResult]         = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        setBackupData(JSON.parse(ev.target.result));
      } catch {
        setBackupData(null);
        setResult({ migrated: 0, errors: ['Fichier JSON invalide.'] });
      }
    };
    reader.readAsText(file);
  };

  const runMigration = async () => {
    if (!backupData) return;
    setRunning(true);
    setResult(null);
    const res = await migrateRecurringBills(backupData);
    setResult(res);
    setRunning(false);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '40px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2 style={{ fontSize: 18, marginBottom: 4 }}>Migration — Factures récurrentes</h2>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Outil temporaire de développement. Profil cible : elodie.</p>

      <div style={{ marginBottom: 16 }}>
        <input type="file" accept="application/json" onChange={handleFile} />
        {fileName && <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Fichier chargé : {fileName}</div>}
      </div>

      <button
        onClick={runMigration}
        disabled={!backupData || running}
        style={{ padding: '8px 16px', fontSize: 14, cursor: !backupData || running ? 'default' : 'pointer' }}
      >
        {running ? 'Migration en cours...' : 'Lancer la migration des factures récurrentes'}
      </button>

      {result && (
        <div style={{ marginTop: 20, padding: 12, background: result.errors.length ? '#fdecea' : '#eaf7ea', borderRadius: 6, fontSize: 13 }}>
          <div><strong>{result.migrated}</strong> facture(s) migrée(s).</div>
          {result.errors.length > 0 && (
            <ul style={{ marginTop: 8, paddingLeft: 18, color: '#a33' }}>
              {result.errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
