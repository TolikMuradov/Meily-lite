import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import TagContextMenu from './TagContextMenu';
import TagSettingsModal from './TagSettingsModal';
import '../css/TagsInput.css';
import { fetchTags, createTag, updateTag, deleteTag } from '../api';
import { hexToRgba } from './utils';

export default function TagsInput({ tags, setTags }) {
  const [input, setInput] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  const [contextMenuInfo, setContextMenuInfo] = useState(null);
  const [editingTag, setEditingTag] = useState(null);
  const [globalTags, setGlobalTags] = useState([]);

  useEffect(() => {
    fetchTags()
      .then(data => setGlobalTags(data))
      .catch(err => console.error('Tag listesi alınamadı:', err));
  }, []);

  const addTag = async (name) => {
    const cleaned = name.trim().toLowerCase();
    if (!cleaned || cleaned.length > 30) return;

    const existsInNote = tags.some(t => t.name.toLowerCase() === cleaned);
    if (existsInNote) return;

    let existingTag = globalTags.find(t => t.name.toLowerCase() === cleaned);
    if (!existingTag) {
      try {
        existingTag = await createTag({ name: cleaned, color: '#E45826' });
        setGlobalTags(prev => [...prev, existingTag]);
      } catch (e) {
        console.error('Tag oluşturulamadı:', e);
        return;
      }
    }

    setTags(prev => [...prev, existingTag]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      if (input.trim()) {
        addTag(input);
        setInput('');
        setHighlightedIndex(null);
      }
    }

    if (e.key === 'Backspace' && input === '') {
      if (highlightedIndex === null && tags.length > 0) {
        setHighlightedIndex(tags.length - 1);
      } else if (highlightedIndex !== null) {
        const updated = [...tags];
        updated.splice(highlightedIndex, 1);
        setTags(updated);
        setHighlightedIndex(null);
      }
    }
  };

  const removeTag = async (tagId) => {
    setTags(prev => prev.filter(t => t.id !== tagId));
  };

  const handleUpdateTag = async (oldTag, newName, newColor) => {
    try {
      const updated = await updateTag(oldTag.id, { name: newName, color: newColor });
      setTags(prev =>
        prev.map(tag => tag.id === oldTag.id ? updated : tag)
      );
      setGlobalTags(prev =>
        prev.map(tag => tag.id === oldTag.id ? updated : tag)
      );
    } catch (err) {
      console.error('Tag güncellenemedi:', err);
    }
  };

  return (
    <div className="tags-input-container">
      {tags.map((tag, i) => (
        <div
          key={tag.id}
          className={`tag-item ${highlightedIndex === i ? 'highlighted' : ''} note-tag glow`}
          style={{
            backgroundColor: hexToRgba(tag.color, 0.3),
            color: tag.color,
            borderColor: tag.color,
            '--tag-color-shadow': hexToRgba(tag.color, 0.6)
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenuInfo({ x: e.pageX, y: e.pageY, tag });
          }}
          
        >
          {tag.name}
        </div>
      ))}

      <input
        type="text"
        className="tag-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Etiket ekle..."
      />

      {contextMenuInfo && (
        <TagContextMenu
          x={contextMenuInfo.x}
          y={contextMenuInfo.y}
          onClose={() => setContextMenuInfo(null)}
          onSettings={() => {
            setEditingTag(contextMenuInfo.tag);
            setContextMenuInfo(null);
          }}
          onRemove={() => {
            removeTag(contextMenuInfo.tag.id);
            setContextMenuInfo(null);
          }}
        />
      )}

      {editingTag && (
        <TagSettingsModal
          tag={editingTag}
          onClose={() => setEditingTag(null)}
          onSave={(newName, newColor) => {
            handleUpdateTag(editingTag, newName, newColor);
            setEditingTag(null);
          }}
        />
      )}
    </div>
  );
}
