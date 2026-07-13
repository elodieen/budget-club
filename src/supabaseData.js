import { supabase } from './supabaseClient';

// Lecture seule depuis Supabase. Reconstruit un objet "mois" avec exactement
// la même forme que celle produite localement par mkMonth() / utilisée
// partout ailleurs dans l'app : { catBudgets, revenues[], bills[], expenses[], closed, soldeFinal }.
// Retourne null si aucun mois trouvé pour ce profil/année/mois. Ne modifie jamais rien.
export async function fetchMonthFromSupabase(profileId, year, month) {
  const { data: monthRow, error: monthError } = await supabase
    .from('budget_months')
    .select('id, cat_budgets, closed, solde_final, budget_locked, factures_validees')
    .eq('profile_id', profileId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (monthError) throw new Error(`Erreur "budget_months" : ${monthError.message}`);
  if (!monthRow) return null;

  const monthId = monthRow.id;

  const [revenuesRes, billsRes, expensesRes] = await Promise.all([
    supabase.from('revenues').select('id, name, amount, date, type').eq('month_id', monthId),
    supabase.from('bills').select('id, name, amount, real_amount, paid, paid_date').eq('month_id', monthId),
    supabase.from('expenses').select('id, name, amount, category, date, type').eq('month_id', monthId),
  ]);

  if (revenuesRes.error) throw new Error(`Erreur "revenues" : ${revenuesRes.error.message}`);
  if (billsRes.error) throw new Error(`Erreur "bills" : ${billsRes.error.message}`);
  if (expensesRes.error) throw new Error(`Erreur "expenses" : ${expensesRes.error.message}`);

  return {
    supabaseMonthId: monthRow.id,
    catBudgets: monthRow.cat_budgets || {},
    closed: !!monthRow.closed,
    soldeFinal: monthRow.solde_final,
    budgetLocked: !!monthRow.budget_locked,
    facturesValidees: !!monthRow.factures_validees,
    revenues: (revenuesRes.data || []).map(r => ({
      id: r.id, name: r.name, amount: r.amount, date: r.date, type: r.type || 'revenu',
    })),
    bills: (billsRes.data || []).map(b => ({
      id: b.id, name: b.name, amount: b.amount, realAmount: b.real_amount, paid: !!b.paid, paidDate: b.paid_date || '',
    })),
    expenses: (expensesRes.data || []).map(e => ({
      id: e.id, name: e.name, amount: e.amount, cat: e.category, date: e.date, type: e.type,
    })),
  };
}

// ============================================================
// ÉCRITURE — actions 1 à 21 (mutations sur le mois affiché uniquement).
// Chaque fonction touche une seule ligne/table et retourne, pour les insert,
// la ligne créée mappée sur la forme locale (id Supabase inclus — à utiliser
// pour remplacer l'id temporaire côté client une fois l'insert confirmé).
// N'écrit jamais sur un autre mois : les actions 22-24 (propagation cross-mois)
// restent hors périmètre, gérées à part.
// ============================================================

// --- revenues (actions 4, 5, 6, 7) ---

export async function addRevenueToSupabase(monthId, revenue) {
  const { data, error } = await supabase
    .from('revenues')
    .insert({ month_id: monthId, name: revenue.name, amount: revenue.amount, date: revenue.date, type: revenue.type || 'revenu' })
    .select()
    .single();
  if (error) throw new Error(`Erreur ajout revenu : ${error.message}`);
  return { id: data.id, name: data.name, amount: data.amount, date: data.date, type: data.type || 'revenu' };
}

export async function updateRevenueInSupabase(revenueId, fields) {
  const payload = {};
  if ('name' in fields)   payload.name = fields.name;
  if ('amount' in fields) payload.amount = fields.amount;
  if ('date' in fields)   payload.date = fields.date;
  if ('type' in fields)   payload.type = fields.type;
  const { error } = await supabase.from('revenues').update(payload).eq('id', revenueId);
  if (error) throw new Error(`Erreur modification revenu : ${error.message}`);
}

export async function deleteRevenueFromSupabase(revenueId) {
  const { error } = await supabase.from('revenues').delete().eq('id', revenueId);
  if (error) throw new Error(`Erreur suppression revenu : ${error.message}`);
}

// --- bills (actions 8, 9, 10, 11, 12) ---

export async function addBillToSupabase(monthId, bill) {
  const { data, error } = await supabase
    .from('bills')
    .insert({ month_id: monthId, name: bill.name, amount: bill.amount, real_amount: bill.realAmount, paid: !!bill.paid, paid_date: bill.paidDate || null })
    .select()
    .single();
  if (error) throw new Error(`Erreur ajout facture : ${error.message}`);
  return { id: data.id, name: data.name, amount: data.amount, realAmount: data.real_amount, paid: !!data.paid, paidDate: data.paid_date || '' };
}

// Couvre le fait de cocher (paid:true, realAmount, paidDate) et décocher (paid:false, paidDate:'') une facture.
export async function toggleBillPaidInSupabase(billId, paid, realAmount, paidDate) {
  const { error } = await supabase
    .from('bills')
    .update({ paid, real_amount: realAmount, paid_date: paidDate || null })
    .eq('id', billId);
  if (error) throw new Error(`Erreur mise à jour facture : ${error.message}`);
}

// Édition inline du nom / montant prévu (indépendant du fait qu'elle soit payée ou non).
export async function updateBillDetailsInSupabase(billId, { name, amount }) {
  const payload = {};
  if (name !== undefined)   payload.name = name;
  if (amount !== undefined) payload.amount = amount;
  const { error } = await supabase.from('bills').update(payload).eq('id', billId);
  if (error) throw new Error(`Erreur modification facture : ${error.message}`);
}

export async function deleteBillFromSupabase(billId) {
  const { error } = await supabase.from('bills').delete().eq('id', billId);
  if (error) throw new Error(`Erreur suppression facture : ${error.message}`);
}

// --- expenses (actions 1, 2, 3) ---

export async function addExpenseToSupabase(monthId, expense) {
  const { data, error } = await supabase
    .from('expenses')
    .insert({ month_id: monthId, name: expense.name, amount: expense.amount, category: expense.cat, date: expense.date, type: expense.type || null })
    .select()
    .single();
  if (error) throw new Error(`Erreur ajout dépense : ${error.message}`);
  return { id: data.id, name: data.name, amount: data.amount, cat: data.category, date: data.date, type: data.type };
}

export async function updateExpenseInSupabase(expenseId, fields) {
  const payload = {};
  if ('name' in fields)   payload.name = fields.name;
  if ('amount' in fields) payload.amount = fields.amount;
  if ('cat' in fields)    payload.category = fields.cat;
  if ('date' in fields)   payload.date = fields.date;
  if ('type' in fields)   payload.type = fields.type;
  const { error } = await supabase.from('expenses').update(payload).eq('id', expenseId);
  if (error) throw new Error(`Erreur modification dépense : ${error.message}`);
}

export async function deleteExpenseFromSupabase(expenseId) {
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) throw new Error(`Erreur suppression dépense : ${error.message}`);
}

