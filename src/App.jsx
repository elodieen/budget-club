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
  beige:  '#F9F7F5',
  gold:   '#EEC4C4',
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

// ─── PROFILS ────────────────────────────────────────────────
let currentProfileId = 'elodie';
const getProfiles  = () => { try { return JSON.parse(localStorage.getItem('profile:list') || 'null'); } catch { return null; } };
const saveProfiles = (p) => localStorage.setItem('profile:list', JSON.stringify(p));
const getSavedProfileId = () => { try { return localStorage.getItem('profile:current'); } catch { return null; } };
const persistProfile = (id) => { currentProfileId = id; localStorage.setItem('profile:current', id); };
const getPin  = (id) => { try { return localStorage.getItem(`profile:${id}:pin`); } catch { return null; } };
const savePin = (id, pin) => localStorage.setItem(`profile:${id}:pin`, pin);

const initProfiles = () => {
  let profiles = getProfiles();
  if (!profiles) {
    profiles = [{ id:'elodie', name:'Elodie' }, { id:'ludivine', name:'Ludivine' }, { id:'demo', name:'Démo' }];
    saveProfiles(profiles);
  }
  // Correction orthographe Élodie → Elodie
  profiles = profiles.map(p => p.id === 'elodie' && p.name === 'Élodie' ? { ...p, name:'Elodie' } : p);
  // Ajout du profil Démo pour les utilisateurs existants
  if (!profiles.find(p => p.id === 'demo')) profiles = [...profiles, { id:'demo', name:'Démo' }];
  saveProfiles(profiles);
  if (!getPin('elodie'))   savePin('elodie',   '123456');
  if (!getPin('ludivine')) savePin('ludivine', '123456');
  if (!getPin('demo'))     savePin('demo',     '000000');
  // Soldes initiaux à 0 pour tous les profils non-elodie
  // (reset forcé si les valeurs d'Elodie se sont glissées dedans)
  const today = new Date().toISOString().split('T')[0];
  const RESET_FLAG = 'profile:init-soldes:v2';
  const needsReset = !localStorage.getItem(RESET_FLAG);
  profiles.filter(p => p.id !== 'elodie').forEach(p => {
    const livretRaw = localStorage.getItem(`${p.id}:budget:livret:soldeInitial`);
    const peaRaw    = localStorage.getItem(`${p.id}:budget:pea:soldeInitial`);
    let badLivret = !livretRaw;
    let badPea    = !peaRaw;
    if (livretRaw) { try { if (JSON.parse(livretRaw).amount > 0) badLivret = needsReset; } catch { badLivret = true; } }
    if (peaRaw)    { try { if (JSON.parse(peaRaw).montant  > 0) badPea    = needsReset; } catch { badPea    = true; } }
    if (badLivret) localStorage.setItem(`${p.id}:budget:livret:soldeInitial`, JSON.stringify({ amount: 0, date: today }));
    if (badPea)    localStorage.setItem(`${p.id}:budget:pea:soldeInitial`,    JSON.stringify({ montant: 0, rendement: 0, pct: 0, date: today }));
    // Empêche la migration EpargneView d'écraser avec les defaults d'Elodie
    if (!localStorage.getItem(`${p.id}:budget:init:2026-06`))
      localStorage.setItem(`${p.id}:budget:init:2026-06`, '1');
  });
  if (needsReset) localStorage.setItem(RESET_FLAG, '1');
  return profiles;
};

const migrateData = () => {
  if (localStorage.getItem('profile:migration:v1')) return;
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('budget:')) keys.push(k);
  }
  keys.forEach(k => {
    const v = localStorage.getItem(k);
    if (v !== null) { localStorage.setItem(`elodie:${k}`, v); localStorage.removeItem(k); }
  });
  localStorage.setItem('profile:migration:v1', '1');
};

const clearLudivineData = () => {
  if (localStorage.getItem('profile:clear-ludivine:v1')) return;
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('ludivine:')) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
  localStorage.setItem('profile:clear-ludivine:v1', '1');
};

const seedDemoProfile = () => {
  const FLAG = 'profile:demo:seeded:v1';
  if (localStorage.getItem(FLAG)) return;

  const mkDemoBills = (dateStr) => [
    { id:'b5',  name:'Orange Fibre',          amount:52,  realAmount:52,  paid:true, paidDate:dateStr },
    { id:'b7',  name:'Disney',                amount:16,  realAmount:16,  paid:true, paidDate:dateStr },
    { id:'b10', name:'Amazon Prime',          amount:9,   realAmount:9,   paid:true, paidDate:dateStr },
    { id:'b12', name:'Netflix',               amount:14,  realAmount:14,  paid:true, paidDate:dateStr },
    { id:'b15', name:'Assurance Voiture GMF', amount:40,  realAmount:40,  paid:true, paidDate:dateStr },
    { id:'b20', name:'EDF',                   amount:46,  realAmount:46,  paid:true, paidDate:dateStr },
  ];

  const months = [
    {
      key: 'demo:budget:2026:03',
      data: {
        catBudgets: { alimentation:350, quotidien:100, sortie:150, shopping:120, sante:50, divers:80 },
        revenues:   [{ id:'r1', name:'Salaire', amount:2450 }],
        bills:      mkDemoBills('2026-03-10'),
        expenses:   [
          { id:'e1', name:'Carrefour',     amount:87.50, cat:'alimentation',   date:'2026-03-05' },
          { id:'e2', name:'Lidl',          amount:45.30, cat:'alimentation',   date:'2026-03-12' },
          { id:'e3', name:'Marché',        amount:28.60, cat:'alimentation',   date:'2026-03-19' },
          { id:'e4', name:'Café',          amount:18.50, cat:'quotidien',      date:'2026-03-08' },
          { id:'e5', name:'Pharmacie',     amount:14.90, cat:'sante',          date:'2026-03-14' },
          { id:'e6', name:'Sushi Shop',    amount:42.00, cat:'sortie',         date:'2026-03-15' },
          { id:'e7', name:'Zara',          amount:64.90, cat:'shopping',       date:'2026-03-22' },
          { id:'e8', name:'Livret A',      amount:100,   cat:'epargne_livret', date:'2026-03-28' },
        ],
        closed: true,
      },
    },
    {
      key: 'demo:budget:2026:04',
      data: {
        catBudgets: { alimentation:350, quotidien:100, sortie:150, shopping:100, sante:50, divers:80 },
        revenues:   [{ id:'r1', name:'Salaire', amount:2450 }],
        bills:      mkDemoBills('2026-04-10'),
        expenses:   [
          { id:'e1', name:'Carrefour',     amount:92.40, cat:'alimentation',   date:'2026-04-03' },
          { id:'e2', name:'Monoprix',      amount:38.70, cat:'alimentation',   date:'2026-04-10' },
          { id:'e3', name:'Marché',        amount:22.50, cat:'alimentation',   date:'2026-04-17' },
          { id:'e4', name:'Café',          amount:12.00, cat:'quotidien',      date:'2026-04-07' },
          { id:'e5', name:'Médecin',       amount:30.00, cat:'sante',          date:'2026-04-11' },
          { id:'e6', name:'Restaurant',    amount:56.00, cat:'sortie',         date:'2026-04-19' },
          { id:'e7', name:'Vinted',        amount:29.99, cat:'shopping',       date:'2026-04-24' },
          { id:'e8', name:'Livret A',      amount:150,   cat:'epargne_livret', date:'2026-04-28' },
        ],
        closed: true,
      },
    },
    {
      key: 'demo:budget:2026:05',
      data: {
        catBudgets: { alimentation:350, quotidien:100, sortie:200, shopping:150, sante:50, vacances:300, divers:80 },
        revenues:   [{ id:'r1', name:'Salaire', amount:2450 }, { id:'r2', name:'Prime', amount:300 }],
        bills:      mkDemoBills('2026-05-10'),
        expenses:   [
          { id:'e1', name:'Carrefour',     amount:76.20, cat:'alimentation',   date:'2026-05-06' },
          { id:'e2', name:'Lidl',          amount:53.40, cat:'alimentation',   date:'2026-05-13' },
          { id:'e3', name:'Marché',        amount:31.00, cat:'alimentation',   date:'2026-05-20' },
          { id:'e4', name:'Café & Divers', amount:22.50, cat:'quotidien',      date:'2026-05-08' },
          { id:'e5', name:'Billet train',  amount:89.00, cat:'vacances',       date:'2026-05-02' },
          { id:'e6', name:'Hôtel',         amount:180.00,cat:'vacances',       date:'2026-05-16' },
          { id:'e7', name:'Brunch amis',   amount:34.00, cat:'sortie',         date:'2026-05-11' },
          { id:'e8', name:'H&M',           amount:47.90, cat:'shopping',       date:'2026-05-25' },
          { id:'e9', name:'Livret A',      amount:200,   cat:'epargne_livret', date:'2026-05-28' },
        ],
        closed: true,
      },
    },
  ];

  months.forEach(({ key, data }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data));
  });

  localStorage.setItem('demo:budget:livret:soldeInitial', JSON.stringify({ amount: 0, date: '2026-06-01' }));
  localStorage.setItem('demo:budget:pea:soldeInitial',    JSON.stringify({ montant: 0, rendement: 0, pct: 0, date: '2026-06-01' }));
  localStorage.setItem('demo:budget:init:2026-06', '1');
  localStorage.setItem(FLAG, '1');
};

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

const mkMonth = () => {
  const disabled    = getDisabledBills();
  const base        = (currentProfileId === 'elodie' ? BILLS_DEFAULT : [])
    .filter(b => !disabled.has(b.id))
    .map(b => ({...b, realAmount: b.amount, paid: false, paidDate: ''}));
  const recurring   = getRecurringBills()
    .filter(b => !disabled.has(b.id))
    .map(b => ({...b, realAmount: b.amount, paid: false, paidDate: ''}));
  const existingIds = new Set(base.map(b => b.id));
  const bills       = [...base, ...recurring.filter(b => !existingIds.has(b.id))];
  return { catBudgets: {}, revenues: [], bills, expenses: [], closed: false };
};

// ─── HELPERS ────────────────────────────────────────────────
// mi = { month: 0-11, year: YYYY }
const storageKey = (mi) => `${currentProfileId}:budget:${mi.year}:${String(mi.month + 1).padStart(2, '0')}`;

const loadYearData = (year) => {
  const months = [];
  for (let m = 0; m < 12; m++) {
    const key = `${currentProfileId}:budget:${year}:${String(m + 1).padStart(2, '0')}`;
    try {
      const stored = localStorage.getItem(key);
      months.push(stored ? JSON.parse(stored) : null);
    } catch { months.push(null); }
  }
  return months;
};

const getStartDay       = () => { try { const s = localStorage.getItem(`${currentProfileId}:settings:startDay`); if (s !== null) return parseInt(s, 10); } catch {} return currentProfileId === 'elodie' ? 10 : 1; };
const saveStartDay      = (day) => localStorage.setItem(`${currentProfileId}:settings:startDay`, String(day));
const getSavingsLabels  = () => { try { const s = localStorage.getItem(`${currentProfileId}:settings:savingsLabels`); if (s) return JSON.parse(s); } catch {} return currentProfileId === 'elodie' ? { livret:'Livret A', pea:'PEA' } : { livret:'Compte épargne', pea:'Compte investissement' }; };
const saveSavingsLabels = (labels) => localStorage.setItem(`${currentProfileId}:settings:savingsLabels`, JSON.stringify(labels));
const sortCatsWithDiversLast = (cats) => { const d = cats.filter(c => c.id === 'divers'); return [...cats.filter(c => c.id !== 'divers'), ...d]; };

const getDepSuggestions  = () => { try { return JSON.parse(localStorage.getItem(`${currentProfileId}:depenses:suggestions`) || '[]'); } catch { return []; } };
const saveDepSuggestion  = (nom, categorie) => {
  const list = getDepSuggestions();
  const dedup = list.filter(s => s.nom.toLowerCase() !== nom.toLowerCase());
  const updated = [{ nom, categorie }, ...dedup].slice(0, 100);
  localStorage.setItem(`${currentProfileId}:depenses:suggestions`, JSON.stringify(updated));
  console.log('[BC] suggestion saved →', `${currentProfileId}:depenses:suggestions`, nom, categorie, '| total:', updated.length);
};

