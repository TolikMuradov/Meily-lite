import React from 'react';
import "../../css/sidebar.css";

export default function SidebarItem({ isActive, onClick, onContextMenu, icon: Icon, label, count, className, style }) {
  return (
    <div
      className={`sidebar-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {style && (
        <span
          className="tag-color-dot"
          style={{
            ...style,
            marginRight: 8,
            borderRadius: '50%',
            width: 10,
            height: 10,
            display: 'inline-block'
          }}
        ></span>
      )}
      {Icon && <Icon className={className} style={{ marginRight: 6, flexShrink: 0 }} />}
      <span className="label-text">{label}</span>
      {count !== undefined && <span className="count">{count}</span>}
    </div>
  );
}