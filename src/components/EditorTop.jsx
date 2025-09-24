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
  onBold,
  onItalic,
  onStrikethrough,
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
    <div className="editor-top-container medium">
      <input
        type="text"
        className="title-input medium"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        aria-label="Note title"
      />
      <div className="meta-row" aria-label="Note metadata controls">
        <NoteMetaControls
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          setSelectedCategoryId={setSelectedCategoryId}
          status={noteStatus}
          setStatus={setNoteStatus}
          tags={noteTags}
          setTags={setNoteTags}
        />
      </div>
      <div className="toolbar-and-buttons compact-row">
        <div className="toolbar medium" aria-label="Formatting toolbar">
          <button className='header' onClick={() => onInsertMarkdown('#')}><PiHashStraightDuotone /></button>
          <button onClick={onBold} title="Bold">
            <FiBold />
          </button>
          <button onClick={onItalic} title="Italic">
            <FiItalic />
          </button>
          <button onClick={onStrikethrough} title="Strikethrough">~~</button>
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

  <div className="editor-buttons medium" aria-label="Note actions">
          {note && (
            <button className="btn subtle" onClick={onTogglePin}>
              <FiPaperclip style={{ marginRight: 4 }} />
              {note.is_pinned ? 'Pinned' : 'Pin to top'}
            </button>
          )}
          <button className="btn subtle" onClick={onSave}>Save</button>
          <button className="btn subtle" onClick={onDelete}>Trash</button>
          <button className="btn subtle" onClick={onExport}>Export</button>
        </div>
      </div>

    </div>
  );
}
