import React from 'react';

export default function SearchOverlay({
  open,
  searchQuery,
  setSearchQuery,
  replaceValue,
  setReplaceValue,
  searchMatches,
  activeMatch,
  setActiveMatch,
  doReplaceOne,
  doReplaceAll,
  onClose
}) {
  if (!open) return null;
  return (
    <div
      className="editor-search-overlay"
      style={{
        position: 'absolute', top: 0, right: 0, background: 'rgba(25,25,30,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid var(--border, #333)', borderTopRightRadius: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 10, borderBottomRightRadius: 0,
        padding: '10px 10px 12px', zIndex: 100, width: 260, boxShadow: '0 6px 18px -4px rgba(0,0,0,0.55)', fontSize: 12, lineHeight: 1.3
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <input
          name="query"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (searchMatches.length) {
                if (e.shiftKey) {
                  setActiveMatch(m => (m - 1 + searchMatches.length) % searchMatches.length);
                } else {
                  setActiveMatch(m => (m + 1) % searchMatches.length);
                }
              }
            }
          }}
          placeholder="Find"
          className="input"
          style={{ flex: 1, fontSize: 12, padding: '4px 6px' }}
        />
        <button className="btn" style={{ padding: '4px 6px', fontSize: 11 }} onClick={onClose}>×</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <input
          value={replaceValue}
          onChange={e => setReplaceValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (e.ctrlKey || e.metaKey) {
                doReplaceAll();
              } else {
                doReplaceOne();
              }
            }
          }}
          placeholder="Replace"
          className="input"
          style={{ flex: 1, fontSize: 12, padding: '4px 6px' }}
        />
        <span style={{ opacity: 0.6, fontSize: 11 }}>{searchMatches.length ? `${activeMatch + 1}/${searchMatches.length}` : '0/0'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        <button className="btn" style={{ fontSize: 11, padding: '4px 0' }} disabled={!searchMatches.length} onClick={() => setActiveMatch(m => (m - 1 + searchMatches.length) % searchMatches.length)}>Prev</button>
        <button className="btn" style={{ fontSize: 11, padding: '4px 0' }} disabled={!searchMatches.length} onClick={() => setActiveMatch(m => (m + 1) % searchMatches.length)}>Next</button>
        <button className="btn" style={{ fontSize: 11, padding: '4px 0' }} disabled={!searchMatches.length} onClick={doReplaceOne}>One</button>
        <button className="btn" style={{ fontSize: 11, padding: '4px 0' }} disabled={!searchMatches.length} onClick={doReplaceAll}>All</button>
      </div>
      <div style={{ fontSize: 10, opacity: 0.5, marginTop: 6, textAlign: 'center' }}>Ctrl+F / Esc</div>
    </div>
  );
}
