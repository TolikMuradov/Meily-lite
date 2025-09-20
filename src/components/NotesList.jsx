import { useState, useRef, useEffect } from 'react';

import {
  FiSearch, FiEdit, FiPaperclip,
  FiPlay, FiPause, FiCheckCircle, FiXCircle
} from 'react-icons/fi';
import { BsSortDown } from "react-icons/bs";
import { hexToRgba } from './utils';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);


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
  selectedCategoryId,
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
          <button onClick={() => { console.log('Create Note button clicked'); onAddNote(selectedCategoryId || null); }} className="icon-btn">
            <FiEdit size={16} />
          </button>
        </div>
      </div>

      <div className="notes-search">
        <FiSearch className="search-icon" />
        <input
          type="text"
          placeholder="Search notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {notes.length === 0 ? (
        <div className="no-notes-placeholder">
          <img className='empty' src="../../public/1.svg" alt="empty" />
          <p>No notes found.</p>
        </div>
      ) : (
        notes.map(note => {
          const contentStr = note.content || '';
          // Match - [ ] / * [x] etc at line start after optional spaces
          const taskMatches = contentStr.match(/^[ \t]*[-*+]\s*\[( |x|X)\].*$/gm) || [];
            let totalTasks = taskMatches.length;
            let doneTasks = 0;
            if (totalTasks) {
              doneTasks = taskMatches.filter(l => /\[(x|X)\]/.test(l)).length;
            }
            const percent = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
            // Progress color thresholds: <30 warning (amber/yellow), 30-80 info (primary/blue), >80 success (green)
            let progressColor = 'var(--yellow, #e0af68)';
            if (percent >= 80) progressColor = 'var(--success)';
            else if (percent >= 30) progressColor = 'var(--primary)';
          return (
          <div
            key={note.id}
            className={`note-item ${note.id === selectedNote?.id ? "selected" : ""}`}
            onClick={() => onSelectNote(note)}
          >
            {/* Title and icons */}
            <div className="note-header-row">
              <h5 className="note-title">  {statusIcons[note.status]}  {note.is_pinned && <FiPaperclip className="pinned-icon" />}{note.title ?? 'Untitled'}</h5>
            </div>

            {/* İçerik preview */}
            <p className='note-content'>{(note.content ?? '').slice(0, 40)}...</p>

           

            {/* Tags */}
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

               {/* Task progress (if any tasks) */}
            {totalTasks > 0 && (
              <div className="note-task-progress" style={{ margin: '4px 0 6px', maxWidth: '70px' }} title={`Tasks ${doneTasks}/${totalTasks} (${percent}%)`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, marginBottom: 2, opacity: .75 }}>
                  <span>{doneTasks}/{totalTasks}</span>
                  <span>{percent}%</span>
                </div>
                <div style={{ position: 'relative', background: 'var(--border, #333)', borderRadius: 4, overflow: 'hidden', height: 4 }} aria-label="task-progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                  <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-panel, #222)' }} />
                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${percent}%`, background: progressColor, transition: 'width .25s, background-color .25s' }} />
                </div>
              </div>
            )}


              <div className="note-timestamps">
                <small>Created {dayjs(note.created_at).fromNow()}</small>
                <small>Updated {dayjs(note.updated_at).fromNow()}</small>
              </div>

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
        )})
      )}
    </div>
  );
}
