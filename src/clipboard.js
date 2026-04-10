/**
 * Citation clipboard utility for TSSA tag entry
 */

const TOAST_DURATION = 2000;

/**
 * Copy citation string to clipboard and show visual confirmation
 * @param {string} citation - e.g., "CSA B149.1-25 Clause 4.13.1"
 * @param {HTMLElement} button - The button that was clicked (for visual feedback)
 */
export async function copyCitation(citation, button) {
  try {
    await navigator.clipboard.writeText(citation);
    // Haptic feedback on supported mobile devices
    if (navigator.vibrate) navigator.vibrate(50);
    showToast('Copied — paste into TSSA tag');
    if (button) {
      const original = button.textContent;
      button.textContent = '✓ Copied';
      button.classList.add('copied');
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove('copied');
      }, TOAST_DURATION);
    }
  } catch {
    // Fallback for older browsers / non-HTTPS
    fallbackCopy(citation);
    showToast('Copied!');
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add('hidden'), TOAST_DURATION);
}

/**
 * Format a citation string for TSSA tag entry
 * @param {string} codeStandard - "B149.1-25" or "B149.2-25"
 * @param {string} clause - e.g., "4.13.1"
 */
export function formatCitation(codeStandard, clause) {
  return `CSA ${codeStandard} Clause ${clause}`;
}