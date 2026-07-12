import { supabase } from './supabaseClient';

// Migre les factures récurrentes du profil "elodie" depuis un fichier de sauvegarde JSON
// vers la table Supabase "recurring_bills". Ne modifie jamais backupData.
export async function migrateRecurringBills(backupData) {
  const raw = backupData['elodie:recurring_bills'];

  if (!raw) {
    const msg = 'Clé "elodie:recurring_bills" introuvable dans la sauvegarde.';
    console.error('[Migration]', msg);
    return { migrated: 0, errors: [msg] };
  }

  let bills;
  try {
    bills = JSON.parse(raw);
  } catch (e) {
    const msg = `JSON invalide pour "elodie:recurring_bills" : ${e.message}`;
    console.error('[Migration]', msg);
    return { migrated: 0, errors: [msg] };
  }

  if (!Array.isArray(bills) || bills.length === 0) {
    console.log('[Migration] Aucune facture récurrente à migrer.');
    return { migrated: 0, errors: [] };
  }

  const rows = bills.map(b => ({
    profile_id: 'elodie',
    name: b.name,
    amount: b.amount,
    disabled: false,
  }));

  const { data, error } = await supabase.from('recurring_bills').insert(rows).select();

  if (error) {
    console.error('[Migration] Erreur lors de l\'insertion :', error);
    return { migrated: 0, errors: [error.message] };
  }

  console.log(`[Migration] ${data.length} facture(s) récurrente(s) migrée(s).`);
  return { migrated: data.length, errors: [] };
}
