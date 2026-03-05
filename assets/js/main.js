/* main.js (merged) */


/* ---- header.js ---- */
// Header JS (language switch EN/LV via separate pages: / <-> /lv/)
(() => {
  const btns = [
    document.querySelector(".header__lang"),
    document.querySelector(".mnav__lang"),
  ].filter(Boolean);

  if (!btns.length) return;

  const path = (location.pathname || "").toLowerCase();
  const isLV = path.includes("/lv/") || path.endsWith("/lv") || path.endsWith("/lv/index.html");

  const setLabel = () => {
    const label = isLV ? "LV" : "EN";
    btns.forEach((b) => {
      // supports both <button><span>..</span> and <button>..</button>
      const span = b.querySelector("span");
      if (span) span.textContent = label;
      else b.textContent = label;
    });
  };

  setLabel();

  const target = isLV ? "../" : "lv/";

  btns.forEach((b) => {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      // keep same folder, just switch file
      location.href = target;
    });
  });
})();


/* ---- hero.js ---- */
// Hero: timer, animations, join button pulse, button shimmer
(() => {
  const init = async () => {
    // ---------------------------
    // Config
    // ---------------------------
    const JOIN_PULSE_MS = 2000; // <-- change this value to control "Join us" pulse interval
    const DEFAULT_COUNTDOWN_HOURS = 36; // if no data-end specified

    // ---------------------------
    // Ensure Encode Sans Expanded applies to timer digits (fix flash / wrong font)
    // ---------------------------
    const ensureTimerFont = async () => {
      const timer = document.querySelector(".timer");
      if (!timer) return;

      try {
        if (document.fonts && document.fonts.load) {
          // Force-load exact weights used by the timer
          const load600 = document.fonts.load('600 128px "Encode Sans Expanded"');
          const load400 = document.fonts.load('400 96px "Encode Sans Expanded"');

          // Don't hang forever
          await Promise.race([
            Promise.allSettled([load600, load400]),
            new Promise((r) => setTimeout(r, 2500))
          ]);
        }
      } catch (_) {}

      // Apply inline font-family (wins over any CSS overrides)
      const ff = '"Encode Sans Expanded", system-ui, -apple-system, Segoe UI, Arial, sans-serif';
      timer.querySelectorAll(".timer__num, .timer__sep, .timer__label").forEach((el) => {
        el.style.fontFamily = ff;
      });
    };

    // ---------------------------
    // Join button pulse (stops on hover)
    // ---------------------------
    const join = document.getElementById("joinBtn");
    if (join && join.dataset.pulseInit !== "1") {
      join.dataset.pulseInit = "1";

      setInterval(() => {
        // don't pulse when hovered
        if (join.matches(":hover")) return;

        join.classList.remove("is-pulse");
        void join.offsetWidth; // force reflow
        join.classList.add("is-pulse");
      }, JOIN_PULSE_MS);
    }

    // ---------------------------
    // Timer (stable, no drift, no jitter)
    // ---------------------------
    const timer = document.querySelector(".timer");
    if (timer) {
      // Make sure timer uses the right font BEFORE first visible updates
      await ensureTimerFont();

      const pad2 = (n) => String(n).padStart(2, "0");

      let endISO = timer.getAttribute("data-end") || "";
      let endAt = null;

      // Persist countdown between refreshes when no fixed end date is provided
      // (So the timer doesn't "reset" on reload)
      const STORAGE_KEY = "fitura_hero_timer_endAt";

      if (!endISO) {
        const saved = Number(localStorage.getItem(STORAGE_KEY) || "");
        if (Number.isFinite(saved) && saved > Date.now()) {
          endAt = saved;
        } else {
          endAt = Date.now() + DEFAULT_COUNTDOWN_HOURS * 60 * 60 * 1000;
          try { localStorage.setItem(STORAGE_KEY, String(endAt)); } catch (_) {}
        }
      } else {
        const parsed = Date.parse(endISO);
        endAt = Number.isFinite(parsed)
          ? parsed
          : (Date.now() + DEFAULT_COUNTDOWN_HOURS * 60 * 60 * 1000);
      }

      const elD = timer.querySelector('[data-t="d"]');
      const elH = timer.querySelector('[data-t="h"]');
      const elM = timer.querySelector('[data-t="m"]');
      const elS = timer.querySelector('[data-t="s"]');

      let tId = null;

      const render = () => {
        const now = Date.now();
        const diff = Math.max(0, endAt - now);
        const totalSec = Math.floor(diff / 1000);

        const d = Math.floor(totalSec / (24 * 3600));
        const h = Math.floor((totalSec % (24 * 3600)) / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;

        if (elD) elD.textContent = pad2(d);
        if (elH) elH.textContent = pad2(h);
        if (elM) elM.textContent = pad2(m);
        if (elS) elS.textContent = pad2(s);

        if (totalSec <= 0) {
          timer.classList.add("is-done");
          try {
            const endISO = timer.getAttribute("data-end") || "";
            if (!endISO) localStorage.removeItem("fitura_hero_timer_endAt");
          } catch (_) {}
          if (tId) clearTimeout(tId);
          return;
        }

        // align next update to the next full second to avoid drift
        const msToNext = 1000 - (now % 1000) + 2;
        tId = setTimeout(loop, msToNext);
      };

      const loop = () => {
        try {
          render();
        } catch (e) {
          console.error("Timer error:", e);
          tId = setTimeout(loop, 1000);
        }
      };

      loop();

      // When tab becomes visible again — force render (fix "stops" feeling)
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) loop();
      });

      // Safety: if anything reflows/overrides font later, re-apply once after a short delay
      setTimeout(() => { ensureTimerFont(); }, 300);
    }

    // ---------------------------
    // Entry animations (stagger)
    // ---------------------------
    const animated = [...document.querySelectorAll("[data-animate]")];
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!prefersReduced && animated.length) {
      animated.forEach((el, i) => {
        el.style.setProperty("--delay", `${120 * i}ms`);
        el.classList.add("will-animate");
      });

      requestAnimationFrame(() => {
        animated.forEach((el) => el.classList.add("is-in"));
      });
    } else {
      animated.forEach((el) => el.classList.add("is-in"));
    }

    // ---------------------------
    // Button shimmer that follows the cursor
    // ---------------------------
    const shimmerBtn = document.getElementById("buyNowBtn");
    if (shimmerBtn) {
      const setPos = (e) => {
        const r = shimmerBtn.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        shimmerBtn.style.setProperty("--mx", `${x}%`);
        shimmerBtn.style.setProperty("--my", `${y}%`);
      };

      shimmerBtn.addEventListener("mousemove", setPos);
      shimmerBtn.addEventListener("mouseenter", setPos);
    }
  };

  // Static build: init immediately
  init();
})();


