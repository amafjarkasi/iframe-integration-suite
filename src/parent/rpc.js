/**
 * Simple RPC implementation using postMessage for cross-frame communication
 * Supports request/response pattern with Promise-based API
 */

export class RPC {
  constructor(targetWindow, targetOrigin = '*') {
    this.targetWindow = targetWindow;
    this.targetOrigin = targetOrigin;
    this.messageId = 0;
    this.pendingRequests = new Map();
    this.exposedMethods = new Map();
    
    // Listen for messages
    window.addEventListener('message', this.handleMessage.bind(this));
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
   * Handle RPC requests from the other frame
   */
  async handleRequest(event, id, method, args) {
    if (!this.exposedMethods.has(method)) {
      this.sendResponse(event.source, id, null, `Method '${method}' not found`);
      return;
    }

    try {
      const handler = this.exposedMethods.get(method);
      const result = await handler(...args);
      this.sendResponse(event.source, id, result, null);
    } catch (error) {
      this.sendResponse(event.source, id, null, error.message);
    }
  }

  /**
   * Handle RPC responses
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
   * Send an RPC response
   */
  sendResponse(targetWindow, id, result, error) {
    targetWindow.postMessage({
      type: 'rpc-response',
      id,
      result,
      error
    }, '*');
  }

  /**
   * Call a method on the other frame
   */
  call(method, ...args) {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      
      this.pendingRequests.set(id, { resolve, reject });

      this.targetWindow.postMessage({
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
   * Expose a method to be called by the other frame
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
   * Destroy the RPC instance and clean up listeners
   */
  destroy() {
    window.removeEventListener('message', this.handleMessage);
    this.pendingRequests.clear();
    this.exposedMethods.clear();
  }
}