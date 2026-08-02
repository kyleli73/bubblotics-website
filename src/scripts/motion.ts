/*
 * ═══════════════════════════════════════════════════════════════════════════
 *  MOTION — the whole animation system, in one file.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Two libraries do the work:
 *
 *   Lenis  intercepts the mouse wheel and animates the scroll position
 *          itself, so scrolling glides to a stop instead of snapping. This
 *          is the single biggest reason a site "feels" expensive.
 *
 *   GSAP + ScrollTrigger  runs animations tied to scroll position. GSAP is
 *          the tween engine; ScrollTrigger is the plugin that watches where
 *          an element sits in the viewport and fires the tween at the right
 *          moment.
 *
 * You add animation to a page purely with HTML attributes. No page ever
 * imports GSAP directly:
 *
 *   data-reveal              fade and rise in when scrolled into view
 *   data-reveal="left"       slide in from the left instead
 *   data-reveal="right"      from the right
 *   data-reveal="scale"      scale up from 92%
 *   data-reveal-delay="0.2"  hold for 0.2s first
 *   data-stagger             children animate one after another
 *   data-parallax="0.3"      drifts against the scroll; higher = more
 *   data-count="120"         counts from 0 to 120 when it comes into view
 *   data-count-suffix="+"    appended after the number
 *
 * ── Accessibility ──────────────────────────────────────────────────────
 * If the visitor's system asks to reduce motion, this file makes every
 * revealed element visible and then stops. No Lenis, no tweens, no counters
 * ticking. That is a correctness requirement, not a preference: this kind of
 * motion causes real nausea for some people.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

/*
 * Reveal the whole page immediately with no animation. Called when motion is
 * reduced, and used as the safety net if anything below throws: a site that
 * fails to animate is fine, a site stuck at opacity 0 is broken.
 */
function showEverything() {
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    el.style.opacity = '1';
    el.style.transform = 'none';
  });
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count ?? 0);
    el.textContent = target.toLocaleString() + (el.dataset.countSuffix ?? '');
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   SMOOTH SCROLL
   ───────────────────────────────────────────────────────────────────────── */

function initSmoothScroll(): Lenis | null {
  const lenis = new Lenis({
    // How long the glide takes to settle, in seconds. Above ~1.5 it starts
    // feeling like the page is ignoring you.
    duration: 1.05,

    // Ease-out exponential: fast at first, then a long soft landing.
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),

    // Touch devices already have excellent native inertia from the OS.
    // Overriding it makes a phone feel worse, never better.
    smoothWheel: true,
    syncTouch: false,

    wheelMultiplier: 1,
  });

  // ScrollTrigger reads window.scrollY to decide when to fire. Because Lenis
  // is the one moving the page, ScrollTrigger has to be told after every
  // Lenis frame that the position changed. Skip this and animations trigger
  // at the wrong scroll position, or not at all.
  lenis.on('scroll', ScrollTrigger.update);

  // Run Lenis from GSAP's ticker rather than its own requestAnimationFrame
  // loop, so both libraries advance on the same frame. Two independent loops
  // produce visible tearing between a parallax layer and the content it
  // moves against.
  gsap.ticker.add((time: number) => lenis.raf(time * 1000)); // s -> ms
  gsap.ticker.lagSmoothing(0);

  /*
   * ── In-page anchor links ────────────────────────────────────────────
   * Lenis owns the scroll position: every frame it writes its own target
   * back to the document. That means anything moving the page by another
   * route (window.scrollTo, scrollIntoView, or the browser's own jump to
   * a #hash) is silently undone on the very next frame.
   *
   * The skip link at the top of every page is exactly that: href="#main",
   * and it is the first thing a keyboard user tabs to. Left alone it would
   * appear to do nothing, which is worse than not having one at all.
   *
   * So same-page hash links are intercepted and handed to Lenis, which is
   * the only thing allowed to move the page.
   */
  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement)?.closest?.('a[href^="#"]');
    if (!link) return;

    const hash = link.getAttribute('href');
    if (!hash || hash === '#') return;

    const target = document.querySelector(hash);
    if (!target) return;

    e.preventDefault();

    // Offset by the sticky header, or the target lands underneath it.
    const headerH =
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--header-h')
      ) || 0;

    lenis.scrollTo(target as HTMLElement, { offset: -headerH - 16 });

    // Moving the page does not move keyboard focus. Without this, the next
    // Tab press continues from the top of the document rather than from
    // where the reader is now, which defeats the point of a skip link.
    const focusable = target as HTMLElement;
    if (!focusable.hasAttribute('tabindex')) {
      focusable.setAttribute('tabindex', '-1');
    }
    focusable.focus({ preventScroll: true });

    // Keep the URL honest so the link is still shareable and the back
    // button behaves.
    history.pushState(null, '', hash);
  });

  /*
   * Exposed for debugging and for any future code that needs to move the
   * page. Anything calling window.scrollTo directly will be overridden.
   */
  (window as unknown as { lenis: Lenis }).lenis = lenis;

  return lenis;
}

/* ─────────────────────────────────────────────────────────────────────────
   SCROLL REVEALS
   ───────────────────────────────────────────────────────────────────────── */

