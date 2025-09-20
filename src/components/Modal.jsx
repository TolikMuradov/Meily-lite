import { useEffect, useRef } from 'react';
import '../css/Modal.css';

export default function Modal({ isOpen, onClose, onSubmit, title, defaultValue = "" }) {
  const dialogRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement;
      // Focus first input after paint
      setTimeout(() => {
        if (firstFocusableRef.current) {
          // Guard against accidental disabled state
          if (firstFocusableRef.current.hasAttribute('disabled')) {
            firstFocusableRef.current.removeAttribute('disabled');
          }
          firstFocusableRef.current.focus();
          firstFocusableRef.current.select?.();
        }
      }, 0);
    } else if (!isOpen && previouslyFocused.current) {
      // Return focus to the element that opened modal
      previouslyFocused.current.focus?.();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Tab') {
        // Simple focus trap
        const focusable = dialogRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || !focusable.length) return;
        const list = Array.from(focusable);
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const value = formData.get('modalInput');
    onSubmit(value);
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} onMouseDown={(e)=>e.stopPropagation()}>
      <div
        className="modal-content"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onMouseDown={(e)=>{
          // If clicking empty space inside modal content, refocus input
          if (e.target === e.currentTarget && firstFocusableRef.current) {
            firstFocusableRef.current.focus();
          }
        }}
      >
        <h3 id="modal-title">{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            className="input"
            name="modalInput"
            defaultValue={defaultValue}
            ref={firstFocusableRef}
            required
            autoComplete="off"
            autoFocus
          />
          <div className="modal-buttons">
            <button type="submit" className="btn">Confirm</button>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}