// --- budget_months : champs scalaires de la ligne du mois elle-même ---
// (actions 13 facturesValidees, 14/15/16 catBudgets, 17/18 budgetLocked, 19/20/21 closed+soldeFinal)
// NB : budget_locked et factures_validees nécessitent la migration SQL ajoutant
// ces deux colonnes à "budget_months" avant de pouvoir être persistés.
export async function updateMonthFieldsInSupabase(monthId, fields) {
  const payload = {};
  if ('catBudgets' in fields)        payload.cat_budgets = fields.catBudgets;
  if ('closed' in fields)            payload.closed = fields.closed;
  if ('soldeFinal' in fields)        payload.solde_final = fields.soldeFinal;
  if ('budgetLocked' in fields)      payload.budget_locked = fields.budgetLocked;
  if ('facturesValidees' in fields)  payload.factures_validees = fields.facturesValidees;
  const { error } = await supabase.from('budget_months').update(payload).eq('id', monthId);
  if (error) throw new Error(`Erreur mise à jour du mois : ${error.message}`);
}

// ============================================================
// Diff générique prev/next → appels Supabase. Utilisé par updateData()
// (useMonthData dans App.jsx) qui ne connaît que "l'objet mois avant" et
// "l'objet mois après" une mutation arbitraire, jamais l'action précise.
// Ne touche jamais qu'aux 4 tables du mois concerné (jamais d'autre mois).
// ============================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Un id "local" (créé côté client avant tout insert, ex: 'e'+Date.now()) n'est
// jamais un UUID Supabase valide : sert à savoir si une ligne a déjà été persistée.
const isRemoteId = (id) => UUID_RE.test(String(id));

// Remplace les ids temporaires (créés côté client) par les ids Supabase réels
// une fois l'insert confirmé. Utilisé à la fois pour corriger l'état React
// affiché et pour faire avancer le "dernier état confirmé côté serveur".
export function applyIdMapToMonth(month, idMap) {
  if (!month || !idMap || Object.keys(idMap).length === 0) return month;
  const patch = (list) => (list || []).map(x => (idMap[x.id] ? { ...x, id: idMap[x.id] } : x));
  return { ...month, revenues: patch(month.revenues), bills: patch(month.bills), expenses: patch(month.expenses) };
}

