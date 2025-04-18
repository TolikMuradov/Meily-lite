import { useState, useRef, useEffect } from 'react';

import {
  FiFilter, FiEdit, FiPaperclip,
  FiPlay, FiPause, FiCheckCircle, FiXCircle
} from 'react-icons/fi';
import { BsSortDown } from "react-icons/bs";
import { hexToRgba } from './utils';

const statusIcons = {
  active: <FiPlay title="Active" className="status-icon play" />,
  on_hold: <FiPause title="On Hold" className="status-icon pause" />,
  completed: <FiCheckCircle title="Completed" className="status-icon done" />,
  dropped: <FiXCircle title="Dropped" className="status-icon dropped" />,
};

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
  permanentlyDelete,
  sortOption,
  setSortOption  
}) {
  const isTrashMode = noteFilter?.type === 'trash';
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setShowSortMenu(false);
      }
    };
  
    if (showSortMenu) {
      window.addEventListener('click', handleClickOutside);
    }
  
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [showSortMenu]);

  return (
    <div className="notes-list">
      <div className="notes-top-bar">
      <div className="sort-dropdown-container" ref={sortRef}>
          <BsSortDown
            size={16}
            className="icon-btn"
            onClick={() => setShowSortMenu(prev => !prev)}
          />

          {showSortMenu && (
            <div className="sort-dropdown">
              <div onClick={() => {setSortOption('title-asc');setShowSortMenu(false);}}>Title A-Z</div>
              <div onClick={() => {setSortOption('title-desc');setShowSortMenu(false);}}>Title Z-A</div>
              <div onClick={() => {setSortOption('created-desc');setShowSortMenu(false);}}>Created: New → Old</div>
              <div onClick={() => {setSortOption('created-asc');setShowSortMenu(false);}}>Created: Old → New</div>
              <div onClick={() => {setSortOption('updated-desc');setShowSortMenu(false);}}>Updated: New → Old</div>
              <div onClick={() => {setSortOption('updated-asc');setShowSortMenu(false);}}>Updated: Old → New</div>
            </div>
          )}
        </div>

        <div className="title">{filterTitle}</div>
        <div className="right-icons">
          <button onClick={onAddNote} className="icon-btn">
            <FiEdit size={16} />
          </button>
        </div>
      </div>

      <div className="notes-search">
        <FiFilter className="search-icon" />
        <input
          type="text"
          placeholder="Filter"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {notes.length === 0 ? (
        <p>
          No notes in this category.
          <button onClick={onAddNote} className="btn link-btn">Create one?</button>
        </p>
      ) : (
        notes.map(note => (
          <div
            key={note.id}
            className={`note-item ${note.id === selectedNote?.id ? "selected" : ""}`}
            onClick={() => onSelectNote(note)}
          >
            {/* Başlık ve ikonlar */}
            <div className="note-header-row">
              <h5 className="note-title">  {statusIcons[note.status]}  {note.is_pinned && <FiPaperclip className="pinned-icon" />}{note.title ?? 'Başlıksız'}</h5>
            </div>

            {/* İçerik preview */}
            <p className='note-content'>{(note.content ?? '').slice(0, 40)}...</p>

            {/* Etiketler */}
            <div className="note-tags">
              {(note.tags || []).map(tag => (
                <span
                  key={tag.id}
                  className="note-tag"
                  style={{
                    backgroundColor: hexToRgba(tag.color, 0.3),
                    color: tag.color,
                    borderColor: tag.color
                  }}
                >
                  #{tag.name}
                </span>
              ))}
            </div>

            {isTrashMode && (
              <div className="trash-actions">
                <button className="btn restore-btn" onClick={(e) => {
                  e.stopPropagation();
                  restoreNote(note);
                }}>
                  Geri Al
                </button>
                <button className="btn delete-btn" onClick={(e) => {
                  e.stopPropagation();
                  permanentlyDelete(note.id);
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
