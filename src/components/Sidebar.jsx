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
  FiPlus
} from 'react-icons/fi';
import '../css/sidebar.css'; // özel CSS

export default function Sidebar({
  categories,
  setNoteFilter,
  noteStats,
  setContextCategory,
  setContextMenuPos,
  setShowContextMenu,
  handleAddCategory
}) {
  return (
    <div className="sidebar">

      
      {/* Üst Header */}
      <div className="sidebar-header">
        <div className="logo">Meily-lite</div>
        <div className="menu-btn">☰</div>
      </div>

      {/* Menü Bölümleri */}
      <div className="sidebar-section">
        <button className="sidebar-btn" onClick={() => setNoteFilter({ type: 'all' })}>
          <FiFileText /> All Notes
          <span className="count">{noteStats.all ?? 0}</span>
        </button>
        <button className="sidebar-btn" onClick={() => setNoteFilter({ type: 'pinned' })}>
          <FiStar /> Pinned
          <span className="count">{noteStats.pinned ?? 0}</span>
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
    className="sidebar-item"
    onClick={() => setNoteFilter({ type: 'category', id: cat.id })}
    onContextMenu={(e) => {
      if (cat.is_default) return; // ❌ sağ tık kapalı
      e.preventDefault();
      setContextCategory(cat);
      setContextMenuPos({ x: e.pageX, y: e.pageY });
      setShowContextMenu(true);
    }}
  >
    <FiFolder style={{ marginRight: 6 }} />
    {cat.name}
    <span className="count">{noteStats.category?.[cat.id] ?? 0}</span>
  </div>
))}
</div>


      <div className="sidebar-section">
        <button className="sidebar-btn" onClick={() => setNoteFilter({ type: 'trash' })}>
          <FiTrash2 /> Trash
          <span className="count">{noteStats.trash ?? 0}</span>
        </button>
      </div>

      <div className="sidebar-section">
        <h5>Status</h5>
        <button className="sidebar-btn" onClick={() => setNoteFilter({ type: 'status', status: 'active' })}>
    <FiPlay className='play'/> Active
    <span className="count">{noteStats.status.active ?? 0}</span>
  </button>
  <button className="sidebar-btn" onClick={() => setNoteFilter({ type: 'status', status: 'on_hold' })}>
    <FiPause className='pause' /> On Hold
    <span className="count">{noteStats.status.on_hold ?? 0}</span>
  </button>
  <button className="sidebar-btn" onClick={() => setNoteFilter({ type: 'status', status: 'completed' })}>
    <FiCheckCircle className='check' /> Completed
    <span className="count">{noteStats.status.completed ?? 0}</span>
  </button>
  <button className="sidebar-btn" onClick={() => setNoteFilter({ type: 'status', status: 'dropped' })}>
    <FiXCircle className='x'/> Dropped
    <span className="count">{noteStats.status.dropped ?? 0}</span>
  </button>
      </div>

      {/* Profil en altta */}
      <div className="sidebar-footer">
        <div className="user-info">
          <FiUser style={{ marginRight: 6 }} />
          Kullanıcı Adı
        </div>
        <button className="btn settings-btn" onClick={() => window.api.openSettings()}>
          <FiSettings /> Ayarlar
        </button>
      </div>
      
    </div>
  );
}
