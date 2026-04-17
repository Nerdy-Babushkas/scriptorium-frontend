/**
 * Scriptorium — landing.js v2
 * Handles: cursor tracking, navbar scroll, hero entry, scroll reveals,
 *          3D bento tilt, room parallax, AI tabs, smooth anchors, marquee pause
 * Zero dependencies · ~6kb · fully deferred
 */

(function () {
  'use strict';

  /* ── Utility: lerp ───────────────────────────────────────── */
  const lerp = (a, b, t) => a + (b - a) * t;

/* ─────────────────────────────────────────────────────────
     1. HIGH-PERFORMANCE CURSOR (Optimized)
  ───────────────────────────────────────────────────────── */
  const cursorEl = document.querySelector('.cursor');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (cursorEl && canHover) {
    let mx = -100, my = -100;
    
    // Use a faster lerp factor (0.3) for "snap" or 1.0 for instant 1:1 tracking
    const speed = 0.3; 
    let cx = -100, cy = -100;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
    }, { passive: true });

    // Handle visibility with simple opacity toggles
    document.addEventListener('mouseleave', () => cursorEl.style.opacity = '0');
    document.addEventListener('mouseenter', () => cursorEl.style.opacity = '1');

    // Use Event Delegation for performance - better than querySelectorAll on every element
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('a, button, [role="tab"], .room-card, .bento-card, .cc')) {
        cursorEl.classList.add('hov');
      }
    });
    
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('a, button, [role="tab"], .room-card, .bento-card, .cc')) {
        cursorEl.classList.remove('hov');
      }
    });

    (function animCursor() {
      // Linear interpolation for a slight organic feel without the "heavy" lag
      cx += (mx - cx) * speed;
      cy += (my - cy) * speed;

      // translate3d uses the GPU (Hardware Acceleration) - significantly faster than top/left
      cursorEl.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      
      requestAnimationFrame(animCursor);
    })();
  }
/* ─────────────────────────────────────────────────────────
     2. NAVBAR SCROLL STATE 
  ───────────────────────────────────────────────────────── */
const nav = document.getElementById('nav');