const getInitialMonth = () => {
  const today    = new Date();
  const day      = today.getDate();
  const month    = today.getMonth(); // 0-11
  const year     = today.getFullYear();
  const startDay = getStartDay();
  let cur = day < startDay
    ? (month === 0 ? { month: 11, year: year - 1 } : { month: month - 1, year })
    : { month, year };
  // Avance jusqu'au premier mois non clôturé
  for (let i = 0; i < 12; i++) {
    const key = `${currentProfileId}:budget:${cur.year}:${String(cur.month + 1).padStart(2, '0')}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) break;
      const data = JSON.parse(raw);
      if (!data.closed) break;
    } catch { break; }
    cur = cur.month === 11
      ? { month: 0, year: cur.year + 1 }
      : { month: cur.month + 1, year: cur.year };
  }
  return cur;
};

const fmtR = (n) => {
  const v = parseFloat(n) || 0;
  return v % 1 === 0
    ? v.toLocaleString('fr-FR') + ' €'
    : v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
};
const fmtP = (n) => Math.round(n).toLocaleString('fr-FR') + ' €';
const fmt2 = (n) => (parseFloat(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const fmtDateTime = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  const date = dt.toLocaleDateString('fr-FR');
  return d.includes('T') ? date + ' à ' + dt.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }) : date;
};

const billValue      = (b) => b.paid ? (b.realAmount || b.amount) : b.amount;
const byDate         = (arr) => [...arr].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
const getCustomCats  = () => { try { return JSON.parse(localStorage.getItem(`${currentProfileId}:budget:categories:custom`) || '[]'); } catch { return []; } };
const saveCustomCats = (cats) => localStorage.setItem(`${currentProfileId}:budget:categories:custom`, JSON.stringify(cats));

const getLivretSolde  = () => { try { const s = localStorage.getItem(`${currentProfileId}:budget:livret:soldeInitial`); return s ? JSON.parse(s) : null; } catch { return null; } };
const saveLivretSolde = (v) => localStorage.setItem(`${currentProfileId}:budget:livret:soldeInitial`, JSON.stringify(v));

const getPeaSolde   = () => { try { const s = localStorage.getItem(`${currentProfileId}:budget:pea:soldeInitial`); return s ? JSON.parse(s) : null; } catch { return null; } };
const savePeaSolde  = (v) => localStorage.setItem(`${currentProfileId}:budget:pea:soldeInitial`, JSON.stringify(v));
const getPeaRend    = () => { try { const s = localStorage.getItem(`${currentProfileId}:budget:pea:rendements`);  return s ? JSON.parse(s) : []; } catch { return []; } };
const savePeaRend   = (v) => localStorage.setItem(`${currentProfileId}:budget:pea:rendements`,  JSON.stringify(v));

const getLivretHist  = () => { try { const s = localStorage.getItem(`${currentProfileId}:budget:livret:historique`); return s ? JSON.parse(s) : []; } catch { return []; } };
const saveLivretHist = (v) => localStorage.setItem(`${currentProfileId}:budget:livret:historique`, JSON.stringify(v));

const getRecurringBills  = () => { try { return JSON.parse(localStorage.getItem(`${currentProfileId}:recurring_bills`) || '[]'); } catch { return []; } };
const saveRecurringBills = (b) => localStorage.setItem(`${currentProfileId}:recurring_bills`, JSON.stringify(b));
const getDisabledBills   = () => { try { return new Set(JSON.parse(localStorage.getItem(`${currentProfileId}:disabled_bills`) || '[]')); } catch { return new Set(); } };
const addDisabledBill    = (id) => { const d = getDisabledBills(); d.add(id); localStorage.setItem(`${currentProfileId}:disabled_bills`, JSON.stringify([...d])); };
const getPeaHist     = () => { try { const s = localStorage.getItem(`${currentProfileId}:budget:pea:historique`);    return s ? JSON.parse(s) : []; } catch { return []; } };
const savePeaHist    = (v) => localStorage.setItem(`${currentProfileId}:budget:pea:historique`,    JSON.stringify(v));


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
const CatIcon = ({ catId, size = 42, gray = false, green = false }) => {
  const cat = [...CATS, ...getCustomCats()].find(c => c.id === catId) || CATS[CATS.length - 1];
  const bg  = green ? '#7BA88C' : gray ? 'rgba(28,41,28,0.12)' : C.vert;
  const ic  = gray ? 'rgba(28,41,28,0.35)' : 'white';
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%',
      background: bg,
      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
    }}>
      <i className={`ti ${cat.icon}`} style={{ fontSize: Math.round(size * 0.42), color: ic }} />
    </div>
  );
};

// ─── PROFIL MENU & BADGE ─────────────────────────────────────

const PIN_KEYS = ['1','2','3','4','5','6','7','8','9','','0','del'];

const ProfileMenu = ({ onClose, onSwitch, onCreateProfile }) => {
  const [allProfiles,   setAllProfiles]   = useState(getProfiles() || []);
  const profile  = allProfiles.find(p => p.id === currentProfileId);
  const [stage,         setStage]         = useState(null); // null | 'manage' | 'settings' | 'old' | 'new' | 'confirm'
  const [confirmDelete, setConfirmDelete] = useState(null); // profile object pending deletion
  const [pinInput,      setPinInput]      = useState('');
  const [newPinVal,     setNewPinVal]     = useState('');
  const [pinError,      setPinError]      = useState('');
  const [pinSuccess,    setPinSuccess]    = useState(false);
  const [startDayVal,   setStartDayVal]   = useState(() => getStartDay());
  const [savedFlash,    setSavedFlash]    = useState(false);
  const importRef = useRef(null);

  const handleSave = () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${currentProfileId}:`) && k !== `${currentProfileId}:auto-backup`)
        data[k] = localStorage.getItem(k);
    }
    localStorage.setItem(`${currentProfileId}:auto-backup`, JSON.stringify({ timestamp: new Date().toISOString(), data }));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const lastBackupLabel = (() => {
    try {
      const raw = localStorage.getItem(`${currentProfileId}:auto-backup`);
      if (!raw) return 'Aucune sauvegarde effectuée';
      const { timestamp } = JSON.parse(raw);
      const d = new Date(timestamp);
      return `Dernière sauvegarde : ${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}`;
    } catch { return 'Aucune sauvegarde effectuée'; }
  })();

  const handleExport = () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${currentProfileId}:`)) data[k] = localStorage.getItem(k);
    }
    const pinKey = `profile:${currentProfileId}:pin`;
    const pinVal = localStorage.getItem(pinKey);
    if (pinVal) data[pinKey] = pinVal;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `budget-club-${currentProfileId}-backup.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        Object.entries(data).forEach(([k, v]) => localStorage.setItem(k, v));
        window.location.reload();
      } catch { alert('Fichier invalide'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteProfile = (p) => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${p.id}:`)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem(`profile:${p.id}:pin`);
    const updated = allProfiles.filter(x => x.id !== p.id);
    saveProfiles(updated);
    setAllProfiles(updated);
    setConfirmDelete(null);
  };

  const handlePinKey = (k) => {
    if (k === 'del') { setPinInput(p => p.slice(0,-1)); return; }
    if (pinInput.length >= 6) return;
    const next = pinInput + k;
    setPinInput(next);
    if (next.length < 6) return;
    if (stage === 'old') {
      if (next === getPin(currentProfileId)) { setNewPinVal(''); setStage('new'); setPinInput(''); setPinError(''); }
      else { setPinError('Code incorrect'); setTimeout(() => { setPinInput(''); setPinError(''); }, 800); }
    } else if (stage === 'new') {
      setNewPinVal(next); setStage('confirm'); setPinInput('');
    } else if (stage === 'confirm') {
      if (next === newPinVal) {
        savePin(currentProfileId, next);
        setPinSuccess(true);
        setTimeout(() => { setStage(null); setPinInput(''); setPinSuccess(false); }, 1200);
      } else {
        setPinError('Les codes ne correspondent pas');
        setTimeout(() => { setPinInput(''); setPinError(''); setStage('new'); setNewPinVal(''); }, 800);
      }
    }
  };

  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(28,41,28,0.5)', zIndex:300, display:'flex', alignItems:'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:C.card, borderRadius:'20px 20px 0 0', width:'100%', padding:'20px 20px', paddingBottom:'calc(20px + env(safe-area-inset-bottom))' }}>

        {stage === 'manage' && confirmDelete ? (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ background:'none', border:'none', cursor:'pointer', color:C.vert, fontSize:22, padding:'0 4px' }}>‹</button>
              <span style={{ fontFamily:serif, fontSize:17, fontWeight:700, color:C.vert }}>Confirmer</span>
              <div style={{ width:30 }} />
            </div>
            <div style={{ textAlign:'center', fontFamily:sans, fontSize:14, color:C.text, marginBottom:28, lineHeight:1.6 }}>
              Supprimer le profil <strong>{confirmDelete.name}</strong> ?<br/>
              Toutes ses données seront perdues.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ flex:1, padding:'13px 0', background:C.roseL, border:'none', borderRadius:10, fontFamily:sans, fontSize:14, fontWeight:600, color:C.vert, cursor:'pointer' }}>
                Annuler
              </button>
              <button onClick={() => handleDeleteProfile(confirmDelete)}
                style={{ flex:1, padding:'13px 0', background:'#E8637A', border:'none', borderRadius:10, fontFamily:sans, fontSize:14, fontWeight:700, color:'white', cursor:'pointer' }}>
                Supprimer
              </button>
            </div>
          </>
        ) : stage === 'manage' ? (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <button onClick={() => setStage(null)} style={{ background:'none', border:'none', cursor:'pointer', color:C.vert, fontSize:22, padding:'0 4px' }}>‹</button>
              <span style={{ fontFamily:serif, fontSize:17, fontWeight:700, color:C.vert }}>Gérer les profils</span>
              <div style={{ width:30 }} />
            </div>
            {allProfiles.filter(p => p.id !== 'elodie').length === 0 ? (
              <div style={{ textAlign:'center', fontFamily:sans, fontSize:13, color:C.muted, padding:'20px 0' }}>Aucun autre profil</div>
            ) : (
              allProfiles.filter(p => p.id !== 'elodie').map(p => (
                <div key={p.id} style={{ display:'flex', alignItems:'center', padding:'12px 10px', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ width:38, height:38, borderRadius:'50%', background:C.vert, display:'flex', alignItems:'center', justifyContent:'center', marginRight:12, flexShrink:0 }}>
                    <span style={{ fontFamily:serif, fontSize:16, fontWeight:700, color:C.rose }}>{p.name[0].toUpperCase()}</span>
                  </div>
                  <span style={{ fontFamily:sans, fontSize:14, color:C.vert, flex:1 }}>{p.name}</span>
                  <button onClick={() => setConfirmDelete(p)}
                    style={{ background:'rgba(232,99,122,0.12)', border:'none', borderRadius:8, width:36, height:36, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <i className="ti ti-trash" style={{ fontSize:16, color:'#E8637A' }} />
                  </button>
                </div>
              ))
            )}
          </>
        ) : !stage ? (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <span style={{ fontFamily:serif, fontSize:20, fontWeight:700, color:C.vert }}>Mon profil</span>
              <button onClick={onClose} style={{ background:C.roseL, border:'none', width:30, height:30, borderRadius:'50%', cursor:'pointer', fontSize:15, color:C.vert }}>✕</button>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderBottom:`1px solid ${C.border}`, marginBottom:12 }}>
              <div style={{ width:46, height:46, borderRadius:'50%', background:C.vert, border:'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ fontFamily:serif, fontSize:20, fontWeight:700, color:C.rose }}>{profile?.name[0].toUpperCase()}</span>
              </div>
              <div>
                <div style={{ fontFamily:serif, fontSize:18, fontWeight:600, color:C.vert }}>{profile?.name}</div>
                <div style={{ fontFamily:sans, fontSize:11, color:C.muted }}>Profil actif</div>
              </div>
            </div>
            {[
              { icon:'ti-switch-horizontal', label:'Changer de profil',    action: onSwitch },
              { icon:'ti-key',               label:'Changer mon code PIN',  action: () => { setStage('old'); setPinInput(''); } },
              { icon:'ti-adjustments',       label:'Paramètres',            action: () => setStage('settings') },
              ...(currentProfileId === 'elodie' ? [
                { icon:'ti-settings', label:'Gérer les profils', action: () => setStage('manage') },
                { icon:'ti-user-plus', label:'Ajouter un profil', action: onCreateProfile },
              ] : []),
            ].map(btn => (
              <button key={btn.label} onClick={btn.action}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 10px', background:'none', border:'none', cursor:'pointer', borderRadius:10, marginBottom:4, textAlign:'left' }}>
                <div style={{ width:36, height:36, borderRadius:10, background:C.roseL, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className={`ti ${btn.icon}`} style={{ fontSize:16, color:C.vert }} />
                </div>
                <span style={{ fontFamily:sans, fontSize:14, fontWeight:500, color:C.vert }}>{btn.label}</span>
                <i className="ti ti-chevron-right" style={{ fontSize:14, color:C.muted, marginLeft:'auto' }} />
              </button>
            ))}
            <div style={{ borderTop:`1px solid ${C.border}`, marginTop:4, paddingTop:4 }}>
              <button onClick={handleSave}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 10px', background:'none', border:'none', cursor:'pointer', borderRadius:10, marginBottom:2, textAlign:'left' }}>
                <div style={{ width:36, height:36, borderRadius:10, background:C.roseL, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className="ti ti-device-floppy" style={{ fontSize:16, color:C.vert }} />
                </div>
                <span style={{ fontFamily:sans, fontSize:14, fontWeight:500, color:C.vert }}>Sauvegarder mes données</span>
                {savedFlash
                  ? <span style={{ fontFamily:sans, fontSize:12, fontWeight:600, color:'#2E7D32', marginLeft:'auto' }}>Sauvegardé ✓</span>
                  : <i className="ti ti-chevron-right" style={{ fontSize:14, color:C.muted, marginLeft:'auto' }} />
                }
              </button>
              <div style={{ fontFamily:sans, fontSize:11, color:C.muted, textAlign:'center', paddingBottom:4 }}>{lastBackupLabel}</div>
            </div>
          </>
        ) : stage === 'settings' ? (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <button onClick={() => setStage(null)} style={{ background:'none', border:'none', cursor:'pointer', color:C.vert, fontSize:22, padding:'0 4px' }}>‹</button>
              <span style={{ fontFamily:serif, fontSize:17, fontWeight:700, color:C.vert }}>Paramètres</span>
              <div style={{ width:30 }} />
            </div>
            <div style={{ padding:'4px 0 8px' }}>
              <div style={{ fontFamily:sans, fontSize:10, fontWeight:600, letterSpacing:1, textTransform:'uppercase', color:C.muted, marginBottom:10 }}>Mon mois commence le</div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <select
                  value={startDayVal}
                  onChange={e => { const d = parseInt(e.target.value); setStartDayVal(d); saveStartDay(d); }}
                  style={{ flex:1, padding:'10px 12px', border:`1px solid ${C.rose}`, borderRadius:10, fontFamily:serif, fontSize:16, color:C.vert, background:'white', outline:'none', cursor:'pointer' }}>
                  {Array.from({length:28}, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <span style={{ fontFamily:sans, fontSize:13, color:C.muted }}>du mois</span>
              </div>
              <div style={{ fontFamily:sans, fontSize:11, color:C.muted, marginTop:8, fontStyle:'italic', lineHeight:1.5 }}>
                Détermine à partir de quel jour le mois courant est affiché.
              </div>
            </div>
            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:16, marginTop:8, display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ fontFamily:sans, fontSize:10, fontWeight:600, letterSpacing:1, textTransform:'uppercase', color:C.muted, marginBottom:4 }}>Données</div>
              <button onClick={handleExport}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 14px', background:C.roseL, border:'none', borderRadius:10, cursor:'pointer', textAlign:'left' }}>
                <i className="ti ti-download" style={{ fontSize:16, color:C.vert }} />
                <span style={{ fontFamily:sans, fontSize:13, fontWeight:500, color:C.vert }}>Exporter mes données</span>
              </button>
              <button onClick={() => importRef.current?.click()}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 14px', background:C.roseL, border:'none', borderRadius:10, cursor:'pointer', textAlign:'left' }}>
                <i className="ti ti-upload" style={{ fontSize:16, color:C.vert }} />
                <span style={{ fontFamily:sans, fontSize:13, fontWeight:500, color:C.vert }}>Importer mes données</span>
              </button>
              <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display:'none' }} />
              <div style={{ fontFamily:sans, fontSize:11, color:C.muted, fontStyle:'italic', lineHeight:1.5 }}>
                L'import écrase les données existantes et recharge l'app.
              </div>
              <div style={{ fontFamily:sans, fontSize:11, color:C.muted, textAlign:'center', marginTop:4 }}>
                {(() => {
                  try {
                    const raw = localStorage.getItem(`${currentProfileId}:auto-backup`);
                    if (!raw) return 'Aucune sauvegarde effectuée';
                    const { timestamp } = JSON.parse(raw);
                    const d = new Date(timestamp);
                    return `Dernière sauvegarde : ${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}`;
                  } catch { return 'Aucune sauvegarde effectuée'; }
                })()}
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <button onClick={() => { setStage(null); setPinInput(''); setPinError(''); }}
                style={{ background:'none', border:'none', cursor:'pointer', color:C.vert, fontSize:22, padding:'0 4px' }}>‹</button>
              <span style={{ fontFamily:serif, fontSize:17, fontWeight:700, color:C.vert }}>
                {stage === 'old' ? 'Ancien code PIN' : stage === 'new' ? 'Nouveau code PIN' : 'Confirmer le code'}
              </span>
              <div style={{ width:30 }} />
            </div>
            {pinSuccess ? (
              <div style={{ textAlign:'center', padding:24, fontFamily:sans, fontSize:14, color:'#2E7D32', fontWeight:600 }}>Code PIN modifié ✓</div>
            ) : (
              <>
                <div style={{ display:'flex', justifyContent:'center', gap:12, marginBottom:16, marginTop:8 }}>
                  {Array.from({ length:6 }).map((_,i) => (
                    <div key={i} style={{ width:12, height:12, borderRadius:'50%', background: i < pinInput.length ? C.vert : 'rgba(28,41,28,0.15)', border:`1.5px solid ${i < pinInput.length ? C.vert : 'rgba(28,41,28,0.2)'}`, transition:'background 0.15s' }} />
                  ))}
                </div>
                {pinError && <div style={{ textAlign:'center', color:'#E8637A', fontFamily:sans, fontSize:12, marginBottom:10 }}>{pinError}</div>}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {PIN_KEYS.map((k, i) => (
                    k === '' ? <div key={i} /> :
                    <button key={i} onClick={() => handlePinKey(k)}
                      style={{ height:52, borderRadius:10, background:C.roseL, border:`1px solid ${C.border}`, fontFamily: k === 'del' ? sans : serif, fontSize: k === 'del' ? 13 : 20, color:C.vert, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {k === 'del' ? '⌫' : k}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const ProfileBadge = ({ onSwitch, onCreateProfile }) => {
  const [open, setOpen] = useState(false);
  const profiles = getProfiles() || [];
  const profile  = profiles.find(p => p.id === currentProfileId);
  const initial  = profile ? profile.name[0].toUpperCase() : '?';
  return (
    <>
      <button onClick={() => setOpen(true)} style={{ width:36, height:36, borderRadius:'50%', background:C.vert, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span style={{ fontFamily:serif, fontSize:14, color:C.rose, fontWeight:700, lineHeight:1 }}>{initial}</span>
      </button>
      {open && (
        <ProfileMenu
          onClose={() => setOpen(false)}
          onSwitch={() => { setOpen(false); onSwitch(); }}
          onCreateProfile={() => { setOpen(false); onCreateProfile(); }}
        />
      )}
    </>
  );
};

// Header avec logo + navigation mois (sans limite)
const MonthHeader = ({ mi, setMi, closed, onProfileAction }) => {
  const prev = () => setMi(p => p.month === 0 ? { month:11, year:p.year-1 } : { month:p.month-1, year:p.year });
  const next = () => setMi(p => p.month === 11 ? { month:0, year:p.year+1 } : { month:p.month+1, year:p.year });
  return (
    <div style={{ display:'flex', alignItems:'center', padding:'14px 16px 0', background:C.beige, flexShrink:0 }}>
      <div style={{ flex:1, display:'flex', alignItems:'center' }}>
        <img src="/logo-budget-club-favicon-rose.png" style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover' }} />
      </div>
      <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
        <button onClick={prev}
          style={{ background:'none', border:'none', cursor:'pointer', color:C.vert, fontSize:20, padding:'0 3px' }}>‹</button>
        <span style={{ fontFamily:serif, fontSize:'clamp(12px, 3.5vw, 16px)', fontWeight:600, color:C.vert, whiteSpace:'nowrap' }}>{MONTHS[mi.month]} {mi.year}</span>
        {closed && <i className="ti ti-lock" style={{ fontSize:13, color:C.gold, marginLeft:2 }} />}
        <button onClick={next}
          style={{ background:'none', border:'none', cursor:'pointer', color:C.vert, fontSize:20, padding:'0 3px' }}>›</button>
      </div>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'flex-end' }}>
        <ProfileBadge onSwitch={() => onProfileAction?.('select')} onCreateProfile={() => onProfileAction?.('create')} />
      </div>
    </div>
  );
};

// Barre de navigation 5 onglets
const TABS = [
  { id:'accueil',  icon:'ti-layout-grid', label:'Accueil'  },
  { id:'revenus',  icon:'ti-cash',        label:'Revenus'  },
  { id:'budget',   icon:'ti-chart-bar',   label:'Budget'   },
  { id:'depenses', icon:'ti-list',        label:'Suivi'    },
  { id:'epargne',  icon:'ti-trending-up', label:'Épargne'  },
];

const BottomNav = ({ view, setView, m }) => {
  const rev      = m.revenues.filter(r => (r.type || 'revenu') === 'revenu').reduce((s,r) => s + (r.amount||0), 0);
  const cb       = m.catBudgets || {};
  const bT       = m.bills.reduce((s,b) => s + b.amount, 0);
  const tv       = Object.values(cb).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const nonV     = Math.max(0, rev - bT - tv);
  const badges   = { revenus: m.revenues.filter(r => (r.type||'revenu') === 'revenu').length > 0, budget: m.budgetLocked || (rev > 0 && tv > 0 && nonV < 1), depenses: !!m.closed };

  return (
    <div style={{ display:'flex', alignItems:'stretch', background:'#FFFFFF', borderTop:'1px solid rgba(28,41,28,0.08)', flexShrink:0, height:60, boxSizing:'content-box', paddingBottom:'env(safe-area-inset-bottom)' }}>
      {TABS.map(t => {
        const active    = view === t.id || view === t.id + '_edit';
        const hasBadge  = badges[t.id];
        const inactiveColor = '#737874';
        return (
          <button key={t.id} onClick={() => setView(t.id)}
            style={{ flex:1, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', border:'none', background:'none', cursor:'pointer', padding:0 }}>
            {active && <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:28, height:2, background:C.vert }} />}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
              <div style={{ position:'relative', display:'inline-flex' }}>
                <i className={`ti ${t.icon}`} style={{ fontSize:20, color: active ? C.vert : inactiveColor }} />
                {hasBadge && (
                  <div style={{ position:'absolute', top:-4, right:-6, width:13, height:13, borderRadius:'50%', background:C.rose, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontSize:7, color:C.nav, fontWeight:800, lineHeight:1 }}>✓</span>
                  </div>
                )}
              </div>
              <span style={{ fontSize:11, color: active ? C.vert : inactiveColor, fontWeight: active ? 600 : 400, fontFamily:sans }}>{t.label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

// Bouton FAB contextuel
const FAB = ({ view, setModal, setView, depTab, setRevType, setExpTypeModal }) => {
  const [open, setOpen] = useState(false);
  const isMenuView = view === 'accueil' || view === 'revenus';

  const handleClick = () => {
    if (isMenuView)          { setOpen(o => !o); return; }
    if (view === 'budget')   { setView('budget_edit'); return; }
    if (view === 'depenses') { setModal(depTab === 'depenses' ? 'dep' : 'bill'); return; }
    if (view === 'epargne')  { setModal('dep'); return; }
  };

  const menuItem = (label, icon, action) => (
    <button onMouseDown={action}
      style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'12px 16px', background:'none', border:'none', borderBottom:`1px solid ${C.vert}`, fontFamily:sans, fontSize:13, fontWeight:600, color:C.vert, cursor:'pointer', textAlign:'left' }}>
      <i className={`ti ${icon}`} style={{ fontSize:16, color:C.vert }} />{label}
    </button>
  );

  return (
    <>
      {open && <div onClick={() => setOpen(false)} style={{ position:'fixed', inset:0, zIndex:9 }} />}
      {open && isMenuView && (
        <div style={{ position:'absolute', bottom:128, right:16, background:'white', borderRadius:14, boxShadow:'0 4px 24px rgba(28,41,28,0.18)', overflow:'hidden', zIndex:11, minWidth:200 }}>
          {menuItem('Revenu', 'ti-plus', () => { setModal('rev'); setOpen(false); })}
          {view === 'accueil' && menuItem('Remboursement', 'ti-arrow-back-up', () => { setExpTypeModal?.('remboursement'); setModal('dep'); setOpen(false); })}
          {view === 'accueil' && menuItem('Dépense', 'ti-minus', () => { setExpTypeModal?.('depense'); setModal('dep'); setOpen(false); })}
        </div>
      )}
      <button onClick={handleClick}
        style={{
          position:'absolute', bottom:68, right:16,
          width:50, height:50, borderRadius:8,
          background:C.vert, border:'none', color:'white',
          fontSize:24, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 4px 18px rgba(30,51,40,0.4)`, zIndex:10,
        }}>
        <i className="ti ti-plus" />
      </button>
    </>
  );
};

