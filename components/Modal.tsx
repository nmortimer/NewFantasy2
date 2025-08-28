import React, { ReactNode, useEffect } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export default function Modal({ isOpen, onClose, title, children }: Props) {
  useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (isOpen) document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative panel w-[95vw] max-w-3xl max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h3 className="font-semibold">{title || 'Modal'}</h3>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