function initReveals() {
  const directions: Record<string, gsap.TweenVars> = {
    up: { y: 42, opacity: 0 },
    left: { x: -52, opacity: 0 },
    right: { x: 52, opacity: 0 },
    scale: { scale: 0.92, opacity: 0 },
    fade: { opacity: 0 },
  };

  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    const key = el.dataset.reveal || 'up';
    const from = directions[key] ?? directions.up;
    const delay = parseFloat(el.dataset.revealDelay ?? '0');

    // A container marked data-stagger animates its own direct children in
    // sequence rather than moving as one block. Used for card grids.
    const stagger = el.hasAttribute('data-stagger');
    const targets = stagger ? Array.from(el.children) : el;

    if (stagger) {
      // The container itself must be visible; only the children animate.
      gsap.set(el, { opacity: 1 });
    }

    gsap.fromTo(
      targets,
      from,
      {
        y: 0,
        x: 0,
        scale: 1,
        opacity: 1,
        duration: 0.95,
        delay,
        ease: 'power3.out',
        stagger: stagger ? 0.09 : 0,
        scrollTrigger: {
          trigger: el,
          // Fires when the element's top reaches 88% down the viewport,
          // i.e. just after it appears at the bottom of the screen.
          start: 'top 88%',
          // Play forward on entry; do not rewind when scrolling back up.
          // Content that re-hides on the way up is distracting.
          toggleActions: 'play none none none',
          once: true,
        },
      }
    );
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   STAT COUNTERS
   ───────────────────────────────────────────────────────────────────────── */

function initCounters() {
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count ?? 0);
    const suffix = el.dataset.countSuffix ?? '';

    // GSAP can only tween a number that lives on an object, so the count is
    // held here and written into the element on every frame.
    const state = { n: 0 };

    gsap.to(state, {
      n: target,
      duration: 1.9,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 90%',
        once: true,
      },
      onUpdate: () => {
        el.textContent = Math.round(state.n).toLocaleString() + suffix;
      },
      onComplete: () => {
        // Land exactly on the target. Rounding mid-tween can leave it one
        // off, and "11 awards" when you have 12 is a bad look.
        el.textContent = target.toLocaleString() + suffix;
      },
    });
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   PARALLAX
   ───────────────────────────────────────────────────────────────────────── */

function initParallax() {
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const strength = parseFloat(el.dataset.parallax ?? '0.25');

    gsap.to(el, {
      // Moves against the scroll by a fraction of the viewport height.
      // Keep it under about 0.4 or the element visibly detaches from the
      // content it belongs to.
      yPercent: -strength * 100,
      ease: 'none',
      scrollTrigger: {
        trigger: el.parentElement ?? el,
        start: 'top bottom',
        end: 'bottom top',
        // `scrub` ties progress directly to scroll position. The number is
        // a smoothing delay in seconds, which stops it feeling twitchy on
        // a trackpad.
        scrub: 0.6,
      },
    });
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   HERO INTRO

   The one animation that is not scroll-driven. It runs on load, so the
   first thing a visitor sees is the headline assembling itself.
   ───────────────────────────────────────────────────────────────────────── */

function initHeroIntro() {
  const hero = document.querySelector('[data-hero]');
  if (!hero) return;

  const items = hero.querySelectorAll('[data-hero-item]');
  if (!items.length) return;

  gsap.set(items, { opacity: 0, y: 30 });

  gsap
    .timeline({ defaults: { ease: 'power3.out' } })
    .to(items, {
      opacity: 1,
      y: 0,
      duration: 1.1,
      stagger: 0.11,
      // A short hold so the font has loaded and the text does not visibly
      // reflow halfway through the animation.
      delay: 0.15,
    })
    .from(
      hero.querySelectorAll('[data-hero-glow]'),
      { opacity: 0, scale: 0.7, duration: 1.6 },
      0
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   MAGNETIC BUTTONS

   Buttons marked data-magnetic lean a few pixels toward the cursor. Pointer
   only: it would do nothing useful on a touchscreen and costs battery.
   ───────────────────────────────────────────────────────────────────────── */

function initMagnetic() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const strength = parseFloat(el.dataset.magnetic ?? '0.25');

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      gsap.to(el, {
        x: dx * strength,
        y: dy * strength,
        duration: 0.5,
        ease: 'power3.out',
      });
    });

    el.addEventListener('pointerleave', () => {
      // elastic.out makes it spring back rather than slide, which is what
      // sells the effect.
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
    });
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   BOOT
   ───────────────────────────────────────────────────────────────────────── */

function init() {
  if (prefersReducedMotion) {
    showEverything();
    return;
  }

  try {
    initSmoothScroll();
    initHeroIntro();
    initReveals();
    initCounters();
    initParallax();
    initMagnetic();

    // Images that load after this point change the page height, which
    // leaves every ScrollTrigger firing at the wrong place. Recomputing on
    // full load fixes it.
    window.addEventListener('load', () => ScrollTrigger.refresh());
  } catch (err) {
    // Never let an animation bug hide the site's content.
    console.error('[motion] failed, showing content unanimated:', err);
    showEverything();
  }
}

init();
