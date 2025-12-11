/**
 * Service Worker Registration and Management
 * Registers the service worker for caching and performance optimization
 */

const isProduction = process.env.NODE_ENV === 'production';
const swUrl = '/sw.js';

/**
 * Register the service worker
 */
export function registerSW() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers not supported');
    return Promise.resolve(null);
  }

  // Only register in production to avoid caching issues in development
  if (!isProduction) {
    console.log('Service worker skipped in development mode');
    return Promise.resolve(null);
  }

  return window.addEventListener('load', () => {
    navigator.serviceWorker.register(swUrl)
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, show update notification
                showUpdateAvailableNotification(registration);
              }
            });
          }
        });

        return registration;
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
        return null;
      });
  });
}

/**
 * Unregister the service worker
 */
export function unregisterSW() {
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker.ready
      .then((registration) => {
        return registration.unregister();
      })
      .catch((error) => {
        console.error('Service Worker unregistration failed:', error);
      });
  }

  return Promise.resolve();
}

/**
 * Check if there's an update available
 */
export function checkForUpdates() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    return navigator.serviceWorker.ready.then((registration) => {
      return registration.update();
    });
  }

  return Promise.resolve();
}

/**
 * Show notification when an update is available
 */
function showUpdateAvailableNotification(registration) {
  // Create a simple notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #3B82F6;
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 320px;
    line-height: 1.4;
    transition: all 0.3s ease;
  `;

  notification.innerHTML = `
    <div style="margin-bottom: 12px;">
      <strong>עדכון זמין</strong><br>
      גרסה חדשה של האתר זמינה
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="sw-update-btn" style="
        background: white;
        color: #3B82F6;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        font-weight: 500;
      ">עדכן עכשיו</button>
      <button id="sw-dismiss-btn" style="
        background: transparent;
        color: white;
        border: 1px solid rgba(255,255,255,0.3);
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
      ">בטל</button>
    </div>
  `;

  document.body.appendChild(notification);

  // Handle update button click
  const updateBtn = notification.querySelector('#sw-update-btn');
  const dismissBtn = notification.querySelector('#sw-dismiss-btn');

  updateBtn.addEventListener('click', () => {
    // Tell the new service worker to skip waiting
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // Reload the page to get the new version
    window.location.reload();
  });

  dismissBtn.addEventListener('click', () => {
    notification.remove();
  });

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 10000);
}

/**
 * Get cache storage information
 */
export async function getCacheInfo() {
  if (!('caches' in window)) {
    return { supported: false };
  }

  try {
    const cacheNames = await caches.keys();
    const cacheInfo = await Promise.all(
      cacheNames.map(async (name) => {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        return {
          name,
          entries: keys.length,
          urls: keys.map(key => key.url)
        };
      })
    );

    return {
      supported: true,
      caches: cacheInfo,
      totalCaches: cacheNames.length
    };
  } catch (error) {
    console.error('Failed to get cache info:', error);
    return { supported: true, error: error.message };
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches() {
  if (!('caches' in window)) {
    return { success: false, message: 'Caches not supported' };
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );

    console.log('✅ All caches cleared');
    return { success: true, clearedCaches: cacheNames.length };
  } catch (error) {
    console.error('❌ Failed to clear caches:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Development utility to toggle service worker
 */
export function toggleServiceWorker() {
  if (isProduction) {
    console.warn('Cannot toggle service worker in production');
    return;
  }

  const isRegistered = navigator.serviceWorker.controller !== null;

  if (isRegistered) {
    console.log('Unregistering service worker...');
    unregisterSW().then(() => {
      clearAllCaches().then(() => {
        console.log('Service worker unregistered and caches cleared');
        window.location.reload();
      });
    });
  } else {
    console.log('Registering service worker...');
    registerSW();
  }
}

// Make utilities available globally in development
if (!isProduction && typeof window !== 'undefined') {
  window.swUtils = {
    register: registerSW,
    unregister: unregisterSW,
    toggle: toggleServiceWorker,
    checkUpdates: checkForUpdates,
    getCacheInfo,
    clearAllCaches
  };

  console.log('🛠️ Service Worker utilities available at window.swUtils');
}

export default {
  registerSW,
  unregisterSW,
  checkForUpdates,
  getCacheInfo,
  clearAllCaches,
  toggleServiceWorker
};