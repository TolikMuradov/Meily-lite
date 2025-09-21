const KEY = 'pref.searchAnimation';

export function getSearchAnimationEnabled() {
  const raw = localStorage.getItem(KEY);
  if (raw == null) return true; // default on
  return raw === 'true';
}

export function setSearchAnimationEnabled(enabled) {
  localStorage.setItem(KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('pref-search-animation-changed', { detail: enabled }));
}
