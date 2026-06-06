// ============================================================
// BUDGET CLUB 2026 — Prototype complet
// Stack cible : React 18 + Vite + localStorage
// ============================================================
import { useState, useEffect, useCallback, useRef } from "react";

// ─── DESIGN TOKENS ──────────────────────────────────────────
const C = {
  vert:   '#1E3328',
  nav:    '#1C291C',
  rose:   '#EEC4C4',
  roseL:  '#F9EDED',
  beige:  '#F5EDE1',
  gold:   '#C9A96E',
  card:   '#FFFFFF',
  text:   '#2A2A2A',
  muted:  '#8A9A8A',
  border: 'rgba(28,41,28,0.1)',
};
const serif = "'Playfair Display', serif";
const sans  = "'DM Sans', sans-serif";

// ─── DONNÉES ────────────────────────────────────────────────
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const MS     = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

export const CATS = [
  { id:'alimentation',   label:'Alimentation',      icon:'ti-shopping-cart'   },
  { id:'quotidien',      label:'Quotidien',          icon:'ti-coffee'          },
  { id:'sortie',         label:'Sortie/Restau',      icon:'ti-tools-kitchen-2' },
  { id:'appart',         label:'Appart',             icon:'ti-home'            },
  { id:'shopping',       label:'Shopping',           icon:'ti-shopping-bag'    },
  { id:'vacances',       label:'Vacances',           icon:'ti-plane'           },
  { id:'epargne_livret', label:'Épargne — Livret A', icon:'ti-building-bank'   },
  { id:'epargne_pea',    label:'Épargne — PEA',      icon:'ti-trending-up'     },
  { id:'sante',          label:'Santé',              icon:'ti-heart'           },
  { id:'cadeau',         label:'Cadeau',             icon:'ti-gift'            },
  { id:'affiche',        label:'Affiche Map',        icon:'ti-map'             },
  { id:'facture',        label:'Facture',            icon:'ti-receipt'         },
  { id:'divers',         label:'Divers',             icon:'ti-box'             },
];

export const BILLS_DEFAULT = [
  {id:'b1', name:'BPCE Prévoyance',       amount:4   },
  {id:'b2', name:'Copropriété',            amount:239 },
  {id:'b3', name:'MNCAP Axa emprunteur',  amount:25  },
  {id:'b4', name:'Leonardo IA',           amount:13  },
  {id:'b5', name:'Orange Fibre',          amount:52  },
  {id:'b6', name:'Amazon Photos',         amount:2   },
  {id:'b7', name:'Disney',                amount:16  },
  {id:'b8', name:'Frais CB',              amount:18  },
  {id:'b9', name:'Taxe Foncière',         amount:99  },
  {id:'b10',name:'Amazon Prime',          amount:9   },
  {id:'b11',name:'Canva',                 amount:12  },
  {id:'b12',name:'Netflix',               amount:14  },
  {id:'b13',name:'Domiciliation',         amount:42  },
  {id:'b14',name:'Orange Téléphone',      amount:76  },
  {id:'b15',name:'Assurance Voiture GMF', amount:40  },
  {id:'b16',name:'Crédit Immobilier',     amount:736 },
  {id:'b17',name:'BPCE Assurance',        amount:11  },
  {id:'b18',name:'Generali Habitation',   amount:18  },
  {id:'b19',name:'Generali Vie Privée',   amount:14  },
  {id:'b20',name:'EDF',                   amount:46  },
  {id:'b21',name:'OneDrive',              amount:2   },
  {id:'b22',name:'Viki',                  amount:6   },
  {id:'b23',name:'Claude IA',             amount:22  },
  {id:'b24',name:'App Sorteos',           amount:9   },
];

const mkMonth = () => ({
  catBudgets: {},
  revenues:   [],
  bills:      BILLS_DEFAULT.map(b => ({...b, realAmount: b.amount, paid: false, paidDate: ''})),
  expenses:   [],
  closed:     false,
});

// ─── HELPERS ────────────────────────────────────────────────
// mi = { month: 0-11, year: YYYY }
const storageKey = (mi) => `budget:${mi.year}:${String(mi.month + 1).padStart(2, '0')}`;

const loadYearData = (year) => {
  const months = [];
  for (let m = 0; m < 12; m++) {
    const key = `budget:${year}:${String(m + 1).padStart(2, '0')}`;
    try {
      const stored = localStorage.getItem(key);
      months.push(stored ? JSON.parse(stored) : null);
    } catch { months.push(null); }
  }
  return months;
};

const getInitialMonth = () => {
  const today = new Date();
  const day   = today.getDate();
  const month = today.getMonth(); // 0-11
  const year  = today.getFullYear();
  if (day < 10) {
    if (month === 0) return { month: 11, year: year - 1 };
    return { month: month - 1, year };
  }
  return { month, year };
};

const fmtR = (n) => {
  const v = parseFloat(n) || 0;
  return v % 1 === 0
    ? v.toLocaleString('fr-FR') + ' €'
    : v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
};
const fmtP = (n) => Math.round(n).toLocaleString('fr-FR') + ' €';

const billValue      = (b) => b.paid ? (b.realAmount || b.amount) : b.amount;
const byDate         = (arr) => [...arr].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
const getCustomCats  = () => { try { return JSON.parse(localStorage.getItem('budget:categories:custom') || '[]'); } catch { return []; } };
const saveCustomCats = (cats) => localStorage.setItem('budget:categories:custom', JSON.stringify(cats));

const LIVRET_SOLDE_KEY = 'budget:livret:soldeInitial';
const getLivretSolde  = () => { try { const s = localStorage.getItem(LIVRET_SOLDE_KEY); return s ? JSON.parse(s) : null; } catch { return null; } };
const saveLivretSolde = (v) => localStorage.setItem(LIVRET_SOLDE_KEY, JSON.stringify(v));

const PEA_SOLDE_KEY = 'budget:pea:soldeInitial';
const PEA_REND_KEY  = 'budget:pea:rendements';
const getPeaSolde   = () => { try { const s = localStorage.getItem(PEA_SOLDE_KEY); return s ? JSON.parse(s) : null; } catch { return null; } };
const savePeaSolde  = (v) => localStorage.setItem(PEA_SOLDE_KEY, JSON.stringify(v));
const getPeaRend    = () => { try { const s = localStorage.getItem(PEA_REND_KEY);  return s ? JSON.parse(s) : []; } catch { return []; } };
const savePeaRend   = (v) => localStorage.setItem(PEA_REND_KEY,  JSON.stringify(v));

const LIVRET_HIST_KEY = 'budget:livret:historique';
const PEA_HIST_KEY    = 'budget:pea:historique';
const getLivretHist  = () => { try { const s = localStorage.getItem(LIVRET_HIST_KEY); return s ? JSON.parse(s) : []; } catch { return []; } };
const saveLivretHist = (v) => localStorage.setItem(LIVRET_HIST_KEY, JSON.stringify(v));
const getPeaHist     = () => { try { const s = localStorage.getItem(PEA_HIST_KEY);    return s ? JSON.parse(s) : []; } catch { return []; } };
const savePeaHist    = (v) => localStorage.setItem(PEA_HIST_KEY,    JSON.stringify(v));

// ─── HOOK STORAGE ────────────────────────────────────────────
function useMonthData(mi) {
  const key = storageKey(mi);

  const [data, setData] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch {}
    return mkMonth();
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      setData(stored ? JSON.parse(stored) : mkMonth());
    } catch {
      setData(mkMonth());
    }
  }, [key]);

  const updateData = useCallback((fn) => {
    setData(prev => {
      const next = { ...prev };
      fn(next);
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  return { data, loading: false, updateData };
}

// ─── COMPOSANTS PARTAGÉS ─────────────────────────────────────

// Logo BC
const Logo = ({ size = 38, src = '/icon-512.png' }) => (
  <img src={src} alt="Budget Club"
    style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0, display:'block' }} />
);

// Icône catégorie — cercle vert foncé
const CatIcon = ({ catId, size = 42, gray = false }) => {
  const cat = [...CATS, ...getCustomCats()].find(c => c.id === catId) || CATS[CATS.length - 1];
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%',
      background: gray ? 'rgba(28,41,28,0.12)' : C.vert,
      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
    }}>
      <i className={`ti ${cat.icon}`} style={{ fontSize: Math.round(size * 0.42), color: gray ? 'rgba(28,41,28,0.35)' : 'white' }} />
    </div>
  );
};

// Header avec logo + navigation mois (sans limite)
const MonthHeader = ({ mi, setMi, closed }) => {
  const prev = () => setMi(p => p.month === 0 ? { month:11, year:p.year-1 } : { month:p.month-1, year:p.year });
  const next = () => setMi(p => p.month === 11 ? { month:0, year:p.year+1 } : { month:p.month+1, year:p.year });
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 0', background:C.beige, flexShrink:0 }}>
      <img src="/logo-budget-club-accueil.png" style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover' }} />
      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
        <button onClick={prev}
          style={{ background:'none', border:'none', cursor:'pointer', color:C.vert, fontSize:20, padding:'0 3px' }}>‹</button>
        <span style={{ fontFamily:serif, fontSize:16, fontWeight:600, color:C.vert }}>{MONTHS[mi.month]} {mi.year}</span>
        {closed && <i className="ti ti-lock" style={{ fontSize:13, color:C.gold, marginLeft:2 }} />}
        <button onClick={next}
          style={{ background:'none', border:'none', cursor:'pointer', color:C.vert, fontSize:20, padding:'0 3px' }}>›</button>
      </div>
      <i className="ti ti-bell" style={{ fontSize:20, color:C.vert, width:38, textAlign:'right' }} />
    </div>
  );
};

// Barre de navigation 5 onglets
const TABS = [
  { id:'accueil',  icon:'ti-home',        label:'Accueil'  },
  { id:'budget',   icon:'ti-chart-bar',   label:'Budget'   },
  { id:'revenus',  icon:'ti-cash',        label:'Revenus'  },
  { id:'depenses', icon:'ti-list',        label:'Dépenses' },
  { id:'epargne',  icon:'ti-trending-up', label:'Épargne'  },
];

