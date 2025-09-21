// Central table-related runtime configuration with persistence.
// Provides get/set helpers and change subscribers.

const STORAGE_KEY = 'tableConfig:v1';

const defaults = {
  debug: true,
  kernelEnabled: false,
  autoFormatOnTab: true,
  perfWarnThresholdMs: 24, // log if format > threshold
};

let state = { ...defaults };

try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    state = { ...state, ...parsed };
  }
} catch {
  console.warn('[tableConfig] load failed');
}

const listeners = new Set();

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore persistence errors */ }
}

export function getTableConfig() {
  return { ...state };
}

export function updateTableConfig(patch) {
  const prev = state;
  state = { ...state, ...patch };
  persist();
  for (const l of listeners) {
  try { l(state, prev); } catch { console.error('[tableConfig] listener error'); }
  }
}

export function onTableConfigChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Convenience toggles
export function toggleDebug() { updateTableConfig({ debug: !state.debug }); }
export function toggleAutoFormat() { updateTableConfig({ autoFormatOnTab: !state.autoFormatOnTab }); }
