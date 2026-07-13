import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// Écran temporaire de test Supabase Auth — dev only, jamais monté en production.
export default function AuthTestScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [running, setRunning]   = useState(false);
  const [result, setResult]     = useState(null); // { ok: boolean, message: string }
  const [session, setSession]   = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setRunning(true);
    setResult(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setResult({ ok: false, message: error.message });
    } else {
      setResult({ ok: true, message: `Connecté avec succès. user_id : ${data.user.id}` });
    }
    setRunning(false);
  };

  const handleSignOut = async () => {
    setRunning(true);
    setResult(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setResult({ ok: false, message: error.message });
    } else {
      setResult({ ok: true, message: 'Déconnecté avec succès.' });
    }
    setRunning(false);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 480, margin: '40px auto', padding: 20, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2 style={{ fontSize: 18, marginBottom: 4 }}>Test — Supabase Auth</h2>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Outil temporaire de développement.</p>

      <div style={{ marginBottom: 16, padding: 10, background: session ? '#eaf7ea' : '#f3f3f3', borderRadius: 6, fontSize: 13 }}>
        {session
          ? <>Connecté en tant que <strong>{session.user.email}</strong></>
          : <>Non connecté</>
        }
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="email@exemple.com"
          style={{ padding: '6px 8px', fontSize: 14, width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          style={{ padding: '6px 8px', fontSize: 14, width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleSignIn}
          disabled={!email || !password || running}
          style={{ padding: '8px 16px', fontSize: 14, cursor: !email || !password || running ? 'default' : 'pointer' }}
        >
          {running ? 'Connexion en cours...' : 'Se connecter'}
        </button>

        <button
          onClick={handleSignOut}
          disabled={running}
          style={{ padding: '8px 16px', fontSize: 14, cursor: running ? 'default' : 'pointer' }}
        >
          Se déconnecter
        </button>
      </div>

      {result && (
        <div style={{ marginTop: 20, padding: 12, background: result.ok ? '#eaf7ea' : '#fdecea', borderRadius: 6, fontSize: 13, color: result.ok ? '#2E7D32' : '#a33' }}>
          {result.message}
        </div>
      )}
    </div>
  );
}
