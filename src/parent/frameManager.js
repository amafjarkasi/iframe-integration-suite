/**
 * FrameManager - Enhanced parent-side API for managing iframe interactions
 * Automatically detects same-origin vs cross-origin scenarios and provides appropriate APIs
 * Includes health monitoring, performance tracking, and security features
 */

import { RPC } from './rpc.js';
import { MonitoringUtils } from '../utils/monitoring.js';
import { SecurityUtils } from '../utils/security.js';

export class FrameManager {
  constructor(options = {}) {
    this.rpcInstances = new WeakMap();
    this.healthMonitors = new WeakMap();
    this.frameRegistry = new Map();
    
    // Configuration options
    this.options = {
      enableHealthMonitoring: options.enableHealthMonitoring !== false,
      enableSecurity: options.enableSecurity !== false,
      allowedOrigins: options.allowedOrigins || ['*'],
      healthCheckInterval: options.healthCheckInterval || 5000,
      ...options
    };
    
    this.performanceTracker = MonitoringUtils.createPerformanceTracker();
    this.errorTracker = MonitoringUtils.createErrorTracker({
      onError: (error) => this.handleFrameError(error)
    });
  }

  /**
   * Check if an iframe is same-origin
   */
  isSameOrigin(iframe) {
    try {
      // Try to access the iframe's document
      return iframe.contentDocument !== null;
    } catch (e) {
      // Cross-origin access blocked
      return false;
    }
  }

