const ICON = '/logo-budget-club-favicon-rose.png';
let cachedSettings = null;

self.addEventListener('message', (event) => {
  if (event.data?.type === 'NOTIF_SETTINGS') {
    cachedSettings = event.data.settings;
  }
});

function freqToDays(f) {
  if (!f) return 1;
  if (typeof f === 'object') {
    return f.unit === 'week' ? f.count * 7 : f.unit === 'month' ? f.count * 30 : (f.count || 1);
  }
  return f === 'daily' ? 1 : f === 'every2days' ? 2 : f === 'weekly' ? 7 : 30;
}

function isDue(s) {
  if (!s?.enabled) return false;
  if (!s.lastSent) return true;
  return (Date.now() - new Date(s.lastSent).getTime()) / 86400000 >= freqToDays(s.frequency);
}

async function tryNotify(s) {
  if (!s || !isDue(s)) return;
  const [h] = (s.time || '18:00').split(':').map(Number);
  if (new Date().getHours() < h) return;
  await self.registration.showNotification('Budget Club', {
    body: 'Pensez à mettre à jour votre budget !',
    icon: ICON,
  });
  const updated = { ...s, lastSent: new Date().toISOString() };
  cachedSettings = updated;
  const all = await clients.matchAll({ includeUncontrolled: true, type: 'window' });
  all.forEach(c => c.postMessage({ type: 'NOTIF_SENT', settings: updated }));
}

// Vérification toutes les minutes tant que le SW est en vie
setInterval(() => { if (cachedSettings) tryNotify(cachedSettings); }, 60 * 1000);

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'budget-notif') event.waitUntil(tryNotify(cachedSettings));
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'budget-notif') event.waitUntil(tryNotify(cachedSettings));
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Budget Club', {
      body: data.body || 'Pensez à mettre à jour votre budget !',
      icon: ICON,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
