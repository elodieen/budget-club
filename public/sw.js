self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Budget Club 💰', {
      body: data.body || 'Pensez à mettre à jour votre budget !',
      icon: '/logo-budget-club-favicon-rose.png',
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
