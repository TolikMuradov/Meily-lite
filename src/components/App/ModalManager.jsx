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
  setLinkHref,
  setIsLinkModalOpen,
  // NEW: allow passing a dedicated handler for link modal only (optional)
  onLinkSubmit,
}) {
  
  const handleMainSubmit = (payload) => {
    const fn = typeof onModalSubmit === 'function' ? onModalSubmit : null;
    if (!fn) {
      console.warn('[ModalManager] onModalSubmit is not a function:', onModalSubmit);
      return; // Do not crash
    }
    try { fn(payload); } catch (e) { console.error('onModalSubmit error', e); }
  };


  const handleLinkSubmit = (payload) => {
    const fn = typeof onLinkSubmit === 'function' ? onLinkSubmit
            : (typeof onModalSubmit === 'function' ? onModalSubmit : null);
    if (!fn) {
      console.warn('[ModalManager] link submit: no handler');
      return; // safe no-op
    }
    try { fn(payload); } catch (e) { console.error('link submit error', e); }
  };

  return (
    <>
      <Modal
        isOpen={isModalOpen}
        title={modalTitle}
        defaultValue={modalDefaultValue}
        onSubmit={handleMainSubmit}
        onClose={() => setIsModalOpen?.(false)}
      />

      {isLinkModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLinkModalOpen?.(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Link Ekle</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleLinkSubmit({ text: linkText ?? '', href: linkHref ?? '' });
              setIsLinkModalOpen?.(false);
            }}>
              <label>Metin</label>
              <input
                type="text"
                value={linkText ?? ''}
                onChange={(e) => setLinkText?.(e.target.value)}
              />

              <label>URL</label>
              <input
                type="text"
                value={linkHref ?? ''}
                onChange={(e) => setLinkHref?.(e.target.value)}
                placeholder="https://..."
              />

              <div className="modal-buttons">
                <button className="btn" type="submit">Ekle</button>
                <button className="btn" type="button" onClick={() => setIsLinkModalOpen?.(false)}>İptal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

