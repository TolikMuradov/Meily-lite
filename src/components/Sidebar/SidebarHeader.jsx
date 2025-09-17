import React from 'react';
import "../../css/sidebar.css";
export default function SidebarHeader({ isMac }) {
  return (
    <div className="sidebar-header">
        <div className="logo">Meily-lite</div>
        <div className="menu-btn">☰</div>
    </div>
  );
}