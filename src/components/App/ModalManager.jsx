import React from 'react';
import Modal from '../Modal';

export default function ModalManager({
  isModalOpen,
  modalTitle,
  modalDefaultValue,
  onModalSubmit,
  setIsModalOpen,
  isLinkModalOpen,
  linkText,
  setLinkText,
  linkHref,
  setLinkHref
}) {
  return (
    <>
      <Modal
        isOpen={isModalOpen}
        title={modalTitle}
        defaultValue={modalDefaultValue}
        onSubmit={onModalSubmit}
        onClose={() => setIsModalOpen(false)}
      />

      {isLinkModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Link Ekle</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              onModalSubmit({ text: linkText, href: linkHref });
              setIsLinkModalOpen(false);
            }}>
              <label>Metin</label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
              />

              <label>URL</label>
              <input
                type="text"
                value={linkHref}
                onChange={(e) => setLinkHref(e.target.value)}
                placeholder="https://..."
              />

              <div className="modal-buttons">
                <button className="btn" type="submit">Ekle</button>
                <button className="btn" onClick={() => setIsLinkModalOpen(false)}>İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}