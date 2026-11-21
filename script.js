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
// ============================================
// Seção 03 / Filme cinematográfico sincronizado aos textos.
// 4 cenas (5.5s cada, dissolvências 0.5s):
// offsets 0 / 5 / 10 / 15; duração final ~20.5s.
// Sem rede, sem movimento reduzido ou sem vídeo:
// imagens estáticas do portfólio e navegação manual.
// ============================================
(() => {
  const section = document.getElementById('diferenciais');
  const video = document.getElementById('cineVideo');
  if (!section || !video) return;

  const scenes = Array.from(section.querySelectorAll('[data-cine-scene]'));
  const stills = Array.from(section.querySelectorAll('[data-cine-still]'));
  const selectors = Array.from(section.querySelectorAll('[data-cine-go]'));
  const prev = document.getElementById('cinePrevious');
  const next = document.getElementById('cineNext');
  const toggle = document.getElementById('cinePlayToggle');
  const toggleText = toggle?.querySelector('.cine-play-text');
  const toggleIcon = toggle?.querySelector('.cine-play-icon');
  const announcement = document.getElementById('cineAnnouncement');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 600px)');
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const sceneStart = [0, 5.25, 10.25, 15.25];
  const duration = 20.5;

  if (scenes.length !== 4 || stills.length !== 4 || selectors.length !== 4 ||
      !prev || !next || !toggle) return;

  let index = 0;
  let mediaLoaded = false;
  let mediaBroken = false;
  let metadataLoaded = false;
  let userPaused = false;
  let hoverPaused = false;
  let focusPaused = false;
  let visible = false;
  let near = false;
  let pendingSeek = null;
  let pointerStart = null;

  const isStatic = () => reduceMotion.matches || saveData || mediaBroken;
  const shouldPlay = () => !isStatic() && mediaLoaded && visible && !document.hidden &&
    !userPaused && !hoverPaused && !focusPaused;

  function refreshToggle() {
    toggle.hidden = isStatic();
    toggle.setAttribute('aria-pressed', String(userPaused));
    toggle.setAttribute('aria-label', userPaused ? 'Retomar vídeo' : 'Pausar vídeo');
    if (toggleText) toggleText.textContent = userPaused ? 'Retomar' : 'Pausar';
    if (toggleIcon) toggleIcon.textContent = userPaused ? '▶' : 'Ⅱ';
  }

  function paintProgress(time) {
    const ends = [sceneStart[1], sceneStart[2], sceneStart[3], duration];
    selectors.forEach((button, i) => {
      const fill = button.querySelector('.cine-select-progress');
      if (!fill) return;
      const value = i < index ? 100 :
        i > index ? 0 : isStatic() ? 100 :
        Math.max(0, Math.min(100, ((time - sceneStart[i]) / (ends[i] - sceneStart[i])) * 100));
      fill.style.width = value.toFixed(1) + '%';
    });
  }

  function showScene(newIndex, manual = false) {
    const normalized = (newIndex + scenes.length) % scenes.length;
    if (manual) userPaused = true;
    const changed = normalized !== index;
    index = normalized;
    scenes.forEach((element, i) => {
      element.hidden = i !== index;
      element.classList.toggle('is-current', i === index);
    });
    stills.forEach((element, i) => {
      element.hidden = i !== index;
      element.classList.toggle('is-current', i === index);
    });
    selectors.forEach((button, i) => {
      button.classList.toggle('is-current', i === index);
      button.setAttribute('aria-pressed', String(i === index));
    });
    if (manual && announcement) {
      announcement.textContent = selectors[index].getAttribute('aria-label') || '';
    }
    paintProgress(mediaLoaded && metadataLoaded && !isStatic() ? video.currentTime : sceneStart[index]);
    if (manual) {
      pendingSeek = sceneStart[index] + (index === 0 ? 0 : .12);
      if (metadataLoaded) {
        try { video.currentTime = pendingSeek; pendingSeek = null; } catch (_) {}
      }
      updatePlayback();
    } else if (changed) {
      refreshToggle();
    }
  }

  function updatePlayback() {
    refreshToggle();
    if (shouldPlay()) {
      const attempt = video.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(() => {
          // Restrições de autoplay: preservar o último frame ou a foto.
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

  selectors.forEach((button, i) => button.addEventListener('click', () => showScene(i, true)));
  prev.addEventListener('click', () => showScene(index - 1, true));
  next.addEventListener('click', () => showScene(index + 1, true));
  toggle.addEventListener('click', () => {
    userPaused = !userPaused;
    updatePlayback();
  });

  video.addEventListener('loadedmetadata', () => {
    metadataLoaded = true;
    if (pendingSeek !== null) {
      try { video.currentTime = pendingSeek; pendingSeek = null; } catch (_) {}
    }
    updatePlayback();
  });
  video.addEventListener('playing', () => {
    section.classList.add('is-video-ready');
    refreshToggle();
  });
  video.addEventListener('error', () => {
    mediaBroken = true;
    section.classList.remove('is-video-ready');
    updatePlayback();
    paintProgress(sceneStart[index]);
  });
  video.addEventListener('timeupdate', () => {
    if (isStatic()) return;
    const t = video.currentTime;
    const newIndex = t >= sceneStart[3] ? 3 :
      t >= sceneStart[2] ? 2 :
      t >= sceneStart[1] ? 1 : 0;
    if (newIndex !== index) showScene(newIndex, false);
    paintProgress(t);
  });
  video.addEventListener('seeked', () => {
    if (video.paused && !isStatic() && video.readyState >= 2) {
      section.classList.add('is-video-ready');
    }
  });

  section.addEventListener('pointerenter', e => {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
      hoverPaused = true;
      updatePlayback();
    }
  });
  section.addEventListener('pointerleave', e => {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
      hoverPaused = false;
      updatePlayback();
    }
  });
  section.addEventListener('focusin', () => {
    focusPaused = true;
    updatePlayback();
  });
  section.addEventListener('focusout', e => {
    if (!e.relatedTarget || !section.contains(e.relatedTarget)) {
      focusPaused = false;
      updatePlayback();
    }
  });

  // Navegação horizontal sem interferir no gesto vertical de rolagem.
  section.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    pointerStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  section.addEventListener('touchend', e => {
    if (!pointerStart || e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - pointerStart.x;
    const dy = e.changedTouches[0].clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) >= 60 && Math.abs(dx) >= Math.abs(dy) * 1.3) {
      showScene(index + (dx < 0 ? 1 : -1), true);
    }
  }, { passive: true });
  section.addEventListener('touchcancel', () => { pointerStart = null; }, { passive: true });

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
    visible = false; // Não iniciar movimento automaticamente sem observação confiável.
    loadIfAppropriate();
  }

  showScene(0, false);
  refreshToggle();
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
