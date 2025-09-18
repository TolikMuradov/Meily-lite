import React from 'react';
import { FiCode, FiEye } from 'react-icons/fi';

function SplitIcon(props) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <rect x="3" y="5" width="18" height="14" rx="3" ry="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="4.5" y="6.5" width="6" height="11" rx="1.5" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.35"/>
      <rect x="13.5" y="6.5" width="6" height="11" rx="1.5" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.35"/>
    </svg>
  );
}

export default function ViewModeSwitcher({ mode, onChange }) {
  return (
    <div className="view-mode-switcher" role="group" aria-label="View mode switcher">
      <button
        type="button"
        className={mode === 'editor' ? 'active' : ''}
        title="Sadece Editör"
        onClick={() => onChange('editor')}
      >
        <FiCode />
      </button>
      <button
        type="button"
        className={mode === 'both' ? 'active' : ''}
        title="Bölünmüş Görünüm"
        onClick={() => onChange('both')}
      >
        <SplitIcon />
      </button>
      <button
        type="button"
        className={mode === 'preview' ? 'active' : ''}
        title="Sadece Önizleme"
        onClick={() => onChange('preview')}
      >
        <FiEye />
      </button>
    </div>
  );
}
