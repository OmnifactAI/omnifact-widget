import type { ThemeConfig } from '../types';

/**
 * Message list component.
 * Scrollable container for chat messages.
 */
export class MessageList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.render();
  }

  /**
   * Scroll to the bottom of the message list.
   */
  scrollToBottom(smooth = true): void {
    const container = this.shadowRoot?.querySelector('.messages');
    if (container) {
      // Use scrollTop assignment for more reliable scrolling
      if (smooth) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    }
  }

  /**
   * Check if the user is near the bottom of the list.
   */
  isNearBottom(): boolean {
    const container = this.shadowRoot?.querySelector('.messages');
    if (!container) return true;

    const threshold = 100;
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }

  /**
   * Set theme colors.
   */
  setTheme(config: ThemeConfig): void {
    if (config.backgroundColor) {
      this.style.setProperty('--background-color', config.backgroundColor);
    }
  }

  private render(): void {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --background-color: #ffffff;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: var(--background-color);
        }

        .messages::-webkit-scrollbar {
          width: 6px;
        }

        .messages::-webkit-scrollbar-track {
          background: transparent;
        }

        .messages::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }

        .messages::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        ::slotted(*) {
          flex-shrink: 0;
        }
      </style>

      <div class="messages">
        <slot></slot>
      </div>
    `;
  }
}
