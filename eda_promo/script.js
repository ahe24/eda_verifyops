/* ============================================================
   VerifyOps — Slide Navigation & Interaction Logic
   ============================================================ */

(function () {
  'use strict';

  // ---- DOM References ----
  const presentation = document.getElementById('presentation');
  const slides = document.querySelectorAll('.slide');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const navDots = document.getElementById('navDots');
  const navIndicator = document.getElementById('navIndicator');
  const slideNumber = document.getElementById('slideNumber');
  const totalSlides = slides.length;

  let currentSlide = 0;
  let isTransitioning = false;

  // ---- Initialize ----
  function init() {
    createDots();
    updateUI();
    bindEvents();
    triggerAnimations(0);
  }

  // ---- Create Navigation Dots ----
  function createDots() {
    for (let i = 0; i < totalSlides; i++) {
      const dot = document.createElement('button');
      dot.classList.add('nav-dot');
      dot.setAttribute('aria-label', `슬라이드 ${i + 1}`);
      dot.addEventListener('click', () => goToSlide(i));
      navDots.appendChild(dot);
    }
  }

  // ---- Navigate to Slide ----
  function goToSlide(index) {
    if (isTransitioning || index === currentSlide) return;
    if (index < 0 || index >= totalSlides) return;

    isTransitioning = true;
    const goingForward = index > currentSlide;

    // 1) Clean ALL transition classes from every slide first
    slides.forEach(s => s.classList.remove('active', 'prev', 'next'));

    // 2) Outgoing slide: add exit class (prev = exit left, next = exit right)
    slides[currentSlide].classList.add(goingForward ? 'prev' : 'next');

    // 3) Incoming slide: activate
    currentSlide = index;
    slides[currentSlide].scrollTop = 0;
    slides[currentSlide].classList.add('active');

    updateUI();
    triggerAnimations(currentSlide);

    setTimeout(() => {
      // Clean up all transition classes from non-active slides
      slides.forEach((s, i) => {
        if (i !== currentSlide) {
          s.classList.remove('prev', 'next', 'active');
        }
      });
      isTransitioning = false;
    }, 750);
  }

  // ---- Update UI State ----
  function updateUI() {
    // Dots
    const dots = navDots.querySelectorAll('.nav-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentSlide);
    });

    // Nav indicator
    navIndicator.textContent = `${currentSlide + 1} / ${totalSlides}`;

    // Slide number
    slideNumber.textContent = `${String(currentSlide + 1).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}`;

    // Button states
    btnPrev.disabled = currentSlide === 0;
    btnNext.disabled = currentSlide === totalSlides - 1;
  }

  // ---- Trigger Slide Animations ----
  function triggerAnimations(index) {
    const slide = slides[index];
    const animItems = slide.querySelectorAll('.animate-in');

    // Reset animations
    animItems.forEach(item => {
      item.style.animation = 'none';
      item.offsetHeight; // Force reflow
      item.style.animation = '';
    });
  }

  // ---- Event Bindings ----
  function bindEvents() {
    // Button clicks
    btnPrev.addEventListener('click', () => goToSlide(currentSlide - 1));
    btnNext.addEventListener('click', () => goToSlide(currentSlide + 1));

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          goToSlide(currentSlide + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          goToSlide(currentSlide - 1);
          break;
        case 'Home':
          e.preventDefault();
          goToSlide(0);
          break;
        case 'End':
          e.preventDefault();
          goToSlide(totalSlides - 1);
          break;
      }
    });

    // Mouse wheel navigation — Only for vertical scrolling inside a slide, NOT for changing slides
    presentation.addEventListener('wheel', (e) => {
      const activeSlide = slides[currentSlide];
      const hasOverflow = activeSlide.scrollHeight > activeSlide.clientHeight + 5;

      if (hasOverflow) {
        // Allow default vertical scrolling if there's content to scroll
        // Do not call e.preventDefault() to allow natural OS scroll behavior
      } else {
        // If no overflow, we still don't want to change slides via wheel
        e.preventDefault();
      }
    }, { passive: false });

    // Touch navigation — Disabled slide changing via swipe as per user request
    // We keep default touch scrolling behavior for overflow content
  }

  // ---- Boot ----
  document.addEventListener('DOMContentLoaded', init);
})();
