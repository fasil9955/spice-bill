const TOKEN_KEY = 'token';
const USER_KEY = 'user';

let redirecting = false;

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getTokenExpiryMs(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = JSON.parse(atob(padded));
    if (typeof json.exp !== 'number') return null;
    return json.exp * 1000;
  } catch {
    return null;
  }
}

export function isTokenExpired(token = getStoredToken()) {
  if (!token) return true;
  const exp = getTokenExpiryMs(token);
  if (exp == null) return true;
  return Date.now() >= exp;
}

export function clearAuthStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthApiUrl(url = '') {
  return String(url).includes('/auth/login') || String(url).includes('/auth/signup');
}

/** Clear storage and send the user to login once. */
export function expireSessionAndLogout() {
  clearAuthStorage();
  if (redirecting) return;
  const path = window.location.pathname || '';
  if (path === '/login' || path.endsWith('/login')) return;
  redirecting = true;
  window.location.href = '/login';
}
