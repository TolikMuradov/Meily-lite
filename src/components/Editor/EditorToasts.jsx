import React from 'react';

export default function EditorToasts({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="editor-toasts" style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: 'var(--bg-panel, #222)', color: 'var(--text, #fff)', padding: '8px 12px', borderRadius: 6, fontSize: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}>{t.msg}</div>
      ))}
    </div>
  );
}
