import { getApiBase } from '../config/appConfig';

export async function fetchWithTimeout(path, { timeout = 10000, base = getApiBase(), ...opts } = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const url = path.startsWith('http') ? path : base.replace(/\/$/,'') + '/' + path.replace(/^\//,'');
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

export async function jsonFetch(path, opts) {
  const res = await fetchWithTimeout(path, opts);
  if (!res.ok) {
    const text = await res.text().catch(()=> '');
    throw new Error(`Request failed ${res.status} ${res.statusText}: ${text.slice(0,120)}`);
  }
  return res.json();
}
