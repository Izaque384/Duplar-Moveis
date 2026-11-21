// ============================================
// Header: fundo sólido ao rolar
// ============================================
const header = document.getElementById('header');
const onScroll = () => {
  if (window.scrollY > 40) header.classList.add('scrolled');
  else header.classList.remove('scrolled');
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ============================================
// Menu mobile
// ============================================
const navToggle = document.getElementById('navToggle');
const nav = document.getElementById('nav');
if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
    document.getElementById('mobileContact')?.toggleAttribute('hidden', isOpen);
  });
  const closeNav = () => {
    nav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Abrir menu');
    document.getElementById('mobileContact')?.removeAttribute('hidden');
  };
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeNav));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('open')) {
      closeNav();
      navToggle.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (nav.classList.contains('open') && !nav.contains(event.target) && !navToggle.contains(event.target)) closeNav();
  });
}

// ============================================
// Revelação ao rolar
// ============================================
const revealTargets = document.querySelectorAll(
  '.depoimento-intro, .depoimento-card, .ambiente-card, .atendimento-apresentacao, .atendimento-painel'
);
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if ('IntersectionObserver' in window && !prefersReducedMotion) {
  revealTargets.forEach(el => el.classList.add('reveal'));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  revealTargets.forEach(el => observer.observe(el));
}

// ============================================
// Diferenciais: carrossel editorial, 4 quadros reais do acervo.
// Auto apenas em desktop e em área visível; controle total ao visitante.
// ============================================
(() => {
  const carousel = document.getElementById('difCarousel');
  if (!carousel) return;

  const slides = Array.from(carousel.querySelectorAll('.dif-slide'));
  const selectors = Array.from(carousel.querySelectorAll('[data-dif-go]'));
  const prev = document.getElementById('difPrevious');
  const next = document.getElementById('difNext');
  const rotationToggle = document.getElementById('difRotationToggle');
  const rotationIcon = rotationToggle?.querySelector('.dif-rotation-icon');
  const rotationText = rotationToggle?.querySelector('.dif-rotation-text');
  const announcement = document.getElementById('difAnnouncement');
  const slideTrack = document.getElementById('difSlideTrack');
  const desktop = window.matchMedia('(min-width: 861px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const DURATION = 7800;

  if (slides.length !== 4 || selectors.length !== slides.length || !prev || !next || !rotationToggle || !slideTrack) return;

  let current = 0;
  let userPaused = false;
  let pointerInside = false;
  let focusInside = false;
  let inView = false;
  let timer = null;
  let touchStart = null;

  const preload = index => {
    const image = slides[(index + slides.length) % slides.length].querySelector('img');
    if (image) image.loading = 'eager';
  };

  const canAutoplay = () => desktop.matches && !reducedMotion.matches &&
    !userPaused && !pointerInside && !focusInside && inView && !document.hidden;

  const updateToggle = () => {
    const paused = userPaused || !desktop.matches || reducedMotion.matches;
    rotationToggle.setAttribute('aria-pressed', String(paused));
    rotationToggle.setAttribute('aria-label', userPaused ? 'Retomar apresentação automática' : 'Pausar apresentação automática');
    if (rotationText) rotationText.textContent = userPaused ? 'Retomar' : 'Pausar';
    if (rotationIcon) rotationIcon.textContent = userPaused ? '▶' : 'Ⅱ';
  };

  const updateAutoplay = () => {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
    carousel.classList.remove('is-playing');
    const playing = canAutoplay();
    slideTrack.setAttribute('aria-live', playing ? 'off' : 'polite');
    if (playing) {
      // The CSS progress animation and the JS timer start together.
      void carousel.offsetWidth;
      carousel.classList.add('is-playing');
      timer = window.setTimeout(() => showSlide(current + 1, false), DURATION);
    }
    updateToggle();
  };

  const showSlide = (index, manual) => {
    const newIndex = (index + slides.length) % slides.length;
    if (manual) userPaused = true;
    current = newIndex;
    slides.forEach((slide, i) => {
      const active = i === current;
      slide.hidden = !active;
      slide.classList.toggle('is-active', active);
    });
    selectors.forEach((button, i) => {
      const active = i === current;
      button.classList.toggle('is-current', active);
      button.setAttribute('aria-pressed', String(active));
    });
    preload(current);
    preload(current + 1);
    if (announcement && manual) announcement.textContent = slides[current].getAttribute('aria-label') || '';
    updateAutoplay();
  };

  selectors.forEach(button => button.addEventListener('click', () => {
    showSlide(Number(button.dataset.difGo), true);
  }));
  prev.addEventListener('click', () => showSlide(current - 1, true));
  next.addEventListener('click', () => showSlide(current + 1, true));

  rotationToggle.addEventListener('click', () => {
    userPaused = !userPaused;
    updateAutoplay();
  });

  carousel.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      pointerInside = true;
      updateAutoplay();
    }
  });
  carousel.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      pointerInside = false;
      updateAutoplay();
    }
  });
  carousel.addEventListener('focusin', () => {
    focusInside = true;
    updateAutoplay();
  });
  carousel.addEventListener('focusout', event => {
    if (!event.relatedTarget || !carousel.contains(event.relatedTarget)) {
      focusInside = false;
      updateAutoplay();
    }
  });

  // Swipe changes only slides, never scrolls the page artificially.
  slideTrack.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) return;
    touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  slideTrack.addEventListener('touchend', event => {
    if (!touchStart || event.changedTouches.length !== 1) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      showSlide(current + (dx < 0 ? 1 : -1), true);
    }
  }, { passive: true });
  slideTrack.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });

  document.addEventListener('visibilitychange', updateAutoplay);
  desktop.addEventListener?.('change', updateAutoplay);
  reducedMotion.addEventListener?.('change', updateAutoplay);

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      updateAutoplay();
    }, { threshold: 0.24 });
    observer.observe(carousel);
  } else {
    // Lack of visibility observation must not trigger unsolicited rotation.
    inView = false;
  }

  carousel.classList.add('is-enhanced');
  preload(0);
  preload(1);
  updateAutoplay();
})();

