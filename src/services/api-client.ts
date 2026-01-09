import type { WidgetConfig, ApiMessage } from '../types';

/**
 * API client for communicating with the Omnifact chat endpoint.
 * Handles both streaming and non-streaming requests.
 */
export class ApiClient {
  private baseUrl: string;
  private endpointId: string;
  private apiKey: string;
  private enableInlineSources: boolean;
  private enableAgenticWorkflow: boolean;
  private debug: boolean;

  constructor(config: WidgetConfig) {
    this.baseUrl = config.endpointUrl;
    this.endpointId = config.endpointId;
    this.apiKey = config.apiKey;
    this.enableInlineSources = config.enableInlineSources || false;
    this.enableAgenticWorkflow = config.enableAgenticWorkflow || false;
    this.debug = config.debug || false;
  }

  /**
   * Send a chat message to the API.
   */
  async sendMessage(messages: ApiMessage[], streaming: true): Promise<Response>;
  async sendMessage(messages: ApiMessage[], streaming: false): Promise<unknown>;
  async sendMessage(messages: ApiMessage[], streaming = true): Promise<Response | unknown> {
    const url = `${this.baseUrl}/v1/endpoints/${this.endpointId}/chat`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Only add API key header if provided
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    // Add inline sources header if enabled
    if (this.enableInlineSources) {
      headers['omnifact-enable-inline-sources'] = 'true';
    }

    // Add agentic workflow header if enabled
    if (this.enableAgenticWorkflow) {
      headers['omnifact-enable-agentic-workflow'] = 'true';
    }

    if (this.debug) {
      console.log('[API Debug] Request URL:', url);
      console.log('[API Debug] Request headers:', headers);
      console.log('[API Debug] Request body:', { messages, streaming });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        streaming
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new ApiError(`API request failed: ${response.status}`, response.status, errorText);
    }

    if (streaming) {
      return response;
    }

    return response.json();
  }

  /**
   * Update configuration (e.g., after attribute changes).
   */
  updateConfig(config: Partial<WidgetConfig>): void {
    if (config.endpointUrl) this.baseUrl = config.endpointUrl;
    if (config.endpointId) this.endpointId = config.endpointId;
    if (config.apiKey) this.apiKey = config.apiKey;
    if (config.enableInlineSources !== undefined) this.enableInlineSources = config.enableInlineSources;
    if (config.enableAgenticWorkflow !== undefined) this.enableAgenticWorkflow = config.enableAgenticWorkflow;
    if (config.debug !== undefined) this.debug = config.debug;
  }
}

/**
 * Custom error class for API errors.
 */
export class ApiError extends Error {
  status: number;
  responseText: string;

  constructor(message: string, status: number, responseText: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.responseText = responseText;
  }
}
