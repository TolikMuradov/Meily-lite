import React from 'react';
import "../../css/sidebar.css";

export default function SidebarSection({ title, children }) {
  return (
    <div className="sidebar-section">
      {title && <h5>{title}</h5>}
      {children}
    </div>
  );
}