// Triangle attention dépassement budget
const WarningTriangle = () => (
  <svg width="17" height="15" viewBox="0 0 18 16" style={{ flexShrink:0, marginBottom:-1 }}>
    <path d="M9 1L17 15H1L9 1Z" fill={C.rose} stroke={C.vert} strokeWidth="1" />
    <text x="9" y="13" textAnchor="middle" fontSize="9" fontWeight="700" fill={C.vert} fontFamily="DM Sans">!</text>
  </svg>
);

// Bandeau mois clôturé
const ClosedBanner = () => (
  <div style={{ background:C.vert, padding:'7px 16px', display:'flex', alignItems:'center', justifyContent:'center', gap:8, flexShrink:0, marginBottom:12, marginTop:8 }}>
    <i className="ti ti-lock" style={{ fontSize:13, color:C.gold }} />
    <span style={{ fontFamily:sans, fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.85)' }}>Mois clôturé</span>
  </div>
);

// ─── MODALS ──────────────────────────────────────────────────

const ModalShell = ({ title, onClose, children }) => (
  <div style={{
    position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(28,41,28,0.5)',
    display:'flex', alignItems:'flex-end', zIndex:200,
  }}>
    <div style={{ background:C.card, borderRadius:'20px 20px 0 0', padding:'22px 18px', paddingBottom:'calc(22px + env(safe-area-inset-bottom))', width:'100%', maxHeight:'88%', overflowY:'auto' }}>
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

export const AddExpenseModal = ({ onAdd, onUpdate, initial, onClose, onAddRevenu, noRevenu, initExpType }) => {
  const isEdit = !!initial;
  const [type, setType]             = useState('depense');
  const [expType, setExpType]       = useState(initial?.type === 'remboursement' ? 'remboursement' : (initExpType || 'depense'));
  const [form, setForm]             = useState(
    initial
      ? { amount: String(initial.amount), cat: initial.cat, name: initial.name || '', date: initial.date || new Date().toISOString().split('T')[0] }
      : { amount:'', cat:'', name:'', date: new Date().toISOString().split('T')[0] }
  );
  const [revForm, setRevForm]       = useState({ amount:'', name:'' });
  const [customCats, setCustomCats] = useState(() => getCustomCats());
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('ti-tag');
  const [sugsVisible, setSugsVisible]   = useState(false);
  const [filteredSugs, setFilteredSugs] = useState([]);
  const [errs, setErrs]                 = useState({});

  const flashErrs = (e) => { setErrs(e); setTimeout(() => setErrs({}), 700); };

  const allCats = sortCatsWithDiversLast([...CATS, ...customCats]);
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = () => {
    const a = parseFloat(form.amount);
    if (!a || !form.cat) { flashErrs({ amount: !a, cat: !form.cat }); return; }
    const typeField = expType === 'remboursement' ? { type:'remboursement' } : {};
    if (isEdit) {
      onUpdate({ ...initial, name:form.name, amount:a, cat:form.cat, date:form.date, ...typeField });
    } else {
      onAdd({ id:'e'+Date.now(), name:form.name, amount:a, cat:form.cat, date:form.date, ...typeField });
      if (form.name && form.cat) saveDepSuggestion(form.name, form.cat);
    }
    onClose();
  };

  const submitRevenu = () => {
    const a = parseFloat(revForm.amount);
    if (!a || !revForm.name) { flashErrs({ revAmount: !a, revName: !revForm.name }); return; }
    onAddRevenu?.({ id:'r'+Date.now(), name:revForm.name, amount:a });
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

  const modalTitle = isEdit
    ? (expType === 'remboursement' ? 'Modifier le remboursement' : 'Modifier la dépense')
    : type === 'revenu' ? 'Ajouter un revenu'
    : expType === 'remboursement' ? 'Nouveau remboursement' : 'Nouvelle dépense';

  return (
    <ModalShell title={modalTitle} onClose={onClose}>
      {!isEdit && !noRevenu && (
        <div style={{ display:'flex', justifyContent:'center', gap:10, marginBottom:16 }}>
          {[{id:'depense',label:'Dépense'},{id:'revenu',label:'Revenu'}].map(t => (
            <button key={t.id} onClick={() => setType(t.id)}
              style={{ width:130, padding:'10px 0', borderRadius:30, fontSize:13, fontWeight:700, cursor:'pointer',
                fontFamily:serif, letterSpacing:1, textTransform:'uppercase', transition:'all .2s',
                background: type === t.id ? C.vert : C.card,
                color:      type === t.id ? 'white' : C.vert,
                border:     `1.5px solid ${type === t.id ? C.vert : C.rose}` }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {type === 'revenu' ? (
        <>
          <div style={{ marginBottom:14 }}>
            <Label>Montant</Label>
            <input type="number" inputMode="decimal" step="0.01" placeholder="0,00" value={revForm.amount}
              onChange={e => setRevForm(p => ({...p, amount:e.target.value}))}
              className={errs.revAmount ? 'field-err' : ''}
              style={{ width:'100%', fontFamily:serif, fontSize:36, fontWeight:700, border:'none', borderBottom:`2px solid ${C.rose}`, outline:'none', padding:'4px 0', background:'transparent', color:C.vert }} />
          </div>
          <div style={{ marginBottom:20 }}>
            <Label>Nom</Label>
            <TextInput placeholder="ex : Remboursement mutuelle" value={revForm.name} onChange={e => setRevForm(p => ({...p, name:e.target.value}))} className={errs.revName ? 'field-err' : ''} />
          </div>
          <SubmitBtn label="Valider" onClick={submitRevenu} />
        </>
      ) : (
        <>
          {noRevenu && (
            <div style={{ display:'flex', justifyContent:'center', gap:10, marginBottom:16 }}>
              {[{id:'depense',label:'Dépense'},{id:'remboursement',label:'Remboursement'}].map(t => (
                <button key={t.id} onClick={() => setExpType(t.id)}
                  style={{ width:130, padding:'10px 0', borderRadius:30, fontSize:11, fontWeight:700, cursor:'pointer',
                    fontFamily:serif, letterSpacing:0.5, textTransform:'uppercase', transition:'all .2s',
                    background: expType === t.id ? C.vert : C.card,
                    color:      expType === t.id ? 'white' : C.vert,
                    border:     `1.5px solid ${expType === t.id ? C.vert : C.rose}` }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
          <div style={{ marginBottom:14 }}>
            <Label>Montant</Label>
            <input type="number" inputMode="decimal" step="0.01" placeholder="0,00" value={form.amount}
              onChange={e => upd('amount', e.target.value)}
              className={errs.amount ? 'field-err' : ''}
              style={{ width:'100%', fontFamily:serif, fontSize:36, fontWeight:700, border:'none', borderBottom:`2px solid ${C.rose}`, outline:'none', padding:'4px 0', background:'transparent', color:C.vert }} />
          </div>
          <div style={{ marginBottom:14 }}>
            <Label>Catégorie</Label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
              {allCats.map(c => (
                <span key={c.id} onClick={() => upd('cat', c.id)}
                  className={errs.cat ? 'cat-err' : ''}
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
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', gap:10 }}>
              <div style={{ flex:1 }}>
                <Label>Nom</Label>
                <input
                  placeholder="ex : Carrefour"
                  value={form.name}
                  onChange={e => {
                    const val = e.target.value;
                    upd('name', val);
                    const allSugs = getDepSuggestions();
                    const f = val.length > 0
                      ? allSugs.filter(s => s.nom.toLowerCase().includes(val.toLowerCase())).slice(0, 5)
                      : [];
                    console.log('[BC] autocomplete keystroke:', val, '| matches:', f);
                    setFilteredSugs(f);
                    setSugsVisible(f.length > 0);
                  }}
                  onKeyDown={e => { if (e.key === 'Escape') setSugsVisible(false); }}
                  onBlur={() => setTimeout(() => setSugsVisible(false), 150)}
                  style={{ width:'100%', padding:'9px 12px', border:`1px solid ${C.border}`, borderRadius:10, fontSize:14, color:C.vert, background:'white', fontFamily:sans }}
                />
              </div>
              <div style={{ flex:1 }}><Label>Date</Label><DateInput value={form.date} onChange={e => upd('date', e.target.value)} /></div>
            </div>
            {sugsVisible && (
              <div style={{ background:'white', border:`1px solid ${C.rose}`, borderRadius:8, marginTop:4, overflow:'hidden' }}>
                {filteredSugs.map((s, i) => (
                  <div key={i}
                    onMouseDown={() => { upd('name', s.nom); upd('cat', s.categorie); setSugsVisible(false); }}
                    style={{ padding:'8px 12px', fontFamily:sans, fontSize:13, color:C.vert, borderBottom: i < filteredSugs.length - 1 ? `1px solid ${C.rose}` : 'none', cursor:'pointer' }}>
                    {s.nom}
                  </div>
                ))}
              </div>
            )}
          </div>
          <SubmitBtn label={isEdit ? (expType === 'remboursement' ? 'Modifier le remboursement' : 'Modifier la dépense') : (expType === 'remboursement' ? 'Valider le remboursement' : 'Valider la dépense')} onClick={submit} />
        </>
      )}
    </ModalShell>
  );
};

// Modal Ajouter revenu
export const AddRevenuModal = ({ onAdd, onClose, revType='revenu' }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ name:'', amount:'', date:today });
  const [errs, setErrs] = useState({});
  const flashErrs = (e) => { setErrs(e); setTimeout(() => setErrs({}), 700); };
  const submit = () => {
    const a = parseFloat(form.amount);
    if (!a || !form.name) { flashErrs({ amount: !a, name: !form.name }); return; }
    onAdd({ id:'r'+Date.now(), name:form.name, amount:a, date:form.date || today, type:revType });
    onClose();
  };
  const title = revType === 'remboursement' ? 'Ajouter un remboursement' : 'Ajouter un revenu';
  return (
    <ModalShell title={title} onClose={onClose}>
      <div style={{ display:'flex', gap:10, marginBottom:14 }}>
        <div style={{ flex:2 }}><Label>Source</Label><TextInput placeholder="ex : Salaire, Virement..." value={form.name} onChange={e => setForm(p => ({...p, name:e.target.value}))} className={errs.name ? 'field-err' : ''} /></div>
        <div style={{ flex:1 }}>
          <Label>Date</Label>
          <input type="date" value={form.date} onChange={e => setForm(p => ({...p, date:e.target.value}))}
            style={{ width:'100%', fontFamily:sans, fontSize:13, border:'none', borderBottom:`1.5px solid ${C.rose}`, outline:'none', padding:'6px 0', background:'transparent', color:C.vert }} />
        </div>
      </div>
      <div style={{ marginBottom:20 }}>
        <Label>Montant</Label>
        <input type="number" inputMode="decimal" step="0.01" placeholder="0,00" value={form.amount}
          onChange={e => setForm(p => ({...p, amount:e.target.value}))}
          className={errs.amount ? 'field-err' : ''}
          style={{ width:'100%', fontFamily:serif, fontSize:36, fontWeight:700, border:'none', borderBottom:`2px solid ${C.rose}`, outline:'none', padding:'4px 0', background:'transparent', color:C.vert }} />
      </div>
      <SubmitBtn label={revType === 'remboursement' ? 'Ajouter le remboursement' : 'Ajouter le revenu'} onClick={submit} />
    </ModalShell>
  );
};

// Modal Ajouter facture
const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export const AddBillModal = ({ onAdd, onClose, mi }) => {
  const [form, setForm]               = useState({ name:'', amount:'' });
  const [errs, setErrs]               = useState({});
  const [scope, setScope]             = useState('recurring');
  const [selectedMonths, setSelectedMonths] = useState(mi ? [{ year: mi.year, month: mi.month }] : []);

  const next12 = mi ? Array.from({ length: 12 }, (_, i) => {
    const total = mi.month + i;
    return { year: mi.year + Math.floor(total / 12), month: total % 12 };
  }) : [];

  const toggleMonth = ({ year, month }) => setSelectedMonths(prev => {
    const has = prev.some(s => s.year === year && s.month === month);
    return has ? prev.filter(s => !(s.year === year && s.month === month)) : [...prev, { year, month }];
  });

  const flashErrs = (e) => { setErrs(e); setTimeout(() => setErrs({}), 700); };

  const submit = () => {
    const a = parseFloat(form.amount);
    if (!a || !form.name) { flashErrs({ amount: !a, name: !form.name }); return; }
    if (scope === 'specific' && selectedMonths.length === 0) return;
    onAdd({ id:'b'+Date.now(), name:form.name, amount:a, realAmount:a, paid:false, paidDate:'' },
          scope === 'recurring' ? 'recurring' : selectedMonths);
    onClose();
  };

  return (
    <ModalShell title="Ajouter une facture" onClose={onClose}>
      <div style={{ marginBottom:14 }}>
        <Label>Nom de la facture</Label>
        <TextInput placeholder="ex : EDF, Loyer..." value={form.name} onChange={e => setForm(p => ({...p, name:e.target.value}))} className={errs.name ? 'field-err' : ''} />
      </div>
      <div style={{ marginBottom:16 }}>
        <Label>Montant</Label>
        <input type="number" inputMode="decimal" step="0.01" placeholder="0,00" value={form.amount}
          onChange={e => setForm(p => ({...p, amount:e.target.value}))}
          className={errs.amount ? 'field-err' : ''}
          style={{ width:'100%', fontFamily:serif, fontSize:36, fontWeight:700, border:'none', borderBottom:`2px solid ${C.rose}`, outline:'none', padding:'4px 0', background:'transparent', color:C.vert }} />
      </div>
      <div style={{ marginBottom: scope === 'specific' ? 12 : 20 }}>
        <Label>Récurrence</Label>
        <div style={{ display:'flex', gap:8 }}>
          {[{id:'recurring',label:'Toujours'},{id:'specific',label:'Mois spécifiques'}].map(t => (
            <button key={t.id} onClick={() => setScope(t.id)}
              style={{ flex:1, padding:'9px 0', borderRadius:20, fontSize:11, fontWeight:700, cursor:'pointer',
                fontFamily:serif, letterSpacing:0.5, textTransform:'uppercase', transition:'all .2s',
                background: scope === t.id ? C.vert : C.card,
                color:      scope === t.id ? 'white' : C.vert,
                border:     `1.5px solid ${scope === t.id ? C.vert : C.rose}` }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {scope === 'specific' && (
        <div style={{ marginBottom:20, maxHeight:180, overflowY:'auto', border:`1px solid ${C.border}`, borderRadius:10 }}>
          {next12.map(({ year, month }) => {
            const checked = selectedMonths.some(s => s.year === year && s.month === month);
            return (
              <div key={`${year}-${month}`} onClick={() => toggleMonth({ year, month })}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', cursor:'pointer', borderBottom:`0.5px solid ${C.border}` }}>
                <div style={{ width:18, height:18, borderRadius:5, border:`1.5px solid ${checked ? C.vert : C.border}`, background: checked ? C.vert : 'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .15s' }}>
                  {checked && <i className="ti ti-check" style={{ fontSize:10, color:'white' }} />}
                </div>
                <span style={{ fontFamily:sans, fontSize:13, color:C.vert }}>{MOIS_FR[month]} {year}</span>
              </div>
            );
          })}
        </div>
      )}
      <SubmitBtn label="Ajouter la facture" onClick={submit} />
    </ModalShell>
  );
};

const DeleteBillScopeModal = ({ bill, onDeleteThisMonth, onDeletePermanently, onClose }) => (
  <ModalShell title="Supprimer la facture" onClose={onClose}>
    <div style={{ fontFamily:sans, fontSize:14, color:C.vert, marginBottom:20, lineHeight:1.5 }}>
      Que souhaitez-vous faire avec <strong>{bill.name}</strong> ?
    </div>
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <button onClick={onDeleteThisMonth}
        style={{ textAlign:'left', padding:'12px 16px', background:C.beige, border:'1px solid rgba(28,41,28,0.15)', borderRadius:12, cursor:'pointer', fontFamily:sans, width:'100%' }}>
        <div style={{ fontSize:13, fontWeight:600, color:C.vert, marginBottom:3 }}>Ce mois uniquement</div>
        <div style={{ fontSize:11, color:C.muted }}>La facture reste dans les mois suivants</div>
      </button>
      <button onClick={onDeletePermanently}
        style={{ textAlign:'left', padding:'12px 16px', background:C.beige, border:'1px solid rgba(28,41,28,0.15)', borderRadius:12, cursor:'pointer', fontFamily:sans, width:'100%' }}>
        <div style={{ fontSize:13, fontWeight:600, color:C.vert, marginBottom:3 }}>Supprimer définitivement</div>
        <div style={{ fontSize:11, color:C.muted }}>Retire de tous les mois à venir</div>
      </button>
      <button onClick={onClose}
        style={{ padding:'10px 0', background:'white', border:'1px solid rgba(28,41,28,0.1)', borderRadius:12, cursor:'pointer', fontFamily:sans, fontSize:13, color:C.vert, width:'100%' }}>
        Annuler
      </button>
    </div>
  </ModalShell>
);

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
export function AccueilView({ m, mi, setMi, setView, setDepTab, updateData, onProfileAction }) {
  const [confirmClose, setConfirmClose] = useState(false);
  const [soldeFinalInput, setSoldeFinalInput] = useState('');
  const [showSteps, setShowSteps] = useState(false);
  const closeRef = useRef(null);
  const rev    = m.revenues.filter(r => (r.type || 'revenu') === 'revenu').reduce((s,r) => s + (r.amount||0), 0);
  const allBills  = m.bills.filter(b => b.selected !== false);
  const bT        = allBills.reduce((s,b) => s + billValue(b), 0);
  const bTPrevu   = allBills.reduce((s,b) => s + b.amount, 0);
  const paidBills = allBills.filter(b => b.paid);
  const paidAmt   = paidBills.reduce((s,b) => s + billValue(b), 0);
  const pN = paidBills.length, bN = allBills.length;
  const expRmb = m.expenses.filter(e => e.type === 'remboursement' && e.cat !== 'epargne_livret' && e.cat !== 'epargne_pea').reduce((s,e) => s + (e.amount||0), 0);
  const eT     = m.expenses.filter(e => e.type !== 'remboursement' && e.cat !== 'epargne_livret' && e.cat !== 'epargne_pea').reduce((s,e) => s + (e.amount||0), 0);
  const epg    = m.expenses.filter(e => (e.cat === 'epargne_livret' || e.cat === 'epargne_pea')).reduce((s,e) => s + (e.amount||0), 0);
  const reste  = Math.round((rev - bT - eT + expRmb - epg) * 100) / 100;
  const pp     = rev > 0 ? Math.min(100, Math.round((eT - expRmb) / rev * 100)) : 0;

  // Indicateur de rythme
  const startDay = getStartDay();
  const todayDate = new Date();
  const budgetMStart = new Date(mi.year, mi.month, startDay);
  const nextMonthNum = mi.month === 11 ? 0 : mi.month + 1;
  const nextYearNum  = mi.month === 11 ? mi.year + 1 : mi.year;
  const budgetMEnd   = new Date(nextYearNum, nextMonthNum, startDay);
  const joursTotal   = Math.round((budgetMEnd - budgetMStart) / 86400000);
  const joursEcoules = Math.max(0, Math.min(joursTotal, Math.floor((todayDate - budgetMStart) / 86400000)));
  const joursRestants = Math.max(0, joursTotal - joursEcoules);
  const pctMois = joursTotal > 0 ? joursEcoules / joursTotal * 100 : 0;
  const totalDisponible = rev - bT;
  const depensesLibres = Math.max(0, totalDisponible - reste);
  const pctConsomme = totalDisponible > 0 ? Math.min(100, depensesLibres / totalDisponible * 100) : 0;
  const ecart = pctConsomme - pctMois;
  let verdictLabel, verdictColor;
  if (reste < 50)          { verdictLabel = "T'as tout dépensé, pose ta CB";  verdictColor = '#E8637A'; }
  else if (reste < 100)    { verdictLabel = 'On freine un peu'; verdictColor = C.rose; }
  else if (ecart > 15)     { verdictLabel = 'On freine un peu'; verdictColor = C.rose; }
  else                     { verdictLabel = 'Queen du budget';  verdictColor = 'white'; }

  const cb5    = m.catBudgets || {};
  const tvBgt5 = Object.values(cb5).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const nonV5  = Math.max(0, rev - bTPrevu - tvBgt5);
  const facVal = !!m.facturesValidees;
  const checks = [
    facVal,
    rev > 0,
    m.budgetLocked || (rev > 0 && tvBgt5 > 0 && nonV5 < 1),
    m.expenses.filter(e => e.cat !== 'epargne_livret' && e.cat !== 'epargne_pea').length > 0,
    !!m.closed,
  ];
  const steps = [
    { num:1, label:'Vérifier ses factures', action: () => { setView('depenses'); setDepTab?.('factures');  } },
    { num:2, label:'Déclarer ses revenus',  action: () => setView('revenus') },
    { num:3, label:'Allouer son budget',    action: () => setView('budget') },
    { num:4, label:'Suivre ses dépenses',   action: () => { setView('depenses'); setDepTab?.('depenses'); } },
    { num:5, label:'Clôturer le mois',      action: () => closeRef.current?.scrollIntoView({ behavior:'smooth', block:'center' }) },
  ];

  return (
    <>
      <MonthHeader mi={mi} setMi={setMi} closed={m.closed} onProfileAction={onProfileAction} />
      {m.closed && <ClosedBanner />}
      <div style={{ display:'flex', flexDirection:'column', flex:1, gap:10, padding:'16px 28px', paddingTop:24, paddingBottom:'calc(16px + env(safe-area-inset-bottom))', background:C.beige, overflow:'hidden' }}>
        {/* Card Reste à vivre du mois */}
        <div style={{ background:C.vert, borderRadius:16, padding:'24px 20px', textAlign:'center', marginTop: m.closed ? 8 : 0, display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
          <div style={{ fontFamily:sans, fontSize:10, fontWeight:600, letterSpacing:2, textTransform:'uppercase', color:'white', marginBottom:4 }}>Reste à vivre du mois</div>
          {rev === 0
            ? <div style={{ fontFamily:serif, fontSize:26, fontStyle:'italic', color:C.rose, lineHeight:1.3 }}>Revenus non saisis</div>
            : <>
                <div style={{ fontFamily:serif, fontSize:40, fontWeight:700, color: reste >= 0 ? C.rose : '#E8637A', lineHeight:1 }}>{fmtR(reste)}</div>
                <div style={{ fontFamily:sans, fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:8 }}>sur {fmtR(totalDisponible)}</div>
              </>
          }
          {/* Jauge unique avec verdict + trait de position mois */}
          {rev > 0 && (
            <div style={{ marginTop:20 }}>
              <div style={{ position:'relative', height:5, background:'rgba(255,255,255,0.15)', borderRadius:3 }}>
                <div style={{ position:'absolute', top:0, left:0, height:'100%', width:'100%', background:'white', borderRadius:3, transformOrigin:'left', transform:`scaleX(${pctConsomme / 100})`, transition:'transform 0.6s ease' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                  {reste < 50
                    ? <i className="ti ti-alert-triangle" style={{ fontSize:14, color:C.rose, flexShrink:0 }} />
                    : verdictLabel === 'On freine un peu'
                      ? <i className="ti ti-alert-triangle" style={{ fontSize:14, color:C.rose, flexShrink:0 }} />
                      : <span style={{ width:6, height:6, borderRadius:'50%', background:verdictColor, display:'inline-block', flexShrink:0 }} />
                  }
                  <span style={{ fontFamily:sans, fontSize:10, color: reste < 50 ? C.rose : 'rgba(255,255,255,0.75)', whiteSpace:'nowrap' }}>{verdictLabel}</span>
                </span>
                <span style={{ fontFamily:sans, fontSize:10, color:'rgba(255,255,255,0.6)', whiteSpace:'nowrap' }}>Encore {joursRestants}j</span>
              </div>
            </div>
          )}
        </div>
        {/* Citation */}
        <div style={{ textAlign:'center', fontFamily:serif, fontSize:15, fontStyle:'italic', color:C.muted, flexShrink:0, margin:'10px 0' }}>
          Gérez l'ordinaire pour vous offrir l'extraordinaire.
        </div>
        {/* 4 mini-cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:10 }}>
          {[
            { label:'Revenus',  val:fmtP(rev), icon:'ti-credit-card',  vw:'revenus' },
            { label:'Factures', val:'', node:<><span style={{ color:C.vert }}>{fmtP(paidAmt)}</span><span style={{ color:C.vert }}> / {fmtP(bT)}</span></>, sub:`${pN}/${bN} prélevées`, icon:'ti-file-invoice', vw:'depenses' },
            { label:'Épargne',  val:fmtP(epg), icon:'ti-building-bank', vw:'epargne'  },
            { label:'Dépenses', val:fmtP(eT - expRmb), icon:'ti-shopping-bag', vw:'depenses' },
          ].map(c => (
            <div key={c.label} onClick={() => setView(c.vw)}
              style={{ background:C.card, borderRadius:12, paddingTop:'16px', paddingBottom:'16px', paddingLeft:'16px', paddingRight:'16px', boxShadow:'0 1px 8px rgba(28,41,28,0.08)', cursor:'pointer', display:'flex', flexDirection:'column' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontFamily:sans, fontSize:12, color:C.muted, fontWeight:500 }}>{c.label}</span>
                <i className={`ti ${c.icon}`} style={{ fontSize:17, color:'rgba(28,41,28,0.25)' }} />
              </div>
              <div>
                <div style={{ fontFamily:serif, fontSize:16, fontWeight:600, color:C.vert }}>{c.node || c.val}</div>
                <div style={{ fontFamily:sans, fontSize:c.subSize || 11, color:C.muted, marginTop:2, visibility: c.sub ? 'visible' : 'hidden' }}>{c.sub || ' '}</div>
              </div>
            </div>
          ))}
        </div>
        {/* Boutons Clôturer le mois / Étapes du mois */}
        <div style={{ display:'flex', flexDirection:'column', width:'100%', gap:10 }}>
          <button onClick={() => { if (!m.closed) setConfirmClose(true); }}
            style={m.closed
              ? { display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'transparent', border:'1px solid rgba(28,41,28,0.2)', borderRadius:8, padding:'10px 16px', cursor:'default', width:'100%', flexShrink:0 }
              : { display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'12px 20px', background:C.vert, border:'none', borderRadius:8, cursor:'pointer', flexShrink:0 }
            }>
            <i className="ti ti-lock" style={{ fontSize: m.closed ? 15 : 16, color: m.closed ? C.vert : 'white', flexShrink:0 }} />
            <span style={{ fontFamily:sans, fontSize:13, fontWeight: m.closed ? 600 : 700, color: m.closed ? C.vert : 'white' }}>Clôturer le mois</span>
          </button>
          <button onClick={() => setShowSteps(true)}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'transparent', border:'1px solid rgba(28,41,28,0.2)', borderRadius:8, padding:'10px 16px', cursor:'pointer', width:'100%', flexShrink:0 }}>
            <i className="ti ti-list-check" style={{ fontSize:15, color:C.vert, flexShrink:0 }} />
            <span style={{ fontFamily:sans, fontSize:13, fontWeight:600, color:C.vert }}>Étapes du mois</span>
          </button>
        </div>

        {showSteps && (
          <div onClick={() => setShowSteps(false)}
            style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(28,41,28,0.5)', display:'flex', alignItems:'flex-end', zIndex:150 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:C.vert, borderRadius:'20px 20px 0 0', padding:'18px 16px', paddingBottom:'calc(18px + env(safe-area-inset-bottom))', width:'100%', maxHeight:'85%', overflowY:'auto' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <span style={{ fontFamily:sans, fontSize:10, fontWeight:600, color:'white', letterSpacing:'3px', textTransform:'uppercase' }}>Mon mois en 5 étapes</span>
                <button onClick={() => setShowSteps(false)}
                  style={{ background:'rgba(255,255,255,0.12)', border:'none', width:26, height:26, borderRadius:'50%', cursor:'pointer', fontSize:13, color:'white' }}>✕</button>
              </div>
              {steps.map((step, i) => (
                <div key={step.num} onClick={() => { step.action(); if (step.num !== 5) setShowSteps(false); }}
                  style={{ display:'flex', alignItems:'center', gap:10, padding: i === steps.length - 1 ? '7px 0 4px' : '7px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none', cursor:'pointer' }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background:C.rose, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, padding:0 }}>
                    <span style={{ fontFamily:serif, fontSize:12, fontWeight:700, color:C.vert, lineHeight:1, textAlign:'center', display:'block' }}>{step.num}</span>
                  </div>
                  <span style={{ fontFamily:sans, fontSize:12, color: (i === 3 ? m.closed : checks[i]) ? 'rgba(255,255,255,0.4)' : 'white', flex:1 }}>{step.label}</span>
                  {i === 3
                    ? m.closed
                      ? <span style={{ color:C.rose, fontWeight:700, fontSize:13, flexShrink:0 }}>✓</span>
                      : checks[i]
                        ? <i className="ti ti-hourglass" style={{ fontSize:14, color:C.rose, flexShrink:0 }} />
                        : <span style={{ color:'rgba(255,255,255,0.7)', fontSize:18, flexShrink:0 }}>›</span>
                    : checks[i]
                      ? <span style={{ color:C.rose, fontWeight:700, fontSize:13, flexShrink:0 }}>✓</span>
                      : <span style={{ color:'rgba(255,255,255,0.7)', fontSize:18, flexShrink:0 }}>›</span>
                  }
                </div>
              ))}

              {/* Clôture du mois */}
              <div ref={closeRef} style={{ marginTop:14 }}>
                {m.closed ? (
                  <button onClick={() => {
                    updateData(mm => { mm.closed = false; delete mm.soldeFinal; });
                    const nextMonth = mi.month === 11 ? 0 : mi.month + 1;
                    const nextYear  = mi.month === 11 ? mi.year + 1 : mi.year;
                    const nextKey   = `${currentProfileId}:budget:${nextYear}:${String(nextMonth + 1).padStart(2, '0')}`;
                    const reportId  = `r-report-${mi.year}-${String(mi.month + 1).padStart(2, '0')}`;
                    try {
                      const nextRaw = localStorage.getItem(nextKey);
                      if (nextRaw) {
                        const nextData = JSON.parse(nextRaw);
                        if (nextData.revenues?.some(r => r.id === reportId)) {
                          nextData.revenues = nextData.revenues.filter(r => r.id !== reportId);
                          localStorage.setItem(nextKey, JSON.stringify(nextData));
                        }
                      }
                    } catch {}
                  }}
                    style={{ width:'100%', padding:'10px 0', background:C.rose, border:'none', borderRadius:10, fontFamily:sans, fontSize:13, fontWeight:600, color:C.vert, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    <i className="ti ti-lock-open" style={{ fontSize:15 }} /> Réouvrir le mois
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}
        {confirmClose && (
          <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:200, background:'white', border:'1px solid rgba(28,41,28,0.1)', borderRadius:'10px 10px 0 0', padding:'12px 14px', paddingBottom:'calc(80px + env(safe-area-inset-bottom))' }}>
            <div style={{ fontFamily:sans, fontSize:12, fontWeight:600, color:C.vert, marginBottom:6, textAlign:'center' }}>Clôturer le mois</div>
            <div style={{ fontFamily:sans, fontSize:11, color:C.muted, marginBottom:8 }}>Solde sur votre compte à la clôture</div>
            <input
              type="number" step="0.01" placeholder="ex : 1 250"
              value={soldeFinalInput}
              onChange={e => setSoldeFinalInput(e.target.value)}
              style={{ width:'100%', padding:'9px 12px', border:'1px solid rgba(28,41,28,0.15)', borderRadius:8, fontSize:15, fontFamily:serif, color:C.vert, background:'white', marginBottom:10, boxSizing:'border-box' }}
            />
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => {
                const sf = parseFloat(soldeFinalInput);
                updateData(mm => { mm.closed = true; if (sf) mm.soldeFinal = sf; });
                setConfirmClose(false);
                setSoldeFinalInput('');
              }}
                style={{ flex:1, padding:9, background:C.vert, color:'white', border:'none', borderRadius:8, fontFamily:sans, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Confirmer
              </button>
              <button onClick={() => {
                updateData(mm => { mm.closed = true; });
                setConfirmClose(false);
                setSoldeFinalInput('');
              }}
                style={{ padding:'9px 12px', background:'white', border:'1px solid rgba(28,41,28,0.15)', borderRadius:8, cursor:'pointer', color:C.muted, fontFamily:sans, fontSize:13 }}>
                Passer
              </button>
              <button onClick={() => { setConfirmClose(false); setSoldeFinalInput(''); }}
                style={{ padding:'9px 12px', background:'white', border:'1px solid rgba(28,41,28,0.15)', borderRadius:8, cursor:'pointer', color:C.muted, fontFamily:sans, fontSize:13 }}>
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Vue BUDGET
export function BudgetView({ m, mi, setMi, setView, updateData, onProfileAction }) {
  const cb   = m.catBudgets || {};
  const [customCats, setCustomCats]       = useState(getCustomCats);
  const [showEnv, setShowEnv]             = useState(false);
  const [envName, setEnvName]             = useState('');
  const [envIcon, setEnvIcon]             = useState('ti-tag');
  const [confirmDelCat, setConfirmDelCat] = useState(null);

  const SAVINGS_LABELS = { epargne_livret: 'Épargne', epargne_pea: 'Investissement' };
  const catLabel = (cat) => SAVINGS_LABELS[cat.id] || cat.label;
  const allCatList = sortCatsWithDiversLast([...CATS, ...customCats]);
  const cwb  = allCatList.filter(c => cb[c.id]);
  const tv   = cwb.reduce((s,c) => s + (cb[c.id]||0), 0);
  const rev  = m.revenues.reduce((s,r) => s + (r.amount||0), 0);
  const bT   = m.bills.reduce((s,b) => s + b.amount, 0);
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
      <MonthHeader mi={mi} setMi={setMi} closed={m.closed} onProfileAction={onProfileAction} />
      {m.closed && <ClosedBanner />}
      <div style={{ textAlign:'center', padding:'8px 0 4px', fontFamily:serif, fontSize:16, color:C.vert, letterSpacing:'3px', flexShrink:0, background:C.beige }}><span style={{ color:C.vert }}>❧</span> BUDGET <span style={{ color:C.vert }}>❧</span></div>
      <div style={{ textAlign:'center', padding:'6px 16px', fontFamily:serif, fontSize:12, fontStyle:'italic', color:C.muted, flexShrink:0, background:C.beige }}>
        Un bon budget est la première étape vers la liberté financière.
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'0 16px 0', paddingBottom:'calc(80px + env(safe-area-inset-bottom))', background:C.beige }}>
        {/* Card état budget */}
        <div onClick={() => setView('budget_edit')}
          style={{ background:C.vert, borderRadius:14, padding:'14px 18px', marginBottom:(done || m.budgetLocked) ? 8 : 16, marginTop:8, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:'50%', background: (done || m.budgetLocked) ? C.rose : 'rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <i className={`ti ${m.budgetLocked ? 'ti-lock' : done ? 'ti-circle-check' : 'ti-hourglass'}`} style={{ fontSize:16, color: (done || m.budgetLocked) ? C.vert : C.rose }} />
            </div>
            <div>
              <div style={{ fontFamily:sans, fontSize:10, fontWeight:600, letterSpacing:1.5, color:'rgba(255,255,255,0.55)', textTransform:'uppercase' }}>
                {m.budgetLocked ? 'Budget verrouillé' : done ? 'Budget terminé' : 'Budget en cours'}
              </div>
              <div style={{ fontFamily:serif, fontSize:26, fontWeight:700, color:C.rose, lineHeight:1.1 }}>
                {fmtP(nonV)} <span style={{ fontSize:15, fontWeight:400, color:C.rose }}>à répartir</span>
              </div>
            </div>
          </div>
          <i className="ti ti-chevron-right" style={{ fontSize:18, color:'rgba(255,255,255,0.4)' }} />
        </div>
        {done && !m.budgetLocked && (
          <button onClick={() => updateData(mm => { mm.budgetLocked = true; })}
            style={{ width:'100%', padding:'10px 0', background:'none', border:`1.5px solid rgba(28,41,28,0.25)`, borderRadius:10, fontFamily:sans, fontSize:13, fontWeight:500, color:C.vert, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:16 }}>
            🔒 Verrouiller mon budget
          </button>
        )}
        {m.budgetLocked && (
          <div style={{ textAlign:'center', marginBottom:16 }}>
            <button onClick={() => updateData(mm => { mm.budgetLocked = false; })}
              style={{ background:'none', border:'none', cursor:'pointer', fontFamily:sans, fontSize:12, color:C.muted, textDecoration:'underline' }}>
              Déverrouiller
            </button>
          </div>
        )}

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
                  {isCustom ? 'Supprimer ' : 'Retirer le budget '}<strong>{catLabel(cat)}</strong> ?
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
                    <span style={{ fontFamily:sans, fontSize:14, fontWeight:500, color:C.text }}>{catLabel(cat)}</span>
                    {ov && <WarningTriangle />}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontFamily:sans, fontSize:12, color: ov ? '#E8637A' : C.muted }}>{fmtR(sp)} / {fmtP(bg)}</span>
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
                <span style={{ fontFamily:sans, fontSize:13, color:C.vert }}>Supprimer <strong>{catLabel(cat)}</strong> ?</span>
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
                  <span style={{ fontFamily:sans, fontSize:14, color:'rgba(28,41,28,0.4)' }}>{catLabel(cat)}</span>
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
  const bT              = m.bills.reduce((s,b) => s + b.amount, 0);
  const rpe             = rev - bT;
  const [vals, setVals] = useState({ ...cb });
  const [saved, setSaved] = useState(false);
  const debounceRef       = useRef(null);
  const [customCats, setCustomCats]         = useState(getCustomCats);
  const [confirmDelEdit, setConfirmDelEdit] = useState(null);
  const [removedFromEdit, setRemovedFromEdit] = useState([]);
  const SAVINGS_CATS = [
    { id: 'epargne_livret', label: 'Épargne',       icon: 'ti-building-bank' },
    { id: 'epargne_pea',    label: 'Investissement', icon: 'ti-trending-up'   },
  ];
  const allCatList = [
    ...sortCatsWithDiversLast([...CATS.filter(c => c.id !== 'epargne_livret' && c.id !== 'epargne_pea'), ...customCats])
      .filter(c => !removedFromEdit.includes(c.id)),
    ...SAVINGS_CATS.filter(c => !removedFromEdit.includes(c.id)),
  ];

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
    <div style={{ flex:1, overflowY:'auto', padding:'0 16px 0', paddingBottom:'calc(80px + env(safe-area-inset-bottom))', background:C.beige }}>
      {/* Card non ventilé */}
      <div style={{ background:C.vert, borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:sans, fontSize:12, color:'white', fontWeight:500 }}>Reste à ventiler</span>
          {rev > 0 && <span style={{ fontFamily:serif, fontSize:22, fontWeight:700, color: lft >= 0 ? C.rose : '#FF8A80' }}>{fmtP(lft)}</span>}
        </div>
        {rev === 0 && <div style={{ fontFamily:sans, fontSize:12, fontStyle:'italic', color:C.rose, marginTop:4 }}>Revenus non saisis</div>}
        <div style={{ height:3, background:'rgba(238,196,196,0.2)', borderRadius:2, marginTop:8, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${rev > 0 && rpe > 0 ? Math.min(100, Math.round(tv/rpe*100)) : 0}%`, background:C.rose, borderRadius:2 }} />
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
      {!m.closed && SAVINGS_CATS.some(sc => removedFromEdit.includes(sc.id)) && (
        <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6 }}>
          {SAVINGS_CATS.filter(sc => removedFromEdit.includes(sc.id)).map(sc => (
            <button key={sc.id} onClick={() => setRemovedFromEdit(prev => prev.filter(id => id !== sc.id))}
              style={{ width:'100%', padding:'9px 0', background:'none', border:`1.5px dashed rgba(28,41,28,0.2)`, borderRadius:10, fontFamily:sans, fontSize:12, color:C.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <i className={`ti ${sc.icon}`} style={{ fontSize:13 }} /> + Ajouter {sc.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Vue REVENUS
function RevenueRow({ r, i, onUpdate, onDelete, closed }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name:'', amount:'', date:'', type:'revenu' });

  const openForm = () => {
    setForm({ name: r.name, amount: String(r.amount), date: r.date || '', type: r.type || 'revenu' });
    setOpen(true);
  };

  const save = () => {
    const a = parseFloat(form.amount);
    if (!a || !form.name.trim()) return;
    onUpdate(i, { ...r, name: form.name.trim(), amount: a, date: form.date, type: form.type });
    setOpen(false);
  };

  const cancel = () => setOpen(false);

  if (open) {
    return (
      <div style={{ background:C.beige, borderRadius:12, padding:'14px 16px', marginBottom:10, border:`1px solid ${C.border}` }}>
        <div style={{ marginBottom:10 }}>
          <Label>Nom</Label>
          <input autoFocus value={form.name} onChange={e => setForm(p => ({ ...p, name:e.target.value }))}
            style={{ width:'100%', padding:'8px 10px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:14, color:C.vert, background:'white', fontFamily:sans, outline:'none', boxSizing:'border-box' }} />
        </div>
        <div style={{ display:'flex', gap:10, marginBottom:10 }}>
          <div style={{ flex:1.5 }}>
            <Label>Montant</Label>
            <input type="number" inputMode="decimal" step="0.01" value={form.amount}
              onChange={e => setForm(p => ({ ...p, amount:e.target.value }))}
              style={{ width:'100%', padding:'8px 10px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:15, color:C.vert, background:'white', fontFamily:serif, fontWeight:600, outline:'none', boxSizing:'border-box' }} />
          </div>
          <div style={{ flex:1 }}>
            <Label>Date</Label>
            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date:e.target.value }))}
              style={{ width:'100%', padding:'8px 6px', border:`1px solid ${C.border}`, borderRadius:8, fontSize:12, color:C.vert, background:'white', fontFamily:sans, outline:'none', boxSizing:'border-box' }} />
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={save}
            style={{ flex:1, padding:'10px 0', background:C.vert, color:'white', border:'none', borderRadius:8, fontFamily:sans, fontSize:13, fontWeight:600, cursor:'pointer' }}>
            Enregistrer
          </button>
          <button onClick={() => onDelete(i)}
            style={{ padding:'10px 13px', background:'rgba(232,99,122,0.1)', border:'none', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <i className="ti ti-trash" style={{ fontSize:16, color:'#E8637A' }} />
          </button>
          <button onClick={cancel}
            style={{ padding:'10px 13px', background:'white', border:`1px solid ${C.rose}`, borderRadius:8, cursor:'pointer', color:C.vert, fontFamily:sans, fontSize:14, lineHeight:1 }}>
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={() => { if (closed) return; openForm(); }}
      style={{ background:C.card, borderRadius:12, padding:'14px 18px', marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center', border:`0.5px solid ${C.border}`, cursor: closed ? 'default' : 'pointer' }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontFamily:sans, fontSize:15, color:C.vert }}>{r.name}</span>
        </div>
        {r.date && <div style={{ fontFamily:sans, fontSize:11, color:C.muted, marginTop:2 }}>{new Date(r.date + 'T12:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'long' })}</div>}
      </div>
      <span style={{ fontFamily:serif, fontSize:20, fontWeight:600, color:C.vert, flexShrink:0 }}>+{fmtR(r.amount)}</span>
    </div>
  );
}

export function RevenusView({ m, mi, setMi, updateData, onProfileAction }) {
  const revenus = m.revenues.filter(r => (r.type || 'revenu') === 'revenu');
  const total   = revenus.reduce((s,r) => s + (r.amount||0), 0);
  const del = (i)          => updateData(mm => { mm.revenues = mm.revenues.filter((_,idx) => idx !== i); });
  const upd = (i, updated) => updateData(mm => { mm.revenues = mm.revenues.map((r, idx) => idx === i ? updated : r); });

  return (
    <>
      <MonthHeader mi={mi} setMi={setMi} closed={m.closed} onProfileAction={onProfileAction} />
      {m.closed && <ClosedBanner />}
      <div style={{ textAlign:'center', padding:'8px 0 4px', fontFamily:serif, fontSize:16, color:C.vert, letterSpacing:'3px', flexShrink:0, background:C.beige }}><span style={{ color:C.vert }}>❧</span> REVENUS <span style={{ color:C.vert }}>❧</span></div>
      <div style={{ textAlign:'center', padding:'4px 16px 8px', fontFamily:serif, fontSize:12, fontStyle:'italic', color:C.muted, flexShrink:0, background:C.beige, marginBottom:8 }}>Ce n'est pas ce qu'on gagne qui compte, c'est ce qu'on en fait.</div>
      {/* Card total */}
      <div style={{ background:C.vert, flexShrink:0, padding:'12px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontFamily:sans, fontSize:12, fontWeight:600, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,0.5)' }}>Total</span>
          <span style={{ fontFamily:serif, fontSize:30, fontWeight:700, color:C.rose }}>{fmtR(total)}</span>
        </div>
      </div>
      {/* Liste scrollable */}
      <div style={{ flex:1, overflowY:'auto', padding:'4px 16px 0', paddingBottom:'calc(80px + env(safe-area-inset-bottom))', background:C.beige, marginTop:10 }}>
        {revenus.length === 0 && (
          <div style={{ textAlign:'center', padding:32, color:C.muted, fontFamily:sans, fontSize:13 }}>Aucun revenu saisi ce mois</div>
        )}
        {revenus.map(r => { const i = m.revenues.indexOf(r); return <RevenueRow key={r.id} r={r} i={i} onUpdate={upd} onDelete={del} closed={m.closed} />; })}
      </div>
    </>
  );
}

// Vue DÉPENSES + FACTURES
export function DepensesView({ m, mi, setMi, updateData, depTab, setDepTab, onProfileAction }) {
  const exps    = m.expenses;
  const bills   = m.bills.filter(b => b.selected !== false);
  const unpaid  = bills.filter(b => !b.paid);
  const paid    = bills.filter(b =>  b.paid);
  const bT      = bills.reduce((s,b) => s + billValue(b), 0);
  const expRmb  = exps.filter(e => e.type === 'remboursement').reduce((s,e) => s + (e.amount||0), 0);
  const eTgross = exps.reduce((s,e) => s + (e.amount||0), 0);
  const eT      = eTgross - 2 * expRmb;
  const paidAmt = paid.reduce((s,b) => s + billValue(b), 0);
  const pN = paid.length, bN = bills.length;

  const rev   = m.revenues.filter(r => (r.type || 'revenu') === 'revenu').reduce((s,r) => s + (r.amount||0), 0);
  const reste = Math.round((rev - bT - eT) * 100) / 100;

  const [xBill, setXBill]           = useState(null);
  const [billForm, setBillForm]     = useState({ amount:'', date:'' });
  const [editBillIdx, setEditBillIdx] = useState(null);
  const [editBillForm, setEditBillForm] = useState({ name:'', amount:'' });
  const [deleteConfirm, setDeleteConfirm]       = useState(null);
  const [editExp, setEditExp]                   = useState(null);
  const [deleteBillPending, setDeleteBillPending] = useState(null);

  const clickBill = (realI) => {
    if (m.closed) return;
    setXBill(realI);
    setEditBillIdx(null);
    setBillForm({ amount: m.bills[realI].realAmount || m.bills[realI].amount, date: new Date().toISOString().split('T')[0] });
  };
  const clickRow = (realI) => {
    if (m.facturesValidees || m.closed) return;
    setEditBillIdx(realI);
    setEditBillForm({ name: m.bills[realI].name, amount: String(m.bills[realI].amount) });
    setXBill(null);
  };
  const confBill = (realI) => {
    if (m.closed) return;
    updateData(mm => {
      mm.bills[realI] = { ...mm.bills[realI], paid:true, realAmount: parseFloat(billForm.amount)||mm.bills[realI].amount, paidDate: billForm.date };
      mm.facturesValidees = true;
    });
    setXBill(null);
  };
  const unchBill = (realI) => {
    if (m.closed) return;
    updateData(mm => { mm.bills[realI] = { ...mm.bills[realI], paid:false, paidDate:'' }; });
  };

  const deleteThisMonth = (billId) => {
    updateData(mm => { mm.bills = mm.bills.filter(b => b.id !== billId); });
    setDeleteBillPending(null);
  };

  const deletePermanently = (billId) => {
    saveRecurringBills(getRecurringBills().filter(b => b.id !== billId));
    addDisabledBill(billId);
    for (let y = mi.year; y <= mi.year + 2; y++) {
      for (let mo = (y === mi.year ? mi.month : 0); mo < 12; mo++) {
        const k = `${currentProfileId}:budget:${y}:${String(mo + 1).padStart(2, '0')}`;
        const stored = localStorage.getItem(k);
        if (stored) {
          try {
            const d = JSON.parse(stored);
            if (d.bills?.some(b => b.id === billId)) {
              d.bills = d.bills.filter(b => b.id !== billId);
              localStorage.setItem(k, JSON.stringify(d));
            }
          } catch {}
        }
      }
    }
    updateData(mm => { mm.bills = mm.bills.filter(b => b.id !== billId); });
    setDeleteBillPending(null);
  };

  return (
    <>
      <MonthHeader mi={mi} setMi={setMi} closed={m.closed} onProfileAction={onProfileAction} />
      {m.closed && <ClosedBanner />}
      <div style={{ textAlign:'center', padding:'8px 0 4px', fontFamily:serif, fontSize:16, color:C.vert, letterSpacing:'3px', flexShrink:0, background:C.beige }}><span style={{ color:C.vert }}>❧</span> SUIVI <span style={{ color:C.vert }}>❧</span></div>
      <div style={{ textAlign:'center', padding:'4px 16px 8px', fontFamily:serif, fontSize:12, fontStyle:'italic', color:C.muted, flexShrink:0, background:C.beige }}>
        {depTab === 'factures' ? 'Maîtrisez vos charges. Elles ne vous surprendront plus.' : 'Le luxe, c\'est de ne jamais être surpris par ses comptes.'}
      </div>
      {/* Switcher capsule */}
      <div style={{ padding:'8px 16px', background:C.beige, flexShrink:0, display:'flex', justifyContent:'center', alignItems:'center', gap:10 }}>
        {[{id:'factures',label:'Factures'},{id:'depenses',label:'Dépenses'}].map(t => (
          <button key={t.id} onClick={() => setDepTab(t.id)}
            style={{ width:140, padding:'10px 0', borderRadius:30, fontSize:13, fontWeight:700, cursor:'pointer',
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
          <div style={{ background:C.vert, padding:'10px 18px', flexShrink:0, textAlign:'center', marginTop:8 }}>
            <div style={{ fontFamily:sans, fontSize:9, fontWeight:600, letterSpacing:2, textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:4 }}>Reste à vivre du mois</div>
            {rev === 0
              ? <div style={{ fontFamily:serif, fontSize:24, fontStyle:'italic', color:C.rose }}>Revenus non saisis</div>
              : <div style={{ fontFamily:serif, fontSize:32, fontWeight:700, color:C.rose }}>{fmtR(reste)}</div>
            }
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'8px 16px 0', paddingBottom:'calc(80px + env(safe-area-inset-bottom))', background:C.beige }}>
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
                  <CatIcon catId={e.cat} size={38} green={e.type === 'remboursement'} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:sans, fontSize:13, fontWeight:500, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.name || cat.label}</div>
                    <div style={{ fontFamily:sans, fontSize:11, color:C.muted }}>{cat.label}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:serif, fontSize:16, fontWeight:600, color: e.type === 'remboursement' ? '#7BA88C' : C.vert }}>{e.type === 'remboursement' ? '+' : '-'}{fmtR(e.amount)}</div>
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
          <div style={{ background:C.vert, padding:'14px 18px', flexShrink:0, marginTop:8 }}>
            <div style={{ fontFamily:sans, fontSize:10, color:'rgba(255,255,255,0.5)', letterSpacing:1, textTransform:'uppercase', marginBottom:4 }}>{pN}/{bN} prélevées</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
              <span style={{ fontFamily:serif, fontSize:28, fontWeight:700, color:C.rose }}>{fmt2(paidAmt)}</span>
              <span style={{ fontFamily:sans, fontSize:13, color:'rgba(255,255,255,0.5)' }}>/ {fmt2(bT)}</span>
            </div>
            <div style={{ height:4, background:'rgba(255,255,255,0.12)', borderRadius:2, marginTop:8, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${bT > 0 ? Math.round(paidAmt/bT*100) : 0}%`, background:C.rose, borderRadius:2 }} />
            </div>
          </div>
          {/* Bouton valider liste */}
          <div style={{ padding:'10px 16px 4px', background:C.beige, flexShrink:0 }}>
            {m.facturesValidees ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'rgba(28,41,28,0.08)', borderRadius:10 }}>
                <span style={{ fontFamily:sans, fontSize:13, color:C.muted, fontWeight:500 }}>Liste validée ✓</span>
                {!m.closed && (
                  <span onClick={() => updateData(mm => { mm.facturesValidees = false; })}
                    style={{ fontFamily:sans, fontSize:12, color:C.vert, textDecoration:'underline', cursor:'pointer', opacity:0.7 }}>Modifier</span>
                )}
              </div>
            ) : (
              <button onClick={() => !m.closed && updateData(mm => { mm.facturesValidees = true; })}
                disabled={!!m.closed}
                style={{ width:'100%', padding:'11px 0', background: m.closed ? 'rgba(28,41,28,0.15)' : C.vert, color:'white', border:'none', borderRadius:10, fontFamily:sans, fontSize:13, fontWeight:600, cursor: m.closed ? 'default' : 'pointer' }}>
                ✓ Valider ma liste de factures
              </button>
            )}
          </div>
          {/* Liste unifiée — non cochées en haut, cochées en bas */}
          <div style={{ flex:1, overflowY:'auto', padding:'8px 16px 0', paddingBottom:'calc(80px + env(safe-area-inset-bottom))', background:C.beige }}>
            {unpaid.length > 0 && <div style={{ padding:'6px 0 8px' }}><span style={{ fontFamily:sans, fontSize:10, fontWeight:600, letterSpacing:1, textTransform:'uppercase', color:C.muted }}>À prélever — {unpaid.length}</span></div>}
            {unpaid.map((b) => (
              <div key={b.id} style={{ background:C.card, borderRadius:12, marginBottom:8, border:`0.5px solid ${C.border}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 14px' }}>
                  <div onClick={() => clickRow(m.bills.indexOf(b))} style={{ flex:1, cursor: m.facturesValidees || m.closed ? 'default' : 'pointer' }}>
                    <div style={{ fontFamily:sans, fontSize:13, fontWeight:500, color:C.text }}>{b.name}</div>
                    <div style={{ fontFamily:sans, fontSize:10, color:C.muted, marginTop:2 }}>En attente · {fmt2(b.amount)}</div>
                  </div>
                  {!m.closed && (
                    <button onClick={(e) => { e.stopPropagation(); setDeleteBillPending(b); }}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(28,41,28,0.28)', fontSize:15, padding:'4px', flexShrink:0, display:'flex', alignItems:'center' }}>
                      <i className="ti ti-trash" />
                    </button>
                  )}
                  <div onClick={(e) => { e.stopPropagation(); clickBill(m.bills.indexOf(b)); }}
                    style={{ width:28, height:28, borderRadius:'50%', background:C.roseL, border:`1.5px solid ${C.rose}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                    <i className="ti ti-check" style={{ fontSize:13, color:'#C8B4B4' }} />
                  </div>
                </div>
                {editBillIdx === m.bills.indexOf(b) && !m.facturesValidees && (
                  <div style={{ padding:'0 14px 12px' }}>
                    <div style={{ background:C.beige, border:'1px solid rgba(28,41,28,0.1)', borderRadius:10, padding:12 }}>
                      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                        <div style={{ flex:2 }}>
                          <Label>Nom</Label>
                          <input type="text" value={editBillForm.name} onChange={e => setEditBillForm(p => ({...p, name:e.target.value}))}
                            style={{ width:'100%', padding:8, border:'1px solid rgba(28,41,28,0.15)', borderRadius:8, fontSize:13, fontFamily:sans, color:C.vert, background:'white' }} />
                        </div>
                        <div style={{ flex:1 }}>
                          <Label>Montant prévu</Label>
                          <input type="number" step="0.01" value={editBillForm.amount} onChange={e => setEditBillForm(p => ({...p, amount:e.target.value}))}
                            style={{ width:'100%', padding:8, border:'1px solid rgba(28,41,28,0.15)', borderRadius:8, fontSize:14, fontWeight:600, fontFamily:serif, color:C.vert, background:'white' }} />
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => { setDeleteBillPending(m.bills[editBillIdx]); setEditBillIdx(null); }}
                          style={{ padding:'9px 10px', background:'white', border:`1px solid ${C.rose}`, borderRadius:8, cursor:'pointer', color:C.rose, fontFamily:sans }}>
                          <i className="ti ti-trash" style={{ fontSize:15 }} />
                        </button>
                        <button onClick={() => {
                          const newName = editBillForm.name.trim();
                          const newAmt = parseFloat(editBillForm.amount);
                          updateData(mm => {
                            if (newName) mm.bills[editBillIdx].name = newName;
                            if (newAmt)  mm.bills[editBillIdx].amount = newAmt;
                          });
                          setEditBillIdx(null);
                        }}
                          style={{ flex:1, padding:9, background:C.vert, color:'white', border:'none', borderRadius:8, fontFamily:sans, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                          OK
                        </button>
                        <button onClick={() => setEditBillIdx(null)}
                          style={{ padding:'9px 12px', background:'white', border:'1px solid rgba(28,41,28,0.15)', borderRadius:8, cursor:'pointer', color:C.vert, fontFamily:sans }}>✕</button>
                      </div>
                    </div>
                  </div>
                )}
                {xBill === m.bills.indexOf(b) && (
                  <div style={{ padding:'0 14px 12px' }}>
                    <div style={{ background:C.beige, border:'1px solid rgba(28,41,28,0.1)', borderRadius:10, padding:12 }}>
                      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                        <div style={{ flex:1 }}>
                          <Label>Montant réel</Label>
                          <input type="number" step="0.01" value={billForm.amount} onChange={e => setBillForm(p => ({...p, amount:e.target.value}))}
                            style={{ width:'100%', padding:8, border:'1px solid rgba(28,41,28,0.15)', borderRadius:8, fontSize:15, fontWeight:600, fontFamily:serif, color:C.vert, background:'white' }} />
                        </div>
                        <div style={{ flex:1 }}>
                          <Label>Date prélevée</Label>
                          <input type="date" value={billForm.date} onChange={e => setBillForm(p => ({...p, date:e.target.value}))}
                            style={{ width:'100%', padding:8, border:'1px solid rgba(28,41,28,0.15)', borderRadius:8, fontSize:12, color:C.vert, background:'white', fontFamily:sans }} />
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                        <button onClick={() => confBill(m.bills.indexOf(b))}
                          style={{ flex:1, padding:9, background:C.vert, color:'white', border:'none', borderRadius:8, fontFamily:sans, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                          ✓ Confirmer prélevée
                        </button>
                        <button onClick={() => { setDeleteBillPending(b); setXBill(null); }}
                          style={{ padding:'9px 10px', background:'white', border:`1px solid ${C.rose}`, borderRadius:8, cursor:'pointer', color:C.rose, fontFamily:sans }}>
                          <i className="ti ti-trash" style={{ fontSize:15 }} />
                        </button>
                        <button onClick={() => setXBill(null)}
                          style={{ padding:'9px 12px', background:'white', border:'1px solid rgba(28,41,28,0.15)', borderRadius:8, cursor:'pointer', color:C.vert, fontFamily:sans }}>✕</button>
                      </div>
                      <button onClick={() => {
                        const newAmt = parseFloat(billForm.amount);
                        if (!newAmt) return;
                        const billId = b.id;
                        for (let y = mi.year; y <= mi.year + 2; y++) {
                          for (let mo = (y === mi.year ? mi.month : 0); mo < 12; mo++) {
                            const k = `${currentProfileId}:budget:${y}:${String(mo+1).padStart(2,'0')}`;
                            const stored = localStorage.getItem(k);
                            if (stored) {
                              try {
                                const d = JSON.parse(stored);
                                const bi = d.bills.findIndex(x => x.id === billId);
                                if (bi >= 0 && !d.bills[bi].paid) {
                                  d.bills[bi].amount = newAmt;
                                  d.bills[bi].realAmount = newAmt;
                                  localStorage.setItem(k, JSON.stringify(d));
                                }
                              } catch {}
                            }
                          }
                        }
                        updateData(mm => {
                          const bi = mm.bills.findIndex(x => x.id === billId);
                          if (bi >= 0) mm.bills[bi].amount = newAmt;
                        });
                        setXBill(null);
                      }}
                        style={{ width:'100%', padding:'8px 0', background:'white', border:'1px solid rgba(28,41,28,0.15)', borderRadius:8, cursor:'pointer', color:C.vert, fontFamily:sans, fontSize:12, fontWeight:500 }}>
                        Modifier le montant par défaut
                      </button>
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
                      <div style={{ fontFamily:sans, fontSize:10, color:C.muted, marginTop:2 }}>{ds ? `Prélevé le ${ds}` : 'Prélevée'} · {fmt2(b.realAmount||b.amount)}</div>
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
              <span style={{ fontFamily:serif, fontSize:22, fontWeight:700, color:C.vert }}>{fmt2(bT)}</span>
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
      {deleteBillPending && (
        <DeleteBillScopeModal
          bill={deleteBillPending}
          onDeleteThisMonth={() => deleteThisMonth(deleteBillPending.id)}
          onDeletePermanently={() => deletePermanently(deleteBillPending.id)}
          onClose={() => setDeleteBillPending(null)}
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
  const d0 = data.length >= 2 ? data.map((d, i) => {
    if (i === 0) return `M${px(i).toFixed(1)},${py(d.value).toFixed(1)}`;
    const x0 = px(i-1), y0 = py(data[i-1].value), x1 = px(i), y1 = py(d.value), t = 0.4;
    return `C${(x0+t*(x1-x0)).toFixed(1)},${y0.toFixed(1)} ${(x1-t*(x1-x0)).toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }).join(' ') : '';
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(28,41,28,0.55)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:C.beige, borderRadius:16, margin:16, padding:'18px 16px 14px', width:'100%', maxWidth:340 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ fontFamily:serif, fontSize:18, fontWeight:700, color:C.vert }}>{title}</span>
          <button onClick={onClose} style={{ background:C.vert, border:'none', width:28, height:28, borderRadius:'50%', cursor:'pointer', fontSize:14, color:C.rose }}>✕</button>
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
const SavingsDetail = ({ type, label, histItems, soldeItem, onSaveHist, onDeleteHist, onSaveSolde, onAdd, onClose }) => {
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
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(28,41,28,0.5)', zIndex:200, display:'flex', alignItems:'flex-end' }}>
      <div style={{ background:C.card, borderRadius:'20px 20px 0 0', width:'100%', maxHeight:'88%', display:'flex', flexDirection:'column', padding:'20px 18px', paddingBottom:'calc(20px + env(safe-area-inset-bottom))' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexShrink:0 }}>
          <span style={{ fontFamily:serif, fontSize:19, fontWeight:700, color:C.vert }}>
            Détail {label || (type === 'livret' ? 'Livret A' : 'PEA')}
          </span>
          <button onClick={onClose} style={{ background:C.vert, border:'none', width:28, height:28, borderRadius:'50%', cursor:'pointer', fontSize:14, color:C.rose }}>✕</button>
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
                <div style={{ fontFamily:sans, fontSize:12, color:C.vert, marginTop:1 }}>{fmtDateTime(item.date) || '—'}</div>
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
export function EpargneView({ currentYear, onProfileAction }) {
  const [epargneYear, setEpargneYear] = useState(currentYear);
  const [months, setMonths] = useState(() => loadYearData(currentYear));

  // Livret A
  const [livretSolde, setLivretSolde] = useState(() => getLivretSolde() || { amount: 0, date: new Date().toISOString().split('T')[0] });
  const [editSolde, setEditSolde]     = useState(false);
  const [soldeForm, setSoldeForm]     = useState({ amount:'', date:'' });

  // PEA solde initial
  const [peaSolde, setPeaSolde]       = useState(() => getPeaSolde() || { montant: 0, rendement: 0, pct: 0, date: new Date().toISOString().split('T')[0] });
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
  // Intitulés personnalisables
  const [savingsLabels, setSavingsLabels] = useState(() => getSavingsLabels());
  const [editingLabel,  setEditingLabel]  = useState(null); // 'livret' | 'pea' | null
  const [labelInput,    setLabelInput]    = useState('');

  useEffect(() => {
    const MIG = `${currentProfileId}:budget:init:2026-06`;
    if (!localStorage.getItem(MIG)) {
      const defaultL = { amount: 1938.37, date: '2026-06-01' };
      const defaultP = { montant: 1841.72, rendement: 259.24, pct: 16.48, date: '2026-06-01' };
      saveLivretSolde(defaultL);
      savePeaSolde(defaultP);
      setLivretSolde(defaultL);
      setPeaSolde(defaultP);
      localStorage.setItem(MIG, '1');
    }
    // Force correct Livret A initial value
    const MIG2 = `${currentProfileId}:budget:init:livret-v2`;
    if (!localStorage.getItem(MIG2)) {
      const correctL = { amount: 1938.37, date: '2026-06-01' };
      saveLivretSolde(correctL);
      setLivretSolde(correctL);
      localStorage.setItem(MIG2, '1');
    }
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
    const key = `${currentProfileId}:budget:${epargneYear}:${String(monthIdx + 1).padStart(2, '0')}`;
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
    const key = `${currentProfileId}:budget:${epargneYear}:${String(monthIdx + 1).padStart(2, '0')}`;
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
    return fmtDateTime(latest);
  })();
  const flashSaved = (type) => { setEpargneFlash(type); setTimeout(() => setEpargneFlash(null), 1000); };

  const dataMonths = months.filter(m => m !== null);
  const allClosed  = dataMonths.length > 0 && dataMonths.every(m => m.closed === true);

  return (
    <>
      {/* Header avec navigation année */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 10px', background:C.beige, flexShrink:0 }}>
        <img src="/logo-budget-club-favicon-rose.png" style={{ width:38, height:38, borderRadius:'50%', objectFit:'cover' }} />
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <button onClick={prevYear}
            style={{ background:'none', border:'none', cursor:'pointer', color:C.vert, fontSize:20, padding:'0 3px' }}>‹</button>
          <span style={{ fontFamily:serif, fontSize:16, fontWeight:600, color:C.vert }}>{epargneYear}</span>
          {allClosed && <i className="ti ti-lock" style={{ fontSize:13, color:C.gold, marginLeft:4 }} />}
          <button onClick={nextYear}
            style={{ background:'none', border:'none', cursor:'pointer', color:C.vert, fontSize:20, padding:'0 3px' }}>›</button>
        </div>
        <div style={{ width:38, display:'flex', justifyContent:'flex-end' }}>
          <ProfileBadge onSwitch={() => onProfileAction?.('select')} onCreateProfile={() => onProfileAction?.('create')} />
        </div>
      </div>

      {/* Bandeau clôture annuelle */}
      {allClosed && (
        <div style={{ margin:'8px 16px 0', background:C.rose, borderRadius:10, padding:'8px 16px', display:'flex', alignItems:'center', justifyContent:'center', gap:6, flexShrink:0 }}>
          <span style={{ fontFamily:sans, fontSize:11, fontWeight:600, color:'#1E3328' }}>Année {epargneYear} clôturée ✓</span>
        </div>
      )}

      <div style={{ textAlign:'center', padding:'4px 16px 10px', background:C.beige, flexShrink:0 }}>
        <div style={{ fontFamily:serif, fontSize:16, letterSpacing:'3px', color:C.vert, textAlign:'center', lineHeight:1.5 }}>
          <span style={{ color:C.vert }}>❧</span> ÉPARGNE &amp;<br />{"    "}INVESTISSEMENT <span style={{ color:C.vert }}>❧</span>
        </div>
      </div>
      <div style={{ textAlign:'center', padding:'4px 16px 8px', fontFamily:serif, fontSize:12, fontStyle:'italic', color:C.muted, flexShrink:0, background:C.beige }}>Investir, c'est croire en son avenir — et bâtir son indépendance un versement à la fois.</div>

      {/* Wrapper : cards fixes + jauges scrollables */}
      <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', background:C.beige }}>

        {/* ── Cards fixes ── */}
        <div style={{ flexShrink:0, padding:'0 16px', background:C.beige }}>
          {/* ── Livret A ── */}
          <div style={{ background:C.vert, borderRadius:12, padding:'12px 16px', marginBottom: editSolde ? 0 : 8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:6 }}>
                {editingLabel === 'livret' ? (
                  <input autoFocus value={labelInput}
                    onChange={e => setLabelInput(e.target.value)}
                    onBlur={() => { const upd = { ...savingsLabels, livret: labelInput.trim() || savingsLabels.livret }; saveSavingsLabels(upd); setSavingsLabels(upd); setEditingLabel(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                    style={{ fontFamily:serif, fontSize:16, fontWeight:700, color:'white', background:'transparent', border:'none', borderBottom:'1px solid rgba(255,255,255,0.5)', outline:'none', maxWidth:140 }} />
                ) : (
                  <>
                    <span style={{ fontFamily:serif, fontSize:16, fontWeight:700, color:'white' }}>{savingsLabels.livret}</span>
                    <button onClick={() => { setLabelInput(savingsLabels.livret); setEditingLabel('livret'); }}
                      style={{ background:'none', border:'none', cursor:'pointer', padding:'0 2px' }}>
                      <i className="ti ti-pencil" style={{ fontSize:12, color:'rgba(255,255,255,0.45)' }} />
                    </button>
                  </>
                )}
              </div>
              <div style={{ display:'flex', gap:16 }}>
                <button title="Nouveau solde" onClick={() => { setSoldeForm({ amount: '', date: new Date().toISOString().split('T')[0] }); setEditSolde(v => !v); }}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}>
                  <i className="ti ti-plus" style={{ fontSize:18, color: editSolde ? C.gold : 'rgba(255,255,255,0.75)' }} />
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
            <span style={{ fontFamily:serif, fontSize:26, fontWeight:700, color:C.rose, cursor:'pointer' }} onClick={() => setChartType('livret')}>{fmt2(livretTotal)}</span>
          </div>
          {editSolde && (
            <div style={{ background:'rgba(28,41,28,0.92)', borderRadius:'0 0 12px 12px', padding:'10px 14px 14px', marginBottom:8 }}>
              <div style={{ marginBottom:8 }}>
                <Label><span style={{ color:'rgba(255,255,255,0.5)' }}>Nouveau solde (€)</span></Label>
                <input type="number" step="0.01" placeholder="Nouveau solde en €" value={soldeForm.amount} onChange={e => setSoldeForm(p => ({...p, amount:e.target.value}))}
                  style={{ width:'100%', padding:8, border:`1px solid rgba(255,255,255,0.2)`, borderRadius:7, fontSize:15, fontFamily:serif, color:C.vert, background:'white' }} />
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => {
                  const a = parseFloat(soldeForm.amount);
                  if (!a) return;
                  const entry = { id:'lh'+Date.now(), date: new Date().toISOString(), montant: a, label: 'Mise à jour' };
                  const uh = [...livretHist, entry]; saveLivretHist(uh); setLivretHist(uh);
                  setEditSolde(false);
                  flashSaved('livret');
                }} style={{ flex:1, padding:9, background:C.vert, color:'white', border:'none', borderRadius:8, fontFamily:sans, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  Ajouter
                </button>
                <button onClick={() => setEditSolde(false)}
                  style={{ padding:'9px 12px', background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, cursor:'pointer', color:'white', fontFamily:sans }}>✕</button>
              </div>
            </div>
          )}
          {epargneFlash === 'livret' && <div style={{ textAlign:'center', fontFamily:sans, fontSize:12, color:'#2E7D32', fontWeight:600, padding:'4px 0' }}>Sauvegardé ✓</div>}

          {/* ── PEA ── */}
          <div style={{ background:C.vert, borderRadius:12, padding:'12px 16px', marginBottom: editPeaSolde ? 0 : 8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:6 }}>
                {editingLabel === 'pea' ? (
                  <input autoFocus value={labelInput}
                    onChange={e => setLabelInput(e.target.value)}
                    onBlur={() => { const upd = { ...savingsLabels, pea: labelInput.trim() || savingsLabels.pea }; saveSavingsLabels(upd); setSavingsLabels(upd); setEditingLabel(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                    style={{ fontFamily:serif, fontSize:16, fontWeight:700, color:'white', background:'transparent', border:'none', borderBottom:'1px solid rgba(255,255,255,0.5)', outline:'none', maxWidth:140 }} />
                ) : (
                  <>
                    <span style={{ fontFamily:serif, fontSize:16, fontWeight:700, color:'white' }}>{savingsLabels.pea}</span>
                    <button onClick={() => { setLabelInput(savingsLabels.pea); setEditingLabel('pea'); }}
                      style={{ background:'none', border:'none', cursor:'pointer', padding:'0 2px' }}>
                      <i className="ti ti-pencil" style={{ fontSize:12, color:'rgba(255,255,255,0.45)' }} />
                    </button>
                  </>
                )}
              </div>
              <div style={{ display:'flex', gap:16 }}>
                <button title="Nouveau solde" onClick={() => { setPeaSoldeForm({ montant: '', rendement: '', pct: '', date: new Date().toISOString().split('T')[0] }); setEditPeaSolde(v => !v); }}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}>
                  <i className="ti ti-plus" style={{ fontSize:18, color: editPeaSolde ? C.gold : 'white' }} />
                </button>
                <button onClick={() => setDetailType('pea')}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}>
                  <i className="ti ti-list-details" style={{ fontSize:18, color:'white' }} />
                </button>
                <button onClick={() => setChartType('pea')}
                  style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}>
                  <i className="ti ti-chart-line" style={{ fontSize:18, color:'white' }} />
                </button>
              </div>
            </div>
            <span style={{ fontFamily:serif, fontSize:26, fontWeight:700, color:C.rose, cursor:'pointer' }} onClick={() => setChartType('pea')}>{fmt2(peaTotal)}</span>
          </div>
          {editPeaSolde && (
            <div style={{ background:'rgba(28,41,28,0.08)', borderRadius:'0 0 12px 12px', padding:'10px 14px 14px', marginBottom:8, border:`1px solid ${C.rose}`, borderTop:'none' }}>
              <div style={{ marginBottom:8 }}>
                <Label>Nouveau solde (€)</Label>
                <input type="number" step="0.01" placeholder="Nouveau solde en €" value={peaSoldeForm.montant} onChange={e => setPeaSoldeForm(p => ({...p, montant:e.target.value}))}
                  style={{ width:'100%', padding:8, border:`1px solid ${C.border}`, borderRadius:7, fontSize:14, fontFamily:serif, color:C.vert, background:'white' }} />
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => {
                  const a = parseFloat(peaSoldeForm.montant);
                  if (!a) return;
                  const entry = { id:'ph'+Date.now(), date: new Date().toISOString(), montant: a, label: 'Mise à jour' };
                  const uh = [...peaHist, entry]; savePeaHist(uh); setPeaHist(uh);
                  setEditPeaSolde(false);
                  flashSaved('pea');
                }} style={{ flex:1, padding:9, background:C.vert, color:'white', border:'none', borderRadius:8, fontFamily:sans, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  Ajouter
                </button>
                <button onClick={() => setEditPeaSolde(false)}
                  style={{ padding:'9px 12px', background:'white', border:`1px solid ${C.rose}`, borderRadius:8, cursor:'pointer', color:C.vert, fontFamily:sans }}>✕</button>
              </div>
            </div>
          )}
          {epargneFlash === 'pea' && <div style={{ textAlign:'center', fontFamily:sans, fontSize:12, color:'#2E7D32', fontWeight:600, padding:'4px 0' }}>Sauvegardé ✓</div>}

          {/* Ligne info : Dernière maj + Total à date */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginTop:8, marginBottom:8 }}>
            <span style={{ fontFamily:sans, fontSize:10, color:C.muted }}>{lastUpdateDate ? `Dernière maj le ${lastUpdateDate}` : ''}</span>
            <span style={{ fontFamily:sans, fontSize:10, color:C.muted }}>Total à date&nbsp;: {fmtP(livretTotal + peaTotal)}</span>
          </div>
        </div>

        {/* Total année — fixe */}
        <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:10, padding:'8px 16px', background:C.beige }}>
          <span style={{ fontFamily:sans, fontSize:13, fontWeight:700, color:C.vert, flexShrink:0 }}>{epargneYear}</span>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
            <div style={{ width:8, height:8, borderRadius:2, background:C.vert, flexShrink:0 }} />
            <span style={{ fontFamily:sans, fontSize:10, color:C.vert }}>Livret A</span>
            <div style={{ width:8, height:8, borderRadius:2, background:C.rose, flexShrink:0 }} />
            <span style={{ fontFamily:sans, fontSize:10, color:C.vert }}>PEA</span>
          </div>
          <div style={{ flex:1, height:1, background:'rgba(28,41,28,0.2)' }} />
          <div style={{ background:'rgba(28,41,28,0.08)', borderRadius:6, padding:'2px 10px', flexShrink:0 }}>
            <span style={{ fontFamily:serif, fontSize:13, fontWeight:700, color:C.vert }}>{fmtP(te)}</span>
          </div>
        </div>
        {/* ── Jauges mensuelles scrollables ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'0 16px 0', paddingBottom:'calc(80px + env(safe-area-inset-bottom))', background:C.beige }}>
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
          svgBg='white'
          title={chartType === 'livret' ? savingsLabels.livret : savingsLabels.pea}
          onClose={() => setChartType(null)}
        />
      )}
      {detailType && !showPeaRend && (
        <SavingsDetail
          type={detailType}
          label={detailType === 'livret' ? savingsLabels.livret : savingsLabels.pea}
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
              const entry = { id:'lh'+Date.now(), date: new Date().toISOString(), montant: val, label: 'Mise à jour' };
              const uh = [...livretHist, entry]; saveLivretHist(uh); setLivretHist(uh);
            } else {
              const upd = { ...peaSolde, montant: val };
              savePeaSolde(upd); setPeaSolde(upd);
              const entry = { id:'ph'+Date.now(), date: new Date().toISOString(), montant: val, label: 'Mise à jour' };
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


// ─── AUTH SCREENS ────────────────────────────────────────────

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

const ProfileSelectScreen = ({ profiles, onSelect, onCreateProfile }) => {
  const [selected, setSelected] = useState(profiles[0]?.id || '');
  return (
    <SplashBg>
      <SplashLogo />
      <div style={{ width:'100%', height:1, background:'rgba(238,196,196,0.3)', margin:'22px 0 16px' }} />
      <div style={{ fontFamily:serif, fontSize:17, fontWeight:700, color:C.rose, letterSpacing:'3px', textTransform:'uppercase', marginBottom:20 }}>
        CHOISIR UN PROFIL
      </div>
      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        style={{ width:'100%', padding:'12px 16px', background:'rgba(255,255,255,0.15)', border:`1.5px solid ${C.rose}`, borderRadius:10, fontFamily:serif, fontSize:16, color:'white', textAlign:'center', outline:'none', cursor:'pointer', appearance:'none', WebkitAppearance:'none' }}>
        {profiles.map(p => (
          <option key={p.id} value={p.id} style={{ background:C.vert, color:'white' }}>{p.name}</option>
        ))}
      </select>
      <button
        onClick={() => { const p = profiles.find(x => x.id === selected); if (p) onSelect(p); }}
        style={{ marginTop:14, width:'100%', padding:'13px 0', background:'white', border:'1px solid rgba(255,255,255,0.3)', borderRadius:10, fontFamily:sans, fontSize:14, fontWeight:700, color:C.vert, cursor:'pointer', letterSpacing:1 }}>
        Continuer
      </button>
    </SplashBg>
  );
};

const PinScreen = ({ profile, onSuccess, onBack }) => {
  const [pin,      setPin]      = useState('');
  const [error,    setError]    = useState(false);
  const [shake,    setShake]    = useState(false);
  // reset flow: null | 'new' | 'confirm'
  const [resetStage, setResetStage] = useState(null);
  const [newPin,     setNewPin]     = useState('');
  const [resetErr,   setResetErr]   = useState('');

  const handleKey = (k) => {
    if (resetStage) { handleResetKey(k); return; }
    if (k === 'del') { setPin(p => p.slice(0,-1)); return; }
    if (pin.length >= 6) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 6) {
      if (next === getPin(profile.id)) { onSuccess(profile); }
      else {
        setShake(true); setError(true);
        setTimeout(() => { setShake(false); setPin(''); setError(false); }, 800);
      }
    }
  };

  const handleResetKey = (k) => {
    if (resetStage === 'new') {
      if (k === 'del') { setNewPin(p => p.slice(0,-1)); return; }
      if (newPin.length >= 6) return;
      const next = newPin + k;
      setNewPin(next);
      if (next.length === 6) setResetStage('confirm');
    } else {
      if (k === 'del') { setPin(p => p.slice(0,-1)); return; }
      if (pin.length >= 6) return;
      const next = pin + k;
      setPin(next);
      if (next.length === 6) {
        if (next === newPin) {
          savePin(profile.id, next);
          onSuccess(profile);
        } else {
          setResetErr('Les codes ne correspondent pas');
          setPin(''); setNewPin('');
          setTimeout(() => { setResetErr(''); setResetStage('new'); }, 1200);
        }
      }
    }
  };

  const curResetPin = resetStage === 'new' ? newPin : pin;

  return (
    <SplashBg>
      <SplashLogo size={80} titleSize={30} spacing="6px" />
      {!resetStage ? (
        <>
          <div style={{ marginTop:26, fontFamily:serif, fontSize:20, fontWeight:600, color:'white' }}>{profile.name}</div>
          {onBack && <button onClick={onBack} style={{ marginTop:6, background:'none', border:'none', color:'rgba(255,255,255,0.6)', fontFamily:sans, fontSize:11, cursor:'pointer', textDecoration:'underline', padding:0 }}>Changer de profil</button>}
          <div style={{ display:'flex', gap:12, marginTop:16, marginBottom:20, animation: shake ? 'pinShake 0.5s' : 'none' }}>
            {Array.from({ length:6 }).map((_,i) => (
              <div key={i} style={{ width:13, height:13, borderRadius:'50%', background: i < pin.length ? C.rose : 'rgba(255,255,255,0.2)', border:`1.5px solid ${i < pin.length ? C.rose : 'rgba(255,255,255,0.3)'}`, transition:'background 0.15s' }} />
            ))}
          </div>
          {error && <div style={{ fontFamily:sans, fontSize:12, color:C.rose, marginBottom:8 }}>Code incorrect</div>}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, width:'100%', maxWidth:280 }}>
            {PIN_KEYS.map((k, i) => (
              k === '' ? <div key={i} /> :
              <button key={i} onClick={() => handleKey(k)}
                style={{ height:56, borderRadius:12, background:'rgba(255,255,255,0.12)', border:'none', fontFamily: k === 'del' ? sans : serif, fontSize: k === 'del' ? 14 : 22, color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {k === 'del' ? '⌫' : k}
              </button>
            ))}
          </div>
          <button onClick={() => { setPin(''); setResetStage('new'); setNewPin(''); setResetErr(''); }}
            style={{ marginTop:20, background:'none', border:'none', color:'rgba(255,255,255,0.45)', fontFamily:sans, fontSize:12, cursor:'pointer', textDecoration:'underline' }}>
            Code oublié ?
          </button>
        </>
      ) : (
        <>
          <div style={{ marginTop:26, fontFamily:serif, fontSize:18, fontWeight:600, color:C.rose }}>
            Réinitialiser le code PIN
          </div>
          <div style={{ fontFamily:sans, fontSize:12, color:'rgba(255,255,255,0.55)', marginTop:6, marginBottom:18 }}>
            {resetStage === 'new' ? 'Choisissez un nouveau code' : 'Confirmez le nouveau code'}
          </div>
          <div style={{ display:'flex', gap:12, marginBottom:20 }}>
            {Array.from({ length:6 }).map((_,i) => (
              <div key={i} style={{ width:13, height:13, borderRadius:'50%', background: i < curResetPin.length ? C.rose : 'rgba(255,255,255,0.2)', border:`1.5px solid ${i < curResetPin.length ? C.rose : 'rgba(255,255,255,0.3)'}`, transition:'background 0.15s' }} />
            ))}
          </div>
          {resetErr && <div style={{ fontFamily:sans, fontSize:12, color:C.rose, marginBottom:10 }}>{resetErr}</div>}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, width:'100%', maxWidth:280 }}>
            {PIN_KEYS.map((k, i) => (
              k === '' ? <div key={i} /> :
              <button key={i} onClick={() => handleKey(k)}
                style={{ height:56, borderRadius:12, background:'rgba(255,255,255,0.12)', border:'none', fontFamily: k === 'del' ? sans : serif, fontSize: k === 'del' ? 14 : 22, color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {k === 'del' ? '⌫' : k}
              </button>
            ))}
          </div>
          <button onClick={() => { setResetStage(null); setPin(''); setNewPin(''); setResetErr(''); }}
            style={{ marginTop:16, background:'none', border:'none', color:'rgba(255,255,255,0.45)', fontFamily:sans, fontSize:12, cursor:'pointer', textDecoration:'underline' }}>
            Retour
          </button>
        </>
      )}
      <style>{`@keyframes pinShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }`}</style>
    </SplashBg>
  );
};

const CreateProfileScreen = ({ onCreated, onCancel }) => {
  const [name,       setName]       = useState('');
  const [pin,        setPin]        = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [stage,      setStage]      = useState('name'); // 'name' | 'pin' | 'confirm'
  const [error,      setError]      = useState('');

  const handlePinKey = (k) => {
    const cur     = stage === 'pin' ? pin        : confirmPin;
    const setCur  = stage === 'pin' ? setPin     : setConfirmPin;
    if (k === 'del') { setCur(p => p.slice(0,-1)); return; }
    if (cur.length >= 6) return;
    const next = cur + k;
    setCur(next);
    if (next.length < 6) return;
    if (stage === 'pin') { setStage('confirm'); }
    else {
      if (next !== pin) {
        setError('Les codes ne correspondent pas');
        setConfirmPin('');
        setTimeout(() => setError(''), 2000);
      } else {
        const id = 'user_' + Date.now();
        const newProfile = { id, name: name.trim() };
        const profiles = getProfiles() || [];
        saveProfiles([...profiles, newProfile]);
        savePin(id, pin);
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`${id}:budget:livret:soldeInitial`, JSON.stringify({ amount: 0, date: today }));
        localStorage.setItem(`${id}:budget:pea:soldeInitial`, JSON.stringify({ montant: 0, rendement: 0, pct: 0, date: today }));
        localStorage.setItem(`${id}:budget:init:2026-06`, '1');
        onCreated(newProfile);
      }
    }
  };

  const curPin = stage === 'pin' ? pin : confirmPin;

  return (
    <SplashBg>
      <button onClick={onCancel} style={{ position:'absolute', top:0, left:0, background:'none', border:'none', color:'rgba(255,255,255,0.6)', fontSize:24, cursor:'pointer', padding:'2px 8px' }}>‹</button>
      <SplashLogo size={80} titleSize={28} spacing="5px" />
      {stage === 'name' ? (
        <>
          <div style={{ marginTop:26, fontFamily:serif, fontSize:18, color:C.rose, fontWeight:600 }}>Nouveau profil</div>
          <input
            placeholder="Prénom" value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) { setError(''); setStage('pin'); } }}
            style={{ marginTop:16, width:'100%', padding:'12px 16px', background:'rgba(255,255,255,0.12)', border:`1px solid ${C.rose}`, borderRadius:10, fontFamily:serif, fontSize:18, color:'white', textAlign:'center', outline:'none' }}
          />
          {error && <div style={{ color:C.rose, fontFamily:sans, fontSize:12, marginTop:8 }}>{error}</div>}
          <button onClick={() => { if (name.trim()) { setError(''); setStage('pin'); } else setError('Entrez un prénom'); }}
            style={{ marginTop:16, width:'100%', padding:'13px 0', background:C.rose, border:'none', borderRadius:10, fontFamily:sans, fontSize:14, fontWeight:600, color:C.vert, cursor:'pointer' }}>
            Continuer
          </button>
        </>
      ) : (
        <>
          <div style={{ marginTop:22, fontFamily:serif, fontSize:16, color:C.rose, fontWeight:600 }}>
            {stage === 'pin' ? 'Choisissez un code PIN' : 'Confirmez votre code PIN'}
          </div>
          <div style={{ fontFamily:sans, fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:4 }}>{name}</div>
          <div style={{ display:'flex', gap:12, marginTop:14, marginBottom:18 }}>
            {Array.from({ length:6 }).map((_,i) => (
              <div key={i} style={{ width:13, height:13, borderRadius:'50%', background: i < curPin.length ? C.rose : 'rgba(255,255,255,0.2)', border:`1.5px solid ${i < curPin.length ? C.rose : 'rgba(255,255,255,0.3)'}`, transition:'background 0.15s' }} />
            ))}
          </div>
          {error && <div style={{ color:C.rose, fontFamily:sans, fontSize:12, marginBottom:10 }}>{error}</div>}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, width:'100%', maxWidth:280 }}>
            {PIN_KEYS.map((k, i) => (
              k === '' ? <div key={i} /> :
              <button key={i} onClick={() => handlePinKey(k)}
                style={{ height:56, borderRadius:12, background:'rgba(255,255,255,0.12)', border:'none', fontFamily: k === 'del' ? sans : serif, fontSize: k === 'del' ? 14 : 22, color:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {k === 'del' ? '⌫' : k}
              </button>
            ))}
          </div>
        </>
      )}
    </SplashBg>
  );
};

// ─── SPLASH SCREEN ───────────────────────────────────────────
const SplashScreen = ({ onDone }) => {
  const [splashOpacity, setSplashOpacity] = useState(0);

  useEffect(() => {
    let t0, t1, t2;
    const start = () => {
      t0 = setTimeout(() => setSplashOpacity(1), 50);
      t1 = setTimeout(() => setSplashOpacity(0), 2000);
      t2 = setTimeout(() => onDone(), 2500);
    };
    const img = new Image();
    img.onload = start;
    img.onerror = start;
    img.src = '/splash-bg.png';
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={{
      position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:9999,
      width:'100%', height:'100%', overflow:'hidden', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start',
      paddingTop:'25%',
      opacity: splashOpacity,
      transition: 'opacity 0.4s ease',
    }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'url(/splash-bg.png)', backgroundSize:'cover', backgroundPosition:'center' }} />
      <div style={{ position:'absolute', inset:0, background:'rgba(30,51,40,0.65)' }} />
      <div style={{ position:'relative', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <img src="/logo-budget-club-rose.png" style={{ width:110, height:110, objectFit:'contain' }} />
        <div style={{ marginTop:16, fontFamily:serif, fontSize:48, fontWeight:700, color:'white', letterSpacing:'8px', textTransform:'uppercase', lineHeight:1.1 }}>
          BUDGET<br />CLUB
        </div>
        <div style={{ marginTop:14, fontFamily:sans, fontSize:11, color:'rgba(255,255,255,0.7)', letterSpacing:'3px', textTransform:'uppercase' }}>
          GÉREZ VOS FINANCES AVEC ÉLÉGANCE
        </div>
      </div>
      <div style={{ position:'absolute', bottom:20, width:'100%', textAlign:'center', fontFamily:sans, fontSize:10, pointerEvents:'none' }}>
        <span style={{ color:'white' }}>✦</span>
        <span style={{ color:'rgba(255,255,255,0.6)' }}> Be your own club. </span>
        <span style={{ color:'white' }}>✦</span>
      </div>
    </div>
  );
};

// ─── MAIN APP (rendu après login) ───────────────────────────
function MainApp({ onProfileAction }) {
  const [mi, setMi]               = useState(getInitialMonth);
  const [view, setView]           = useState('accueil');
  const [depTab, setDepTab]       = useState('depenses');
  const [modal, setModal]       = useState(null);
  const [revType, setRevType]   = useState('revenu');
  const [expTypeModal, setExpTypeModal] = useState('depense');
  const { data: m, loading, updateData } = useMonthData(mi);
  const [autoBackupOffer, setAutoBackupOffer] = useState(null);

  // Auto-save on hide/close
  useEffect(() => {
    const save = () => {
      if (!currentProfileId) return;
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`${currentProfileId}:`) && k !== `${currentProfileId}:auto-backup`)
          data[k] = localStorage.getItem(k);
      }
      localStorage.setItem(`${currentProfileId}:auto-backup`, JSON.stringify({ timestamp: new Date().toISOString(), data }));
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') save(); };
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.removeEventListener('beforeunload', save); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  // Detect incomplete data vs available backup
  useEffect(() => {
    if (!currentProfileId) return;
    const raw = localStorage.getItem(`${currentProfileId}:auto-backup`);
    if (!raw) return;
    try {
      const backup = JSON.parse(raw);
      let cur = 0;
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(`${currentProfileId}:budget:`)) cur++; }
      const bak = Object.keys(backup.data || {}).filter(k => k.startsWith(`${currentProfileId}:budget:`)).length;
      if (bak > cur) setAutoBackupOffer(backup);
    } catch {}
  }, []);

  const restoreAutoBackup = () => {
    if (!autoBackupOffer?.data) return;
    Object.entries(autoBackupOffer.data).forEach(([k, v]) => localStorage.setItem(k, v));
    window.location.reload();
  };

  // Auto-add "Reste mois précédent" revenue if previous month has soldeFinal
  useEffect(() => {
    if (loading) return;
    const prevMonth = mi.month === 0 ? 11 : mi.month - 1;
    const prevYear  = mi.month === 0 ? mi.year - 1 : mi.year;
    const prevKey   = `${currentProfileId}:budget:${prevYear}:${String(prevMonth + 1).padStart(2, '0')}`;
    try {
      const prevRaw = localStorage.getItem(prevKey);
      if (!prevRaw) return;
      const prevData = JSON.parse(prevRaw);
      const sf = prevData.soldeFinal;
      if (!sf) return;
      const reportId = `r-report-${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
      // Read current month directly from localStorage to avoid stale React state
      const currentKey = storageKey(mi);
      const currentRaw = localStorage.getItem(currentKey);
      const currentData = currentRaw ? JSON.parse(currentRaw) : null;
      if (currentData?.revenues?.some(r => r.id === reportId)) return;
      updateData(mm => {
        if (mm.revenues.some(r => r.id === reportId)) return;
        mm.revenues = [...mm.revenues, { id: reportId, name: 'Reste mois précédent', amount: sf }];
      });
    } catch {}
  }, [mi, loading]);

  const addExpense = (exp)  => { if (m.closed) return; updateData(mm => { mm.expenses = [...mm.expenses, exp]; }); };
  const addRevenu  = (rev)  => { if (m.closed) return; updateData(mm => { mm.revenues = [...mm.revenues, rev]; }); };
  const addBill = (bill, scope = 'recurring') => {
    if (m.closed) return;
    if (scope === 'recurring') {
      const recurring = getRecurringBills();
      if (!recurring.find(b => b.id === bill.id)) saveRecurringBills([...recurring, { id: bill.id, name: bill.name, amount: bill.amount }]);
      updateData(mm => { mm.bills = [...mm.bills, bill]; });
    } else {
      scope.forEach(({ year, month }) => {
        const key = `${currentProfileId}:budget:${year}:${String(month + 1).padStart(2, '0')}`;
        try {
          const stored = localStorage.getItem(key);
          const data   = stored ? JSON.parse(stored) : mkMonth();
          if (!data.bills.find(b => b.id === bill.id)) { data.bills = [...data.bills, bill]; localStorage.setItem(key, JSON.stringify(data)); }
        } catch {}
      });
      if (scope.some(s => s.year === mi.year && s.month === mi.month)) {
        updateData(mm => { if (!mm.bills.find(b => b.id === bill.id)) mm.bills = [...mm.bills, bill]; });
      }
    }
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:C.beige }}>
      <div style={{ fontFamily:serif, fontSize:24, color:C.vert, opacity:0.6 }}>Chargement…</div>
    </div>
  );

  const renderView = () => {
    switch (view) {
      case 'accueil':     return <AccueilView  m={m} mi={mi} setMi={setMi} setView={setView} setDepTab={setDepTab} updateData={updateData} onProfileAction={onProfileAction} />;
      case 'budget':      return <BudgetView   m={m} mi={mi} setMi={setMi} setView={setView} updateData={updateData} onProfileAction={onProfileAction} />;
      case 'budget_edit': return <BudgetEditView m={m} updateData={updateData} setView={setView} />;
      case 'revenus':     return <RevenusView  m={m} mi={mi} setMi={setMi} updateData={updateData} onProfileAction={onProfileAction} />;
      case 'depenses':    return <DepensesView m={m} mi={mi} setMi={setMi} updateData={updateData} depTab={depTab} setDepTab={setDepTab} onProfileAction={onProfileAction} />;
      case 'epargne':     return <EpargneView  currentYear={mi.year} onProfileAction={onProfileAction} />;
      default:            return null;
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
      <div style={{ background:C.beige, height:'100dvh', display:'flex', flexDirection:'column', width:'100%', maxWidth:430, margin:'0 auto', position:'relative', overflow:'hidden', fontFamily:sans }}>
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
        {autoBackupOffer && (
          <div style={{ flexShrink:0, background:'#FFF8E7', borderBottom:'1px solid #E8C96A', padding:'8px 16px', display:'flex', alignItems:'center', gap:10, zIndex:10 }}>
            <span style={{ fontFamily:sans, fontSize:12, color:'#7A5C00', flex:1, lineHeight:1.4 }}>
              Sauvegarde du {new Date(autoBackupOffer.timestamp).toLocaleDateString('fr-FR')} disponible. Restaurer ?
            </span>
            <button onClick={restoreAutoBackup}
              style={{ padding:'5px 12px', background:'#1E3328', color:'white', border:'none', borderRadius:8, fontFamily:sans, fontSize:12, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
              Restaurer
            </button>
            <button onClick={() => setAutoBackupOffer(null)}
              style={{ padding:'5px 10px', background:'none', border:'1px solid rgba(122,92,0,0.3)', borderRadius:8, fontFamily:sans, fontSize:12, color:'#7A5C00', cursor:'pointer', flexShrink:0 }}>
              Ignorer
            </button>
          </div>
        )}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {renderView()}
        </div>
        {!['budget_edit'].includes(view) && !m.closed && (
          <FAB view={view} setModal={setModal} setView={setView} depTab={depTab} setRevType={setRevType} setExpTypeModal={setExpTypeModal} />
        )}
        <BottomNav view={view} setView={setView} m={m} />
        {!m.closed && modal === 'dep'  && <AddExpenseModal onAdd={addExpense} onClose={() => setModal(null)} onAddRevenu={addRevenu} noRevenu={view === 'depenses' && depTab === 'depenses'} initExpType={expTypeModal} />}
        {!m.closed && modal === 'rev'  && <AddRevenuModal  onAdd={addRevenu}  onClose={() => setModal(null)} revType={revType} />}
        {!m.closed && modal === 'bill' && <AddBillModal    onAdd={addBill}    onClose={() => setModal(null)} mi={mi} />}
      </div>
    </>
  );
}

// ─── APP ROOT (gestion auth + profils) ──────────────────────
export default function App() {
  const [appStage,       setAppStage]       = useState('splash'); // 'splash'|'select'|'pin'|'create'|'app'
  const [pendingProfile, setPendingProfile] = useState(null);

  const handleSplashDone = () => {
    migrateData();
    clearLudivineData();
    seedDemoProfile();
    const profiles = initProfiles();
    const savedId  = getSavedProfileId();
    if (savedId) {
      const p = profiles.find(x => x.id === savedId);
      if (p) { setPendingProfile(p); setAppStage('pin'); return; }
    }
    setAppStage('select');
  };

  const handleProfileAction = (action) => {
    if (action === 'select') {
      localStorage.removeItem('profile:current');
      setPendingProfile(null);
      setAppStage('select');
    } else if (action === 'create') {
      setAppStage('create');
    }
  };

  if (appStage === 'splash') return <SplashScreen onDone={handleSplashDone} />;

  if (appStage === 'select') {
    const profiles = getProfiles() || [];
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
        <ProfileSelectScreen
          profiles={profiles}
          onSelect={p => { setPendingProfile(p); setAppStage('pin'); }}
          onCreateProfile={() => setAppStage('create')}
        />
      </>
    );
  }

  if (appStage === 'pin' && pendingProfile) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
        <PinScreen
          profile={pendingProfile}
          onSuccess={profile => { persistProfile(profile.id); setAppStage('app'); }}
          onBack={() => { setPendingProfile(null); setAppStage('select'); }}
        />
      </>
    );
  }

  if (appStage === 'create') {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />
        <CreateProfileScreen
          onCreated={profile => { setPendingProfile(profile); setAppStage('pin'); }}
          onCancel={() => setAppStage('select')}
        />
      </>
    );
  }

  return <MainApp onProfileAction={handleProfileAction} />;
}
