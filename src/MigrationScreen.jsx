import { useState } from 'react';
import { migrateAllMonths } from './migrationTools';

// Écran temporaire de migration — dev only, jamais monté en production.
export default function MigrationScreen() {
  const [backupData, setBackupData] = useState(null);
  const [fileName, setFileName]     = useState('');
  const [profileId, setProfileId]   = useState('elodie');
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
        setResult({ migrated: [], skipped: [], errors: ['Fichier JSON invalide.'] });
      }
    };
    reader.readAsText(file);
  };

  const runMigration = async () => {
    if (!backupData) return;
    setRunning(true);
    setResult(null);
    const res = await migrateAllMonths(backupData, profileId.trim() || 'elodie');
    setResult(res);
    setRunning(false);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '40px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2 style={{ fontSize: 18, marginBottom: 4 }}>Migration — Tous les mois 2026</h2>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Outil temporaire de développement.</p>

      <div style={{ marginBottom: 16 }}>
        <input type="file" accept="application/json" onChange={handleFile} />
        {fileName && <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>Fichier chargé : {fileName}</div>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Profil cible (profile_id)</label>
        <input
          type="text"
          value={profileId}
          onChange={e => setProfileId(e.target.value)}
          placeholder="elodie"
          style={{ padding: '6px 8px', fontSize: 14, width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      <button
        onClick={runMigration}
        disabled={!backupData || running}
        style={{ padding: '8px 16px', fontSize: 14, cursor: !backupData || running ? 'default' : 'pointer' }}
      >
        {running ? 'Migration en cours...' : 'Lancer la migration de tous les mois'}
      </button>

      {result && (
        <div style={{ marginTop: 20, padding: 12, background: result.errors.length ? '#fdecea' : '#eaf7ea', borderRadius: 6, fontSize: 13 }}>
          <div>
            <strong>{result.migrated.length}</strong> mois migré(s), <strong>{result.skipped.length}</strong> ignoré(s) (déjà existants)
          </div>

          {result.migrated.length > 0 && (
            <ul style={{ marginTop: 8, paddingLeft: 18 }}>
              {result.migrated.map((m, i) => (
                <li key={i}>{m.label} : {m.revenues} revenu(s), {m.bills} facture(s), {m.expenses} dépense(s)</li>
              ))}
            </ul>
          )}

          {result.skipped.length > 0 && (
            <div style={{ marginTop: 8 }}>
              Mois ignorés : {result.skipped.join(', ')}
            </div>
          )}

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