const BottomNav = ({ view, setView, m }) => {
  const rev      = m.revenues.reduce((s,r) => s + (r.amount||0), 0);
  const cb       = m.catBudgets || {};
  const bT       = m.bills.reduce((s,b) => s + billValue(b), 0);
  const tv       = CATS.filter(c => c.id !== 'epargne_livret' && c.id !== 'epargne_pea').reduce((s,c) => s + (cb[c.id]||0), 0);
  const nonV     = Math.max(0, rev - bT - tv);
  const badges   = { revenus: m.revenues.length > 0, budget: rev > 0 && tv > 0 && nonV < 1, depenses: !!m.closed };

  return (
    <div style={{ display:'flex', alignItems:'stretch', background:C.nav, flexShrink:0, padding:'8px 0 12px' }}>
      {TABS.map(t => {
        const active    = view === t.id || view === t.id + '_edit';
        const col       = active ? C.gold : 'rgba(201,169,110,0.4)';
        const hasBadge  = badges[t.id];
        return (
          <button key={t.id} onClick={() => setView(t.id)}
            style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, border:'none', background:'none', cursor:'pointer', padding:'2px 1px' }}>
            <div style={{ position:'relative', display:'inline-flex' }}>
              <i className={`ti ${t.icon}`} style={{ fontSize:20, color:col }} />
              {hasBadge && (
                <div style={{ position:'absolute', top:-4, right:-6, width:13, height:13, borderRadius:'50%', background:C.gold, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:7, color:C.nav, fontWeight:800, lineHeight:1 }}>✓</span>
                </div>
              )}
            </div>
            <span style={{ fontSize:9, color:col, fontWeight: active ? 600 : 400, fontFamily:sans }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// Bouton FAB contextuel
const FAB_ACTIONS = {
  accueil:  (setModal)        => setModal('dep'),
  budget:   (_, setView)      => setView('budget_edit'),
  revenus:  (setModal)        => setModal('rev'),
  depenses: (setModal, _, dt) => setModal(dt === 'depenses' ? 'dep' : 'bill'),
  epargne:  (setModal)        => setModal('dep'),
};

const FAB = ({ view, setModal, setView, depTab }) => (
  <button
    onClick={() => FAB_ACTIONS[view]?.(setModal, setView, depTab)}
    style={{
      position:'absolute', bottom:68, right:16,
      width:50, height:50, borderRadius:'50%',
      background:C.rose, border:'none', color:C.vert,
      fontSize:24, cursor:'pointer',
      display:'flex', alignItems:'center', justifyContent:'center',
      boxShadow:`0 4px 18px rgba(238,196,196,0.8)`, zIndex:10,
    }}>
    <i className="ti ti-plus" />
  </button>
);

// Triangle attention dépassement budget
const WarningTriangle = () => (
  <svg width="17" height="15" viewBox="0 0 18 16" style={{ flexShrink:0, marginBottom:-1 }}>
    <path d="M9 1L17 15H1L9 1Z" fill={C.rose} stroke={C.vert} strokeWidth="1" />
    <text x="9" y="13" textAnchor="middle" fontSize="9" fontWeight="700" fill={C.vert} fontFamily="DM Sans">!</text>
  </svg>
);

// Bandeau mois clôturé
const ClosedBanner = () => (
  <div style={{ background:C.vert, padding:'7px 16px', display:'flex', alignItems:'center', justifyContent:'center', gap:8, flexShrink:0, marginBottom:12 }}>
    <i className="ti ti-lock" style={{ fontSize:13, color:C.gold }} />
    <span style={{ fontFamily:sans, fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.85)' }}>Mois clôturé 🔒</span>
  </div>
);

// ─── MODALS ──────────────────────────────────────────────────

const ModalShell = ({ title, onClose, children }) => (
  <div style={{
    position:'absolute', inset:0, background:'rgba(28,41,28,0.5)',
    display:'flex', alignItems:'flex-end', borderRadius:20, zIndex:20,
  }}>
    <div style={{ background:C.card, borderRadius:'20px 20px 0 0', padding:'22px 18px', width:'100%', maxHeight:'88%', overflowY:'auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <span style={{ fontFamily:serif, fontSize:22, fontWeight:700, color:C.vert }}>{title}</span>
        <button onClick={onClose}
          style={{ background:C.roseL, border:'none', width:30, height:30, borderRadius:'50%', cursor:'pointer', fontSize:15, color:C.vert }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const SubmitBtn = ({ label, onClick }) => (
  <button onClick={onClick}
    style={{ width:'100%', padding:13, background:C.vert, color:'white', border:'none', borderRadius:11, fontFamily:sans, fontSize:14, fontWeight:600, cursor:'pointer' }}>
    {label}
  </button>
);

// Modal Nouvelle dépense
const ICON_CHOICES = [
  'ti-tag','ti-star','ti-wallet','ti-music','ti-device-tv',
  'ti-paw','ti-baby-carriage','ti-shirt','ti-tool','ti-phone',
];

export const AddExpenseModal = ({ onAdd, onUpdate, initial, onClose }) => {
  const isEdit = !!initial;
  const [form, setForm]             = useState(
    initial
      ? { amount: String(initial.amount), cat: initial.cat, name: initial.name || '', date: initial.date || new Date().toISOString().split('T')[0] }
      : { amount:'', cat:'', name:'', date: new Date().toISOString().split('T')[0] }
  );
  const [customCats, setCustomCats] = useState(() => getCustomCats());
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('ti-tag');

  const allCats = [...CATS, ...customCats];
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = () => {
    const a = parseFloat(form.amount);
    if (!a || !form.cat) return;
    if (isEdit) {
      onUpdate({ ...initial, name:form.name, amount:a, cat:form.cat, date:form.date });
    } else {
      onAdd({ id:'e'+Date.now(), name:form.name, amount:a, cat:form.cat, date:form.date });
    }
    onClose();
  };

  const addCustomCat = () => {
    if (!newCatName.trim()) return;
    const newCat = { id:'custom_'+Date.now(), label:newCatName.trim(), icon:newCatIcon };
    const updated = [...customCats, newCat];
    setCustomCats(updated);
    saveCustomCats(updated);
    upd('cat', newCat.id);
    setNewCatName('');
    setShowNewCat(false);
  };

  return (
    <ModalShell title={isEdit ? 'Modifier la dépense' : 'Nouvelle dépense'} onClose={onClose}>
      <div style={{ marginBottom:14 }}>
        <Label>Montant</Label>
        <input type="number" inputMode="decimal" step="0.01" placeholder="0,00" value={form.amount}
          onChange={e => upd('amount', e.target.value)}
          style={{ width:'100%', fontFamily:serif, fontSize:36, fontWeight:700, border:'none', borderBottom:`2px solid ${C.rose}`, outline:'none', padding:'4px 0', background:'transparent', color:C.vert }} />
      </div>
      <div style={{ marginBottom:14 }}>
        <Label>Catégorie</Label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
          {allCats.map(c => (
            <span key={c.id} onClick={() => upd('cat', c.id)}
              style={{ padding:'5px 11px', borderRadius:20, fontFamily:sans, fontSize:11, cursor:'pointer',
                border:`1.5px solid ${form.cat === c.id ? C.vert : 'rgba(28,41,28,0.15)'}`,
                background: form.cat === c.id ? C.vert : C.roseL,
                color: form.cat === c.id ? 'white' : C.vert }}>
              {c.label}
            </span>
          ))}
        </div>
        {showNewCat ? (
          <div style={{ padding:12, background:C.roseL, borderRadius:10, border:`1px solid ${C.rose}` }}>
            <input placeholder="Nom de la catégorie" value={newCatName} onChange={e => setNewCatName(e.target.value)}
              style={{ width:'100%', padding:'7px 10px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:sans, color:C.vert, background:'white', marginBottom:8 }} />
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
              {ICON_CHOICES.map(icon => (
                <div key={icon} onClick={() => setNewCatIcon(icon)}
                  style={{ width:34, height:34, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
                    background: newCatIcon === icon ? C.vert : 'white',
                    border:`1.5px solid ${newCatIcon === icon ? C.vert : C.border}` }}>
                  <i className={`ti ${icon}`} style={{ fontSize:16, color: newCatIcon === icon ? 'white' : C.muted }} />
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={addCustomCat}
                style={{ flex:1, padding:9, background:C.vert, color:'white', border:'none', borderRadius:8, fontFamily:sans, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Ajouter
              </button>
              <button onClick={() => setShowNewCat(false)}
                style={{ padding:'9px 12px', background:'white', border:`1px solid ${C.rose}`, borderRadius:8, cursor:'pointer', color:C.vert, fontFamily:sans }}>✕</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowNewCat(true)}
            style={{ padding:'5px 12px', background:'none', border:`1.5px dashed rgba(28,41,28,0.2)`, borderRadius:20, fontFamily:sans, fontSize:11, color:C.muted, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5 }}>
            <i className="ti ti-plus" style={{ fontSize:11 }} /> Ajouter une catégorie
          </button>
        )}
      </div>
      <div style={{ display:'flex', gap:10, marginBottom:16 }}>
        <div style={{ flex:1 }}><Label>Nom</Label><TextInput placeholder="ex : Carrefour" value={form.name} onChange={e => upd('name', e.target.value)} /></div>
        <div style={{ flex:1 }}><Label>Date</Label><DateInput value={form.date} onChange={e => upd('date', e.target.value)} /></div>
      </div>
      <SubmitBtn label={isEdit ? 'Modifier la dépense' : 'Valider la dépense'} onClick={submit} />
    </ModalShell>
  );
};

// Modal Ajouter revenu
export const AddRevenuModal = ({ onAdd, onClose }) => {
  const [form, setForm] = useState({ name:'', amount:'' });
  const submit = () => {
    const a = parseFloat(form.amount);
    if (!a || !form.name) return;
    onAdd({ id:'r'+Date.now(), name:form.name, amount:a });
    onClose();
  };
  return (
    <ModalShell title="Ajouter un revenu" onClose={onClose}>
      <div style={{ marginBottom:14 }}><Label>Source</Label><TextInput placeholder="ex : Salaire, Virement..." value={form.name} onChange={e => setForm(p => ({...p, name:e.target.value}))} /></div>
      <div style={{ marginBottom:20 }}>
        <Label>Montant</Label>
        <input type="number" inputMode="decimal" step="0.01" placeholder="0,00" value={form.amount}
          onChange={e => setForm(p => ({...p, amount:e.target.value}))}
          style={{ width:'100%', fontFamily:serif, fontSize:36, fontWeight:700, border:'none', borderBottom:`2px solid ${C.rose}`, outline:'none', padding:'4px 0', background:'transparent', color:C.vert }} />
      </div>
      <SubmitBtn label="Ajouter le revenu" onClick={submit} />
    </ModalShell>
  );
};

// Modal Ajouter facture
export const AddBillModal = ({ onAdd, onClose }) => {
  const [form, setForm] = useState({ name:'', amount:'' });
  const submit = () => {
    const a = parseFloat(form.amount);
    if (!a || !form.name) return;
    onAdd({ id:'b'+Date.now(), name:form.name, amount:a, realAmount:a, paid:false, paidDate:'' });
    onClose();
  };
  return (
    <ModalShell title="Ajouter une facture" onClose={onClose}>
      <div style={{ marginBottom:14 }}><Label>Nom de la facture</Label><TextInput placeholder="ex : EDF, Loyer..." value={form.name} onChange={e => setForm(p => ({...p, name:e.target.value}))} /></div>
      <div style={{ marginBottom:20 }}>
        <Label>Montant</Label>
        <input type="number" inputMode="decimal" step="0.01" placeholder="0,00" value={form.amount}
          onChange={e => setForm(p => ({...p, amount:e.target.value}))}
          style={{ width:'100%', fontFamily:serif, fontSize:36, fontWeight:700, border:'none', borderBottom:`2px solid ${C.rose}`, outline:'none', padding:'4px 0', background:'transparent', color:C.vert }} />
      </div>
      <SubmitBtn label="Ajouter la facture" onClick={submit} />
    </ModalShell>
  );
};

// Petits helpers UI
const Label = ({ children }) => (
  <div style={{ fontFamily:sans, fontSize:10, fontWeight:600, letterSpacing:1, textTransform:'uppercase', color:C.muted, marginBottom:5 }}>{children}</div>
);
const TextInput = (props) => (
  <input {...props} style={{ width:'100%', padding:'9px 12px', border:`1px solid ${C.border}`, borderRadius:10, fontSize:14, color:C.vert, background:'white', fontFamily:sans }} />
);
const DateInput = (props) => (
  <input type="date" {...props} style={{ width:'100%', padding:'9px 10px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, color:C.vert, background:'white', fontFamily:sans }} />
);

// Modal Ajouter rendement PEA
export const AddPeaRendementModal = ({ onAdd, onClose }) => {
  const [form, setForm] = useState({ montant:'', pct:'', date: new Date().toISOString().split('T')[0] });
  const submit = () => {
    const a = parseFloat(form.montant);
    if (!a) return;
    onAdd({ id:'pr'+Date.now(), montant:a, pct:parseFloat(form.pct)||0, date:form.date });
    onClose();
  };
  return (
    <ModalShell title="Ajouter un rendement" onClose={onClose}>
      <div style={{ marginBottom:14 }}>
        <Label>Montant du rendement (€)</Label>
        <input type="number" inputMode="decimal" step="0.01" placeholder="0,00" value={form.montant}
          onChange={e => setForm(p => ({...p, montant:e.target.value}))}
          style={{ width:'100%', fontFamily:serif, fontSize:36, fontWeight:700, border:'none', borderBottom:`2px solid ${C.rose}`, outline:'none', padding:'4px 0', background:'transparent', color:C.vert }} />
      </div>
      <div style={{ display:'flex', gap:10, marginBottom:16 }}>
        <div style={{ flex:1 }}>
          <Label>Performance (%)</Label>
          <input type="number" step="0.01" placeholder="0,00" value={form.pct}
            onChange={e => setForm(p => ({...p, pct:e.target.value}))}
            style={{ width:'100%', padding:'9px 12px', border:`1px solid ${C.border}`, borderRadius:10, fontSize:14, color:C.vert, background:'white', fontFamily:sans }} />
        </div>
        <div style={{ flex:1 }}><Label>Date</Label><DateInput value={form.date} onChange={e => setForm(p => ({...p, date:e.target.value}))} /></div>
      </div>
      <SubmitBtn label="Ajouter le rendement" onClick={submit} />
    </ModalShell>
  );
};

// ─── VUES ────────────────────────────────────────────────────

// Vue ACCUEIL
export function AccueilView({ m, mi, setMi, setView, updateData }) {
  const [confirmClose, setConfirmClose] = useState(false);
  const rev       = m.revenues.reduce((s,r) => s + (r.amount||0), 0);
  const allBills  = m.bills.filter(b => b.selected !== false);
  const bT        = allBills.reduce((s,b) => s + billValue(b), 0);
  const paidBills = allBills.filter(b => b.paid);
  const paidAmt   = paidBills.reduce((s,b) => s + billValue(b), 0);
  const pN = paidBills.length, bN = allBills.length;
  const eT   = m.expenses.filter(e => e.cat !== 'epargne_livret' && e.cat !== 'epargne_pea').reduce((s,e) => s + (e.amount||0), 0);
  const epg  = m.expenses.filter(e => (e.cat === 'epargne_livret' || e.cat === 'epargne_pea')).reduce((s,e) => s + (e.amount||0), 0);
  const reste = Math.round((rev - bT - eT - epg) * 100) / 100;
  const pp    = rev > 0 ? Math.min(100, Math.round((bT + eT + epg) / rev * 100)) : 0;

  return (
    <>
      <MonthHeader mi={mi} setMi={setMi} closed={m.closed} />
      {m.closed && <ClosedBanner />}
      <div style={{ padding:'12px 16px 0', background:C.beige, flexShrink:0 }}>
        {/* Card Reste à dépenser */}
        <div style={{ background:C.rose, borderRadius:16, padding:'20px 20px 16px', textAlign:'center', marginBottom:12 }}>
          <div style={{ fontFamily:sans, fontSize:10, fontWeight:600, letterSpacing:2, textTransform:'uppercase', color:C.vert, marginBottom:6 }}>Reste à dépenser</div>
          {rev === 0
            ? <div style={{ fontFamily:serif, fontSize:20, fontStyle:'italic', color:C.muted, lineHeight:1.3 }}>Revenus non saisis</div>
            : <div style={{ fontFamily:serif, fontSize:48, fontWeight:700, color:C.vert, lineHeight:1 }}>{fmtR(reste)}</div>
          }
          <div style={{ height:4, background:'rgba(28,41,28,0.15)', borderRadius:2, marginTop:12, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pp}%`, background:C.vert, borderRadius:2 }} />
          </div>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'0 16px 12px', background:C.beige }}>
        {/* 4 mini-cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          {[
            { label:'Revenus',  val:fmtR(rev), icon:'ti-credit-card',  vw:'revenus' },
            { label:'Factures', val:`${fmtP(paidAmt)} / ${fmtP(bT)}`, sub:`${pN}/${bN} prélevées`, icon:'ti-file-invoice', vw:'depenses' },
            { label:'Dépenses', val:fmtR(eT),  icon:'ti-shopping-bag', vw:'depenses' },
            { label:'Épargne',  val:fmtR(epg), icon:'ti-pig-money',    vw:'epargne'  },
          ].map(c => (
            <div key={c.label} onClick={() => setView(c.vw)}
              style={{ background:C.card, borderRadius:14, padding:14, border:`0.5px solid ${C.border}`, cursor:'pointer' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontFamily:sans, fontSize:11, color:C.muted, fontWeight:500 }}>{c.label}</span>
                <i className={`ti ${c.icon}`} style={{ fontSize:18, color:'rgba(28,41,28,0.25)' }} />
              </div>
              <div style={{ fontFamily:serif, fontSize:c.sub ? 18 : 22, fontWeight:600, color:C.vert }}>{c.val}</div>
              {c.sub && <div style={{ fontFamily:sans, fontSize:10, color:C.muted, marginTop:2 }}>{c.sub}</div>}
            </div>
          ))}
        </div>
        {/* Citation */}
        <div style={{ background:C.vert, borderRadius:14, padding:'18px 20px', textAlign:'center' }}>
          <div style={{ fontFamily:serif, fontSize:14, fontStyle:'italic', color:'rgba(255,255,255,0.82)', lineHeight:1.6 }}>
            Un bon budget est la première étape vers la liberté financière.
          </div>
          <div style={{ marginTop:8, color:C.gold, fontSize:14 }}>❧</div>
        </div>

        {/* Clôture du mois */}
        <div style={{ paddingTop:12 }}>
          {m.closed ? (
            <button onClick={() => updateData(mm => { mm.closed = false; })}
              style={{ width:'100%', padding:'10px 0', background:C.rose, border:'none', borderRadius:10, fontFamily:sans, fontSize:13, fontWeight:600, color:C.vert, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <i className="ti ti-lock-open" style={{ fontSize:15 }} /> Réouvrir le mois
            </button>
          ) : confirmClose ? (
            <div style={{ background:C.roseL, border:`1px solid ${C.rose}`, borderRadius:10, padding:'12px 14px' }}>
              <div style={{ fontFamily:sans, fontSize:12, color:C.vert, marginBottom:10, textAlign:'center' }}>
                Confirmer la clôture ? Cette action verrouille le mois.
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => { updateData(mm => { mm.closed = true; }); setConfirmClose(false); }}
                  style={{ flex:1, padding:9, background:C.vert, color:'white', border:'none', borderRadius:8, fontFamily:sans, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  Confirmer
                </button>
                <button onClick={() => setConfirmClose(false)}
                  style={{ padding:'9px 14px', background:'white', border:`1px solid ${C.rose}`, borderRadius:8, cursor:'pointer', color:C.vert, fontFamily:sans, fontSize:13 }}>
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmClose(true)}
              style={{ width:'100%', padding:'10px 0', background:'none', border:`1.5px solid rgba(28,41,28,0.25)`, borderRadius:10, fontFamily:sans, fontSize:13, fontWeight:500, color:C.vert, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <i className="ti ti-lock" style={{ fontSize:15 }} /> Clôturer le mois
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// Vue BUDGET
export function BudgetView({ m, mi, setMi, setView, updateData }) {
  const cb   = m.catBudgets || {};
  const [customCats, setCustomCats]       = useState(getCustomCats);
  const [showEnv, setShowEnv]             = useState(false);
  const [envName, setEnvName]             = useState('');
  const [envIcon, setEnvIcon]             = useState('ti-tag');
  const [confirmDelCat, setConfirmDelCat] = useState(null);

  const allCatList = [...CATS.filter(c => c.id !== 'epargne_livret' && c.id !== 'epargne_pea'), ...customCats];
  const cwb  = allCatList.filter(c => cb[c.id]);
  const tv   = cwb.reduce((s,c) => s + (cb[c.id]||0), 0);
  const rev  = m.revenues.reduce((s,r) => s + (r.amount||0), 0);
  const bT   = m.bills.reduce((s,b) => s + billValue(b), 0);
  const nonV = Math.max(0, rev - bT - tv);
  const done = tv > 0 && nonV < 1;

  const addEnv = () => {
    if (!envName.trim()) return;
    const newCat = { id:'custom_'+Date.now(), label:envName.trim(), icon:envIcon };
    const updated = [...customCats, newCat];
    saveCustomCats(updated);
    setCustomCats(updated);
    setEnvName(''); setShowEnv(false);
  };

  return (
    <>
      <MonthHeader mi={mi} setMi={setMi} closed={m.closed} />
      {m.closed && <ClosedBanner />}
      <div style={{ textAlign:'center', padding:'2px 0 8px', fontFamily:serif, fontSize:20, fontWeight:600, color:C.vert }}>Budget</div>
      <div style={{ flex:1, overflowY:'auto', padding:'0 16px 12px', background:C.beige }}>
        {/* Card état budget */}
        <div onClick={() => setView('budget_edit')}
          style={{ background:C.vert, borderRadius:14, padding:'14px 18px', marginBottom:16, marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <i className={`ti ${done ? 'ti-circle-check' : 'ti-hourglass'}`} style={{ fontSize:16, color: done ? C.gold : C.rose }} />
            </div>
            <div>
              <div style={{ fontFamily:sans, fontSize:10, fontWeight:600, letterSpacing:1.5, color:'rgba(255,255,255,0.55)', textTransform:'uppercase' }}>
                {done ? 'Budget terminé' : 'Budget en cours'}
              </div>
              <div style={{ fontFamily:serif, fontSize:26, fontWeight:700, color:'white', lineHeight:1.1 }}>
                {fmtP(nonV)} <span style={{ fontSize:15, fontWeight:400, color:'rgba(255,255,255,0.55)' }}>à répartir</span>
              </div>
            </div>
          </div>
          <i className="ti ti-chevron-right" style={{ fontSize:18, color:'rgba(255,255,255,0.4)' }} />
        </div>

        {/* Catégories avec budget */}
        {cwb.map(cat => {
          const sp = m.expenses.filter(e => e.cat === cat.id).reduce((s,e) => s + (e.amount||0), 0);
          const bg = cb[cat.id] || 0;
          const pt = bg > 0 ? Math.min(100, Math.round(sp / bg * 100)) : 0;
          const ov = bg > 0 && sp > bg;
          const isCustom = cat.id.startsWith('custom_');
          if (confirmDelCat === cat.id) {
            return (
              <div key={cat.id} style={{ background:C.roseL, borderRadius:12, marginBottom:4, padding:'11px 14px', border:`1px solid ${C.rose}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontFamily:sans, fontSize:13, color:C.vert }}>
                  {isCustom ? 'Supprimer ' : 'Retirer le budget '}<strong>{cat.label}</strong> ?
                </span>
                <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                  <button onClick={() => {
                    if (isCustom) { const upd = customCats.filter(c => c.id !== cat.id); saveCustomCats(upd); setCustomCats(upd); }
                    updateData(mm => { mm.catBudgets = Object.fromEntries(Object.entries(mm.catBudgets || {}).filter(([k]) => k !== cat.id)); });
                    setConfirmDelCat(null);
                  }} style={{ padding:'6px 14px', background:C.vert, color:'white', border:'none', borderRadius:8, fontFamily:sans, fontSize:12, fontWeight:600, cursor:'pointer' }}>Oui</button>
                  <button onClick={() => setConfirmDelCat(null)}
                    style={{ padding:'6px 14px', background:'white', border:`1px solid ${C.rose}`, borderRadius:8, fontFamily:sans, fontSize:12, cursor:'pointer', color:C.vert }}>Non</button>
                </div>
              </div>
            );
          }
          return (
            <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:`0.5px solid ${C.border}` }}>
              <CatIcon catId={cat.id} size={44} />
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontFamily:sans, fontSize:14, fontWeight:500, color:C.text }}>{cat.label}</span>
                    {ov && <WarningTriangle />}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontFamily:sans, fontSize:12, color: ov ? '#C0392B' : C.muted }}>{fmtR(sp)} / {fmtP(bg)}</span>
                    {!m.closed && (
                      <button onClick={() => setConfirmDelCat(cat.id)}
                        style={{ background:'none', border:'none', cursor:'pointer', padding:'1px 3px', color:'rgba(192,57,43,0.4)' }}>
                        <i className="ti ti-trash" style={{ fontSize:13 }} />
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ height:4, background:'rgba(28,41,28,0.1)', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pt}%`, background: ov ? C.rose : C.vert, borderRadius:2 }} />
                </div>
              </div>
            </div>
          );
        })}

        {/* Catégories sans budget mais avec dépenses */}
        {allCatList.filter(c => !cb[c.id]).map(cat => {
          const sp = m.expenses.filter(e => e.cat === cat.id).reduce((s,e) => s + (e.amount||0), 0);
          if (!sp) return null;
          const isCustom = cat.id.startsWith('custom_');
          if (confirmDelCat === cat.id) {
            return (
              <div key={cat.id} style={{ background:C.roseL, borderRadius:12, marginBottom:4, padding:'11px 14px', border:`1px solid ${C.rose}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontFamily:sans, fontSize:13, color:C.vert }}>Supprimer <strong>{cat.label}</strong> ?</span>
                <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                  <button onClick={() => {
                    const upd = customCats.filter(c => c.id !== cat.id);
                    saveCustomCats(upd); setCustomCats(upd);
                    updateData(mm => { mm.catBudgets = Object.fromEntries(Object.entries(mm.catBudgets || {}).filter(([k]) => k !== cat.id)); });
                    setConfirmDelCat(null);
                  }} style={{ padding:'6px 14px', background:C.vert, color:'white', border:'none', borderRadius:8, fontFamily:sans, fontSize:12, fontWeight:600, cursor:'pointer' }}>Oui</button>
                  <button onClick={() => setConfirmDelCat(null)}
                    style={{ padding:'6px 14px', background:'white', border:`1px solid ${C.rose}`, borderRadius:8, fontFamily:sans, fontSize:12, cursor:'pointer', color:C.vert }}>Non</button>
                </div>
              </div>
            );
          }
          return (
            <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:`0.5px solid ${C.border}` }}>
              <CatIcon catId={cat.id} size={44} gray />
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
                  <span style={{ fontFamily:sans, fontSize:14, color:'rgba(28,41,28,0.4)' }}>{cat.label}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontFamily:sans, fontSize:12, color:C.muted }}>{fmtR(sp)}</span>
                    {isCustom && !m.closed && (
                      <button onClick={() => setConfirmDelCat(cat.id)}
                        style={{ background:'none', border:'none', cursor:'pointer', padding:'1px 3px', color:'rgba(192,57,43,0.4)' }}>
                        <i className="ti ti-trash" style={{ fontSize:13 }} />
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ height:4, background:'rgba(28,41,28,0.07)', borderRadius:2 }} />
              </div>
            </div>
          );
        })}

        {/* Ajouter une enveloppe */}
        {!m.closed && (
          showEnv ? (
            <div style={{ marginTop:12, padding:12, background:C.roseL, borderRadius:10, border:`1px solid ${C.rose}` }}>
              <input placeholder="Nom de l'enveloppe" value={envName} onChange={e => setEnvName(e.target.value)}
                style={{ width:'100%', padding:'7px 10px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:sans, color:C.vert, background:'white', marginBottom:8 }} />
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                {ICON_CHOICES.map(icon => (
                  <div key={icon} onClick={() => setEnvIcon(icon)}
                    style={{ width:34, height:34, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
                      background: envIcon === icon ? C.vert : 'white', border:`1.5px solid ${envIcon === icon ? C.vert : C.border}` }}>
                    <i className={`ti ${icon}`} style={{ fontSize:16, color: envIcon === icon ? 'white' : C.muted }} />
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={addEnv}
                  style={{ flex:1, padding:9, background:C.vert, color:'white', border:'none', borderRadius:8, fontFamily:sans, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  Ajouter
                </button>
                <button onClick={() => setShowEnv(false)}
                  style={{ padding:'9px 12px', background:'white', border:`1px solid ${C.rose}`, borderRadius:8, cursor:'pointer', color:C.vert, fontFamily:sans }}>✕</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowEnv(true)}
              style={{ marginTop:12, width:'100%', padding:'9px 0', background:'none', border:`1.5px dashed rgba(28,41,28,0.2)`, borderRadius:10, fontFamily:sans, fontSize:12, color:C.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <i className="ti ti-plus" style={{ fontSize:13 }} /> Ajouter une enveloppe
            </button>
          )
        )}
      </div>
    </>
  );
}

// Vue BUDGET EDIT (Non ventilé par catégorie)
export function BudgetEditView({ m, updateData, setView }) {
  const cb              = m.catBudgets || {};
  const rev             = m.revenues.reduce((s,r) => s + (r.amount||0), 0);
  const bT              = m.bills.reduce((s,b) => s + billValue(b), 0);
  const rpe             = rev - bT;
  const [vals, setVals] = useState({ ...cb });
  const [saved, setSaved] = useState(false);
  const debounceRef       = useRef(null);
  const [customCats, setCustomCats]         = useState(getCustomCats);
  const [confirmDelEdit, setConfirmDelEdit] = useState(null);
  const [removedFromEdit, setRemovedFromEdit] = useState([]);
  const allCatList = [...CATS.filter(c => c.id !== 'epargne_livret' && c.id !== 'epargne_pea'), ...customCats]
    .filter(c => !removedFromEdit.includes(c.id));

  const tv  = allCatList.reduce((s,c) => s + (parseFloat(vals[c.id])||0), 0);
  const lft = rpe - tv;

  const handleChange = (catId, value) => {
    const next = { ...vals, [catId]: value };
    setVals(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const nb = {};
      allCatList.forEach(c => { if (next[c.id]) nb[c.id] = parseFloat(next[c.id]); });
      updateData(mm => { mm.catBudgets = nb; });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }, 500);
  };

  return (
    <div style={{ flex:1, overflowY:'auto', padding:'0 16px 16px', background:C.beige }}>
      {/* Card non ventilé */}
      <div style={{ background:C.rose, borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:sans, fontSize:12, color:C.vert, fontWeight:500 }}>Reste à ventiler sur {fmtP(rpe)}</span>
          <span style={{ fontFamily:serif, fontSize:22, fontWeight:700, color: lft >= 0 ? C.vert : '#C0392B' }}>{fmtP(lft)}</span>
        </div>
        <div style={{ height:3, background:'rgba(28,41,28,0.15)', borderRadius:2, marginTop:8, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${rpe > 0 ? Math.min(100, Math.round(tv/rpe*100)) : 0}%`, background:C.vert, borderRadius:2 }} />
        </div>
      </div>
      {/* Inputs par catégorie */}
      {allCatList.map(c => {
        const isCustom = c.id.startsWith('custom_');
        if (confirmDelEdit === c.id) {
          return (
            <div key={c.id} style={{ background:C.roseL, borderRadius:10, marginBottom:4, padding:'10px 12px', border:`1px solid ${C.rose}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:sans, fontSize:13, color:C.vert }}>
                {isCustom ? 'Supprimer ' : 'Retirer '}<strong>{c.label}</strong> ?
              </span>
              <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                <button onClick={() => {
                  if (isCustom) { const upd = customCats.filter(x => x.id !== c.id); saveCustomCats(upd); setCustomCats(upd); }
                  setRemovedFromEdit(prev => [...prev, c.id]);
                  const next = { ...vals }; delete next[c.id]; setVals(next);
                  clearTimeout(debounceRef.current);
                  updateData(mm => { const nb = { ...(mm.catBudgets || {}) }; delete nb[c.id]; mm.catBudgets = nb; });
                  setConfirmDelEdit(null);
                }} style={{ padding:'6px 14px', background:C.vert, color:'white', border:'none', borderRadius:8, fontFamily:sans, fontSize:12, fontWeight:600, cursor:'pointer' }}>Oui</button>
                <button onClick={() => setConfirmDelEdit(null)}
                  style={{ padding:'6px 14px', background:'white', border:`1px solid ${C.rose}`, borderRadius:8, fontFamily:sans, fontSize:12, cursor:'pointer', color:C.vert }}>Non</button>
              </div>
            </div>
          );
        }
        return (
          <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:`0.5px solid ${C.border}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <CatIcon catId={c.id} size={36} />
              <span style={{ fontFamily:sans, fontSize:13, color:C.text }}>{c.label}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="number" placeholder="—" value={vals[c.id] || ''}
                onChange={e => handleChange(c.id, e.target.value)}
                disabled={m.closed}
                style={{ width:75, padding:'6px 8px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:13, textAlign:'right', background: m.closed ? 'rgba(28,41,28,0.05)' : 'white', color:C.vert, fontFamily:sans }} />
              {!m.closed && (
                <button onClick={() => setConfirmDelEdit(c.id)}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:'2px 4px', color:'rgba(192,57,43,0.35)' }}>
                  <i className="ti ti-trash" style={{ fontSize:14 }} />
                </button>
              )}
            </div>
          </div>
        );
      })}
      {saved && (
        <div style={{ textAlign:'center', marginTop:14, fontFamily:sans, fontSize:12, color:'#2E7D32', fontWeight:500 }}>Sauvegardé ✓</div>
      )}
    </div>
  );
}

// Vue REVENUS
function RevenueRow({ r, i, onUpdate, onDelete, closed }) {
  const [editing, setEditing] = useState(null);
  const [nameVal, setNameVal] = useState(r.name);
  const [amtVal,  setAmtVal]  = useState(String(r.amount));

  const saveField = (field) => {
    if (field === 'name') onUpdate(i, { ...r, name: nameVal.trim() || r.name });
    else                  onUpdate(i, { ...r, amount: parseFloat(amtVal) || r.amount });
    setEditing(null);
  };
  const onKey = (e, field) => {
    if (e.key === 'Enter')  saveField(field);
    if (e.key === 'Escape') setEditing(null);
  };

  return (
    <div style={{ background:C.card, borderRadius:12, padding:'14px 18px', marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center', border:`0.5px solid ${C.border}` }}>
      {editing === 'name' ? (
        <input autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)}
          onBlur={() => saveField('name')} onKeyDown={e => onKey(e, 'name')}
          style={{ fontFamily:sans, fontSize:15, color:C.vert, border:'none', borderBottom:`1.5px solid ${C.vert}`, outline:'none', background:'transparent', flex:1, minWidth:0 }} />
      ) : (
        <span onClick={() => { if (closed) return; setNameVal(r.name); setEditing('name'); }}
          style={{ fontFamily:sans, fontSize:15, color:C.vert, cursor: closed ? 'default' : 'text', flex:1, minWidth:0 }}>{r.name}</span>
      )}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        {editing === 'amount' ? (
          <input autoFocus type="number" value={amtVal} onChange={e => setAmtVal(e.target.value)}
            onBlur={() => saveField('amount')} onKeyDown={e => onKey(e, 'amount')}
            style={{ fontFamily:serif, fontSize:20, fontWeight:600, color:C.vert, width:110, border:'none', borderBottom:`1.5px solid ${C.vert}`, outline:'none', background:'transparent', textAlign:'right' }} />
        ) : (
          <span onClick={() => { if (closed) return; setAmtVal(String(r.amount)); setEditing('amount'); }}
            style={{ fontFamily:serif, fontSize:20, fontWeight:600, color:C.vert, cursor: closed ? 'default' : 'text' }}>+{fmtR(r.amount)}</span>
        )}
        {!closed && <button onClick={() => onDelete(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(28,41,28,0.25)', fontSize:14, padding:2 }}>✕</button>}
      </div>
    </div>
  );
}

export function RevenusView({ m, mi, setMi, updateData }) {
  const rev = m.revenues.reduce((s,r) => s + (r.amount||0), 0);
  const del = (i)         => updateData(mm => { mm.revenues = mm.revenues.filter((_,idx) => idx !== i); });
  const upd = (i, updated) => updateData(mm => { mm.revenues = mm.revenues.map((r, idx) => idx === i ? updated : r); });

  return (
    <>
      <MonthHeader mi={mi} setMi={setMi} closed={m.closed} />
      {m.closed && <ClosedBanner />}
      <div style={{ textAlign:'center', padding:'2px 0 8px', fontFamily:serif, fontSize:20, fontWeight:600, color:C.vert }}>Revenus</div>
      {/* Total fixe en haut */}
      <div style={{ background:C.vert, flexShrink:0, padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontFamily:sans, fontSize:12, fontWeight:600, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,0.5)' }}>Total</span>
        <span style={{ fontFamily:serif, fontSize:30, fontWeight:700, color:'white' }}>{fmtR(rev)}</span>
      </div>
      {/* Liste scrollable */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 16px 80px', background:C.beige }}>
        {m.revenues.length === 0 && (
          <div style={{ textAlign:'center', padding:32, color:C.muted, fontFamily:sans, fontSize:13 }}>Aucun revenu saisi ce mois</div>
        )}
        {m.revenues.map((r, i) => (
          <RevenueRow key={r.id} r={r} i={i} onUpdate={upd} onDelete={del} closed={m.closed} />
        ))}
      </div>
    </>
  );
}

// Vue DÉPENSES + FACTURES
export function DepensesView({ m, mi, setMi, updateData, depTab, setDepTab }) {
  const exps    = m.expenses;
  const bills   = m.bills.filter(b => b.selected !== false);
  const unpaid  = bills.filter(b => !b.paid);
  const paid    = bills.filter(b =>  b.paid);
  const bT      = bills.reduce((s,b) => s + billValue(b), 0);
  const eT      = exps.reduce((s,e) => s + (e.amount||0), 0);
  const paidAmt = paid.reduce((s,b) => s + billValue(b), 0);
  const pN = paid.length, bN = bills.length;

  const rev   = m.revenues.reduce((s,r) => s + (r.amount||0), 0);
  const reste = Math.round((rev - bT - eT) * 100) / 100;

  const [xBill, setXBill]           = useState(null);
  const [billForm, setBillForm]     = useState({ amount:'', date:'' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editExp, setEditExp]       = useState(null);

  const clickBill = (realI) => {
    if (m.closed) return;
    setXBill(realI);
    setBillForm({ amount: m.bills[realI].realAmount || m.bills[realI].amount, date: new Date().toISOString().split('T')[0] });
  };
  const confBill = (realI) => {
    if (m.closed) return;
    updateData(mm => {
      mm.bills[realI] = { ...mm.bills[realI], paid:true, realAmount: parseFloat(billForm.amount)||mm.bills[realI].amount, paidDate: billForm.date };
    });
    setXBill(null);
  };
  const unchBill = (realI) => {
    if (m.closed) return;
    updateData(mm => { mm.bills[realI] = { ...mm.bills[realI], paid:false, paidDate:'' }; });
  };

  return (
    <>
      <MonthHeader mi={mi} setMi={setMi} closed={m.closed} />
      {m.closed && <ClosedBanner />}
      <div style={{ textAlign:'center', padding:'2px 0 4px', fontFamily:serif, fontSize:20, fontWeight:600, color:C.vert }}>Dépenses</div>
      {/* Switcher capsule */}
      <div style={{ padding:'10px 16px', background:C.beige, flexShrink:0, display:'flex', gap:10 }}>
        {[{id:'factures',label:'Factures'},{id:'depenses',label:'Dépenses'}].map(t => (
          <button key={t.id} onClick={() => setDepTab(t.id)}
            style={{ flex:1, padding:'10px 0', borderRadius:30, fontSize:13, fontWeight:700, cursor:'pointer',
              fontFamily:serif, letterSpacing:1, textTransform:'uppercase', transition:'all .2s',
              background: depTab === t.id ? C.vert : C.card,
              color:      depTab === t.id ? 'white' : C.vert,
              border:     `1.5px solid ${depTab === t.id ? C.vert : C.rose}` }}>
            {t.label}
          </button>
        ))}
      </div>

      {depTab === 'depenses' ? (
        <>
          {/* Card reste à dépenser */}
          <div style={{ background:C.vert, padding:'14px 18px', flexShrink:0, textAlign:'center' }}>
            <div style={{ fontFamily:sans, fontSize:9, fontWeight:600, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:4 }}>Reste à dépenser</div>
            {rev === 0
              ? <div style={{ fontFamily:serif, fontSize:18, fontStyle:'italic', color:'rgba(255,255,255,0.55)' }}>Revenus non saisis</div>
              : <div style={{ fontFamily:serif, fontSize:32, fontWeight:700, color:'white' }}>{fmtR(reste)}</div>
            }
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'8px 16px 80px', background:C.beige }}>
            {exps.length === 0 && <div style={{ textAlign:'center', padding:24, color:C.muted, fontFamily:sans, fontSize:13 }}>Aucune dépense ce mois</div>}
            {byDate(exps).map(e => {
              const cat = CATS.find(c => c.id === e.cat) || CATS[CATS.length-1];
              if (deleteConfirm === e.id) {
                return (
                  <div key={e.id} style={{ background:C.roseL, borderRadius:12, marginBottom:8, padding:'12px 14px', border:`1px solid ${C.rose}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontFamily:sans, fontSize:13, color:C.vert }}>Supprimer <strong>{e.name || cat.label}</strong>&nbsp;?</span>
                    <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                      <button onClick={() => { updateData(mm => { mm.expenses = mm.expenses.filter(x => x.id !== e.id); }); setDeleteConfirm(null); }}
                        style={{ padding:'6px 14px', background:C.vert, color:'white', border:'none', borderRadius:8, fontFamily:sans, fontSize:12, fontWeight:600, cursor:'pointer' }}>Oui</button>
                      <button onClick={() => setDeleteConfirm(null)}
                        style={{ padding:'6px 14px', background:'white', border:`1px solid ${C.rose}`, borderRadius:8, fontFamily:sans, fontSize:12, cursor:'pointer', color:C.vert }}>Non</button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={e.id} onClick={() => !m.closed && setEditExp(e)}
                  style={{ background:C.card, borderRadius:12, marginBottom:8, display:'flex', alignItems:'center', gap:12, padding:'12px 14px', border:`0.5px solid ${C.border}`, cursor: m.closed ? 'default' : 'pointer' }}>
                  <CatIcon catId={e.cat} size={38} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:sans, fontSize:13, fontWeight:500, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.name || cat.label}</div>
                    <div style={{ fontFamily:sans, fontSize:11, color:C.muted }}>{cat.label}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:serif, fontSize:16, fontWeight:600, color:'#C0392B' }}>-{fmtR(e.amount)}</div>
                    <div style={{ fontFamily:sans, fontSize:10, color:C.muted }}>{e.date ? new Date(e.date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : ''}</div>
                  </div>
                  {!m.closed && (
                    <button onClick={ev => { ev.stopPropagation(); setDeleteConfirm(e.id); }}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(28,41,28,0.22)', fontSize:16, padding:'2px 4px', flexShrink:0 }}>
                      <i className="ti ti-trash" />
                    </button>
                  )}
                </div>
              );
            })}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderTop:`2px solid ${C.border}`, marginTop:4 }}>
              <span style={{ fontFamily:sans, fontSize:13, fontWeight:600, color:C.vert }}>Total</span>
              <span style={{ fontFamily:serif, fontSize:22, fontWeight:700, color:C.vert }}>{fmtR(eT)}</span>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Card récap factures */}
          <div style={{ background:C.vert, padding:'14px 18px', flexShrink:0 }}>
            <div style={{ fontFamily:sans, fontSize:10, color:'rgba(255,255,255,0.5)', letterSpacing:1, textTransform:'uppercase', marginBottom:4 }}>{pN}/{bN} prélevées</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
              <span style={{ fontFamily:serif, fontSize:28, fontWeight:700, color:'white' }}>{fmtP(paidAmt)}</span>
              <span style={{ fontFamily:sans, fontSize:13, color:'rgba(255,255,255,0.5)' }}>/ {fmtP(bT)}</span>
            </div>
            <div style={{ height:4, background:'rgba(255,255,255,0.12)', borderRadius:2, marginTop:8, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${bT > 0 ? Math.round(paidAmt/bT*100) : 0}%`, background:C.rose, borderRadius:2 }} />
            </div>
          </div>
          {/* Liste unifiée — non cochées en haut, cochées en bas */}
          <div style={{ flex:1, overflowY:'auto', padding:'8px 16px 80px', background:C.beige }}>
            {unpaid.length > 0 && <div style={{ padding:'6px 0 8px' }}><span style={{ fontFamily:sans, fontSize:10, fontWeight:600, letterSpacing:1, textTransform:'uppercase', color:C.muted }}>À prélever — {unpaid.length}</span></div>}
            {unpaid.map((b) => (
              <div key={b.id} style={{ background:C.card, borderRadius:12, marginBottom:8, border:`0.5px solid ${C.border}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 14px' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:sans, fontSize:13, fontWeight:500, color:C.text }}>{b.name}</div>
                    <div style={{ fontFamily:sans, fontSize:10, color:C.muted, marginTop:2 }}>En attente · {fmtR(b.amount)}</div>
                  </div>
                  <div onClick={() => clickBill(m.bills.indexOf(b))}
                    style={{ width:28, height:28, borderRadius:'50%', background:C.roseL, border:`1.5px solid ${C.rose}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                    <i className="ti ti-check" style={{ fontSize:13, color:'#C8B4B4' }} />
                  </div>
                </div>
                {xBill === m.bills.indexOf(b) && (
                  <div style={{ padding:'0 14px 12px' }}>
                    <div style={{ background:C.roseL, border:`1px solid ${C.rose}`, borderRadius:10, padding:12 }}>
                      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                        <div style={{ flex:1 }}>
                          <Label>Montant réel</Label>
                          <input type="number" step="0.01" value={billForm.amount} onChange={e => setBillForm(p => ({...p, amount:e.target.value}))}
                            style={{ width:'100%', padding:8, border:`1px solid ${C.rose}`, borderRadius:7, fontSize:15, fontWeight:600, fontFamily:serif, color:C.vert, background:'white' }} />
                        </div>
                        <div style={{ flex:1 }}>
                          <Label>Date prélevée</Label>
                          <input type="date" value={billForm.date} onChange={e => setBillForm(p => ({...p, date:e.target.value}))}
                            style={{ width:'100%', padding:8, border:`1px solid ${C.rose}`, borderRadius:7, fontSize:12, color:C.vert, background:'white', fontFamily:sans }} />
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => confBill(m.bills.indexOf(b))}
                          style={{ flex:1, padding:9, background:C.vert, color:'white', border:'none', borderRadius:8, fontFamily:sans, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                          ✓ Confirmer prélevée
                        </button>
                        <button onClick={() => setXBill(null)}
                          style={{ padding:'9px 12px', background:'white', border:`1px solid ${C.rose}`, borderRadius:8, cursor:'pointer', color:C.vert, fontFamily:sans }}>✕</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {paid.length > 0 && (
              <div style={{ padding:`${unpaid.length > 0 ? '10px' : '6px'} 0 8px`, borderTop: unpaid.length > 0 ? `1px solid rgba(28,41,28,0.08)` : 'none', marginTop: unpaid.length > 0 ? 4 : 0 }}>
                <span style={{ fontFamily:sans, fontSize:10, fontWeight:600, letterSpacing:1, textTransform:'uppercase', color:C.muted }}>Prélevées — {paid.length}</span>
              </div>
            )}
            {paid.map((b) => {
              const ds = b.paidDate ? new Date(b.paidDate).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : null;
              return (
                <div key={b.id} style={{ background:C.card, borderRadius:12, marginBottom:8, border:`0.5px solid ${C.border}`, opacity:0.72 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:sans, fontSize:13, color:C.text }}>{b.name}</div>
                      <div style={{ fontFamily:sans, fontSize:10, color:C.muted, marginTop:2 }}>{ds ? `Prélevé le ${ds}` : 'Prélevée'} · {fmtR(b.realAmount||b.amount)}</div>
                    </div>
                    <div onClick={() => unchBill(m.bills.indexOf(b))}
                      style={{ width:28, height:28, borderRadius:'50%', background:C.vert, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                      <i className="ti ti-check" style={{ fontSize:13, color:'white' }} />
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderTop:`2px solid ${C.border}`, marginTop:6 }}>
              <span style={{ fontFamily:sans, fontSize:13, fontWeight:600, color:C.vert }}>Total projeté</span>
              <span style={{ fontFamily:serif, fontSize:22, fontWeight:700, color:C.vert }}>{fmtR(bT)}</span>
            </div>
          </div>
        </>
      )}
      {editExp && (
        <AddExpenseModal
          initial={editExp}
          onUpdate={updated => {
            updateData(mm => { mm.expenses = mm.expenses.map(x => x.id === updated.id ? updated : x); });
            setEditExp(null);
          }}
          onClose={() => setEditExp(null)}
        />
      )}
    </>
  );
}

// Graphique épargne SVG pur
const SavingsChart = ({ data, color, svgBg = 'white', title, onClose }) => {
  const [hover, setHover] = useState(null);
  const W = 300, H = 160, PL = 48, PR = 12, PT = 16, PB = 28;
  const iW = W - PL - PR, iH = H - PT - PB;
  const vals = data.map(d => d.value);
  const rawMin = data.length ? Math.min(...vals) : 0;
  const rawMax = data.length ? Math.max(...vals) : 1;
  // Échelle adaptée aux données — zoom sur la plage réelle ±0.5%
  const minV = data.length === 1 ? rawMin * 0.99 : (rawMin === rawMax ? rawMin * 0.995 : rawMin * 0.995);
  const maxV = data.length === 1 ? rawMax * 1.01 : (rawMin === rawMax ? rawMax * 1.005 : rawMax * 1.005);
  const range = maxV - minV || 1;
  const px = i => PL + (data.length < 2 ? iW / 2 : (i / (data.length - 1)) * iW);
  const py = v => data.length <= 1 ? PT + iH / 2 : PT + iH - ((v - minV) / range) * iH;
  const d0 = data.length >= 2 ? data.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(d.value)}`).join(' ') : '';
  return (
    <div style={{ position:'absolute', inset:0, background:'rgba(28,41,28,0.55)', zIndex:30, borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:C.beige, borderRadius:16, margin:16, padding:'18px 16px 14px', width:'100%', maxWidth:340 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ fontFamily:serif, fontSize:18, fontWeight:700, color:C.vert }}>{title}</span>
          <button onClick={onClose} style={{ background:C.roseL, border:'none', width:28, height:28, borderRadius:'50%', cursor:'pointer', fontSize:14, color:C.vert }}>✕</button>
        </div>
        {data.length === 0 ? (
          <div style={{ textAlign:'center', padding:24, color:C.muted, fontFamily:sans, fontSize:13 }}>Aucune donnée</div>
        ) : (
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:'block', background:svgBg, borderRadius:10 }}>
            {[0, 1, 2].map(i => (
              <line key={i} x1={PL} x2={W - PR} y1={PT + (i * iH / 2)} y2={PT + (i * iH / 2)} stroke="rgba(28,41,28,0.06)" strokeWidth={1} />
            ))}
            {data.length === 1 ? (
              <>
                <line x1={PL} x2={W - PR} y1={py(data[0].value)} y2={py(data[0].value)} stroke={color} strokeWidth={2} strokeDasharray="5 4" opacity={0.5} />
                <circle cx={px(0)} cy={py(data[0].value)} r={6} fill={color} stroke="white" strokeWidth={2} />
                <rect x={Math.max(PL, px(0) - 42)} y={Math.max(PT + 2, py(data[0].value) - 46)} width={84} height={36} rx={5} fill={C.vert} />
                <text x={Math.max(PL + 42, px(0))} y={Math.max(PT + 15, py(data[0].value) - 33)} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.65)" fontFamily="DM Sans, sans-serif">{data[0].date}</text>
                <text x={Math.max(PL + 42, px(0))} y={Math.max(PT + 30, py(data[0].value) - 18)} textAnchor="middle" fontSize={10} fontWeight="bold" fill="white" fontFamily="DM Sans, sans-serif">{fmtP(data[0].value)}</text>
                <text x={px(0)} y={H - 6} textAnchor="middle" fontSize={9} fill={C.muted} fontFamily="DM Sans, sans-serif">{data[0].label}</text>
              </>
            ) : (
              <>
                <path d={`${d0} L${px(data.length - 1)},${PT + iH} L${px(0)},${PT + iH} Z`} fill={color} fillOpacity={0.1} />
                <path d={d0} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                {data.map((d, i) => (
                  <circle key={i} cx={px(i)} cy={py(d.value)} r={hover === i ? 6 : 3.5} fill={color} stroke="white" strokeWidth={1.5}
                    style={{ cursor:'pointer' }}
                    onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                    onTouchStart={e => { e.preventDefault(); setHover(i); }} onTouchEnd={() => setTimeout(() => setHover(null), 1200)} />
                ))}
                {hover !== null && (() => {
                  const bx = Math.max(PL + 2, Math.min(W - PR - 84, px(hover) - 42));
                  const by = Math.max(PT + 2, py(data[hover].value) - 42);
                  return (
                    <g>
                      <rect x={bx} y={by} width={84} height={36} rx={5} fill={C.vert} />
                      <text x={bx + 42} y={by + 13} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.65)" fontFamily="DM Sans, sans-serif">{data[hover].date || data[hover].label}</text>
                      <text x={bx + 42} y={by + 28} textAnchor="middle" fontSize={10} fontWeight="bold" fill="white" fontFamily="DM Sans, sans-serif">{fmtP(data[hover].value)}</text>
                    </g>
                  );
                })()}
                {data.map((d, i) => (
                  (i % Math.ceil(data.length / 5) === 0 || i === data.length - 1) && (
                    <text key={i} x={px(i)} y={H - 6} textAnchor="middle" fontSize={9} fill={C.muted} fontFamily="DM Sans, sans-serif">{d.label}</text>
                  )
                ))}
                {[minV, minV + range / 3, minV + (2 * range) / 3, maxV].map((v, i) => (
                  <text key={i} x={PL - 4} y={py(v) + 4} textAnchor="end" fontSize={9} fill={C.muted} fontFamily="DM Sans, sans-serif">{Math.round(v).toLocaleString('fr-FR')}</text>
                ))}
              </>
            )}
          </svg>
        )}
      </div>
    </div>
  );
};