// ============================================
// Lightbox da galeria de ambientes
// ============================================
const lightbox = document.getElementById('lightbox');
const lbImg = document.getElementById('lbImg');
const lbSource = document.getElementById('lbSource');
const lbLegenda = document.getElementById('lbLegenda');
const lbFechar = document.getElementById('lbFechar');
const lbPrev = document.getElementById('lbPrev');
const lbNext = document.getElementById('lbNext');
const cards = Array.from(document.querySelectorAll('.ambiente-card'));

if (lightbox && cards.length) {
  let atual = 0;
  let ultimoFoco = null;

  const mostrar = (i) => {
    atual = (i + cards.length) % cards.length;
    const card = cards[atual];
    const legenda = card.dataset.legenda || '';
    lbSource.srcset = card.dataset.webp || '';
    lbImg.src = card.dataset.full;
    lbImg.alt = card.querySelector('img')?.alt || legenda;
    lbLegenda.textContent = legenda;
  };

  const abrir = (i) => {
    ultimoFoco = document.activeElement;
    mostrar(i);
    lightbox.hidden = false;
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => lightbox.classList.add('aberto'));
    lbFechar.focus();
  };

  const fechar = () => {
    lightbox.classList.remove('aberto');
    document.body.classList.remove('no-scroll');
    setTimeout(() => {
      lightbox.hidden = true;
      lbImg.src = '';
      lbSource.srcset = '';
    }, 300);
    if (ultimoFoco) ultimoFoco.focus();
  };

  cards.forEach((card, i) => card.addEventListener('click', () => abrir(i)));

  lbFechar.addEventListener('click', fechar);
  lbPrev.addEventListener('click', () => mostrar(atual - 1));
  lbNext.addEventListener('click', () => mostrar(atual + 1));

  // clique no fundo fecha
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) fechar();
  });

  // teclado
  document.addEventListener('keydown', (e) => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') { fechar(); return; }
    if (e.key === 'ArrowLeft') mostrar(atual - 1);
    if (e.key === 'ArrowRight') mostrar(atual + 1);
    if (e.key === 'Tab') {
      const focusables = [lbFechar, lbPrev, lbNext].filter(Boolean);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // arrastar no celular
  let toqueX = null;
  lightbox.addEventListener('touchstart', (e) => { toqueX = e.changedTouches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    if (toqueX === null) return;
    const delta = e.changedTouches[0].clientX - toqueX;
    if (Math.abs(delta) > 50) mostrar(delta > 0 ? atual - 1 : atual + 1);
    toqueX = null;
  }, { passive: true });
}


// ============================================
// Conversão: WhatsApp oficial configurável
// Preencher data-whatsapp-number no <body> com 55 + DDD + numero.
// Sem numero confirmado, nenhum link falso é disponibilizado.
// ============================================
const whatsappNumber = (document.body.dataset.whatsappNumber || '').replace(/\D/g, '');
const whatsappReady = /^55\d{10,11}$/.test(whatsappNumber);
const contactCtas = document.querySelectorAll('[data-contact-cta]');
const whatsBtn = document.getElementById('whatsBtn');
if (whatsappReady) {
  const message = encodeURIComponent('Olá! Visitei o site da Duplar Móveis e gostaria de conversar sobre um projeto de móveis sob medida.');
  const whatsappUrl = 'https://wa.me/' + whatsappNumber + '?text=' + message;
  contactCtas.forEach(link => {
    link.href = whatsappUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.removeAttribute('aria-disabled');
  });
  if (whatsBtn) {
    whatsBtn.classList.remove('is-pending');
    whatsBtn.textContent = 'Conversar no WhatsApp ↗';
  }
} else if (whatsBtn) {
  whatsBtn.addEventListener('click', event => event.preventDefault());
}

// Oculta o atalho movel enquanto a secao final de contato esta visivel.
const mobileContact = document.getElementById('mobileContact');
const contactSection = document.getElementById('contato');
if (mobileContact && contactSection && 'IntersectionObserver' in window) {
  const mobileObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) mobileContact.setAttribute('data-at-contact', 'true');
    else mobileContact.removeAttribute('data-at-contact');
  }, {threshold: 0.15});
  mobileObserver.observe(contactSection);
}

