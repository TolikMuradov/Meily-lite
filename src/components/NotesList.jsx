import { FiFilter, FiEdit } from 'react-icons/fi';
import { BsSortDown } from "react-icons/bs";

export default function NotesList({
  notes = [],
  selectedNote,
  onSelectNote,
  onAddNote,
  searchTerm = '',
  setSearchTerm,
  noteFilter,
  filterTitle = 'All Notes',
  restoreNote,
  permanentlyDelete
}) {
  const isTrashMode = noteFilter?.type === 'trash';

  return (
    <div className="notes-list">

      {/* Üst başlık paneli */}
      <div className="notes-top-bar">
        <div className="left-icons">
          <BsSortDown size={16} />
        </div>
        <div className="title">{filterTitle || "All Notes"}</div>
        <div className="right-icons">
          <button onClick={onAddNote} className="icon-btn">
            <FiEdit size={16} />
          </button>
        </div>
      </div>

      {/* Arama inputu */}
      <div className="notes-search">
        <FiFilter className="search-icon" />
        <input
          type="text"
          placeholder="Filter"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Notlar */}
      {notes.length === 0 ? (
        <p>
          No notes in this category.
          <button onClick={onAddNote} className="btn link-btn">
            Create one?
          </button>
        </p>
      ) : (
        notes.map(note => (
          <div
            key={note.id}
            className={`note-item ${note.id === selectedNote?.id ? "selected" : ""}`}
            onClick={() => onSelectNote(note)}
          >
            <strong>{note.title ?? 'Başlıksız'}</strong>
            <p>{(note.content ?? '').slice(0, 40)}...</p>

            {isTrashMode && (
              <div className="trash-actions">
                <button className="btn restore-btn" onClick={(e) => {
                  e.stopPropagation();
                  restoreNote(note); // ✅ düzeltildi
                }}>
                  Geri Al
                </button>

                <button className="btn delete-btn" onClick={(e) => {
                  e.stopPropagation();
                  permanentlyDelete(note.id); // ✅ düzeltildi
                }}>
                  Kalıcı Sil
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
