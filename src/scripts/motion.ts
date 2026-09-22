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
 *   data-reveal              fade and rise in when scrolled into view.
 *                            On an h1, h2 or h3 it becomes the masked
 *                            line reveal instead: each line slides up
 *                            from behind an invisible edge.
 *   data-reveal="left"       slide in from the left instead
 *   data-reveal="right"      from the right
 *   data-reveal="scale"      scale up from 96%
 *   data-reveal-delay="0.2"  hold for 0.2s first
 *   data-hero / data-hero-title / data-hero-item / data-hero-content
 *                            the home page's opening screen: title
 *                            assembles on load, the rest follows, and the
 *                            whole block recedes as you scroll away
 *
 * ── Restraint is the rule ──────────────────────────────────────────────
 * Put data-reveal on a section's HEADLINE and on its main content group,
 * and nowhere else. Not on eyebrows, lead paragraphs or "read more" links.
 * An earlier version animated everything (thirty separate reveals on the
 * About page) and the result read as a template: when every element
 * moves, nothing is emphasised. Supporting text should simply be there.
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
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

/*
 * SplitText used to be a paid Club GSAP plugin. Since GSAP 3.13 every
 * plugin ships free in the main package, which is why it can be imported
 * here with no account or licence key.
 */
gsap.registerPlugin(ScrollTrigger, SplitText);

const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

/*
 * Reveal the whole page immediately with no animation. Called when motion is
 * reduced, and used as the safety net if anything below throws: a site that
 * fails to animate is fine, a site stuck at opacity 0 is broken.
 */
function showEverything() {
  document
    .querySelectorAll<HTMLElement>(
      '[data-reveal], [data-hero-title], [data-hero-item]'
    )
    .forEach((el) => {
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
  /*
   * Distances are deliberately small. The first version moved things 42px
   * and slid side-entering blocks 52px, which reads as "animated website".
   * Apple-grade motion is felt more than seen: the content settles into
   * place rather than travelling to it.
   */
  const directions: Record<string, gsap.TweenVars> = {
    up: { y: 28, opacity: 0 },
    left: { x: -36, opacity: 0 },
    right: { x: 36, opacity: 0 },
    scale: { scale: 0.96, opacity: 0 },
    fade: { opacity: 0 },
  };

  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    const key = el.dataset.reveal || 'up';
    const delay = parseFloat(el.dataset.revealDelay ?? '0');

    // Headings get the masked line reveal instead of a block fade.
    if (/^H[1-3]$/.test(el.tagName) && key === 'up') {
      revealLines(el, delay, { start: 'top 88%' });
      return;
    }

    const from = directions[key] ?? directions.up;

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
        duration: 0.9,
        delay,
        ease: 'power3.out',
        /*
         * 45ms between siblings. It was 90ms, which on a grid of eight
         * cards meant the last one arrived most of a second after the
         * first: long enough to read as a queue rather than a group.
         */
        stagger: stagger ? 0.045 : 0,
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

/*
 * The masked line reveal: each line of a heading rises into view from
 * behind an invisible edge, one after another. It is the single most
 * recognisable move on apple.com, and it works because the text appears to
 * be uncovered rather than faded in.
 *
 * How it works: SplitText wraps every rendered line in its own element,
 * and `mask: 'lines'` wraps each of those in a second element with
 * overflow clipped. Pushing a line down 110% hides it below its own mask;
 * animating it back to 0 slides it up into view.
 *
 * Lines depend on the font and the width of the screen, so this has to run
 * after the web font has loaded (otherwise it splits using the fallback
 * font's line breaks and the result is wrong), and it has to re-split when
 * the window is resized. `autoSplit` handles the resize; the caller waits
 * for fonts.
 *
 * SplitText also sets aria-label on the heading and hides the fragments
 * from screen readers, so assistive tech still reads one sentence rather
 * than "Built. By. Students."
 */
function revealLines(
  el: HTMLElement,
  delay: number,
  opts: { start?: string; immediate?: boolean } = {}
) {
  // The heading itself is hidden by the pre-JS CSS; show it, and let the
  // masks do the hiding from here.
  gsap.set(el, { opacity: 1 });

  let done = false;

  SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    autoSplit: true,
    onSplit(self) {
      /*
       * A re-split after a resize. If the heading has already been
       * revealed, leave the fresh lines where they are rather than hiding
       * them again: re-animating on every window resize looks like a bug.
       */
      if (done) return;

      return gsap.from(self.lines, {
        yPercent: 110,
        duration: 1.05,
        ease: 'power4.out',
        stagger: 0.085,
        delay,
        onComplete: () => {
          done = true;
        },
        scrollTrigger: opts.immediate
          ? undefined
          : { trigger: el, start: opts.start ?? 'top 88%', once: true },
      });
    },
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   STAT COUNTERS
   ───────────────────────────────────────────────────────────────────────── */

function initCounters() {
  /*
   * WARNING: this selector is global, and the effect is destructive. Any
   * element anywhere carrying `data-count` gets its entire contents replaced
   * with a number, every frame.
   *
   * That is not hypothetical. The bubble field briefly used `data-count` to
   * pass its bubble quantity, and this loop quietly overwrote the canvas and
   * every fallback element inside it with the digit "22". The hero looked
   * empty and nothing errored.
   *
   * If you need to store a count on an element for some other purpose, give
   * the attribute a distinct name.
   */
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
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;

  const title = hero.querySelector<HTMLElement>('[data-hero-title]');
  const items = hero.querySelectorAll<HTMLElement>('[data-hero-item]');

  // The headline assembles first, line by line; everything under it
  // follows as one soft wave once the title is mostly in.
  if (title) revealLines(title, 0.1, { immediate: true });

  if (items.length) {
    gsap.fromTo(
      items,
      { opacity: 0, y: 18 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.07,
        delay: 0.45,
      }
    );
  }
}

/*
 * As the hero scrolls away, its content drifts up slightly and dims, tied
 * directly to scroll position. This is the effect on Apple product pages
 * where the opening screen seems to recede as the next section arrives,
 * rather than simply scrolling off like a page of text.
 *
 * `scrub` means there is no animation playing on its own: the scroll bar
 * IS the timeline. Scroll back up and it runs backwards.
 */
function initHeroScrub() {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  const content = hero?.querySelector<HTMLElement>('[data-hero-content]');
  if (!hero || !content) return;

  gsap.to(content, {
    yPercent: -10,
    opacity: 0.15,
    ease: 'none',
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      scrub: 0.5,
    },
  });
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

  // Tells the CSS failsafe that JavaScript arrived and is in charge of
  // revealing things. See "reveal-failsafe" in global.css.
  document.documentElement.classList.add('motion-ready');

  try {
    initSmoothScroll();
    initCounters();
    initParallax();
    initMagnetic();
    initHeroScrub();

    /*
     * Anything that splits text into lines waits for the web font. Split
     * before it loads and the lines are measured in the fallback font,
     * then the real font swaps in with different widths and every line
     * break is wrong. document.fonts.ready resolves once loading settles,
     * including when a font fails, so this can never hang.
     */
    document.fonts.ready.then(() => {
      try {
        initHeroIntro();
        initReveals();
        ScrollTrigger.refresh();
      } catch (err) {
        console.error('[motion] reveal setup failed, showing content:', err);
        showEverything();
      }
    });

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
