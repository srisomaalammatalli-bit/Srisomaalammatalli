import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The rotating photographs behind the homepage hero.
 *
 * Slides come from the gallery: any photograph the committee marks "featured"
 * appears here, so the pictures on the front page can be changed from the
 * admin portal without a developer. Until the committee has featured anything,
 * it falls back to the temple's own WIDE photographs, so the page is never
 * blank.
 *
 * Only wide pictures belong in a hero this shape. The temple's portrait
 * photographs of Amma Vari are exported separately for the gallery below,
 * where they are shown upright and uncropped — a 2.3-wide box can only ever
 * show a band of a 0.45-aspect photograph, however it is fitted.
 *
 * An auto-advancing carousel is one of the easiest things to get wrong for
 * people who cannot easily read moving content, so the rules from the WAI-ARIA
 * carousel pattern and WCAG 2.2.2 are followed rather than approximated:
 *
 *   - a real pause/play button, first in the tab order inside the carousel,
 *     whose label says what it will do next
 *   - rotation stops while the pointer is over the controls, and stops for
 *     good on a KEYBOARD focus, which does not restart on its own
 *   - hovering the hero itself does NOT pause: the hero is full-bleed, so a
 *     pointer resting anywhere on the page froze the carousel permanently.
 *     Likewise, onFocus bubbles from the dots, so without the
 *     :focus-visible test a single mouse click latched rotation off for the
 *     rest of the visit — which is exactly what it did until this was fixed.
 *   - six seconds a slide, above the five-second floor the guidance gives
 *   - prefers-reduced-motion disables both the movement and the auto-advance
 *     from the very first render, not after one transition has already run
 *   - aria-live is "off" while rotating and "polite" once stopped, so a screen
 *     reader is not interrupted every few seconds
 *
 * The photographs are decorative here — the headline over them carries the
 * meaning — so the carousel is labelled as a whole rather than announcing five
 * image descriptions, which would add noise rather than sense.
 */

/** Six seconds: comfortably above the five-second minimum in the guidance. */
const ROTATE_MS = 6000;

/**
 * The temple's own photographs, used until the committee features gallery
 * images. `position` keeps the subject in frame as the hero gets shorter on a
 * phone: the portrait shots would otherwise crop to an uninformative middle.
 */
const FALLBACK_SLIDES = [
  {
    id: 'local-night',
    url: '/assets/images/temple/temple-night-illumination.jpg',
    position: '50% 42%'
  },
  {
    id: 'local-procession',
    url: '/assets/images/festivals/bonalu-procession.jpg',
    position: '50% 45%'
  }
];

/**
 * The temple's portrait photographs of Amma Vari. They are deliberately NOT
 * hero slides: at aspects of 0.45 to 0.60 a 2.3-wide hero can only show a
 * band of them. They belong in the gallery below, upright and uncropped.
 */
export const DEITY_PHOTOGRAPHS = [
  {
    id: 'deity-alankaram',
    url: '/assets/images/deity/somalamma-talli-alankaram.jpg',
    alt: 'Sri Somalamma Talli in alankaram, garlanded with marigold'
  },
  {
    id: 'deity-sanctum',
    url: '/assets/images/deity/somalamma-talli-sanctum.jpg',
    alt: 'Sri Somalamma Talli in the sanctum'
  },
  {
    id: 'deity-closeup',
    url: '/assets/images/deity/somalamma-talli-closeup.jpg',
    alt: 'Sri Somalamma Talli, close view of the deity'
  }
];

/** True when the visitor has asked their system for less animation. */
function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * The slides and their controls are separate elements because they belong in
 * different places: the pictures fill the hero behind the scrim, while the
 * controls have to sit in the flow of .hero-content, after the buttons. An
 * absolutely positioned control strip has nowhere safe to go — measured, the
 * bottom edge collided with the stacked buttons on a phone and the right edge
 * collided with the full-width headline below 768px.
 *
 * They share state through this hook, which the page holds and passes to both.
 */
export function useHeroCarousel(slides) {
  const items = Array.isArray(slides) && slides.length ? slides : FALLBACK_SLIDES;

  // Read the motion preference during the first render so a visitor who asked
  // for less animation never sees even one transition.
  const [reduceMotion, setReduceMotion] = useState(prefersReducedMotion);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [hovered, setHovered] = useState(false);

  // Focus is deliberately separate from hover: hover resumes when the pointer
  // leaves, but keyboard focus must not restart rotation by itself.
  const [focusStopped, setFocusStopped] = useState(false);

  const timer = useRef(null);

  // The preference can change while the page is open.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => {
      setReduceMotion(e.matches);
      if (e.matches) setPlaying(false);
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const rotating = playing && !hovered && !focusStopped && !reduceMotion && items.length > 1;

  useEffect(() => {
    if (!rotating) return undefined;
    timer.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer.current);
  }, [rotating, items.length]);

  // If the committee removes photographs while someone is looking at a later
  // slide, fall back to the first rather than showing nothing.
  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [index, items.length]);

  const goTo = useCallback(
    (i) => setIndex(((i % items.length) + items.length) % items.length),
    [items.length]
  );

  const controls =
    items.length > 1 ? (
      <div
        className="hero-carousel-controls"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* First in the tab order inside the carousel, per the ARIA pattern,
            and its label says what pressing it will do. */}
        <button
          type="button"
          className="hero-carousel-toggle"
          aria-label={
            rotating ? 'Stop the photographs changing' : 'Start the photographs changing'
          }
          onClick={() => {
            setFocusStopped(false);
            setPlaying((p) => !p);
          }}
        >
          <span aria-hidden="true">{rotating ? '❚❚' : '▶'}</span>
        </button>

        <div className="hero-carousel-dots">
          {items.map((slide, i) => (
            <button
              key={slide.id || slide.url}
              type="button"
              className={`hero-dot ${i === index ? 'is-active' : ''}`}
              aria-label={`Show photograph ${i + 1} of ${items.length}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => {
                // Jumping to a picture is a request to see it, not a request
                // to stop; rotation continues from there.
                goTo(i);
              }}
            />
          ))}
        </div>
      </div>
    ) : null;

  const stage = (
    <div
      className="hero-carousel"
      role="group"
      aria-roledescription="carousel"
      aria-label="Photographs of the temple"

      onFocus={(e) => {
        // Only a keyboard focus stops rotation for good. onFocus bubbles, so
        // without :focus-visible a mouse click on a dot latched this on and
        // the carousel never started again.
        if (e.target.matches?.(':focus-visible')) setFocusStopped(true);
      }}
    >
      {/* aria-live is off while the slides move on their own, so a screen
          reader is not interrupted every six seconds; it becomes polite once
          rotation has stopped and a change means the visitor asked for it. */}
      <div
        className="hero-carousel-track"
        aria-live={rotating ? 'off' : 'polite'}
        aria-atomic="false"
      >
        {items.map((slide, i) => (
          <div
            key={slide.id || slide.url}
            className={`hero-slide ${i === index ? 'is-active' : ''}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${items.length}`}
            aria-hidden={i === index ? undefined : 'true'}
            style={{
              backgroundImage: `url("${slide.url}")`,
              backgroundPosition: slide.position || '50% 45%'
            }}
          />
        ))}
      </div>

    </div>
  );

  return { stage, controls };
}

/** The pictures. Render inside .hero-section, before the scrim. */
export default function HeroCarousel({ carousel }) {
  return carousel.stage;
}

/** The pause button and dots. Render inside .hero-content, after the buttons. */
export function HeroCarouselControls({ carousel }) {
  return carousel.controls;
}
