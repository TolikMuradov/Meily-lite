import React from 'react';
import "../../css/sidebar.css";

export default function SidebarHeader({ isMac }) {
  return (
    <div className="sidebar-header">
      {isMac ? (
        <div className="mac-window-controls inline" aria-label="window controls">
          <button className='mac-btn close' title='Close' onClick={() => window.api && window.api.close()} />
          <button className='mac-btn minimize' title='Minimize' onClick={() => window.api && window.api.minimize()} />
          <button className='mac-btn maximize' title='Maximize' onClick={() => window.api && window.api.maximize()} />
        </div>
      ) : (
        <div className="logo">Meily-lite</div>
      )}
      <div className="menu-btn">☰</div>
    </div>
  );
}