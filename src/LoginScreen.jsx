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

// onSuccess(profileId, user) : callback optionnel utilisé quand ce composant
// est embarqué dans App.jsx (USE_AUTH=true). En son absence (route standalone
// #login), le comportement par défaut est conservé : affichage du résultat à
// l'écran.
export default function LoginScreen({ onSuccess } = {}) {
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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();

    if (profileError) {
      setStatus({ type: 'error', message: `Connecté, mais erreur lors de la recherche du profil : ${profileError.message}` });
    } else if (!profile) {
      setStatus({ type: 'error', message: `Connecté en tant que ${data.user.email}, mais aucun profil relié à ce compte.` });
    } else if (onSuccess) {
      onSuccess(profile.id, data.user);
      return;
    } else {
      setStatus({ type: 'success', message: `Bienvenue ${data.user.email} — profil trouvé : "${profile.id}"` });
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
            onKeyDown={e => { if (e.key === 'Enter') handleSignIn(); }}
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

        <button
          onClick={handleSignIn}
          disabled={!email || !password || running}
          style={{ marginTop:16, width:'100%', padding:'13px 0', background:'white', border:'1px solid rgba(255,255,255,0.3)', borderRadius:10, fontFamily:sans, fontSize:14, fontWeight:700, color:C.vert, cursor: !email || !password || running ? 'default' : 'pointer', letterSpacing:1, opacity: !email || !password || running ? 0.7 : 1 }}>
          {running ? 'Connexion en cours...' : 'Se connecter'}
        </button>

        <button onClick={handleForgotPassword}
          style={{ marginTop:16, background:'none', border:'none', color:'rgba(255,255,255,0.45)', fontFamily:sans, fontSize:12, cursor:'pointer', textDecoration:'underline' }}>
          Mot de passe oublié ?
        </button>
      </SplashBg>
    </>
  );
}
