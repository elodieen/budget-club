import { useState } from 'react';
import { supabase } from './supabaseClient';

// Futur écran de connexion (Supabase Auth) — pour l'instant accessible en dev
// uniquement via #login, en parallèle de l'écran profil + PIN actuel dans App.jsx.
// Ne remplace rien tant qu'il n'est pas branché dans App.jsx.
// Reprend exactement le visuel des écrans d'auth existants (SplashBg / SplashLogo
// dans App.jsx) — dupliqué ici car ces composants n'y sont pas exportés.

const C = { vert: '#1E3328', rose: '#EEC4C4' };
const serif = "'Playfair Display', serif";
const sans  = "'DM Sans', sans-serif";

const SplashBg = ({ children }) => (
  <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:9999, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', paddingTop:'8%', overflow:'hidden' }}>
    <div style={{ position:'absolute', inset:0, backgroundImage:'url(/splash-bg.png)', backgroundSize:'cover', backgroundPosition:'center' }} />
    <div style={{ position:'absolute', inset:0, background:'rgba(30,51,40,0.65)' }} />
    <div style={{ position:'relative', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', width:'100%', padding:'0 24px' }}>
      {children}
    </div>
    <div style={{ position:'absolute', bottom:20, width:'100%', textAlign:'center', fontFamily:sans, fontSize:10, pointerEvents:'none' }}>
      <span style={{ color:'white' }}>✦</span>
      <span style={{ color:'rgba(255,255,255,0.6)' }}> Be your own club. </span>
      <span style={{ color:'white' }}>✦</span>
    </div>
  </div>
);

const SplashLogo = ({ size = 110, titleSize = 48, spacing = '8px' }) => (
  <>
    <img src="/logo-budget-club-rose.png" style={{ width:size, height:size, objectFit:'contain' }} />
    <div style={{ marginTop:14, fontFamily:serif, fontSize:titleSize, fontWeight:700, color:'white', letterSpacing:spacing, textTransform:'uppercase', lineHeight:1.1 }}>
      BUDGET<br />CLUB
    </div>
    <div style={{ marginTop:12, fontFamily:sans, fontSize:10, color:'rgba(255,255,255,0.65)', letterSpacing:'3px', textTransform:'uppercase' }}>
      GÉREZ VOS FINANCES AVEC ÉLÉGANCE
    </div>
  </>
);

const fieldStyle = {
  width: '100%',
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.12)',
  border: `1px solid ${C.rose}`,
  borderRadius: 10,
  fontFamily: serif,
  fontSize: 16,
  color: 'white',
  textAlign: 'center',
  outline: 'none',
  boxSizing: 'border-box',
};

// Relie l'utilisateur Auth actuellement connecté (user) à sa ligne profiles,
// en la créant si elle n'existe pas encore — cas du tout premier login après
// inscription (immédiat si pas de confirmation email requise, ou différé au
// premier signInWithPassword si le compte devait d'abord être confirmé par
// email). Utilisé aussi bien après signUp() que signInWithPassword().
const ensureProfileForUser = async (user) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (error) throw new Error(`Erreur lors de la recherche du profil : ${error.message}`);
  if (profile) return profile.id;

  const id   = 'user_' + Date.now();
  const name = user.user_metadata?.name || user.email.split('@')[0];
  const { error: rpcError } = await supabase.rpc('create_profile_for_auth_user', { p_id: id, p_name: name });
  if (rpcError) throw new Error(`Erreur lors de la création du profil : ${rpcError.message}`);
  return id;
};

