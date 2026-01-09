/**
 * Configuration manager for the Omnifact Chat Widget.
 * Handles loading configuration from JSON script tags and HTML attributes.
 * Priority: HTML attributes > JSON config > defaults
 */
export class ConfigManager {
  static defaults = {
    endpointUrl: '',
    endpointId: '',
    apiKey: '',
    position: 'bottom-right',
    title: 'Chat with us',
    welcomeMessage: 'Hello! How can I help you today?',
    primaryColor: '#6366f1',
    secondaryColor: '#818cf8',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    storageKey: 'omnifact-chat',
    enablePersistence: true,
    enableInlineSources: false,
    enableAgenticWorkflow: false,
    debug: false
  };

  static attributeMap = {
    'endpoint-url': 'endpointUrl',
    'endpoint-id': 'endpointId',
    'api-key': 'apiKey',
    'position': 'position',
    'title': 'title',
    'welcome-message': 'welcomeMessage',
    'primary-color': 'primaryColor',
    'secondary-color': 'secondaryColor',
    'background-color': 'backgroundColor',
    'text-color': 'textColor',
    'storage-key': 'storageKey',
    'enable-persistence': 'enablePersistence',
    'enable-inline-sources': 'enableInlineSources',
    'enable-agentic-workflow': 'enableAgenticWorkflow',
    'debug': 'debug'
  };

  static booleanAttributes = [
    'enablePersistence',
    'enableInlineSources',
    'enableAgenticWorkflow',
    'debug'
  ];

  constructor(element) {
    this.element = element;
    this.config = { ...ConfigManager.defaults };
  }

  /**
   * Load and merge configuration from all sources.
   * @returns {Object} Merged configuration object
   */
  load() {
    // 1. Load from JSON script tag inside the element
    this._loadFromJsonScript();

    // 2. Override with HTML attributes
    this._loadFromAttributes();

    // 3. Validate required fields
    this._validate();

    return this.config;
  }

  /**
   * Load configuration from a JSON script tag inside the element.
   */
  _loadFromJsonScript() {
    const script = this.element.querySelector('script[type="application/json"]');
    if (script) {
      try {
        const jsonConfig = JSON.parse(script.textContent);
        Object.assign(this.config, this._normalizeConfig(jsonConfig));
      } catch (e) {
        console.error('[OmnifactWidget] Invalid JSON configuration:', e);
      }
    }
  }

  /**
   * Load configuration from HTML attributes.
   */
  _loadFromAttributes() {
    for (const [attr, prop] of Object.entries(ConfigManager.attributeMap)) {
      const value = this.element.getAttribute(attr);
      if (value !== null) {
        // Handle boolean attributes
        if (ConfigManager.booleanAttributes.includes(prop)) {
          this.config[prop] = value !== 'false';
        } else {
          this.config[prop] = value;
        }
      }
    }
  }

  /**
   * Normalize JSON keys to camelCase and handle boolean conversions.
   * @param {Object} json - Raw JSON configuration
   * @returns {Object} Normalized configuration
   */
  _normalizeConfig(json) {
    const normalized = {};
    for (const [key, value] of Object.entries(json)) {
      // Convert kebab-case to camelCase
      const camelKey = key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      // Handle boolean string conversions for boolean attributes
      if (ConfigManager.booleanAttributes.includes(camelKey) && typeof value === 'string') {
        normalized[camelKey] = value !== 'false';
      } else {
        normalized[camelKey] = value;
      }
    }
    return normalized;
  }

  /**
   * Validate required configuration fields.
   */
  _validate() {
    const warnings = [];

    if (!this.config.endpointUrl) {
      warnings.push('endpoint-url is required');
    }
    if (!this.config.endpointId) {
      warnings.push('endpoint-id is required');
    }

    if (warnings.length > 0) {
      console.warn('[OmnifactWidget] Configuration warnings:', warnings.join(', '));
    }
  }

  /**
   * Update a single configuration value.
   * @param {string} key - Configuration key (camelCase)
   * @param {*} value - New value
   */
  set(key, value) {
    if (key in ConfigManager.defaults) {
      this.config[key] = value;
    }
  }

  /**
   * Get the current configuration.
   * @returns {Object} Current configuration
   */
  get() {
    return { ...this.config };
  }
}
