import '../css/Modal.css';

export default function Modal({ isOpen, onClose, onSubmit, title, defaultValue = "" }) {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const value = formData.get('modalInput');
    onSubmit(value);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            className="input"
            name="modalInput"
            defaultValue={defaultValue}
            autoFocus
            required
          />
          <div className="modal-buttons">
            <button type="submit" className="btn">Onayla</button>
            <button type="button" className="btn" onClick={onClose}>İptal</button>
          </div>
        </form>
      </div>
    </div>
  );
}
