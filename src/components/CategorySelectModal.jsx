import { useState } from 'react';
import '../css/Modal.css';

export default function CategorySelectModal({ isOpen, onClose, categories, onSelect }) {
  const [search, setSearch] = useState('');

  const filtered = categories.filter(cat =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
  <h3>Select Category</h3>
        <input
          type="text"
          className="input"
          placeholder="Search category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <div className="category-list">
          {filtered.map(cat => (
            <div
              key={cat.id}
              className="category-option"
              onClick={() => {
                onSelect(cat.id);
                onClose();
              }}
            >
              {cat.name}
            </div>
          ))}
        </div>
        <div className="modal-buttons">
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
