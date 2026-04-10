/**
 * Canadian Code Compass — Main entry point
 * Initializes data, binds events, manages app state
 */
import { loadAllData, search, getSectionTree, getBulletins, getClauseCount } from './search.js';
import { renderResults, renderSectionBrowser, renderBulletins, renderStats } from './ui.js';

// --- App State ---
const state = {
  mode: 'scenario',      // 'scenario' | 'keyword' | 'browse'
  filter: 'all',          // 'all' | 'b149-1' | 'b149-2'
  query: '',
  dataLoaded: false,
};

let searchDebounce = null;
const DEBOUNCE_MS = 200;

// --- DOM References ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// --- Init ---
async function init() {
  try {
    await loadAllData();
    state.dataLoaded = true;

    // Show stats using DOM API
    const counts = getClauseCount();
    const statsBar = document.createElement('div');
    statsBar.className = 'stats-bar';
    const items = [
      `${counts.b149_1} B149.1 clauses`,
      `${counts.b149_2} B149.2 clauses`,
      `${counts.scenarios} scenarios`,
    ];
    items.forEach((text, i) => {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'stat-sep';
        sep.textContent = '•';
        statsBar.appendChild(sep);
      }
      const span = document.createElement('span');
      span.textContent = text;
      statsBar.appendChild(span);
    });
    const searchContainer = $('.search-container');
    if (searchContainer) searchContainer.appendChild(statsBar);

    // Load bulletins
    const bulletinsList = getBulletins();
    renderBulletins(bulletinsList, $('#bulletins-list'));

    // Remove loading overlay
    const overlay = $('#loading-overlay');
    if (overlay) {
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 300);
    }

    if (state.mode === 'browse') {
      showSectionBrowser();
    }
  } catch (err) {
    console.error('Failed to load data:', err);
    const overlay = $('#loading-overlay');
    if (overlay) {
      overlay.textContent = '';
      const p = document.createElement('p');
      p.textContent = 'Failed to load code data. Please refresh.';
      p.style.color = '#ff6b6b';
      overlay.appendChild(p);
    }
  }
}

// --- Event Binding ---
function bindEvents() {
  const searchInput = $('#search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.query = e.target.value.trim();
      toggleClearButton();
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(doSearch, DEBOUNCE_MS);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        state.query = '';
        toggleClearButton();
        doSearch();
      }
    });
  }

  const clearBtn = $('#clear-search');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const input = $('#search-input');
      if (input) input.value = '';
      state.query = '';
      toggleClearButton();
      doSearch();
      input?.focus();
    });
  }

  $$('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const newMode = tab.dataset.mode;
      if (newMode === state.mode) return;
      state.mode = newMode;
      $$('.mode-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.mode === newMode);
        t.setAttribute('aria-selected', t.dataset.mode === newMode);
      });
      updateUIForMode();
    });
  });

  $$('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      $$('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === state.filter));
      if (state.mode === 'browse') {
        showSectionBrowser();
      } else {
        doSearch();
      }
    });
  });

  const bulletinsToggle = $('#bulletins-toggle');
  if (bulletinsToggle) {
    bulletinsToggle.addEventListener('click', () => {
      const list = $('#bulletins-list');
      const arrow = bulletinsToggle.querySelector('.toggle-arrow');
      if (list) list.classList.toggle('hidden');
      if (arrow) arrow.textContent = list?.classList.contains('hidden') ? '▼' : '▲';
    });
  }

  const themeToggle = $('#theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== $('#search-input')) {
      e.preventDefault();
      $('#search-input')?.focus();
    }
  });
}

// --- Search ---
function doSearch() {
  if (!state.dataLoaded) return;
  const resultsArea = $('#results-area');
  if (state.mode === 'browse') return;
  if (!state.query || state.query.length < 2) {
    renderResults([], '', resultsArea);
    return;
  }
  const results = search(state.query, state.mode, state.filter);
  renderResults(results, state.query, resultsArea);
}

// --- Mode switching ---
function updateUIForMode() {
  const searchContainer = $('.search-container');
  const resultsArea = $('#results-area');
  const sectionBrowser = $('#section-browser');
  const searchInput = $('#search-input');
  const hint = $('#search-hint');

  if (state.mode === 'browse') {
    if (searchContainer) searchContainer.classList.add('hidden');
    if (resultsArea) resultsArea.classList.add('hidden');
    if (sectionBrowser) sectionBrowser.classList.remove('hidden');
    showSectionBrowser();
  } else {
    if (searchContainer) searchContainer.classList.remove('hidden');
    if (resultsArea) resultsArea.classList.remove('hidden');
    if (sectionBrowser) sectionBrowser.classList.add('hidden');
    if (state.mode === 'scenario') {
      if (searchInput) searchInput.placeholder = 'Describe what you found wrong...';
      if (hint) hint.textContent = 'e.g., "furnace too close to wood framing" or "no shutoff valve"';
    } else {
      if (searchInput) searchInput.placeholder = 'Search by keyword or clause number...';
      if (hint) hint.textContent = 'e.g., "clearance", "vent connector", or "4.13"';
    }
    searchInput?.focus();
    doSearch();
  }
}

function showSectionBrowser() {
  const tree = getSectionTree(state.filter);
  renderSectionBrowser(tree, $('#section-browser'));
}

// --- Theme ---
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('ccc-theme', newTheme);
  const icon = $('.theme-icon');
  if (icon) icon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

function loadTheme() {
  const saved = localStorage.getItem('ccc-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  const icon = $('.theme-icon');
  if (icon) icon.textContent = saved === 'dark' ? '☀️' : '🌙';
}

// --- Online/Offline ---
function updateOnlineStatus() {
  const badge = $('#offline-badge');
  if (badge) badge.classList.toggle('hidden', navigator.onLine);
}

function toggleClearButton() {
  const clearBtn = $('#clear-search');
  if (clearBtn) clearBtn.classList.toggle('hidden', !state.query);
}

// --- Service Worker Registration ---
async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('sw.js');
    } catch (err) {
      console.warn('SW registration failed:', err);
    }
  }
}

// --- Install to Home Screen ---
let deferredInstallPrompt = null;

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function setupInstall() {
  const installBtn = $('#install-btn');
  const iosModal = $('#ios-install-modal');
  const iosClose = $('#ios-install-close');

  // Hide install button entirely if already installed
  if (isStandalone()) {
    if (installBtn) installBtn.classList.add('hidden');
    return;
  }

  // Android / Chrome desktop: beforeinstallprompt fires when installable
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (installBtn) installBtn.classList.remove('hidden');
  });

  // iOS Safari: no beforeinstallprompt, show button + instructions modal
  if (isIOS() && installBtn) {
    installBtn.classList.remove('hidden');
  }

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        // Android/Chrome native prompt
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          installBtn.classList.add('hidden');
        }
        deferredInstallPrompt = null;
      } else if (isIOS() && iosModal) {
        // iOS: show instructions modal
        iosModal.classList.remove('hidden');
      }
    });
  }

  if (iosClose && iosModal) {
    iosClose.addEventListener('click', () => iosModal.classList.add('hidden'));
    iosModal.addEventListener('click', (e) => {
      if (e.target === iosModal) iosModal.classList.add('hidden');
    });
  }

  // After install, hide button and confirm
  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.classList.add('hidden');
    deferredInstallPrompt = null;
  });
}

// --- Boot ---
loadTheme();
bindEvents();
registerSW();
setupInstall();
init();