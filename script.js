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
  '.depoimento-intro, .depoimento-card, .dif-card, .ambiente-card, .atendimento-apresentacao, .atendimento-painel'
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
const contactNote = document.getElementById('contactNote');
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
  if (contactNote) contactNote.hidden = true;
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