if (nav) {
  let isScrolled = false;

  const checkScroll = () => {
    const shouldScroll = window.scrollY > 40;

    // ONLY toggle the class if the state actually changed.
    // This prevents the browser from re-painting the nav 100 times a second.
    if (shouldScroll !== isScrolled) {
      isScrolled = shouldScroll;
      nav.classList.toggle('is-scrolled', isScrolled);
    }
  };

  // Passive: true is great, it tells the browser not to wait for the script 
  // before moving the page.
  window.addEventListener('scroll', checkScroll, { passive: true });
  
  // Run once on load
  checkScroll();
}
  /* ─────────────────────────────────────────────────────────
     3. MOBILE DRAWER
  ───────────────────────────────────────────────────────── */
  const burger = document.querySelector('.nav-burger');
  const drawer = document.querySelector('.nav-drawer');

  if (burger && drawer) {
    const close = () => {
      burger.classList.remove('open');
      drawer.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    burger.addEventListener('click', () => {
      const open = burger.classList.toggle('open');
      drawer.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open);
      drawer.setAttribute('aria-hidden', !open);
      document.body.style.overflow = open ? 'hidden' : '';
    });

    drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target)) close();
    });
  }

  /* ─────────────────────────────────────────────────────────
     4. HERO ENTRY ANIMATIONS
  ───────────────────────────────────────────────────────── */
  requestAnimationFrame(() => {
    document.querySelectorAll('[data-animate]').forEach((el) => {
      el.classList.add('animated');
    });
  });

  /* ─────────────────────────────────────────────────────────
     5. SCROLL REVEAL (IntersectionObserver)
  ───────────────────────────────────────────────────────── */
  const revealEls = document.querySelectorAll('[data-reveal]');

  if ('IntersectionObserver' in window && revealEls.length) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach((el) => obs.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('revealed'));
  }

  /* ─────────────────────────────────────────────────────────
     6. BENTO 3D TILT
  ───────────────────────────────────────────────────────── */
  document.querySelectorAll('.bento-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transform = `translateY(-5px) rotateX(${y * -7}deg) rotateY(${x * 7}deg) scale(1.008)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  /* ─────────────────────────────────────────────────────────
     7. COLLAGE CARDS — subtle hover tilt
  ───────────────────────────────────────────────────────── */
  document.querySelectorAll('.cc').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transform = `translateY(-5px) rotateX(${y * -5}deg) rotateY(${x * 5}deg) rotate(0.5deg)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });

  /* ─────────────────────────────────────────────────────────
     8. FLOATING OBJECTS — mouse parallax (desktop only)
  ───────────────────────────────────────────────────────── */
  if (canHover) {
    const floaters = document.querySelectorAll('.floater[data-float]');
    let fmx = 0, fmy = 0;

    document.addEventListener('mousemove', (e) => {
      fmx = (e.clientX / window.innerWidth  - 0.5) * 2;
      fmy = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    (function animFloat() {
      floaters.forEach((f) => {
        const depth = parseFloat(f.dataset.float) + 1; // 1–6
        const tx = fmx * depth * 6;
        const ty = fmy * depth * 5;
        // Blend with existing animation by adding translate on top
        const cur = f.style.transform || '';
        // Only apply if no existing transform in progress — use CSS var trick
        f.style.setProperty('--px', `${tx}px`);
        f.style.setProperty('--py', `${ty}px`);
      });
      requestAnimationFrame(animFloat);
    })();

    // Add CSS var to floater transform — done in CSS via calc
    const style = document.createElement('style');
    style.textContent = `.floater { transform: translate(var(--px,0), var(--py,0)); }`;
    // We DON'T inject this — it would override animation. Instead just let float animations run.
    // The mouse parallax adds a subtle nudge via direct style (blended below).
  }

  /* ─────────────────────────────────────────────────────────
     9. ROOM CARDS — emoji parallax + click to signup
  ───────────────────────────────────────────────────────── */
  document.querySelectorAll('.room-card').forEach((card) => {
    const icon = card.querySelector('.room-icon-wrap');

    if (icon && canHover) {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width  - 0.5;
        const y = (e.clientY - r.top)  / r.height - 0.5;
        icon.style.transform = `translate(calc(-50% + ${x * 14}px), calc(-65% + ${y * 12}px)) scale(1.12)`;
      });
      card.addEventListener('mouseleave', () => { icon.style.transform = ''; });
    }

    card.addEventListener('click', (e) => {
      if (!e.target.closest('a')) window.location.href = '/signup';
    });
  });

  /* ─────────────────────────────────────────────────────────
     10. AI RECOMMENDATION TABS
  ───────────────────────────────────────────────────────── */
  const aiTabs   = document.querySelectorAll('.ai-tab');
  const aiPanels = document.querySelectorAll('[data-tab-panel]');

  if (aiTabs.length) {
    aiTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;

        aiTabs.forEach((t) => {
          t.classList.toggle('is-active', t === tab);
          t.setAttribute('aria-selected', t === tab);
        });

        aiPanels.forEach((panel) => {
          const match = panel.dataset.tabPanel === target;
          panel.classList.toggle('is-hidden', !match);

          if (match) {
            // Re-trigger staggered card entry animation
            panel.querySelectorAll('.ai-card').forEach((c, i) => {
              c.style.animation = 'none';
              void c.offsetWidth; // force reflow
              c.style.animation = `slide-up 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.09}s both`;
            });
          }
        });
      });
    });
  }

  /* ─────────────────────────────────────────────────────────
     11. SMOOTH ANCHOR SCROLLING
  ───────────────────────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = (nav ? nav.offsetHeight : 80) + 24;
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.scrollY - offset,
          behavior: 'smooth',
        });
      }
    });
  });

  /* ─────────────────────────────────────────────────────────
     12. MARQUEE — pause on hover
  ───────────────────────────────────────────────────────── */
  const marqueeTrack = document.querySelector('.marquee-track');
  const marqueeWrap  = marqueeTrack?.closest('.marquee-wrap');

  if (marqueeWrap && marqueeTrack) {
    marqueeWrap.addEventListener('mouseenter', () => {
      marqueeTrack.style.animationPlayState = 'paused';
    });
    marqueeWrap.addEventListener('mouseleave', () => {
      marqueeTrack.style.animationPlayState = 'running';
    });
  }

  /* ─────────────────────────────────────────────────────────
     13. DONUT PROGRESS — animate on scroll into view
  ───────────────────────────────────────────────────────── */
  const donutRing = document.querySelector('.donut-ring');
  if (donutRing && 'IntersectionObserver' in window) {
    const donutObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          donutRing.style.strokeDashoffset = '60';
          donutObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    donutObs.observe(donutRing);
  }

})();
