/**
 * UI rendering module — results cards, section browser, bulletins
 * All HTML output is sanitized via DOMPurify before DOM insertion.
 */
import { copyCitation, formatCitation } from './clipboard.js';

/* global DOMPurify */

/** Safely set element HTML content via DOMPurify */
function safeSetHTML(el, html) {
  el.textContent = '';
  const clean = DOMPurify.sanitize(html, { ADD_TAGS: ['mark'], ADD_ATTR: ['data-citation'] });
  const template = document.createElement('template');
  template.innerHTML = clean;
  el.appendChild(template.content);
}

// --- Result Cards ---

export function renderResults(results, query, container) {
  if (!container) return;

  if (!results || results.length === 0) {
    if (query && query.length >= 2) {
      const div = document.createElement('div');
      div.className = 'no-results';
      const icon = document.createElement('p');
      icon.className = 'no-results-icon';
      icon.textContent = '🔍';
      const msg = document.createElement('p');
      msg.textContent = `No matching clauses found for "${query}"`;
      const hint = document.createElement('p');
      hint.className = 'no-results-hint';
      hint.textContent = 'Try different keywords or switch to Browse mode';
      div.append(icon, msg, hint);
      container.textContent = '';
      container.appendChild(div);
    } else {
      container.textContent = '';
    }
    return;
  }

  const html = results.map(r => renderResultCard(r, query)).join('');
  safeSetHTML(container, html);
  bindCopyButtons(container);
}

function renderResultCard(result, query) {
  const isScenario = result.type === 'scenario';
  const bulletinBadge = result.hasBulletin
    ? '<span class="bulletin-badge" title="Has associated TSSA bulletin">⚠️ TSSA</span>'
    : '';
  const severityClass = result.severity ? `severity-${result.severity}` : '';
  const codeLabel = result.codeStandard.includes('B149.1')
    ? '<span class="code-badge b149-1">B149.1</span>'
    : '<span class="code-badge b149-2">B149.2</span>';

  const relatedHtml = isScenario && result.relatedClauses.length > 0
    ? `<div class="related-clauses">Related: ${result.relatedClauses.map(c =>
        `<span class="related-chip">${esc(c)}</span>`
      ).join(' ')}</div>`
    : '';

  const categoryHtml = result.category
    ? `<span class="category-pill">${esc(result.category)}</span>`
    : '';

  return `
    <div class="result-card ${severityClass}" data-clause="${esc(result.clause)}">
      <div class="card-header">
        <div class="clause-number">${esc(result.clause)}</div>
        <div class="card-badges">
          ${codeLabel}
          ${bulletinBadge}
          ${categoryHtml}
        </div>
      </div>
      <h3 class="card-title">${highlightMatch(result.title || '', query)}</h3>
      <p class="card-desc">${highlightMatch(truncate(result.description, 300), query)}</p>
      ${relatedHtml}
      <div class="card-actions">
        <button class="copy-btn" data-citation="${esc(result.citation)}">
          📋 Copy Citation
        </button>
        <span class="citation-preview">${esc(result.citation)}</span>
      </div>
    </div>`;
}

function bindCopyButtons(container) {
  container.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      copyCitation(btn.dataset.citation, btn);
    });
  });
}

// --- Section Browser ---

export function renderSectionBrowser(tree, container) {
  if (!container) return;

  const html = tree.map(code => `
    <div class="code-tree">
      <h2 class="code-tree-title">
        <span class="code-badge ${code.code.includes('B149.1') ? 'b149-1' : 'b149-2'}">
          ${esc(code.code)}
        </span>
        ${esc(code.title)}
      </h2>
      ${code.sections.map(sec => renderSectionNode(sec, code.code)).join('')}
    </div>
  `).join('');

  safeSetHTML(container, html);

  container.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', () => {
      const body = header.nextElementSibling;
      const arrow = header.querySelector('.section-arrow');
      body.classList.toggle('hidden');
      arrow.textContent = body.classList.contains('hidden') ? '▶' : '▼';
    });
  });

  bindCopyButtons(container);
}

function renderSectionNode(sec, codeStandard) {
  const codeShort = codeStandard.includes('B149.1') ? 'B149.1-25' : 'B149.2-25';
  return `
    <div class="section-node">
      <div class="section-header">
        <span class="section-arrow">▶</span>
        <span class="section-label">Section ${esc(sec.section)}</span>
        <span class="section-title">${esc(sec.sectionTitle)}</span>
        <span class="clause-count">${sec.clauses.length}</span>
      </div>
      <div class="section-body hidden">
        ${sec.clauses.map(c => `
          <div class="browse-clause">
            <div class="browse-clause-header">
              <span class="clause-num">${esc(c.clause)}</span>
              <span class="browse-title">${esc(c.title || '')}</span>
            </div>
            ${c.description ? `<p class="browse-desc">${esc(truncate(c.description, 200))}</p>` : ''}
            <button class="copy-btn small" data-citation="CSA ${codeShort} Clause ${esc(c.clause)}">
              📋 Copy
            </button>
          </div>
        `).join('')}
      </div>
    </div>`;
}

// --- Bulletins ---

export function renderBulletins(bulletinList, container) {
  if (!container || !bulletinList || bulletinList.length === 0) {
    if (container) {
      container.textContent = '';
      const p = document.createElement('p');
      p.className = 'no-bulletins';
      p.textContent = 'No bulletins available.';
      container.appendChild(p);
    }
    return;
  }

  const html = bulletinList.map(b => `
    <div class="bulletin-card">
      <div class="bulletin-header">
        <span class="bulletin-number">${esc(b.document_number || b.id)}</span>
        <span class="bulletin-date">${esc(b.date || '')}</span>
      </div>
      <h3 class="bulletin-title">${esc(b.title)}</h3>
      <p class="bulletin-summary">${esc(b.summary || '')}</p>
      ${b.related_clauses && b.related_clauses.length > 0
        ? `<div class="bulletin-clauses">Affects: ${b.related_clauses.map(c =>
            `<span class="related-chip">${esc(c)}</span>`
          ).join(' ')}</div>`
        : ''}
      ${b.tssa_url ? `<a href="${esc(b.tssa_url)}" target="_blank" rel="noopener" class="bulletin-link">View on TSSA →</a>` : ''}
    </div>
  `).join('');

  safeSetHTML(container, html);
}

// --- Stats Bar ---

export function renderStats(counts) {
  return `
    <div class="stats-bar">
      <span>${counts.b149_1} B149.1 clauses</span>
      <span class="stat-sep">•</span>
      <span>${counts.b149_2} B149.2 clauses</span>
      <span class="stat-sep">•</span>
      <span>${counts.scenarios} scenarios</span>
    </div>`;
}

// --- Helpers ---

function highlightMatch(text, query) {
  if (!query || !text) return esc(text || '');
  const escaped = esc(text);
  const words = query.split(/\s+/).filter(w => w.length > 1).map(escapeRegex);
  if (words.length === 0) return escaped;
  const re = new RegExp(`(${words.join('|')})`, 'gi');
  return escaped.replace(re, '<mark>$1</mark>');
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function truncate(str, max) {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max) + '…';
}