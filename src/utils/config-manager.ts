import type { WidgetConfig } from '../types';

type ConfigKey = keyof WidgetConfig;

/**
 * Configuration manager for the Omnifact Chat Widget.
 * Handles loading configuration from JSON script tags and HTML attributes.
 * Priority: HTML attributes > JSON config > defaults
 */
export class ConfigManager {
  static defaults: WidgetConfig = {
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
    hideSources: false,
    debug: false
  };

  static attributeMap: Record<string, ConfigKey> = {
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
    'hide-sources': 'hideSources',
    'debug': 'debug'
  };

  static booleanAttributes: ConfigKey[] = [
    'enablePersistence',
    'enableInlineSources',
    'enableAgenticWorkflow',
    'hideSources',
    'debug'
  ];

  private element: HTMLElement;
  private config: WidgetConfig;

  constructor(element: HTMLElement) {
    this.element = element;
    this.config = { ...ConfigManager.defaults };
  }

  /**
   * Load and merge configuration from all sources.
   */
  load(): WidgetConfig {
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
  private _loadFromJsonScript(): void {
    const script = this.element.querySelector('script[type="application/json"]');
    if (script) {
      try {
        const jsonConfig = JSON.parse(script.textContent || '{}');
        Object.assign(this.config, this._normalizeConfig(jsonConfig));
      } catch (e) {
        console.error('[OmnifactWidget] Invalid JSON configuration:', e);
      }
    }
  }

  /**
   * Load configuration from HTML attributes.
   */
  private _loadFromAttributes(): void {
    for (const [attr, prop] of Object.entries(ConfigManager.attributeMap)) {
      const value = this.element.getAttribute(attr);
      if (value !== null) {
        // Handle boolean attributes
        if (ConfigManager.booleanAttributes.includes(prop)) {
          (this.config as unknown as Record<string, unknown>)[prop] = value !== 'false';
        } else {
          (this.config as unknown as Record<string, unknown>)[prop] = value;
        }
      }
    }
  }

  /**
   * Normalize JSON keys to camelCase and handle boolean conversions.
   */
  private _normalizeConfig(json: Record<string, unknown>): Partial<WidgetConfig> {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(json)) {
      // Convert kebab-case to camelCase
      const camelKey = key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      // Handle boolean string conversions for boolean attributes
      if (ConfigManager.booleanAttributes.includes(camelKey as ConfigKey) && typeof value === 'string') {
        normalized[camelKey] = value !== 'false';
      } else {
        normalized[camelKey] = value;
      }
    }
    return normalized as Partial<WidgetConfig>;
  }

  /**
   * Validate required configuration fields.
   */
  private _validate(): void {
    const warnings: string[] = [];

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
   */
  set<K extends ConfigKey>(key: K, value: WidgetConfig[K]): void {
    if (key in ConfigManager.defaults) {
      this.config[key] = value;
    }
  }

  /**
   * Get the current configuration.
   */
  get(): WidgetConfig {
    return { ...this.config };
  }
}