// onSuccess(profileId, user) : callback optionnel utilisé quand ce composant
// est embarqué dans App.jsx (USE_AUTH=true). En son absence (route standalone
// #login), le comportement par défaut est conservé : affichage du résultat à
// l'écran.
export default function LoginScreen({ onSuccess } = {}) {
  const [mode,     setMode]     = useState('signin'); // 'signin' | 'signup'
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [running,  setRunning]  = useState(false);
  const [status,   setStatus]   = useState(null); // { type: 'success'|'error', message }
  const [resetSent, setResetSent] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) return;
    setRunning(true);
    setStatus(null);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus({ type: 'error', message: error.message });
      setRunning(false);
      return;
    }

    try {
      const profileId = await ensureProfileForUser(data.user);
      if (onSuccess) { onSuccess(profileId, data.user); return; }
      setStatus({ type: 'success', message: `Bienvenue ${data.user.email} — profil : "${profileId}"` });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    }
    setRunning(false);
  };

  const handleSignUp = async () => {
    if (!name.trim() || !email || !password) return;
    setRunning(true);
    setStatus(null);

    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name: name.trim() } },
    });
    if (error) {
      setStatus({ type: 'error', message: error.message });
      setRunning(false);
      return;
    }

    if (data.session && data.user) {
      // Pas de confirmation email requise pour ce projet : le compte est
      // immédiatement actif, on finalise tout de suite.
      try {
        const profileId = await ensureProfileForUser(data.user);
        if (onSuccess) { onSuccess(profileId, data.user); return; }
        setStatus({ type: 'success', message: `Compte créé — profil : "${profileId}"` });
      } catch (err) {
        setStatus({ type: 'error', message: err.message });
      }
    } else {
      // Confirmation email requise avant la première connexion : le profil
      // sera créé automatiquement au premier signInWithPassword réussi
      // (voir ensureProfileForUser, appelé aussi dans handleSignIn).
      setStatus({ type: 'success', message: `Compte créé pour ${email}. Vérifie ta boîte mail pour confirmer l'adresse, puis connecte-toi ci-dessous.` });
      setMode('signin');
    }
    setRunning(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setStatus({ type: 'error', message: 'Entrez votre email pour réinitialiser le mot de passe.' });
      return;
    }
    setRunning(true);
    setStatus(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) setStatus({ type: 'error', message: error.message });
    else setResetSent(true);
    setRunning(false);
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <SplashBg>
        <SplashLogo size={80} titleSize={30} spacing="6px" />

        <div style={{ marginTop:26, width:'100%', display:'flex', flexDirection:'column', gap:12 }}>
          {mode === 'signup' && (
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Prénom"
              style={fieldStyle}
            />
          )}
          <input
            type="text"
            value={email}
            onChange={e => { setEmail(e.target.value); setResetSent(false); }}
            placeholder="Email ou identifiant"
            style={fieldStyle}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mot de passe"
            onKeyDown={e => { if (e.key === 'Enter') (mode === 'signup' ? handleSignUp : handleSignIn)(); }}
            style={fieldStyle}
          />
        </div>

        {status && (
          <div style={{ fontFamily:sans, fontSize:12, color: status.type === 'success' ? 'white' : C.rose, fontWeight: status.type === 'success' ? 600 : 400, marginTop:12, lineHeight:1.5 }}>
            {status.message}
          </div>
        )}
        {resetSent && (
          <div style={{ fontFamily:sans, fontSize:12, color:'white', fontWeight:600, marginTop:12 }}>
            Email de réinitialisation envoyé.
          </div>
        )}

        {mode === 'signup' ? (
          <button
            onClick={handleSignUp}
            disabled={!name.trim() || !email || !password || running}
            style={{ marginTop:16, width:'100%', padding:'13px 0', background:'white', border:'1px solid rgba(255,255,255,0.3)', borderRadius:10, fontFamily:sans, fontSize:14, fontWeight:700, color:C.vert, cursor: !name.trim() || !email || !password || running ? 'default' : 'pointer', letterSpacing:1, opacity: !name.trim() || !email || !password || running ? 0.7 : 1 }}>
            {running ? 'Création en cours...' : 'Créer mon compte'}
          </button>
        ) : (
          <button
            onClick={handleSignIn}
            disabled={!email || !password || running}
            style={{ marginTop:16, width:'100%', padding:'13px 0', background:'white', border:'1px solid rgba(255,255,255,0.3)', borderRadius:10, fontFamily:sans, fontSize:14, fontWeight:700, color:C.vert, cursor: !email || !password || running ? 'default' : 'pointer', letterSpacing:1, opacity: !email || !password || running ? 0.7 : 1 }}>
            {running ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        )}

        {mode === 'signin' && (
          <button onClick={handleForgotPassword}
            style={{ marginTop:16, background:'none', border:'none', color:'rgba(255,255,255,0.45)', fontFamily:sans, fontSize:12, cursor:'pointer', textDecoration:'underline' }}>
            Mot de passe oublié ?
          </button>
        )}

        <div style={{ width:'100%', height:1, background:'rgba(238,196,196,0.3)', margin:'20px 0 14px' }} />

        <button
          onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setStatus(null); setResetSent(false); }}
          style={{ background:'none', border:'none', color:'rgba(255,255,255,0.7)', fontFamily:sans, fontSize:12, fontWeight:600, cursor:'pointer', textDecoration:'underline' }}>
          {mode === 'signin' ? 'Créer un compte' : "J'ai déjà un compte"}
        </button>
      </SplashBg>
    </>
  );
}
