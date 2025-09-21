import React from 'react';

export default function OutlinePanel({ open, outline, onClose, onJump }) {
  if (!open || !outline.length) return null;
  return (
    <div style={{ position: 'absolute', top: 8, right: 8, width: 220, maxHeight: 400, overflow: 'auto', background: 'var(--bg-panel, #1e1e1e)', border: '1px solid var(--border, #333)', borderRadius: 6, padding: '8px 10px', fontSize: 12, zIndex: 60 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <strong style={{ fontSize: 12 }}>Outline</strong>
        <button className="btn" style={{ fontSize: 10, padding: '2px 6px' }} onClick={onClose}>×</button>
      </div>
      {outline.map((h, i) => (
        <div
          key={i}
          style={{
            padding: '2px 4px', cursor: 'pointer', marginLeft: (h.level - 1) * 8, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', borderRadius: 4,
          }}
          onClick={() => onJump(h)}
          title={h.text}
        >
          {h.text}
        </div>
      ))}
    </div>
  );
}
