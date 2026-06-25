import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  dismissible?: boolean;
}

export default function Modal({ open, onClose, children, dismissible = true }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 px-4 pb-6 backdrop-blur-sm animate-pop-in sm:items-center"
      onClick={() => dismissible && onClose?.()}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-surface-line bg-surface-raised p-6 shadow-card animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
