const UPDATE_KEY = 'spice-bill-data-updated';

/** Tell other open shop windows to reload after a save/delete. */
export function broadcastDataUpdate() {
  try {
    localStorage.setItem(UPDATE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** Reload this window when another tab/window saved data. */
export function subscribeToDataUpdates() {
  const onStorage = (e) => {
    if (e.key === UPDATE_KEY && e.newValue) {
      window.location.reload();
    }
  };
  window.addEventListener('storage', onStorage);
  const onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    const last = localStorage.getItem(UPDATE_KEY);
    const seen = sessionStorage.getItem(`${UPDATE_KEY}-seen`);
    if (last && last !== seen) {
      sessionStorage.setItem(`${UPDATE_KEY}-seen`, last);
      if (seen) window.location.reload();
      else sessionStorage.setItem(`${UPDATE_KEY}-seen`, last);
    }
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