/* ---- plan.js ---- */
// plan.js
// Пока интерактива не требуется.
// Здесь можно будет добавить обработчики клика по тарифам или анимации.


/* ---- gallery.js ---- */
// Gallery slider (infinite loop)

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function getPerView() {
  // Desktop shows 2 cards, smaller screens show 1
  return window.matchMedia('(min-width: 1200px)').matches ? 2 : 1;
}

function buildSlider(root) {
  const track = root.querySelector('.gallery__track');
  const viewport = root.querySelector('.gallery__viewport');
  const btnPrev = root.querySelector('.gallery__arrow--prev');
  const btnNext = root.querySelector('.gallery__arrow--next');
  const hint = root.querySelector('[data-gallery-hint]');

  if (!track || !viewport || !btnPrev || !btnNext) return;

  // Swipe hint (tablet/mobile): hide after first interaction
  let hintTimer = null;
  const hideHint = () => {
    if (!hint) return;
    hint.classList.add('is-hidden');
    if (hintTimer) {
      clearTimeout(hintTimer);
      hintTimer = null;
    }
  };

  if (hint) {
    const isTouchLike = window.matchMedia && (window.matchMedia('(hover: none)').matches || window.matchMedia('(pointer: coarse)').matches);
    const isTabletOrLess = window.matchMedia && window.matchMedia('(max-width: 1024px)').matches;
    if (isTouchLike || isTabletOrLess) {
      // Auto-hide after a few seconds so it doesn't distract
      hintTimer = setTimeout(hideHint, 5200);
    } else {
      hint.classList.add('is-hidden');
    }
  }

  let originals = Array.from(track.children).filter(el => !el.dataset.clone);
  let perView = getPerView();
  let index = perView; // start at first real slide (after prepended clones)
  let isAnimating = false;

  const cleanupClones = () => {
    Array.from(track.querySelectorAll('[data-clone="1"]')).forEach(n => n.remove());
  };

  const makeClone = (node) => {
    const c = node.cloneNode(true);
    c.dataset.clone = '1';
    c.querySelectorAll('img').forEach(img => {
      // prevent duplicate downloads from affecting layout; keep lazy
      img.loading = 'lazy';
    });
    return c;
  };

  const rebuild = () => {
    cleanupClones();
    originals = Array.from(track.children).filter(el => !el.dataset.clone);
    perView = getPerView();

    // If not enough slides, just disable loop
    if (originals.length <= perView) {
      btnPrev.disabled = true;
      btnNext.disabled = true;
      track.style.transition = 'none';
      track.style.transform = 'translate3d(0,0,0)';
      return;
    }

    btnPrev.disabled = false;
    btnNext.disabled = false;

    const head = originals.slice(0, perView).map(makeClone);
    const tail = originals.slice(-perView).map(makeClone);

    // prepend tail clones in order
    tail.forEach(c => track.insertBefore(c, track.firstChild));
    // append head clones
    head.forEach(c => track.appendChild(c));

    index = perView;
    snapTo(index);
  };

  const getStep = () => {
    const first = track.children[index];
    const fallback = track.querySelector('.gallery__slide');
    const el = first || fallback;
    if (!el) return 0;

    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '0') || 0;
    return el.getBoundingClientRect().width + gap;
  };

  const snapTo = (i) => {
    const step = getStep();
    track.style.transition = 'none';
    track.style.transform = `translate3d(${-i * step}px, 0, 0)`;
    // force reflow to apply transition removal
    void track.offsetHeight;
  };

  const animateTo = (i) => {
    const step = getStep();
    track.style.transition = 'transform 520ms cubic-bezier(.22,.75,.18,1)';
    track.style.transform = `translate3d(${-i * step}px, 0, 0)`;
  };

  const go = (dir) => {
    if (isAnimating) return;
    if (originals.length <= perView) return;

    isAnimating = true;
    index += dir;
    animateTo(index);
  };

  const onEnd = () => {
    if (originals.length <= perView) {
      isAnimating = false;
      return;
    }

    const total = originals.length;

    // right boundary: past last real slide
    if (index >= total + perView) {
      index = perView;
      snapTo(index);
    }

    // left boundary: before first real slide
    if (index < perView) {
      index = total + perView - 1;
      snapTo(index);
    }

    isAnimating = false;
  };

  btnPrev.addEventListener('click', () => go(-1));
  btnNext.addEventListener('click', () => go(1));
  track.addEventListener('transitionend', onEnd);

  // Basic drag/swipe (optional but nice)
  let startX = 0;
  let isDown = false;
  let moved = 0;

  const onDown = (e) => {
    if (originals.length <= perView) return;
    hideHint();
    isDown = true;
    moved = 0;
    startX = (e.touches ? e.touches[0].clientX : e.clientX);
    track.style.transition = 'none';
  };

  const onMove = (e) => {
    if (!isDown) return;
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    const dx = x - startX;
    moved = dx;
    const step = getStep();
    track.style.transform = `translate3d(${-(index * step) + dx}px,0,0)`;
  };

  const onUp = () => {
    if (!isDown) return;
    isDown = false;

    const step = getStep();
    const threshold = clamp(step * 0.18, 40, 120);

    if (Math.abs(moved) > threshold) {
      index += (moved > 0 ? -1 : 1);
    }

    animateTo(index);
  };

  // IMPORTANT:
  // Desktop should be controlled only via arrows.
  // Keep swipe/drag only for touch-like devices (mobile/tablet).
  const allowTouchSwipe = window.matchMedia && (
    window.matchMedia('(hover: none)').matches ||
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(max-width: 1024px)').matches
  );

  if (allowTouchSwipe) {
    viewport.addEventListener('touchstart', onDown, { passive: true });
    // touchmove must be non-passive so we can prevent page scrolling from
    // stealing horizontal swipes; otherwise it can feel like swipe is broken.
    viewport.addEventListener('touchmove', (e) => {
      if (isDown) e.preventDefault();
      onMove(e);
    }, { passive: false });
    viewport.addEventListener('touchend', onUp);
  }

  // Rebuild on resize (breakpoint change)
  let lastPerView = perView;
  const onResize = () => {
    const next = getPerView();
    if (next !== lastPerView) {
      lastPerView = next;
      rebuild();
    } else {
      // keep position aligned
      snapTo(index);
    }
  };

  window.addEventListener('resize', onResize);

  // Build initial
  rebuild();
}