  /**
   * Extract data from a same-origin iframe
   */
  extractFromFrame(iframe) {
    if (!this.isSameOrigin(iframe)) {
      throw new Error('Cannot extract from cross-origin iframe. Use setupRPC() instead.');
    }

    const doc = iframe.contentDocument;
    if (!doc) {
      throw new Error('Iframe document not accessible');
    }

    return {
      title: doc.title,
      url: doc.URL,
      html: doc.documentElement.outerHTML,
      text: doc.body ? doc.body.textContent : '',
      links: Array.from(doc.querySelectorAll('a')).map(a => ({
        href: a.href,
        text: a.textContent.trim()
      })),
      images: Array.from(doc.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt
      })),
      forms: Array.from(doc.querySelectorAll('form')).map(form => ({
        action: form.action,
        method: form.method,
        fields: Array.from(form.querySelectorAll('input, select, textarea')).map(field => ({
          name: field.name,
          type: field.type,
          value: field.value
        }))
      })),
      meta: Array.from(doc.querySelectorAll('meta')).map(meta => ({
        name: meta.name,
        content: meta.content,
        property: meta.getAttribute('property')
      })).filter(meta => meta.name || meta.property)
    };
  }

  /**
   * Set up RPC communication with enhanced monitoring and security
   */
  async setupRPC(iframe, timeout = 5000) {
    if (this.isSameOrigin(iframe)) {
      console.warn('Frame is same-origin. Consider using extractFromFrame() for direct access.');
    }

    // Check if we already have an RPC instance for this iframe
    if (this.rpcInstances.has(iframe)) {
      return this.rpcInstances.get(iframe);
    }

    return this.performanceTracker.measureAsync('rpc-setup', async () => {
      try {
        const rpc = new RPC(iframe.contentWindow, '*', {
          allowedOrigins: this.options.allowedOrigins,
          enableRateLimit: this.options.enableSecurity,
          validateMessages: this.options.enableSecurity
        });

        this.rpcInstances.set(iframe, rpc);
        this.registerFrame(iframe);

        // Set up health monitoring
        if (this.options.enableHealthMonitoring) {
          this.setupHealthMonitoring(iframe);
        }

        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('RPC setup timeout - child frame may not be cooperative'));
          }, timeout);

          // Expose a ping method for child to test connection
          rpc.expose('ping', () => 'pong');

          // Try to establish connection
          rpc.call('ping')
            .then(() => {
              clearTimeout(timeoutId);
              resolve(rpc);
            })
            .catch(error => {
              clearTimeout(timeoutId);
              // If ping fails, still resolve with RPC instance - child may expose methods later
              resolve(rpc);
            });
        });

      } catch (error) {
        this.errorTracker.track(error, { operation: 'rpc-setup', iframe: iframe.src });
        throw error;
      }
    });
  }

  /**
   * Get existing RPC instance for an iframe
   */
  getRPC(iframe) {
    return this.rpcInstances.get(iframe);
  }

  /**
   * Auto-detect iframe type and provide appropriate interface
   */
  async connect(iframe) {
    if (this.isSameOrigin(iframe)) {
      return {
        type: 'same-origin',
        extract: () => this.extractFromFrame(iframe),
        getDocument: () => iframe.contentDocument
      };
    } else {
      const rpc = await this.setupRPC(iframe);
      return {
        type: 'cross-origin',
        rpc,
        call: (method, ...args) => rpc.call(method, ...args),
        expose: (method, handler) => rpc.expose(method, handler)
      };
    }
  }

  /**
   * Wait for iframe to load
   */
  waitForLoad(iframe) {
    return new Promise((resolve) => {
      if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
        resolve();
        return;
      }

      const onLoad = () => {
        iframe.removeEventListener('load', onLoad);
        resolve();
      };

      iframe.addEventListener('load', onLoad);
    });
  }

  /**
   * Create and configure an iframe element
   */
  createFrame(src, options = {}) {
    const iframe = document.createElement('iframe');
    
    // Set basic attributes
    iframe.src = src;
    iframe.style.width = options.width || '100%';
    iframe.style.height = options.height || '400px';
    iframe.style.border = options.border || 'none';
    
    // Set sandbox if specified
    if (options.sandbox) {
      iframe.sandbox = Array.isArray(options.sandbox) ? options.sandbox.join(' ') : options.sandbox;
    }

    // Set other attributes
    if (options.allow) iframe.allow = options.allow;
    if (options.loading) iframe.loading = options.loading;
    if (options.referrerPolicy) iframe.referrerPolicy = options.referrerPolicy;

    return iframe;
  }

  /**
   * Enhanced cleanup with monitoring and security cleanup
   */
  cleanup(iframe) {
    const rpc = this.rpcInstances.get(iframe);
    if (rpc) {
      rpc.destroy();
      this.rpcInstances.delete(iframe);
    }

    // Stop health monitoring
    if (this.healthMonitors.has(iframe)) {
      MonitoringUtils.stopMonitoring(iframe);
      this.healthMonitors.delete(iframe);
    }

    // Unregister frame
    this.unregisterFrame(iframe);
  }

  /**
   * Register frame for tracking
   */
  registerFrame(iframe) {
    const frameInfo = {
      src: iframe.src,
      registeredAt: Date.now(),
      isHealthy: true,
      metrics: {
        loadTime: null,
        rpcSetupTime: null,
        totalRequests: 0
      }
    };

    this.frameRegistry.set(iframe, frameInfo);
  }

  /**
   * Unregister frame
   */
  unregisterFrame(iframe) {
    this.frameRegistry.delete(iframe);
  }

  /**
   * Set up health monitoring for a frame
   */
  setupHealthMonitoring(iframe) {
    if (this.healthMonitors.has(iframe)) {
      return this.healthMonitors.get(iframe);
    }

    const monitor = MonitoringUtils.createHealthMonitor(iframe, {
      checkInterval: this.options.healthCheckInterval,
      onHealthChange: (isHealthy, monitor) => {
        const frameInfo = this.frameRegistry.get(iframe);
        if (frameInfo) {
          frameInfo.isHealthy = isHealthy;
        }
        this.handleHealthChange(iframe, isHealthy, monitor);
      },
      onError: (error) => {
        this.errorTracker.track(error, { operation: 'health-check', iframe: iframe.src });
      }
    });

    this.healthMonitors.set(iframe, monitor);
    return monitor;
  }

  /**
   * Handle frame health changes
   */
  handleHealthChange(iframe, isHealthy, monitor) {
    console.log(`Frame health changed: ${iframe.src} - ${isHealthy ? 'healthy' : 'unhealthy'}`);
    
    // Emit custom event for applications to listen to
    window.dispatchEvent(new CustomEvent('iframe-health-change', {
      detail: { iframe, isHealthy, monitor }
    }));
  }

  /**
   * Handle frame errors
   */
  handleFrameError(error) {
    console.error('Frame error:', error);
    
    // Emit custom event for applications to listen to
    window.dispatchEvent(new CustomEvent('iframe-error', {
      detail: { error }
    }));
  }

  /**
   * Get comprehensive frame statistics
   */
  getFrameStats(iframe = null) {
    if (iframe) {
      const frameInfo = this.frameRegistry.get(iframe);
      const rpc = this.rpcInstances.get(iframe);
      const monitor = this.healthMonitors.get(iframe);

      return {
        frameInfo,
        rpcMetrics: rpc ? rpc.getMetrics() : null,
        healthMetrics: monitor ? MonitoringUtils.getStats(iframe) : null
      };
    }

    // Return global stats
    return {
      totalFrames: this.frameRegistry.size,
      globalHealth: MonitoringUtils.getStats(),
      errorStats: this.errorTracker.getStats(),
      performanceStats: this.performanceTracker.getMetrics()
    };
  }

  /**
   * Create secure frame with enhanced options
   */
  createSecureFrame(src, options = {}) {
    // Validate URL
    try {
      const validatedSrc = SecurityUtils.sanitizeUrl(src);
      
      const iframe = this.createFrame(validatedSrc, {
        ...options,
        sandbox: options.sandbox || ['allow-scripts', 'allow-same-origin', 'allow-forms'],
        referrerPolicy: options.referrerPolicy || 'no-referrer'
      });

      // Add CSP if requested
      if (options.enableCSP) {
        const csp = SecurityUtils.generateCSP({
          allowedSources: options.allowedSources,
          allowUnsafeInline: options.allowUnsafeInline,
          allowedFrameSources: options.allowedFrameSources
        });
        
        iframe.setAttribute('csp', csp);
      }

      return iframe;
      
    } catch (error) {
      this.errorTracker.track(error, { operation: 'create-secure-frame', src });
      throw error;
    }
  }
}