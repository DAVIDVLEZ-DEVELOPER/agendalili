/**
 * Módulo de Notificaciones Glassmorphism (Toast & Banner Alerts)
 * Muestra excepciones deterministas SDD (TaskValidationException, ScheduleConflictException, CommitmentValidationException)
 */

import { escapeHtml } from './validators.js';

export class NotificationManager {
  constructor(toastStackEl, globalBannerEl) {
    this.toastStackEl = toastStackEl;
    this.globalBannerEl = globalBannerEl;
  }

  /**
   * Lanza un toast flotante de cristal esmerilado
   * @param {object} opts
   * @param {string} opts.title
   * @param {string} opts.message
   * @param {'success'|'error'|'warning'} [opts.type]
   * @param {string} [opts.ruleCode]
   */
  pushToast({ title, message, type = 'success', ruleCode = '' }) {
    if (this.globalBannerEl) {
      const alertClass =
        type === 'error'
          ? 'glass-alert--error'
          : type === 'warning'
          ? 'glass-alert--warning'
          : 'glass-alert--success';

      this.globalBannerEl.className = `glass-alert ${alertClass} mb-3`;
      this.globalBannerEl.innerHTML = `
        <div class="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2">
          <div>
            <strong>${escapeHtml(title)}:</strong> ${escapeHtml(message)}
          </div>
          ${ruleCode ? `<span class="badge-rule">${escapeHtml(ruleCode)}</span>` : ''}
        </div>
      `;
      this.globalBannerEl.classList.remove('d-none');
      clearTimeout(this._bannerTimer);
      this._bannerTimer = setTimeout(() => {
        this.globalBannerEl.classList.add('d-none');
      }, 6500);
    }

    if (!this.toastStackEl) return;

    const toast = document.createElement('div');
    toast.className = `glass-toast glass-toast--${type}`;
    toast.setAttribute('role', 'status');

    const icon = type === 'error' ? '⨯' : type === 'warning' ? '⚠' : '✓';

    toast.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
        <div class="fw-bold small d-flex align-items-center gap-2">
          <span>${icon}</span>
          <span>${escapeHtml(title)}</span>
        </div>
        <div class="d-flex align-items-center gap-1">
          ${ruleCode ? `<span class="badge-rule">${escapeHtml(ruleCode)}</span>` : ''}
          <button type="button" class="toast-close-btn" aria-label="Cerrar">✕</button>
        </div>
      </div>
      <div class="small" style="color: var(--text-secondary);">
        ${escapeHtml(message)}
      </div>
    `;

    const closeBtn = toast.querySelector('.toast-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => toast.remove());
    }

    this.toastStackEl.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 5200);
  }
}
