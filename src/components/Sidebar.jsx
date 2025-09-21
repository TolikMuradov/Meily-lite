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
import SidebarHeader from './Sidebar/SidebarHeader';
import SidebarSection from './Sidebar/SidebarSection';
import SidebarItem from './Sidebar/SidebarItem';
import '../css/base.css';
export default function Sidebar({
  categories,
  setNoteFilter,
  noteStats = {},
  setContextCategory,
  setContextMenuPos,
  setShowContextMenu,
  handleAddCategory,
  tagsList,
  noteFilter,
  isMac,
}) {
  

  const isActive = (type, value) => {
    if (!noteFilter) return false;
    if (type === 'tag') return noteFilter.type === 'tag' && noteFilter.tag === value;
    if (type === 'status') return noteFilter.type === 'status' && noteFilter.status === value;
    if (type === 'category') return noteFilter.type === 'category' && noteFilter.id === value;
    if (type === 'uncategorized') return noteFilter.type === 'uncategorized';
    return noteFilter.type === type;
  };

  return (
    <div className="sidebar">
      <div className="sidebar-fixed-header">
  <SidebarHeader isMac={isMac} />
      </div>
      <div className="sidebar-scroll">
        <SidebarSection>
          <SidebarItem
            isActive={isActive('all')}
            onClick={() => setNoteFilter({ type: 'all' })}
            icon={FiFileText}
            label="All Notes"
            count={noteStats?.all ?? 0}
          />
          <SidebarItem
            isActive={isActive('pinned')}
            onClick={() => setNoteFilter({ type: 'pinned' })}
            icon={FiStar}
            label="Pinned"
            count={noteStats?.pinned ?? 0}
          />
        </SidebarSection>

        <SidebarSection>
          <div className="sidebar-section-header">
            <h5>Notebooks</h5>
            <button className="icon-btn" onClick={handleAddCategory}>
              <FiPlus size={14} />
            </button>
          </div>
          {categories.map(cat => (
            <SidebarItem
              key={cat.id}
              isActive={isActive('category', cat.id)}
              onClick={() => setNoteFilter({ type: 'category', id: cat.id })}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextCategory(cat);
                setContextMenuPos({ x: e.pageX, y: e.pageY });
                setShowContextMenu(true);
              }}
              icon={FiFolder}
              label={cat.name}
              count={noteStats?.category?.[cat.id] ?? 0}
            />
          ))}
        </SidebarSection>

        <SidebarSection>
          <SidebarItem
            isActive={isActive('trash')}
            onClick={() => setNoteFilter({ type: 'trash' })}
            icon={FiTrash2}
            label="Trash"
            count={noteStats?.trash ?? 0}
          />
        </SidebarSection>

        <SidebarSection title="Status">
          <SidebarItem
            isActive={isActive('status', 'active')}
            onClick={() => setNoteFilter({ type: 'status', status: 'active' })}
            icon={FiPlay}
            label="Active"
            count={noteStats?.status?.active ?? 0}
            className="play"
          />
          <SidebarItem
            isActive={isActive('status', 'on_hold')}
            onClick={() => setNoteFilter({ type: 'status', status: 'on_hold' })}
            icon={FiPause}
            label="On Hold"
            count={noteStats?.status?.on_hold ?? 0}
            className="pause"
          />
          <SidebarItem
            isActive={isActive('status', 'completed')}
            onClick={() => setNoteFilter({ type: 'status', status: 'completed' })}
            icon={FiCheckCircle}
            label="Completed"
            count={noteStats?.status?.completed ?? 0}
            className="check"
          />
          <SidebarItem
            isActive={isActive('status', 'dropped')}
            onClick={() => setNoteFilter({ type: 'status', status: 'dropped' })}
            icon={FiXCircle}
            label="Dropped"
            count={noteStats?.status?.dropped ?? 0}
            className="x"
          />
        </SidebarSection>

        {tagsList && tagsList.length > 0 && (
          <SidebarSection title="Tags">
            {tagsList.map(tag => (
              <SidebarItem
                key={`tag-${tag.id || tag.name}`}
                isActive={isActive('tag', tag.name)}
                onClick={() => setNoteFilter({ type: 'tag', tag: tag.name })}
                label={tag.name}
                count={noteStats?.tags?.[tag.name]?.count ?? 0}
                style={{
                  backgroundColor: tag.color,
                  borderRadius: '50%',
                  width: 10,
                  height: 10,
                  display: 'inline-block',
                  marginRight: 8
                }}
              />
            ))}
          </SidebarSection>
        )}
      </div>
      <div className="sidebar-footer">
        <div className="user-info">
          <FiUser style={{ marginRight: 6 }} />
          User Profile
        </div>
        <button className="btn settings-btn" onClick={() => window.api.openSettings()}>
          <FiSettings /> Settings
        </button>
      </div>
    </div>
  );
}
