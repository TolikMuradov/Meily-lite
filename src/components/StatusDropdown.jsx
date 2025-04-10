import { useState } from 'react';
import { FiPlay, FiPause, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import '../css/EditorTop.css';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', icon: <FiPlay className="status-icon play" /> },
  { value: 'on_hold', label: 'On Hold', icon: <FiPause className="status-icon pause" /> },
  { value: 'completed', label: 'Completed', icon: <FiCheckCircle className="status-icon done" /> },
  { value: 'dropped', label: 'Dropped', icon: <FiXCircle className="status-icon dropped" /> },
];

export default function StatusDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const selected = STATUS_OPTIONS.find(opt => opt.value === value) || STATUS_OPTIONS[0];

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="status-dropdown">
      <button className="status-trigger" onClick={() => setIsOpen(prev => !prev)}>
        {selected.icon}
        {selected.label}
        <span className="arrow">▾</span>
      </button>

      {isOpen && (
        <div className="status-menu">
          {STATUS_OPTIONS.map(opt => (
            <div
              key={opt.value}
              className={`status-item ${opt.value === value ? 'selected' : ''}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.icon} {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