// Panel détail historique épargne
const SavingsDetail = ({ type, histItems, soldeItem, onSaveHist, onDeleteHist, onSaveSolde, onAdd, onClose }) => {
  const [editId, setEditId]     = useState(null);
  const [editVal, setEditVal]   = useState('');
  const [editSolde, setEditSolde] = useState(false);
  const [soldeVal, setSoldeVal] = useState('');
  const [flash, setFlash]       = useState(false);

  const showFlash = () => { setFlash(true); setTimeout(() => setFlash(false), 1000); };

  const doSaveHist = (id, val) => {
    onSaveHist(id, parseFloat(val) || 0);
    setEditId(null);
    showFlash();
  };
  const doSaveSolde = (val) => {
    onSaveSolde(parseFloat(val) || 0);
    setEditSolde(false);
    showFlash();
  };

  const sorted = [...histItems].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div style={{ position:'absolute', inset:0, background:'rgba(28,41,28,0.5)', zIndex:30, borderRadius:20, display:'flex', alignItems:'flex-end' }}>
      <div style={{ background:C.card, borderRadius:'20px 20px 0 0', width:'100%', maxHeight:'78%', display:'flex', flexDirection:'column', padding:'20px 18px 16px' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexShrink:0 }}>
          <span style={{ fontFamily:serif, fontSize:19, fontWeight:700, color:C.vert }}>
            {type === 'livret' ? 'Détail Livret A' : 'Détail PEA'}
          </span>
          <button onClick={onClose} style={{ background:C.roseL, border:'none', width:28, height:28, borderRadius:'50%', cursor:'pointer', fontSize:14, color:C.vert }}>✕</button>
        </div>

        {flash && <div style={{ textAlign:'center', fontFamily:sans, fontSize:12, color:'#2E7D32', fontWeight:600, marginBottom:8, flexShrink:0 }}>Sauvegardé ✓</div>}

        <div style={{ overflowY:'auto', flex:1 }}>

          {/* Points historiques — plus récent en haut */}
          {sorted.length === 0 && (
            <div style={{ textAlign:'center', padding:'14px 0', color:C.muted, fontFamily:sans, fontSize:13 }}>Aucune mise à jour enregistrée</div>
          )}
          {sorted.map(item => (
            <div key={item.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 0', borderBottom:`0.5px solid ${C.border}` }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:sans, fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:.5 }}>{item.label || 'Mise à jour'}</div>
                <div style={{ fontFamily:sans, fontSize:12, color:C.vert, marginTop:1 }}>{item.date ? item.date.split('-').reverse().join('/') : '—'}</div>
              </div>
              {!item.readOnly && editId === item.id ? (
                <input autoFocus type="number" step="0.01" value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onBlur={() => doSaveHist(item.id, editVal)}
                  onKeyDown={e => e.key === 'Enter' && doSaveHist(item.id, editVal)}
                  style={{ width:90, padding:'5px 8px', border:`1px solid ${C.border}`, borderRadius:7, fontFamily:serif, fontSize:15, color:C.vert, textAlign:'right' }} />
              ) : (
                <span style={{ fontFamily:serif, fontSize:16, fontWeight:600, color: item.readOnly ? C.muted : C.vert, flexShrink:0 }}>{fmtR(item.montant)}</span>
              )}
              {!item.readOnly && (
                <>
                  <button onClick={() => { setEditId(item.id); setEditVal(String(item.montant)); }}
                    style={{ background:'none', border:'none', cursor:'pointer', padding:'2px 4px', color:C.muted, flexShrink:0 }}>
                    <i className="ti ti-pencil" style={{ fontSize:13 }} />
                  </button>
                  <button onClick={() => onDeleteHist(item.id)}
                    style={{ background:'none', border:'none', cursor:'pointer', padding:'2px 4px', color:'rgba(192,57,43,0.45)', flexShrink:0 }}>
                    <i className="ti ti-trash" style={{ fontSize:13 }} />
                  </button>
                </>
              )}
            </div>
          ))}

          {/* Solde initial — en bas avec séparateur */}
          <div style={{ borderTop:`1.5px solid ${C.border}`, marginTop:10, paddingTop:10 }}>
            <div style={{ fontFamily:sans, fontSize:10, fontWeight:600, letterSpacing:1, textTransform:'uppercase', color:C.muted, marginBottom:6 }}>Solde initial</div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ flex:1, fontFamily:sans, fontSize:12, color:C.vert }}>
                {soldeItem.date ? soldeItem.date.split('-').reverse().join('/') : '—'}
              </div>
              {editSolde ? (
                <input autoFocus type="number" step="0.01" value={soldeVal}
                  onChange={e => setSoldeVal(e.target.value)}
                  onBlur={() => doSaveSolde(soldeVal)}
                  onKeyDown={e => e.key === 'Enter' && doSaveSolde(soldeVal)}
                  style={{ width:90, padding:'5px 8px', border:`1px solid ${C.border}`, borderRadius:7, fontFamily:serif, fontSize:15, color:C.vert, textAlign:'right' }} />
              ) : (
                <span style={{ fontFamily:serif, fontSize:16, fontWeight:600, color:C.vert, flexShrink:0 }}>{fmtR(soldeItem.montant)}</span>
              )}
              <button onClick={() => { setEditSolde(true); setSoldeVal(String(soldeItem.montant)); }}
                style={{ background:'none', border:'none', cursor:'pointer', padding:'2px 4px', color:C.muted, flexShrink:0 }}>
                <i className="ti ti-pencil" style={{ fontSize:13 }} />
              </button>
            </div>
          </div>

        </div>

        {type === 'pea' && onAdd && (
          <button onClick={onAdd}
            style={{ marginTop:10, width:'100%', padding:'8px 0', background:'none', border:`1.5px dashed rgba(28,41,28,0.2)`, borderRadius:10, fontFamily:sans, fontSize:12, color:C.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, flexShrink:0 }}>
            <i className="ti ti-plus" style={{ fontSize:12 }} /> Ajouter un rendement
          </button>
        )}
      </div>
    </div>
  );
};

