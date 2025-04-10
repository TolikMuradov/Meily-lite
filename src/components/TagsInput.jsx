import { useState } from 'react';
import { FiX } from 'react-icons/fi';
import '../css/TagsInput.css';

export default function TagsInput({ tags, setTags }) {
  const [input, setInput] = useState('');

  const addTag = (tag) => {
    const cleaned = tag.trim();
    if (cleaned && !tags.includes(cleaned)) {
      setTags([...tags, cleaned]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      addTag(input);
      setInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="tags-input-container">
      {tags.map((tag) => (
        <div className="tag-item" key={tag}>
          {tag}
          <FiX onClick={() => removeTag(tag)} className="remove-tag" />
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
    </div>
  );
}
