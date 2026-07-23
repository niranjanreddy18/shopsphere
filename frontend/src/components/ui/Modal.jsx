/**
 * Modal — generic accessible dialog shell, used by QuickViewModal and any
 * future modal (confirmation dialogs, etc.) so every modal in the app
 * shares identical backdrop/close/keyboard behavior instead of each
 * feature re-implementing it slightly differently.
 *
 * Accessibility: `role="dialog"` + `aria-modal`, closes on Escape or a
 * backdrop click, and moves focus to the dialog on open. This is a
 * deliberately lightweight implementation — it does not implement a full
 * roving focus trap (Tab cycling only within the dialog) the way a
 * dedicated library (Radix, Headless UI) would; for this project's modal
 * usage (a single quick-view card, no nested interactive-heavy forms)
 * that's a reasonable scope line, called out explicitly rather than
 * silently shipped as if it were a complete implementation.
 */

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-3xl" }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    // Prevent background scroll while a modal is open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative z-10 w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-card-hover animate-scale-in focus:outline-none`}
      >
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-full p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
