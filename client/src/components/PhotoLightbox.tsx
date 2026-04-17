// CELEBRATE 70 — Fullscreen photo lightbox for the memories gallery
//
// Plain-React overlay (not Radix Dialog) so the image can span
// the full viewport on mobile without fighting shadcn's max-w-lg.

import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export function PhotoLightbox({ photos, index, onClose, onIndexChange }: {
  photos: string[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}) {
  const total = photos.length;
  const isOpen = index !== null && index >= 0 && index < total;

  const next = useCallback(() => {
    if (index === null) return;
    onIndexChange((index + 1) % total);
  }, [index, total, onIndexChange]);

  const prev = useCallback(() => {
    if (index === null) return;
    onIndexChange((index - 1 + total) % total);
  }, [index, total, onIndexChange]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose, next, prev]);

  if (!isOpen || index === null) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${total}`}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'oklch(0.1 0.02 155 / 0.94)' }}
      onClick={onClose}>
      {/* Close */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close"
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: 'oklch(1 0 0 / 0.12)', color: 'oklch(0.97 0.02 85)' }}>
        <X size={20} />
      </button>

      {/* Counter */}
      <div
        className="absolute top-5 left-4 text-xs font-semibold tabular-nums"
        style={{ color: 'oklch(0.85 0.03 85)' }}>
        {index + 1} / {total}
      </div>

      {/* Prev */}
      {total > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); prev(); }}
          aria-label="Previous photo"
          className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: 'oklch(1 0 0 / 0.12)', color: 'oklch(0.97 0.02 85)' }}>
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Image */}
      <img
        src={photos[index]}
        alt={`Memory ${index + 1}`}
        onClick={(e) => e.stopPropagation()}
        className="max-w-[92vw] max-h-[88vh] object-contain rounded-lg shadow-2xl"
      />

      {/* Next */}
      {total > 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); next(); }}
          aria-label="Next photo"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: 'oklch(1 0 0 / 0.12)', color: 'oklch(0.97 0.02 85)' }}>
          <ChevronRight size={24} />
        </button>
      )}
    </div>,
    document.body,
  );
}
