// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push received:', event);
  
  let data = { title: 'Patient Bio', body: 'Your health data was accessed' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
    }
  }

  // Determine notification options based on type
  const notificationType = data.data?.type || 'access';
  const isCritical = notificationType === 'emergency_access' || data.data?.is_critical === true || data.requireInteraction === true;
  
  const options = {
    body: data.body || 'Your health data was accessed',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    vibrate: isCritical ? [200, 100, 200, 100, 200] : [100, 50, 100],
    data: {
      ...data.data,
      url: data.url || data.data?.url || '/dashboard/access-analytics',
      dateOfArrival: Date.now(),
      isCritical: isCritical,
    },
    tag: notificationType === 'medication_reminder' 
      ? `medication-${data.data?.log_id}` 
      : (isCritical ? 'critical-notification' : 'access-notification'),
    renotify: true,
    requireInteraction: isCritical, // Critical alerts require user to dismiss
  };

  // Add actions based on notification type
  if (notificationType === 'doctor_message') {
    options.actions = [
      { action: 'reply', title: '💬 Reply' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
    options.tag = 'message-notification';
  } else if (notificationType === 'medication_reminder') {
    options.actions = [
      { action: 'take', title: '✓ Taken' },
      { action: 'skip', title: 'Skip' }
    ];
  } else if (notificationType === 'appointment_reminder') {
    options.actions = [
      { action: 'view', title: '📅 View Appointment' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
  } else if (isCritical) {
    options.actions = [
      { action: 'view', title: '🚨 View Now' },
      { action: 'acknowledge', title: 'Got It' }
    ];
  } else {
    options.actions = [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Patient Bio', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked:', event.action);
  event.notification.close();

  const notificationData = event.notification.data;
  const notificationType = notificationData?.type;
  const isCritical = notificationData?.isCritical;

  // Handle dismiss/acknowledge action
  if (event.action === 'dismiss' || event.action === 'acknowledge') {
    return;
  }

  // Handle doctor message actions
  if (notificationType === 'doctor_message') {
    const messageUrl = notificationData?.sender_role === 'doctor'
      ? '/dashboard/messages'
      : '/doctor/messages';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        for (const client of clientList) {
          if (client.url.includes('/dashboard') || client.url.includes('/doctor')) {
            client.navigate(messageUrl);
            return client.focus();
          }
        }
        return clients.openWindow(messageUrl);
      })
    );
    return;
  }

  // Handle medication reminder actions
  if (notificationType === 'medication_reminder') {
    const logId = notificationData?.log_id;
    
    if (event.action === 'take') {
      event.waitUntil(
        (async () => {
          const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
          const dashboardClient = allClients.find(client => client.url.includes('/dashboard'));
          
          if (dashboardClient) {
            dashboardClient.postMessage({
              type: 'MEDICATION_TAKEN',
              logId: logId
            });
            await dashboardClient.focus();
          } else {
            await clients.openWindow(`/dashboard/health-trends?markTaken=${logId}`);
          }
        })()
      );
      return;
    }
    
    if (event.action === 'skip') {
      event.waitUntil(
        clients.openWindow(`/dashboard/health-trends?skipReminder=${logId}`)
      );
      return;
    }
    
    // Default click on medication reminder - open health trends
    event.waitUntil(
      clients.openWindow('/dashboard/health-trends')
    );
    return;
  }

  // Default behavior for other notification types
  // For critical alerts, always navigate to access analytics
  const urlToOpen = isCritical 
    ? '/dashboard/access-analytics' 
    : (notificationData?.url || '/dashboard/access-analytics');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Open a new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle messages from the main app
self.addEventListener('message', function(event) {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle service worker installation
self.addEventListener('install', function(event) {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activating...');
  event.waitUntil(clients.claim());
});

// Periodic background sync — refresh cached data every 12 hours
self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'refresh-health-data') {
    console.log('[Service Worker] Periodic sync: refreshing health data cache');
    event.waitUntil(
      (async () => {
        const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of allClients) {
          client.postMessage({ type: 'PERIODIC_SYNC_REFRESH' });
        }
      })()
    );
  }
});