(() => {
  document.querySelectorAll('[data-gallery]').forEach(buildSlider);
})();


/* ---- contact.js ---- */
// Contact section
// (No interactive logic required for the static layout.)


/* ---- footer.js ---- */
// footer.js
// Сейчас логики нет. Оставлен файл под будущие интерактивы (например, active link).


/* ---- smooth anchors + reveal sections ---- */
(() => {
  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const getHeaderOffset = () => {
    // Header is absolute over hero; we use its inner height as offset for anchor scrolling
    const headerInner = document.querySelector(".header__inner");
    if (!headerInner) return 0;
    const h = headerInner.getBoundingClientRect().height || 0;
    return Math.round(h + 12); // small breathing space
  };

  const initSmoothAnchors = () => {
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;

      const hash = a.getAttribute("href");
      if (!hash || hash === "#") return;

      // #top is supported
      if (hash === "#top") {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
        history.pushState(null, "", "#top");
        return;
      }

      const target = document.querySelector(hash);
      if (!target) return;

      e.preventDefault();

      const offset = getHeaderOffset();
      const y = target.getBoundingClientRect().top + window.pageYOffset - offset;

      window.scrollTo({ top: Math.max(0, y), behavior: prefersReduced ? "auto" : "smooth" });
      history.pushState(null, "", hash);
    });
  };

  const initReveal = () => {
    // Only sections below hero to avoid "flash" on first paint
    const items = document.querySelectorAll("section.plan, section.gallery, section.contact, footer.footer");
    if (!items.length) return;

    items.forEach((el) => el.classList.add("reveal-section"));

    if (prefersReduced || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );

    items.forEach((el) => io.observe(el));
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initSmoothAnchors();
      initReveal();
    });
  } else {
    initSmoothAnchors();
    initReveal();
  }
})();



