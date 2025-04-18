import NoteMetaControls from './NoteMetaControls';
import '../css/EditorTop.css';
import {  FiPaperclip   } from 'react-icons/fi';

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
  onTogglePin
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
          <button onClick={() => onInsertMarkdown('**Kalın Yazı**')}><strong>B</strong></button>
          <button onClick={() => onInsertMarkdown('*İtalik Yazı*')}><em>I</em></button>
          <button onClick={() => onInsertMarkdown('~~Üstü çizili~~')}><s>S</s></button>
          <button onClick={() => onInsertMarkdown('\\n# Başlık 1\\n')}>H1</button>
          <button onClick={() => onInsertMarkdown('\\n## Başlık 2\\n')}>H2</button>
          <button onClick={() => onInsertMarkdown('\\n### Başlık 3\\n')}>H3</button>
          <button onClick={() => onInsertMarkdown('\\n- Liste öğesi\\n')}>• Liste</button>
          <button onClick={() => onInsertMarkdown('\\n1. Numaralı liste\\n')}>1. Liste</button>
          <button onClick={() => onInsertMarkdown('\\n```\nKod bloğu\n```\\n')}>{"</> Kod Bloğu"}</button>
          <button onClick={() => onInsertMarkdown('`inline kod`')}>{"</> Inline Kod"}</button>
          <button onClick={async () => {
            const imagePath = await window.api.selectImage();
            if (imagePath) onInsertMarkdown(`![Resim Açıklaması](${imagePath})`);
          }}>
            🖼️ Resim Ekle
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
