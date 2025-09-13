import {
  FiFileText,
  FiStar,
  FiTrash2,
  FiFolder,
  FiUser,
  FiSettings,
  FiPlay,
  FiPause,
  FiCheckCircle,
  FiXCircle,
  FiPlus,
} from 'react-icons/fi';
import '../css/sidebar.css';

export default function Sidebar({
  categories,
  setNoteFilter,
  noteStats = {},
  setContextCategory,
  setContextMenuPos,
  setShowContextMenu,
  handleAddCategory,
  handleUpdateCategory,  
  handleDeleteCategory,  
  tagsList,
  noteFilter,
}) {
  const isActive = (type, value) => {
    if (!noteFilter) return false;
    if (type === 'tag') return noteFilter.type === 'tag' && noteFilter.tag === value;
    if (type === 'status') return noteFilter.type === 'status' && noteFilter.status === value;
    if (type === 'category') return noteFilter.type === 'category' && noteFilter.id === value;
    return noteFilter.type === type;
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">Meily-lite</div>
        <div className="menu-btn">☰</div>
      </div>

      <div className="sidebar-section">
        <button className={`sidebar-btn ${isActive('all') ? 'active' : ''}`} onClick={() => setNoteFilter({ type: 'all' })}>
          <FiFileText /> All Notes
          <span className="count">{noteStats?.all ?? 0}</span>
        </button>
        <button className={`sidebar-btn ${isActive('pinned') ? 'active' : ''}`} onClick={() => setNoteFilter({ type: 'pinned' })}>
          <FiStar /> Pinned
          <span className="count">{noteStats?.pinned ?? 0}</span>
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <h5>Notebooks</h5>
          <button className="icon-btn" onClick={handleAddCategory}>
            <FiPlus size={14} />
          </button>
        </div>
        {categories.map(cat => (
          <div
            key={cat.id}
            className={`sidebar-item ${isActive('category', cat.id) ? 'active' : ''}`}
            onClick={() => setNoteFilter({ type: 'category', id: cat.id })}
            onContextMenu={(e) => {
              if (cat.is_default) return;
              e.preventDefault();
              setContextCategory(cat);
              setContextMenuPos({ x: e.pageX, y: e.pageY });
              setShowContextMenu(true);
            }}
          >
            <FiFolder style={{ marginRight: 6, flexShrink: 0 }} />
            <span className="label-text">{cat.name}</span>
            <span className="count">{noteStats?.category?.[cat.id] ?? 0}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-section">
        <button className={`sidebar-btn ${isActive('trash') ? 'active' : ''}`} onClick={() => setNoteFilter({ type: 'trash' })}>
          <FiTrash2 /> Trash
          <span className="count">{noteStats?.trash ?? 0}</span>
        </button>
      </div>

      <div className="sidebar-section">
        <h5>Status</h5>
        <button className={`sidebar-btn ${isActive('status', 'active') ? 'active' : ''}`} onClick={() => setNoteFilter({ type: 'status', status: 'active' })}>
          <FiPlay className='play' /> Active
          <span className="count">{noteStats?.status?.active ?? 0}</span>
        </button>
        <button className={`sidebar-btn ${isActive('status', 'on_hold') ? 'active' : ''}`} onClick={() => setNoteFilter({ type: 'status', status: 'on_hold' })}>
          <FiPause className='pause' /> On Hold
          <span className="count">{noteStats?.status?.on_hold ?? 0}</span>
        </button>
        <button className={`sidebar-btn ${isActive('status', 'completed') ? 'active' : ''}`} onClick={() => setNoteFilter({ type: 'status', status: 'completed' })}>
          <FiCheckCircle className='check' /> Completed
          <span className="count">{noteStats?.status?.completed ?? 0}</span>
        </button>
        <button className={`sidebar-btn ${isActive('status', 'dropped') ? 'active' : ''}`} onClick={() => setNoteFilter({ type: 'status', status: 'dropped' })}>
          <FiXCircle className='x' /> Dropped
          <span className="count">{noteStats?.status?.dropped ?? 0}</span>
        </button>
      </div>

      {tagsList && tagsList.length > 0 && (
        <div className="sidebar-section">
          <h5>Tags</h5>
          {tagsList.map(tag => (
            <div
              key={`tag-${tag.id || tag.name}`}
              className={`sidebar-item tags ${isActive('tag', tag.name) ? 'active' : ''}`}
              onClick={() => setNoteFilter({ type: 'tag', tag: tag.name })}
            >
              <span
                className="tag-color-dot"
                style={{
                  backgroundColor: tag.color,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  display: 'inline-block',
                  marginRight: 8
                }}
              />
              <span className="label-text">{tag.name}</span>
              <span className="count">{noteStats?.tags?.[tag.name] ?? 0}</span>
            </div>
          ))}
        </div>
      )}

      <div className="sidebar-footer">
        <div className="user-info">
          <FiUser style={{ marginRight: 6 }} />
          Kullanıcı Adı
        </div>
        <button className="btn settings-btn" onClick={() => window.api.openSettings()}>
        <button className="btn settings-btn" onClick={() => window.api && window.api.openSettings && window.api.openSettings()}>
          <FiSettings /> Ayarlar
        </button>
      </div>

      
    </div>
  );
}
