import React from 'react';

/**
 * Single image slot used by event, gallery and video cards.
 *
 * Pass `src` once a real photograph exists and it paints as a cover image with
 * the supplied `alt`. With no `src` the symbol placeholder fills the identical
 * box, so dropping real assets into the data arrays needs no markup change.
 *
 * The placeholder is decorative: it is hidden from assistive technology,
 * because it conveys nothing the card caption does not already say.
 */
export default function CardMedia({ src, alt = '', symbol = '🪔', className = '', style }) {
  return (
    <div className={`card-media ${className}`.trim()} style={style}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" decoding="async" />
      ) : (
        <div className="card-media-placeholder" aria-hidden="true">
          {symbol}
        </div>
      )}
    </div>
  );
}
