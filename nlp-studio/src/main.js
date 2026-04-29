/**
 * NLP Studio — Main Application Entry Point
 * 
 * Initializes the app shell, router, and all UI components.
 * Handles page rendering, event attachment, toast notifications,
 * keyboard navigation, search functionality, and NLP analysis flow.
 * 
 * @module main
 */

import { store } from './core/store.js';
import { bus } from './core/event-bus.js';
import { logger } from './core/logger.js';
import { errorHandler } from './core/error-handler.js';
import { escapeHtml, sanitizeInput, validateTextInput } from './core/security.js';
import { runAnalysis, runFullPipeline, getTextStats } from './nlp/pipeline.js';
import { ENTITY_TYPES } from './nlp/ner.js';
import { getSupportedLanguages } from './nlp/translator.js';

// ─── Initialize Core ───
logger.setStore(store);
errorHandler.init();

// ─── Route Definitions ───
const routes = {
  dashboard: { title: 'Dashboard', icon: '📊' },
  analyzer: { title: 'NLP Analyzer', icon: '🧠' },
  history: { title: 'History', icon: '📜' },
  settings: { title: 'Settings', icon: '⚙️' },
  logs: { title: 'System Logs', icon: '📋' }
};

// ─── Cleanup Registry (prevents memory leaks on re-render) ───
let pageCleanupFns = [];

function registerCleanup(fn) {
  pageCleanupFns.push(fn);
}

function runCleanups() {
  for (const fn of pageCleanupFns) {
    try { fn(); } catch { /* noop */ }
  }
  pageCleanupFns = [];
}

// ─── Router ───
function navigate(page) {
  if (!routes[page]) return;
  store.setState('app.currentPage', page);
  window.location.hash = page;
  renderPage();
  logger.info(`Navigated to ${page}`);
}

function getCurrentPage() {
  const hash = window.location.hash.slice(1);
  return routes[hash] ? hash : 'dashboard';
}

// ─── Toast Notifications ───
/**
 * Show a toast notification with auto-dismiss.
 * Uses DOM event binding instead of inline onclick for security.
 * 
 * @param {string} message - Notification text
 * @param {string} [type='info'] - Type: 'info' | 'success' | 'warning' | 'error'
 * @param {number} [duration=4000] - Auto-dismiss time in ms
 */
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');

  const msgSpan = document.createElement('span');
  msgSpan.textContent = message;
  toast.appendChild(msgSpan);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast__close';
  closeBtn.setAttribute('aria-label', 'Dismiss notification');
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => {
    toast.classList.add('toast--exiting');
    setTimeout(() => toast.remove(), 300);
  });
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  // Auto-dismiss with exit animation
  const timer = setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add('toast--exiting');
      setTimeout(() => { if (toast.parentElement) toast.remove(); }, 300);
    }
  }, duration);

  // Clear timer if manually dismissed
  closeBtn.addEventListener('click', () => clearTimeout(timer), { once: true });
}

bus.on('toast', ({ message, type }) => showToast(message, type));

// ─── Confirmation Dialog ───
/**
 * Show a confirmation modal before destructive actions.
 * Returns a Promise that resolves to true (confirmed) or false (cancelled).
 * 
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @returns {Promise<boolean>} User's choice
 */
