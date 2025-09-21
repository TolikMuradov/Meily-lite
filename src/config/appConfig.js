// Central application configuration
// Priority: explicit localStorage override -> Vite env -> fallback

const DEFAULT_API = 'http://52.65.1.213:8000';
const LS_KEY = 'app.apiBase';

export function getApiBase() {
  try {
    const ls = localStorage.getItem(LS_KEY);
    if (ls) return ls.replace(/\/$/, '');
  } catch { /* ignore storage access */ }
  const env = import.meta?.env?.VITE_API_BASE;
  if (env) return (''+env).replace(/\/$/, '');
  return DEFAULT_API;
}

export function setApiBase(url) {
  localStorage.setItem(LS_KEY, url.replace(/\/$/, ''));
  window.dispatchEvent(new CustomEvent('config-api-base-changed'));
}
