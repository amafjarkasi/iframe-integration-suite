/**
 * Enhanced RPC implementation using postMessage for cross-frame communication
 * Supports request/response pattern with Promise-based API, security validation, and monitoring
 */

import { SecurityUtils } from '../utils/security.js';

export class RPC {
  constructor(targetWindow, targetOrigin = '*', options = {}) {
    this.targetWindow = targetWindow;
    this.targetOrigin = targetOrigin;
    this.messageId = 0;
    this.pendingRequests = new Map();
    this.exposedMethods = new Map();
    
    // Security options
    this.allowedOrigins = options.allowedOrigins || ['*'];
    this.rateLimiter = options.enableRateLimit !== false ? 
      SecurityUtils.createRateLimiter(options.maxRequests || 100, options.timeWindow || 60000) : 
      null;
    this.validateMessages = options.validateMessages !== false;
    
    // Performance tracking
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      responseTimes: []
    };
    
    // Listen for messages
    this.boundHandleMessage = this.handleMessage.bind(this);
    window.addEventListener('message', this.boundHandleMessage);
  }

  /**
   * Handle incoming postMessage events with security validation
   */
  handleMessage(event) {
    try {
      // Validate origin
      if (!SecurityUtils.validateOrigin(event.origin, this.allowedOrigins)) {
        console.warn('RPC: Rejected message from unauthorized origin:', event.origin);
        return;
      }

      // Rate limiting
      if (this.rateLimiter) {
        try {
          this.rateLimiter(event.origin);
        } catch (error) {
          console.warn('RPC: Rate limit exceeded for origin:', event.origin);
          return;
        }
      }

      // Validate message structure
      if (this.validateMessages) {
        try {
          SecurityUtils.validatePostMessageData(event.data, {
            type: 'string',
            id: value => typeof value === 'number' || typeof value === 'string'
          });
        } catch (error) {
          console.warn('RPC: Invalid message structure:', error.message);
          return;
        }
      }

      const { type, id, method, args, result, error } = event.data;

      if (type === 'rpc-request') {
        this.handleRequest(event, id, method, args);
      } else if (type === 'rpc-response') {
        this.handleResponse(id, result, error);
      }
    } catch (error) {
      console.error('RPC: Error handling message:', error);
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
   * Call a method on the other frame with enhanced security and monitoring
   */
  call(method, ...args) {
    return new Promise((resolve, reject) => {
      const id = SecurityUtils.generateSecureId();
      const startTime = performance.now();
      
      this.pendingRequests.set(id, { 
        resolve: (result) => {
          const responseTime = performance.now() - startTime;
          this.updateMetrics(true, responseTime);
          resolve(result);
        }, 
        reject: (error) => {
          this.updateMetrics(false);
          reject(error);
        }
      });

      this.targetWindow.postMessage({
        type: 'rpc-request',
        id,
        method,
        args
      }, this.targetOrigin);

      this.metrics.totalRequests++;

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          this.updateMetrics(false);
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
    window.removeEventListener('message', this.boundHandleMessage);
    this.pendingRequests.clear();
    this.exposedMethods.clear();
  }

  /**
   * Update performance metrics
   */
  updateMetrics(success, responseTime = 0) {
    if (success) {
      this.metrics.successfulRequests++;
      
      if (responseTime > 0) {
        this.metrics.responseTimes.push(responseTime);
        
        // Keep only last 100 response times
        if (this.metrics.responseTimes.length > 100) {
          this.metrics.responseTimes.shift();
        }
        
        // Update average response time
        this.metrics.averageResponseTime = 
          this.metrics.responseTimes.reduce((a, b) => a + b, 0) / 
          this.metrics.responseTimes.length;
      }
    } else {
      this.metrics.failedRequests++;
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0 ? 
        this.metrics.successfulRequests / this.metrics.totalRequests : 0
    };
  }

  /**
   * Set allowed origins for security
   */
  setAllowedOrigins(origins) {
    this.allowedOrigins = Array.isArray(origins) ? origins : [origins];
  }
}