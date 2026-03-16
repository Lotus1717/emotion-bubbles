const registerPwaServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    const swUrl = new URL('../sw.js', import.meta.url);
    const registration = await navigator.serviceWorker.register(swUrl.href);
    console.log('SW registered:', registration.scope);

    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      if (!installingWorker) {
        return;
      }

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
          installingWorker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });
  } catch (error) {
    console.log('SW registration failed:', error);
  }
};

window.addEventListener('load', () => {
  registerPwaServiceWorker();
});
