/* Duplar Móveis — navegação local da experiência de cliente.
   NÃO é autenticação: só exibe dados ilustrativos, sem armazenar informações. */
(() => {
  'use strict';

  const entry = document.getElementById('entryScreen');
  const dashboard = document.getElementById('dashboard');
  const openButtons = document.querySelectorAll('[data-show-demo]');
  const exitButtons = document.querySelectorAll('[data-exit-demo]');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('drawerBackdrop');
  const toggle = document.getElementById('sidebarToggle');
  const sectionName = document.getElementById('currentSection');
  const navButtons = Array.from(document.querySelectorAll('.side-link[data-view]'));
  const viewButtons = document.querySelectorAll('button[data-view]');
  const panels = Array.from(document.querySelectorAll('.portal-view[data-panel]'));
  const headings = {
    inicio: 'Visão geral',
    projeto: 'Meu projeto',
    documentos: 'Documentos',
    financeiro: 'Financeiro',
    atendimento: 'Atendimento',
    conta: 'Minha conta'
  };

  if (!entry || !dashboard || !sidebar || !toggle || !backdrop) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastView = 'inicio';

  function setUrl(isDemo, section) {
    const url = new URL(window.location.href);
    if (isDemo) {
      url.searchParams.set('demo', '1');
      url.searchParams.set('secao', section);
    } else {
      url.searchParams.delete('demo');
      url.searchParams.delete('secao');
    }
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  }

  function closeMenu(restoreFocus = false) {
    const wasOpen = sidebar.classList.contains('is-open');
    sidebar.classList.remove('is-open');
    backdrop.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu do portal');
    if (restoreFocus && wasOpen) toggle.focus();
  }

  function openMenu() {
    sidebar.classList.add('is-open');
    backdrop.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Fechar menu do portal');
    navButtons.find(b => b.classList.contains('is-active'))?.focus();
  }

  function showView(name, shouldFocus = true) {
    if (!Object.prototype.hasOwnProperty.call(headings, name)) name = 'inicio';
    lastView = name;
    panels.forEach(panel => {
      panel.hidden = panel.dataset.panel !== name;
    });
    navButtons.forEach(button => {
      const isActive = button.dataset.view === name;
      button.classList.toggle('is-active', isActive);
      if (isActive) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    sectionName.textContent = headings[name];
    closeMenu();
    setUrl(true, name);
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'instant' });
    if (shouldFocus) {
      const selected = panels.find(panel => panel.dataset.panel === name);
      const heading = selected?.querySelector('h1');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    }
  }

  function showDemo(initialView = 'inicio') {
    entry.hidden = true;
    dashboard.hidden = false;
    document.title = 'Meu espaço — Área do cliente | Duplar Móveis';
    showView(initialView, false);
    window.scrollTo(0, 0);
  }

  function exitDemo() {
    closeMenu();
    dashboard.hidden = true;
    entry.hidden = false;
    document.title = 'Área do cliente — Duplar Móveis';
    setUrl(false);
    window.scrollTo(0, 0);
    const firstButton = document.querySelector('[data-show-demo]');
    if (firstButton) firstButton.focus({ preventScroll: true });
  }

  openButtons.forEach(button => button.addEventListener('click', () => showDemo('inicio')));
  exitButtons.forEach(button => button.addEventListener('click', exitDemo));

  viewButtons.forEach(button => {
    button.addEventListener('click', () => {
      const name = button.dataset.view;
      if (dashboard.hidden) showDemo(name);
      else showView(name);
    });
  });

  toggle.addEventListener('click', () => {
    if (sidebar.classList.contains('is-open')) closeMenu(true);
    else openMenu();
  });
  backdrop.addEventListener('click', () => closeMenu(true));
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && sidebar.classList.contains('is-open')) closeMenu(true);
  });
  window.matchMedia('(min-width: 1081px)').addEventListener?.('change', event => {
    if (event.matches) closeMenu();
  });

  // Accordion for example document descriptions; no file is fetched.
  document.querySelectorAll('[data-detail-button]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('aria-controls');
      const description = document.getElementById(id);
      if (!description) return;
      const next = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(next));
      button.querySelector('[aria-hidden]')?.replaceChildren(document.createTextNode(next ? '−' : '+'));
      description.hidden = !next;
    });
  });

  const initialParams = new URLSearchParams(window.location.search);
  if (initialParams.get('demo') === '1') {
    showDemo(initialParams.get('secao') || 'inicio');
  } else {
    dashboard.hidden = true;
    entry.hidden = false;
  }
})();
