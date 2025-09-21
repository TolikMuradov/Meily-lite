import React from 'react';

export default function SlashCommandPopup({ open, commands, selectedIndex, onPick }) {
  if (!open) return null;
  return (
    <div className="slash-command-popup" style={{ position: 'absolute', left: 8, bottom: 8, zIndex: 50, top: 'auto' }}>
      {commands.length === 0 && (
        <div className="slash-command-item empty">No matches</div>
      )}
      {commands.map((cmd, i) => (
        <div
          key={cmd.label}
          className={`slash-command-item ${i === selectedIndex ? 'selected' : ''}`}
          onMouseDown={() => onPick(cmd.snippet)}
        >
          {cmd.label}
        </div>
      ))}
    </div>
  );
}
