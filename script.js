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
// Enquadramento editorial da navegação interna.
// Evita o acúmulo de scroll-padding e scroll-margin do salto nativo.
// Em seções longas, foca o conteúdo; no vídeo, mostra o quadro inteiro.
// ============================================
(() => {
  const sections = {
    topo: { selector: '#topo', mode: 'full' },
    ambientes: { selector: '#ambientes .section-heading-row', mode: 'portfolio' },
    depoimentos: { selector: '#depoimentos .depoimento-grid', mode: 'center' },
    diferenciais: { selector: '#diferenciais', mode: 'full' },
    contato: { selector: '#contato .atendimento-grid', mode: 'center' },
    galeria: { selector: '#ambientes .ambientes-grid', mode: 'start' }
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const topHeader = document.getElementById('header');

  function getDestination(id) {
    const rule = sections[id];
    const target = rule && document.querySelector(rule.selector);
    if (!target) return null;

    const headerHeight = topHeader?.getBoundingClientRect().height || 0;
    const viewport = window.innerHeight;
    const available = Math.max(0, viewport - headerHeight);
    const bounds = target.getBoundingClientRect();
    const targetTop = bounds.top + window.scrollY;
    let visibleTop = headerHeight + 22;

    if (rule.mode === 'full') {
      visibleTop = 0;
    } else if (rule.mode === 'center') {
      // Centraliza o conjunto (texto + depoimento / CTA), quando couber.
      // Se for maior que a tela, preserva a abertura logo abaixo do menu.
      visibleTop = headerHeight + Math.max(18, (available - bounds.height) / 2);
    } else if (rule.mode === 'portfolio') {
      // Centraliza visualmente a introdução junto ao início da galeria:
      // não pula o título nem deixa uma grande área vazia acima dele.
      visibleTop = headerHeight + Math.max(16, Math.min(112, (available - bounds.height) * .17));
    }

    const maxScroll = Math.max(0, document.documentElement.scrollHeight - viewport);
    return Math.min(maxScroll, Math.max(0, targetTop - visibleTop));
  }

  function frameSection(id, options = {}) {
    const top = getDestination(id);
    if (top === null) return false;
    const behavior = options.animate && !reducedMotion.matches ? 'smooth' : 'instant';
    window.scrollTo({ top, behavior });
    return true;
  }

  // Links existentes continuam sendo links reais e preservam o histórico.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href^="#"]');
    if (!link || link.target === '_blank') return;
    const id = decodeURIComponent(link.hash.slice(1));
    if (!Object.prototype.hasOwnProperty.call(sections, id)) return;
    event.preventDefault();
    if (window.location.hash !== '#' + encodeURIComponent(id)) {
      window.history.pushState(null, '', '#' + encodeURIComponent(id));
    }
    frameSection(id, { animate: true });
  });

  // Abrir URLs diretas (#ambientes, #depoimentos...) também deve enquadrar.
  const followHash = () => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) frameSection(id);
  };
  window.addEventListener('popstate', followHash);
  window.addEventListener('hashchange', followHash);
  window.addEventListener('load', () => {
    if (window.location.hash) {
      window.requestAnimationFrame(() => window.requestAnimationFrame(followHash));
    }
  });
})();

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
// ============================================
// ============================================
// Seção 03 / Filme cinematográfico de quatro momentos.
// Clique na metade esquerda ou direita para navegar; swipe
// no celular e setas do teclado quando a seção está focada.
// Movimento não pausa ao passar o mouse pelo vídeo.
// ============================================
(() => {
  const section = document.getElementById('diferenciais');
  const video = document.getElementById('cineVideo');
  if (!section || !video) return;

  const scenes = Array.from(section.querySelectorAll('[data-cine-scene]'));
  const announcement = document.getElementById('cineAnnouncement');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 600px)');
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const sceneStart = [0, 5.25, 10.25, 15.25];
  const sceneNames = [
    'Projeto personalizado',
    'Madeira selecionada',
    'Acabamento sob medida',
    'Do projeto à instalação'
  ];

  if (scenes.length !== 4) return;

  let index = 0;
  let mediaLoaded = false;
  let mediaBroken = false;
  let metadataLoaded = false;
  let visible = false;
  let near = false;
  let pendingSeek = null;
  let touchStart = null;
  let suppressClickUntil = 0;

  const isStatic = () => reduceMotion.matches || saveData || mediaBroken;
  const shouldPlay = () => !isStatic() && mediaLoaded && visible &&
    !document.hidden;

  function showScene(newIndex, manual = false) {
    index = (newIndex + scenes.length) % scenes.length;
    scenes.forEach((element, i) => {
      element.hidden = i !== index;
      element.classList.toggle('is-current', i === index);
    });
    if (manual) {
      if (announcement) {
        announcement.textContent = (index + 1) + ' de 4: ' + sceneNames[index];
      }
      // Se o visitante escolheu uma cena, avançar o filme para
      // o mesmo trecho sem interromper a reprodução automática.
      pendingSeek = sceneStart[index] + (index === 0 ? 0 : .12);
      if (metadataLoaded && !isStatic()) {
        try {
          video.currentTime = pendingSeek;
          pendingSeek = null;
        } catch (_) {}
      }
      updatePlayback();
    }
  }

  function updatePlayback() {
    if (shouldPlay()) {
      if (!video.paused) return;
      const attempt = video.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(() => {
          // Se a reprodução for bloqueada, mantemos o fundo escuro e os textos legíveis.
          section.classList.remove('is-video-ready');
        });
      }
    } else if (!video.paused) {
      video.pause();
    }
  }

  function loadIfAppropriate() {
    if (!near || mediaLoaded || isStatic()) return;
    const source = mobile.matches ? video.dataset.srcMobile : video.dataset.srcDesktop;
    if (!source) return;
    mediaLoaded = true;
    video.src = source;
    video.preload = 'auto';
    video.load();
    updatePlayback();
  }

  function switchSource() {
    if (!mediaLoaded || isStatic()) return;
    video.pause();
    section.classList.remove('is-video-ready');
    metadataLoaded = false;
    pendingSeek = sceneStart[index];
    video.src = mobile.matches ? video.dataset.srcMobile : video.dataset.srcDesktop;
    video.load();
  }

  // Toda a área cinematográfica responde ao lado do clique.
  // Clicar em uma metade navega sem interromper o vídeo.
  section.addEventListener('click', event => {
    if (Date.now() < suppressClickUntil) return;
    if (event.target.closest('button, a, input, select, textarea, [role="button"]')) return;
    if (window.getSelection()?.toString()) return;
    const bounds = section.getBoundingClientRect();
    const isLeft = event.clientX - bounds.left < bounds.width / 2;
    showScene(index + (isLeft ? -1 : 1), true);
  });

  section.addEventListener('keydown', event => {
    if (event.target.closest('button, a, input, select, textarea')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showScene(index + (event.key === 'ArrowLeft' ? -1 : 1), true);
    }
  });

  video.addEventListener('loadedmetadata', () => {
    metadataLoaded = true;
    if (pendingSeek !== null) {
      try {
        video.currentTime = pendingSeek;
        pendingSeek = null;
      } catch (_) {}
    }
    updatePlayback();
  });

  video.addEventListener('playing', () => {
    section.classList.add('is-video-ready');
  });

  video.addEventListener('error', () => {
    mediaBroken = true;
    section.classList.remove('is-video-ready');
    updatePlayback();
  });

  video.addEventListener('timeupdate', () => {
    if (isStatic()) return;
    const t = video.currentTime;
    const newIndex = t >= sceneStart[3] ? 3 :
      t >= sceneStart[2] ? 2 :
      t >= sceneStart[1] ? 1 : 0;
    if (newIndex !== index) showScene(newIndex, false);
  });

  video.addEventListener('seeked', () => {
    if (video.paused && !isStatic() && video.readyState >= 2) {
      section.classList.add('is-video-ready');
    }
  });

  // O gesto horizontal navega e não bloqueia a rolagem vertical.
  section.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) return;
    touchStart = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  }, { passive: true });
  section.addEventListener('touchend', event => {
    if (!touchStart || event.changedTouches.length !== 1) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) >= 60 && Math.abs(dx) >= Math.abs(dy) * 1.3) {
      suppressClickUntil = Date.now() + 450;
      showScene(index + (dx < 0 ? 1 : -1), true);
    }
  }, { passive: true });
  section.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });

  document.addEventListener('visibilitychange', updatePlayback);
  mobile.addEventListener?.('change', switchSource);
  reduceMotion.addEventListener?.('change', () => {
    section.classList.remove('is-video-ready');
    if (reduceMotion.matches) video.pause();
    if (!reduceMotion.matches) loadIfAppropriate();
    updatePlayback();
  });

  if ('IntersectionObserver' in window) {
    const nearObserver = new IntersectionObserver(entries => {
      near = entries[0].isIntersecting;
      loadIfAppropriate();
    }, { rootMargin: '350px 0px', threshold: 0 });
    nearObserver.observe(section);
    const visibilityObserver = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      updatePlayback();
    }, { threshold: .17 });
    visibilityObserver.observe(section);
  } else {
    near = true;
    visible = false;
    loadIfAppropriate();
  }

  showScene(0, false);
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
