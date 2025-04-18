import { useState, useEffect } from 'react';
import '../css/TagsInput.css';
import { updateTag } from '../api'; 

const COLOR_NAMES = ['orange', 'teal', 'violet', 'yellow', 'blue', 'green', 'pink', 'gray'];

export default function TagSettingsModal({ tag, onClose, onSave }) {
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);
  const [themedColors, setThemedColors] = useState([]);

  useEffect(() => {
    const root = getComputedStyle(document.documentElement);
    const colors = COLOR_NAMES.map(name => ({
      name,
      color: root.getPropertyValue(`--${name}`).trim()
    }));
    setThemedColors(colors);
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;

    // 🟡 Eğer tag'de id varsa backend'e PUT gönder
    if (tag.id) {
      const updated = await updateTag(tag.id, { name: name.trim(), color });
      if (updated?.id) {
        onSave(updated.name, updated.color); // frontend’e bildir
        onClose();
      } else {
        alert('❌ Etiket güncellenemedi');
      }
    } else {
      // Local tag için sadece onSave (örneğin yeni eklenmiş ama kaydedilmemiş)
      onSave(name.trim(), color);
      onClose();
    }
  };

  return (
    <div className="tag-modal-overlay" onClick={onClose}>
      <div className="tag-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Tag Settings</h3>

        <label>Tag Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="tag-modal-input"
        />

        <label>Tag Color</label>
        <div className="tag-color-list">
          {themedColors.map(c => (
            <div
              key={c.name}
              title={c.name}
              className={`tag-color-item ${c.color === color ? 'selected' : ''}`}
              style={{ backgroundColor: c.color }}
              onClick={() => setColor(c.color)}
            />
          ))}
        </div>

        <div className="tag-modal-buttons">
          <button className="btn" onClick={handleSave}>Kaydet</button>
          <button className="btn" onClick={onClose}>İptal</button>
        </div>
      </div>
    </div>
  );
}
