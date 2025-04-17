import '../css/TagsInput.css';

export default function TagContextMenu({ x, y, onClose, onSettings, onRemove }) {
  return (
    <div
      className="tag-context-menu"
      style={{ top: y, left: x }}
      onMouseLeave={onClose}
    >
      <div className="tag-context-item" onClick={onSettings}> Tag Settings</div>
      <div className="tag-context-item" onClick={onRemove}> Remove</div>
    </div>
  );
}
