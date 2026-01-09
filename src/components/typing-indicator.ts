import type { ThemeConfig } from '../types';

/**
 * Typing indicator component.
 * Shows animated dots while the assistant is responding.
 */
export class TypingIndicator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.render();
  }

  /**
   * Show the typing indicator.
   */
  show(): void {
    this.removeAttribute('hidden');
  }

  /**
   * Hide the typing indicator.
   */
  hide(): void {
    this.setAttribute('hidden', '');
  }

  /**
   * Set theme colors.
   */
  setTheme(config: ThemeConfig): void {
    if (config.primaryColor) {
      this.style.setProperty('--dot-color', config.primaryColor);
    }
  }

  private render(): void {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --dot-color: #6366f1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
        }

        :host([hidden]) {
          display: none;
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
        }

        .dots {
          display: flex;
          gap: 4px;
          padding: 12px 16px;
          background: #f3f4f6;
          border-radius: 16px;
          border-bottom-left-radius: 4px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--dot-color);
          opacity: 0.4;
          animation: bounce 1.4s infinite ease-in-out;
        }

        .dot:nth-child(1) {
          animation-delay: 0s;
        }

        .dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          40% {
            transform: translateY(-6px);
            opacity: 1;
          }
        }
      </style>

      <div class="avatar">&#129302;</div>
      <div class="dots">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    `;
  }
}
