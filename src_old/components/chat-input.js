/**
 * Chat input component.
 * Text input area with send button.
 */
export class ChatInput extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._disabled = false;
  }

  static get observedAttributes() {
    return ['disabled', 'placeholder'];
  }

  connectedCallback() {
    this.render();
    this._setupEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected) return;

    if (name === 'disabled') {
      this._disabled = newValue !== null;
      this._updateDisabledState();
    } else if (name === 'placeholder') {
      const textarea = this.shadowRoot.querySelector('textarea');
      if (textarea) {
        textarea.placeholder = newValue || 'Type a message...';
      }
    }
  }

  /**
   * Set whether the input is disabled.
   */
  set disabled(value) {
    this._disabled = value;
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
    this._updateDisabledState();
  }

  get disabled() {
    return this._disabled;
  }

  /**
   * Focus the input field.
   */
  focus() {
    const textarea = this.shadowRoot.querySelector('textarea');
    if (textarea) {
      textarea.focus();
    }
  }

  /**
   * Clear the input field.
   */
  clear() {
    const textarea = this.shadowRoot.querySelector('textarea');
    if (textarea) {
      textarea.value = '';
      this._adjustHeight(textarea);
    }
  }

  /**
   * Set theme colors.
   */
  setTheme(config) {
    const style = this.style;
    if (config.primaryColor) style.setProperty('--primary-color', config.primaryColor);
    if (config.backgroundColor) style.setProperty('--background-color', config.backgroundColor);
    if (config.textColor) style.setProperty('--text-color', config.textColor);
  }

  _updateDisabledState() {
    const textarea = this.shadowRoot.querySelector('textarea');
    const button = this.shadowRoot.querySelector('button');
    if (textarea) textarea.disabled = this._disabled;
    if (button) button.disabled = this._disabled;
  }

  _setupEventListeners() {
    const textarea = this.shadowRoot.querySelector('textarea');
    const button = this.shadowRoot.querySelector('button');

    // Auto-resize textarea
    textarea.addEventListener('input', () => {
      this._adjustHeight(textarea);
    });

    // Send on Enter (without Shift)
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._send();
      }
    });

    // Send button click
    button.addEventListener('click', () => {
      this._send();
    });
  }

  _adjustHeight(textarea) {
    textarea.style.height = 'auto';
    const maxHeight = 120;
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
  }

  _send() {
    if (this._disabled) return;

    const textarea = this.shadowRoot.querySelector('textarea');
    const message = textarea.value.trim();

    if (!message) return;

    this.dispatchEvent(new CustomEvent('send', {
      bubbles: true,
      composed: true,
      detail: { message }
    }));

    textarea.value = '';
    this._adjustHeight(textarea);
  }

  render() {
    const placeholder = this.getAttribute('placeholder') || 'Type a message...';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --primary-color: #6366f1;
          --background-color: #ffffff;
          --text-color: #1f2937;
          --border-color: #e5e7eb;
          display: block;
          padding: 12px 16px;
          background: var(--background-color);
          border-top: 1px solid var(--border-color);
        }

        .input-container {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }

        textarea {
          flex: 1;
          resize: none;
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 10px 16px;
          font-size: 14px;
          font-family: inherit;
          line-height: 1.4;
          max-height: 120px;
          min-height: 40px;
          height: 40px;
          background: var(--background-color);
          color: var(--text-color);
          outline: none;
          transition: border-color 0.2s;
        }

        textarea:focus {
          border-color: var(--primary-color);
        }

        textarea:disabled {
          background: #f9fafb;
          cursor: not-allowed;
        }

        textarea::placeholder {
          color: #9ca3af;
        }

        button {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: var(--primary-color);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, background-color 0.2s;
          flex-shrink: 0;
        }

        button:hover:not(:disabled) {
          transform: scale(1.05);
        }

        button:active:not(:disabled) {
          transform: scale(0.95);
        }

        button:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        button svg {
          width: 20px;
          height: 20px;
          fill: white;
        }
      </style>

      <div class="input-container">
        <textarea
          placeholder="${placeholder}"
          rows="1"
          ${this._disabled ? 'disabled' : ''}
        ></textarea>
        <button
          type="button"
          aria-label="Send message"
          ${this._disabled ? 'disabled' : ''}
        >
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    `;
  }
}
