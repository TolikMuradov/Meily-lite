
import NoteMetaControls from './NoteMetaControls';
import '../css/EditorTop.css';
import {
  FiPaperclip,
  FiBold,
  FiItalic,
  FiCode,
  FiList,
  FiCheckSquare,
  FiType,
  FiHash,
  FiImage,
  FiLink
} from 'react-icons/fi';
import { PiHashStraightDuotone } from "react-icons/pi";

export default function EditorTop({
  title,
  setTitle,
  onInsertMarkdown,
  onSave,
  onDelete,
  onExport,
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
  noteStatus,
  setNoteStatus,
  noteTags,
  setNoteTags,
  note,
  onTogglePin,
  onLinkClick,
}) {
  return (
    <div className="editor-top-container">
      {/* 📝 Başlık */}
      <input
        type="text"
        className="title-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Başlık"
      />

      {/* 📂 Kategori, Durum, Etiketler */}
      <NoteMetaControls
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        setSelectedCategoryId={setSelectedCategoryId}
        status={noteStatus}
        setStatus={setNoteStatus}
        tags={noteTags}
        setTags={setNoteTags}
      />

      {/* 🔧 Toolbar ve Butonlar */}
      <div className="toolbar-and-buttons">
        <div className="toolbar">
          <button className='header' onClick={() => onInsertMarkdown('#')}><PiHashStraightDuotone /></button>
          <button onClick={() => onInsertMarkdown('**', '**')} title="Bold">
            <FiBold />
          </button>
          <button onClick={() => onInsertMarkdown('_', '_')} title="Italic">
            <FiItalic />
          </button>
          <button onClick={onLinkClick} title="Link Ekle">
            <FiLink />
          </button>
          <button onClick={() => onInsertMarkdown('`', '`')} title="Inline Code">
            <FiCode />
          </button>
          <button onClick={() => onInsertMarkdown('```', '```')} title="Code Block">
            <FiType />
          </button>
          <button onClick={() => onInsertMarkdown('- ', '')} title="List">
            <FiList />
          </button>
          <button onClick={() => onInsertMarkdown('- [ ] ', '')} title="Checklist">
            <FiCheckSquare />
          </button>
          <button onClick={() => onInsertMarkdown('# ', '')} title="Heading">
            <FiHash />
          </button>
          <button
            onClick={async () => {
              const path = await window.api.selectImage();
              if (path) onInsertMarkdown(`![resim](${path})`, '');
            }}
            title="Image"
          >
            <FiImage />
          </button>
        </div>

        {/* 📌 Pin + Kaydet/Sil/Dışa Aktar */}
        <div className="editor-buttons">
          {note && (
            <button className="btn" onClick={onTogglePin}>
              <FiPaperclip style={{ marginRight: 4 }} />
              {note.is_pinned ? 'Sabitlenmiş' : 'Üste Sabitle'}
            </button>
          )}
          <button className="btn" onClick={onSave}>Kaydet</button>
          <button className="btn" onClick={onDelete}>Sil</button>
          <button className="btn" onClick={onExport}>Dışa Aktar</button>
        </div>
      </div>

  

    </div>
  );
}