function diffById(prevList, nextList, fields) {
  const prevById = new Map((prevList || []).map(x => [x.id, x]));
  const nextById = new Map((nextList || []).map(x => [x.id, x]));
  const added   = (nextList || []).filter(x => !prevById.has(x.id));
  const removed = (prevList || []).filter(x => !nextById.has(x.id));
  const changed = [];
  for (const n of (nextList || [])) {
    const p = prevById.get(n.id);
    if (!p) continue;
    const diff = {};
    for (const f of fields) if (p[f] !== n[f]) diff[f] = n[f];
    if (Object.keys(diff).length > 0) changed.push({ id: n.id, diff });
  }
  return { added, removed, changed };
}

// Retourne { tempId: realId } pour les lignes insérées (à reporter dans l'état
// local ensuite). Si des écritures échouent, lève une erreur agrégée à la fin
// — mais l'idMap des écritures qui ont réussi est attaché à l'erreur (err.idMap)
// pour ne perdre le lien d'aucune ligne effectivement sauvegardée.
export async function syncMonthChangesToSupabase(monthId, prev, next) {
  const errors = [];
  const idMap = {};

  const rev = diffById(prev.revenues, next.revenues, ['name', 'amount', 'date', 'type']);
  for (const r of rev.added) {
    try { const created = await addRevenueToSupabase(monthId, r); idMap[r.id] = created.id; }
    catch (e) { errors.push(e.message); }
  }
  for (const r of rev.removed) {
    if (!isRemoteId(r.id)) continue;
    try { await deleteRevenueFromSupabase(r.id); } catch (e) { errors.push(e.message); }
  }
  for (const { id, diff } of rev.changed) {
    if (!isRemoteId(id)) continue;
    try { await updateRevenueInSupabase(id, diff); } catch (e) { errors.push(e.message); }
  }

  const bl = diffById(prev.bills, next.bills, ['name', 'amount', 'realAmount', 'paid', 'paidDate']);
  for (const b of bl.added) {
    try { const created = await addBillToSupabase(monthId, b); idMap[b.id] = created.id; }
    catch (e) { errors.push(e.message); }
  }
  for (const b of bl.removed) {
    if (!isRemoteId(b.id)) continue;
    try { await deleteBillFromSupabase(b.id); } catch (e) { errors.push(e.message); }
  }
  for (const { id, diff } of bl.changed) {
    if (!isRemoteId(id)) continue;
    try {
      if ('paid' in diff || 'realAmount' in diff || 'paidDate' in diff) {
        const full = next.bills.find(x => x.id === id);
        await toggleBillPaidInSupabase(id, full.paid, full.realAmount, full.paidDate);
      }
      if ('name' in diff || 'amount' in diff) {
        await updateBillDetailsInSupabase(id, { name: diff.name, amount: diff.amount });
      }
    } catch (e) { errors.push(e.message); }
  }

  const ex = diffById(prev.expenses, next.expenses, ['name', 'amount', 'cat', 'date', 'type']);
  for (const e of ex.added) {
    try { const created = await addExpenseToSupabase(monthId, e); idMap[e.id] = created.id; }
    catch (err) { errors.push(err.message); }
  }
  for (const e of ex.removed) {
    if (!isRemoteId(e.id)) continue;
    try { await deleteExpenseFromSupabase(e.id); } catch (err) { errors.push(err.message); }
  }
  for (const { id, diff } of ex.changed) {
    if (!isRemoteId(id)) continue;
    try { await updateExpenseInSupabase(id, diff); } catch (err) { errors.push(err.message); }
  }

  const monthFields = {};
  if (JSON.stringify(prev.catBudgets || {}) !== JSON.stringify(next.catBudgets || {})) monthFields.catBudgets = next.catBudgets || {};
  if (!!prev.closed !== !!next.closed) monthFields.closed = !!next.closed;
  if (prev.soldeFinal !== next.soldeFinal) monthFields.soldeFinal = next.soldeFinal ?? null;
  if (!!prev.budgetLocked !== !!next.budgetLocked) monthFields.budgetLocked = !!next.budgetLocked;
  if (!!prev.facturesValidees !== !!next.facturesValidees) monthFields.facturesValidees = !!next.facturesValidees;
  if (Object.keys(monthFields).length > 0) {
    try { await updateMonthFieldsInSupabase(monthId, monthFields); } catch (e) { errors.push(e.message); }
  }

  if (errors.length > 0) {
    const err = new Error(errors.join(' | '));
    err.idMap = idMap;
    throw err;
  }
  return idMap;
}
