/**
 * EmbedApi - Child-side API for cooperative iframe communication
 * Provides methods for child pages to expose functionality to parent pages
 */

export class EmbedApi {
  constructor(targetOrigin = '*') {
    this.targetOrigin = targetOrigin;
    this.messageId = 0;
    this.pendingRequests = new Map();
    this.exposedMethods = new Map();
    this.parentWindow = window.parent;

    // Only set up communication if we're actually in an iframe
    if (window !== window.parent) {
      this.setupCommunication();
    }
  }

  /**
   * Set up postMessage communication with parent
   */
  setupCommunication() {
    window.addEventListener('message', this.handleMessage.bind(this));
    
    // Notify parent that we're ready
    this.notifyReady();
  }

  /**
   * Notify parent window that child is ready for communication
   */
  notifyReady() {
    this.parentWindow.postMessage({
      type: 'child-ready',
      url: window.location.href
    }, this.targetOrigin);
  }

  /**
   * Handle incoming postMessage events
   */
  handleMessage(event) {
    const { type, id, method, args, result, error } = event.data;

    if (type === 'rpc-request') {
      this.handleRequest(event, id, method, args);
    } else if (type === 'rpc-response') {
      this.handleResponse(id, result, error);
    }
  }

  /**
   * Handle RPC requests from parent
   */
  async handleRequest(event, id, method, args) {
    // Built-in methods
    if (method === 'ping') {
      this.sendResponse(id, 'pong', null);
      return;
    }

    if (method === 'getInfo') {
      this.sendResponse(id, this.getPageInfo(), null);
      return;
    }

    // Custom exposed methods
    if (!this.exposedMethods.has(method)) {
      this.sendResponse(id, null, `Method '${method}' not found`);
      return;
    }

    try {
      const handler = this.exposedMethods.get(method);
      const result = await handler(...args);
      this.sendResponse(id, result, null);
    } catch (error) {
      this.sendResponse(id, null, error.message);
    }
  }

  /**
   * Handle RPC responses from parent
   */
  handleResponse(id, result, error) {
    const request = this.pendingRequests.get(id);
    if (!request) return;

    this.pendingRequests.delete(id);

    if (error) {
      request.reject(new Error(error));
    } else {
      request.resolve(result);
    }
  }

  /**
   * Send RPC response to parent
   */
  sendResponse(id, result, error) {
    this.parentWindow.postMessage({
      type: 'rpc-response',
      id,
      result,
      error
    }, this.targetOrigin);
  }

  /**
   * Call a method on the parent window
   */
  call(method, ...args) {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      
      this.pendingRequests.set(id, { resolve, reject });

      this.parentWindow.postMessage({
        type: 'rpc-request',
        id,
        method,
        args
      }, this.targetOrigin);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`RPC call '${method}' timed out`));
        }
      }, 10000);
    });
  }

  /**
   * Expose a method to be called by the parent
   */
  expose(method, handler) {
    this.exposedMethods.set(method, handler);
  }

  /**
   * Remove an exposed method
   */
  unexpose(method) {
    this.exposedMethods.delete(method);
  }

  /**
   * Get basic information about this page
   */
  getPageInfo() {
    return {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      dimensions: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight
      }
    };
  }

  /**
   * Get page content (similar to what parent could extract if same-origin)
   */
  getContent() {
    return {
      title: document.title,
      url: window.location.href,
      text: document.body ? document.body.textContent : '',
      html: document.documentElement.outerHTML,
      links: Array.from(document.querySelectorAll('a')).map(a => ({
        href: a.href,
        text: a.textContent.trim()
      })),
      images: Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt
      })),
      meta: Array.from(document.querySelectorAll('meta')).map(meta => ({
        name: meta.name,
        content: meta.content,
        property: meta.getAttribute('property')
      })).filter(meta => meta.name || meta.property)
    };
  }

  /**
   * Resize the iframe (requests parent to resize)
   */
  requestResize(width, height) {
    return this.call('resizeFrame', width, height);
  }

  /**
   * Request navigation in parent window
   */
  requestNavigation(url, target = '_parent') {
    return this.call('navigate', url, target);
  }

  /**
   * Send custom event to parent
   */
  sendEvent(eventName, data) {
    this.parentWindow.postMessage({
      type: 'child-event',
      event: eventName,
      data
    }, this.targetOrigin);
  }

  /**
   * Destroy the API and clean up listeners
   */
  destroy() {
    window.removeEventListener('message', this.handleMessage);
    this.pendingRequests.clear();
    this.exposedMethods.clear();
  }
}

// Auto-initialize if in iframe
if (typeof window !== 'undefined' && window !== window.parent) {
  window.embedApi = new EmbedApi();
}