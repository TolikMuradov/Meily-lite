import React from 'react';
import Modal from './Modal';
import ShortcutsList from './ShortcutsList';

export default function ShortcutsModal({ open, onClose }) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Kısayollar">
      <ShortcutsList />
    </Modal>
  );
}
