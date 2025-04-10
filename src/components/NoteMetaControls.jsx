import { useState } from 'react';
import CategorySelectModal from './CategorySelectModal';
import '../css/EditorTop.css'; 
import { FiFolder} from "react-icons/fi";
import { IoIosArrowDown } from "react-icons/io";
import StatusDropdown from './StatusDropdown';
import TagsInput from './TagsInput';


export default function NoteMetaControls({
    categories,
    selectedCategoryId,
    setSelectedCategoryId,
    status,
    setStatus,
    tags,
    setTags
  }) {
  const [modalOpen, setModalOpen] = useState(false);
  const selectedCatName =
    categories.find(c => c.id === parseInt(selectedCategoryId))?.name || 'Kategori Seç';

  return (
    <div className="note-meta-controls">
      {/* Gizli select, autosave için */}
      <select
        style={{ display: 'none' }}
        value={selectedCategoryId || ''}
        onChange={(e) => setSelectedCategoryId(e.target.value)}
      >
        {categories.map(cat => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      {/* Görünür buton */}
      <FiFolder />
      <button className="btn category-btn" onClick={() => setModalOpen(true)}>
         {selectedCatName} <IoIosArrowDown />
      </button>

      <CategorySelectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        categories={categories}
        onSelect={(id) => setSelectedCategoryId(id)}
      />

      {/* 🔄 Status Seçici */}
      <StatusDropdown
        value={status}
        onChange={setStatus}
      />

        <TagsInput tags={tags} setTags={setTags} />
    </div>
    

  );
}