function showConfirmDialog(title, message) {
  return new Promise((resolve) => {
    // Remove any existing modal
    document.getElementById('confirm-overlay')?.remove();
    document.getElementById('confirm-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'confirm-overlay';
    overlay.className = 'overlay visible';

    const modal = document.createElement('div');
    modal.id = 'confirm-modal';
    modal.className = 'modal visible';
    modal.setAttribute('role', 'alertdialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'confirm-title');
    modal.setAttribute('aria-describedby', 'confirm-message');

    modal.innerHTML = `
      <div class="modal__header">
        <h2 class="modal__title" id="confirm-title">${escapeHtml(title)}</h2>
      </div>
      <p id="confirm-message" style="color:var(--color-text-secondary);margin-bottom:var(--space-6)">${escapeHtml(message)}</p>
      <div style="display:flex;gap:var(--space-3);justify-content:flex-end">
        <button class="btn btn--secondary" id="confirm-cancel">Cancel</button>
        <button class="btn btn--danger" id="confirm-ok">Confirm</button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(modal);

    // Focus the cancel button by default (safe choice)
    document.getElementById('confirm-cancel')?.focus();

    function cleanup(result) {
      overlay.remove();
      modal.remove();
      resolve(result);
    }

    document.getElementById('confirm-ok')?.addEventListener('click', () => cleanup(true));
    document.getElementById('confirm-cancel')?.addEventListener('click', () => cleanup(false));
    overlay.addEventListener('click', () => cleanup(false));

    // Escape key to cancel
    function onKeydown(e) {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', onKeydown);
        cleanup(false);
      }
    }
    document.addEventListener('keydown', onKeydown);
  });
}

// ─── Background Particles ───
function createParticles() {
  const container = document.createElement('div');
  container.className = 'bg-particles';
  container.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 30; i++) {
    const dot = document.createElement('div');
    dot.className = 'bg-particles__dot';
    dot.style.left = `${Math.random() * 100}%`;
    dot.style.animationDuration = `${8 + Math.random() * 15}s`;
    dot.style.animationDelay = `${Math.random() * 10}s`;
    const colors = ['#6c63ff', '#00d4aa', '#ff6b9d', '#54a0ff'];
    dot.style.background = colors[Math.floor(Math.random() * colors.length)];
    container.appendChild(dot);
  }
  return container.outerHTML;
}

// ─── Render App Shell ───
let hashChangeHandler = null;

function renderShell() {
  const app = document.getElementById('app');
  const currentPage = getCurrentPage();
  store.setState('app.currentPage', currentPage);

  app.innerHTML = `
    ${createParticles()}
    <div class="app-shell">
      <!-- Sidebar Overlay (mobile) -->
      <div class="sidebar-overlay" id="sidebar-overlay" aria-hidden="true"></div>

      <!-- Sidebar -->
      <nav class="sidebar" id="sidebar" role="navigation" aria-label="Main navigation">
        <div class="sidebar__brand">
          <div class="sidebar__logo" aria-hidden="true">N</div>
          <div>
            <div class="sidebar__title">NLP Studio</div>
            <div class="sidebar__subtitle">AI Text Analysis</div>
          </div>
        </div>
        <div class="sidebar__nav">
          <div class="nav-section">
            <div class="nav-section__label">Navigation</div>
            ${Object.entries(routes).map(([key, route]) => `
              <button class="nav-item ${currentPage === key ? 'active' : ''}"
                      data-page="${key}"
                      id="nav-${key}"
                      aria-current="${currentPage === key ? 'page' : 'false'}">
                <span class="nav-item__icon" aria-hidden="true">${route.icon}</span>
                <span>${route.title}</span>
              </button>
            `).join('')}
          </div>
          <div class="nav-section" style="margin-top:auto;padding:0 var(--space-4);">
            <div style="padding:var(--space-4);background:var(--gradient-glass);border-radius:var(--radius-md);border:var(--glass-border);">
              <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-bottom:var(--space-2);">NLP Studio v1.0</div>
              <div style="font-size:var(--text-xs);color:var(--color-text-muted);">Client-Side Engine</div>
            </div>
          </div>
        </div>
      </nav>

      <!-- Header -->
      <header class="header" role="banner">
        <button class="menu-toggle btn btn--ghost btn--icon" id="menu-toggle" aria-label="Toggle sidebar menu" aria-expanded="false">☰</button>
        <div class="header__search">
          <span aria-hidden="true">🔍</span>
          <input type="search" class="header__search-input" placeholder="Search analyses..." aria-label="Search analyses" id="global-search" />
        </div>
        <div class="header__actions">
          <span class="badge badge--success" id="status-badge">● Online</span>
        </div>
      </header>

      <!-- Main Content -->
      <main class="main-content" id="main-content" role="main" aria-label="Main content">
        <!-- Pages rendered here -->
      </main>
    </div>
  `;

  attachShellEvents();
  renderPage();
}

function attachShellEvents() {
  // Navigation clicks
  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigate(btn.dataset.page);
      closeMobileSidebar();
    });
  });

  // Mobile menu toggle
  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const isOpen = sidebar?.classList.contains('open');
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('visible', !isOpen);
    document.getElementById('menu-toggle')?.setAttribute('aria-expanded', String(!isOpen));
  });

  // Close sidebar when clicking overlay
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeMobileSidebar);

  // Hash change — only attach once
  if (hashChangeHandler) {
    window.removeEventListener('hashchange', hashChangeHandler);
  }
  hashChangeHandler = () => {
    const page = getCurrentPage();
    if (page !== store.getState('app.currentPage')) navigate(page);
  };
  window.addEventListener('hashchange', hashChangeHandler);

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape to close mobile sidebar
    if (e.key === 'Escape') {
      closeMobileSidebar();
    }
  });

  // Global search functionality
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    let searchDebounce = null;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        const query = searchInput.value.trim().toLowerCase();
        if (query.length > 0) {
          const history = store.getState('history') || [];
          const matches = history.filter(h =>
            h.inputText?.toLowerCase().includes(query) ||
            h.type?.toLowerCase().includes(query)
          );
          if (matches.length > 0) {
            navigate('history');
            showToast(`Found ${matches.length} matching analyses`, 'info');
          } else {
            showToast('No matching analyses found', 'warning');
          }
        }
      }, 500);
    });
  }
}

function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('visible');
  document.getElementById('menu-toggle')?.setAttribute('aria-expanded', 'false');
}

function updateActiveNav(page) {
  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    const isActive = btn.dataset.page === page;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

// ─── Page Renderer ───
function renderPage() {
  const main = document.getElementById('main-content');
  if (!main) return;

  // Cleanup previous page event listeners
  runCleanups();

  const page = store.getState('app.currentPage');
  updateActiveNav(page);

  const renderers = {
    dashboard: renderDashboard,
    analyzer: renderAnalyzer,
    history: renderHistory,
    settings: renderSettings,
    logs: renderLogs
  };

  // Error boundary for page rendering
  try {
    main.innerHTML = '';
    const pageDiv = document.createElement('div');
    pageDiv.className = 'page';
    pageDiv.innerHTML = (renderers[page] || renderDashboard)();
    main.appendChild(pageDiv);
    attachPageEvents(page);
  } catch (err) {
    logger.error(`Failed to render page: ${page}`, { error: err.message });
    main.innerHTML = `
      <div class="page">
        <div class="card card--no-hover">
          <div class="empty-state">
            <div class="empty-state__icon" aria-hidden="true">⚠️</div>
            <h2 class="empty-state__title">Something went wrong</h2>
            <p class="empty-state__text">${escapeHtml(err.message)}</p>
            <button class="btn btn--primary" onclick="location.reload()">Reload App</button>
          </div>
        </div>
      </div>
    `;
  }

  // Scroll to top on page change
  main.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Dashboard Page ───
function renderDashboard() {
  const history = store.getState('history') || [];
  const totalAnalyses = history.length;
  const sentimentCount = history.filter(h => h.type === 'sentiment').length;
  const nerCount = history.filter(h => h.type === 'ner').length;
  const avgTime = history.length > 0
    ? Math.round(history.reduce((s, h) => s + (h.processingTime || 0), 0) / history.length)
    : 0;

  return `
    <div class="page__header">
      <h1 class="page__title">Dashboard</h1>
      <p class="page__description">Welcome to NLP Studio — your AI-powered text analysis toolkit running entirely in the browser.</p>
    </div>

    <div class="stats-grid">
      <div class="card stat-card">
        <div class="stat-card__icon stat-card__icon--primary" aria-hidden="true">📊</div>
        <div class="stat-card__value" id="stat-total">${totalAnalyses}</div>
        <div class="stat-card__label">Total Analyses</div>
      </div>
      <div class="card stat-card">
        <div class="stat-card__icon stat-card__icon--secondary" aria-hidden="true">💬</div>
        <div class="stat-card__value" id="stat-sentiment">${sentimentCount}</div>
        <div class="stat-card__label">Sentiments</div>
      </div>
      <div class="card stat-card">
        <div class="stat-card__icon stat-card__icon--accent" aria-hidden="true">🏷️</div>
        <div class="stat-card__value" id="stat-ner">${nerCount}</div>
        <div class="stat-card__label">NER Scans</div>
      </div>
      <div class="card stat-card">
        <div class="stat-card__icon stat-card__icon--info" aria-hidden="true">⚡</div>
        <div class="stat-card__value">${avgTime}<span style="font-size:var(--text-sm)">ms</span></div>
        <div class="stat-card__label">Avg Processing</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card card--no-hover">
        <div class="card__header">
          <h2 class="card__title">Quick Analysis</h2>
        </div>
        <textarea class="textarea" id="dashboard-input" placeholder="Paste text here for instant analysis..." rows="4" aria-label="Quick analysis input" style="min-height:120px"></textarea>
        <div style="display:flex;gap:var(--space-3);margin-top:var(--space-4);flex-wrap:wrap">
          <button class="btn btn--primary" id="quick-sentiment">💬 Sentiment</button>
          <button class="btn btn--secondary" id="quick-ner">🏷️ Entities</button>
          <button class="btn btn--secondary" id="quick-summary">📄 Summarize</button>
          <button class="btn btn--secondary" id="quick-full" title="Run all analyses">🚀 Full Analysis</button>
        </div>
        <div id="quick-result" style="margin-top:var(--space-4)" aria-live="polite"></div>
      </div>

      <div class="card card--no-hover">
        <div class="card__header">
          <h2 class="card__title">NLP Capabilities</h2>
        </div>
        <div style="display:flex;flex-direction:column;gap:var(--space-3)">
          ${[
            { icon: '💬', name: 'Sentiment Analysis', desc: 'AFINN lexicon with negation & emoji support' },
            { icon: '🏷️', name: 'Entity Recognition', desc: 'People, places, orgs, dates, values' },
            { icon: '📄', name: 'Summarization', desc: 'TF-IDF extractive sentence scoring' },
            { icon: '🌍', name: 'Translation', desc: '28 languages via MyMemory API' },
            { icon: '🎯', name: 'Intent Detection', desc: '10 intent categories with confidence' }
          ].map(cap => `
            <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);background:var(--color-bg-glass);border-radius:var(--radius-md)">
              <span style="font-size:var(--text-xl)" aria-hidden="true">${cap.icon}</span>
              <div>
                <div style="font-weight:600;font-size:var(--text-sm)">${cap.name}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-muted)">${cap.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// ─── Analyzer Page ───
function renderAnalyzer() {
  const languages = getSupportedLanguages();
  const settings = store.getState('settings');

  return `
    <div class="page__header">
      <h1 class="page__title">NLP Analyzer</h1>
      <p class="page__description">Enter text below and select an analysis type to begin. <kbd class="kbd">Ctrl+Enter</kbd> to analyze.</p>
    </div>

    <div class="card card--no-hover" style="margin-bottom:var(--space-6)">
      <label class="label" for="nlp-input">Input Text</label>
      <textarea class="textarea" id="nlp-input" placeholder="Enter or paste your text here for NLP analysis..." aria-label="Text for NLP analysis" rows="8">${escapeHtml(store.getState('nlp.inputText') || '')}</textarea>
      <div class="char-count" id="char-count" aria-live="polite">0 characters · 0 words · 0 sentences</div>
    </div>

    <div class="tabs" role="tablist" aria-label="Analysis type">
      ${['sentiment', 'ner', 'summary', 'translate', 'intent'].map(tab => `
        <button class="tab ${store.getState('nlp.activeTab') === tab ? 'active' : ''}"
                role="tab"
                id="tab-${tab}"
                aria-selected="${store.getState('nlp.activeTab') === tab}"
                aria-controls="panel-${tab}"
                tabindex="${store.getState('nlp.activeTab') === tab ? '0' : '-1'}"
                data-tab="${tab}">
          ${{ sentiment: '💬 Sentiment', ner: '🏷️ NER', summary: '📄 Summary', translate: '🌍 Translate', intent: '🎯 Intent' }[tab]}
        </button>
      `).join('')}
    </div>

    <!-- Tab Panels -->
    <div id="panel-sentiment" class="tab-panel ${store.getState('nlp.activeTab') === 'sentiment' ? 'active' : ''}" role="tabpanel" aria-labelledby="tab-sentiment">
      <div class="toolbar">
        <button class="btn btn--primary" id="run-sentiment">
          <span class="spinner" id="spinner-sentiment" style="display:none" aria-hidden="true"></span>
          Analyze Sentiment
        </button>
      </div>
      <div id="result-sentiment" aria-live="polite"></div>
    </div>

    <div id="panel-ner" class="tab-panel ${store.getState('nlp.activeTab') === 'ner' ? 'active' : ''}" role="tabpanel" aria-labelledby="tab-ner">
      <div class="toolbar">
        <button class="btn btn--primary" id="run-ner">
          <span class="spinner" id="spinner-ner" style="display:none" aria-hidden="true"></span>
          Extract Entities
        </button>
      </div>
      <div id="result-ner" aria-live="polite"></div>
    </div>

    <div id="panel-summary" class="tab-panel ${store.getState('nlp.activeTab') === 'summary' ? 'active' : ''}" role="tabpanel" aria-labelledby="tab-summary">
      <div class="toolbar">
        <button class="btn btn--primary" id="run-summary">
          <span class="spinner" id="spinner-summary" style="display:none" aria-hidden="true"></span>
          Summarize
        </button>
        <label class="label" for="summary-ratio" style="margin:0;margin-left:var(--space-4)">Ratio:</label>
        <select class="select" id="summary-ratio" style="width:auto">
          ${[0.2, 0.3, 0.4, 0.5].map(n => `<option value="${n}" ${settings.summaryRatio === n ? 'selected' : ''}>${Math.round(n * 100)}%</option>`).join('')}
        </select>
      </div>
      <div id="result-summary" aria-live="polite"></div>
    </div>

    <div id="panel-translate" class="tab-panel ${store.getState('nlp.activeTab') === 'translate' ? 'active' : ''}" role="tabpanel" aria-labelledby="tab-translate">
      <div class="toolbar">
        <label class="label" for="lang-from" style="margin:0">From:</label>
        <select class="select" id="lang-from" style="width:auto">
          ${Object.entries(languages).map(([k, v]) => `<option value="${k}" ${k === 'en' ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
        <span style="color:var(--color-text-muted)">→</span>
        <label class="label" for="lang-to" style="margin:0">To:</label>
        <select class="select" id="lang-to" style="width:auto">
          ${Object.entries(languages).map(([k, v]) => `<option value="${k}" ${k === settings.targetLanguage ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
        <button class="btn btn--primary" id="run-translate">
          <span class="spinner" id="spinner-translate" style="display:none" aria-hidden="true"></span>
          Translate
        </button>
      </div>
      <div id="result-translate" aria-live="polite"></div>
    </div>

    <div id="panel-intent" class="tab-panel ${store.getState('nlp.activeTab') === 'intent' ? 'active' : ''}" role="tabpanel" aria-labelledby="tab-intent">
      <div class="toolbar">
        <button class="btn btn--primary" id="run-intent">
          <span class="spinner" id="spinner-intent" style="display:none" aria-hidden="true"></span>
          Detect Intent
        </button>
      </div>
      <div id="result-intent" aria-live="polite"></div>
    </div>
  `;
}

// ─── History Page ───
function renderHistory() {
  const history = store.getState('history') || [];

  if (history.length === 0) {
    return `
      <div class="page__header">
        <h1 class="page__title">Analysis History</h1>
      </div>
      <div class="card card--no-hover">
        <div class="empty-state">
          <div class="empty-state__icon" aria-hidden="true">📜</div>
          <h2 class="empty-state__title">No analyses yet</h2>
          <p class="empty-state__text">Run your first NLP analysis from the Analyzer page to see results here.</p>
          <button class="btn btn--primary" id="go-analyzer">Go to Analyzer</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="page__header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-4)">
      <div>
        <h1 class="page__title">Analysis History</h1>
        <p class="page__description">${history.length} total analyses</p>
      </div>
      <button class="btn btn--danger btn--sm" id="clear-history">Clear All</button>
    </div>
    <div class="history-list">
      ${history.slice().reverse().map((item, i) => `
        <div class="card history-item" data-index="${history.length - 1 - i}">
          <div class="history-item__meta">
            <span class="history-item__type history-item__type--${item.type}">${item.type.toUpperCase()}</span>
            <span class="history-item__time">${new Date(item.timestamp).toLocaleString()}</span>
            <span class="badge badge--primary" style="margin-left:auto">${item.processingTime}ms</span>
          </div>
          <div class="history-item__preview">${escapeHtml(item.inputText?.substring(0, 200) || '...')}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ─── Settings Page ───
function renderSettings() {
  const settings = store.getState('settings');
  return `
    <div class="page__header">
      <h1 class="page__title">Settings</h1>
      <p class="page__description">Configure NLP Studio preferences and engine parameters.</p>
    </div>

    <div class="card card--no-hover">
      <div class="settings-group">
        <h2 class="settings-group__title">General</h2>
        <div class="setting-row">
          <div class="setting-row__info">
            <div class="setting-row__label">Auto-Analyze</div>
            <div class="setting-row__description">Automatically run analysis as you type</div>
          </div>
          <label class="toggle">
            <input type="checkbox" class="toggle__input" id="setting-auto" ${settings.autoAnalyze ? 'checked' : ''} />
            <span class="toggle__slider"></span>
          </label>
        </div>
        <div class="setting-row">
          <div class="setting-row__info">
            <div class="setting-row__label">Show Confidence Scores</div>
            <div class="setting-row__description">Display confidence percentages in results</div>
          </div>
          <label class="toggle">
            <input type="checkbox" class="toggle__input" id="setting-confidence" ${settings.showConfidence ? 'checked' : ''} />
            <span class="toggle__slider"></span>
          </label>
        </div>
        <div class="setting-row">
          <div class="setting-row__info">
            <div class="setting-row__label">Max History Items</div>
            <div class="setting-row__description">Maximum analyses stored in history</div>
          </div>
          <select class="select" id="setting-history-max" style="width:100px">
            ${[25, 50, 100, 200].map(n => `<option value="${n}" ${settings.maxHistoryItems === n ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="settings-group">
        <h2 class="settings-group__title">NLP Engine</h2>
        <div class="setting-row">
          <div class="setting-row__info">
            <div class="setting-row__label">Default Summary Ratio</div>
            <div class="setting-row__description">Proportion of text to keep in summaries</div>
          </div>
          <select class="select" id="setting-summary-ratio" style="width:100px">
            ${[0.2, 0.3, 0.4, 0.5].map(n => `<option value="${n}" ${settings.summaryRatio === n ? 'selected' : ''}>${Math.round(n * 100)}%</option>`).join('')}
          </select>
        </div>
        <div class="setting-row">
          <div class="setting-row__info">
            <div class="setting-row__label">Default Target Language</div>
            <div class="setting-row__description">Default language for translation output</div>
          </div>
          <select class="select" id="setting-target-lang" style="width:140px">
            ${Object.entries(getSupportedLanguages()).map(([k, v]) => `<option value="${k}" ${settings.targetLanguage === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="settings-group">
        <h2 class="settings-group__title">System</h2>
        <div class="setting-row">
          <div class="setting-row__info">
            <div class="setting-row__label">Log Level</div>
            <div class="setting-row__description">Minimum severity level for system logs</div>
          </div>
          <select class="select" id="setting-log-level" style="width:120px">
            ${['debug', 'info', 'warn', 'error'].map(l => `<option value="${l}" ${settings.logLevel === l ? 'selected' : ''}>${l.charAt(0).toUpperCase() + l.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div class="setting-row">
          <div class="setting-row__info">
            <div class="setting-row__label">Export Data</div>
            <div class="setting-row__description">Download all analysis history as JSON</div>
          </div>
          <button class="btn btn--secondary btn--sm" id="export-data">Export JSON</button>
        </div>
      </div>
    </div>
  `;
}

// ─── Logs Page ───
function renderLogs() {
  const logs = store.getState('logs') || [];
  return `
    <div class="page__header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-4)">
      <div>
        <h1 class="page__title">System Logs</h1>
        <p class="page__description">${logs.length} log entries</p>
      </div>
      <button class="btn btn--secondary btn--sm" id="clear-logs">Clear Logs</button>
    </div>
    <div class="card card--no-hover">
      <div class="log-viewer" id="log-viewer" role="log" aria-label="System log viewer">
        ${logs.length === 0 ? '<div style="color:var(--color-text-muted);text-align:center;padding:var(--space-8)">No log entries yet</div>' :
          logs.slice().reverse().map(entry => `
            <div class="log-entry">
              <span class="log-entry__time">${entry.time}</span>
              <span class="log-entry__level log-entry__level--${entry.level}">${entry.level.toUpperCase()}</span>
              <span class="log-entry__msg">${escapeHtml(entry.message)}</span>
            </div>
          `).join('')
        }
      </div>
    </div>
  `;
}

// ─── Result Renderers ───
function renderSentimentResult(data) {
  const r = data.result;
  const scoreNormalized = Math.max(-1, Math.min(1, r.comparative));
  const percentage = Math.round((scoreNormalized + 1) / 2 * 100);
  const circumference = 2 * Math.PI * 60;
  const dashOffset = circumference - (percentage / 100) * circumference;
  const color = r.label.includes('positive') ? '#00d4aa' : r.label.includes('negative') ? '#ff4757' : '#ffb347';

  return `
    <div class="result-section">
      <div class="grid-2">
        <div class="card card--no-hover" style="text-align:center">
          <div class="gauge" role="img" aria-label="Sentiment score: ${percentage}%">
            <svg class="gauge__svg" viewBox="0 0 140 140">
              <circle class="gauge__track" cx="70" cy="70" r="60" />
              <circle class="gauge__fill" cx="70" cy="70" r="60"
                stroke="${color}"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${dashOffset}" />
            </svg>
            <div class="gauge__label">
              <span class="gauge__value" style="color:${color}">${percentage}%</span>
              <span class="gauge__text">${r.label}</span>
            </div>
          </div>
          <div style="margin-top:var(--space-4)">
            <span class="badge badge--primary">Score: ${r.score}</span>
            <span class="badge badge--success" style="margin-left:var(--space-2)">Confidence: ${Math.round(r.confidence * 100)}%</span>
          </div>
        </div>
        <div class="card card--no-hover">
          <h3 style="font-weight:700;margin-bottom:var(--space-4)">Details</h3>
          ${r.positive.length > 0 ? `<div style="margin-bottom:var(--space-3)"><span style="color:#00d4aa;font-weight:600">Positive words:</span> ${r.positive.map(w => `<span class="badge badge--success" style="margin:2px">${escapeHtml(w)}</span>`).join('')}</div>` : ''}
          ${r.negative.length > 0 ? `<div style="margin-bottom:var(--space-3)"><span style="color:#ff4757;font-weight:600">Negative words:</span> ${r.negative.map(w => `<span class="badge badge--danger" style="margin:2px">${escapeHtml(w)}</span>`).join('')}</div>` : ''}
          <div style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-3)">
            Comparative: ${r.comparative} · Tokens: ${r.tokens} · Time: ${data.processingTime}ms
          </div>
          <button class="btn btn--secondary btn--sm copy-result" data-copy="${escapeHtml(JSON.stringify(r))}" style="margin-top:var(--space-3)">📋 Copy Result</button>
        </div>
      </div>
    </div>
  `;
}

function renderNERResult(data) {
  const { entities, counts, annotatedText } = data.result;
  return `
    <div class="result-section">
      <div class="card card--no-hover" style="margin-bottom:var(--space-4)">
        <div class="result-section__header">
          <h3 class="result-section__title">Annotated Text</h3>
          <span class="result-section__badge">${entities.length} entities</span>
        </div>
        <div style="line-height:2;font-size:var(--text-base)">${annotatedText}</div>
        <div class="entity-legend">
          ${Object.entries(ENTITY_TYPES).map(([key, val]) => `
            <div class="entity-legend__item">
              <span class="entity-legend__dot entity-legend__dot--${key}"></span>
              ${val.label} (${counts[key] || 0})
            </div>
          `).join('')}
        </div>
      </div>
      ${entities.length > 0 ? `
        <div class="card card--no-hover">
          <h3 style="font-weight:700;margin-bottom:var(--space-4)">Entity List</h3>
          <div style="display:flex;flex-direction:column;gap:var(--space-2)">
            ${entities.map(e => `
              <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) var(--space-3);background:var(--color-bg-glass);border-radius:var(--radius-sm)">
                <span class="badge badge--${e.type === 'person' ? 'primary' : e.type === 'place' ? 'success' : e.type === 'organization' ? 'danger' : 'warning'}">${e.label}</span>
                <span style="font-weight:600">${escapeHtml(e.text)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderSummaryResult(data) {
  const r = data.result;
  return `
    <div class="result-section">
      <div class="card card--no-hover">
        <div class="result-section__header">
          <h3 class="result-section__title">Summary</h3>
          <span class="result-section__badge">${Math.round(r.compressionRatio * 100)}% compressed</span>
        </div>
        <div class="summary-box">${escapeHtml(r.summary)}</div>
        <div style="display:flex;gap:var(--space-4);margin-top:var(--space-4);flex-wrap:wrap;font-size:var(--text-sm);color:var(--color-text-muted)">
          <span>📏 Original: ${r.originalLength} chars</span>
          <span>📄 Summary: ${r.summaryLength} chars</span>
          <span>📝 Sentences: ${r.sentenceCount}</span>
          <span>⚡ Time: ${data.processingTime}ms</span>
        </div>
        <button class="btn btn--secondary btn--sm copy-result" data-copy="${escapeHtml(r.summary)}" style="margin-top:var(--space-3)">📋 Copy Summary</button>
      </div>
    </div>
  `;
}

function renderTranslateResult(data) {
  const r = data.result;
  return `
    <div class="result-section">
      <div class="grid-2">
        <div class="card card--no-hover">
          <h3 style="font-weight:700;margin-bottom:var(--space-3)">${escapeHtml(r.fromName)}</h3>
          <div style="padding:var(--space-4);background:var(--color-bg-glass);border-radius:var(--radius-md);line-height:1.8">${escapeHtml(store.getState('nlp.inputText') || '')}</div>
        </div>
        <div class="card card--no-hover">
          <h3 style="font-weight:700;margin-bottom:var(--space-3)">${escapeHtml(r.toName)}</h3>
          <div style="padding:var(--space-4);background:var(--color-bg-glass);border-radius:var(--radius-md);line-height:1.8">${escapeHtml(r.translatedText)}</div>
          <button class="btn btn--secondary btn--sm copy-result" data-copy="${escapeHtml(r.translatedText)}" style="margin-top:var(--space-3)">📋 Copy Translation</button>
        </div>
      </div>
      <div style="margin-top:var(--space-3);font-size:var(--text-sm);color:var(--color-text-muted)">
        ${r.cached ? '⚡ Cached result' : `⏱ ${data.processingTime}ms`} · Confidence: ${Math.round((r.confidence || 0) * 100)}%
      </div>
    </div>
  `;
}

function renderIntentResult(data) {
  const r = data.result;
  return `
    <div class="result-section">
      <div class="card card--no-hover">
        <div class="result-section__header">
          <h3 class="result-section__title">Primary Intent</h3>
          <span class="badge badge--primary" style="font-size:var(--text-sm)">${escapeHtml(r.primaryIntent.label)}</span>
        </div>
        <ul class="intent-list" aria-label="Detected intents">
          ${r.intents.map(intent => `
            <li class="intent-item">
              <span class="intent-item__label">${escapeHtml(intent.label)}</span>
              <div class="intent-item__bar" role="progressbar" aria-valuenow="${Math.round(intent.confidence * 100)}" aria-valuemin="0" aria-valuemax="100">
                <div class="intent-item__fill" style="width:${Math.round(intent.confidence * 100)}%"></div>
              </div>
              <span class="intent-item__score">${Math.round(intent.confidence * 100)}%</span>
            </li>
          `).join('')}
        </ul>
        <div style="margin-top:var(--space-4);font-size:var(--text-sm);color:var(--color-text-muted)">
          ⚡ ${data.processingTime}ms
        </div>
      </div>
    </div>
  `;
}

// ─── Page Event Attachment ───
function attachPageEvents(page) {
  // Copy-to-clipboard buttons (available on all pages with results)
  document.querySelectorAll('.copy-result').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.copy;
      if (text && navigator.clipboard) {
        navigator.clipboard.writeText(text).then(
          () => showToast('Copied to clipboard!', 'success'),
          () => showToast('Failed to copy', 'error')
        );
      }
    });
  });

  if (page === 'dashboard') {
    attachDashboardEvents();
  } else if (page === 'analyzer') {
    attachAnalyzerEvents();
  } else if (page === 'history') {
    document.getElementById('go-analyzer')?.addEventListener('click', () => navigate('analyzer'));
    document.getElementById('clear-history')?.addEventListener('click', async () => {
      const confirmed = await showConfirmDialog('Clear History', 'Are you sure you want to delete all analysis history? This action cannot be undone.');
      if (confirmed) {
        store.setState('history', []);
        showToast('History cleared', 'success');
        renderPage();
      }
    });
    // History item click to view details
    document.querySelectorAll('.history-item[data-index]').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.index);
        const history = store.getState('history') || [];
        const entry = history[idx];
        if (entry) {
          store.setState('nlp.inputText', entry.inputText || '');
          navigate('analyzer');
          showToast(`Loaded ${entry.type} analysis from history`, 'info');
        }
      });
    });
  } else if (page === 'settings') {
    attachSettingsEvents();
  } else if (page === 'logs') {
    document.getElementById('clear-logs')?.addEventListener('click', async () => {
      const confirmed = await showConfirmDialog('Clear Logs', 'Are you sure you want to clear all system logs?');
      if (confirmed) {
        store.setState('logs', []);
        showToast('Logs cleared', 'success');
        renderPage();
      }
    });
  }
}

function attachDashboardEvents() {
  const input = document.getElementById('dashboard-input');
  if (!input) return;

  const runQuick = async (type) => {
    const text = input.value.trim();
    const validation = validateTextInput(text);
    if (!validation.valid) {
      showToast(validation.errors[0], 'warning');
      return;
    }
    store.setState('nlp.inputText', text);
    try {
      const result = await runAnalysis(type, validation.sanitized);
      addToHistory(type, text, result);
      const container = document.getElementById('quick-result');
      if (container) {
        const renderers = { sentiment: renderSentimentResult, ner: renderNERResult, summary: renderSummaryResult };
        container.innerHTML = renderers[type] ? renderers[type](result) : `<div class="card card--no-hover"><pre style="white-space:pre-wrap;font-size:var(--text-sm)">${escapeHtml(JSON.stringify(result.result, null, 2))}</pre></div>`;
        // Re-attach copy buttons for new results
        container.querySelectorAll('.copy-result').forEach(btn => {
          btn.addEventListener('click', () => {
            const copyText = btn.dataset.copy;
            if (copyText && navigator.clipboard) {
              navigator.clipboard.writeText(copyText).then(
                () => showToast('Copied to clipboard!', 'success'),
                () => showToast('Failed to copy', 'error')
              );
            }
          });
        });
      }
      showToast(`${type} analysis complete`, 'success');
    } catch (err) {
      showToast(`Analysis failed: ${err.message}`, 'error');
    }
  };

  document.getElementById('quick-sentiment')?.addEventListener('click', () => runQuick('sentiment'));
  document.getElementById('quick-ner')?.addEventListener('click', () => runQuick('ner'));
  document.getElementById('quick-summary')?.addEventListener('click', () => runQuick('summary'));
  document.getElementById('quick-full')?.addEventListener('click', async () => {
    const text = input.value.trim();
    const validation = validateTextInput(text);
    if (!validation.valid) { showToast(validation.errors[0], 'warning'); return; }
    store.setState('nlp.inputText', text);
    try {
      const result = await runFullPipeline(validation.sanitized);
      for (const [type, res] of Object.entries(result.results)) {
        addToHistory(type, text, res);
      }
      showToast(`Full analysis complete in ${result.totalTime}ms`, 'success');
      navigate('analyzer');
      // Render first result
      setTimeout(() => {
        const r = result.results.sentiment;
        if (r) {
          const container = document.getElementById('result-sentiment');
          if (container) container.innerHTML = renderSentimentResult(r);
        }
      }, 100);
    } catch (err) {
      showToast(`Pipeline failed: ${err.message}`, 'error');
    }
  });
}

function attachAnalyzerEvents() {
  const input = document.getElementById('nlp-input');
  const charCount = document.getElementById('char-count');

  // Update char count
  if (input) {
    const updateCount = () => {
      const stats = getTextStats(input.value);
      if (charCount) charCount.textContent = `${stats.characters} characters · ${stats.words} words · ${stats.sentences} sentences`;
      store.setState('nlp.inputText', input.value);
    };
    input.addEventListener('input', updateCount);
    registerCleanup(() => input.removeEventListener('input', updateCount));
    updateCount(); // Initial

    // Ctrl+Enter to run active analysis
    input.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const activeTab = store.getState('nlp.activeTab') || 'sentiment';
        document.getElementById(`run-${activeTab}`)?.click();
      }
    });
  }

  // Tab switching with keyboard support
  const tabs = document.querySelectorAll('.tab[data-tab]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));

    // Arrow key navigation for tabs (ARIA pattern)
    tab.addEventListener('keydown', (e) => {
      const tabList = ['sentiment', 'ner', 'summary', 'translate', 'intent'];
      const currentIdx = tabList.indexOf(tab.dataset.tab);
      let nextIdx = -1;

      if (e.key === 'ArrowRight') {
        nextIdx = (currentIdx + 1) % tabList.length;
      } else if (e.key === 'ArrowLeft') {
        nextIdx = (currentIdx - 1 + tabList.length) % tabList.length;
      } else if (e.key === 'Home') {
        nextIdx = 0;
      } else if (e.key === 'End') {
        nextIdx = tabList.length - 1;
      }

      if (nextIdx >= 0) {
        e.preventDefault();
        const nextTab = document.getElementById(`tab-${tabList[nextIdx]}`);
        if (nextTab) {
          nextTab.focus();
          switchTab(tabList[nextIdx]);
        }
      }
    });
  });

  // Analysis buttons
  const analysisTypes = ['sentiment', 'ner', 'summary', 'translate', 'intent'];
  for (const type of analysisTypes) {
    document.getElementById(`run-${type}`)?.addEventListener('click', () => runAnalysisFromUI(type));
  }
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
    t.setAttribute('tabindex', '-1');
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

  const activeTab = document.getElementById(`tab-${tabName}`);
  if (activeTab) {
    activeTab.classList.add('active');
    activeTab.setAttribute('aria-selected', 'true');
    activeTab.setAttribute('tabindex', '0');
  }
  const panel = document.getElementById(`panel-${tabName}`);
  if (panel) panel.classList.add('active');
  store.setState('nlp.activeTab', tabName);
}

async function runAnalysisFromUI(type) {
  const input = document.getElementById('nlp-input');
  const text = input?.value?.trim();
  const validation = validateTextInput(text);
  if (!validation.valid) {
    showToast(validation.errors[0], 'warning');
    return;
  }

  const spinner = document.getElementById(`spinner-${type}`);
  const btn = document.getElementById(`run-${type}`);
  if (spinner) spinner.style.display = 'inline-block';
  if (btn) btn.disabled = true;

  try {
    const options = {};
    if (type === 'summary') {
      const ratioEl = document.getElementById('summary-ratio');
      options.ratio = parseFloat(ratioEl?.value || '0.3');
    }
    if (type === 'translate') {
      options.from = document.getElementById('lang-from')?.value || 'en';
      options.to = document.getElementById('lang-to')?.value || 'es';
    }

    const result = await runAnalysis(type, sanitizeInput(text), options);
    store.setState(`nlp.results.${type}`, result);
    addToHistory(type, text, result);

    const container = document.getElementById(`result-${type}`);
    if (container) {
      const renderers = {
        sentiment: renderSentimentResult,
        ner: renderNERResult,
        summary: renderSummaryResult,
        translate: renderTranslateResult,
        intent: renderIntentResult
      };
      container.innerHTML = renderers[type](result);

      // Attach copy buttons for newly rendered results
      container.querySelectorAll('.copy-result').forEach(copyBtn => {
        copyBtn.addEventListener('click', () => {
          const copyText = copyBtn.dataset.copy;
          if (copyText && navigator.clipboard) {
            navigator.clipboard.writeText(copyText).then(
              () => showToast('Copied to clipboard!', 'success'),
              () => showToast('Failed to copy', 'error')
            );
          }
        });
      });
    }
    showToast(`${type} analysis complete in ${result.processingTime}ms`, 'success');
  } catch (err) {
    showToast(`Analysis failed: ${err.message}`, 'error');
    logger.error(`${type} analysis error`, { error: err.message });
  } finally {
    if (spinner) spinner.style.display = 'none';
    if (btn) btn.disabled = false;
  }
}

function addToHistory(type, inputText, result) {
  const history = store.getState('history') || [];
  const maxItems = store.getState('settings.maxHistoryItems') || 50;
  history.push({
    type,
    inputText: inputText.substring(0, 500),
    result: result.result,
    processingTime: result.processingTime,
    timestamp: result.timestamp
  });
  if (history.length > maxItems) history.splice(0, history.length - maxItems);
  store.setState('history', history);
}

function attachSettingsEvents() {
  document.getElementById('setting-auto')?.addEventListener('change', (e) => {
    store.setState('settings.autoAnalyze', e.target.checked);
    showToast('Auto-analyze ' + (e.target.checked ? 'enabled' : 'disabled'), 'info');
  });
  document.getElementById('setting-confidence')?.addEventListener('change', (e) => {
    store.setState('settings.showConfidence', e.target.checked);
  });
  document.getElementById('setting-history-max')?.addEventListener('change', (e) => {
    store.setState('settings.maxHistoryItems', parseInt(e.target.value));
  });
  document.getElementById('setting-summary-ratio')?.addEventListener('change', (e) => {
    store.setState('settings.summaryRatio', parseFloat(e.target.value));
  });
  document.getElementById('setting-target-lang')?.addEventListener('change', (e) => {
    store.setState('settings.targetLanguage', e.target.value);
  });
  document.getElementById('setting-log-level')?.addEventListener('change', (e) => {
    store.setState('settings.logLevel', e.target.value);
    logger.setLevel(e.target.value);
    showToast(`Log level set to ${e.target.value}`, 'info');
  });
  document.getElementById('export-data')?.addEventListener('click', () => {
    const data = {
      history: store.getState('history'),
      settings: store.getState('settings'),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nlp-studio-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully', 'success');
  });
}

// ─── App Initialization ───
function init() {
  logger.info('NLP Studio initializing...');

  // Render the app shell
  renderShell();

  // Hide loader with fade animation
  setTimeout(() => {
    const loader = document.getElementById('loader');
    if (loader) loader.classList.add('hidden');
  }, 800);

  logger.info('NLP Studio ready');
  showToast('NLP Studio initialized', 'success');
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { navigate, showToast, store };
