/**
 * ProductImageGallery — main image + thumbnail strip, with an Amazon-style
 * hover-to-zoom lens on the main image (desktop/mouse only — the zoom
 * tracks cursor position via a CSS background-position pan, which has no
 * meaningful touch equivalent, so it's simply inert on touch devices
 * rather than faked with a tap gesture).
 */

import { useState } from "react";

export default function ProductImageGallery({ images = [] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const selected = images[selectedIndex];

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPosition({ x, y });
  };

  return (
    <div>
      <div
        className="relative mb-3 aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl bg-ink-50"
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        {selected ? (
          <img
            src={selected.image}
            alt={selected.alt_text || "Product image"}
            className="h-full w-full object-cover transition-transform duration-200 ease-out"
            style={
              isZoomed
                ? { transform: "scale(2)", transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` }
                : undefined
            }
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-ink-400">No image available</div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedIndex(index)}
              aria-label={`View image ${index + 1}`}
              aria-current={index === selectedIndex}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                index === selectedIndex ? "border-brand-600" : "border-transparent hover:border-ink-200"
              }`}
            >
              <img src={image.image} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
