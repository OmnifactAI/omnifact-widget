/**
 * Floating chat bubble component.
 * Displays a circular button that triggers the chat window.
 */
export class ChatBubble extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hasUnread = false;
  }

  connectedCallback() {
    this.render();
    this._setupEventListeners();
  }

  /**
   * Set whether there are unread messages (shows pulse animation).
   */
  set hasUnread(value) {
    this._hasUnread = value;
    const bubble = this.shadowRoot.querySelector('.bubble');
    if (bubble) {
      bubble.classList.toggle('pulse', value);
    }
  }

  get hasUnread() {
    return this._hasUnread;
  }

  /**
   * Set the primary color of the bubble.
   */
  set primaryColor(value) {
    this.style.setProperty('--bubble-color', value);
  }

  /**
   * Set whether the chat is currently open (changes icon).
   */
  set isOpen(value) {
    this._isOpen = value;
    const chatIcon = this.shadowRoot.querySelector('.chat-icon');
    const closeIcon = this.shadowRoot.querySelector('.close-icon');
    if (chatIcon && closeIcon) {
      chatIcon.style.display = value ? 'none' : 'block';
      closeIcon.style.display = value ? 'block' : 'none';
    }
  }

  _setupEventListeners() {
    const bubble = this.shadowRoot.querySelector('.bubble');
    bubble.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('toggle', {
        bubbles: true,
        composed: true
      }));
    });
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --bubble-color: #6366f1;
          display: block;
        }

        .bubble {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--bubble-color);
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 0;
        }

        .bubble:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }

        .bubble:active {
          transform: scale(0.95);
        }

        .bubble.pulse::after {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: var(--bubble-color);
          animation: pulse 2s infinite;
          z-index: -1;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.7;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        .icon {
          width: 28px;
          height: 28px;
          fill: white;
        }

        .close-icon {
          display: none;
        }
      </style>

      <button class="bubble" aria-label="Open chat">
        <svg class="icon chat-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
          <path d="M7 9h10v2H7zm0-3h10v2H7z"/>
        </svg>
        <svg class="icon close-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    `;
  }
}
