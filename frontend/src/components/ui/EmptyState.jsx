/**
 * EmptyState — the shared "nothing here yet" screen used by Cart,
 * Wishlist, Order History, and Search/Product listings. A soft circular
 * icon badge stands in for a bespoke illustration (no licensed/stock
 * illustration set is part of this project's dependencies — see the
 * copyright-safety note in ProductCard/BrandStrip for the same reasoning
 * applied to imagery) while still being far more considered than a bare
 * line of text: consistent sizing, optional CTA, and a touch of motion.
 */

import { Link } from "react-router-dom";

export default function EmptyState({ icon: Icon, title, message, actionLabel, actionHref, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <span className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-ink-50">
        <Icon className="h-9 w-9 text-ink-300" strokeWidth={1.5} />
      </span>
      <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
      {message && <p className="mt-1.5 max-w-sm text-sm text-ink-500">{message}</p>}

      {actionLabel && actionHref && (
        <Link to={actionHref} className="btn-dark mt-6">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button onClick={onAction} className="btn-dark mt-6">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
