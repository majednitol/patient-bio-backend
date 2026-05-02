/**
 * Wraps a dynamic import with retry logic to handle stale chunk errors
 * after deployments. On failure, clears caches and reloads the page once
 * to get fresh assets.
 */
export function lazyRetry<T extends { default: any }>(
  factory: () => Promise<T>
): () => Promise<T> {
  return () =>
    factory().catch(async (error: unknown) => {
      const key = 'chunk_reload_done';
      const hasReloaded = sessionStorage.getItem(key);

      if (!hasReloaded) {
        sessionStorage.setItem(key, '1');

        // Clear service worker caches so stale chunks are purged
        if ('caches' in window) {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((name) => caches.delete(name)));
          } catch {
            // Ignore cache clearing errors
          }
        }

        // Unregister service workers to force fresh fetch
        if ('serviceWorker' in navigator) {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((r) => r.unregister()));
          } catch {
            // Ignore SW errors
          }
        }

        window.location.reload();
        // Return a never-resolving promise while page reloads
        return new Promise<T>(() => {});
      }

      // Already reloaded once — clear the flag for next session and throw
      sessionStorage.removeItem(key);
      throw error;
    });
}
