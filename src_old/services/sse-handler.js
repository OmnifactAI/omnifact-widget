/**
 * Server-Sent Events (SSE) handler for processing streaming responses.
 * Parses the Omnifact SSE format and emits content chunks.
 */
export class SSEHandler {
  constructor() {
    this.debug = false;
  }

  /**
   * Enable or disable debug logging.
   * @param {boolean} enabled - Whether to enable debug mode
   */
  setDebug(enabled) {
    this.debug = enabled;
  }

  /**
   * Log a debug message if debug mode is enabled.
   * @param {string} label - Log label
   * @param {*} data - Data to log
   */
  _log(label, data) {
    if (this.debug) {
      console.log(`[SSE Debug] ${label}:`, data);
    }
  }

  /**
   * Process a streaming response.
   * @param {Response} response - Fetch Response object
   * @param {Object} callbacks - Callback functions
   * @param {Function} callbacks.onChunk - Called with each content chunk
   * @param {Function} callbacks.onReferences - Called with document references
   * @param {Function} callbacks.onSource - Called with individual source (inline mode)
   * @param {Function} callbacks.onComplete - Called when stream is complete
   * @param {Function} callbacks.onError - Called on error
   * @returns {Promise<Object>} Object with content, references, and sources
   */
  async processStream(response, callbacks) {
    const { onChunk, onReferences, onSource, onComplete, onError } = callbacks;

    if (this.debug) {
      console.log('[SSE Debug] Starting stream processing...');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let currentEvent = null;
    let accumulatedContent = '';
    let messageId = null;
    let references = null;
    let sources = [];

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();

          if (!trimmedLine) {
            // Empty line - event boundary
            continue;
          }

          if (trimmedLine.startsWith('event: ')) {
            currentEvent = trimmedLine.slice(7).trim();
            this._log('Event', currentEvent);
            continue;
          }

          if (trimmedLine.startsWith('id: ')) {
            // Skip ID lines
            continue;
          }

          if (trimmedLine.startsWith('data: ')) {
            const dataStr = trimmedLine.slice(6);

            if (currentEvent === 'assistant_write') {
              try {
                const data = JSON.parse(dataStr);
                this._log('assistant_write', data);
                if (data.content) {
                  messageId = data.messageId || messageId;
                  accumulatedContent += data.content;

                  if (onChunk) {
                    onChunk(data.content, accumulatedContent, messageId);
                  }
                }
              } catch (e) {
                // If not valid JSON, treat as raw content
                this._log('assistant_write (raw)', dataStr);
                accumulatedContent += dataStr;
                if (onChunk) {
                  onChunk(dataStr, accumulatedContent, messageId);
                }
              }
            } else if (currentEvent === 'references') {
              // Legacy references format
              try {
                const data = JSON.parse(dataStr);
                this._log('references', data);
                references = data;
                if (onReferences) {
                  onReferences(data);
                }
              } catch (e) {
                console.warn('[SSEHandler] Failed to parse references:', e);
              }
            } else if (currentEvent === 'message_source') {
              // Inline source format
              try {
                const data = JSON.parse(dataStr);
                this._log('message_source', data);
                sources.push(data);
                if (onSource) {
                  onSource(data);
                }
              } catch (e) {
                console.warn('[SSEHandler] Failed to parse source:', e);
              }
            } else if (currentEvent === 'done') {
              // Stream complete
              const result = {
                content: accumulatedContent,
                messageId,
                references,
                sources: sources.length > 0 ? sources : null
              };
              this._log('done', result);
              if (onComplete) {
                onComplete(result);
              }
              return result;
            } else if (currentEvent === 'error') {
              this._log('error', dataStr);
              try {
                const errorData = JSON.parse(dataStr);
                throw new Error(errorData.message || 'Stream error');
              } catch (e) {
                if (e.message !== 'Stream error') throw e;
                throw new Error(dataStr || 'Stream error');
              }
            } else {
              // Log unknown event types
              this._log(`unknown event (${currentEvent})`, dataStr);
            }
          }
        }
      }

      // If we reach here without a done event, still complete
      const result = {
        content: accumulatedContent,
        messageId,
        references,
        sources: sources.length > 0 ? sources : null
      };
      if (onComplete) {
        onComplete(result);
      }

      return result;
    } catch (error) {
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }
}
