const ICON = '/logo-budget-club-favicon-rose.png';
let swData = null; // { settings: { enabled, value, unit }, lastSent: '1234567890' }

self.addEventListener('message', (event) => {
  if (event.data?.type === 'NOTIF_DATA') {
    swData = { settings: event.data.settings, lastSent: event.data.lastSent };
  }
});

function isDue(settings, lastSent) {
  if (!settings?.enabled) return false;
  const freqMs = (settings.value || 1) * (settings.unit === 'Semaine(s)' ? 604800000 : settings.unit === 'Mois' ? 2592000000 : 86400000);
  if (!lastSent) return true;
  return Date.now() - parseInt(lastSent) >= freqMs;
}

async function tryNotify() {
  if (!swData || !isDue(swData.settings, swData.lastSent)) return;
  await self.registration.showNotification('Budget Club', {
    body: 'Pensez à mettre à jour votre budget !',
    icon: ICON,
  });
  const now = Date.now().toString();
  if (swData) swData.lastSent = now;
  const all = await clients.matchAll({ includeUncontrolled: true, type: 'window' });
  all.forEach(c => c.postMessage({ type: 'NOTIF_SENT', lastSent: now }));
}

setInterval(() => tryNotify(), 60 * 1000);

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'budget-notif') event.waitUntil(tryNotify());
});

self.addEventListener('push', (event) => {
  const d = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(d.title || 'Budget Club', {
      body: d.body || 'Pensez à mettre à jour votre budget !',
      icon: ICON,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
