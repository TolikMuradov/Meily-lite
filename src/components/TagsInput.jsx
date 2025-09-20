import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import TagContextMenu from './TagContextMenu';
import TagSettingsModal from './TagSettingsModal';
import '../css/TagsInput.css';
import { storage } from '../storage';
import useThemeTagColors from '../hooks/useThemeTagColors';
import { hexToRgba } from './utils';

export default function TagsInput({ tags, setTags }) {
  const [input, setInput] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(null);
  const [contextMenuInfo, setContextMenuInfo] = useState(null);
  const [editingTag, setEditingTag] = useState(null);
  const [globalTags, setGlobalTags] = useState([]);
  const [activePaletteTagId, setActivePaletteTagId] = useState(null);
  const themeColors = useThemeTagColors();

  // Dış tıklama kapatma
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.tag-wrapper-inline')) {
        setActivePaletteTagId(null);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    storage.getTags()
      .then(data => setGlobalTags(data))
  .catch(err => console.error('Failed to fetch tag list:', err));
  }, []);

  const addTag = async (name) => {
    const cleaned = name.trim().toLowerCase();
    if (!cleaned || cleaned.length > 30) return;

    const existsInNote = tags.some(t => t.name.toLowerCase() === cleaned);
    if (existsInNote) return;

    let existingTag = globalTags.find(t => t.name.toLowerCase() === cleaned);
    if (!existingTag) {
      try {
        existingTag = await storage.createTag({ name: cleaned, color: '#E45826' });
        if (!existingTag) return;
        setGlobalTags(prev => [...prev, existingTag]);
      } catch (e) {
  console.error('Tag could not be created:', e);
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

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (highlightedIndex === null && tags.length > 0) {
        setHighlightedIndex(tags.length - 1);
      } else if (highlightedIndex !== null && highlightedIndex > 0) {
        setHighlightedIndex(highlightedIndex - 1);
      }
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (highlightedIndex !== null && highlightedIndex < tags.length - 1) {
        setHighlightedIndex(highlightedIndex + 1);
      } else {
        setHighlightedIndex(null);
      }
    }
  };

  const removeTag = async (tagId) => {
    setTags(prev => prev.filter(t => t.id !== tagId));
  };

  const handleUpdateTag = async (oldTag, newName, newColor) => {
    try {
  const updated = await storage.updateTag(oldTag.id, { name: newName, color: newColor });
      setTags(prev =>
        prev.map(tag => tag.id === oldTag.id ? updated : tag)
      );
      setGlobalTags(prev =>
        prev.map(tag => tag.id === oldTag.id ? updated : tag)
      );
    } catch (err) {
  console.error('Tag could not be updated:', err);
    }
  };

  const quickColors = themeColors.length ? themeColors : ['#E45826', '#0FA3B1', '#6366F1', '#16A34A', '#F59E0B', '#EC4899', '#64748B'];
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') setActivePaletteTagId(null); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  const applyQuickColor = async (tag, color) => {
    try {
      const updated = await storage.updateTag(tag.id, { name: tag.name, color });
      setTags(prev => prev.map(t => t.id === tag.id ? updated : t));
      setGlobalTags(prev => prev.map(t => t.id === tag.id ? updated : t));
    } catch (e) {
  console.error('Color could not be updated:', e);
    }
  };

  return (
    <div className="tags-input-container">
      {tags.map((tag, i) => (
        <div key={tag.id} className="tag-wrapper-inline">
          <div
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
            onClick={(e) => {
              e.stopPropagation();
              setActivePaletteTagId(prev => prev === tag.id ? null : tag.id);
            }}
          >
            {tag.name}
          </div>
          {activePaletteTagId === tag.id && (
            <div className="tag-quick-colors">
              {quickColors.map(c => (
                <span
                  key={c}
                  className="tag-color-dot"
                  style={{ backgroundColor: c, outline: c === tag.color ? '2px solid var(--border)' : 'none' }}
                  onClick={(e) => { e.stopPropagation(); applyQuickColor(tag, c); setActivePaletteTagId(null); }}
                  title="Change color"
                />
              ))}
            </div>
          )}
        </div>
      ))}

      <input
        type="text"
        className="tag-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add tag..."
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