// Vue ÉPARGNE — navigation année indépendante
export function EpargneView({ currentYear }) {
  const [epargneYear, setEpargneYear] = useState(currentYear);
  const [months, setMonths] = useState(() => loadYearData(currentYear));

  // Livret A
  const [livretSolde, setLivretSolde] = useState(() => getLivretSolde() || { amount: 1938.37, date: '2026-06-05' });
  const [editSolde, setEditSolde]     = useState(false);
  const [soldeForm, setSoldeForm]     = useState({ amount:'', date:'' });

  // PEA solde initial
  const [peaSolde, setPeaSolde]       = useState(() => getPeaSolde() || { montant:1841.72, rendement:259.24, pct:16.48, date:'2026-06-01' });
  const [editPeaSolde, setEditPeaSolde] = useState(false);
  const [peaSoldeForm, setPeaSoldeForm] = useState({ montant:'', rendement:'', pct:'', date:'' });

  // PEA rendements
  const [peaRend, setPeaRend]         = useState(() => getPeaRend());
  const [showPeaRend, setShowPeaRend] = useState(false);
  const [chartType, setChartType]     = useState(null); // 'livret' | 'pea'
  const [detailType, setDetailType]   = useState(null); // 'livret' | 'pea'
  const [epargneFlash, setEpargneFlash] = useState(null); // 'livret' | 'pea'
  // Historique des mises à jour solde
  const [livretHist, setLivretHist] = useState(() => getLivretHist());
  const [peaHist, setPeaHist]       = useState(() => getPeaHist());

  useEffect(() => {
    if (!getLivretSolde()) saveLivretSolde(livretSolde);
    if (!getPeaSolde())    savePeaSolde(peaSolde);
  }, []);

  useEffect(() => {
    setMonths(loadYearData(epargneYear));
  }, [epargneYear]);

  const prevYear = () => setEpargneYear(y => y - 1);
  const nextYear = () => setEpargneYear(y => y + 1);

  let te=0, tl=0, ti=0;
  const md = months.map((m, idx) => {
    if (!m) return { idx, total:0, livret:0, invest:0 };
    const liv = m.expenses.filter(e => e.cat === 'epargne_livret').reduce((s,e) => s + (e.amount||0), 0);
    const inv = m.expenses.filter(e => e.cat === 'epargne_pea').reduce((s,e) => s + (e.amount||0), 0);
    const tot = liv + inv;
    te += tot; tl += liv; ti += inv;
    return { idx, total:tot, livret:liv, invest:inv };
  });
  const mx = Math.max(...md.map(d => d.total), 1);

  const peaRendTotal = peaRend.reduce((s,r) => s + (r.montant||0), 0);
  const fmtDate      = (d) => d ? d.split('-').reverse().join('/') : '';

  const fmtShortDate = d => {
    if (!d) return '';
    const [, mo, da] = d.split('-');
    return `${parseInt(da)}/${parseInt(mo)}`;
  };

  // Virements mensuels issus des dépenses épargne
  const PEA_START = new Date('2026-06-10');
  const allLivretVirements = months.flatMap(mo => mo ? mo.expenses.filter(e => e.cat === 'epargne_livret') : []);
  const allPeaVirements    = months.flatMap(mo => mo ? mo.expenses.filter(e => e.cat === 'epargne_pea' && new Date(e.date) >= PEA_START) : []);

  // Total = dernier solde manuel + virements postérieurs, ou solde initial + tous virements
  const computeTotal = (initialAmount, manualHist, virements) => {
    if (manualHist.length > 0) {
      const last = [...manualHist].sort((a,b) => new Date(b.date) - new Date(a.date))[0];
      const after = virements
        .filter(v => v.date && new Date(v.date) > new Date(last.date))
        .reduce((s, v) => s + (v.amount || 0), 0);
      return last.montant + after;
    }
    return initialAmount + virements.reduce((s, v) => s + (v.amount || 0), 0);
  };

  const livretTotal = computeTotal(livretSolde?.amount || 0, livretHist, allLivretVirements);
  const peaTotal    = computeTotal(peaSolde?.montant   || 0, peaHist,    allPeaVirements);

  // Série cumulative : solde initial → virements (delta) + ajustements manuels (absolu)
  const buildCumulativeChartSeries = (initialDate, initialAmount, manualHist, virements) => {
    if (!initialDate) return [];
    const events = [
      ...manualHist.filter(h => h.date).map(h => ({ date: h.date, type: 'manual', montant: h.montant })),
      ...virements.filter(v => v.date).map(v => ({ date: v.date, type: 'virement', delta: v.amount || 0 })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
    const pts = [{ date: initialDate, label: fmtShortDate(initialDate), value: initialAmount }];
    let cur = initialAmount;
    events.forEach(e => {
      if (e.type === 'manual') cur = e.montant;
      else cur += e.delta;
      pts.push({ date: e.date, label: fmtShortDate(e.date), value: cur });
    });
    return pts;
  };

  const livretChartData = buildCumulativeChartSeries(
    livretSolde?.date, livretSolde?.amount || 0, livretHist, allLivretVirements
  );
  const peaChartData = buildCumulativeChartSeries(
    peaSolde?.date, peaSolde?.montant || 0, peaHist, allPeaVirements
  );

  const patchMonthCat = (monthIdx, catId, newAmount) => {
    const key = `budget:${epargneYear}:${String(monthIdx + 1).padStart(2, '0')}`;
    try {
      const stored = localStorage.getItem(key); if (!stored) return;
      const data = JSON.parse(stored);
      const ex = data.expenses.find(e => e.cat === catId);
      if (ex) data.expenses = data.expenses.map(e => e.id === ex.id ? { ...e, amount: newAmount } : e);
      else data.expenses.push({ id:'e'+Date.now(), name: catId === 'epargne_livret' ? 'Livret A' : 'PEA', amount: newAmount, cat: catId, date: new Date(epargneYear, monthIdx, 1).toISOString().split('T')[0] });
      localStorage.setItem(key, JSON.stringify(data));
      setMonths(loadYearData(epargneYear));
    } catch {}
  };
  const deleteMonthCat = (monthIdx, catId) => {
    const key = `budget:${epargneYear}:${String(monthIdx + 1).padStart(2, '0')}`;
    try {
      const stored = localStorage.getItem(key); if (!stored) return;
      const data = JSON.parse(stored);
      data.expenses = data.expenses.filter(e => e.cat !== catId);
      localStorage.setItem(key, JSON.stringify(data));
      setMonths(loadYearData(epargneYear));
    } catch {}
  };

  const livretDetailItems = md.filter(d => d.livret > 0).map(d => ({ id:`livret-${d.idx}`, label: MS[d.idx], montant: d.livret, idx: d.idx }));
  const peaDetailItems = peaRend.map(r => ({ ...r, label: r.date ? new Date(r.date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : '—' }));
  const livretCombinedHist = [
    ...livretHist,
    ...allLivretVirements.map(v => ({ id:`vir-l-${v.id}`, date: v.date, montant: v.amount, label: 'Virement', readOnly: true }))
  ];
  const peaCombinedHist = [
    ...peaHist,
    ...allPeaVirements.map(v => ({ id:`vir-p-${v.id}`, date: v.date, montant: v.amount, label: 'Virement', readOnly: true }))
  ];
  const lastUpdateDate = (() => {
    const allDates = [
      ...livretHist.map(h => h.date),
      ...allLivretVirements.map(v => v.date),
      ...peaHist.map(h => h.date),
      ...allPeaVirements.map(v => v.date),
    ].filter(Boolean);
    if (!allDates.length) return null;
    const latest = allDates.reduce((a, b) => (new Date(a) > new Date(b) ? a : b));
    return latest.split('-').reverse().join('/');
  })();
  const flashSaved = (type) => { setEpargneFlash(type); setTimeout(() => setEpargneFlash(null), 1000); };

  const dataMonths = months.filter(m => m !== null);
  const allClosed  = dataMonths.length > 0 && dataMonths.every(m => m.closed === true);

  return (
    <>
      {/* Header avec navigation année */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 10px', background:C.beige, flexShrink:0 }}>
        <Logo />
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <button onClick={prevYear}
            style={{ background:'none', border:'none', cursor:'pointer', color:C.vert, fontSize:20, padding:'0 3px' }}>‹</button>
          <span style={{ fontFamily:serif, fontSize:16, fontWeight:600, color:C.vert }}>{epargneYear}</span>
          {allClosed && <i className="ti ti-lock" style={{ fontSize:13, color:C.gold, marginLeft:4 }} />}
          <button onClick={nextYear}
            style={{ background:'none', border:'none', cursor:'pointer', color:C.vert, fontSize:20, padding:'0 3px' }}>›</button>
        </div>
        <i className="ti ti-bell" style={{ fontSize:20, color:C.vert, width:38, textAlign:'right' }} />
      </div>

      {/* Bandeau clôture annuelle */}
      {allClosed && (
        <div style={{ background:'#2E7D32', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'center', gap:8, flexShrink:0 }}>
          <i className="ti ti-circle-check" style={{ fontSize:15, color:'white' }} />
          <span style={{ fontFamily:sans, fontSize:13, fontWeight:600, color:'white' }}>
            Année {epargneYear} clôturée ✓
          </span>
          <span style={{ fontFamily:serif, fontSize:15, fontWeight:700, color:C.gold, marginLeft:4 }}>{fmtP(te)}</span>
        </div>
      )}

      <div style={{ textAlign:'center', padding:'4px 16px 10px', background:C.beige, flexShrink:0 }}>
        <div style={{ fontFamily:serif, fontSize:18, fontWeight:600, letterSpacing:3, textTransform:'uppercase', color:C.vert }}>
          Épargne &amp;<br />Investissement
        </div>
      </div>

      {/* Wrapper : cards fixes + jauges scrollables */}
      <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', background:C.beige }}>

        {/* ── Cards fixes ── */}
        <div style={{ flexShrink:0, padding:'0 16px', background:C.beige }}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', margin:'4px 0 8px' }}>
            <span style={{ fontFamily:sans, fontSize:11, color:C.muted, fontWeight:500 }}>Total à date</span>
            {lastUpdateDate && <span style={{ fontFamily:sans, fontSize:10, color:C.muted }}>Dernière maj le {lastUpdateDate}</span>}
          </div>

          {/* ── Livret A ── */}
          <div style={{ background:C.vert, borderRadius:12, padding:'12px 16px', marginBottom: editSolde ? 0 : 8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <span style={{ fontFamily:serif, fontSize:16, fontWeight:700, color:'white', display:'block', marginBottom:6 }}>Livret A</span>
              <div style={{ display:'flex', gap:16 }}>
                <button title="Nouveau solde" onClick={() => { setSoldeForm({ amount: '', date: new Date().toISOString().split('T')[0] }); setEditSolde(v => !v); }}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}>
                  <i className="ti ti-pencil" style={{ fontSize:18, color: editSolde ? C.gold : 'rgba(255,255,255,0.75)' }} />
                </button>
                <button onClick={() => setDetailType('livret')}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}>
                  <i className="ti ti-list-details" style={{ fontSize:18, color:'rgba(255,255,255,0.75)' }} />
                </button>
                <button onClick={() => setChartType('livret')}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}>
                  <i className="ti ti-chart-line" style={{ fontSize:18, color:'rgba(255,255,255,0.75)' }} />
                </button>
              </div>
            </div>
            <span style={{ fontFamily:serif, fontSize:26, fontWeight:700, color:'white', cursor:'pointer' }} onClick={() => setChartType('livret')}>{fmtP(livretTotal)}</span>
          </div>
          {editSolde && (
            <div style={{ background:'rgba(28,41,28,0.92)', borderRadius:'0 0 12px 12px', padding:'10px 14px 14px', marginBottom:8 }}>
              <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                <div style={{ flex:2 }}>
                  <Label><span style={{ color:'rgba(255,255,255,0.5)' }}>Nouveau solde (€)</span></Label>
                  <input type="number" step="0.01" placeholder="Nouveau solde en €" value={soldeForm.amount} onChange={e => setSoldeForm(p => ({...p, amount:e.target.value}))}
                    style={{ width:'100%', padding:8, border:`1px solid rgba(255,255,255,0.2)`, borderRadius:7, fontSize:15, fontFamily:serif, color:C.vert, background:'white' }} />
                </div>
                <div style={{ flex:2 }}>
                  <Label><span style={{ color:'rgba(255,255,255,0.5)' }}>Date du solde</span></Label>
                  <input type="date" value={soldeForm.date} onChange={e => setSoldeForm(p => ({...p, date:e.target.value}))}
                    style={{ width:'100%', padding:8, border:`1px solid rgba(255,255,255,0.2)`, borderRadius:7, fontSize:12, color:C.vert, background:'white', fontFamily:sans }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => {
                  const a = parseFloat(soldeForm.amount);
                  if (!a) return;
                  const updated = { ...livretSolde, amount:a, date:soldeForm.date };
                  saveLivretSolde(updated);
                  setLivretSolde(updated);
                  const entry = { id:'lh'+Date.now(), date: soldeForm.date || new Date().toISOString().split('T')[0], montant: a, label: 'Mise à jour manuelle' };
                  const uh = [...livretHist, entry]; saveLivretHist(uh); setLivretHist(uh);
                  setEditSolde(false);
                  flashSaved('livret');
                }} style={{ flex:1, padding:9, background:C.gold, color:C.nav, border:'none', borderRadius:8, fontFamily:sans, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  Enregistrer
                </button>
                <button onClick={() => setEditSolde(false)}
                  style={{ padding:'9px 12px', background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, cursor:'pointer', color:'white', fontFamily:sans }}>✕</button>
              </div>
            </div>
          )}
          {epargneFlash === 'livret' && <div style={{ textAlign:'center', fontFamily:sans, fontSize:12, color:'#2E7D32', fontWeight:600, padding:'4px 0' }}>Sauvegardé ✓</div>}

          {/* ── PEA ── */}
          <div style={{ background:C.rose, borderRadius:12, padding:'12px 16px', marginBottom: editPeaSolde ? 0 : 8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <span style={{ fontFamily:serif, fontSize:16, fontWeight:700, color:C.vert, display:'block', marginBottom:6 }}>PEA</span>
              <div style={{ display:'flex', gap:16 }}>
                <button title="Nouveau solde" onClick={() => { setPeaSoldeForm({ montant: '', rendement: String(peaSolde?.rendement||''), pct: String(peaSolde?.pct||''), date: new Date().toISOString().split('T')[0] }); setEditPeaSolde(v => !v); }}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}>
                  <i className="ti ti-pencil" style={{ fontSize:18, color: editPeaSolde ? C.gold : C.vert }} />
                </button>
                <button onClick={() => setDetailType('pea')}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}>
                  <i className="ti ti-list-details" style={{ fontSize:18, color:C.vert }} />
                </button>
                <button onClick={() => setChartType('pea')}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}>
                  <i className="ti ti-chart-line" style={{ fontSize:18, color:C.vert }} />
                </button>
              </div>
            </div>
            <span style={{ fontFamily:serif, fontSize:26, fontWeight:700, color:C.vert, cursor:'pointer' }} onClick={() => setChartType('pea')}>{fmtP(peaTotal)}</span>
          </div>
          {editPeaSolde && (
            <div style={{ background:'rgba(28,41,28,0.08)', borderRadius:'0 0 12px 12px', padding:'10px 14px 14px', marginBottom:8, border:`1px solid ${C.rose}`, borderTop:'none' }}>
              <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                <div style={{ flex:2 }}>
                  <Label>Nouveau solde (€)</Label>
                  <input type="number" step="0.01" placeholder="Nouveau solde en €" value={peaSoldeForm.montant} onChange={e => setPeaSoldeForm(p => ({...p, montant:e.target.value}))}
                    style={{ width:'100%', padding:8, border:`1px solid ${C.border}`, borderRadius:7, fontSize:14, fontFamily:serif, color:C.vert, background:'white' }} />
                </div>
                <div style={{ flex:2 }}>
                  <Label>Date</Label>
                  <input type="date" value={peaSoldeForm.date} onChange={e => setPeaSoldeForm(p => ({...p, date:e.target.value}))}
                    style={{ width:'100%', padding:8, border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, color:C.vert, background:'white', fontFamily:sans }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => {
                  const a = parseFloat(peaSoldeForm.montant);
                  if (!a) return;
                  const updated = { ...peaSolde, montant:a, date:peaSoldeForm.date };
                  savePeaSolde(updated);
                  setPeaSolde(updated);
                  const entry = { id:'ph'+Date.now(), date: peaSoldeForm.date || new Date().toISOString().split('T')[0], montant: a, label: 'Mise à jour manuelle' };
                  const uh = [...peaHist, entry]; savePeaHist(uh); setPeaHist(uh);
                  setEditPeaSolde(false);
                  flashSaved('pea');
                }} style={{ flex:1, padding:9, background:C.vert, color:'white', border:'none', borderRadius:8, fontFamily:sans, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  Enregistrer
                </button>
                <button onClick={() => setEditPeaSolde(false)}
                  style={{ padding:'9px 12px', background:'white', border:`1px solid ${C.rose}`, borderRadius:8, cursor:'pointer', color:C.vert, fontFamily:sans }}>✕</button>
              </div>
            </div>
          )}
          {epargneFlash === 'pea' && <div style={{ textAlign:'center', fontFamily:sans, fontSize:12, color:'#2E7D32', fontWeight:600, padding:'4px 0' }}>Sauvegardé ✓</div>}
        </div>

        {/* ── Jauges mensuelles scrollables ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'0 16px 80px', background:C.beige }}>
          {/* Total année */}
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', marginBottom:4 }}>
            <span style={{ fontFamily:sans, fontSize:13, fontWeight:700, color:C.vert, width:36 }}>{epargneYear}</span>
            <div style={{ flex:1, height:1, background:'rgba(28,41,28,0.2)' }} />
            <div style={{ background:'rgba(28,41,28,0.08)', borderRadius:6, padding:'2px 10px' }}>
              <span style={{ fontFamily:serif, fontSize:13, fontWeight:700, color:C.vert }}>{fmtP(te)}</span>
            </div>
          </div>
          {/* Barres mensuelles bicolores */}
          {md.map(d => (
            <div key={d.idx} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0' }}>
              <span style={{ fontFamily:sans, fontSize:11, fontWeight: d.total > 0 ? 600 : 400, color:C.vert, width:36 }}>{MS[d.idx]}</span>
              <div style={{ flex:1, height:7, background:'rgba(28,41,28,0.07)', borderRadius:4, overflow:'hidden' }}>
                {d.total > 0 && (
                  <div style={{ height:'100%', width:`${Math.round(d.total/mx*100)}%`, display:'flex', borderRadius:4, overflow:'hidden' }}>
                    {d.livret > 0 && <div style={{ flex: Math.round(d.livret/d.total*100), background:C.vert }} />}
                    {d.invest > 0 && <div style={{ flex: Math.round(d.invest/d.total*100), background:C.rose }} />}
                  </div>
                )}
              </div>
              <div style={{ background: d.total > 0 ? 'rgba(28,41,28,0.07)' : 'transparent', borderRadius:5, padding:'1px 8px', minWidth:52, textAlign:'right' }}>
                <span style={{ fontFamily:serif, fontSize:12, fontWeight:700, color: d.total > 0 ? C.vert : 'rgba(28,41,28,0.3)' }}>{d.total > 0 ? fmtP(d.total) : '–'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showPeaRend && (
        <AddPeaRendementModal
          onAdd={r => { const updated = [...peaRend, r]; savePeaRend(updated); setPeaRend(updated); setShowPeaRend(false); setDetailType('pea'); }}
          onClose={() => setShowPeaRend(false)}
        />
      )}
      {chartType && (
        <SavingsChart
          data={chartType === 'livret' ? livretChartData : peaChartData}
          color={C.vert}
          svgBg={chartType === 'livret' ? 'white' : C.roseL}
          title={chartType === 'livret' ? 'Livret A' : 'PEA'}
          onClose={() => setChartType(null)}
        />
      )}
      {detailType && !showPeaRend && (
        <SavingsDetail
          type={detailType}
          histItems={detailType === 'livret' ? livretCombinedHist : peaCombinedHist}
          soldeItem={detailType === 'livret'
            ? { montant: livretSolde?.amount || 0, date: livretSolde?.date || '' }
            : { montant: peaSolde?.montant   || 0, date: peaSolde?.date   || '' }
          }
          onSaveHist={(id, val) => {
            if (detailType === 'livret') {
              const upd = livretHist.map(h => h.id === id ? { ...h, montant: val } : h);
              saveLivretHist(upd); setLivretHist(upd);
            } else {
              const upd = peaHist.map(h => h.id === id ? { ...h, montant: val } : h);
              savePeaHist(upd); setPeaHist(upd);
            }
          }}
          onDeleteHist={(id) => {
            if (detailType === 'livret') {
              const upd = livretHist.filter(h => h.id !== id);
              saveLivretHist(upd); setLivretHist(upd);
            } else {
              const upd = peaHist.filter(h => h.id !== id);
              savePeaHist(upd); setPeaHist(upd);
            }
          }}
          onSaveSolde={(val) => {
            if (detailType === 'livret') {
              const upd = { amount: val, date: livretSolde?.date || '' };
              saveLivretSolde(upd); setLivretSolde(upd);
              const entry = { id:'lh'+Date.now(), date: new Date().toISOString().split('T')[0], montant: val, label: 'Mise à jour' };
              const uh = [...livretHist, entry]; saveLivretHist(uh); setLivretHist(uh);
            } else {
              const upd = { ...peaSolde, montant: val };
              savePeaSolde(upd); setPeaSolde(upd);
              const entry = { id:'ph'+Date.now(), date: new Date().toISOString().split('T')[0], montant: val, label: 'Mise à jour' };
              const uh = [...peaHist, entry]; savePeaHist(uh); setPeaHist(uh);
            }
          }}
          onAdd={detailType === 'pea' ? () => setShowPeaRend(true) : null}
          onClose={() => setDetailType(null)}
        />
      )}
    </>
  );
}

// ─── SPLASH SCREEN ───────────────────────────────────────────
const SplashScreen = ({ onDone }) => {
  const [visible, setVisible] = useState(false);
  const [out, setOut]         = useState(false);
  const firedRef              = useRef(false);

  useEffect(() => {
    const t0 = setTimeout(() => setVisible(true), 30);
    const t1 = setTimeout(() => setOut(true), 2000);
    const t2 = setTimeout(() => {
      if (!firedRef.current) { firedRef.current = true; onDone(); }
    }, 2500);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={{
      position:'absolute', inset:0, zIndex:100, borderRadius:24,
      overflow:'hidden', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start',
      paddingTop:'8%',
      opacity: out ? 0 : visible ? 1 : 0,
      transition: out ? 'opacity 0.5s ease' : 'opacity 0.4s ease',
    }}>
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:'url(/splash-bg.png)',
        backgroundSize:'cover', backgroundPosition:'center',
      }} />
      <div style={{ position:'absolute', inset:0, background:'rgba(30,51,40,0.65)' }} />
      <div style={{ position:'relative', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ color:C.gold, fontSize:16, marginBottom:16 }}>✦</div>
        <img src="/logo-budget-club.png" style={{ width:150, height:150, objectFit:'contain' }} />
        <div style={{ marginTop:16, fontFamily:serif, fontSize:48, fontWeight:700, color:C.gold, letterSpacing:'8px', textTransform:'uppercase', lineHeight:1.1 }}>
          BUDGET<br />CLUB
        </div>
        <div style={{ marginTop:14, fontFamily:sans, fontSize:11, color:'rgba(255,255,255,0.7)', letterSpacing:'3px', textTransform:'uppercase' }}>
          GÉREZ VOS FINANCES AVEC ÉLÉGANCE
        </div>
      </div>
    </div>
  );
};

// ─── APP ROOT ────────────────────────────────────────────────
export default function App() {
  const [mi, setMi]         = useState(getInitialMonth);
  const [view, setView]     = useState('accueil');
  const [depTab, setDepTab] = useState('depenses');
  const [modal, setModal]   = useState(null); // 'dep' | 'rev' | 'bill' | null
  const [showSplash, setShowSplash] = useState(true);

  const { data: m, loading, updateData } = useMonthData(mi);

  const addExpense = (exp)  => { if (m.closed) return; updateData(mm => { mm.expenses = [...mm.expenses, exp]; }); };
  const addRevenu  = (rev)  => { if (m.closed) return; updateData(mm => { mm.revenues = [...mm.revenues, rev]; }); };
  const addBill    = (bill) => { if (m.closed) return; updateData(mm => { mm.bills    = [...mm.bills, bill];    }); };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:C.beige }}>
      <div style={{ fontFamily:serif, fontSize:24, color:C.vert, opacity:0.6 }}>Chargement…</div>
    </div>
  );

  const renderView = () => {
    switch (view) {
      case 'accueil':     return <AccueilView m={m} mi={mi} setMi={setMi} setView={setView} updateData={updateData} />;
      case 'budget':      return <BudgetView  m={m} mi={mi} setMi={setMi} setView={setView} updateData={updateData} />;
      case 'budget_edit': return <BudgetEditView m={m} updateData={updateData} setView={setView} />;
      case 'revenus':     return <RevenusView m={m} mi={mi} setMi={setMi} updateData={updateData} />;
      case 'depenses':    return <DepensesView m={m} mi={mi} setMi={setMi} updateData={updateData} depTab={depTab} setDepTab={setDepTab} />;
      case 'epargne':     return <EpargneView currentYear={mi.year} />;
      default:            return null;
    }
  };

  return (
    <>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />

      {/* Wrapper desktop centré */}
      <div style={{ background:'#2A1F1A', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:12, fontFamily:sans }}>
        <div style={{ background:C.beige, borderRadius:24, overflow:'hidden', display:'flex', flexDirection:'column', width:'100%', maxWidth:390, height:'90vh', maxHeight:780, position:'relative', boxShadow:'0 20px 60px rgba(0,0,0,0.35)' }}>

          {/* En-tête page (sauf accueil, épargne, budget, revenus, dépenses qui gèrent le leur) */}
          {!['accueil','budget_edit','epargne','budget','revenus','depenses'].includes(view) && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px 8px', background:C.beige, flexShrink:0 }}>
              <button onClick={() => setView('accueil')} style={{ background:'none', border:'none', cursor:'pointer', color:C.vert, fontSize:22, width:32 }}>‹</button>
              <span style={{ fontFamily:serif, fontSize:20, fontWeight:600, color:C.vert, letterSpacing:1, textTransform:'uppercase' }}>
                {view === 'budget' ? 'Budget' : view === 'revenus' ? 'Revenus' : 'Dépenses'}
              </span>
              <span style={{ fontSize:20, color:C.muted, letterSpacing:2, width:32, textAlign:'right' }}>···</span>
            </div>
          )}
          {view === 'budget_edit' && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px 8px', background:C.beige, flexShrink:0 }}>
              <button onClick={() => setView('budget')} style={{ background:'none', border:'none', cursor:'pointer', color:C.vert, fontSize:22, width:32 }}>‹</button>
              <span style={{ fontFamily:serif, fontSize:20, fontWeight:600, color:C.vert, letterSpacing:1, textTransform:'uppercase' }}>Non ventilé par catégorie</span>
              <span style={{ width:32 }} />
            </div>
          )}

          {/* Contenu principal */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {renderView()}
          </div>

          {/* FAB */}
          {!['budget_edit'].includes(view) && !m.closed && <FAB view={view} setModal={setModal} setView={setView} depTab={depTab} />}

          {/* Nav */}
          <BottomNav view={view} setView={setView} m={m} />

          {/* Splash */}
          {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}

          {/* Modals */}
          {!m.closed && modal === 'dep'  && <AddExpenseModal onAdd={addExpense} onClose={() => setModal(null)} />}
          {!m.closed && modal === 'rev'  && <AddRevenuModal  onAdd={addRevenu}  onClose={() => setModal(null)} />}
          {!m.closed && modal === 'bill' && <AddBillModal    onAdd={addBill}    onClose={() => setModal(null)} />}
        </div>
      </div>
    </>
  );
}
