import { supabase } from './supabaseClient';

// Migre tous les mois 2026 présents dans la sauvegarde (clés du type
// "{profileId}:budget:2026:XX") vers les tables Supabase "budget_months",
// "revenues", "bills", "expenses", sous le profile_id fourni (par défaut "elodie").
// Un mois déjà présent dans Supabase pour ce profil est sauté (pas de doublon).
// Ne modifie jamais backupData.
export async function migrateAllMonths(backupData, profileId = 'elodie') {
  const summary = { migrated: [], skipped: [], errors: [] };

  const keyPattern = new RegExp(`^${profileId}:budget:2026:(\\d{2})$`);
  const monthKeys = Object.keys(backupData)
    .map(key => {
      const match = key.match(keyPattern);
      return match ? { key, month: parseInt(match[1], 10) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.month - b.month);

  if (monthKeys.length === 0) {
    const msg = `Aucune clé "${profileId}:budget:2026:XX" trouvée dans la sauvegarde.`;
    console.error('[Migration]', msg);
    summary.errors.push(msg);
    return summary;
  }

  for (const { key, month: monthNum } of monthKeys) {
    const label = `2026-${String(monthNum).padStart(2, '0')}`;

    let month;
    try {
      month = JSON.parse(backupData[key]);
    } catch (e) {
      const msg = `${label} : JSON invalide (${e.message})`;
      console.error('[Migration]', msg);
      summary.errors.push(msg);
      continue;
    }

    // Vérifie si le mois existe déjà pour ce profil
    const { data: existing, error: existingError } = await supabase
      .from('budget_months')
      .select('id')
      .eq('profile_id', profileId)
      .eq('year', 2026)
      .eq('month', monthNum)
      .maybeSingle();

    if (existingError) {
      const msg = `${label} : erreur vérification existence (${existingError.message})`;
      console.error('[Migration]', msg);
      summary.errors.push(msg);
      continue;
    }

    if (existing) {
      console.log(`[Migration] ${label} : déjà présent, ignoré.`);
      summary.skipped.push(label);
      continue;
    }

    // 1. Crée la ligne du mois
    const { data: monthRow, error: monthError } = await supabase
      .from('budget_months')
      .insert({
        profile_id: profileId,
        year: 2026,
        month: monthNum,
        cat_budgets: month.catBudgets || {},
        closed: !!month.closed,
        solde_final: month.soldeFinal ?? null,
      })
      .select()
      .single();

    if (monthError) {
      const msg = `${label} : erreur création "budget_months" (${monthError.message})`;
      console.error('[Migration]', msg);
      summary.errors.push(msg);
      continue;
    }
    const monthId = monthRow.id;

    const monthSummary = { label, revenues: 0, bills: 0, expenses: 0 };

    // 2. Revenus
    const revenues = month.revenues || [];
    if (revenues.length > 0) {
      const rows = revenues.map(r => ({
        month_id: monthId,
        name: r.name,
        amount: r.amount,
        date: r.date,
        type: r.type || 'revenu',
      }));
      const { data, error } = await supabase.from('revenues').insert(rows).select();
      if (error) {
        const msg = `${label} : erreur "revenues" (${error.message})`;
        console.error('[Migration]', msg);
        summary.errors.push(msg);
      } else {
        monthSummary.revenues = data.length;
      }
    }

    // 3. Factures
    const bills = month.bills || [];
    if (bills.length > 0) {
      const rows = bills.map(b => ({
        month_id: monthId,
        name: b.name,
        amount: b.amount,
        real_amount: b.realAmount,
        paid: !!b.paid,
        paid_date: b.paidDate || null,
      }));
      const { data, error } = await supabase.from('bills').insert(rows).select();
      if (error) {
        const msg = `${label} : erreur "bills" (${error.message})`;
        console.error('[Migration]', msg);
        summary.errors.push(msg);
      } else {
        monthSummary.bills = data.length;
      }
    }

    // 4. Dépenses
    const expenses = month.expenses || [];
    if (expenses.length > 0) {
      const rows = expenses.map(e => ({
        month_id: monthId,
        name: e.name,
        amount: e.amount,
        category: e.cat,
        date: e.date,
        type: e.type || null,
      }));
      const { data, error } = await supabase.from('expenses').insert(rows).select();
      if (error) {
        const msg = `${label} : erreur "expenses" (${error.message})`;
        console.error('[Migration]', msg);
        summary.errors.push(msg);
      } else {
        monthSummary.expenses = data.length;
      }
    }

    console.log(
      `[Migration] ${label} : ${monthSummary.revenues} revenu(s), ${monthSummary.bills} facture(s), ${monthSummary.expenses} dépense(s) migré(s).`
    );
    summary.migrated.push(monthSummary);
  }

  console.log(
    `[Migration] Résumé : ${summary.migrated.length} mois migré(s), ${summary.skipped.length} ignoré(s), ${summary.errors.length} erreur(s).`
  );
  if (summary.skipped.length > 0) console.log('[Migration] Mois ignorés (déjà existants) :', summary.skipped);
  if (summary.errors.length > 0) console.error('[Migration] Erreurs rencontrées :', summary.errors);

  return summary;
}