/* ---- preloader.js ---- */
// Premium preloader: show until full load, then fade out safely.
(() => {
  window.addEventListener("load", () => {
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-loaded");

    const preloader = document.querySelector(".preloader");
    if (preloader) {
      // Remove after fade-out to avoid blocking clicks.
      setTimeout(() => preloader.remove(), 900);
    }
  });
})();

/* ---- cookie-consent ---- */
(() => {
  const KEY = "fitnes_cookie_ok";
  const el = document.getElementById("cookieConsent");
  const btn = document.getElementById("cookieOk");
  if (!el || !btn) return;

  const show = () => el.classList.add("is-visible");
  const hide = () => {
    el.classList.add("is-hiding");
    el.classList.remove("is-visible");
    // allow transition to finish then remove from flow for accessibility
    setTimeout(() => {
      el.style.display = "none";
    }, 480);
  };

  // Show only if not accepted
  if (localStorage.getItem(KEY) !== "1") {
    // wait until full load + preloader fade to keep it premium
    window.addEventListener("load", () => {
      setTimeout(show, 700);
    });
  } else {
    el.style.display = "none";
  }

  btn.addEventListener("click", () => {
    try { localStorage.setItem(KEY, "1"); } catch(e) {}
    hide();
  });
})();


/* ---- mobile-nav.js ---- */
(() => {
  const burger = document.querySelector('.header__burger');
  const mnav = document.querySelector('.mnav');
  const closeBtn = document.querySelector('.mnav__close');
  if (!burger || !mnav || !closeBtn) return;

  const open = () => {
    document.body.classList.add('menu-open');
    burger.setAttribute('aria-expanded', 'true');
    mnav.setAttribute('aria-hidden', 'false');
  };
  const close = () => {
    document.body.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false');
    mnav.setAttribute('aria-hidden', 'true');
  };

  burger.addEventListener('click', open);
  closeBtn.addEventListener('click', close);

  // Close when clicking a link
  mnav.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.closest && t.closest('a')) close();
  });

  // Close on ESC
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
})();

/* ---- plan-accordion.mobile.js ---- */
(() => {
  const mq = window.matchMedia('(max-width: 520px)');
  const cols = Array.from(document.querySelectorAll('.plan-col'));
  if (!cols.length) return;

  const setup = () => {
    const isMobile = mq.matches;

    cols.forEach((col) => {
      const btn = col.querySelector('.plan-acc');
      const list = col.querySelector('.plan-list');
      if (!btn || !list) return;

      // Ensure a stable ID for aria-controls
      if (!list.id) list.id = 'plan-list-' + Math.random().toString(16).slice(2);
      btn.setAttribute('aria-controls', list.id);

      // Mobile: collapse by default
      if (isMobile) {
        col.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        list.style.maxHeight = '0px';
      } else {
        // Non-mobile: always expanded, no accordion
        col.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        list.style.maxHeight = '';
      }
    });
  };

  const toggle = (col) => {
    const btn = col.querySelector('.plan-acc');
    const list = col.querySelector('.plan-list');
    if (!btn || !list) return;

    const willOpen = !col.classList.contains('is-open');
    col.classList.toggle('is-open', willOpen);
    btn.setAttribute('aria-expanded', String(willOpen));

    if (willOpen) {
      // expand
      list.style.maxHeight = list.scrollHeight + 'px';
    } else {
      // collapse
      list.style.maxHeight = '0px';
    }
  };

  // Click handlers (only meaningful on mobile)
  cols.forEach((col) => {
    const btn = col.querySelector('.plan-acc');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (!mq.matches) return;
      toggle(col);
    });
  });

  // Recalc on resize/orientation
  mq.addEventListener ? mq.addEventListener('change', setup) : window.addEventListener('resize', setup);
  window.addEventListener('load', () => {
    setup();
    // If user expands, the list height may change on font load; keep in sync.
    cols.forEach((col) => {
      const list = col.querySelector('.plan-list');
      if (!list) return;
      const ro = new ResizeObserver(() => {
        if (mq.matches && col.classList.contains('is-open')) {
          list.style.maxHeight = list.scrollHeight + 'px';
        }
      });
      ro.observe(list);
    });
  });
})();