// O atalho flutuante aparece somente depois que o visitante deixa o hero.
const heroSection = document.getElementById('topo');
if (mobileContact && heroSection && 'IntersectionObserver' in window) {
  const heroObserver = new IntersectionObserver(entries => {
    mobileContact.toggleAttribute('data-hero-passed', !entries[0].isIntersecting);
  }, { threshold: 0.08 });
  heroObserver.observe(heroSection);
}


// ============================================
// Hero cinematografico — reproducao com fallback
// ============================================
const duplarHeroVideo = document.getElementById('heroVideo');
if (duplarHeroVideo) {
  const heroMedia = duplarHeroVideo.closest('.hero-media');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);

  if (!reduceMotion && !saveData) {
    duplarHeroVideo.muted = true;
    duplarHeroVideo.defaultMuted = true;
    duplarHeroVideo.playsInline = true;
    duplarHeroVideo.preload = 'auto';
    const mobileHero = window.matchMedia('(max-width: 600px)').matches;
    duplarHeroVideo.src = mobileHero
      ? duplarHeroVideo.dataset.srcMobile
      : duplarHeroVideo.dataset.srcDesktop;
    duplarHeroVideo.load();

    duplarHeroVideo.addEventListener('playing', () => {
      heroMedia?.classList.add('is-video-ready');
    });
    duplarHeroVideo.addEventListener('error', () => {
      heroMedia?.classList.remove('is-video-ready');
    });

    const tryPlayHero = () => {
      const attempt = duplarHeroVideo.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(() => {
          // Autoplay bloqueado: a fotografia continua visivel.
          heroMedia?.classList.remove('is-video-ready');
        });
      }
    };
    tryPlayHero();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) duplarHeroVideo.pause();
      else tryPlayHero();
    });
  } else {
    duplarHeroVideo.pause();
    // Nao carrega video se o visitante pediu movimento reduzido ou economia de dados.
    duplarHeroVideo.preload = 'none';
  }
}
